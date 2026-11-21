# H2O 0.3.0 Repository Audit

Audit date: 2026-11-19  
Audited source: `H2O-Beta-0.3.0.zip` (21,498 bytes)  
Scope: static inspection of every source file and execution of the repository's existing test and syntax-check scripts.

## Executive summary

The archive contains a small, dependency-free Node.js prototype. It has a hand-written terminal UI, an HTTP dashboard, one OpenRouter client, a basic tool-calling loop, local workspace tools, and four unit tests. It is **not yet a release candidate** for the requested H2O v1.0 architecture.

The current implementation is one Node process; it does not have a Fastify daemon, shared typed protocol, WebSocket/SSE event transport, independent CLI/TUI/Dashboard clients, or real-time cross-client task controls. Provider support is OpenRouter-only. There is no browser agent, permission-aware diff approval workflow, MCP/plugin system, or release packaging pipeline.

## Test evidence

Executed from the extracted repository using the installed Node runtime:

- `npm test`: **PASS — 4 tests, 0 failures**.
- `npm run check`: **PASS — syntax checks completed for the listed JavaScript entry files**.

The four tests cover workspace path traversal, a small shell-command allowlist, in-memory undo for a new file, and switching to an existing workspace directory. They do not prove that AI requests, provider integrations, terminal execution, the dashboard, or packaging work end-to-end.

No real provider credentials were available, so no live provider request was performed. No browser automation or clean-folder release test was present to run.

## Feature inventory

| Area | Observed status | Evidence / limitation |
|---|---|---|
| CLI startup | Partial, source present | `src/index.js` invokes the app; no startup E2E test. |
| Terminal UI | Partial | Hand-written raw-mode renderer in `src/app.js`; not Ink/TUI architecture. |
| Dashboard | Partial | `src/dashboard.js` and `src/dashboard.html`; basic HTTP routes and periodic status polling. |
| Shared app state | Partial | CLI and dashboard share objects only because they run in the same Node process. No daemon/client separation or event protocol. |
| Provider system | Missing beyond OpenRouter | `src/provider.js` contains one OpenRouter-specific implementation. |
| OpenRouter | Implemented in code, not live-tested | Models and chat-completions calls exist; no streaming, cancellation, retry/backoff, timeout policy, or dedicated provider tests. |
| OpenAI / custom-compatible / Anthropic / Gemini / Ollama / LM Studio | Missing | No adapters or provider registry. |
| GitHub Copilot | Missing | No official SDK integration. |
| GitHub Models | Unavailable upstream | Official GitHub documentation says GitHub Models was fully retired on 2026-07-30; do not implement the retired inference endpoint. See `docs/PROVIDERS.md` added during Milestone 1. |
| Lazy API key prompt | Partially implemented | `src/app.js` requests a key on first AI prompt; Dashboard can also save it. Only OpenRouter is supported. |
| Credential storage | Partial / release blocker | API key stored as plaintext in `~/.h2o/api-key`; POSIX chmod is attempted, but OS keychain/encrypted storage is absent. |
| Error handling | Broken for CLI AI requests | `sendMessage()` rethrows provider errors; the async keypress listener does not catch them, so provider failures may become unhandled rejections/process failure. Dashboard catches route errors but returns a generic HTTP 400 for all exceptions. |
| Agent | Partial | Single-agent loop with a fixed round limit. No planner, sub-agents, token/cost budgets, timeout guard, repeat-action detection, or explicit task cancellation. |
| Workspace navigation | Partial | Local regex handles a narrow set of English/Persian phrases and Windows drive paths; no platform-neutral resolver or tests. |
| Filesystem tools | Partial | List/read/search/write exist. Move/delete are absent. Write is immediate; no per-file/hunk approval. Path validation does not fully defend against symlink escapes. |
| Undo / snapshots | Partial | One in-memory undo stack; no persistent snapshots, per-session rollback, selective restore, or robust crash recovery. |
| Terminal tools | Partial | Uses `child_process.exec`; no PTY, interactive terminal, process handles, or long-running server lifecycle. |
| Git tools | Partial | Status and diff are exposed; commit/branch lifecycle is absent. |
| Browser agent | Missing | No Playwright dependency, browser profile, browser tools, perception loop, action log, or prompt-injection test. |
| Permissions | Partial / unsafe for target spec | A shell allowlist exists, but agent filesystem writes happen without approval and there is no central policy engine or read-only mode. |
| Diff approval | Missing | No change review before writes; no hunk-level accept/reject. |
| Dashboard security | Release blocker | Binds to `127.0.0.1`, but does not validate Host/Origin, issue a per-session token, or test DNS-rebinding/CSRF protections. Dashboard exposes terminal and agent controls. |
| Real-time sync | Missing | No WebSocket/SSE. Browser refreshes status on a 4-second interval; message and activity updates are not streamed across clients. |
| UI/UX | Partial | Obsidian-like dark UI exists; no light theme toggle, proper syntax highlighting, streaming markdown, keyboard accessibility audit, responsive sidebar navigation, or polished component system. |
| Keyboard shortcuts | Incorrect for v1 spec | `Ctrl+T` currently cycles Chat → Terminal → Split → Chat, not Terminal → Split → Chat. `Ctrl+Z`, `Ctrl+D`, and `Ctrl+J` conflict with common terminal behavior. |
| Persian | Partial / unverified | Persian text can be submitted, but no RTL/bidi handling or mixed-direction tests exist. |
| Memory | Partial | Session JSON persistence exists; project and long-term editable memory are absent. |
| MCP / plugins | Missing | No MCP client or plugin API. |
| Build / release | Missing | No `build` or `package` script, no release directory, no platform installers, no npm publishing workflow, no CI. |
| Documentation | Partial | README and short roadmap/security notes exist; provider guides, browser guide, troubleshooting, changelog, and release instructions are absent. |

## Important defects confirmed by code inspection

1. Provider exceptions escape from the CLI `keypress` callback path: `sendMessage()` rethrows after setting status, and the caller does not catch it.
2. The dashboard control server has no Host/Origin validation or per-session authorization token despite controlling commands and file edits.
3. Agent `write_file` operations are immediate and do not pass through a permission or diff-approval layer.
4. The `Ctrl+T` cycle does not match the requested v1 sequence.
5. Undo state is process-memory-only and is cleared when the workspace changes.
6. The package is plain JavaScript, while the target architecture requires TypeScript, Fastify, Zod-shared protocol types, and one local daemon.

## Milestone readiness

- Step 0 — Audit: **complete**.
- Milestone 1 — Providers & Models: **not yet implemented at audit time**.
- Milestones 2–7: **not started**.

Do not use the phrase "v1.0 ready" until the relevant release tests pass, especially dashboard security, provider failures, filesystem approval/rollback, browser-agent prompt-injection protection, cross-client synchronization, and clean-folder packaging.


## Milestone 1 follow-up (2026-11-19)

The baseline above records the state of the source archive at the time of initial audit. After the audit, Milestone 1 work added `src/providers/` adapters and registry, OS-keyring-backed secret storage, a model router, CLI/Dashboard provider management, provider documentation, and provider tests. See `MILESTONE-1-REPORT.md` for the precise change and test status. The baseline defects in milestones 2–7 remain open unless explicitly listed as fixed in that report.
