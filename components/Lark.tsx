/**
 * Lark, the assistant's mascot.
 *
 * A western meadowlark: the Kansas state bird, gold breast over a warm brown
 * back, which is Alex's own two colors mixed rather than a new hue introduced
 * for a character. Every fill in here is either navy, cream, gold, or a
 * measured blend of navy and gold, so the bird cannot pull the palette
 * anywhere the rest of the site does not already go.
 *
 * It is a bird, which is the rule that matters. The README's own constraint is
 * that the assistant can never be mistaken for Alex, and a species of bird
 * cannot be. It also sidesteps every cliche Alex named at intake: no keys, no
 * doors, no handshakes, no house outline.
 *
 * Inline SVG, no library, no raster asset, so it inherits currentColor, scales
 * to any size, costs no network request and needs no alt text pipeline.
 *
 * DETERMINISM. Nothing here calls Math.random or reads a clock. The small
 * per-instance variation (feather offsets, the phase each animation starts on)
 * comes from `hash(seed)` over a caller-supplied string, so the server and the
 * client render byte-identical markup and React never reports a hydration
 * mismatch. This is the same approach as the Dwell SidebarArt.
 *
 * The one full-strength use of gold that is not a call to action on this site.
 * Recorded deliberately rather than quietly: the palette rule is that gold
 * means "act here", and a gold-breasted bird spends a little of that signal.
 * It is accepted here because the breast is the identifying feature of the
 * species (a champagne tint reads as a sparrow), the mark never appears in a
 * button-shaped surface, and it is painted at 28px or smaller everywhere it
 * is used except the OG card.
 */

export type LarkState = "idle" | "thinking" | "answering" | "disconnected";

/** Deterministic 32-bit string hash. Same input, same output, every runtime. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32, seeded from the hash. Returns a stable sequence in [0, 1). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The palette, as literal hex rather than CSS variables, because this same
 * geometry is rendered by Satori for the OG card, and Satori resolves no
 * custom properties. Both blends are gold composited over navy-deep at a
 * fixed alpha, computed once and written down:
 *
 *   back  = gold #B89A67 at 45% over navy-deep #0F1D28  ->  #5B5544
 *   wing  = gold #B89A67 at 25% over navy-deep #0F1D28  ->  #393C38
 */
const C = {
  back: "#5B5544",
  wing: "#393C38",
  breast: "#B89A67",
  navy: "#172A3A",
  cream: "#F7F4EE",
} as const;

/**
 * The drawing itself, with no animation and no state. Shared by the animated
 * component and by the OG card, so the bird on a link preview is the same bird
 * that appears on the page rather than a second drawing that can drift.
 *
 * Perched three-quarter view facing left: tail low and right, head up and
 * left, breast toward the viewer. The meadowlark's black chest V is the
 * marking that identifies the species at a glance, so it is drawn in navy even
 * at small sizes where the feather detail disappears.
 */
