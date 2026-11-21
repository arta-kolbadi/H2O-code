import "./env.js";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const HTML=fs.readFileSync(path.join(HERE,"dashboard.html"),"utf8");
const APP_JS=fs.readFileSync(path.join(HERE,"dashboard-app.js"),"utf8");
const REACT_JS_PATH=path.join(HERE,"..","node_modules","react","umd","react.production.min.js");
const REACT_DOM_JS_PATH=path.join(HERE,"..","node_modules","react-dom","umd","react-dom.production.min.js");
const GOOGLE_CLIENT_ID=process.env.GOOGLE_CLIENT_ID||"";
const GOOGLE_CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET||"";
const GOOGLE_CALLBACK_URL=process.env.GOOGLE_CALLBACK_URL||"http://127.0.0.1:4317/auth/google/callback";
const oauthStates=new Map();
const authDir=path.join(os.homedir(),".h2o");
fs.mkdirSync(authDir,{recursive:true});
const authSecretPath=path.join(authDir,"auth-secret");
let authSecret;
try { authSecret=fs.readFileSync(authSecretPath); } catch { authSecret=crypto.randomBytes(32); fs.writeFileSync(authSecretPath,authSecret,{mode:0o600,flag:"wx"}); }
function signSession(user){const payload=Buffer.from(JSON.stringify({...user,exp:Math.floor(Date.now()/1000)+7*24*60*60})).toString("base64url");const sig=crypto.createHmac("sha256",authSecret).update(payload).digest("base64url");return payload+"."+sig}
function getSession(req){try{const value=cookies(req).h2o_session||"",[payload,sig,...rest]=value.split(".");if(!payload||!sig||rest.length)return null;const expected=crypto.createHmac("sha256",authSecret).update(payload).digest();const actual=Buffer.from(sig,"base64url");if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;const user=JSON.parse(Buffer.from(payload,"base64url").toString());if(!user.sub||user.exp<=Math.floor(Date.now()/1000))return null;return user}catch{return null}}
let googleKeys={expires:0,keys:[]};
function cookies(req){return Object.fromEntries(String(req.headers.cookie||"").split(";").map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf("=");return [v.slice(0,i),decodeURIComponent(v.slice(i+1))]}))}
function setCookie(res,value,maxAge){res.setHeader("Set-Cookie",`h2o_session=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`)}
async function verifyGoogleIdToken(token){
  const parts=String(token||"").split("."); if(parts.length!==3) throw new Error("Google returned an invalid ID token.");
  const header=JSON.parse(Buffer.from(parts[0],"base64url").toString());
  const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString());
  if(header.alg!=="RS256"||!header.kid) throw new Error("Unsupported Google token signature.");
  if(googleKeys.expires<Date.now()) { const r=await fetch("https://www.googleapis.com/oauth2/v3/certs"); if(!r.ok) throw new Error("Could not load Google signing keys."); googleKeys={keys:(await r.json()).keys||[],expires:Date.now()+3600000}; }
  const jwk=googleKeys.keys.find(k=>k.kid===header.kid); if(!jwk) throw new Error("Google signing key was not found.");
  const key=crypto.createPublicKey({key:jwk,format:"jwk"});
  const valid=crypto.verify("RSA-SHA256",Buffer.from(parts[0]+"."+parts[1]),key,Buffer.from(parts[2],"base64url"));
  const now=Math.floor(Date.now()/1000);
  if(!valid||!(claims.iss==="https://accounts.google.com"||claims.iss==="accounts.google.com")||claims.aud!==GOOGLE_CLIENT_ID||claims.exp<=now||!claims.sub) throw new Error("Google identity token validation failed.");
  return {sub:claims.sub,email:claims.email||"",name:claims.name||claims.given_name||claims.email||"Google user",picture:claims.picture||"",email_verified:claims.email_verified===true};
}
function json(res,status,data) {
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
  res.end(JSON.stringify(data));
}
async function body(req) {
  let s=""; for await(const c of req) { s+=c; if(s.length>1_000_000) throw new Error("Request too large"); }
  return s?JSON.parse(s):{};
}
export function startDashboard(api,port=4317) {
  const token=crypto.randomBytes(32).toString("hex");
  const clients=new Set();
  const html=HTML.replaceAll("__H2O_TOKEN__",token);
  const server=http.createServer(async(req,res)=>{
    try {
      const host=String(req.headers.host||"").toLowerCase();
      const url=new URL(req.url,"http://127.0.0.1");
      const allowedHosts=new Set([`127.0.0.1:${server.address()?.port||port}`,`localhost:${server.address()?.port||port}`]);
      if(!allowedHosts.has(host)) return json(res,403,{error:"Invalid Host header."});
      const origin=req.headers.origin;
      if(origin && ![`http://127.0.0.1:${server.address()?.port||port}`,`http://localhost:${server.address()?.port||port}`].includes(origin)) {
        return json(res,403,{error:"Invalid Origin."});
      }
      // Google OAuth: Authorization Code + PKCE, state validation and server-side ID-token verification.
      if(req.method==="GET" && url.pathname==="/auth/status") {
        const session=getSession(req);
        return json(res,200,{authenticated:!!session,user:session?{sub:session.sub,email:session.email,name:session.name,picture:session.picture}:null,configured:!!(GOOGLE_CLIENT_ID&&GOOGLE_CLIENT_SECRET)});
      }
      if(req.method==="GET" && url.pathname==="/auth/google/start") {
        if(!GOOGLE_CLIENT_ID||!GOOGLE_CLIENT_SECRET) return json(res,503,{error:"Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env."});
        const state=crypto.randomBytes(32).toString("base64url"), verifier=crypto.randomBytes(48).toString("base64url");
        const challenge=crypto.createHash("sha256").update(verifier).digest("base64url");
        oauthStates.set(state,{verifier,created:Date.now()});
        for(const [k,v] of oauthStates) if(Date.now()-v.created>600000) oauthStates.delete(k);
        const q=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,redirect_uri:GOOGLE_CALLBACK_URL,response_type:"code",scope:"openid email profile",state,code_challenge:challenge,code_challenge_method:"S256",prompt:"select_account"});
        res.writeHead(302,{Location:"https://accounts.google.com/o/oauth2/v2/auth?"+q.toString(),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}); return res.end();
      }
      if(req.method==="GET" && url.pathname==="/auth/google/callback") {
        const state=url.searchParams.get("state"),code=url.searchParams.get("code"),pending=oauthStates.get(state);
        if(url.searchParams.has("error")||!state||!code||!pending||Date.now()-pending.created>600000){oauthStates.delete(state);res.writeHead(302,{Location:"/?auth_error=cancelled","Cache-Control":"no-store"});return res.end();}
        oauthStates.delete(state);
        const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,redirect_uri:GOOGLE_CALLBACK_URL,grant_type:"authorization_code",code_verifier:pending.verifier})});
        const tokenData=await tokenResponse.json(); if(!tokenResponse.ok||!tokenData.id_token) throw new Error("Google token exchange failed: "+(tokenData.error_description||tokenData.error||"unknown error"));
        const user=await verifyGoogleIdToken(tokenData.id_token); const sid=crypto.randomBytes(32).toString("base64url");
        const signedSession=signSession({sub:user.sub,email:user.email,name:user.name,picture:user.picture,email_verified:user.email_verified,createdAt:Date.now()});
        setCookie(res,signedSession,7*24*60*60);res.writeHead(302,{Location:"/","Cache-Control":"no-store","Referrer-Policy":"no-referrer"});return res.end();
      }
      if(req.method==="POST" && url.pathname==="/auth/logout") { setCookie(res,"",0);return json(res,200,{ok:true}); }
      if(req.method==="GET" && url.pathname==="/") {
        res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
        res.end(html); return;
      }
      if(req.method==="GET" && url.pathname==="/vendor/react.js") {
        res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"});
        res.end(fs.readFileSync(REACT_JS_PATH,"utf8")); return;
      }
      if(req.method==="GET" && url.pathname==="/vendor/react-dom.js") {
        res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"});
        res.end(fs.readFileSync(REACT_DOM_JS_PATH,"utf8")); return;
      }
      if(req.method==="GET" && url.pathname==="/dashboard-app.js") {
        res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
        res.end(APP_JS); return;
      }
      if(url.pathname==="/api/events" && req.method==="GET") {
        if(!getSession(req)) return json(res,401,{error:"Google sign-in required."});
        if(url.searchParams.get("token")!==token) return json(res,401,{error:"Unauthorized."});
        res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});
        res.write("event: connected\ndata: {}\n\n");
        clients.add(res);
        const keepalive=setInterval(()=>{try{res.write(": keepalive\n\n")}catch{}},20000);
        req.on("close",()=>{clearInterval(keepalive);clients.delete(res)});
        return;
      }
      if(url.pathname.startsWith("/api/") && (!getSession(req) || req.headers["x-h2o-token"]!==token)) {
        return json(res,401,{error:"Google sign-in required. Reload the dashboard."});
      }
      if(req.method==="GET" && url.pathname==="/api/status") return json(res,200,api.status());
      if(req.method==="GET" && url.pathname==="/api/history") return json(res,200,api.history());
      if(req.method==="GET" && url.pathname==="/api/files") return json(res,200,{files:await api.files()});
      if(req.method==="POST" && url.pathname==="/api/file") { const b=await body(req); return json(res,200,{path:b.path,content:await api.readFile(b.path)}); }
      if(req.method==="GET" && url.pathname==="/api/memory") return json(res,200,{items:api.memoryItems(url.searchParams.get("q")||"")});
      if(req.method==="POST" && url.pathname==="/api/memory") { const b=await body(req); if(!String(b.content||"").trim()) throw new Error("Memory content is required."); return json(res,201,{ok:true,id:api.createMemory(String(b.content).trim())}); }
      if(req.method==="POST" && url.pathname==="/api/memory/remove") { const b=await body(req); return json(res,200,{ok:true,removed:api.removeMemory(b.id)}); }
      if(req.method==="POST" && url.pathname==="/api/new") { api.newChat(); return json(res,200,{ok:true}); }
      if(req.method==="GET" && url.pathname==="/api/providers") return json(res,200,{providers:await api.providers()});
      if(req.method==="POST" && url.pathname==="/api/providers") { const b=await body(req); const provider=await api.addProvider(b); return json(res,201,{ok:true,provider}); }
      if(req.method==="POST" && url.pathname==="/api/providers/test") { const b=await body(req); return json(res,200,{ok:true,result:await api.testProvider(b.id)}); }
      if(req.method==="POST" && url.pathname==="/api/providers/active") { const b=await body(req); return json(res,200,{ok:true,active:await api.useProvider(b.id)}); }
      if(req.method==="DELETE" && url.pathname.startsWith("/api/providers/")) { const id=decodeURIComponent(url.pathname.slice("/api/providers/".length)); await api.removeProvider(id); return json(res,200,{ok:true}); }
      if(req.method==="POST" && url.pathname==="/api/key") { const b=await body(req); await api.setKey(b.key); return json(res,200,{ok:true}); }
      if(req.method==="POST" && url.pathname==="/api/chat") { const b=await body(req); const result=await api.send(b.message,{recordUser:!b.retry}); return json(res,200,{ok:true,result}); }
      if(req.method==="POST" && url.pathname==="/api/workspace") { const b=await body(req); return json(res,200,{ok:true,workspace:api.setWorkspace(b.path)}); }
      if(req.method==="POST" && url.pathname==="/api/mode") { const b=await body(req); return json(res,200,{ok:true,mode:api.setMode(b.mode)}); }
      if(req.method==="POST" && url.pathname==="/api/view") { const b=await body(req); return json(res,200,{ok:true,view:api.setView(b.view)}); }
      if(req.method==="POST" && url.pathname==="/api/terminal") { const b=await body(req); return json(res,200,{ok:true,result:await api.runTerminal(b.command)}); }
      if(req.method==="POST" && url.pathname==="/api/model") { const b=await body(req); return json(res,200,{ok:true,model:await api.setModel(b.model)}); }
      if(req.method==="POST" && url.pathname==="/api/preferences/free-models") { const b=await body(req); return json(res,200,{ok:true,preferFreeModels:api.setFreePreference(b.enabled)}); }
      if(req.method==="GET" && url.pathname==="/api/models") return json(res,200,{models:await api.models()});
      if(req.method==="POST" && url.pathname==="/api/undo") return json(res,200,{result:api.undo()});
      if(req.method==="POST" && url.pathname==="/api/cancel") return json(res,200,{result:api.cancel?.()||"No active task"});
      if(req.method==="POST" && url.pathname==="/api/queue/clear") return json(res,200,{result:api.clearQueue?.()||"Queue cleared"});
      res.writeHead(404); res.end("Not found");
    } catch(e) { json(res,400,{error:e.message}); }
  });
  if(api.events?.on) api.events.on("*",event=>{
    const frame=`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for(const client of clients) { try{client.write(frame)}catch{clients.delete(client)} }
  });
  server.h2oToken=token;
  // In-process test helper only; it is not exposed over HTTP.
  server.h2oCreateTestSession=(user={sub:"test-user",email:"test@example.com",name:"Test User"})=>signSession(user);
  server.listen(port,"127.0.0.1");
  server.on("error",e=>console.error(`Dashboard could not start: ${e.message}`));
  server.on("close",()=>{for(const client of clients){try{client.end()}catch{}}clients.clear()});
  return server;
}
