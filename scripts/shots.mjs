#!/usr/bin/env node
/**
 * Visual verification. A green build will never catch a runtime error, and a
 * site can exit 0 and be a blank white page on a phone. This renders the real
 * pages in a real browser so somebody can look at them.
 *
 * Also checks the things that only show up at render time: horizontal overflow
 * at eight widths, console errors, that every band actually reached its
 * revealed state, that the Kansas name lockup obeys its font size ratio in the
 * browser's own computed styles, that the map panel is fully keyboard
 * operable, and that reduced motion suppresses every animation without
 * leaving anything invisible.
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
/**
 * Eight widths, not five. 360 is the single most common Android width, 414 is
 * the large-phone class, 1024 is portrait iPad and the exact point the lg
 * breakpoint takes effect, and 1440 is the laptop the client will look at this
 * on. A layout that is only ever checked at 375 and 1280 is checked at two
 * points and inferred everywhere else.
 */
const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440];

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

// Eight widths across eight routes, plus four dedicated checks, in one engine.
const ENGINE_TIMEOUT_MS = Number(process.env.SHOT_ENGINE_TIMEOUT_MS ?? 300_000);

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

  // Let the band's own reveal finish before measuring anything.
  //
  // This cost a real diagnosis rather than a guess. scrollIntoViewIfNeeded
  // triggers the section's IntersectionObserver, and the reveal transition
  // moves the band up by 12px over 700ms. Measuring the mark during that
  // window and again after it produced an 11.8px "drift" that looked exactly
  // like the transform-box bug this check exists to catch, and was not: the
  // mark had not moved at all, the band under it had. Measuring relative to
  // the SVG's own box below makes the check immune to that class of false
  // positive entirely, and this wait keeps the numbers stable regardless.
  await page.waitForTimeout(900);

  const hit = await mark.$("circle.hit");
  if (!hit) return { ok: false, detail: "mark is missing its hit target" };

  /**
   * The mark's centre and size in the SVG's own frame, not the viewport's.
   * Page layout moving underneath the map is not the failure this is looking
   * for; a mark thrown across the drawing by a mis-resolved transform-origin
   * is, and that shows up here whether or not the page has moved.
   */
  const measure = () =>
    page.evaluate(() => {
      const g = document.querySelector('g[aria-label="Ask about Andover"]');
      const c = g.querySelector("g.mark-scale circle");
      const svg = g.closest("svg").getBoundingClientRect();
      const box = c.getBoundingClientRect();
      return {
        cx: box.x + box.width / 2 - svg.x,
        cy: box.y + box.height / 2 - svg.y,
        size: box.width,
      };
    });

  const before = await measure();
  const hitBox = await hit.boundingBox();
  if (!hitBox) return { ok: false, detail: "could not measure the hit target" };

  await page.mouse.move(hitBox.x + hitBox.width / 2, hitBox.y + hitBox.height / 2);
  await page.waitForTimeout(400);
  const after = await measure();

  const drift = Math.hypot(after.cx - before.cx, after.cy - before.cy);
  const growth = after.size / before.size;

  // A mark that responds in place drifts by nothing (sub-pixel rounding aside)
  // and visibly grows. A mark thrown across the map by a mis-resolved
  // transform-origin drifts by tens or hundreds of pixels. 2px is a generous
  // allowance for antialiasing, not for the bug this guards.
  //
  // Growth is larger than the 1.1 hover scale on purpose now: hovering also
  // opens the town panel, which makes that town the active one and takes its
  // dot from r=6 to r=10, so the two effects compound to roughly 1.83x.
  const respondedInPlace = drift < 2 && growth > 1.03;

  await page.mouse.click(hitBox.x + hitBox.width / 2, hitBox.y + hitBox.height / 2);
  await page.waitForTimeout(300);
  const pressed = await mark.getAttribute("aria-pressed");
  const ctaCount = await page.locator("text=Text Alex about Andover").count();
  const selects = pressed === "true" && ctaCount > 0;

  return {
    ok: respondedInPlace && selects,
    detail: `${engineName}: drift ${drift.toFixed(2)}px, growth ${growth.toFixed(3)}x, aria-pressed=${pressed}, cta=${ctaCount}`,
  };
}

