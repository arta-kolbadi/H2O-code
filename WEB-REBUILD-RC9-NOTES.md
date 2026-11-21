# H2O Web rebuild — RC9

## Applied
- Reworked the chat landing screen into a centered, chat-first composition inspired by the supplied Claude reference: compact top controls, generous central welcome area, wide bottom composer, model/provider context.
- Replaced the previous dense sidebar grouping with Chats / Workspace / Configure navigation while retaining existing functional pages (chat, sessions, files, memory, terminal, settings).
- Moved provider navigation out of the primary sidebar. Provider and API-key management remains available through Settings > Default Provider & Model, which opens the existing functional provider manager.
- Added restrained interaction transitions and explicitly disabled page entrance animations/fades.
- Preserved English/Persian and dark/light theme support.
- Greeting uses a locally saved display-name key `h2o-user-name` and falls back to “there”. No Google profile is fabricated.

## Important implementation boundaries
- This release is a visual/navigation rebuild, not Google OAuth implementation.
- Google sign-in, required authentication gates, Google profile sync, Projects/Artifacts/MCP/Usage functional modules, and new provider controls beyond the existing provider manager are not claimed as implemented.
- Provider credentials continue to use the existing OS credential-store integration. They are not stored in browser localStorage.
- OAuth callback must not be registered in Google Cloud until the auth route and server flow are implemented and verified.

## Verification
- `node scripts/build-dashboard.mjs` passed.
- `npm test`: 43 passed, 0 failed.
