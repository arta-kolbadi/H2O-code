# Changelog

## 1.0.0-rc.8 (2026-11-21)
- Redesigned the CLI conversation shell and multiline composer with a compact workspace header, Bubb identity, welcome panel, clearer message roles, command hints, and persistent Plan/Build status indicators.
- Preserved the existing Plan/Build execution paths and keyboard behavior.
- Web dashboard files were not changed.


## 1.0.0-rc.7 (2026-11-21)

- Introduced Bubb mascot identity and a refreshed CLI welcome header.
- Added stdio MCP server management, ready-made filesystem/fetch/git presets, tool discovery, and model tool routing in Build Mode.
- Added local Plugin manifests, creator scaffolds, enable/disable controls, and an opt-in JavaScript tool runtime.
- Added local Skill creation and discovery from `SKILL.md`, with installed skill instructions supplied to Agent context.
- Preserved Plan Mode tool isolation and existing Build Mode/approval behavior.
- Kept Web Dashboard source files unchanged.


## 1.0.0-rc.5

- Added SQLite-backed session, message, terminal-history, queued-message, and project-memory storage primitives.
- Added in-process EventBus and authenticated Server-Sent Events for live Dashboard updates.
- Added CLI queue handling while an Agent task is running.
- Added double-ESC cancellation request and propagated AbortSignal to provider/tool calls that support it.
- Added workspace-scoped ChangeSet snapshots and conflict-aware rollback for file writes.
- Added real-path checks for file reads/writes to reduce symbolic-link workspace escapes.
- Added adaptive risk classification and permission policy primitives.
- Added bounded hybrid AgentOrchestrator interfaces.
- Added optional Playwright BrowserAgent adapter and setup documentation.
- Added per-process Dashboard token, Host/Origin validation, security headers, and CSP.
- Fixed mixed chat history rendering and normalized system messages.
- Updated Node requirement to 22.12+ for built-in SQLite.

## Known limitations

See `docs/ARCHITECTURE-RC5.md`. In particular, full TypeScript runtime migration, fully
integrated multi-agent execution, Hunk-level UI approval, durable automatic queue recovery,
WebSocket transport and production Browser Agent actions remain future work. Plugin integrations are local trusted-code extensions, not a remote marketplace.

## 1.0.0-rc.5-hotfix.2 (2026-11-20)

- Connected the optional visible Playwright Browser Agent to the Build Agent tool loop.
- Added explicit browser hostname allowlisting, navigation/subresource checks, page text,
  screenshot saving, wait, back, scroll, click, and type tools.
- Browser clicks and text entry require per-action user approval; credential-like fields
  cannot be filled by model-directed browser actions.
- Added `/browser allow|hosts|open|text|screenshot|close` commands.
- Added `/provider list|add|set|use|default|remove|info|models|test` command family.
- Added terminal input history, left/right caret movement, Home/End, and Delete support.
- Added a compact context HUD that explicitly reports provider token usage as unavailable
  when the provider does not expose it (no fabricated percentages).
- Added regression tests for Browser Agent tool exposure and allowlist enforcement.


## 1.0.0-rc.5-hotfix.3

- Rebuilt the local Web Dashboard as a responsive multi-section workspace.
- Added animated page transitions, interactive cards, dark/light theme switching,
  mobile navigation, live status indicators, and reduced-motion support.
- Added working Web workspace explorer with safe text-file previews.
- Added Project Memory management, session history, improved provider/model controls,
  and a dedicated terminal workspace.
- Added authenticated local API routes for file browsing/reading, memory CRUD, and
  starting a new visible chat.
- Preserved the single-process CLI + Web architecture and existing shared session.
- Validation: 37 automated tests pass; JavaScript syntax checks pass; CLI startup and
  authenticated dashboard API smoke tests pass. No live AI provider request was run.


## 1.0.0-rc.5-hotfix.7 (2026-11-20)

- Replaced the single-row Type Prompt with a five-row multiline editor.
- Added explicit newline insertion via Ctrl+J and Shift+Enter where supported.
- Added automatic line wrapping and a cursor-following vertical viewport.
- Preserved caret editing, history, and Enter-to-submit behavior.
- Added terminal-cell width handling for common CJK and emoji characters.
- Added regression tests for multiline layout, wrapping, vertical scrolling, and caret visibility.

## Web Settings Control Center

- Replaced the minimal Settings view with a searchable, categorized Control Center covering all 17 requested areas.
- Added browser-local density, Settings text scale, motion, default landing page, chat Enter/timestamp, terminal wrapping/font, and experimental-label preferences.
- Added Ctrl+, to open Settings, Ctrl+K to focus Settings search, and Ctrl+Shift+L to toggle the Web theme.
- Improved import validation and reduced-motion behavior while preserving useful opacity/color feedback.
- Added safe versioned JSON import/export that excludes credentials, tokens, session history, workspace files, and runtime state.
- Added live System Health and read-only Diagnostics summaries using existing dashboard data.
- Added responsive settings navigation, SVG iconography, and Persian/English section labels.
- Preserved CLI, API routes, authentication, Host/Origin checks, permission engine, and credential storage unchanged.
