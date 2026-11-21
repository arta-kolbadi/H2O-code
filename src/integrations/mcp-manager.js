import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const HOME = path.join(os.homedir(), ".h2o");
const FILE = path.join(HOME, "mcp-servers.json");
const safeId = s => String(s).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/^-+|-+$/g,"").slice(0,48);

export class MCPManager {
  constructor({ timeout = 30000 } = {}) {
    this.timeout=timeout; this.processes=new Map(); this.pending=new Map(); this.tools=[];
    fs.mkdirSync(HOME,{recursive:true});
  }
  read(){try{return JSON.parse(fs.readFileSync(FILE,"utf8"))}catch{return {servers:[]}}}
  write(data){fs.writeFileSync(FILE,JSON.stringify(data,null,2),{mode:0o600});}
  list(){return this.read().servers.map(({env,...s})=>({...s,configuredEnvKeys:Object.keys(env||{})}));}
  add({id,name,command,args=[],env={}}){
    id=safeId(id||name); if(!id)throw Error("MCP server id is required.");
    if(!name||!command)throw Error("MCP server name and command are required.");
    if(!Array.isArray(args)||!args.every(x=>typeof x==="string"))throw Error("MCP args must be an array of strings.");
    if(!env||typeof env!=="object"||Array.isArray(env))throw Error("MCP env must be an object.");
    const data=this.read(); const item={id,name:String(name),command:String(command),args,env,enabled:true};
    const i=data.servers.findIndex(x=>x.id===id); if(i>=0)data.servers[i]=item;else data.servers.push(item);
    this.write(data); return {id,name:item.name};
  }
  remove(id){this.disconnect(id);const d=this.read();d.servers=d.servers.filter(x=>x.id!==id);this.write(d);}
  async connect(id){
    const cfg=this.read().servers.find(x=>x.id===id); if(!cfg)throw Error(`Unknown MCP server: ${id}`);
    if(!cfg.enabled)throw Error("MCP server is disabled.");
    if(this.processes.has(id))return this.tools.filter(t=>t.serverId===id);
    const child=spawn(cfg.command,cfg.args||[],{cwd:process.cwd(),env:{...process.env,...cfg.env},stdio:["pipe","pipe","pipe"],windowsHide:true,shell:process.platform==="win32"});
    const state={child,buffer:"",nextId:1,requests:new Map(),stderr:""};this.processes.set(id,state);
    child.stdout.setEncoding("utf8");child.stdout.on("data",chunk=>this.#data(id,chunk));
    child.stderr.setEncoding("utf8");child.stderr.on("data",x=>{state.stderr=(state.stderr+x).slice(-4000)});
    child.on("error",error=>{this.processes.delete(id);this.tools=this.tools.filter(t=>t.serverId!==id);for(const [,p] of state.requests)p.reject(error);});
    child.on("exit",()=>{this.processes.delete(id);this.tools=this.tools.filter(t=>t.serverId!==id);for(const [,p] of state.requests)p.reject(Error(`MCP server ${id} exited.`));});
    try{
      await this.#request(id,"initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"H2O",version:"1.0.0"}});
      this.#notify(id,"notifications/initialized",{});
      const result=await this.#request(id,"tools/list",{});
      const items=(result.tools||[]).map(t=>({serverId:id,name:t.name,description:t.description||"",inputSchema:t.inputSchema||{type:"object",properties:{}}}));
      this.tools=this.tools.filter(t=>t.serverId!==id).concat(items);return items;
    }catch(e){this.disconnect(id);throw new Error(`MCP ${id}: ${e.message}`)}
  }
  #data(id,chunk){
    const s=this.processes.get(id);if(!s)return;s.buffer+=chunk;
    while(s.buffer.includes("\n")){const i=s.buffer.indexOf("\n"),line=s.buffer.slice(0,i).trim();s.buffer=s.buffer.slice(i+1);if(!line)continue;
      let msg;try{msg=JSON.parse(line)}catch{continue}
      const p=s.requests.get(msg.id);if(p){s.requests.delete(msg.id);msg.error?p.reject(Error(msg.error.message||"MCP error")):p.resolve(msg.result||{});}
    }
  }
  #request(id,method,params){
    const s=this.processes.get(id);if(!s)return Promise.reject(Error("MCP process is not connected."));
    const requestId=s.nextId++;
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.requests.delete(requestId);reject(Error(`Timed out: ${method}`))},this.timeout);s.requests.set(requestId,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
      s.child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:requestId,method,params})+"\n",e=>{if(e){clearTimeout(timer);s.requests.delete(requestId);reject(e)}});});
  }
  #notify(id,method,params){const s=this.processes.get(id);s?.child.stdin.write(JSON.stringify({jsonrpc:"2.0",method,params})+"\n");}
  async call(serverId,name,args={}){if(!this.processes.has(serverId))await this.connect(serverId);return this.#request(serverId,"tools/call",{name,arguments:args});}
  async connectAll(){const results=[];for(const s of this.read().servers.filter(x=>x.enabled)){try{const t=await this.connect(s.id);results.push({id:s.id,ok:true,tools:t.length})}catch(e){results.push({id:s.id,ok:false,error:e.message})}}return results;}
  disconnect(id){const s=this.processes.get(id);if(s){s.child.kill();this.processes.delete(id)}this.tools=this.tools.filter(t=>t.serverId!==id);}
  close(){for(const id of [...this.processes.keys()])this.disconnect(id);}
}
