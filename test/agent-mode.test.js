import test from "node:test";
import assert from "node:assert/strict";
import { CodingAgent } from "../src/agent.js";

test("Plan mode sends no tools and never executes returned tool calls", async () => {
  let captured;
  let executions = 0;
  const provider = {
    chat: async request => { captured = request; return { choices: [{ message: { role: "assistant", content: "Here is a plan.", tool_calls: [{ id: "call-1", function: { name: "write_file", arguments: JSON.stringify({ path: "x.txt", content: "bad" }) } }] } }] }; },
  };
  const tools = { execute: async () => { executions++; }, setWorkspace: () => "changed" };
  const agent = new CodingAgent(provider, { model: "test", maxToolRounds: 2 }, tools);
  const result = await agent.ask("Create a file", () => {}, { mode: "plan" });
  assert.deepEqual(captured.tools, []);
  assert.equal(executions, 0);
  assert.match(result, /Plan Mode is active/);
});

test("Build mode keeps project tools available", async () => {
  let captured;
  const provider = { chat: async request => { captured = request; return { choices: [{ message: { role: "assistant", content: "Ready." } }] }; } };
  const agent = new CodingAgent(provider, { model: "test", maxToolRounds: 1 }, { execute: async () => "", setWorkspace: () => "changed" });
  await agent.ask("Inspect this project", () => {}, { mode: "build" });
  assert.ok(captured.tools.length > 0);
});
