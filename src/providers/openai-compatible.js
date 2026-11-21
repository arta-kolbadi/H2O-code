import { requestWithPolicy, readJson, readSSE, makeOpenAIMessage } from "./http.js";

function normalizeBase(url) { return String(url || "").replace(/\/+$/, ""); }
function toModel(item) {
  return { id: item.id, name: item.name || item.id, context: item.context_length || item.context_window, free: Number(item.pricing?.prompt) === 0 && Number(item.pricing?.completion) === 0 };
}

export class OpenAICompatibleProvider {
  constructor({ id, kind = "openai-compatible", name, baseUrl = "https://api.openai.com/v1", apiKey, fetchImpl = fetch, timeoutMs, onRetry }) {
    this.id = id || kind; this.kind = kind; this.name = name || kind; this.baseUrl = normalizeBase(baseUrl);
    this.apiKey = apiKey || null; this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs || 30_000; this.onRetry = onRetry;
  }
  headers(extra = {}) {
    const headers = { "Content-Type": "application/json", ...extra };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    if (this.kind === "openrouter") { headers["HTTP-Referer"] = "http://127.0.0.1"; headers["X-Title"] = "H2O"; }
    return headers;
  }
  async request(path, options = {}) {
    return requestWithPolicy(this.fetchImpl, `${this.baseUrl}${path}`, { ...options, headers: this.headers(options.headers), signal: options.signal }, {
      provider: this.name, secrets: [this.apiKey], timeoutMs: this.timeoutMs, onRetry: this.onRetry,
    });
  }
  async listModels({ signal } = {}) {
    if (this.kind === "ollama") {
      const root = this.baseUrl.replace(/\/v1$/i, "");
      const response = await requestWithPolicy(this.fetchImpl, `${root}/api/tags`, { signal }, { provider: this.name, timeoutMs: this.timeoutMs, onRetry: this.onRetry });
      const body = await readJson(response, this.name);
      return (body.models || []).map(m => ({ id: m.name, name: m.name, context: m.details?.parameter_size || null, free: true }));
    }
    const response = await this.request("/models", { signal });
    const body = await readJson(response, this.name);
    return (body.data || body.models || []).map(toModel).filter(m => m.id).sort((a,b) => Number(b.free)-Number(a.free) || a.name.localeCompare(b.name));
  }
  async testConnection(options = {}) {
    const models = await this.listModels(options);
    return { ok: true, provider: this.name, modelCount: models.length, sampleModels: models.slice(0, 5) };
  }
  async chat({ model, messages, tools, temperature = 0.2, signal, onToken }) {
    const payload = { model, messages, temperature };
    if (tools?.length) { payload.tools = tools; payload.tool_choice = "auto"; }
    if (!onToken) {
      const response = await this.request("/chat/completions", { method: "POST", body: JSON.stringify(payload), signal });
      return readJson(response, this.name);
    }
    payload.stream = true;
    const response = await this.request("/chat/completions", { method: "POST", body: JSON.stringify(payload), signal, headers: { Accept: "text/event-stream" } });
    let content = ""; const calls = new Map(); let finishReason = "stop";
    for await (const event of readSSE(response, signal)) {
      const delta = event.choices?.[0]?.delta;
      if (delta?.content) { content += delta.content; onToken(delta.content); }
      if (event.choices?.[0]?.finish_reason) finishReason = event.choices[0].finish_reason;
      for (const part of delta?.tool_calls || []) {
        const index = part.index ?? 0;
        const current = calls.get(index) || { id: part.id || `call_${index}`, type: "function", function: { name: "", arguments: "" } };
        if (part.id) current.id = part.id;
        if (part.function?.name) current.function.name += part.function.name;
        if (part.function?.arguments) current.function.arguments += part.function.arguments;
        calls.set(index, current);
      }
    }
    const result = makeOpenAIMessage(content, [...calls.values()]);
    result.choices[0].finish_reason = finishReason;
    return result;
  }
}
