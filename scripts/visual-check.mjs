#!/usr/bin/env node
/**
 * Screenshots the running app (default http://localhost:3000, or LIVE_APP_URL)
 * at phone and desktop sizes, signed in as a throwaway couple with sample
 * content (see scripts/lib/test-couple.mjs). Uses the Edge or Chrome already
 * installed; no browser download.
 *
 *   node scripts/visual-check.mjs <out-dir> [path ...]
 *   paths: "home", "story", "{story}" (first entry), "{story2}#decorate",
 *          "~login" (signed out)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { APP, cleanup, cookiesFor, launchBrowser, seed } from "./lib/test-couple.mjs";

const outDir = process.argv[2] ?? ".visual";
const onlyPaths = process.argv.slice(3);
mkdirSync(outDir, { recursive: true });

let browser;
try {
  const { kath, journalIds } = await seed();
  const cookies = await cookiesFor(kath.session);
  const paths = onlyPaths.length
    ? onlyPaths.map((p) => `/${p.replace(/^\/+/, "")}`.replace("{story}", `story/${journalIds[0]}`.slice(0)).replace("{story2}", `story/${journalIds[1]}`))
    : ["/home", "/story", `/story/${journalIds[1]}`, "/calendar", "/memories", "/letters", "/milestones", "/places", "/notes", "/settings"];

  browser = await launchBrowser();
  const viewports = [
    { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ];
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp.viewport, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch, timezoneId: "Asia/Manila" });
    await context.addCookies([...cookies, { name: "os_tz", value: "Asia%2FManila", url: APP }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of paths) {
      const decorate = path.endsWith("#decorate");
      // A leading "~" means "view signed out" (landing, sign-in pages).
      const signedOut = path.startsWith("/~");
      await context.clearCookies();
      await context.addCookies(signedOut ? [{ name: "os_tz", value: "Asia%2FManila", url: APP }] : [...cookies, { name: "os_tz", value: "Asia%2FManila", url: APP }]);
      const url = `${APP}${path.replace("#decorate", "").replace("/~", "/")}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      // Scroll through so lazy images load and scroll-driven reveals finish.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.6) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      if (decorate) {
        await page.getByRole("button", { name: "Decorate" }).click();
        await page.waitForTimeout(800);
      }
      const file = join(outDir, `${vp.name}${path.replace(/[/?#=&~]+/g, "_") || "_root"}.png`);
      await page.screenshot({ path: file, fullPage: !decorate });
      console.log(`${vp.name} ${path} -> ${file}${errors.length ? ` (page errors: ${errors.join(" | ")})` : ""}`);
      errors.length = 0;
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await cleanup();
}
