#!/usr/bin/env node
/**
 * Viewport screenshots taken after really scrolling, so fixed backgrounds and
 * scroll-triggered reveals show what a person sees (full-page screenshots
 * can't show either).
 *
 *   node scripts/scroll-check.mjs <out-dir> [path ...]   (paths as in visual-check.mjs)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { APP, cleanup, cookiesFor, launchBrowser, seed } from "./lib/test-couple.mjs";

const outDir = process.argv[2] ?? ".visual";
mkdirSync(outDir, { recursive: true });

let browser;
try {
  const { kath, journalIds } = await seed();
  const cookies = await cookiesFor(kath.session);
  const paths = (process.argv.length > 3 ? process.argv.slice(3) : ["home", "story", "memories"]).map((p) =>
    `/${p.replace(/^\/+/, "")}`.replace("{story}", `story/${journalIds[0]}`).replace("{story2}", `story/${journalIds[1]}`),
  );

  browser = await launchBrowser();
  for (const vp of [
    { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({ ...vp, timezoneId: "Asia/Manila" });
    await context.addCookies([...cookies, { name: "os_tz", value: "Asia%2FManila", url: APP }]);
    const page = await context.newPage();
    for (const path of paths) {
      await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const stops = [0.5, 1].map((f) => Math.round((height - vp.viewport.height) * f)).filter((y) => y > 0);
      for (const [index, y] of stops.entries()) {
        await page.mouse.wheel(0, y - (await page.evaluate(() => scrollY)));
        await page.waitForTimeout(900);
        const file = join(outDir, `${vp.name}_${path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}_scroll${index + 1}.png`);
        await page.screenshot({ path: file });
        console.log(`${vp.name} ${path} @${y}px -> ${file}`);
      }
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await cleanup();
}
