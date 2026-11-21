# H2O RC.5 Hotfix 4

- Hides the terminal's native cursor during redraw so the custom input caret is the only visible cursor.
- Restores the native cursor during shutdown and on process exit.
- Preserves the custom inverse-video input caret.

Validation: `npm run check` passed; `npm test` passed (38/38).
