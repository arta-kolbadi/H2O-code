import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const ROOT=path.join(os.homedir(),".h2o");
const SKILLS=path.join(ROOT,"skills"), PLUGINS=path.join(ROOT,"plugins");
const slug=s=>String(s||"").toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
export class ExtensionManager{
 constructor(){fs.mkdirSync(SKILLS,{recursive:true});fs.mkdirSync(PLUGINS,{recursive:true});this.loadedPlugins=new Map()}
 listSkills(){return fs.readdirSync(SKILLS,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>({id:x.name,installed:fs.existsSync(path.join(SKILLS,x.name,"SKILL.md"))}))}
 readSkills(){return this.listSkills().filter(x=>x.installed).map(x=>({id:x.id,content:fs.readFileSync(path.join(SKILLS,x.id,"SKILL.md"),"utf8")}))}
 createSkill(name,content){const id=slug(name);if(!id)throw Error("Skill name is required.");if(!content?.trim())throw Error("Skill content is required.");const dir=path.join(SKILLS,id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"SKILL.md"),content.trim()+"\n",{flag:"w"});return id}
 listPlugins(){return fs.readdirSync(PLUGINS,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>{const p=path.join(PLUGINS,x.name,"plugin.json");try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return {id:x.name,valid:false}}})}
 createPlugin(name,description=""){const id=slug(name);if(!id)throw Error("Plugin name is required.");const dir=path.join(PLUGINS,id);fs.mkdirSync(dir,{recursive:true});const manifest={id,name,description,version:"1.0.0",enabled:false,entry:"index.js",createdAt:new Date().toISOString()};fs.writeFileSync(path.join(dir,"plugin.json"),JSON.stringify(manifest,null,2));
  if(!fs.existsSync(path.join(dir,"index.js")))fs.writeFileSync(path.join(dir,"index.js"),`// H2O local plugin. Only enable plugins you trust; they run with your user permissions.\nexport default {\n  name: ${JSON.stringify(name)},\n  tools: [{\n    name: "hello",\n    description: "Example plugin tool",\n    inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },\n    async execute({ message }) { return "Hello from ${id}: " + message; }\n  }]\n};\n`);
  return manifest}
 async loadEnabledPlugins(){
  this.loadedPlugins.clear();
  for(const manifest of this.listPlugins().filter(x=>x.enabled&&x.valid!==false)){
   const entry=path.join(PLUGINS,manifest.id,manifest.entry||"index.js");
   if(!fs.existsSync(entry))continue;
   try{
    const mod=await import(pathToFileURL(entry).href+`?v=${fs.statSync(entry).mtimeMs}`);
    const plugin=mod.default||mod;
    const tools=Array.isArray(plugin.tools)?plugin.tools:[];
    for(const tool of tools){if(!tool?.name||typeof tool.execute!=="function")continue;this.loadedPlugins.set(`plugin__${manifest.id}__${tool.name}`,{manifest,tool});}
   }catch(error){manifest.loadError=error.message}
  }
  return [...this.loadedPlugins.entries()].map(([name,x])=>({name,description:x.tool.description||`Plugin ${x.manifest.name}`,inputSchema:x.tool.inputSchema||{type:"object",properties:{}}}));
 }
 async executePlugin(name,args,context={}){const item=this.loadedPlugins.get(name);if(!item)throw Error(`Plugin tool unavailable: ${name}`);return item.tool.execute(args,{workspace:context.workspace||process.cwd(),plugin:item.manifest.id});}
 setPlugin(id,enabled){const p=path.join(PLUGINS,id,"plugin.json");if(!fs.existsSync(p))throw Error("Plugin not found.");const m=JSON.parse(fs.readFileSync(p,"utf8"));m.enabled=!!enabled;fs.writeFileSync(p,JSON.stringify(m,null,2));return m}
}
