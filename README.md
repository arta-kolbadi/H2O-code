# 🌊 H2O CLI

<p align="center">
  <strong>A Local-First AI Coding Environment</strong><br/>
  CLI · Web Dashboard · AI Providers · MCP · Plugins
</p>

<p align="center">
  <a href="https://github.com/arta-kolbadi/H2O-code">
    <img src="https://img.shields.io/github/stars/arta-kolbadi/H2O-code?style=for-the-badge&logo=github&label=Stars" alt="GitHub Stars"/>
  </a>
  <a href="https://github.com/arta-kolbadi/H2O-code/forks">
    <img src="https://img.shields.io/github/forks/arta-kolbadi/H2O-code?style=for-the-badge&logo=github&label=Forks" alt="GitHub Forks"/>
  </a>
  <a href="https://github.com/arta-kolbadi/H2O-code/watchers">
    <img src="https://img.shields.io/github/watchers/arta-kolbadi/H2O-code?style=for-the-badge&logo=github&label=Watchers" alt="GitHub Watchers"/>
  </a>
  <a href="https://github.com/arta-kolbadi/H2O-code/issues">
    <img src="https://img.shields.io/github/issues/arta-kolbadi/H2O-code?style=for-the-badge&logo=github&label=Issues" alt="GitHub Issues"/>
  </a>
  <a href="https://www.npmjs.com/package/@dash_arta/h2o-cli">
    <img src="https://img.shields.io/npm/v/@dash_arta/h2o-cli?style=for-the-badge&logo=npm&label=NPM" alt="NPM Version"/>
  </a>
  <a href="https://github.com/arta-kolbadi/H2O-code/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/arta-kolbadi/H2O-code?style=for-the-badge&label=License" alt="License"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/arta-kolbadi/H2O-code?style=flat-square&logo=git&label=Last%20Commit" alt="Last Commit"/>
  <img src="https://img.shields.io/github/repo-size/arta-kolbadi/H2O-code?style=flat-square&logo=github&label=Repository%20Size" alt="Repository Size"/>
  <img src="https://img.shields.io/node/v/@dash_arta/h2o-cli?style=flat-square&logo=node.js&label=Node.js" alt="Node Version"/>
</p>

---


# H2O CLI

### Local-first AI Coding Environment · CLI + Web Dashboard

H2O is a local-first AI coding environment that brings AI-assisted development into your terminal and browser.

It combines an interactive CLI, a local Web Dashboard, multiple AI provider adapters, workspace tools, persistent session history, and extensible integrations.

