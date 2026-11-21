# H2O RC.5 Architecture Foundation

## Implemented in this archive

- Durable SQLite session/message/terminal history (`node:sqlite`, Node >=22.12).
- In-process EventBus with isolated listeners.
- CLI message queue that accepts input while a task is running.
- Double-Escape cancellation request and AbortSignal propagation into supported tools.
- Workspace-scoped ChangeSet snapshots for file writes and conflict-aware rollback.
- Workspace real-path checks to reduce symlink traversal.
- Dashboard per-process token, Host/Origin validation, CSP, and authenticated SSE event stream.
- Adaptive risk classifier / permission policy module.
- Workspace-scoped Project Memory store with basic credential-pattern rejection.
- Provider registry/model router from the prior release.
- Optional Playwright Browser Agent adapter (not installed or activated by default).
- Bounded multi-agent orchestrator interfaces (role implementations must be configured).

## Deliberate limitations

This is an RC.5 foundation, not the completed product architecture:

- The runtime remains JavaScript ESM; `contracts/index.ts` is a TypeScript contract foundation, not a full TypeScript migration.
- The multi-agent orchestrator is an injectable coordinator and is not yet the default CodingAgent execution path.
- Project Memory has storage/search APIs but is not automatically embedded/retrieved in every model prompt.
- The Browser Agent is optional and has no default browser package or browser binary.
- The current CLI queue is process-memory scoped; SQLite queue persistence APIs exist but automatic cross-restart queue recovery is not enabled.
- Hunk-level interactive approval and a full visual side-by-side diff UI are not complete.
- Dashboard event streaming is implemented with SSE; a full bidirectional WebSocket protocol is not included.
- Model routing uses provider model metadata and deterministic heuristics; it is not a benchmark-trained router.
- Multi-process daemon/client separation and MCP integration are not included.
- Cancellation is cooperative and only applies to providers/tools that honor AbortSignal; synchronous filesystem operations cannot be interrupted mid-system-call.

## Runtime requirements

- Node.js >=22.12 (uses the built-in `node:sqlite` module).
- Existing provider dependencies are installed by `npm install`.
- Browser automation requires the optional Playwright setup in `docs/BROWSER.md`.


## Verification performed for this archive

- `npm run check`: passed.
- `npm test`: 34 tests passed.
- CLI startup smoke test: process started and printed the Dashboard address; the smoke
  process was then stopped by the test timeout as expected.
- No live AI provider call was performed (no credentials supplied).
- No full TypeScript typecheck was performed because the TypeScript compiler was not
  installed in the build environment.
