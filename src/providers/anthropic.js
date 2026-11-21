import { requestWithPolicy, readJson, readSSE, makeOpenAIMessage } from "./http.js";

function fromMessages(messages) {
  const system = messages.filter(m => m.role === "system").map(m => typeof m.content === "string" ? m.content : "").join("\n\n");
  const converted = [];
  for (const message of messages.filter(m => m.role !== "system")) {
    if (message.role === "tool") {
      converted.push({ role: "user", content: [{ type: "tool_result", tool_use_id: message.tool_call_id, content: String(message.content ?? "") }] });
    } else if (message.role === "assistant" && message.tool_calls?.length) {
      converted.push({ role: "assistant", content: message.tool_calls.map(call => ({ type: "tool_use", id: call.id, name: call.function.name, input: safeArgs(call.function.arguments) })) });
    } else {
      converted.push({ role: message.role === "assistant" ? "assistant" : "user", content: typeof message.content === "string" ? message.content : "" });
    }
  }
  return { system, messages: converted };
}
function safeArgs(value) { try { return JSON.parse(value || "{}"); } catch { return {}; } }
function mapTools(tools = []) { return tools.map(t => ({ name: t.function.name, description: t.function.description || "", input_schema: t.function.parameters || { type: "object", properties: {} } })); }
function mapResponse(body) {
  let text = ""; const calls = [];
  for (const block of body.content || []) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use") calls.push({ id: block.id, type: "function", function: { name: block.name, arguments: JSON.stringify(block.input || {}) } });
  }
  return makeOpenAIMessage(text, calls);
}

export class AnthropicProvider {
  constructor({ id, name = "Anthropic", apiKey, baseUrl = "https://api.anthropic.com", fetchImpl = fetch, timeoutMs = 30_000, onRetry }) {
    this.id = id || "anthropic"; this.kind = "anthropic"; this.name = name; this.apiKey = apiKey; this.baseUrl = baseUrl.replace(/\/+$/, ""); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; this.onRetry = onRetry;
  }
  async request(path, options = {}) {
    return requestWithPolicy(this.fetchImpl, `${this.baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", ...options.headers }, signal: options.signal }, { provider: this.name, secrets: [this.apiKey], timeoutMs: this.timeoutMs, onRetry: this.onRetry });
  }
  async listModels({ signal } = {}) {
    const response = await this.request("/v1/models?limit=1000", { signal }); const body = await readJson(response, this.name);
    return (body.data || []).map(m => ({ id: m.id, name: m.display_name || m.id, context: m.max_input_tokens || null, free: false }));
  }
  async testConnection(options = {}) { const models = await this.listModels(options); return { ok: true, provider: this.name, modelCount: models.length, sampleModels: models.slice(0,5) }; }
  async chat({ model, messages, tools, temperature = 0.2, signal, onToken }) {
    const converted = fromMessages(messages);
    const payload = { model, max_tokens: 4096, messages: converted.messages, temperature, tools: mapTools(tools) };
    if (converted.system) payload.system = converted.system;
    if (!tools?.length) delete payload.tools;
    if (!onToken) {
      const response = await this.request("/v1/messages", { method: "POST", body: JSON.stringify(payload), signal });
      return mapResponse(await readJson(response, this.name));
    }
    payload.stream = true;
    const response = await this.request("/v1/messages", { method: "POST", body: JSON.stringify(payload), signal, headers: { Accept: "text/event-stream" } });
    let text = ""; const toolBlocks = new Map();
    for await (const event of readSSE(response, signal)) {
      if (event.type === "content_block_start" && event.content_block?.type === "tool_use") toolBlocks.set(event.index, { id: event.content_block.id, type: "function", function: { name: event.content_block.name, arguments: "" } });
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") { text += event.delta.text; onToken(event.delta.text); }
      if (event.type === "content_block_delta" && event.delta?.type === "input_json_delta") {
        const item = toolBlocks.get(event.index); if (item) item.function.arguments += event.delta.partial_json || "";
      }
    }
    return makeOpenAIMessage(text, [...toolBlocks.values()]);
  }
}
