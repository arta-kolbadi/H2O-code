# Providers and credential handling (Milestone 1)

H2O 1.0.0-rc.2 adds a shared provider registry for OpenAI, OpenAI-compatible endpoints, OpenRouter, Anthropic, Google Gemini, Ollama, LM Studio, and GitHub Copilot through the official Copilot SDK.

## Add a provider

Providers can be added from the Web Dashboard or with `/provider-add`. Adding a provider does not ask for a key. H2O asks for a credential only when a hosted provider is first used. `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `COPILOT_GITHUB_TOKEN` are read from the process environment when present. Other custom providers can use `H2O_PROVIDER_<ID>_API_KEY` (replace non-alphanumeric ID characters with `_`).

Otherwise, credentials are stored with the OS credential manager by `@napi-rs/keyring`. H2O intentionally does not fall back to plaintext key files. On Linux, the keyring library attempts Secret Service and may use the kernel keyutils store; credentials in the kernel keyring may not survive a reboot, so configure a persistent Secret Service for persistent credentials.

Provider metadata is written to `~/.h2o/providers.json` without secret values. API keys are never included in provider metadata or normal logs. The beta-era `~/.h2o/api-key` plaintext file is no longer read or written; H2O does not delete an existing file automatically, so remove that old file yourself after confirming the credential has been moved to the OS credential store or an environment variable.

## Supported provider kinds

| Kind | Service | Default URL |
|---|---|---|
| `openai` | OpenAI API | `https://api.openai.com/v1` |
| `openai-compatible` | Custom OpenAI-compatible API | User supplied |
| `openrouter` | OpenRouter | `https://openrouter.ai/api/v1` |
| `anthropic` | Anthropic Messages API | `https://api.anthropic.com` |
| `gemini` | Gemini Interactions API | `https://generativelanguage.googleapis.com` |
| `ollama` | Ollama local API | `http://127.0.0.1:11434/v1` |
| `lm-studio` | LM Studio local API | `http://127.0.0.1:1234/v1` |
| `github-copilot` | Official GitHub Copilot SDK | SDK-managed |

## GitHub note

GitHub Models was retired on July 30, 2026. H2O does not implement the retired GitHub Models inference endpoint. GitHub Copilot integration is through the official `@github/copilot-sdk` package; no unofficial Copilot endpoint is used. See the [GitHub Models retirement notice](https://github.blog/changelog/2026-06-30-github-models-is-being-retired/) and [official Copilot SDK package](https://www.npmjs.com/package/@github/copilot-sdk).

## Limits of this milestone

Provider CRUD and basic provider contracts are implemented in CLI and Dashboard. Unit tests use mocked HTTP responses and a fake SDK client; they do not prove the availability of a real provider account, network route, quota, subscription, or model entitlement. Streaming/tool call normalization is covered for the tested adapters, but real-world compatibility varies by model and provider. Model auto-routing is currently a deterministic heuristic, not a benchmarked quality/cost router. Image/vision handling, provider-wide tool capability negotiation, Copilot-to-H2O tool-call bridging, and robust multi-provider comparison remain later work.
