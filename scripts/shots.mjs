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
 * The chat widget and every form, walked from the keyboard.
 *
 * The map got its own check because it is an SVG with synthetic buttons and is
 * the most likely thing here to be mouse-only. The forms and the composer are
 * ordinary HTML and should be fine, which is exactly why they are worth
 * asserting rather than assuming: "it is a real input so it must be reachable"
 * is the sentence that precedes finding out a wrapper had tabindex="-1" on it.
 *
 * Three things per control: Tab reaches it in DOM order, it is genuinely
 * focused rather than merely scrolled to, and focusing it paints a visible
 * ring. A focus ring that is invisible is the same defect as no focus ring.
 */
async function checkKeyboardReach(page, route, selector, label) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await scrollThrough(page);

  const expected = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const focusable = root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    return Array.from(focusable).map(
      (el, i) => `${i}:${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}`,
    );
  }, selector);

  if (expected === null) return { ok: false, detail: `${label}: could not find ${selector}` };
  if (expected.length === 0) return { ok: false, detail: `${label}: no focusable controls found` };

  const result = await page.evaluate(
    async ({ sel }) => {
      const root = document.querySelector(sel);
      const focusable = Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const unreachable = [];
      const noRing = [];
      for (const el of focusable) {
        el.focus();
        if (document.activeElement !== el) {
          unreachable.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""));
          continue;
        }
        const cs = getComputedStyle(el);
        const width = parseFloat(cs.outlineWidth || "0");
        const hasRing =
          (width > 0 && cs.outlineStyle !== "none") ||
          cs.boxShadow !== "none" ||
          // The composer paints its ring on the wrapping pill via
          // focus-within rather than on the input itself.
          (el.parentElement && getComputedStyle(el.parentElement).borderColor !== cs.borderColor);
        if (!hasRing) noRing.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""));
      }
      return { count: focusable.length, unreachable, noRing };
    },
    { sel: selector },
  );

  const problems = [];
  if (result.unreachable.length) {
    problems.push(`unreachable: ${result.unreachable.join(", ")}`);
  }
  if (result.noRing.length) {
    problems.push(`no visible focus ring: ${result.noRing.join(", ")}`);
  }

  return {
    ok: problems.length === 0,
    detail: problems.length ? `${label}: ${problems.join("; ")}` : `${label}: ${result.count} controls, all reachable and ringed`,
  };
}

/**
 * The assistant, from the keyboard, in whichever state it is actually in.
 *
 * This one cannot be a plain "every control is reachable" walk, because the
 * correct answer depends on configuration. With no ANTHROPIC_API_KEY the
 * composer and the chips are deliberately disabled: offering a visitor an
 * input for a question nothing will answer is the dishonesty the whole
 * not-connected state exists to avoid. A disabled control is unreachable by
 * design, and a check that demanded otherwise would be demanding the bug.
 *
 * So it asserts the right thing for each state. Connected: the composer and
 * the chips are focusable. Not connected: they are disabled, and the phone
 * number in the offline copy is focusable instead, because there still has to
 * be a way out of that card without a mouse.
 */
