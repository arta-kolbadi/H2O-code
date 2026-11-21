import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  requestWithPolicy,
  ProviderHttpError,
  redactSecrets,
} from "../src/providers/http.js";
import { OpenAICompatibleProvider } from "../src/providers/openai-compatible.js";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import { GeminiProvider } from "../src/providers/gemini.js";
import { GitHubCopilotProvider } from "../src/providers/copilot.js";
import { ProviderRegistry } from "../src/providers/registry.js";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });

class MemorySecrets {
  values = new Map();
  async get(id) {
    return this.values.get(id) || null;
  }
  async set(id, value) {
    this.values.set(id, value);
  }
  async delete(id) {
    this.values.delete(id);
  }
}

test("provider error exposes useful provider message and preserves HTTP status", async () => {
  await assert.rejects(
    requestWithPolicy(
      async () => json({ error: { message: "account is not permitted" } }, 403),
      "https://provider.invalid",
      {},
      { provider: "Demo", maxAttempts: 1 },
    ),
    (error) =>
      error instanceof ProviderHttpError &&
      error.status === 403 &&
      /account is not permitted/.test(error.message),
  );
});

test("HTTP 429 retries with backoff and succeeds", async () => {
  let calls = 0;
  const response = await requestWithPolicy(
    async () =>
      ++calls === 1
        ? json({ error: { message: "slow down" } }, 429)
        : json({ ok: true }),
    "https://provider.invalid",
    {},
    { provider: "Demo", maxAttempts: 2, onRetry: () => {} },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("secret redaction removes explicitly supplied and common API-key formats", () => {
  const secret = "my-private-token-value";
  const output = redactSecrets(
    `Bearer abcdefghijklmnop sk-proj-abcdefghijklmnopqrstuvwxyz ${secret}`,
    [secret],
  );
  assert.equal(output.includes(secret), false);
  assert.equal(output.includes("abcdefghijklmnop"), false);
  assert.equal(output.includes("sk-proj-abcdefghijklmnopqrstuvwxyz"), false);
  assert.match(output, /\[REDACTED\]/);
});

test("request timeout is propagated as a provider error without hanging", async () => {
  await assert.rejects(
    requestWithPolicy(
      (_url, options) =>
        new Promise((resolve, reject) =>
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          ),
        ),
      "https://slow.invalid",
      {},
      { provider: "Slow", timeoutMs: 10, maxAttempts: 1 },
    ),
    /timed out|Slow:/i,
  );
});

test("OpenAI-compatible adapter lists models and marks free OpenRouter models", async () => {
  const provider = new OpenAICompatibleProvider({
    kind: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "test-key",
    fetchImpl: async () =>
      json({
        data: [
          {
            id: "free/model",
            name: "Free",
            pricing: { prompt: "0", completion: "0" },
          },
          { id: "paid/model" },
        ],
      }),
  });
  const models = await provider.listModels();
  assert.equal(models[0].id, "free/model");
  assert.equal(models[0].free, true);
});

test("OpenAI-compatible adapter returns chat content and passes tool definitions", async () => {
  let sent;
  const provider = new OpenAICompatibleProvider({
    name: "Custom",
    baseUrl: "https://custom.invalid/v1",
    apiKey: "secret",
    fetchImpl: async (url, options) => {
      sent = JSON.parse(options.body);
      return json({
        choices: [{ message: { role: "assistant", content: "hello" } }],
      });
    },
  });
  const result = await provider.chat({
    model: "x",
    messages: [{ role: "user", content: "hi" }],
    tools: [
      {
        type: "function",
        function: { name: "list_files", parameters: { type: "object" } },
      },
    ],
  });
  assert.equal(result.choices[0].message.content, "hello");
  assert.equal(sent.tools[0].function.name, "list_files");
});

test("Anthropic adapter maps tool use to the shared OpenAI-style contract", async () => {
  const provider = new AnthropicProvider({
    apiKey: "secret",
    fetchImpl: async () =>
      json({
        content: [
          { type: "text", text: "checking" },
          {
            type: "tool_use",
            id: "t1",
            name: "list_files",
            input: { path: "." },
          },
        ],
      }),
  });
  const result = await provider.chat({
    model: "claude-test",
    messages: [{ role: "user", content: "inspect" }],
    tools: [
      {
        function: {
          name: "list_files",
          parameters: { type: "object", properties: {} },
        },
      },
    ],
  });
  assert.equal(result.choices[0].message.content, "checking");
  assert.equal(
    result.choices[0].message.tool_calls[0].function.name,
    "list_files",
  );
});

test("Gemini Interactions adapter maps text and function calls", async () => {
  let requestBody;
  const provider = new GeminiProvider({
    apiKey: "secret",
    fetchImpl: async (url, options) => {
      requestBody = JSON.parse(options.body);
      return json({
        id: "interaction-1",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "need files" }],
          },
          {
            type: "function_call",
            id: "call-1",
            name: "list_files",
            arguments: { path: "." },
          },
        ],
      });
    },
  });
  const result = await provider.chat({
    model: "gemini-test",
    messages: [
      { role: "system", content: "system" },
      { role: "user", content: "inspect" },
    ],
    tools: [
      { function: { name: "list_files", parameters: { type: "object" } } },
    ],
  });
  assert.equal(requestBody.input[0].type, "user_input");
  assert.equal(requestBody.system_instruction, "system");
  const historyResponse = await provider.chat({
    model: "gemini-test",
    messages: [
      { role: "user", content: "inspect" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            function: { name: "list_files", arguments: '{"path":"."}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call-1",
        name: "list_files",
        content: "a.txt",
      },
    ],
  });
  assert.equal(requestBody.previous_interaction_id, "interaction-1");
  assert.equal(requestBody.input.length, 1);
  assert.equal(requestBody.input[0].id, undefined);
  assert.equal(requestBody.input[0].type, "function_result");
  assert.equal(requestBody.input[0].call_id, "call-1");
  assert.equal(historyResponse.choices[0].message.content, "need files");
  assert.equal(result.choices[0].message.content, "need files");
  assert.equal(result.choices[0].message.tool_calls[0].id, "call-1");
});

