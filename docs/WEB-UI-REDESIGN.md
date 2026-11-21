# H2O Web UI Redesign

## Scope

This update replaces only the local Web Dashboard presentation layer. The CLI input renderer, agent orchestration, providers, session store, tools, and API route behavior are not modified.

## Frontend

- React 18 application source: `src/dashboard-app.jsx`
- Generated browser application: `src/dashboard-app.js`
- Local React runtime served from installed `react` and `react-dom` packages
- Build script: `scripts/build-dashboard.mjs`
- Dashboard shell and Noir tokens: `src/dashboard.html`

`npm install` runs the `postinstall` hook and generates the browser application. Run `npm run build:web` after editing the JSX source.

## Design system

- Noir monochrome palette with dark and light themes
- Warm neutral accent used sparingly for focus and status emphasis
- Centralized CSS variables for surfaces, borders, text, accent, shadows, radii, and motion
- Adaptive sidebar: collapsible desktop rail and mobile drawer
- English-first copy with Persian translation and RTL layout
- Reduced-motion support, visible focus styles, semantic controls, and responsive layouts

## Pages

1. Overview
2. AI Chat
3. Files
4. Terminal
5. Providers & Models
6. Project Memory
7. Sessions
8. Settings

## API and security boundary

The existing `/api/*` handlers and request/response contracts remain intact. The dashboard continues to use the per-process `X-H2O-Token` header and the existing SSE token query parameter. Host and Origin validation remain in place. Static UI assets are served only after the same Host/Origin checks. The Content Security Policy now allows scripts only from the local origin; the React runtime is served locally from `node_modules`, not from a third-party CDN.
