# Hotfix 5 — Thin CLI caret

The input caret is now a thin vertical `│` marker, rendered in the active mode accent color. Reverse-video block highlighting has been removed. The native terminal cursor remains hidden during full-screen redraws.

Automated tests were run in the build environment; verify interactive appearance in Windows Terminal.
