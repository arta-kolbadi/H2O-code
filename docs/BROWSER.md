# Optional Browser Agent

Browser automation is an optional capability, not enabled by default.

Install in the project when you explicitly want browser automation:

```powershell
npm install --save-dev playwright
npx playwright install chromium
```

The adapter in `src/tools/browser/browser-agent.js` supports opening HTTP(S) pages,
reading visible page text, and taking screenshots. It has an optional host allowlist.
It deliberately does not provide automatic form submission, credential entry,
file downloads, or arbitrary page actions. Those require a separately reviewed
permission workflow before being enabled.

Do not browse to untrusted pages with secrets or authenticated profiles.

## Enable the visible Browser Agent in H2O

1. Install the optional browser runtime from the H2O project folder:

   ```powershell
   npm install playwright
   npx playwright install chromium
   ```

2. Explicitly allow the exact hostname you intend to visit:

   ```text
   /browser allow dash.cloudflare.com
   ```

3. Open the site:

   ```text
   /browser open https://dash.cloudflare.com/
   ```

4. Use `/browser text`, `/browser screenshot`, and `/browser close` to inspect or close it.
   The model also receives `browser_*` tools in Build Mode and can use the visible page.

The allowlist is persisted in `~/.h2o/config.json`. Redirects and subresources to hosts
not on the allowlist are blocked, so add only hosts you trust and that the site actually
needs. Browser clicks and typing require an interactive `y/N` approval each time. Password,
API-key, token, and verification-code fields are blocked from model-directed typing; complete
sign-in and MFA manually in the visible browser. Browser sessions are temporary and are not
reused across launches. Downloads are disabled.