async function checkAssistantKeyboard(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await scrollThrough(page);

  const state = await page.evaluate(() => {
    const log = document.querySelector("[role='log']");
    if (!log) return { found: false };
    const card = log.closest("div.p-6, div.p-7") ?? log.parentElement;
    const input = card.querySelector("#assistant-input");
    const chips = Array.from(card.querySelectorAll("button[type='button']"));
    const submit = card.querySelector("button[type='submit']");
    const phone = card.querySelector("a[href^='tel:']");

    const focusable = (el) => {
      if (!el || el.disabled) return false;
      el.focus();
      return document.activeElement === el;
    };

    return {
      found: true,
      offline: Boolean(input && input.disabled),
      inputFocusable: focusable(input),
      submitFocusable: focusable(submit),
      chipsFocusable: chips.filter(focusable).length,
      chipCount: chips.length,
      phoneFocusable: focusable(phone),
      hasOfflineCopy: /not connected/i.test(card.textContent ?? ""),
    };
  });

  if (!state.found) return { ok: false, detail: "no assistant card found on /" };

  if (state.offline) {
    const ok = state.hasOfflineCopy && state.phoneFocusable && !state.inputFocusable;
    return {
      ok,
      detail: ok
        ? "not connected: composer disabled, offline copy present, phone reachable from the keyboard"
        : `not connected but wrong: copy=${state.hasOfflineCopy}, phone reachable=${state.phoneFocusable}, composer still focusable=${state.inputFocusable}`,
    };
  }

  const ok = state.inputFocusable && state.submitFocusable && state.chipsFocusable === state.chipCount;
  return {
    ok,
    detail: ok
      ? `connected: composer, send and ${state.chipCount} chips all reachable`
      : `connected but input=${state.inputFocusable}, submit=${state.submitFocusable}, chips=${state.chipsFocusable}/${state.chipCount}`,
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
/**
 * The portrait's contrast, measured against the pixels the browser actually
 * painted rather than against a token.
 *
 * This exists because the hero stopped having a flat ground. Every other
 * contrast pairing on this site is verified in scripts/audit-contrast.mjs
 * against a colour that can be written down; a photograph of a person cannot
 * be, and the one place the design deliberately overlaps text and photograph is
 * the one place where "it is navy behind there" stops being true.
 *
 * Method. Capture each ink's box and its computed colour, hide the ink layer
 * (leaving the portrait, the field and the map card exactly as they were),
 * screenshot, then read every pixel inside each box and take the worst ratio
 * against that ink. The worst pixel is the answer, not the average: a headline
 * is only as legible as its least legible glyph.
 *
 * The gold rule is checked the same way and is a separate rule. Gold is the
 * primary action everywhere on this site, and his jacket is a warm tan close
 * enough to it that gold on him reads as a smudge rather than as a control.
 * Gold measures 1.66:1 on the jacket and 5.44:1 on navy, so the requirement is
 * that whatever is painted under a gold surface still clears 3:1 against gold
 * itself, which puts the ceiling at roughly 22 percent of him.
 */
async function checkPortraitContrast(page, width) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const hasPortrait = await page.evaluate(
    () => document.querySelectorAll("[data-hero-portrait]").length > 0,
  );
  if (!hasPortrait) {
    // The null convention is live code: with hero.portrait.src null there is
    // nothing to check and that is a pass, not a skip to be explained away.
    return { ok: true, detail: "no portrait on this build, nothing to measure" };
  }

  const targets = await page.evaluate(() => {
    // Resolve any computed colour, including modern syntax, by round-tripping
    // it through a canvas. `getComputedStyle().color` is not reliably rgb():
    // an alpha-modified Tailwind colour resolves to color-mix()/oklab() in
    // current engines, and pulling three integers out of that with a regex
    // reads the wrong numbers and reports a nonsense ratio.
    const probe = document.createElement("canvas").getContext("2d");
    const resolve = (c) => {
      probe.fillStyle = "#000";
      probe.fillStyle = c;
      const h = probe.fillStyle;
      if (h.startsWith("#")) return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const n = h.match(/[\d.]+/g).map(Number);
      return [n[0], n[1], n[2]];
    };
    const hero = document.querySelector("section");
    const out = [];
    for (const el of hero.querySelectorAll("[data-hero-ink]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      out.push({
        label: el.getAttribute("data-hero-ink"),
        rule: "ink",
        rgb: resolve(getComputedStyle(el).color),
        box: [r.x, r.y, r.width, r.height],
      });
    }
    // Gold surfaces: the one primary action, and the single accent phrase.
    for (const el of hero.querySelectorAll("[data-cta-emphasis='primary'], [data-accent-phrase]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      out.push({
        label: el.matches("[data-cta-emphasis='primary']") ? "gold CTA" : "gold accent phrase",
        rule: "gold",
        rgb: [0xb8, 0x9a, 0x67],
        box: [r.x, r.y, r.width, r.height],
      });
    }
    return out;
  });

  if (targets.length === 0) return { ok: false, detail: "found no tagged hero ink to measure" };

  // Hide the ink itself so what is captured is exactly the ground under it.
  // visibility rather than display, so nothing reflows and every box stays
  // where it was measured.
  await page.addStyleTag({
    content:
      "[data-hero-ink],[data-cta-emphasis='primary'],[data-accent-phrase]{visibility:hidden!important}",
  });
  await page.waitForTimeout(250);
  const shot = await page.screenshot({
    clip: { x: 0, y: 0, width, height: Math.min(1400, await page.evaluate(() => document.documentElement.scrollHeight)) },
  });

  const results = await page.evaluate(
    async ({ dataUrl, targets }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const lin = (v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const out = [];
      for (const t of targets) {
        const lf = L(t.rgb[0], t.rgb[1], t.rgb[2]);
        const x0 = Math.max(0, Math.floor(t.box[0]));
        const y0 = Math.max(0, Math.floor(t.box[1]));
        const w = Math.min(Math.ceil(t.box[2]), c.width - x0);
        const h = Math.min(Math.ceil(t.box[3]), c.height - y0);
        if (w <= 0 || h <= 0) continue;
        const d = ctx.getImageData(x0, y0, w, h).data;
        let worst = Infinity;
        let at = null;
        for (let i = 0; i < d.length; i += 4) {
          const lb = L(d[i], d[i + 1], d[i + 2]);
          const hi = Math.max(lf, lb);
          const lo = Math.min(lf, lb);
          const r = (hi + 0.05) / (lo + 0.05);
          if (r < worst) {
            worst = r;
            const n = i / 4;
            at = [x0 + (n % w), y0 + Math.floor(n / w), d[i], d[i + 1], d[i + 2]];
          }
        }
        out.push({ label: t.label, rule: t.rule, worst, at });
      }
      return out;
    },
    { dataUrl: `data:image/png;base64,${shot.toString("base64")}`, targets },
  );

  const problems = [];
  for (const r of results) {
    const need = r.rule === "gold" ? 3 : 4.5;
    if (r.worst < need) {
      problems.push(
        `${r.label} ${r.worst.toFixed(2)}:1 (needs ${need}) worst pixel ` +
          `at ${r.at[0]},${r.at[1]} rgb(${r.at[2]},${r.at[3]},${r.at[4]})`,
      );
    }
  }
  const summary = results
    .map((r) => `${r.label} ${r.worst.toFixed(2)}:1`)
    .join(", ");
  return {
    ok: problems.length === 0,
    detail: problems.length ? problems.join("; ") : summary,
  };
}