**Package:** [`@dash_arta/h2o-cli`](https://www.npmjs.com/package/@dash_arta/h2o-cli)  
**Version:** `1.1.1`  
**Runtime:** Node.js `22.12.0+`

---

## Features

- **Interactive CLI** — Work with AI directly from your terminal.
- **Plan & Build modes** — Plan changes before execution or let the agent work with available tools.
- **Local Web Dashboard** — Access your H2O workspace through a browser.
- **Multiple AI providers** — Provider adapters for supported AI services.
- **Model management** — Configure providers and select models.
- **Workspace tools** — Browse files, run commands, inspect diffs, and manage changes.
- **Project Memory** — Keep persistent project notes and search them later.
- **Task Queue** — Queue messages while model tasks are running.
- **MCP integration** — Connect to MCP servers through stdio.
- **Plugins & Skills** — Extend H2O with local plugin modules and skill instructions.
- **Session History** — Store conversation and session data locally.
- **Responsive UI** — Dark/light themes, mobile navigation, and English/Persian RTL support.

## Installation

Install H2O globally using npm:

```powershell
npm install -g @dash_arta/h2o-cli
```

Start H2O:

```powershell
h2o
```

Requirements:

- Node.js 22.12.0 or newer
- npm
- An AI provider configured for model-powered tasks

## Quick Start

1. Install H2O.
2. Open a terminal in your project directory.
3. Run `h2o`.
4. Configure an AI provider.
5. Start chatting with H2O.
6. Use `Tab` to switch between Plan and Build modes.

The current working directory becomes the active H2O workspace.

## CLI Commands

| Command | Description |
|---|---|
| `/help` | Show available commands |
| `/plan` | Switch to Plan mode |
| `/build` | Switch to Build mode |
| `/providers` | List configured providers |
| `/provider-add` | Add an AI provider |
| `/provider-use ID` | Select a provider |
| `/provider-test ID` | Test a provider |
| `/models` | List available models |
| `/model ID` | Select a model |
| `/free-models on\|off` | Toggle free-model options |
| `/queue` | Inspect queued messages |
| `/clear-queue` | Clear the task queue |
| `/cancel` | Request task cancellation |
| `/workspace` | Show workspace information |
| `/cd PATH` | Change workspace directory |
| `/ls` | List workspace files |
| `/run COMMAND` | Run a terminal command |
| `/diff` | Inspect changes |
| `/undo` | Undo supported changes |
| `/doctor` | Run environment diagnostics |
| `/exit` | Exit H2O |

### Project Memory

```text
/memory add <note>
/memory search <query>
/memory list
/memory remove <id>
```

### MCP, Plugins & Skills

MCP commands:

```text
/mcp presets
/mcp install filesystem
/mcp add
/mcp connect
/mcp tools
/mcp disconnect
/mcp remove
```

Plugin commands:

```text
/plugin create
/plugin list
/plugin enable
/plugin disable
```

Skill commands:

```text
/skill create
/skill list
/skill show
```

For detailed configuration, see:

- `docs/CLI-RC7-MCP-PLUGINS-SKILLS.md`

**Security note:** Only connect MCP servers and enable plugins you trust. They may execute local programs or JavaScript with your operating-system user permissions.

## Web Dashboard

H2O includes a local Web Dashboard that shares the active CLI process, agent, provider, model, workspace, task queue, and session events.

Default address:

```text
http://127.0.0.1:4317
```

Dashboard sections include:

- Overview
- AI Chat
- Files
- Terminal
- Providers & Models
- Project Memory
- Sessions
- Settings

### Dashboard UI

- React-powered interface
- Noir monochrome design system
- Dark and light themes
- Collapsible desktop sidebar
- Mobile drawer navigation
- English and Persian language support
- RTL layout support

### Dashboard Authentication

The Web Dashboard uses Google OAuth sign-in.

Create a `.env` file from the provided example:

```powershell
Copy-Item .env.example .env
```

Configure your own Google OAuth Web application credentials:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://127.0.0.1:4317/auth/google/callback
```

Register the callback URL in Google Cloud Console.

Keep `.env` private. Never commit or publish your credentials.

**Important:** Google OAuth currently protects the Web Dashboard. The interactive CLI is not yet gated by Google OAuth.

The local Dashboard uses an HttpOnly, SameSite=Lax session cookie and local authentication signing key. Its default binding is loopback; it is designed for local use, not direct public internet exposure.

## Local Data & Privacy

H2O stores session history and project memory locally:

```text
~/.h2o/h2o.sqlite
```

Provider secrets are handled separately through the operating-system credential manager adapter.

The Dashboard uses a per-process token and Host/Origin checks.

H2O is designed around a local-first workflow. However, requests sent to external AI providers are subject to those providers' privacy policies and data handling practices.

## Development

Clone or open the project source, then install dependencies:

```powershell
npm install
```

Build the Web Dashboard:

```powershell
npm run build:web
```

Run the project:

```powershell
npm start
```

Run checks:

```powershell
npm run check
npm test
```

Build everything:

```powershell
npm run build
```

The `postinstall` script also builds the React Dashboard.

## Optional Browser Agent

Browser automation is optional and requires Playwright and Chromium to be installed separately.

See `docs/BROWSER.md` for details.

## Project Documentation

| Document | Description |
|---|---|
| `docs/ARCHITECTURE-RC5.md` | Architecture and limitations |
| `docs/SECURITY.md` | Security information |
| `docs/PROVIDERS.md` | AI provider configuration |
| `docs/BROWSER.md` | Optional browser automation |
| `docs/ROADMAP.md` | Project roadmap |
| `docs/CLI-RC7-MCP-PLUGINS-SKILLS.md` | MCP, plugins, and skills |

## Contributing

Contributions, bug reports, and ideas are welcome.

Before submitting changes:

1. Run `npm run check`.
2. Run `npm test`.
3. Keep changes focused and documented.
4. Never include API keys, OAuth secrets, or personal credentials.

## License

See the [LICENSE](LICENSE) file.

---

<p align="center">

**H2O CLI**

*Your workspace. Your tools. Your workflow.*

</p>
