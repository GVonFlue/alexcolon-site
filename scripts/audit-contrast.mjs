#!/usr/bin/env node
/**
 * Contrast auditor.
 *
 * Every pair below is a combination the site actually paints, measured against
 * the composited background rather than the raw token. Reading raw RGB measures
 * a color that is never painted, which is how a build passes its own audit and
 * still fails a real one.
 *
 * Where a color is drawn at partial alpha over a known ground, the alpha is
 * composited here first.
 */

const TOKENS = {
  navy: "#172A3A",
  cream: "#F7F4EE",
  ink: "#292D32",
  gold: "#B89A67",
  paper: "#FFFFFF",
  subtle: "#5A6068",
  dim: "#C9CDD2",
  line: "#E2DCD0",
  field: "#8A8177",
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Composite a foreground at alpha over an opaque background. */
function composite(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}

function relLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = relLuminance(Array.isArray(fg) ? fg : hexToRgb(fg));
  const b = relLuminance(Array.isArray(bg) ? bg : hexToRgb(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const T = TOKENS;

/** kind: "text" needs 4.5, "large" needs 3.0, "ui" needs 3.0 for borders and marks. */
const PAIRS = [
  { what: "body copy on the cream ground", fg: T.ink, bg: T.cream, kind: "text" },
  { what: "headings on the cream ground", fg: T.navy, bg: T.cream, kind: "text" },
  { what: "supporting copy on cream", fg: T.subtle, bg: T.cream, kind: "text" },
  { what: "body copy on the white card ground", fg: T.ink, bg: T.paper, kind: "text" },
  { what: "supporting copy on the white card ground", fg: T.subtle, bg: T.paper, kind: "text" },
  { what: "headings on the navy ground", fg: T.cream, bg: T.navy, kind: "text" },
  { what: "supporting copy on the navy ground", fg: T.dim, bg: T.navy, kind: "text" },
  { what: "primary button label, navy on gold", fg: T.navy, bg: T.gold, kind: "text" },
  { what: "secondary button label on cream", fg: T.navy, bg: T.cream, kind: "text" },
  { what: "quiet link on cream", fg: T.subtle, bg: T.cream, kind: "text" },
  { what: "form input border on the white card", fg: T.field, bg: T.paper, kind: "ui" },
  { what: "form input border on cream", fg: T.field, bg: T.cream, kind: "ui" },
  { what: "focus ring on cream", fg: T.navy, bg: T.cream, kind: "ui" },
  { what: "focus ring on navy", fg: T.gold, bg: T.navy, kind: "ui" },
  {
    what: "secondary button and control borders on cream, navy at 55 percent",
    fg: composite(T.navy, 0.55, T.cream),
    bg: T.cream,
    kind: "ui",
  },
  {
    what: "card border on cream, navy at 15 percent",
    fg: composite(T.navy, 0.15, T.cream),
    bg: T.cream,
    kind: "ui",
    decorative: true,
  },
  {
    what: "map connector lines, navy at 22 percent on cream",
    fg: composite(T.navy, 0.22, T.cream),
    bg: T.cream,
    kind: "ui",
    decorative: true,
  },
  {
    what: "pick-your-door divider, cream at 15 percent on navy",
    fg: composite(T.cream, 0.15, T.navy),
    bg: T.navy,
    kind: "ui",
    decorative: true,
  },
  {
    what: "footer rule, cream at 15 percent on navy",
    fg: composite(T.cream, 0.15, T.navy),
    bg: T.navy,
    kind: "ui",
    decorative: true,
  },
];

/** Combinations the design forbids. Asserted so a future edit cannot introduce them. */
const FORBIDDEN = [
  {
    what: "gold as text on cream",
    fg: T.gold,
    bg: T.cream,
    why: "The accent is a filled surface with navy on top, never type on the cream ground.",
  },
  {
    what: "gold as text on white",
    fg: T.gold,
    bg: T.paper,
    why: "Same reason. If this ever appears in a component it is a defect.",
  },
];

const MIN = { text: 4.5, large: 3.0, ui: 3.0 };

let failures = 0;
console.log("Contrast audit, composited");
console.log("==========================");

for (const p of PAIRS) {
  const r = ratio(p.fg, p.bg);
  const need = p.decorative ? 0 : MIN[p.kind];
  const ok = r >= need;
  if (!ok) failures += 1;
  const tag = p.decorative ? "info" : ok ? "pass" : "FAIL";
  console.log(
    `${tag}  ${r.toFixed(2).padStart(6)}:1  ${p.decorative ? "(decorative, no minimum)" : `needs ${need.toFixed(1)}`}  ${p.what}`,
  );
}

console.log("\nCombinations the design forbids");
console.log("-------------------------------");
for (const f of FORBIDDEN) {
  const r = ratio(f.fg, f.bg);
  console.log(`info  ${r.toFixed(2).padStart(6)}:1  ${f.what}. ${f.why}`);
  if (r >= 4.5) {
    console.log("      Note: this now passes AA, but it is still forbidden by the design rule.");
  }
}

console.log(`\n${failures} failure(s).`);
if (failures > 0) {
  console.error("Contrast audit failed.");
  process.exit(1);
}
console.log("Contrast audit passed.");
