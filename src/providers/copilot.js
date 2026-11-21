export class GitHubCopilotProvider {
  constructor({ id, name = "GitHub Copilot", gitHubToken, useLoggedInUser = true, sdkLoader = () => import("@github/copilot-sdk") }) {
    this.id = id || "github-copilot"; this.kind = "github-copilot"; this.name = name;
    this.gitHubToken = gitHubToken || null; this.useLoggedInUser = useLoggedInUser; this.sdkLoader = sdkLoader;
    this.client = null;
  }
  async start() {
    if (this.client) return this.client;
    let sdk;
    try { sdk = await this.sdkLoader(); }
    catch { throw new Error("GitHub Copilot requires the official @github/copilot-sdk package. Install it with: npm install @github/copilot-sdk"); }
    const Client = sdk.CopilotClient;
    if (!Client) throw new Error("The installed Copilot SDK does not expose CopilotClient.");
    this.client = new Client(this.gitHubToken ? { gitHubToken: this.gitHubToken } : { useLoggedInUser: this.useLoggedInUser });
    await this.client.start();
    return this.client;
  }
  async listModels() {
    const models = await (await this.start()).listModels();
    return models.map(model => ({ id: model.id, name: model.name || model.label || model.id, context: model.capabilities?.limits?.max_context_window_tokens || null, free: false }));
  }
  async testConnection() {
    const client = await this.start();
    const [auth, models] = await Promise.all([client.getAuthStatus?.().catch(() => null), this.listModels()]);
    return { ok: true, provider: this.name, authenticated: auth?.isAuthenticated ?? auth?.authenticated ?? null, modelCount: models.length, sampleModels: models.slice(0, 5) };
  }
  async chat({ model = "auto", messages = [], signal, onToken }) {
    if (signal?.aborted) throw signal.reason || new Error("Request cancelled.");
    const client = await this.start();
    const prompt = messages.filter(message => message.role !== "tool").map(message => `${message.role.toUpperCase()}: ${typeof message.content === "string" ? message.content : ""}`).join("\n\n");
    const session = await client.createSession({ model, mode: "empty", events: { streaming: !!onToken } });
    const abort = () => { try { session.abort?.(); } catch {} };
    signal?.addEventListener("abort", abort, { once: true });
    let delta = "";
    if (onToken) session.on("assistant.message_delta", event => { const chunk = event?.data?.deltaContent || ""; if (chunk) { delta += chunk; onToken(chunk); } });
    try {
      const response = await session.sendAndWait({ prompt }, 120_000);
      if (signal?.aborted) throw signal.reason || new Error("Request cancelled.");
      const content = response?.data?.content || delta;
      return { choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }] };
    } finally {
      signal?.removeEventListener("abort", abort);
      try { await session.disconnect?.(); } catch {}
    }
  }
  async close() { if (this.client) { await this.client.stop(); this.client = null; } }
}
