import { selectModel } from "./providers/model-router.js";
import { toolDefinitions } from "./tools.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD_SYSTEM = fs.readFileSync(path.join(HERE, "prompts", "build.system.md"), "utf8");
const PLAN_SYSTEM = fs.readFileSync(path.join(HERE, "prompts", "plan.system.md"), "utf8");
export class CodingAgent {
  constructor(provider,config,tools,extensions={}) { this.provider=provider; this.config=config; this.tools=tools; this.extensions=extensions; this.reset(); }
  reset() { this.messages=[{role:"system",content:BUILD_SYSTEM}]; this.provider.resetConversation?.(); }
  async ask(text,onActivity=()=>{}, { mode = "build", signal } = {}) {
    const activeMode = mode === "plan" ? "plan" : "build";
    const requestMessages = activeMode === "plan" ? this.messages.map(message => ({ ...message })) : this.messages;
    if (activeMode === "plan") {
      requestMessages[0] = {
        role: "system",
        content: PLAN_SYSTEM
      };
    }
    const skillContext = this.extensions.extensions?.readSkills?.() || [];
    if (skillContext.length && requestMessages[0]?.role === "system") {
      requestMessages[0] = {...requestMessages[0], content: requestMessages[0].content + "\\n\\nAvailable H2O Skills (use as guidance when relevant):\\n" + skillContext.map(s => `\\n--- SKILL: ${s.id} ---\\n${s.content}`).join("\\n")};
    }

    // Natural-language workspace navigation, e.g. "go to E:\\My First CLI\\my-cli"
    const quoted=text.match(/(?:go to|open folder|switch workspace to|برو به|برو داخل)\s+["']([^"']+)["']/i);
    const unquoted=text.match(/(?:go to|open folder|switch workspace to|برو به|برو داخل)\s+([A-Za-z]:\\.*?)(?:\s+(?:and|then|و|and inspect|to inspect)\b|$)/i);
    const match=quoted || unquoted;
    if(match && activeMode === "build") {
      const target=match[1].trim().replace(/[. ]+$/,"");
      try {
        const result=this.tools.setWorkspace(target);
        const files=await this.tools.execute("list_files",{});
        const listing=files.split("\n").slice(0,100).join("\n");
        this.messages.push({role:"user",content:text});
        const reply=`${result}. Here are the project files I found:\n${listing}`;
        this.messages.push({role:"assistant",content:reply});
        return reply;
      } catch(e) {
        this.messages.push({role:"user",content:text});
        return `I couldn't switch workspace: ${e.message}`;
      }
    }
    this.messages.push({role:"user",content:text});
    if (activeMode === "plan") requestMessages.push({role:"user",content:text});
    let selectedModel = this.config.model || "auto";
    if (selectedModel === "auto") {
      const available = await this.provider.listModels();
      const choice = selectModel(available, { prompt: text, preferFree: this.config.preferFreeModels !== false });
      selectedModel = choice.id;
      onActivity(`Model · ${selectedModel} (${choice.reason})`);
    }
    for(let i=0;i<(this.config.maxToolRounds||8);i++) {
      if (signal?.aborted) throw new Error("Task cancelled.");
      onActivity(i===0?"Thinking...":"Working with project tools...");
      const mcpTools = (this.extensions.mcp?.tools || []).map(t => ({type:"function",function:{name:`mcp__${t.serverId}__${t.name}`.replace(/[^a-zA-Z0-9_-]/g,"_"),description:`MCP ${t.serverId}: ${t.description}`.slice(0,1000),parameters:t.inputSchema||{type:"object",properties:{}}}}));
      const pluginTools = await (this.extensions.extensions?.loadEnabledPlugins?.() || Promise.resolve([]));
      const pluginDefinitions = pluginTools.map(t=>({type:"function",function:{name:t.name,description:t.description.slice(0,1000),parameters:t.inputSchema}}));
      const response=await this.provider.chat({model:selectedModel,messages:requestMessages,tools:activeMode === "plan" ? [] : [...toolDefinitions,...mcpTools,...pluginDefinitions],temperature:this.config.temperature,signal});
      const msg=response.choices?.[0]?.message;
      if(!msg) throw new Error("Model returned an empty response.");
      if (activeMode === "plan" && msg.tool_calls?.length) {
        const explanation = msg.content || "I can help plan this, but Plan Mode does not execute project tools.";
        const safeReply = `${explanation}\n\nPlan Mode is active, so no project tools were executed.`;
        this.messages.push({ role: "assistant", content: safeReply });
        return safeReply;
      }
      this.messages.push(msg);
      if(!msg.tool_calls?.length) return msg.content||"(No text response.)";
      for(const call of msg.tool_calls) {
        if (signal?.aborted) throw new Error("Task cancelled.");
        const name=call.function?.name; let args={};
        try { args=JSON.parse(call.function?.arguments||"{}"); } catch {}
        onActivity(`Tool · ${name}`);
        let result;
        try {
          if (name?.startsWith("plugin__")) {
            result=await this.extensions.extensions.executePlugin(name,args,{workspace:this.tools.workspace});
          } else if (name?.startsWith("mcp__")) {
            const parts=name.split("__"); const serverId=parts[1], toolName=parts.slice(2).join("__");
            const resultMcp=await this.extensions.mcp.call(serverId,toolName,args);
            result=JSON.stringify(resultMcp);
          } else result=await this.tools.execute(name,args,{signal});
        } catch(e) { result=`Tool error: ${e.message}`; }
        this.messages.push({role:"tool",tool_call_id:call.id,name,content:String(result).slice(0,20000)});
      }
    }
    return "Stopped at the tool-call safety limit. Review the changes and ask me to continue.";
  }
}
