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
  navyDeep: "#0F1D28",
  navyGlow: "#1C3350",
  cream: "#F7F4EE",
  ink: "#292D32",
  gold: "#B89A67",
  goldInk: "#786443",
  paper: "#FFFFFF",
  subtle: "#5A6068",
  dim: "#C9CDD2",
  line: "#E2DCD0",
  field: "#8A8177",
  negative: "#8C3B2E",
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function toRgb(hexOrRgb) {
  return Array.isArray(hexOrRgb) ? hexOrRgb : hexToRgb(hexOrRgb);
}

/** Composite a foreground at alpha over an opaque background. Both sides
 * accept a hex string or an already-composited rgb array, so a color that is
 * itself painted over another translucent color (the header hairline over
 * the translucent header) can be composited twice. */
function composite(fg, alpha, bg) {
  const fgRgb = toRgb(fg);
  const bgRgb = toRgb(bg);
  return fgRgb.map((c, i) => Math.round(c * alpha + bgRgb[i] * (1 - alpha)));
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
  // Semantic, used only where a computed figure comes out negative.
  { what: "negative figure on the white card", fg: T.negative, bg: T.paper, kind: "text" },
  { what: "negative figure on cream", fg: T.negative, bg: T.cream, kind: "text" },
  // gold-ink: the one exception to "gold is a fill, never type." Verified
  // separately before it was used anywhere. Checked against both ends of the
  // wash gradient (cream and paper), which bounds every point between them.
  { what: "accent phrase in a headline, gold-ink on cream", fg: T.goldInk, bg: T.cream, kind: "text" },
  { what: "accent phrase in a headline, gold-ink on white", fg: T.goldInk, bg: T.paper, kind: "text" },
  // navy-deep: the dark end of the navyWash gradient tone. Flat navy is
  // already verified above and is the lighter, lower-contrast end of this
  // same gradient, so these are added for the record rather than out of
  // doubt: contrast can only be higher against the darker end.
  { what: "headings on navy-deep, the dark end of navyWash", fg: T.cream, bg: T.navyDeep, kind: "text" },
  { what: "supporting copy on navy-deep", fg: T.dim, bg: T.navyDeep, kind: "text" },
  // navy-glow: the brightest stop of the navyWash radial gradient. A headline
  // (including the one accent phrase, in gold) can land here, not only at the
  // gradient's darker edges, so this is the real worst case for anything
  // painted on a dark section, not navy-deep.
  { what: "headings on navy-glow, the brightest point of navyWash", fg: T.cream, bg: T.navyGlow, kind: "text" },
  { what: "supporting copy on navy-glow", fg: T.dim, bg: T.navyGlow, kind: "text" },
  { what: "accent phrase in a dark headline, gold on navy-glow", fg: T.gold, bg: T.navyGlow, kind: "text" },
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
  // The assistant card's interior, redrawn from three stacked bordered boxes
  // (a form's own visual grammar) to one recessed transcript well, free
  // floating chips and a pill composer. The well is cream at 70 percent over
  // the card's white paper, not flat cream, so it is checked as its own
  // composited ground rather than assumed to fall inside the already-verified
  // cream/paper pair.
  {
    what: "assistant transcript well, cream at 70 percent over the white card",
    fg: composite(T.cream, 0.7, T.paper),
    bg: T.paper,
    kind: "ui",
    decorative: true,
  },
  {
    what: "body copy in the assistant transcript well",
    fg: T.ink,
    bg: composite(T.cream, 0.7, T.paper),
    kind: "text",
  },
  {
    what: "supporting copy (turn labels) in the assistant transcript well",
    fg: T.subtle,
    bg: composite(T.cream, 0.7, T.paper),
    kind: "text",
  },
  {
    what: "assistant chip and composer borders on the white card, navy at 55 percent",
    fg: composite(T.navy, 0.55, T.paper),
    bg: T.paper,
    kind: "ui",
  },
  { what: "composer focus border on the white card", fg: T.navy, bg: T.paper, kind: "ui" },
  {
    what: "secondary button border on navy-glow, cream at 50 percent",
    fg: composite(T.cream, 0.5, T.navyGlow),
    bg: T.navyGlow,
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
    what: "map marks, cream at 60 percent on navy-glow",
    fg: composite(T.cream, 0.6, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
  },
  {
    what: "map marks, cream at 75 percent on navy-glow",
    fg: composite(T.cream, 0.75, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
  },
  {
    what: "map connector lines, cream at 25 percent on navy-glow",
    fg: composite(T.cream, 0.25, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  {
    what: "map connector line, selected, cream at 70 percent on navy-glow",
    fg: composite(T.cream, 0.7, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  // Real geometry, added when the map was rebuilt from US Census TIGER/Line
  // data instead of an abstract dot diagram. Same worst-case ground as the
  // town marks above: navy-glow, the brightest point of the dark wash.
  {
    what: "river channel fill, cream at 30 percent on navy-glow",
    fg: composite(T.cream, 0.3, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  {
    what: "river stroke (channel outline and centerlines), cream at 55 percent on navy-glow",
    fg: composite(T.cream, 0.55, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
  },
  {
    what: "highway stroke (I-135/I-235/US-54/K-96/Turnpike), cream at 40 percent on navy-glow",
    fg: composite(T.cream, 0.4, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
  },
  {
    what: "municipal boundary stroke, cream at 22 percent on navy-glow",
    fg: composite(T.cream, 0.22, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  // The downtown skyline silhouette and the town-mark hover halo, both added
  // this pass. Same worst-case ground, navy-glow.
  {
    what: "skyline building fill, cream at 30 percent on navy-glow",
    fg: composite(T.cream, 0.3, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  {
    what: "Keeper of the Plains fill and stroke, cream at 50 percent on navy-glow",
    fg: composite(T.cream, 0.5, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  {
    what: "town mark hover halo, cream at 40 percent on navy-glow",
    fg: composite(T.cream, 0.4, T.navyGlow),
    bg: T.navyGlow,
    kind: "ui",
    decorative: true,
  },
  // The assistant's capability chips, now centered above the card on the
  // navyWash section instead of inside it, and its card header bar. Worst
  // case for the chips is navy-glow, the same brightest dark stop; the
  // header bar is a near-invisible navy tint over the card's white paper.
  {
    what: "assistant capability chip label, dim on cream-at-6-percent over navy-glow",
    fg: T.dim,
    bg: composite(T.cream, 0.06, T.navyGlow),
    kind: "text",
  },
  {
    what: "assistant card header bar, navy at 2 percent over the white card",
    fg: composite(T.navy, 0.02, T.paper),
    bg: T.paper,
    kind: "ui",
    decorative: true,
  },
  // The Split component's vertical rule, shown under a heading with no
  // aside so the short column is never left floating over empty space (see
  // ui.tsx). currentColor on the light grounds every no-aside call site
  // (prose, lossAversion, tool, faq) actually uses; checked against ink,
  // the darkest of those, which bounds every lighter one.
  {
    what: "Split's filler rule, ink at 20 percent on cream",
    fg: composite(T.ink, 0.2, T.cream),
    bg: T.cream,
    kind: "ui",
    decorative: true,
  },
  // The contact strip's tel link underline.
  {
    what: "contact strip tel underline, navy at 30 percent on cream",
    fg: composite(T.navy, 0.3, T.cream),
    bg: T.cream,
    kind: "ui",
    decorative: true,
  },
  // The sticky header, moved from a cream bar to translucent navy with a
  // backdrop blur so it reads as part of this dark-first page instead of a
  // seam across the top of it. Composited twice: navy at 92 percent over
  // whatever is scrolling underneath. Checked against the two realistic
  // extremes, the cream page ground and the one gold CTA that can pass
  // beneath it, both of which only make the header itself darker and raise
  // contrast further, so these are the worst real cases, not arbitrary
  // extra checks.
  {
    what: "nav links and wordmark, cream on the translucent header over the cream page",
    fg: T.cream,
    bg: composite(T.navy, 0.92, T.cream),
    kind: "text",
  },
  {
    what: "quiet header text (phone number), dim on the translucent header over the cream page",
    fg: T.dim,
    bg: composite(T.navy, 0.92, T.cream),
    kind: "text",
  },
  {
    what: "nav links, cream on the translucent header over a gold CTA scrolling underneath",
    fg: T.cream,
    bg: composite(T.navy, 0.92, T.gold),
    kind: "text",
  },
  {
    what: "active nav pill, navy on its cream fill",
    fg: T.navy,
    bg: T.cream,
    kind: "text",
  },
  {
    what: "header hairline, cream at 12 percent on the translucent header over the cream page",
    fg: composite(T.cream, 0.12, composite(T.navy, 0.92, T.cream)),
    bg: composite(T.navy, 0.92, T.cream),
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
