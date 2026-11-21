# H2O Milestone 2 — Implementation Status (rc.3 foundation)

This archive is an incremental, runnable foundation built from the supplied H2O 1.0.0-rc.2 source. It is **not** a claim that every Milestone 2 subsystem is complete.

## Implemented in this archive

- Workspace is initialized from the current working directory passed by the CLI entry point.
- `create_directory` tool supports nested folder creation, existing-directory handling, and workspace traversal checks. It also checks the nearest existing ancestor's real path to reduce symlink escape risk.
- Separate Plan and Build system prompts live in `src/prompts/`.
- Plan Mode sends no tools and refuses returned tool calls.
- A concrete, complete plan can hand off to Build Mode using the explicit `<<H2O_PLAN_READY>>` marker. The app strips the marker, switches mode, and asks the agent to execute the plan in Build Mode.
- `Tab` switches Plan/Build Mode in the CLI. `/plan` and `/build` remain available.
- `/provider-switch <id>` is an alias for `/provider-use <id>`.
- Dashboard already exposes shared mode state and Provider management; the CLI and Dashboard use the same in-process session.
- Initial TypeScript contract layer and `tsconfig.json` are included under `src/contracts/`.

## Not yet implemented (remaining Milestone 2 work)

- Full TypeScript migration of runtime modules. The current runtime remains ESM JavaScript; `src/contracts/` is the first typed boundary.
- SQLite persistence and migrations. Current session/provider persistence remains as in the rc.2 baseline.
- Full ChangeSet pipeline, side-by-side Diff UI, hunk approval, durable snapshots, and rollback after restart.
- Centralized Permission Engine covering every filesystem and agent mutation.
- Multi-Agent orchestration (specialized + dynamic).
- Dashboard redesign, authenticated WebSocket event stream, and richer task/diff/agent UX.
- Browser Agent and MCP runtime integration.

## Validation performed

- `npm test`: 27 tests passed in the build environment.
- `npm run check`: JavaScript syntax checks and TypeScript contract check passed in the build environment (TypeScript 5.8.3 was available globally there).
- No live provider/API integration test was performed.

## Install / run

Requires Node.js 22.12+ (or Node.js 20.19+).

```powershell
npm install
npm start
```

To run globally from the current directory:

```powershell
npm link
cd C:\path\to\your\project
h2o
```

The current directory becomes the active workspace. Use `Tab` to switch Plan/Build. Use `/provider-add` to add a provider and `/provider-switch <id>` to switch providers.

## TypeScript setup

The first contracts are in `src/contracts/index.ts`. Install TypeScript as a development dependency if it is not already available:

```powershell
npm install --save-dev typescript
npx tsc --noEmit -p tsconfig.json
```

Runtime migration is intentionally gradual; do not assume all `.js` modules have been converted.
