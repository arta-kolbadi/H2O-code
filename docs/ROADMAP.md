# H2O roadmap

## Completed checkpoint

- Beta 0.3.0 baseline audited in `AUDIT.md`.
- Milestone 1 provider registry/adapters, credential abstraction, model listing and deterministic task router implemented.
- Milestone 1 unit and syntax tests: see `MILESTONE-1-REPORT.md`.

## Remaining milestones

1. **Milestone 2 — Real Coding Agent:** planner, full filesystem and terminal lifecycle tools, Git operations, permission modes, diff/hunk approval, snapshots and rollback.
2. **Milestone 3 — Browser Agent:** Playwright browser control, isolated profile, accessibility-first observation, action verification, prompt-injection defenses and gated sensitive actions.
3. **Milestone 4 — UI/UX:** polished Obsidian dark/light themes, accessible Dashboard, Ink TUI, streaming UI, keymap and correct Ctrl+T cycle.
4. **Milestone 5 — Dashboard security:** strict loopback Host/Origin checks, per-session token, CSRF/DNS-rebinding protections and tests.
5. **Milestone 6 — Memory, MCP, Plugins:** editable memory, stdio/HTTP MCP client, permissioned plugin tools.
6. **Milestone 7 — Release:** CI on Windows/Linux, E2E suite, documentation, npm package, standalone installers and clean-folder platform ZIP verification.

H2O must not be advertised as a completed v1.0 until those release gates pass.
