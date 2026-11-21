# H2O Web Redesign RC9.2

## Changes
- Reworked the Web layout styling across chat, workspace pages, settings, provider configuration, and file explorer.
- Refined the chat surface with a centered welcome area, narrower conversation column, and responsive composer.
- Standardized the interface on a monochrome light/dark palette.
- Removed page-entry fade/translate animations; retained short interaction transitions and reduced-motion support.
- Hardened Firefox and narrow-screen layout with explicit min-width/min-height constraints, viewport fallbacks, overflow boundaries, and mobile drawer behavior.
- Hid generated backup folders, dependency folders, cache folders, and legacy Bubb artifacts from the in-app file list. This is a display filter only; it does not delete workspace files.

## Validation
- `node scripts/build-dashboard.mjs` — passed
- `npm run check` — passed
- `npm test` — 43 tests passed

## Notes
- Firefox was not available in this build environment, so visual verification in Firefox remains a manual check.
- Google OAuth callback route remains reserved and does not complete authentication in this release; see `GOOGLE-OAUTH-CALLBACK.md`.
