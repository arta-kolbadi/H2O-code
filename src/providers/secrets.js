const SERVICE = "H2O";

export class KeyringSecretStore {
  constructor({ Entry = null, importer = () => import("@napi-rs/keyring") } = {}) {
    this.Entry = Entry; this.importer = importer;
  }
  async entry(id) {
    if (!this.Entry) {
      let module;
      try { module = await this.importer(); }
      catch { throw new Error("OS credential storage is unavailable. Install dependencies with `npm install`; H2O will not fall back to plaintext key files."); }
      this.Entry = module.Entry;
    }
    if (typeof this.Entry !== "function") throw new Error("OS credential storage did not expose a compatible Entry API.");
    return new this.Entry(SERVICE, String(id));
  }
  async get(id) {
    const entry = await this.entry(id);
    return entry.getPassword() || null;
  }
  async set(id, secret) {
    if (typeof secret !== "string" || !secret.trim()) throw new Error("Credential cannot be empty.");
    const entry = await this.entry(id);
    entry.setPassword(secret.trim());
  }
  async delete(id) {
    const entry = await this.entry(id);
    try { entry.deletePassword(); } catch (error) { if (!/not found|no entry|credential/i.test(error.message)) throw error; }
  }
}

export function envCredentialName(provider) {
  const byKind = {
    openai: "OPENAI_API_KEY", openrouter: "OPENROUTER_API_KEY", anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY", "github-copilot": "COPILOT_GITHUB_TOKEN",
  };
  return byKind[provider.kind] || `H2O_PROVIDER_${String(provider.id).replace(/[^a-z0-9]/gi, "_").toUpperCase()}_API_KEY`;
}
