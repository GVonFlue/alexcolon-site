#!/usr/bin/env node
/**
 * Visual verification. A green build will never catch a runtime error, and a
 * site can exit 0 and be a blank white page on a phone. This renders the real
 * pages in a real browser so somebody can look at them.
 *
 * Also checks the two things that only show up at render time: horizontal
 * overflow at 320, 375, 390, 768 and 1280, and console errors.
 *
 * Runs every check in both Chromium and WebKit. Most of this site's traffic
 * is iOS Safari, and Chromium passing has never been evidence WebKit does
 * too: transform-box: fill-box on SVG marks looked fine in Chromium and
 * still needed replacing (see DESIGN-NOTES.md) once actually checked in an
 * engine with a documented history of getting that reference box wrong.
 * Screenshots are named by engine (audit-output/<engine>/...) so the two
 * can be compared directly, not just both eyeballed separately.
 *
 * One engine failing to launch does not stop the other from running: each
 * engine gets its own bounded time budget, and a WebKit that cannot even
 * open a page is reported as a hard failure of this script, not silently
 * skipped, because a check nobody can see the result of is not a check.
 */
import { execFile, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium, webkit } from "playwright";
import { killTree } from "./kill-tree.mjs";

const PORT = process.env.SHOT_PORT ?? "3141";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.SHOT_DIR ?? "audit-output";

const ROUTES = ["/", "/buy", "/sell", "/veterans", "/investors", "/areas", "/about", "/contact"];
const WIDTHS = [320, 375, 390, 768, 1280];

// Both default to whatever Playwright resolves on its own. CHROMIUM_PATH
// exists because the container this originally ran in keeps a prebuilt
// Chromium outside Playwright's own cache; WEBKIT_PATH is here for the
// same reason, should an environment ever need it, but is unset by default.
const ENGINES = [
  {
    name: "chromium",
    launch: () =>
      chromium.launch(
        process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
      ),
  },
  {
    name: "webkit",
    launch: () => webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {}),
  },
];

const ENGINE_TIMEOUT_MS = Number(process.env.SHOT_ENGINE_TIMEOUT_MS ?? 90_000);

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(BASE, { signal: AbortSignal.timeout(2500) })).ok) return true;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The specific exercise this audit exists to run, not just a generic
 * screenshot: hover a non-anchor town mark, confirm it scales in place
 * (its center does not move, which is exactly what threw when
 * transform-box: fill-box resolved to the wrong reference box), then
 * select it and confirm the selection actually registers.
 */
async function checkMapInteraction(page, engineName) {
  await page.goto(`${BASE}/areas`, { waitUntil: "networkidle" });
  const mark = await page.$('g[aria-label="Ask about Andover"]');
  if (!mark) return { ok: false, detail: "could not find the Andover mark on /areas" };
  await mark.scrollIntoViewIfNeeded();

  const dot = await mark.$("g.mark-scale circle");
  const hit = await mark.$("circle.hit");
  if (!dot || !hit) return { ok: false, detail: "mark is missing its dot or hit target" };

  const before = await dot.boundingBox();
  const hitBox = await hit.boundingBox();
  if (!before || !hitBox) return { ok: false, detail: "could not measure the mark before hovering" };

  await page.mouse.move(hitBox.x + hitBox.width / 2, hitBox.y + hitBox.height / 2);
  await page.waitForTimeout(300);
  const after = await dot.boundingBox();
  if (!after) return { ok: false, detail: "could not measure the mark after hovering" };

  const centerBefore = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
  const centerAfter = { x: after.x + after.width / 2, y: after.y + after.height / 2 };
  const drift = Math.hypot(centerAfter.x - centerBefore.x, centerAfter.y - centerBefore.y);
  const growth = after.width / before.width;

  // A mark that scales in place drifts by nothing (sub-pixel rounding
  // aside) and visibly grows. A mark thrown across the map by a
  // mis-resolved transform-origin drifts by tens or hundreds of pixels;
  // 2px is a generous allowance for antialiasing, not the bug this guards.
  const scaledInPlace = drift < 2 && growth > 1.03;

  await page.mouse.click(hitBox.x + hitBox.width / 2, hitBox.y + hitBox.height / 2);
  await page.waitForTimeout(300);
  const pressed = await mark.getAttribute("aria-pressed");
  const ctaCount = await page.locator("text=Ask Alex about Andover").count();
  const selects = pressed === "true" && ctaCount > 0;

  return {
    ok: scaledInPlace && selects,
    detail: `${engineName}: drift ${drift.toFixed(2)}px, growth ${growth.toFixed(3)}x, aria-pressed=${pressed}, cta=${ctaCount}`,
  };
}

