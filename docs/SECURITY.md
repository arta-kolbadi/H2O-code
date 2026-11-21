# Security status — H2O 1.0.0-rc.2 Milestone 1 checkpoint

## Implemented in this checkpoint

- Hosted provider API keys are not saved to `providers.json`.
- Credentials are stored using the OS credential manager via `@napi-rs/keyring`; no plaintext-file fallback is implemented.
- Environment variables are supported for provider credentials.
- Known API-token formats and explicitly supplied provider secrets are redacted from provider HTTP error messages.
- Provider HTTP requests have timeouts, caller cancellation support, and bounded retries for network failures, HTTP 429, and HTTP 5xx responses.
- The Dashboard HTTP listener binds to `127.0.0.1`.

## Not yet implemented — do not treat the Dashboard as hardened

- Host-header validation
- Origin validation and CSRF defenses
- Random per-session client token
- Security regression tests for DNS rebinding and cross-origin requests
- Central permission policy for every filesystem, terminal, and third-party tool
- User-visible global stop/pause/approval mechanism across separate clients
- Persistent snapshots and robust rollback

The Dashboard can invoke agent and terminal operations. Until Milestone 5 is complete, do not expose it outside the local machine and do not browse untrusted sites while it is open in a browser that can reach the local Dashboard.

## Credential notes

The registry metadata file is stored under `~/.h2o/providers.json` with restrictive permissions where supported. API keys are stored in the operating system credential store. On Linux, `@napi-rs/keyring` attempts Secret Service and can fall back to kernel keyutils; kernel keyring values may not persist across reboots. The project does not currently provide encrypted-file fallback if keychain support is unavailable.

The legacy `h2o connect` command no longer saves an OpenRouter key in plaintext; it prints migration guidance instead.
