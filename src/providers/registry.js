import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { H2O_HOME, ensureHome } from "../config.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";
import { GitHubCopilotProvider } from "./copilot.js";
import { KeyringSecretStore, envCredentialName } from "./secrets.js";

export const PROVIDER_KINDS = Object.freeze({
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", requiresKey: true },
  "openai-compatible": { label: "OpenAI-compatible", baseUrl: "", requiresKey: false },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", requiresKey: true },
  anthropic: { label: "Anthropic", baseUrl: "https://api.anthropic.com", requiresKey: true },
  gemini: { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com", requiresKey: true },
  ollama: { label: "Ollama", baseUrl: "http://127.0.0.1:11434/v1", requiresKey: false },
  "lm-studio": { label: "LM Studio", baseUrl: "http://127.0.0.1:1234/v1", requiresKey: false },
  "github-copilot": { label: "GitHub Copilot (official SDK)", baseUrl: "", requiresKey: false },
});

function cleanRecord(record) {
  const { apiKey, token, ...safe } = record;
  return safe;
}

export class ProviderRegistry {
  constructor({ file = path.join(H2O_HOME, "providers.json"), secretStore = new KeyringSecretStore(), env = process.env, fetchImpl = fetch } = {}) {
    this.file = file; this.secretStore = secretStore; this.env = env; this.fetchImpl = fetchImpl;
    ensureHome();
    this.state = this.load();
  }
  load() {
    try {
      const value = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return { activeProviderId: value.activeProviderId || null, providers: Array.isArray(value.providers) ? value.providers.map(cleanRecord) : [] };
    } catch {
      return { activeProviderId: "openrouter-default", providers: [{ id: "openrouter-default", kind: "openrouter", name: "OpenRouter", baseUrl: PROVIDER_KINDS.openrouter.baseUrl, defaultModel: "auto" }] };
    }
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const safe = { activeProviderId: this.state.activeProviderId, providers: this.state.providers.map(cleanRecord) };
    const temp = `${this.file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(safe, null, 2), { mode: 0o600 });
    try { fs.chmodSync(temp, 0o600); } catch {}
    fs.renameSync(temp, this.file);
    try { fs.chmodSync(this.file, 0o600); } catch {}
  }
  async list() {
    return Promise.all(this.state.providers.map(async p => {
      const credentialRequired = !!PROVIDER_KINDS[p.kind]?.requiresKey;
      let credentialConfigured = p.kind === "ollama" || p.kind === "lm-studio";
      if (!credentialConfigured) {
        credentialConfigured = !!this.env[envCredentialName(p)];
        if (!credentialConfigured) credentialConfigured = !!(await this.secretStore.get(`provider:${p.id}`).catch(() => null));
      }
      return {
        ...p,
        active: p.id === this.state.activeProviderId,
        credentialConfigured,
        credentialRequired,
        credentialOptional: p.kind === "openai-compatible" || p.kind === "github-copilot",
      };
    }));
  }
  get(id) { return this.state.providers.find(p => p.id === id) || null; }
  active() { return this.get(this.state.activeProviderId) || this.state.providers[0] || null; }
  async credential(record) {
    const envKey = envCredentialName(record);
    if (this.env[envKey]?.trim()) return this.env[envKey].trim();
    return this.secretStore.get(`provider:${record.id}`);
  }
  async addOrUpdate(input) {
    if (!input || typeof input !== "object") throw new Error("Provider configuration is required.");
    const kind = String(input.kind || "");
    if (!PROVIDER_KINDS[kind]) throw new Error(`Unsupported provider kind: ${kind}`);
    const id = String(input.id || `${kind}-${crypto.randomUUID().slice(0, 8)}`).trim();
    if (!/^[a-zA-Z0-9._-]{2,80}$/.test(id)) throw new Error("Provider ID must contain 2–80 letters, numbers, dots, underscores, or hyphens.");
    const previous = this.get(id);
    const record = {
      id, kind,
      name: String(input.name || PROVIDER_KINDS[kind].label).trim().slice(0, 80),
      baseUrl: String(input.baseUrl || PROVIDER_KINDS[kind].baseUrl).trim().replace(/\/+$/, ""),
      defaultModel: String(input.defaultModel || previous?.defaultModel || "").trim(),
    };
    if (kind === "openai-compatible" && !/^https?:\/\//i.test(record.baseUrl)) throw new Error("A valid HTTP(S) base URL is required for an OpenAI-compatible provider.");
    if (input.apiKey?.trim()) await this.secretStore.set(`provider:${id}`, input.apiKey.trim());
    this.state.providers = [...this.state.providers.filter(p => p.id !== id), record];
    if (!this.state.activeProviderId) this.state.activeProviderId = id;
    this.save();
    return { ...record, active: id === this.state.activeProviderId };
  }
  setActive(id) {
    if (!this.get(id)) throw new Error(`Unknown provider: ${id}`);
    this.state.activeProviderId = id; this.save(); return this.get(id);
  }
  async remove(id) {
    if (!this.get(id)) throw new Error(`Unknown provider: ${id}`);
    await this.secretStore.delete(`provider:${id}`).catch(() => {});
    this.state.providers = this.state.providers.filter(p => p.id !== id);
    if (this.state.activeProviderId === id) this.state.activeProviderId = this.state.providers[0]?.id || null;
    this.save();
  }
  async create(id = this.state.activeProviderId, options = {}) {
    const record = this.get(id);
    if (!record) throw new Error("No provider is selected. Add a provider first.");
    const token = record.kind === "ollama" || record.kind === "lm-studio" || record.kind === "openai-compatible" ? (await this.credential(record).catch(() => null)) : await this.credential(record);
    const common = { id: record.id, name: record.name, fetchImpl: options.fetchImpl || this.fetchImpl, onRetry: options.onRetry, timeoutMs: options.timeoutMs };
    switch (record.kind) {
      case "openai": case "openai-compatible": case "openrouter": case "ollama": case "lm-studio":
        if (PROVIDER_KINDS[record.kind].requiresKey && !token) throw new Error(`${record.name} needs an API key. Add one for this provider; H2O does not request it at startup.`);
        return new OpenAICompatibleProvider({ ...common, kind: record.kind, baseUrl: record.baseUrl, apiKey: token });
      case "anthropic":
        if (!token) throw new Error("Anthropic needs an API key. Add one for this provider.");
        return new AnthropicProvider({ ...common, apiKey: token, baseUrl: record.baseUrl });
      case "gemini":
        if (!token) throw new Error("Google Gemini needs an API key. Add one for this provider.");
        return new GeminiProvider({ ...common, apiKey: token, baseUrl: record.baseUrl });
      case "github-copilot":
        return new GitHubCopilotProvider({ ...common, gitHubToken: token, useLoggedInUser: !token });
      default: throw new Error(`Provider is not implemented: ${record.kind}`);
    }
  }
  async test(id) {
    const provider = await this.create(id);
    try { return await provider.testConnection(); }
    finally { await provider.close?.(); }
  }
}
