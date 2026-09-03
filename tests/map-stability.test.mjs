/**
 * Regression tests for the map hover instability.
 *
 * The bug: hovering a town on the hero map made the hero oscillate, with the
 * content sitting roughly 100px apart between two moments. It was a layout
 * feedback loop, not a paint glitch. The fact panel sat under the map in normal
 * flow, so hovering grew the caption slot from 60px to 454px, grew the figure
 * from 351px to 745px, and because the hero row is a two-column grid with
 * items-center the whole row re-centred: the map moved 124px up under a
 * stationary cursor while the headline moved 73px down. The cursor was then off
 * the town, the panel closed, everything snapped back, and it repeated at
 * reflow speed.
 *
 * These assert the properties that make that impossible rather than asserting
 * the absence of the symptom, because "it did not oscillate this time" is not a
 * test. Each one fails if a specific structural guarantee is removed:
 *
 *   1. hovering changes no layout geometry anywhere in the hero
 *   2. the panel wrapper cannot take pointer events
 *   3. the hit target is fixed size, does not transform, and clears 44px on the
 *      narrowest viewport
 *   4. every town's fact card is the same height
 *   5. cumulative layout shift is zero across a full hover sweep
 *
 *   node --test tests/map-stability.test.mjs
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { killTree } from "../scripts/kill-tree.mjs";

const PORT = process.env.TEST_MAP_PORT ?? "3137";
const BASE = `http://127.0.0.1:${PORT}`;
const TOWNS = ["Wichita", "Maize", "Park City", "Goddard", "Andover", "Derby", "Rose Hill"];

let app;
let browser;

before(async () => {
  app = spawn("npx", ["next", "start", "-p", PORT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: { ...process.env, ALLOWED_ORIGINS: "" },
  });
  app.stdout.on("data", () => {});
  app.stderr.on("data", () => {});

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(BASE, { signal: AbortSignal.timeout(2500) })).ok) break;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  killTree(app);
  app?.unref?.();
});

async function open(width, height, route = "/") {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return { ctx, page };
}

/**
 * Start counting layout shift only once the buffered load-time entries have
 * actually been delivered. Zeroing synchronously after observe() does not work:
 * buffered entries arrive in a later task and land after the reset, which
 * reports the page's own load shift as if the interaction had caused it. That
 * produced a constant phantom 0.0068 while this was being written.
 */
async function startCls(page) {
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__cls = 0;
  });
}

const readCls = (page) => page.evaluate(() => window.__cls);

const heroGeometry = (page) =>
  page.evaluate(() => {
    const fig = document.querySelector("figure");
    const svg = fig.querySelector("svg");
    const h1 = document.querySelector("h1");
    return {
      figureHeight: +fig.getBoundingClientRect().height.toFixed(1),
      mapTop: +svg.getBoundingClientRect().top.toFixed(1),
      headlineTop: +h1.getBoundingClientRect().top.toFixed(1),
      documentHeight: document.documentElement.scrollHeight,
    };
  });

/**
 * The visible mark for a town, not simply the first one in the DOM.
 *
 * Below md the map is not in the hero at all; it renders in its own section
 * underneath, and the hero's own copy is display:none. So the homepage carries
 * two instances of every mark at that width, and `page.$` returns the hidden
 * one, whose bounding box is null. Selecting by visibility rather than by
 * document order is what makes the same test meaningful at every breakpoint.
 */
async function hitBoxFor(page, town) {
  const marks = await page.$$(`g[aria-label="Ask about ${town}"]`);
  assert.ok(marks.length > 0, `no mark for ${town}`);
  for (const mark of marks) {
    const hit = await mark.$("circle.hit");
    if (!hit) continue;
    const box = await hit.boundingBox();
    if (box && box.width > 0) {
      await hit.scrollIntoViewIfNeeded();
      return { mark, hit, box: await hit.boundingBox() };
    }
  }
  assert.fail(`${town} has no visible hit target (${marks.length} instance(s) in the DOM)`);
}

test("hovering a town changes no hero geometry at all", async () => {
  const { ctx, page } = await open(1440, 900);
  const atRest = await heroGeometry(page);

  for (const town of TOWNS) {
    const { box } = await hitBoxFor(page, town);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const hovered = await heroGeometry(page);
    for (const key of Object.keys(atRest)) {
      assert.ok(
        Math.abs(hovered[key] - atRest[key]) < 1,
        `${key} moved by ${(hovered[key] - atRest[key]).toFixed(1)} while hovering ${town}. ` +
          `Hover must never change layout: this is the feedback loop.`,
      );
    }
  }
  await ctx.close();
});

test("the pointer over a town belongs to the town, never to the panel", async () => {
  // If the fact panel becomes the event target it fires mouseleave on the mark
  // underneath and restarts the loop by a different route than the one the
  // out-of-flow fix closed.
  const { ctx, page } = await open(1440, 900);
  for (const town of TOWNS) {
    const { box } = await hitBoxFor(page, town);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(180);
    const owner = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const g = el && el.closest("g[aria-label]");
        return g ? g.getAttribute("aria-label") : `not a town: ${el ? el.tagName : "nothing"}`;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    assert.equal(owner, `Ask about ${town}`);
  }
  await ctx.close();
});

