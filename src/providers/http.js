const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~-]+/gi,
  /sk-[A-Za-z0-9_-]{12,}/gi,
  /sk-or-[A-Za-z0-9_-]+/gi,
  /sk-ant-[A-Za-z0-9_-]+/gi,
  /AIza[A-Za-z0-9_-]+/g,
];

export function redactSecrets(value, secrets = []) {
  let text = String(value ?? "");
  for (const secret of secrets.filter(Boolean)) text = text.split(String(secret)).join("[REDACTED]");
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[REDACTED]");
  return text;
}

export class ProviderHttpError extends Error {
  constructor(provider, status, message, retryAfter = null) {
    super(`${provider}: ${message || `HTTP ${status}`}`);
    this.name = "ProviderHttpError";
    this.provider = provider;
    this.status = status;
    this.retryAfter = retryAfter;
    this.retryable = status === 429 || status >= 500;
  }
}

function retryDelay(response, attempt) {
  const header = response?.headers?.get?.("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1000));
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.min(30_000, Math.max(0, date - Date.now()));
  }
  return Math.min(8_000, 400 * (2 ** attempt));
}

function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason || new Error("Request cancelled."));
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(signal.reason || new Error("Request cancelled.")); };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function requestWithPolicy(fetchImpl, url, options = {}, config = {}) {
  const { provider = "Provider", secrets = [], timeoutMs = 30_000, maxAttempts = 3, onRetry = () => {} } = config;
  const callerSignal = options.signal;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (callerSignal?.aborted) throw callerSignal.reason || new Error("Request cancelled.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`${provider} request timed out after ${timeoutMs} ms.`)), timeoutMs);
    const signal = callerSignal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([callerSignal, controller.signal])
      : callerSignal || controller.signal;
    try {
      const response = await fetchImpl(url, { ...options, signal });
      if (response.ok) return response;
      const raw = await response.text().catch(() => "");
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || parsed?.message || parsed?.error_description || raw;
      } catch {}
      const error = new ProviderHttpError(provider, response.status, redactSecrets(detail || response.statusText, secrets), response.headers.get("retry-after"));
      if (!error.retryable || attempt === maxAttempts - 1) throw error;
      const wait = retryDelay(response, attempt);
      onRetry({ provider, status: response.status, attempt: attempt + 1, delayMs: wait });
      await abortableDelay(wait, callerSignal);
    } catch (error) {
      if (callerSignal?.aborted) throw callerSignal.reason || new Error("Request cancelled.");
      const isHttp = error instanceof ProviderHttpError;
      const isTimeout = controller.signal.aborted;
      const retryable = isHttp ? error.retryable : (isTimeout || error.name === "TypeError" || error.code === "ECONNRESET" || error.code === "ETIMEDOUT");
      if (!retryable || attempt === maxAttempts - 1) {
        if (isHttp) throw error;
        throw new Error(redactSecrets(`${provider}: ${error.message || "Network request failed."}`, secrets));
      }
      const wait = Math.min(8_000, 400 * (2 ** attempt));
      onRetry({ provider, status: null, attempt: attempt + 1, delayMs: wait });
      await abortableDelay(wait, callerSignal);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${provider}: request failed after retries.`);
}

export async function readJson(response, provider) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(`${provider}: server returned invalid JSON.`); }
}

export async function* readSSE(response, signal) {
  if (!response.body) throw new Error("Streaming response body is unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) throw signal.reason || new Error("Request cancelled.");
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let match;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, match.index).replace(/\r/g, "");
        buffer = buffer.slice(match.index + match[0].length);
        const data = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
        if (!data || data === "[DONE]") continue;
        try { yield JSON.parse(data); } catch {}
      }
    }
    buffer += decoder.decode();
    const data = buffer.replace(/\r/g, "").split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
    if (data && data !== "[DONE]") { try { yield JSON.parse(data); } catch {} }
  } finally {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
  }
}

export function makeOpenAIMessage(content = "", toolCalls = []) {
  const message = { role: "assistant", content };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return { choices: [{ index: 0, finish_reason: toolCalls.length ? "tool_calls" : "stop", message }] };
}