/**
 * Scroll the whole page the way a person does, then return to the top.
 *
 * A full-page screenshot does not fire an IntersectionObserver, which is how a
 * previous version of this audit caught every band below the fold rendering at
 * opacity 0. That was fixed once by putting a 60ms timer in the component,
 * which revealed everything shortly after mount and quietly killed the reveal
 * on every long route. The timer is gone and this is the replacement: the tool
 * does what a visitor does, and the component stays honest.
 */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    // globals.css sets `html { scroll-behavior: smooth }`, which turns every
    // scrollTo into an animation. A loop of them then fights itself and the
    // page never actually reaches the bottom, so no observer ever fires and
    // every band reports as unrevealed. Force instant scrolling for the
    // duration and put the declaration back afterwards.
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < html.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 300));
    html.style.scrollBehavior = previous;
  });
}

/**
 * Kansas advertising law, measured rather than asserted.
 *
 * K.S.A. 58-3086 requires the supervising broker's name in a readable and
 * identifiable manner, and the licensee's own name must not be given greater
 * prominence. lib/compliance-type.ts holds the registered sizes and throws at
 * module load if the ratio is illegal, but a constant in a TypeScript file is
 * a claim about the CSS, not the CSS. This reads what the browser actually
 * computed, which is the only version that can fail for a reason nobody
 * anticipated: a Tailwind class that did not apply, a font size inherited from
 * somewhere unexpected, a lockup somebody added and did not register.
 */
async function checkComplianceLockups(page) {
  const results = await page.evaluate(() => {
    const out = [];
    for (const lockup of document.querySelectorAll("[data-compliance-lockup]")) {
      const agent = lockup.querySelector('[data-compliance-part="agent"]');
      const brokerage = lockup.querySelector('[data-compliance-part="brokerage"]');
      const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
      out.push({
        where: lockup.getAttribute("data-compliance-lockup"),
        agent: px(agent),
        brokerage: px(brokerage),
        // A brokerage name that is present in the DOM but not displayed is not
        // "in a readable and identifiable manner", so hidden counts as absent.
        brokerageVisible: Boolean(brokerage && brokerage.getClientRects().length > 0),
      });
    }
    return out;
  });

  const problems = [];
  for (const r of results) {
    if (!r.brokerageVisible) {
      problems.push(`${r.where}: the brokerage name is not visible`);
      continue;
    }
    const ratio = r.agent / r.brokerage;
    if (ratio > 2) {
      problems.push(
        `${r.where}: agent name is ${ratio.toFixed(2)}x the brokerage name, the cap is 2x`,
      );
    }
  }
  return {
    ok: problems.length === 0 && results.length > 0,
    detail:
      results.length === 0
        ? "no compliance lockups found in the DOM at all"
        : problems.length
          ? problems.join("; ")
          : results
              .map((r) => `${r.where} ${(r.agent / r.brokerage).toFixed(2)}x`)
              .join(", "),
  };
}

/**
 * The map panel, driven entirely from the keyboard.
 *
 * The brief's accessibility floor: keyboard focus must open the panel, or the
 * signature element is mouse-only and the whole town card dataset is
 * unreachable for anyone who does not use one. Escape must close it.
 */
async function checkMapKeyboard(page) {
  await page.goto(`${BASE}/areas`, { waitUntil: "networkidle" });
  await scrollThrough(page);

  const mark = await page.$('g[aria-label="Ask about Derby"]');
  if (!mark) return { ok: false, detail: "could not find the Derby mark" };

  await mark.focus();
  await page.waitForTimeout(300);
  const openedOnFocus = (await page.locator("text=Text Alex about Derby").count()) > 0;

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const closedOnEscape = (await page.locator("text=Text Alex about Derby").count()) === 0;

  // And the panel's own controls have to be reachable once it is open.
  await mark.focus();
  await page.waitForTimeout(250);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const pressed = (await mark.getAttribute("aria-pressed")) === "true";

  return {
    ok: openedOnFocus && closedOnEscape && pressed,
    detail: `focus opens=${openedOnFocus}, escape closes=${closedOnEscape}, enter selects=${pressed}`,
  };
}

