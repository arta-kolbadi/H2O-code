import { requestWithPolicy, readJson, readSSE, makeOpenAIMessage } from "./http.js";

function parseArguments(value) {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function toInteractionInput(messages, previousInteractionId = null) {
  const system = messages.filter(message => message.role === "system").map(message => String(message.content || "")).join("\n\n");
  let input = [];
  if (previousInteractionId) {
    let lastToolCallIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant" && messages[index].tool_calls?.length) { lastToolCallIndex = index; break; }
    }
    const toolResults = lastToolCallIndex >= 0 ? messages.slice(lastToolCallIndex + 1).filter(message => message.role === "tool") : [];
    if (toolResults.length) {
      input = toolResults.map(message => ({
        type: "function_result",
        call_id: message.tool_call_id,
        name: message.name || "tool",
        result: [{ type: "text", text: String(message.content ?? "") }],
      }));
    } else {
      const lastUser = [...messages].reverse().find(message => message.role === "user");
      if (lastUser) input = [{ type: "user_input", content: String(lastUser.content || "") }];
    }
  } else {
    const lastUser = [...messages].reverse().find(message => message.role === "user");
    if (lastUser) input = [{ type: "user_input", content: String(lastUser.content || "") }];
  }
  return { input, system };
}

function functionTools(tools = []) {
  return tools.map(tool => ({
    type: "function",
    name: tool.function.name,
    description: tool.function.description || "",
    parameters: tool.function.parameters || { type: "object", properties: {} },
  }));
}

function normalizeInteraction(body) {
  let text = "";
  const calls = [];
  for (const step of body.steps || []) {
    if (step.type === "model_output") {
      const content = step.content || [];
      for (const part of content) if (part.type === "text") text += part.text || "";
    }
    if (step.type === "function_call") {
      calls.push({ id: step.call_id || step.id || `gemini_${calls.length}`, type: "function", function: { name: step.name, arguments: JSON.stringify(parseArguments(step.arguments)) } });
    }
  }
  return makeOpenAIMessage(text || body.output_text || "", calls);
}

function streamStepState(event, calls, stepTypes, stepNames) {
  const step = event.step || event.data?.step || {};
  const delta = event.delta || event.data?.delta || {};
  const stepId = step.id || step.call_id || event.step_id || event.data?.step_id || null;
  if (event.event_type === "step.start" && stepId && step.type) {
    stepTypes.set(stepId, step.type);
    if (step.name) stepNames.set(stepId, step.name);
  }
  const kind = step.type || event.step_type || (stepId ? stepTypes.get(stepId) : null) || delta.step_type || null;
  const deltaType = delta.type || delta.kind;
  if ((kind === "model_output" || deltaType === "text" || deltaType === "text_delta") && typeof delta.text === "string") return { text: delta.text };
  if (kind === "function_call" || typeof delta.arguments_delta === "string") {
    const id = stepId || delta.call_id || `gemini_${calls.size}`;
    const current = calls.get(id) || { id, type: "function", function: { name: step.name || stepNames.get(id) || delta.name || "", arguments: "" } };
    if (step.name || delta.name) current.function.name = step.name || delta.name;
    if (typeof delta.arguments_delta === "string") current.function.arguments += delta.arguments_delta;
    calls.set(id, current);
  }
  return {};
}

export class GeminiProvider {
  constructor({ id, name = "Google Gemini", apiKey, baseUrl = "https://generativelanguage.googleapis.com", fetchImpl = fetch, timeoutMs = 30_000, onRetry }) {
    this.id = id || "gemini"; this.kind = "gemini"; this.name = name; this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, ""); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; this.onRetry = onRetry;
    this.previousInteractionId = null;
  }
  resetConversation() { this.previousInteractionId = null; }
  async request(path, options = {}) {
    return requestWithPolicy(this.fetchImpl, `${this.baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey, ...options.headers },
      signal: options.signal,
    }, { provider: this.name, secrets: [this.apiKey], timeoutMs: this.timeoutMs, onRetry: this.onRetry });
  }
  async listModels({ signal } = {}) {
    const response = await this.request("/v1beta/models?pageSize=1000", { signal });
    const body = await readJson(response, this.name);
    return (body.models || []).map(model => ({
      id: String(model.name || "").replace(/^models\//, ""),
      name: model.displayName || model.name,
      context: model.inputTokenLimit || null,
      free: false,
    })).filter(model => model.id).sort((a, b) => a.name.localeCompare(b.name));
  }
  async testConnection(options = {}) {
    const models = await this.listModels(options);
    return { ok: true, provider: this.name, modelCount: models.length, sampleModels: models.slice(0, 5) };
  }
  async chat({ model, messages, tools, temperature = 0.2, signal, onToken }) {
    const converted = toInteractionInput(messages, this.previousInteractionId);
    const payload = { model, input: converted.input, generation_config: { temperature } };
    if (this.previousInteractionId) payload.previous_interaction_id = this.previousInteractionId;
    if (converted.system) payload.system_instruction = converted.system;
    if (tools?.length) payload.tools = functionTools(tools);
    if (onToken) payload.stream = true;
    const response = await this.request("/v1beta/interactions", {
      method: "POST", body: JSON.stringify(payload), signal,
      headers: onToken ? { Accept: "text/event-stream" } : {},
    });
    if (!onToken) {
      const body = await readJson(response, this.name);
      if (body.id) this.previousInteractionId = body.id;
      return normalizeInteraction(body);
    }
    let text = "";
    const calls = new Map();
    const stepTypes = new Map();
    const stepNames = new Map();
    for await (const event of readSSE(response, signal)) {
      const state = streamStepState(event, calls, stepTypes, stepNames);
      if (state.text) { text += state.text; onToken(state.text); }
      const type = event.event_type || event.type;
      if (type === "interaction.created" || type === "interaction.completed") {
        const id = event.interaction?.id || event.id || event.data?.interaction?.id;
        if (id) this.previousInteractionId = id;
      }
      if (type === "step.start" && event.step?.type === "function_call") {
        const step = event.step;
        calls.set(step.id || step.call_id, { id: step.id || step.call_id, type: "function", function: { name: step.name || "", arguments: "" } });
      }
    }
    return makeOpenAIMessage(text, [...calls.values()]);
  }
}
