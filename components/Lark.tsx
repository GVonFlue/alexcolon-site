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

  /*
   * WHAT CHANGED, AND WHY.
   *
   * The first version was thirteen flat shapes: two tail wedges, a body
   * outline, a wing, a head circle, a beak triangle, an eye dot, three feather
   * ticks and two legs. Every one of them was a correct piece of a meadowlark,
   * and together they read as a clip-art bird, because a bird is not a
   * silhouette with a lighter shape laid on top of it. It is a rounded volume
   * with light falling across it.
   *
   * So this version is built out of light rather than out of parts:
   *
   *   - Three gradients do the modelling. The back darkens away from the
   *     light, the breast has a hot centre falling off to a shaded underside,
   *     and the head carries its own smaller falloff so it reads as a sphere
   *     sitting on a body rather than a circle overlapping an oval.
   *   - The wing is a layered covert group, three stacked feather plates with
   *     their own edge highlight, instead of one grey blob.
   *   - The tail is five separate feathers fanned on slightly different
   *     angles. Real tails are fanned; two wedges read as a spike.
   *   - There is a rim light down the back edge, which is the single cheapest
   *     thing that makes a flat shape look three dimensional.
   *   - The chest V, which is what identifies the species, is now a stroked
   *     path with a soft inner shadow rather than a filled triangle.
   *
   * Everything is still deterministic, still one inline SVG, still no library
   * and no raster, and still only navy, cream, gold and the two documented
   * blends. The gradients interpolate BETWEEN those colours; they do not add
   * new ones.
   *
   * Satori, which renders the OG card, ignores <filter> entirely but does
   * honour linearGradient and radialGradient. So all of the modelling here is
   * gradients, and the only filter is the one soft shadow, which degrades to
   * nothing rather than to something wrong.
   */

  /* Five tail feathers, fanned. The jitter is small and seeded: enough that the
     fan is not mechanical, never enough to look broken. */
  const tail = [0, 1, 2, 3, 4].map((i) => ({
    rot: -14 + i * 7 + (next() - 0.5) * 2.2,
    len: 17 + (i === 2 ? 3 : 0) + (next() - 0.5) * 1.6,
  }));

  return (
    <>
      <defs>
        {/* The back: lit from upper left, falling to shadow at the lower right. */}
        <linearGradient id={`${idPrefix}-back`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#6E6752" />
          <stop offset="55%" stopColor={C.back} />
          <stop offset="100%" stopColor="#3B3A31" />
        </linearGradient>

        {/* The breast: a hot centre, because gold reads as metal only when it
            has a highlight and a shade rather than one flat value. */}
        <radialGradient id={`${idPrefix}-breast`} cx="0.42" cy="0.34" r="0.78">
          <stop offset="0%" stopColor="#E4CFA4" />
          <stop offset="45%" stopColor={C.breast} />
          <stop offset="100%" stopColor="#8E7748" />
        </radialGradient>

        {/* The head, its own falloff so it sits as a sphere on the body. */}
        <radialGradient id={`${idPrefix}-head`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#736B54" />
          <stop offset="60%" stopColor={C.back} />
          <stop offset="100%" stopColor="#33332C" />
        </radialGradient>

        {/* Wing coverts, darker than the back so the wing separates. */}
        <linearGradient id={`${idPrefix}-wing`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#4A4A41" />
          <stop offset="100%" stopColor="#2E312E" />
        </linearGradient>

        <filter id={`${idPrefix}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* ---- tail, first so the body overlaps its root ---- */}
      <g className="lark-tail" style={{ transformOrigin: "44px 40px" }}>
        {tail.map((t, i) => (
          <g key={i} transform={`rotate(${t.rot} 44 40)`}>
            <path
              d={`M44 38 L${44 + t.len} ${41 + t.len * 0.16} L${43 + t.len} ${45 + t.len * 0.16} L43 42 Z`}
              fill={i % 2 === 0 ? C.wing : "#454438"}
            />
          </g>
        ))}
      </g>

      {/* ---- the body: one rounded volume, gradient modelled ---- */}
      <path
        d="M44 41
           C41 30 33 22 25 22
           C16 22 11 29 11 37
           C11 45 17 51 26 51
           C34 51 41 48 44 41 Z"
        fill={`url(#${idPrefix}-back)`}
      />

      {/* Rim light down the back edge. One stroke, and it is most of why the
          body stops looking like a sticker. */}
      <path
        d="M25 22 C16 22 11 29 11 37"
        fill="none"
        stroke="#8E856A"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* ---- breast, overlapping the body's lower left ---- */}
      <path
        d="M12 37
           C12 45 18 51 26 51
           C31 51 35 49 38 45
           C33 44 26 41 21 36
           C18 33 14 33 12 37 Z"
        fill={`url(#${idPrefix}-breast)`}
      />

      {/* The chest V. The marking that identifies a meadowlark, stroked rather
          than filled so it keeps its shape when the whole mark is 20px wide. */}
      <path
        d="M18 40 L23 46 L28 39"
        fill="none"
        stroke={C.navy}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 40 L23 46 L28 39"
        fill="none"
        stroke="#000"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.28"
        filter={`url(#${idPrefix}-soft)`}
      />

      {/* ---- wing: three stacked coverts, each with its own top edge ---- */}
      <g className="lark-wing" style={{ transformOrigin: "30px 34px" }}>
        <path
          d="M31 30 C36 31 40 35 41 40 C37 42 31 41 27 37 C25 34 27 30 31 30 Z"
          fill={`url(#${idPrefix}-wing)`}
        />
        <path
          d="M31 30 C36 31 40 35 41 40"
          fill="none"
          stroke="#6E6752"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M30 34 C34 35 37 38 38 41"
          fill="none"
          stroke="#5B5544"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M29 37 C32 38 35 40 36 42"
          fill="none"
          stroke="#5B5544"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.4"
        />
      </g>

      {/* ---- head ---- */}
      <g className="lark-head" style={{ transformOrigin: "22px 26px" }}>
        <circle cx="21" cy="25" r="9.4" fill={`url(#${idPrefix}-head)`} />

        {/* Crown stripe and eyebrow. The meadowlark's face is striped, and two
            strokes is the difference between a bird and a brown ball. */}
        <path
          d="M14 20 C17 17 22 16 27 18"
          fill="none"
          stroke="#2B2C26"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M13 25 C16 23 20 22 25 23"
          fill="none"
          stroke="#D8C9A8"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Throat, gold running up under the beak. */}
        <path
          d="M13 29 C16 31 20 32 24 31 C21 34 15 34 13 29 Z"
          fill={C.breast}
          opacity="0.9"
        />

        {/* Beak: two planes, upper and lower, so it has an edge rather than
            being one flat triangle. */}
        <path d="M12 25 L2 27 L12 29 Z" fill="#C7B98F" />
        <path d="M12 27 L2 27 L12 29 Z" fill="#8E7748" />

        {/* Eye, with a catchlight. The catchlight is two pixels and it is the
            difference between alive and taxidermy. */}
        <circle cx="18.4" cy="24.2" r="2.5" fill="#14150F" />
        <circle cx="17.6" cy="23.4" r="0.85" fill={C.cream} opacity="0.95" />
      </g>

      {/* ---- legs ---- */}
      <g stroke="#8E7748" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <path d="M22 51 L21 57" />
        <path d="M29 50 L29 57" />
        <path d="M21 57 L18 58 M21 57 L24 58" />
        <path d="M29 57 L26 58 M29 57 L32 58" />
      </g>
    </>
  );
}

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

/**
 * Lark, perched on a point inside an existing SVG.
 *
 * This is the moment that ties the site's two signature elements together: the
 * map is the thing that is true only of this client, the assistant is the thing
 * Alex asked for at intake, and until now they had nothing to do with each
 * other. Selecting a town lands the bird on that town's mark.
 *
 * Rendered as a `<g>` rather than a nested `<svg>` so it inherits the parent's
 * coordinate system directly and cannot introduce a second viewport. The
 * transform puts the bird's feet, which sit at (32, 56) in its own 64 unit box,
 * on the point given, then lifts it by the mark's radius so it stands on top of
 * the dot instead of inside it.
 *
 * Under reduced motion the blanket query in globals.css zeroes every keyframe,
 * and because all four of Lark's animations begin and end on the resting pose,
 * what is left is a bird perched naturally and completely still.
 */
export function LarkPerch({
  x,
  y,
  size = 52,
  lift = 10,
  state = "idle",
  seed = "perch",
}: {
  x: number;
  y: number;
  size?: number;
  /** Distance above the point to stand, usually the mark's radius. */
  lift?: number;
  state?: LarkState;
  seed?: string;
}) {
  const s = size / 64;
  const phase = (hash(seed) % 1700) / 1000;
  const idPrefix = `perch-${hash(seed).toString(36)}`;

  return (
    <g
      aria-hidden="true"
      className={`lark lark-${state}`}
      style={{ ["--lark-phase" as string]: `-${phase.toFixed(3)}s` }}
      transform={`translate(${x - 32 * s} ${y - 56 * s - lift}) scale(${s})`}
    >
      <g className="lark-body" style={{ transformOrigin: "32px 34px" }}>
        <LarkDrawing seed={seed} idPrefix={idPrefix} />
      </g>
    </g>
  );
}
