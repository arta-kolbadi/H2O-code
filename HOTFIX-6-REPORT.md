# Hotfix 6 — Chat input reliability

- Preserves the hotfix.5 thin caret, history navigation, and in-line cursor editing.
- Reworks printable-key insertion to filter and insert Unicode code points explicitly.
- Clamps the insertion position before editing and updates the caret after inserted text.
- Keeps prompt-mode and shutdown guards so approval/API-key prompts do not compete with the chat editor.

Run `npm run check` and `npm test` after installation. Interactive behavior should also be verified in the user's Windows Terminal/PowerShell session.