test("Gemini stream emits incremental text and assembles function arguments", async () => {
  const chunks = [
    { event_type: "step.start", step: { type: "model_output", id: "text-1" } },
    {
      event_type: "step.delta",
      step_id: "text-1",
      delta: { type: "text", text: "hello" },
    },
    {
      event_type: "step.start",
      step: { type: "function_call", id: "c1", name: "list_files" },
    },
    {
      event_type: "step.delta",
      step_id: "c1",
      delta: { arguments_delta: '{"path":' },
    },
    {
      event_type: "step.delta",
      step_id: "c1",
      delta: { arguments_delta: '"."}' },
    },
  ];
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks)
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\r\n\r\n`),
        );
      controller.close();
    },
  });
  const provider = new GeminiProvider({
    apiKey: "secret",
    fetchImpl: async () => new Response(stream),
  });
  const seen = [];
  const result = await provider.chat({
    model: "gemini-test",
    messages: [{ role: "user", content: "hi" }],
    tools: [
      { function: { name: "list_files", parameters: { type: "object" } } },
    ],
    onToken: (token) => seen.push(token),
  });
  assert.deepEqual(seen, ["hello"]);
  assert.equal(
    result.choices[0].message.tool_calls[0].function.arguments,
    '{"path":"."}',
  );
  assert.equal(provider.previousInteractionId, null);
});

test("provider registry stores secrets outside provider metadata and supports CRUD", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-providers-"));
  const file = path.join(dir, "providers.json");
  const secrets = new MemorySecrets();
  const registry = new ProviderRegistry({
    file,
    secretStore: secrets,
    env: {},
  });
  const added = await registry.addOrUpdate({
    id: "openai-test",
    kind: "openai",
    name: "OpenAI Test",
    apiKey: "do-not-write-this",
  });
  assert.equal(added.id, "openai-test");
  const saved = fs.readFileSync(file, "utf8");
  assert.equal(saved.includes("do-not-write-this"), false);
  assert.equal(
    (await registry.list()).find((item) => item.id === added.id)
      .credentialConfigured,
    true,
  );
  const provider = await registry.create(added.id, {
    fetchImpl: async () => json({ data: [] }),
  });
  assert.equal(provider.apiKey, "do-not-write-this");
  await registry.remove(added.id);
  assert.equal(await secrets.get("provider:openai-test"), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("provider can be added without credentials; credentials are checked lazily on create", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-lazy-"));
  const registry = new ProviderRegistry({
    file: path.join(dir, "providers.json"),
    secretStore: new MemorySecrets(),
    env: {},
  });
  await registry.addOrUpdate({ id: "openai-lazy", kind: "openai" });
  assert.equal(registry.get("openai-lazy").id, "openai-lazy");
  await assert.rejects(registry.create("openai-lazy"), /needs an API key/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("environment credentials take precedence over keyring credentials", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-env-"));
  const registry = new ProviderRegistry({
    file: path.join(dir, "providers.json"),
    secretStore: new MemorySecrets(),
    env: { OPENAI_API_KEY: "env-secret" },
  });
  await registry.addOrUpdate({ id: "openai-env", kind: "openai" });
  const provider = await registry.create("openai-env");
  assert.equal(provider.apiKey, "env-secret");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("GitHub Copilot adapter uses the SDK client and streams response deltas", async () => {
  let stopped = false;
  class FakeClient {
    constructor(options) {
      this.options = options;
    }
    async start() {}
    async listModels() {
      return [{ id: "copilot-model", name: "Copilot Model" }];
    }
    async getAuthStatus() {
      return { isAuthenticated: true };
    }
    async createSession() {
      const handlers = new Map();
      return {
        on(name, callback) {
          handlers.set(name, callback);
        },
        async sendAndWait() {
          handlers.get("assistant.message_delta")?.({
            data: { deltaContent: "hello" },
          });
          return { data: { content: "hello" } };
        },
        async disconnect() {},
      };
    }
    async stop() {
      stopped = true;
    }
  }
  const provider = new GitHubCopilotProvider({
    gitHubToken: "fake-token",
    sdkLoader: async () => ({ CopilotClient: FakeClient }),
  });
  assert.equal((await provider.listModels())[0].id, "copilot-model");
  const tokens = [];
  const result = await provider.chat({
    messages: [{ role: "user", content: "hello" }],
    onToken: (token) => tokens.push(token),
  });
  assert.equal(result.choices[0].message.content, "hello");
  assert.deepEqual(tokens, ["hello"]);
  await provider.close();
  assert.equal(stopped, true);
});

test("keyring storage adapter never has a plaintext-file fallback", async () => {
  const { KeyringSecretStore } = await import("../src/providers/secrets.js");
  let stored = null;
  class FakeEntry {
    constructor(service, key) {
      assert.equal(service, "H2O");
      this.key = key;
    }
    getPassword() {
      return stored;
    }
    setPassword(value) {
      stored = value;
    }
    deletePassword() {
      stored = null;
    }
  }
  const store = new KeyringSecretStore({ Entry: FakeEntry });
  await store.set("provider:abc", "secure");
  assert.equal(await store.get("provider:abc"), "secure");
  await store.delete("provider:abc");
  assert.equal(stored, null);
});

test("Ollama adapter lists local model tags from the configured host", async () => {
  let requested;
  const provider = new OpenAICompatibleProvider({
    kind: "ollama",
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    fetchImpl: async (url) => {
      requested = String(url);
      return json({
        models: [
          { name: "qwen2.5-coder:7b", details: { parameter_size: "7B" } },
        ],
      });
    },
  });
  const models = await provider.listModels();
  assert.equal(requested, "http://127.0.0.1:11434/api/tags");
  assert.equal(models[0].id, "qwen2.5-coder:7b");
  assert.equal(models[0].free, true);
});

test("OpenAI-compatible streaming parses CRLF SSE frames and tool-call deltas", async () => {
  const chunks = [
    { choices: [{ delta: { content: "Hi" } }] },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call-1",
                function: { name: "list_files", arguments: '{"path":' },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"."}' } }],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
  ];
  const stream = new ReadableStream({
    start(controller) {
      for (const item of chunks)
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(item)}\r\n\r\n`),
        );
      controller.enqueue(new TextEncoder().encode("data: [DONE]\r\n\r\n"));
      controller.close();
    },
  });
  const provider = new OpenAICompatibleProvider({
    name: "Demo",
    baseUrl: "https://demo.invalid/v1",
    fetchImpl: async () => new Response(stream),
  });
  const received = [];
  const result = await provider.chat({
    model: "demo-model",
    messages: [{ role: "user", content: "hi" }],
    onToken: (token) => received.push(token),
  });
  assert.deepEqual(received, ["Hi"]);
  assert.equal(
    result.choices[0].message.tool_calls[0].function.name,
    "list_files",
  );
  assert.equal(
    result.choices[0].message.tool_calls[0].function.arguments,
    '{"path":"."}',
  );
  assert.equal(result.choices[0].finish_reason, "tool_calls");
});

