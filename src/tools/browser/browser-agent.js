import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Visible, opt-in browser adapter. Every request is constrained to the
 * user's explicit hostname allowlist; credentials are never returned to the model.
 */
export class BrowserAgent {
  constructor({ allowedHosts = [], headless = false } = {}) {
    this.allowedHosts = new Set(allowedHosts.map(x => String(x).trim().toLowerCase()).filter(Boolean));
    this.headless = headless;
    this.browser = null;
    this.context = null;
    this.page = null;
  }
  setAllowedHosts(hosts) {
    this.allowedHosts = new Set(hosts.map(x => String(x).trim().toLowerCase()).filter(Boolean));
  }
  assertAllowed(url) {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP(S) pages are allowed.");
    if (!this.allowedHosts.size) throw new Error("Browser Agent is locked: the host allowlist is empty. Add one with /browser allow example.com.");
    if (!this.allowedHosts.has(parsed.hostname.toLowerCase())) {
      throw new Error(`Blocked browser host: ${parsed.hostname}. Allow it explicitly with /browser allow ${parsed.hostname}.`);
    }
    return parsed;
  }
  async ensureStarted() {
    if (this.page && !this.page.isClosed()) return true;
    let playwright;
    try { playwright = await import("playwright"); }
    catch { throw new Error("Browser Agent needs Playwright. Run: npm install playwright && npx playwright install chromium"); }
    this.browser = await playwright.chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({ acceptDownloads: false, serviceWorkers: "block" });
    this.page = await this.context.newPage();
    await this.page.route("**/*", async route => {
      try {
        const url = route.request().url();
        if (url.startsWith("http://") || url.startsWith("https://")) this.assertAllowed(url);
        else if (!url.startsWith("data:") && !url.startsWith("about:")) return route.abort();
        await route.continue();
      } catch { await route.abort(); }
    });
    return true;
  }
  async open(url) {
    this.assertAllowed(url);
    if (!this.page) await this.ensureStarted();
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    this.assertAllowed(this.page.url());
    return { url: this.page.url(), title: await this.page.title(), text: await this.getText() };
  }
  async getText() {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    return (await this.page.locator("body").innerText({ timeout: 10000 })).slice(0, 20000);
  }
  async saveScreenshot() {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    const dir = path.join(os.homedir(), ".h2o", "browser-screenshots");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `h2o-${Date.now()}.png`);
    await this.page.screenshot({ path: file, type: "png", fullPage: false });
    return `Screenshot saved locally: ${file}`;
  }
  async click(selector) {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    await this.page.locator(selector).first().click({ timeout: 10000 });
    await this.page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    this.assertAllowed(this.page.url());
    return `Clicked ${selector}. Current page: ${this.page.url()}`;
  }
  async type(selector, text) {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    await this.page.locator(selector).first().fill(String(text), { timeout: 10000 });
    return `Entered text into ${selector}.`;
  }
  async waitFor(selector, timeout = 10000) {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    await this.page.locator(selector).first().waitFor({ state: "visible", timeout });
    return `Element is visible: ${selector}`;
  }
  async back() {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    await this.page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
    this.assertAllowed(this.page.url());
    return `Current page: ${this.page.url()}`;
  }
  async scroll(pixels = 600) {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    await this.page.mouse.wheel(0, pixels);
    return "Scrolled page.";
  }
  async screenshot() {
    if (!this.page || this.page.isClosed()) throw new Error("Browser Agent is not open.");
    return await this.page.screenshot({ type: "png" });
  }
  async close() {
    await this.browser?.close();
    this.browser = null; this.context = null; this.page = null;
  }
}