export function LarkDrawing({
  seed = "lark",
  idPrefix,
}: {
  seed?: string;
  idPrefix: string;
}) {
  const next = rng(hash(seed));
  // Three back feather ticks, jittered a little so the bird is not perfectly
  // symmetrical. Deterministic: same seed, same three offsets, always.
  const feathers = [0, 1, 2].map((i) => ({
    x: 34 + i * 4.4 + (next() - 0.5) * 1.4,
    y: 20 + i * 2.4 + (next() - 0.5) * 1.2,
    len: 5.0 + next() * 1.6,
  }));

  return (
    <>
      {/* Tail first, so the body overlaps its root. Two feathers rather than
          one wedge, which is what stops it reading as a dark spike. */}
      <g className="lark-tail" style={{ transformOrigin: "45px 40px" }}>
        <path d="M43 36 L60 46 L58 51 L42 43 Z" fill={C.wing} />
        <path d="M43 39 L57 50 L54 53 L41 45 Z" fill={C.back} opacity="0.85" />
      </g>

      {/* Back and body, one silhouette, facing left. */}
      <path
        d="M17 30 C16 19, 25 11, 33 13 C43 14, 50 22, 50 33 C50 43, 42 50, 32 50 C22 50, 17 41, 17 30 Z"
        fill={C.back}
      />

      {/*
        The breast. The identifying feature of a western meadowlark, so it is
        the largest single area of colour on the bird rather than a patch: at
        44px in the assistant header there is only room for one thing to read,
        and this is it.
      */}
      <path
        d="M17 30 C17 41, 22 50, 32 50 C36 44, 36 30, 30 18 C23 17, 17 22, 17 30 Z"
        fill={C.breast}
      />

      {/* The chest V, the other field mark. Navy, and it survives at 24px. */}
      <path
        d="M22 30 L26.5 37 L31 29"
        fill="none"
        stroke={C.navy}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Back feather ticks, jittered from the seed. */}
      {feathers.map((f, i) => (
        <line
          key={i}
          x1={f.x}
          y1={f.y}
          x2={f.x + f.len * 0.5}
          y2={f.y + f.len}
          stroke={C.wing}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}

      {/* Wing. Kept high and to the back so it never covers the breast. */}
      <g className="lark-wing" style={{ transformOrigin: "36px 27px" }}>
        <path d="M35 24 C43 25, 49 30, 48 38 C43 41, 37 37, 35 30 Z" fill={C.wing} />
        <path
          d="M38 29 C42 30, 45 32, 46 36"
          fill="none"
          stroke={C.back}
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      {/* Head group: the tilt pivots at the base of the neck. */}
      <g className="lark-head" style={{ transformOrigin: "28px 20px" }}>
        <path
          d="M16 22 C16 13, 24 9, 31 12 C35 16, 35 23, 31 27 C24 29, 17 27, 16 22 Z"
          fill={C.back}
        />
        {/* A little gold carries up onto the throat, the way it does on the
            real bird, so the head is not a separate brown mass. */}
        <path d="M17 25 C20 28, 26 29, 30 27 C29 24, 26 22, 21 22 Z" fill={C.breast} />
        {/* Eyebrow stripe, cream. */}
        <path
          d="M17 17 C21 15, 26 15, 30 17"
          fill="none"
          stroke={C.cream}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Beak. Long, straight and sharp, which is what a meadowlark has and
            what separates the silhouette from a generic songbird. */}
        <path d="M16 20 L4 22.5 L16 24.5 Z" fill={C.cream} opacity="0.92" />
        {/* Eye. Scales to nothing on the Y axis to blink. */}
        <circle
          cx="22"
          cy="20"
          r="2.1"
          fill={C.navy}
          className="lark-eye"
          style={{ transformOrigin: "22px 20px" }}
        />
      </g>

      {/* Feet. Two ticks, enough to read as perched rather than floating. */}
      <path
        d="M28 50 L28 56 M25 56 L32 56 M36 49 L37 55 M34 55 L41 55"
        stroke={C.wing}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
        id={`${idPrefix}-feet`}
      />
    </>
  );
}

/**
 * The animated component. State drives a class, the class drives keyframes in
 * globals.css, and `prefers-reduced-motion` zeroes every one of them there, so
 * a visitor who has asked for less motion gets the bird in its natural perched
 * pose rather than an empty box.
 *
 * `disconnected` is the state that earns its keep. With no ANTHROPIC_API_KEY
 * the widget used to sit on "checking" forever and a visitor had no way to
 * tell it was simply unconfigured. Lark perches, stops moving, and dims, and
 * the copy beside it says plainly that it is not connected and gives the
 * phone number.
 */
export function Lark({
  state = "idle",
  size = 44,
  seed = "lark",
  className = "",
  title,
}: {
  state?: LarkState;
  size?: number;
  seed?: string;
  className?: string;
  /** Omit for a decorative mark; the surrounding copy already names it. */
  title?: string;
}) {
  // Deterministic per-seed animation phase, so two Larks on one page are not
  // locked in lockstep but both render identically on the server and client.
  const phase = (hash(seed) % 1700) / 1000;
  const idPrefix = `lark-${hash(seed).toString(36)}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`lark lark-${state} ${className}`}
      style={{ ["--lark-phase" as string]: `-${phase.toFixed(3)}s` }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <g className="lark-body" style={{ transformOrigin: "32px 34px" }}>
        <LarkDrawing seed={seed} idPrefix={idPrefix} />
      </g>
    </svg>
  );
}