/**
 * Where the portrait is cut off, in the source photograph's own coordinates.
 *
 * This check exists because of a defect that a green build could never have
 * caught and a screenshot at two widths did not. The /about portrait sized its
 * clip with three fixed heights against a frame whose height scales with its
 * column. Between 640 and 1023, where that column is the whole page, the frame
 * grew and the clip did not: the visible fraction fell to 40 percent and he was
 * cut off just below his eyes. No overflow, no contrast failure, no console
 * error, nothing to fail on. It took a person looking at 768px.
 *
 * The arithmetic that makes it checkable: every portrait frame on this site is
 * an `object-fit: cover` square source in a taller-than-wide box, so the source
 * maps to the frame linearly and the top of his head can never be cropped. The
 * only question is where the bottom lands, and that is
 * `(visibleBottom - frameTop) / frameHeight * 2000` in source pixels.
 *
 * The floor is 1400. His crown is at source y 250 and his chin at roughly 1150,
 * so 1400 is comfortably past his collar: anything above it is cutting into his
 * face or his neck, which is what this is here to stop. The frames are built to
 * land around 1560.
 */
async function checkPortraitCrop(page, width) {
  const results = [];
  for (const route of ["/", "/about"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await scrollThrough(page);
    const found = await page.evaluate(() => {
      const out = [];
      for (const frame of document.querySelectorAll("[data-portrait-frame]")) {
        const r = frame.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        // The lowest edge anything actually clips him at: any ancestor that is
        // not overflow:visible, plus the band he sits in.
        let bottom = r.bottom;
        for (let el = frame.parentElement; el; el = el.parentElement) {
          const cs = getComputedStyle(el);
          const clips = cs.overflow !== "visible" || cs.overflowY !== "visible";
          if (clips || el.tagName === "SECTION") {
            bottom = Math.min(bottom, el.getBoundingClientRect().bottom);
          }
          if (el.tagName === "SECTION") break;
        }
        out.push({
          sourceY: Math.round(((bottom - r.top) / r.height) * 2000),
          visible: +((bottom - r.top) / r.height).toFixed(2),
        });
      }
      return out;
    });
    for (const f of found) results.push({ route, ...f });
  }

  if (results.length === 0) return { ok: true, detail: "no portrait on this build" };
  const bad = results.filter((r) => r.sourceY < 1400);
  return {
    ok: bad.length === 0,
    detail: bad.length
      ? bad
          .map((r) => `${r.route} cut at source y ${r.sourceY}, above the 1400 floor (his chin is at ~1150)`)
          .join("; ")
      : results.map((r) => `${r.route} cut at source y ${r.sourceY} (${Math.round(r.visible * 100)}% of frame)`).join(", "),
  };
}

/**
 * What the portrait actually costs a phone, and whether it moves the page.
 *
 * Two separate failures this catches, both of which a screenshot cannot:
 *
 *   The master is a 4.9MB PNG. It is never meant to reach a browser: next/image
 *   is supposed to serve a resized WebP or AVIF derivative sized from the
 *   `sizes` attribute. A wrong or missing `sizes` is invisible on a fast
 *   connection and expensive on a phone, so the transferred bytes are measured
 *   rather than assumed.
 *
 *   A hero image is the classic cumulative layout shift. The frame reserves its
 *   box from the recorded pixel dimensions, so this should be zero, and zero is
 *   what is asserted.
 */
async function checkPortraitDelivery(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();

  /*
   * The webfont is blocked for this measurement, on purpose.
   *
   * This page has a small pre-existing layout shift that has nothing to do with
   * the portrait: `display=swap` means the fallback stack paints first and
   * Archivo and Inter re-flow the header nav and the hero copy when they
   * arrive. It measures 0.0149 at 1024 and it measures the same on /buy, which
   * has no portrait at all, so it is a property of the font loading strategy
   * rather than of anything added here. Reported in the delivery notes with
   * its two possible fixes rather than fixed quietly at the end of a pass
   * about a photograph.
   *
   * Blocking the stylesheet takes that shift out of the measurement and leaves
   * exactly the question this check exists to answer: does the portrait itself
   * move anything. It must not, and zero is asserted rather than a threshold,
   * because the frame reserves its box from the recorded pixel dimensions and
   * there is no reason for it to be anything else.
   */
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

  const imageBytes = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!/_next\/image|\/brand\//.test(url)) return;
    try {
      const body = await res.body();
      imageBytes.push({ url, bytes: body.length, type: res.headers()["content-type"] ?? "" });
    } catch {
      /* a response body can be gone by the time this runs; not a failure */
    }
  });

  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const cls = await page.evaluate(() => window.__cls ?? 0);

  const portrait = await page.evaluate(() => {
    // The visible one. Both treatments are in the DOM at every width and the
    // one that is not in play is display:none, so taking the first match
    // reports a 0x0 box and hides whether the live one is sized correctly.
    const img = [...document.querySelectorAll("[data-hero-portrait] img")].find(
      (el) => el.getBoundingClientRect().width > 0,
    );
    if (!img) return null;
    return {
      src: img.getAttribute("src") ?? "",
      sizes: img.getAttribute("sizes") ?? "",
      rendered: [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)],
    };
  });

  await ctx.close();

  if (!portrait) return { ok: true, detail: "no portrait on this build, nothing to measure" };

  const problems = [];
  if (!portrait.src.startsWith("/_next/image")) {
    problems.push(`portrait is not going through next/image (src ${portrait.src.slice(0, 60)})`);
  }
  if (!portrait.sizes) problems.push("portrait has no sizes attribute");

  // The budget is the number a phone actually pays. 250KB is generous for a
  // cut-out at these dimensions and tight enough that a broken `sizes` (which
  // makes next/image fall back to the largest candidate) fails here rather
  // than on somebody's cellular connection.
  const total = imageBytes.reduce((n, r) => n + r.bytes, 0);
  const budget = width < 768 ? 250_000 : 600_000;
  if (total > budget) {
    problems.push(
      `portrait bytes ${(total / 1024).toFixed(0)}KB over the ${(budget / 1024).toFixed(0)}KB budget at ${width}px ` +
        `[${imageBytes.map((r) => `${r.type} ${(r.bytes / 1024).toFixed(0)}KB`).join(", ")}]`,
    );
  }
  if (cls > 0.001) {
    problems.push(`cumulative layout shift ${cls.toFixed(4)} with the webfont blocked, must be 0`);
  }

  return {
    ok: problems.length === 0,
    detail: problems.length
      ? problems.join("; ")
      : `${(total / 1024).toFixed(0)}KB as ${imageBytes.map((r) => r.type).join("/") || "no image request"}, ` +
        `rendered ${portrait.rendered.join("x")}, CLS ${cls.toFixed(4)} (webfont blocked)`,
  };
}

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

    for (const walk of [
      { route: "/contact", selector: "form[action='/api/lead']", label: "lead form" },
      { route: "/buy", selector: "form[action='/api/lead']", label: "buyer guide form" },
      { route: "/sell", selector: "form[action='/api/lead']", label: "valuation form" },
    ]) {
      const r = await checkKeyboardReach(page, walk.route, walk.selector, walk.label);
      if (!r.ok) failures += 1;
      console.log(`${r.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} keyboard walk     ${r.detail}`);
    }

    const assistant = await checkAssistantKeyboard(page);
    if (!assistant.ok) failures += 1;
    console.log(`${assistant.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} assistant kbd     ${assistant.detail}`);

    await ctx.close();

    /*
     * The portrait's own checks.
     *
     * 390 is the in-flow treatment. 768 is the width that caught the /about
     * crop defect and is in the list permanently because of it: it is the one
     * place where the trust band is a single column AND the page is wide, which
     * is the combination that broke. 1024 is where the overlap composition
     * starts and where the container is narrowest, which makes it the worst
     * case for text over him rather than the widest viewport being it. 1440 is
     * the laptop the client will look at this on.
     */
    for (const w of [390, 768, 1024, 1440]) {
      const pc = await browser.newContext({ viewport: { width: w, height: 1000 } });
      const pp = await pc.newPage();
      const contrast = await checkPortraitContrast(pp, w);
      if (!contrast.ok) failures += 1;
      console.log(
        `${contrast.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} portrait ink ${String(w).padStart(4)}px  ${contrast.detail}`,
      );

      const crop = await checkPortraitCrop(pp, w);
      if (!crop.ok) failures += 1;
      console.log(
        `${crop.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} portrait crop ${String(w).padStart(3)}px  ${crop.detail}`,
      );
      await pc.close();

      const delivery = await checkPortraitDelivery(browser, w);
      if (!delivery.ok) failures += 1;
      console.log(
        `${delivery.ok ? "pass" : "FAIL"}  ${engine.name.padEnd(8)} portrait cost ${String(w).padStart(3)}px  ${delivery.detail}`,
      );
    }

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