test("task router prefers free models and selects stronger models for complex requests", async () => {
  const { selectModel } = await import("../src/providers/model-router.js");
  const models = [
    { id: "provider/fast-mini", name: "Fast Mini", free: true },
    { id: "provider/strong-reasoner", name: "Strong Reasoner", free: true },
    { id: "provider/paid-opus", name: "Paid Opus", free: false },
  ];
  const simple = selectModel(models, { prompt: "Say hello", preferFree: true });
  const complex = selectModel(models, {
    prompt: "Review the architecture and debug the multi-file security issue",
    preferFree: true,
  });
  assert.equal(simple.id, "provider/fast-mini");
  assert.equal(complex.id, "provider/strong-reasoner");
});

test("manual router selection keeps an explicit model ID", async () => {
  const { selectModel } = await import("../src/providers/model-router.js");
  const choice = selectModel([{ id: "x", free: true }], {
    requested: "not-in-catalog",
  });
  assert.equal(choice.id, "not-in-catalog");
  assert.equal(choice.reason, "manual model ID");
});

test("Dashboard provider API routes expose CRUD, test, and selection operations", async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let startDashboard;

  try {
    process.env.GOOGLE_CLIENT_ID = "";
    process.env.GOOGLE_CLIENT_SECRET = "";

    ({ startDashboard } = await import("../src/dashboard.js"));
  } finally {
    if (previousClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = previousClientId;
    }

    if (previousClientSecret === undefined) {
      delete process.env.GOOGLE_CLIENT_SECRET;
    } else {
      process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
    }
  }
  const calls = [];
  const api = {
    status: () => ({ status: "ready" }),
    history: () => ({ messages: [], terminal: [] }),
    files: async () => ["src/index.js", "README.md"],
    readFile: async (file) => `contents:${file}`,
    memoryItems: (query) => [
      { id: 7, kind: "project", content: `note:${query}` },
    ],
    createMemory: (content) => content.length,
    removeMemory: (id) => id === 7,
    newChat: () => true,
    providers: async () => [
      { id: "demo", name: "Demo", kind: "openai", credentialConfigured: true },
    ],
    addProvider: async (input) => {
      calls.push(["add", input.id]);
      return input;
    },
    testProvider: async (id) => ({ provider: id, modelCount: 3 }),
    useProvider: async (id) => ({ id, name: "Demo", model: "auto" }),
    removeProvider: async (id) => {
      calls.push(["remove", id]);
    },
    setFreePreference: (enabled) => !!enabled,
    setMode: (mode) => mode,
  };
  const server = startDashboard(api, 0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const testSession = server.h2oCreateTestSession();
  const auth = {
    "x-h2o-token": server.h2oToken,
    cookie: `h2o_session=${testSession}`,
  };
  try {
    const shell = await fetch(base).then((response) => response.text());
    assert.match(shell, /H2O — Local AI Workspace/);
    const authStatus = await fetch(`${base}/auth/status`).then((response) =>
      response.json(),
    );
    assert.equal(authStatus.authenticated, false);
    assert.equal(authStatus.configured, false);
    const oauthStart = await fetch(`${base}/auth/google/start`, {
      redirect: "manual",
    });
    assert.equal(oauthStart.status, 503);
    assert.match(shell, /src="\/dashboard-app\.js"/);
    const appBundle = await fetch(`${base}/dashboard-app.js`);
    assert.equal(appBundle.status, 200);
    assert.match(await appBundle.text(), /createRoot/);
    const denied = await fetch(`${base}/api/providers`);
    assert.equal(denied.status, 401);
    const badOrigin = await fetch(`${base}/api/providers`, {
      headers: { ...auth, origin: "http://evil.example" },
    });
    assert.equal(badOrigin.status, 403);
    const listed = await fetch(`${base}/api/providers`, { headers: auth }).then(
      (response) => response.json(),
    );
    assert.equal(listed.providers[0].id, "demo");
    const files = await fetch(`${base}/api/files`, { headers: auth }).then(
      (response) => response.json(),
    );
    assert.deepEqual(files.files, ["src/index.js", "README.md"]);
    const file = await fetch(`${base}/api/file`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ path: "README.md" }),
    }).then((response) => response.json());
    assert.equal(file.content, "contents:README.md");
    const memory = await fetch(`${base}/api/memory?q=abc`, {
      headers: auth,
    }).then((response) => response.json());
    assert.equal(memory.items[0].content, "note:abc");
    const savedMemory = await fetch(`${base}/api/memory`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ content: "a note" }),
    }).then((response) => response.json());
    assert.equal(savedMemory.id, 6);
    const removedMemory = await fetch(`${base}/api/memory/remove`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ id: 7 }),
    }).then((response) => response.json());
    assert.equal(removedMemory.removed, true);
    const newChat = await fetch(`${base}/api/new`, {
      method: "POST",
      headers: auth,
    }).then((response) => response.json());
    assert.equal(newChat.ok, true);
    const added = await fetch(`${base}/api/providers`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ id: "new-provider" }),
    }).then((response) => response.json());
    assert.equal(added.provider.id, "new-provider");
    const tested = await fetch(`${base}/api/providers/test`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ id: "demo" }),
    }).then((response) => response.json());
    assert.equal(tested.result.modelCount, 3);
    const active = await fetch(`${base}/api/providers/active`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ id: "demo" }),
    }).then((response) => response.json());
    assert.equal(active.active.id, "demo");
    const mode = await fetch(`${base}/api/mode`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ mode: "plan" }),
    }).then((response) => response.json());
    assert.equal(mode.mode, "plan");
    const preference = await fetch(`${base}/api/preferences/free-models`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ enabled: false }),
    }).then((response) => response.json());
    assert.equal(preference.preferFreeModels, false);
    await fetch(`${base}/api/providers/demo`, {
      method: "DELETE",
      headers: auth,
    });
    assert.deepEqual(calls, [
      ["add", "new-provider"],
      ["remove", "demo"],
    ]);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("React dashboard shell loads external application bundle", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(
    path.join(here, "../src/dashboard.html"),
    "utf8",
  );
  const script = fs.readFileSync(
    path.join(here, "../src/dashboard-app.js"),
    "utf8",
  );
  assert.match(html, /name="h2o-token" content="__H2O_TOKEN__"/);
  assert.match(html, /src="\/vendor\/react\.js"/);
  assert.match(html, /src="\/vendor\/react-dom\.js"/);
  assert.match(html, /src="\/dashboard-app\.js"/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotThrow(() => new Function(script));
});