async function runEngine(engine, out) {
  let failures = 0;
  mkdirSync(out, { recursive: true });
  const browser = await engine.launch();
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();

      const consoleErrors = [];
      const blockedExternal = [];
      const isBlockedFont = (t) =>
        /ERR_TUNNEL_CONNECTION_FAILED|ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED)/.test(t);

      page.on("requestfailed", (r) => {
        if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) blockedExternal.push(r.url());
      });
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        if (isBlockedFont(m.text())) blockedExternal.push(m.text());
        else consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(String(e)));

      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        const ok = overflow <= 0;
        if (!ok) failures += 1;
        console.log(
          `${ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} ${String(width).padStart(4)}px  ${route.padEnd(12)} overflow ${overflow}px`,
        );

        if (width === 390 || width === 1280) {
          const name = route === "/" ? "home" : route.slice(1);
          await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: route === "/" });
        }
      }

      if (consoleErrors.length) {
        failures += consoleErrors.length;
        console.log(`FAIL  ${engine.name} ${width}px console errors:`);
        for (const e of consoleErrors.slice(0, 5)) console.log(`        ${e.slice(0, 160)}`);
      } else {
        const note = blockedExternal.length
          ? ` (${blockedExternal.length} blocked webfont requests, this container has no egress to Google Fonts; the fallback stack is what rendered)`
          : "";
        console.log(`pass  ${engine.name.padEnd(8)} ${String(width).padStart(4)}px  no console errors on any route${note}\n`);
      }

      await ctx.close();
    }

    // The map exercise runs once per engine at a desktop width, where hover
    // is the real interaction; touch-only viewports select on tap instead,
    // which the same click() call exercises equivalently for this check.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
    const page = await ctx.newPage();
    const result = await checkMapInteraction(page, engine.name);
    if (!result.ok) failures += 1;
    console.log(`${result.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} map hover/select   ${result.detail}\n`);
    await ctx.close();
  } finally {
    await browser.close();
  }
  return failures;
}

let totalFailures = 0;
const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: { ...process.env, ALLOWED_ORIGINS: "" },
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

try {
  if (!(await waitForServer())) throw new Error("server did not start");

  console.log("Visual and runtime check");
  console.log("========================\n");

  for (const engine of ENGINES) {
    console.log(`--- ${engine.name} ---\n`);
    try {
      totalFailures += await withTimeout(
        runEngine(engine, `${OUT}/${engine.name}`),
        ENGINE_TIMEOUT_MS,
        `${engine.name}`,
      );
    } catch (err) {
      totalFailures += 1;
      console.log(`FAIL  ${engine.name} could not complete: ${err.message}`);
      console.log(
        `      This is reported as a failure, not skipped: a route this engine cannot render is a route nobody has actually verified.\n`,
      );
      // Best effort: a timed-out launch leaves its browser process running
      // (the hung call that owns the handle never got the chance to close
      // it), so this reaches into the OS to clean up rather than leaving
      // it for the next run to find.
      execFile("pkill", ["-f", `ms-playwright.*${engine.name}`], () => {});
    }
  }

  console.log(`\n${totalFailures} failure(s). Screenshots in ${OUT}/<engine>/`);
} finally {
  killTree(server);
}
process.exit(totalFailures > 0 ? 1 : 0);
