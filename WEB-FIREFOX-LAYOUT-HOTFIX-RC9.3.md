# H2O RC9.3 — Firefox Layout Hotfix

## Fixes
- Restored full-width layout for non-chat pages (Files, Terminal, Settings and other workspace pages).
- Removed the accidental global flex/hidden-overflow behavior from non-chat pages.
- Kept chat workspace's dedicated full-height layout.
- Made Files explorer and preview columns responsive and prevented grid children from shrinking below usable width.
- Made Terminal output height viewport-aware and kept its command controls reachable.
- Added narrow-screen stacking and wrapping for Firefox.

## Verification
- `node --check src/dashboard-app.js`: passed.
- `npm run build:web` was not run successfully in this packaging environment because dependencies (TypeScript) are not installed. Run `npm install` before building locally.