test("the panel wrapper cannot take pointer events", async () => {
  const { ctx, page } = await open(1440, 900);
  const { box } = await hitBoxFor(page, "Andover");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const wrapper = document.querySelector("figure [aria-live]");
    const card = wrapper.querySelector("div");
    const cta = wrapper.querySelector("a[href^='sms:']");
    return {
      wrapper: getComputedStyle(wrapper).pointerEvents,
      card: getComputedStyle(card).pointerEvents,
      cta: cta ? getComputedStyle(cta).pointerEvents : null,
    };
  });

  assert.equal(state.wrapper, "none", "the panel wrapper must not be hoverable");
  assert.equal(state.card, "none", "the panel card must not be hoverable");
  assert.equal(state.cta, "auto", "the conversion path inside it still has to be clickable");
  await ctx.close();
});

test("hit targets are fixed size, do not transform, and clear 44px at 390", async () => {
  for (const width of [390, 1440]) {
    const { ctx, page } = await open(width, width === 390 ? 844 : 900);
    for (const town of TOWNS) {
      const { hit, box } = await hitBoxFor(page, town);
      assert.ok(
        box.width >= 44,
        `${town}'s hit target is ${box.width.toFixed(1)}px at ${width}px, under the 44px minimum`,
      );
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(160);
      const after = await hit.boundingBox();
      assert.ok(
        Math.abs(after.width - box.width) < 0.5 && Math.abs(after.height - box.height) < 0.5,
        `${town}'s hit target resized on hover at ${width}px. It must never transform: only its visual child may.`,
      );
    }
    await ctx.close();
  }
});

test("every town's fact card is the same height", async () => {
  // Towns publish different numbers of facts today, and a card that changes
  // height moves its own top edge, which the browser records as a layout shift
  // even though the card is out of flow.
  const { ctx, page } = await open(1440, 1000, "/areas");
  const heights = [];
  for (const town of TOWNS) {
    const { box } = await hitBoxFor(page, town);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(220);
    heights.push(
      await page.evaluate(() => {
        const el = document.querySelector("[aria-live] > div");
        return el ? +el.getBoundingClientRect().height.toFixed(1) : null;
      }),
    );
  }
  const unique = [...new Set(heights)];
  assert.equal(
    unique.length,
    1,
    `fact cards differ in height across towns: ${TOWNS.map((t, i) => `${t}=${heights[i]}`).join(", ")}`,
  );
  await ctx.close();
});

test("a full hover sweep produces zero cumulative layout shift", async () => {
  for (const route of ["/", "/areas"]) {
    const { ctx, page } = await open(1440, 1000, route);
    await startCls(page);
    for (let pass = 0; pass < 2; pass += 1) {
      for (const town of TOWNS) {
        const { box } = await hitBoxFor(page, town);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(150);
      }
    }
    assert.equal(await readCls(page), 0, `${route} shifted during a hover sweep`);
    await ctx.close();
  }
});

test("tap shows and tap away dismisses, with nothing moving, at 390px", async () => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await startCls(page);

  const figureHeight = () =>
    page.evaluate(() => {
      const fig = [...document.querySelectorAll("figure")].find(
        (f) => f.getBoundingClientRect().height > 0,
      );
      return fig ? +fig.getBoundingClientRect().height.toFixed(1) : 0;
    });
  const atRest = await figureHeight();

  for (const town of TOWNS) {
    const { box } = await hitBoxFor(page, town);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(280);
    const shown = await page.evaluate((t) => {
      const el = document.querySelector("[aria-live] .display");
      return Boolean(el) && el.textContent.trim() === t;
    }, town);
    assert.ok(shown, `tapping ${town} did not show its panel`);
    assert.ok(Math.abs((await figureHeight()) - atRest) < 1, `the figure grew when ${town} was tapped`);

    /*
     * Dismiss by tapping an inert point, computed rather than guessed.
     *
     * The first version tapped a fixed (12, box.y - 120), which on some towns
     * landed on the hero's primary CTA and navigated to /buy. The next town's
     * mark then did not exist and the failure read as "no mark for Goddard",
     * which is a true statement about a page the test had accidentally left.
     * This taps just above the map figure, inside its section's own padding,
     * where there is nothing to activate.
     */
    const inert = await page.evaluate(() => {
      const fig = [...document.querySelectorAll("figure")].find(
        (f) => f.getBoundingClientRect().height > 0,
      );
      const r = fig.getBoundingClientRect();
      return { x: Math.max(4, r.left + 6), y: Math.max(4, r.top - 14) };
    });
    await page.touchscreen.tap(inert.x, inert.y);
    await page.waitForTimeout(280);
    assert.equal(
      new URL(page.url()).pathname,
      "/",
      `dismissing ${town} navigated away instead of closing the panel`,
    );
    const gone = await page.evaluate(() => !document.querySelector("[aria-live] .display"));
    assert.ok(gone, `tapping away did not dismiss ${town}`);
  }

  assert.equal(await readCls(page), 0, "touch interaction shifted the page");
  await ctx.close();
});
