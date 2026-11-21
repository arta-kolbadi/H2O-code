# H2O 1.0.0-rc.2 — Milestone 1 report

Date: 2026-11-19

## Scope completed in code

- Provider registry with add/update/list/activate/remove operations.
- CLI provider commands (including update by existing ID and lazy credentials during connection tests) and Dashboard provider management routes/UI (including on-demand credential prompt on first AI/model use).
- Provider adapters for OpenAI, OpenAI-compatible/custom, OpenRouter, Anthropic, Gemini Interactions API, Ollama, LM Studio, and the official GitHub Copilot SDK.
- Model list retrieval and a deterministic auto model selector with task heuristics and free-model preference.
- Lazy API-key requests from the CLI on first operation; adding/selecting providers does not itself request a key.
- OS credential-manager storage through `@napi-rs/keyring`; environment-variable support; no plaintext file fallback.
- HTTP request timeout, caller AbortSignal support at adapter level, bounded retries for 429/5xx/network failures, Retry-After support, and provider error messages.
- Provider-secret redaction tests.
- Legacy plaintext OpenRouter `connect` flow disabled.

## Test evidence

Executed with the available Node runtime in the extracted working tree:

- `npm test`: **PASS — 23 tests, 0 failures**.
- `npm run check`: **PASS — syntax checks for CLI, agent, tools, Dashboard server, all provider adapters, registry, secrets, and model router**.
- Dashboard inline JavaScript: **PASS — extracted script parsed successfully with Node.js `new Function`**.
- CLI smoke checks: **PASS — `node src/index.js --version` printed `H2O 1.0.0-rc.2`; `doctor` printed runtime, provider, and local Dashboard status**.
- `npm pack --dry-run`: **PASS — npm package manifest and 27-file package contents were enumerated; no publish was performed**.

Provider tests use mocked HTTP responses, in-memory secret storage, and a fake Copilot SDK client. They verify provider request/response mapping, model listing for representative adapters, streaming text/tool argument parsing, Gemini multi-turn tool history, Ollama model discovery, Dashboard provider CRUD routes, automatic model selection, 429 retry, timeout, 403 message propagation, lazy credentials, credential storage separation, environment-variable lookup, and secret redaction.

## Installation verification

- `npm install --no-audit --no-fund`: **NOT VERIFIED — command timed out in this environment**. No `node_modules` or lockfile was produced. The actual native keyring binary and official Copilot SDK runtime therefore have not been installed or exercised here. This checkpoint ZIP does not bundle `node_modules`; dependency installation is required before first run.
- Real OpenAI/OpenRouter/Anthropic/Gemini/local-model/Copilot network connections: **NOT RUN**; no user credentials or provider accounts were supplied.
- Dashboard provider CRUD browser E2E: **NOT RUN**; its HTTP routes and UI are present, but no Playwright integration suite exists yet.

## Known gaps within Milestone 1

- Auto-routing is a transparent heuristic over provider model names/context metadata, not a benchmark-driven quality/cost router.
- Model catalog retrieval is best-effort and does not paginate every provider's catalogue fully.
- Vision/image input is not implemented as a shared UI workflow.
- Adapter-level cancellation exists through `AbortSignal`, but the app has no connected user-facing Stop control yet.
- Copilot SDK behavior was tested with a fake client; live GitHub Copilot authentication and model listing remain unverified. OAuth device-flow acquisition is not implemented in H2O; the adapter accepts a supported GitHub token or delegates sign-in to the official SDK’s existing user authentication.
- A working keyring package installation is required to store API keys securely. There is intentionally no insecure plaintext fallback.

## Milestone gate

**Milestone 1: code implementation and unit tests complete; external installation/live integration not verified.**

Do not mark Milestone 1 fully production-verified until dependency installation succeeds on Windows and Linux and one real provider connection is tested. The exact final test run after the last edits remains 23/23 (0 failures); no live provider or installed-dependency E2E test has been completed. Stop here before Milestone 2 as required by the milestone workflow.

## Next milestone

Milestone 2 — Real Coding Agent: filesystem create/edit/move/delete, terminal process lifecycle, richer Git, local workspace navigation test coverage, planner and agent loop guards, central permission modes, approval workflow, snapshots, and durable rollback.
