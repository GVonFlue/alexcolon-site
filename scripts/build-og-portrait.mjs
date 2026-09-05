#!/usr/bin/env node
/**
 * Generate the open graph card's own crop of Alex from the master portrait.
 *
 * Run:  node scripts/build-og-portrait.mjs
 * Out:  public/brand/alex-portrait-og.png
 *
 * WHY A SEPARATE FILE RATHER THAN THE MASTER.
 *
 * The card is drawn by Satori (`next/og`), which is not a browser. It has no
 * `mask-image`, so the leftward fade that stops the crop reading as a sticker
 * everywhere else on the site cannot be done in the card's own markup. It is
 * baked into the alpha channel here instead. Satori also has to decode whatever
 * it is handed as a base64 data URI at build time, and handing it the 4.9MB
 * master five times, once per route variant, to draw a 560px box is wasteful in
 * the one place where the file is genuinely embedded rather than optimised on
 * delivery. This derivative is about a twentieth of the size and is exactly the
 * pixels the card paints.
 *
 * THE CROP, MEASURED AGAINST THE MASTER.
 *
 * The master is 2000x2000 with the subject at x 15..1999 by y 250..1999. This
 * takes x 149..1851 by y 100..2000, which is a chest-up window whose left and
 * right edges both cut through his shoulders. That is deliberate and it is the
 * same technique the hero uses: the right cut bleeds off the card, the left cut
 * is dissolved by the baked ramp, so neither is ever seen. Nothing is cut off
 * the top of his head at any size, because the crop's top edge sits 150px above
 * his crown.
 *
 * Rendered at exactly the box it is drawn into, 560x625, so Satori resamples
 * nothing. There is no retina factor to allow for: an OG card is rasterised
 * once at 1200x630 and there is no second density to serve. Changing the
 * placement in lib/og.tsx means changing OUT_SIZE here and re-running this.
 *
 * Playwright's Chromium does the decode, the resample and the encode. It is
 * already a devDependency of this project and nothing new is installed for it.
 * This script is not part of `npm run build`: the output is committed, the same
 * arrangement scripts/build-map-geometry.mjs already uses, so a deploy never
 * depends on a browser binary being present.
 */
import { chromium } from "playwright";
import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/brand/alex-portrait.png");
const OUT = join(ROOT, "public/brand/alex-portrait-og.png");

/** Source window, in master pixels. */
const CROP = { x: 149, y: 100, w: 1702, h: 1900 };
/** Output size. Exactly the box lib/og.tsx draws it into. */
const OUT_SIZE = { w: 560, h: 625 };
/**
 * Where the baked leftward fade runs, as a fraction of the output width.
 * Held fully transparent to the first stop, then linear to fully opaque.
 */
const FADE = { from: 0.0, to: 0.3 };

const buf = readFileSync(SRC);
const server = http.createServer((req, res) => {
  if (req.url.endsWith(".png")) {
    res.writeHead(200, { "content-type": "image/png" });
    res.end(buf);
  } else {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><title>og-portrait</title><body></body>");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/`);

const dataUrl = await page.evaluate(
  async ({ url, CROP, OUT_SIZE, FADE }) => {
    const img = new Image();
    img.src = url;
    await img.decode();

    const c = document.createElement("canvas");
    c.width = OUT_SIZE.w;
    c.height = OUT_SIZE.h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, OUT_SIZE.w, OUT_SIZE.h);

    // Multiply the existing alpha by the ramp rather than replacing it, so the
    // cut-out's own matte survives. Replacing it would give every transparent
    // pixel right of the ramp a solid alpha and paint a navy rectangle.
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    const from = FADE.from * c.width;
    const to = FADE.to * c.width;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const k = x <= from ? 0 : x >= to ? 1 : (x - from) / (to - from);
        if (k < 1) {
          const i = (y * c.width + x) * 4 + 3;
          d[i] = Math.round(d[i] * k);
        }
      }
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL("image/png");
  },
  { url: `http://127.0.0.1:${port}/img.png`, CROP, OUT_SIZE, FADE },
);

await browser.close();
server.close();

const out = Buffer.from(dataUrl.split(",")[1], "base64");
writeFileSync(OUT, out);
console.log(
  `Wrote ${OUT.replace(ROOT + "/", "")}  ${OUT_SIZE.w}x${OUT_SIZE.h}  ${(out.length / 1024).toFixed(0)} KB`,
);
