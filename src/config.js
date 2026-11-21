import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const H2O_HOME = path.join(os.homedir(), ".h2o");
export const CONFIG_FILE = path.join(H2O_HOME, "config.json");
export const SESSIONS_DIR = path.join(H2O_HOME, "sessions");

export function ensureHome() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  try { fs.chmodSync(H2O_HOME, 0o700); } catch {}
}

export function loadConfig() {
  ensureHome();
  const defaults = {
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "auto",
    preferFreeModels: true,
    temperature: 0.2,
    maxToolRounds: 8,
    theme: "obsidian",
    dashboardPort: 4317,
    browserAllowedHosts: []
  };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) }; }
  catch { return defaults; }
}
export function saveConfig(config) {
  ensureHome();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  try { fs.chmodSync(CONFIG_FILE, 0o600); } catch {}
}
