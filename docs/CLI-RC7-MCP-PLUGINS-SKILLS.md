# H2O CLI RC7 — MCP, Plugins, Skills and Bubb

This release is CLI-only. The Web Dashboard source is intentionally unchanged.

## MCP (stdio)
- `/mcp add <id> <command> [args...]` stores a stdio MCP server definition.
- `/mcp connect <id>` starts it, performs MCP initialize, and discovers tools.
- `/mcp connect-all` connects all enabled configured servers.
- `/mcp tools` lists discovered tools.
- `/mcp disconnect <id>` and `/mcp remove <id>` stop/remove a server.
- Config is stored in `~/.h2o/mcp-servers.json` with restrictive file permissions.
- MCP tools are offered to the model in Build Mode. Plan Mode exposes no tools.

For servers needing environment variables, edit `~/.h2o/mcp-servers.json` and add an `env` object to that server entry. Treat environment values as secrets.

## Skills
- `/skill create <name>` creates `~/.h2o/skills/<id>/SKILL.md`.
- `/skill list` lists installed skills.
- `/skill show <id>` displays one.
- Installed skill instructions are supplied as context to the agent on the next request.

## Plugins
- `/plugin create <name>` creates a local plugin scaffold.
- `/plugin list`, `/plugin enable <id>`, `/plugin disable <id>` manage local plugins.
- Plugins are JavaScript modules in `~/.h2o/plugins/<id>/index.js` exporting a default object with `tools` entries. Each tool has `name`, `description`, optional `inputSchema`, and async `execute(args, context)`.
- Only enable plugins you trust: enabled plugin code runs locally with the same OS permissions as H2O.

## Bubb
The CLI header now introduces Bubb as H2O's mascot. Build Mode and Plan Mode remain available with Tab and `/build` or `/plan`.

## Important
MCP server processes and enabled plugins execute local code. Connect only servers and enable plugins from sources you trust. The first RC7 iteration does not change Web Dashboard code, provider authentication, API routes, or existing CLI security/approval checks.