/**
 * Reduced motion, checked both ways round.
 *
 * Suppressing animation is only half the requirement. The half that actually
 * breaks sites is content left invisible because a reveal hid it and the
 * animation that would have brought it back was disabled. So this asserts both:
 * nothing is animating, and nothing is stuck at zero opacity.
 */
async function checkReducedMotion(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const problems = [];

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    // Deliberately no scrolling. Under reduced motion the whole page must be
    // visible without one, because the reveal must never have hidden anything.
    const bad = await page.evaluate(() => {
      const invisible = [];
      const running = [];
      for (const el of document.querySelectorAll("section, section *")) {
        const cs = getComputedStyle(el);
        if (el.matches("section") && parseFloat(cs.opacity) < 0.99) {
          invisible.push(el.className.split(" ").slice(0, 2).join(" "));
        }
      }
      for (const el of document.querySelectorAll("*")) {
        const anims = el.getAnimations ? el.getAnimations() : [];
        for (const a of anims) {
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          // A duration the blanket query has flattened to 0.01ms is suppressed.
          // Anything still running for a perceptible time is not.
          if (t && typeof t.duration === "number" && t.duration > 1) {
            running.push(`${el.tagName.toLowerCase()}:${a.animationName ?? "anim"}`);
          }
        }
      }
      return { invisible, running: running.slice(0, 5) };
    });
    if (bad.invisible.length) {
      problems.push(`${route}: ${bad.invisible.length} section(s) invisible under reduced motion`);
    }
    if (bad.running.length) {
      problems.push(`${route}: still animating [${bad.running.join(", ")}]`);
    }
  }

  await ctx.close();
  return { ok: problems.length === 0, detail: problems.join("; ") || "nothing animating, nothing hidden" };
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
        await scrollThrough(page);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        const ok = overflow <= 0;
        if (!ok) failures += 1;
        console.log(
          `${ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} ${String(width).padStart(4)}px  ${route.padEnd(12)} overflow ${overflow}px`,
        );

        // Every band must have reached its revealed state after a real scroll.
        // This is the check that replaces the 60ms timer Reveal used to carry:
        // that timer revealed everything shortly after mount whether or not it
        // had been scrolled to, which fixed the screenshot and killed the
        // feature. Scrolling the page here is what a person does, so it is
        // what the verification should do.
        const stillHidden = await page.evaluate(() =>
          Array.from(document.querySelectorAll("[data-reveal]"))
            .filter((el) => el.getAttribute("data-reveal") === "hidden")
            .map((el) => el.className.split(" ").slice(0, 3).join(" ")),
        );
        if (stillHidden.length) {
          failures += 1;
          console.log(
            `FAIL  ${engine.name.padEnd(8)} ${String(width).padStart(4)}px  ${route.padEnd(12)} ${stillHidden.length} band(s) never revealed`,
          );
        }

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
    console.log(`${result.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} map hover/select   ${result.detail}`);

    const keyboard = await checkMapKeyboard(page);
    if (!keyboard.ok) failures += 1;
    console.log(`${keyboard.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} map keyboard      ${keyboard.detail}`);

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const lockups = await checkComplianceLockups(page);
    if (!lockups.ok) failures += 1;
    console.log(`${lockups.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} Kansas lockup     ${lockups.detail}`);

    await ctx.close();

    const reduced = await checkReducedMotion(browser);
    if (!reduced.ok) failures += 1;
    console.log(`${reduced.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} reduced motion    ${reduced.detail}\n`);
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
