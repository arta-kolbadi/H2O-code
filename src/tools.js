import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ChangeManager } from "./changes/change-manager.js";
import { BrowserAgent } from "./tools/browser/browser-agent.js";
const execAsync = promisify(exec);
const TEXT_EXT = new Set([".txt",".md",".js",".mjs",".cjs",".ts",".tsx",".jsx",".json",".css",".html",".py",".yml",".yaml",".toml",".sql",".java",".php",".sh",".bat",".go",".rs"]);
const IGNORE = new Set(["node_modules",".git",".next","dist","build",".h2o",".venv","venv"]);

export function resolveWorkspacePath(workspace, requested) {
  const base = path.resolve(workspace);
  const target = path.resolve(base, requested || ".");
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error("Blocked: path is outside the current workspace.");
  return target;
}

function assertRealWorkspacePath(workspace, target) {
  const base = fs.realpathSync(workspace);
  let probe = target;
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) throw new Error("Could not resolve target parent.");
    probe = parent;
  }
  const real = fs.realpathSync(probe);
  if (real !== base && !real.startsWith(base + path.sep)) {
    throw new Error("Blocked: path resolves outside the current workspace through a symbolic link.");
  }
  if (fs.existsSync(target) && fs.realpathSync(target) !== base &&
      !fs.realpathSync(target).startsWith(base + path.sep)) {
    throw new Error("Blocked: target symbolic link points outside the workspace.");
  }
}

