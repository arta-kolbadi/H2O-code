import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { resolveWorkspacePath, isLowRiskCommand, WorkspaceTools } from "../src/tools.js";
test("workspace path prevents traversal",()=>{const base=path.join(os.tmpdir(),"h2o-test");assert.throws(()=>resolveWorkspacePath(base,"../escape"));});
test("safe command policy",()=>{assert.equal(isLowRiskCommand("git status"),true);assert.equal(isLowRiskCommand("npm test"),true);assert.equal(isLowRiskCommand("npm install"),false);assert.equal(isLowRiskCommand("git status && whoami"),false)});
test("file write undo",async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"h2o-"));const t=new WorkspaceTools(dir);await t.execute("write_file",{path:"a.txt",content:"hello"});assert.equal(fs.readFileSync(path.join(dir,"a.txt"),"utf8"),"hello");t.undo();assert.equal(fs.existsSync(path.join(dir,"a.txt")),false);fs.rmSync(dir,{recursive:true,force:true})});
test("workspace can switch to an existing folder",()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"h2o-ws-"));const t=new WorkspaceTools(process.cwd());assert.equal(t.setWorkspace(dir),`Workspace changed to ${dir}`);fs.rmSync(dir,{recursive:true,force:true})});

test("create_directory creates nested folders inside the workspace", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-mkdir-"));
  const tools = new WorkspaceTools(dir);
  const result = await tools.execute("create_directory", { path: "src/components/ui" });
  assert.match(result, /Created directory/);
  assert.equal(fs.statSync(path.join(dir, "src", "components", "ui")).isDirectory(), true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("create_directory rejects workspace traversal", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h2o-mkdir-"));
  const tools = new WorkspaceTools(dir);
  await assert.rejects(() => tools.execute("create_directory", { path: "../outside" }), /outside the current workspace/);
  fs.rmSync(dir, { recursive: true, force: true });
});
