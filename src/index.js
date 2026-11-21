#!/usr/bin/env node
import "./env.js";

import { startApp } from "./app.js";
import { loadConfig } from "./config.js";
import { ProviderRegistry } from "./providers/registry.js";
import path from "node:path";


const cmd = process.argv[2];

// Current terminal directory = H2O workspace
const workspace = path.resolve(process.cwd());

if (cmd === "connect") {
  console.log("The legacy plaintext OpenRouter setup is disabled.");
  console.log(
    "Start H2O, add a provider with /provider-add or the Dashboard, and H2O will request credentials only when the provider is first used.",
  );
} else if (cmd === "doctor") {
  const config = loadConfig();
  const registry = new ProviderRegistry();
  const providers = await registry.list();

  console.log("H2O Doctor");
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Model: ${config.model}`);
  console.log(`Workspace: ${workspace}`);
  console.log(`Providers: ${providers.length}`);

  for (const provider of providers) {
    console.log(
      `- ${provider.name}: ${
        provider.credentialConfigured
          ? "credential available"
          : provider.credentialRequired
            ? "credential needed on first use"
            : "no credential required / sign-in handled by provider"
      }`,
    );
  }

  console.log(`Dashboard: http://127.0.0.1:${config.dashboardPort}`);
} else if (cmd === "--version" || cmd === "-v") {
  console.log("H2O 1.0.0-rc.8");
} else {
  await startApp({ workspace });
}
