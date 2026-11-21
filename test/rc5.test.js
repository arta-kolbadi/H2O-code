import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventBus } from "../src/core/event-bus.js";
import { PermissionEngine, classifyRisk } from "../src/security/permission-engine.js";
import { SessionStore } from "../src/session.js";
import { ProjectMemory } from "../src/memory/project-memory.js";
import { ChangeManager } from "../src/changes/change-manager.js";
import { AgentOrchestrator } from "../src/agents/orchestrator.js";
import { BrowserAgent } from "../src/tools/browser/browser-agent.js";
import { WorkspaceTools, toolDefinitions } from "../src/tools.js";

test("EventBus isolates listener failures and supports unsubscribe", () => {
  const bus = new EventBus();
  let seen = 0;
  const off = bus.on("task.started", () => { throw new Error("listener failure"); });
  bus.on("task.started", event => { assert.equal(event.type, "task.started"); seen++; });
  bus.emit("task.started", { taskId: "x" });
  off();
  bus.emit("task.started", { taskId: "y" });
  assert.equal(seen, 2);
});

test("adaptive risk classification and explicit approval", async () => {
  assert.equal(classifyRisk({ tool: "read_file" }), "low");
  assert.equal(classifyRisk({ tool: "write_file", path: "src/a.js" }), "medium");
  assert.equal(classifyRisk({ command: "git reset --hard" }), "critical");
  let requested = 0;
  const engine = new PermissionEngine({ approve: async action => { requested++; return action.risk === "critical"; } });
  assert.equal((await engine.authorize({ tool: "read_file" })).allowed, true);
  assert.equal((await engine.authorize({ command: "git reset --hard" })).allowed, true);
  assert.equal(requested, 1);
});

test("SQLite SessionStore persists messages, terminal output, and queued items", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-sqlite-"));
  const db = path.join(dir, "test.sqlite");
  const store = new SessionStore({ databasePath: db });
  store.addMessage("user", "hello");
  store.addTerminal("node --version", "v22");
  store.enqueueMessage("next task");
  assert.equal(store.messages()[0].content, "hello");
  assert.equal(store.terminal()[0].output, "v22");
  assert.equal(store.queuedMessages()[0].content, "next task");
  store.close();
  const reopened = new SessionStore({ sessionId: store.id, databasePath: db });
  assert.equal(reopened.messages()[0].content, "hello");
  reopened.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ProjectMemory is workspace-scoped and rejects credential-like content", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-memory-"));
  const db = path.join(dir, "memory.sqlite");
  const memory = new ProjectMemory({ databasePath: db, workspace: path.join(dir, "project") });
  const id = memory.add("Use Node.js ESM and SQLite", { kind: "architecture" });
  assert.equal(memory.search("SQLite")[0].id, id);
  assert.throws(() => memory.add("api_key: do-not-store-this"), /credential detected/i);
  assert.equal(memory.remove(id), 1);
  memory.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ChangeManager rollback preserves files changed after the snapshot", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-change-"));
  const file = path.join(dir, "a.txt");
  fs.writeFileSync(file, "before");
  const manager = new ChangeManager(dir);
  const set = manager.begin("test");
  const entry = manager.capture(set, "a.txt");
  fs.writeFileSync(file, "after");
  manager.recordAfter(set, entry);
  fs.writeFileSync(file, "user edit after agent");
  const result = manager.rollback(set);
  assert.equal(result[0].restored, false);
  assert.equal(fs.readFileSync(file, "utf8"), "user edit after agent");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("AgentOrchestrator enforces bounded role pipeline", async () => {
  const calls = [];
  const agents = Object.fromEntries(["planner","coder","reviewer","tester"].map(role => [role, {
    run: async input => {
      calls.push(role);
      if (role === "reviewer") return { approved: true };
      if (role === "tester") return { passed: true };
      return `${role}-output`;
    }
  }]));
  const result = await new AgentOrchestrator({ agents }).run("make a feature");
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["planner","coder","reviewer","tester"]);
});

test("BrowserAgent rejects non-http protocols and enforces optional host allowlist", () => {
  const lockedBrowser = new BrowserAgent();
  assert.throws(() => lockedBrowser.assertAllowed("https://example.com"), /allowlist/i);
  const browser = new BrowserAgent({ allowedHosts: ["example.com"] });
  assert.throws(() => browser.assertAllowed("file:///etc/passwd"), /HTTP\(S\)/);
  assert.throws(() => browser.assertAllowed("https://evil.example"), /Blocked browser host/);
  assert.doesNotThrow(() => browser.assertAllowed("https://example.com/docs"));
});

test("Browser tools are exposed to the Build Agent and enforce host allowlist before launch", async () => {
  const names = toolDefinitions.map(item => item.function.name);
  for (const name of ["browser_open","browser_get_text","browser_screenshot","browser_click","browser_type","browser_wait","browser_back","browser_scroll","browser_close"]) {
    assert.ok(names.includes(name), `missing ${name}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-browser-tools-"));
  const tools = new WorkspaceTools(dir);
  await assert.rejects(
    tools.execute("browser_open", { url: "https://dash.cloudflare.com/" }),
    /allowlist/i
  );
  await assert.rejects(
    tools.execute("browser_open", { url: "file:///C:/Windows/win.ini" }),
    /HTTP\(S\)/i
  );
  await tools.browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("Browser hostname allowlist can be updated without restarting the adapter", () => {
  const browser = new BrowserAgent();
  assert.throws(() => browser.assertAllowed("https://example.com"), /allowlist/i);
  browser.setAllowedHosts(["example.com"]);
  assert.equal(browser.assertAllowed("https://example.com").hostname, "example.com");
});
