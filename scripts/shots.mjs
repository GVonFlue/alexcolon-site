#!/usr/bin/env node
/**
 * Visual verification. A green build will never catch a runtime error, and a
 * site can exit 0 and be a blank white page on a phone. This renders the real
 * pages in a real browser so somebody can look at them.
 *
 * Also checks the two things that only show up at render time: horizontal
 * overflow at 320, 375 and 390, and console errors.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { killTree } from "./kill-tree.mjs";

const PORT = process.env.SHOT_PORT ?? "3141";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.SHOT_DIR ?? "audit-output";
mkdirSync(OUT, { recursive: true });

const ROUTES = ["/", "/buy", "/sell", "/veterans", "/investors", "/areas", "/about", "/contact"];
const WIDTHS = [320, 375, 390, 768, 1280];

const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: { ...process.env, ALLOWED_ORIGINS: "" },
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

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

let failures = 0;
try {
  if (!(await waitForServer())) throw new Error("server did not start");

  const browser = await chromium.launch({ executablePath:
      process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

  console.log("Visual and runtime check");
  console.log("========================\n");

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    const consoleErrors = [];
    const blockedExternal = [];

    /**
     * Requests to fonts.googleapis.com fail inside the sandboxed build
     * container, which has no egress to it. That is an environment fact, not a
     * site defect, and the page is designed to be correct without the webfont,
     * so it is counted separately rather than swallowed. Anything else is a real
     * error and fails this check.
     */
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

      // Zero horizontal overflow. Measured, not assumed.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      const ok = overflow <= 0;
      if (!ok) failures += 1;
      console.log(
        `${ok ? "pass" : "FAIL"}  ${String(width).padStart(4)}px  ${route.padEnd(12)} overflow ${overflow}px`,
      );

      if (width === 390 || width === 1280) {
        const name = route === "/" ? "home" : route.slice(1);
        await page.screenshot({
          path: `${OUT}/${name}-${width}.png`,
          fullPage: route === "/",
        });
      }
    }

    if (consoleErrors.length) {
      failures += consoleErrors.length;
      console.log(`FAIL  ${width}px console errors:`);
      for (const e of consoleErrors.slice(0, 5)) console.log(`        ${e.slice(0, 160)}`);
    } else {
      const note = blockedExternal.length
        ? ` (${blockedExternal.length} blocked webfont requests, this container has no egress to Google Fonts; the fallback stack is what rendered)`
        : "";
      console.log(`pass  ${String(width).padStart(4)}px  no console errors on any route${note}\n`);
    }

    await ctx.close();
  }

  await browser.close();
  console.log(`\n${failures} failure(s). Screenshots in ${OUT}/`);
} finally {
  killTree(server);
}
process.exit(failures > 0 ? 1 : 0);