function walk(dir, base, results, max = 500) {
  if (results.length >= max) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, results, max);
    else results.push(path.relative(base, full));
    if (results.length >= max) break;
  }
}
export function isLowRiskCommand(command) {
  const s = command.trim().replace(/\s+/g," ").toLowerCase();
  if (/[;&|`$<>]/.test(s)) return false;
  return ["git status","git diff","git log","git branch","node --version","npm --version","npm test","npm run test","npm run check","npm run build","pwd","ls","dir","where node","which node"]
    .some(p => s === p || s.startsWith(p + " "));
}
export const toolDefinitions = [
  { type:"function", function:{ name:"list_files", description:"List files in the active workspace.", parameters:{type:"object",properties:{directory:{type:"string"}},required:[]} } },
  { type:"function", function:{ name:"read_file", description:"Read a UTF-8 text file in the active workspace.", parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]} } },
  { type:"function", function:{ name:"search_files", description:"Search text files for a phrase.", parameters:{type:"object",properties:{query:{type:"string"},directory:{type:"string"}},required:["query"]} } },
  { type:"function", function:{ name:"create_directory", description:"Create a directory inside the active workspace. Parent directories are created by default.", parameters:{type:"object",properties:{path:{type:"string"},recursive:{type:"boolean"},existOk:{type:"boolean"}},required:["path"]} } },
  { type:"function", function:{ name:"write_file", description:"Write a UTF-8 file. An undo snapshot is created.", parameters:{type:"object",properties:{path:{type:"string"},content:{type:"string"}},required:["path","content"]} } },
  { type:"function", function:{ name:"git_status", description:"Get Git status.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"git_diff", description:"Get Git diff.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"run_tests", description:"Run npm test.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"run_command", description:"Run a shell command in the workspace. Risky commands need approval.", parameters:{type:"object",properties:{command:{type:"string"}},required:["command"]} } },
  { type:"function", function:{ name:"browser_open", description:"Open an HTTP(S) page in the visible Browser Agent. The hostname must be explicitly allowlisted by the user.", parameters:{type:"object",properties:{url:{type:"string"}},required:["url"]} } },
  { type:"function", function:{ name:"browser_get_text", description:"Read visible text from the current browser page.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"browser_screenshot", description:"Save a screenshot of the current browser page locally and return its path.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"browser_click", description:"Click a visible page element using a CSS selector. User approval is required.", parameters:{type:"object",properties:{selector:{type:"string"}},required:["selector"]} } },
  { type:"function", function:{ name:"browser_type", description:"Type text into a visible page field. User approval is required. Never ask for or type passwords, API keys, or authentication codes.", parameters:{type:"object",properties:{selector:{type:"string"},text:{type:"string"}},required:["selector","text"]} } },
  { type:"function", function:{ name:"browser_wait", description:"Wait for a page selector to appear.", parameters:{type:"object",properties:{selector:{type:"string"},timeoutMs:{type:"integer"}},required:["selector"]} } },
  { type:"function", function:{ name:"browser_back", description:"Go back one page in the browser.", parameters:{type:"object",properties:{},required:[]} } },
  { type:"function", function:{ name:"browser_scroll", description:"Scroll the current page vertically.", parameters:{type:"object",properties:{pixels:{type:"integer"}},required:[]} } },
  { type:"function", function:{ name:"browser_close", description:"Close the Browser Agent.", parameters:{type:"object",properties:{},required:[]} } }
];
export class WorkspaceTools {
  constructor(workspace, { approve = async () => false, approveBrowser = async () => false, onWorkspaceChange = () => {}, browserAllowedHosts = [] } = {}) {
    this.workspace = path.resolve(workspace);
    this.approve = approve;
    this.approveBrowser = approveBrowser;
    this.browser = new BrowserAgent({ allowedHosts: browserAllowedHosts, headless: false });
    this.onWorkspaceChange = onWorkspaceChange;
    this.undoStack = [];
    this.changeManager = new ChangeManager(this.workspace);
    this.lastChangeSet = null;
  }
  setWorkspace(next) {
    const resolved = path.resolve(next);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error(`Folder does not exist: ${resolved}`);
    this.workspace = resolved;
    this.undoStack = [];
    this.changeManager = new ChangeManager(this.workspace);
    this.lastChangeSet = null;
    this.onWorkspaceChange(resolved);
    return `Workspace changed to ${resolved}`;
  }
  async execute(name,args={}, { signal } = {}) {
    if (signal?.aborted) throw new Error("Task cancelled.");
    switch(name) {
      case "list_files": {
        const dir=resolveWorkspacePath(this.workspace,args.directory||".");
        const out=[]; walk(dir,this.workspace,out); return out.join("\n")||"(empty)";
      }
      case "read_file": {
        const f=resolveWorkspacePath(this.workspace,args.path);assertRealWorkspacePath(this.workspace,f);const st=fs.statSync(f);
        if(!st.isFile()) throw new Error("Not a file.");
        if(st.size>400000) throw new Error("File exceeds 400 KB.");
        return fs.readFileSync(f,"utf8");
      }
      case "search_files": {
        const base=resolveWorkspacePath(this.workspace,args.directory||".");
        const out=[]; walk(base,this.workspace,out);
        const hits=[];
        for(const rel of out) {
          if(!TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
          try {
            const filePath=path.join(this.workspace,rel);
            assertRealWorkspacePath(this.workspace,filePath);
            fs.readFileSync(filePath,"utf8").split(/\r?\n/).forEach((line,i)=>{
              if(line.toLowerCase().includes(String(args.query).toLowerCase())) hits.push(`${rel}:${i+1}: ${line.slice(0,240)}`);
            });
          } catch {}
          if(hits.length>=100) break;
        }
        return hits.join("\n")||"No matches.";
      }
      case "create_directory": {
        const requested = String(args.path || "").trim();
        if (!requested) throw new Error("Directory path is required.");
        const target = resolveWorkspacePath(this.workspace, requested);
        const workspaceReal = fs.realpathSync(this.workspace);
        let ancestor = target;
        while (!fs.existsSync(ancestor)) {
          const parent = path.dirname(ancestor);
          if (parent === ancestor) throw new Error("Could not find an existing parent directory.");
          ancestor = parent;
        }
        const ancestorReal = fs.realpathSync(ancestor);
        if (ancestorReal !== workspaceReal && !ancestorReal.startsWith(workspaceReal + path.sep)) {
          throw new Error("Blocked: directory resolves outside the current workspace through a symbolic link.");
        }
        if (fs.existsSync(target)) {
          if (!fs.statSync(target).isDirectory()) throw new Error("A file already exists at the requested directory path.");
          if (args.existOk === false) throw new Error("Directory already exists.");
          return `Directory already exists: ${path.relative(this.workspace, target) || "."}`;
        }
        fs.mkdirSync(target, { recursive: args.recursive !== false });
        this.onWorkspaceChange(this.workspace);
        return `Created directory: ${path.relative(this.workspace, target)}`;
      }
      case "write_file": {
        const f=resolveWorkspacePath(this.workspace,args.path);
        fs.mkdirSync(path.dirname(f),{recursive:true});
        assertRealWorkspacePath(this.workspace,f);
        const existed=fs.existsSync(f), previous=existed?fs.readFileSync(f):null;
        const changeSet=this.changeManager.begin(`write_file: ${args.path}`);
        const entry=this.changeManager.capture(changeSet,args.path);
        const temp=`${f}.h2o-tmp-${process.pid}-${Date.now()}`;
        try {
          fs.writeFileSync(temp,String(args.content),"utf8");
          if(signal?.aborted)throw new Error("Task cancelled.");
          fs.renameSync(temp,f);
        } finally { try{if(fs.existsSync(temp))fs.unlinkSync(temp)}catch{} }
        this.changeManager.recordAfter(changeSet,entry);
        this.lastChangeSet=changeSet;
        this.undoStack.push({file:f,existed,previous,changeSet});
        return `Wrote ${path.relative(this.workspace,f)}. ChangeSet ${changeSet.id} created; undo is available.`;
      }
      case "git_status": return (await this.run(["git","status","--short","--branch"])).stdout||"(clean)";
      case "git_diff": return (await this.run(["git","diff","--"])).stdout||"No unstaged changes.";
      case "run_tests": return (await this.run([process.platform==="win32"?"npm.cmd":"npm","test"],{signal})).stdout;
      case "run_command": {
        const command=String(args.command||"").trim();
        if(!command) throw new Error("Empty command.");
        if(!isLowRiskCommand(command) && !(await this.approve(command))) return "User denied command.";
        const shell=process.platform==="win32"?"cmd.exe":"/bin/sh";
        const args2=process.platform==="win32"?["/d","/s","/c",command]:["-lc",command];
        const result=await execAsync(`"${shell}" ${args2.map(x=>`"${x.replaceAll('"','\\"')}"`).join(" ")}`,{cwd:this.workspace,timeout:120000,maxBuffer:1000000,windowsHide:true,signal});
        return [result.stdout,result.stderr].filter(Boolean).join("\n")||"(completed)";
      }
      case "browser_open": {
        this.browser.assertAllowed(String(args.url || ""));
        await this.browser.ensureStarted();
        return JSON.stringify(await this.browser.open(String(args.url || "")));
      }
      case "browser_get_text": return await this.browser.getText();
      case "browser_screenshot": return await this.browser.saveScreenshot();
      case "browser_click": {
        const selector=String(args.selector||"");
        if(!selector) throw new Error("A selector or accessible name is required.");
        if(!(await this.approveBrowser(`Click browser element: ${selector}`))) return "User denied browser click.";
        return await this.browser.click(selector);
      }
      case "browser_type": {
        const selector=String(args.selector||""), value=String(args.text||"");
        if(!selector || !value) throw new Error("Selector and text are required.");
        if(/password|token|api.?key|secret|one.?time|verification|auth.?code/i.test(selector) ||
           /password|api.?key|access.?token|refresh.?token|secret|verification.?code/i.test(value) ||
           /^[A-Za-z0-9_=-]{28,}$/.test(value.trim())) {
          throw new Error("Credential-like browser typing is blocked. Complete authentication manually in the visible browser.");
        }
        if(!(await this.approveBrowser(`Type non-secret text into browser field "${selector}"`))) return "User denied browser typing.";
        return await this.browser.type(selector,value);
      }
      case "browser_wait": return await this.browser.waitFor(String(args.selector||""),Math.min(30000,Math.max(500,Number(args.timeoutMs)||10000)));
      case "browser_back": return await this.browser.back();
      case "browser_scroll": return await this.browser.scroll(Math.max(-2000,Math.min(2000,Number(args.pixels)||600)));
      case "browser_close": await this.browser.close(); return "Browser closed.";
      default: throw new Error(`Unknown tool: ${name}`);
    }
  }
  async run(args,{signal}={}) {
    try {
      if(signal?.aborted)throw new Error("Task cancelled.");
      const [bin,...argv]=args;
      return await execAsync([bin,...argv].map(x=>`"${String(x).replaceAll('"','\\"')}"`).join(" "),{cwd:this.workspace,timeout:120000,maxBuffer:1000000,windowsHide:true,signal});
    } catch(e) { if(signal?.aborted)throw e; return {stdout:e.stdout||"",stderr:e.stderr||e.message}; }
  }
  undo() {
    const item=this.undoStack.pop();
    if(!item) return "Nothing to undo in this session.";
    if(item.changeSet){
      const result=this.changeManager.rollback(item.changeSet);
      const restored=result.filter(x=>x.restored).length;
      const skipped=result.length-restored;
      return `Rollback ${item.changeSet.id}: ${restored} file(s) restored, ${skipped} preserved because they changed afterward.`;
    }
    if(item.existed) fs.writeFileSync(item.file,item.previous);
    else if(fs.existsSync(item.file)) fs.unlinkSync(item.file);
    return `Restored ${path.relative(this.workspace,item.file)}.`;
  }
}
