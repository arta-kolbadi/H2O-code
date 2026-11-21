# H2O Web Settings — RC.6 implementation notes

## Scope boundary

This release changes only the Web dashboard: `src/dashboard-app.jsx`, its generated browser bundle `src/dashboard-app.js`, and `src/dashboard.html`. No CLI, Agent, provider, session, API route, authentication, token, Host/Origin validation, permission-engine, or credential-storage source was changed.

## Information architecture

The Settings Control Center contains all 17 requested areas: General; Appearance; Language & Region; Workspace; Default Provider & Model; Model-specific preferences; Response behavior; Fallback model; Chat preferences; Terminal preferences; Sidebar customization; Keyboard shortcuts; Privacy & Security; System Health; Diagnostics & Logs; Import / Export Settings; Experimental Features.

It includes searchable section navigation, section headings, saved-in-this-browser status, responsive navigation, RTL labels for Persian, and a consistent SVG icon system based on the project's existing icon component.

## Persistence and backup

Web-only preferences are stored in `localStorage['h2o-web-settings']`. Existing `h2o-theme`, `h2o-language`, and `h2o-sidebar` keys remain the source of truth for theme, language, and sidebar collapse state.

Backup format is versioned JSON (`format: h2o-web-settings`, `version: 1`). Import validates the format/version, caps file size at 1 MB, and accepts only known preference keys. Credentials, API keys, dashboard tokens, session history, workspace files, and runtime state are excluded. Import does not call the H2O API.

## Capability matrix

| Section | Implemented behavior |
|---|---|
| General | Browser-local density, Settings text scale, motion preference, default landing page |
| Appearance | Existing dark/light theme plus Settings density and text scale |
| Language & Region | English/Persian interface language; local locale and timezone preferences |
| Workspace | Current workspace status; opens existing Files workspace flow |
| Default Provider & Model | Shows active provider/model and links to existing provider/model controls |
| Model-specific preferences | Stores local notes by model ID; does not change inference parameters |
| Response behavior | Read-only explanation; current API has no response-parameter controls |
| Fallback model | Read-only explanation; current API has no fallback configuration |
| Chat preferences | Controls timestamp visibility and Enter-to-send behavior |
| Terminal preferences | Controls Web output wrapping and font size only |
| Sidebar customization | Uses existing expanded/collapsed state |
| Keyboard shortcuts | Implements Ctrl+, to open Settings, Ctrl+K to focus Settings search, Ctrl+Shift+L to toggle theme; remapping is not available |
| Privacy & Security | Read-only explanation of existing security protections |
| System Health | Reads existing status endpoint data and configured-provider count |
| Diagnostics & Logs | Read-only browser/session summary; no new log API |
| Import / Export Settings | Versioned JSON backup of Web preferences only |
| Experimental Features | Web-only experimental label toggle |

## Explicit non-goals

No new API routes, Agent settings, CLI preferences, credential handling, cloud sync, or unsupported model controls were added. Temperature, token limits, response style, streaming configuration, fallback routing, shortcut remapping, and server-log download are not exposed as functional settings because the current API does not support them.

## UX and motion

Luxury-minimal information hierarchy, responsive section rail, touch-friendly controls, inline SVG icons, RTL-aware layout, and restrained transitions. Existing reduced-motion support is preserved; the Web motion preference can suppress transitions.

## Verification

- `npm run build:web` — passed.
- `npm run check` — passed.
- `npm test` — 43 passed, 0 failed.
- API/security/CLI source files were compared with the supplied ZIP and remained unchanged.
- No browser-driven end-to-end test was run in this environment.
