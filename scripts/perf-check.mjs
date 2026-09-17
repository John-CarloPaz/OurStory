#!/usr/bin/env node
/**
 * Rough performance check against a running server (use a production build:
 * `npm run build && npx next start -p 3100`, then LIVE_APP_URL=http://localhost:3100).
 *
 *   1. Server render time per page (median of warm requests)
 *   2. Tab-to-tab navigation time in the browser (click -> new page shown)
 *   3. Scroll smoothness with the CPU throttled 4x (average fps, share of slow frames)
 *
 * Signs in as a throwaway couple (scripts/lib/test-couple.mjs) and cleans up.
 */
import { APP, cleanup, cookiesFor, launchBrowser, seed } from "./lib/test-couple.mjs";

const PAGES = ["/home", "/story", "/calendar", "/memories", "/letters", "/milestones", "/places", "/notes", "/settings"];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

let browser;
try {
  const { kath, journalIds } = await seed();
  const cookies = await cookiesFor(kath.session);
  const cookieHeader = [...cookies.map((c) => `${c.name}=${c.value}`), "os_tz=Asia%2FManila"].join("; ");

  console.log("\n1. Server render time (warm, median of 3)");
  for (const path of [...PAGES, `/story/${journalIds[1]}`]) {
    const times = [];
    for (let i = 0; i < 4; i++) {
      const started = performance.now();
      const res = await fetch(`${APP}${path}`, { headers: { cookie: cookieHeader } });
      await res.text();
      if (i > 0) times.push(performance.now() - started);
    }
    console.log(`   ${path.padEnd(52)} ${Math.round(median(times))} ms`);
  }

  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Manila" });
  await context.addCookies([...cookies, { name: "os_tz", value: "Asia%2FManila", url: APP }]);
  const page = await context.newPage();
  await page.goto(`${APP}/home`, { waitUntil: "networkidle" });
  // Warm every route once so we measure navigation, not first-visit work.
  for (const href of PAGES) await page.goto(`${APP}${href}`, { waitUntil: "networkidle" });
  await page.goto(`${APP}/home`, { waitUntil: "networkidle" });

  // Round 1 is a first visit in this browser tab; round 2 repeats within 30 seconds,
  // where the router can reuse the pages it already has (experimental.staleTimes).
  for (const round of [1, 2]) {
    console.log(`\n2.${round} Tab navigation, ${round === 1 ? "first visit" : "revisit"} (click -> page responds -> real content shown)`);
    for (const href of PAGES.slice(1).concat("/home")) {
      const link = page.locator(`header nav a[href="${href}"]`).first();
      if (!(await link.count())) continue;
      const started = Date.now();
      await link.click();
      await page.waitForURL(`**${href}`);
      const responded = Date.now() - started;
      await page.waitForFunction(() => !document.querySelector("[data-space-loading]") && document.querySelector("main h1"));
      console.log(`   ${href.padEnd(12)} responds in ${String(responded).padStart(5)} ms, content in ${String(Date.now() - started).padStart(5)} ms`);
    }
  }

  console.log("\n3. Scrolling with CPU throttled 4x");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const href of ["/home", "/story", "/memories", "/notes"]) {
    await page.goto(`${APP}${href}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const stats = await page.evaluate(async () => {
      const frames = [];
      let last = performance.now();
      let running = true;
      const tick = (t) => {
        frames.push(t - last);
        last = t;
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const distance = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const start = performance.now();
      await new Promise((resolve) => {
        const step = () => {
          const progress = Math.min(1, (performance.now() - start) / 3000);
          scrollTo(0, distance * progress);
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      running = false;
      const average = frames.reduce((a, b) => a + b, 0) / frames.length;
      return { fps: Math.round(1000 / average), slow: Math.round((frames.filter((f) => f > 34).length / frames.length) * 100) };
    });
    console.log(`   ${href.padEnd(12)} ~${stats.fps} fps, ${stats.slow}% slow frames`);
  }
} finally {
  await browser?.close();
  await cleanup();
}
