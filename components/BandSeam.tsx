import { RIVER_LINE_PATHS } from "@/lib/generated/wichitaMap";

/**
 * The seam between a light band and a dark one.
 *
 * The page was a stack. Every boundary was a straight horizontal edge, and a
 * page whose sections only ever butt against each other reads as assembled
 * rather than composed, however good each section is on its own.
 *
 * The obvious fixes are an angled or curved clip-path, and both were rejected.
 * A diagonal edge is a 2019 template tell, it fights the map's own geometry,
 * and it forces awkward padding to stop content colliding with the slope. A
 * soft gradient fade is worse: the alternating light and dark rhythm is the
 * single biggest lever this design has, and blurring the boundary is throwing
 * that away to hide the fact that it exists.
 *
 * So the edge stays crisp and something crosses it instead. The Arkansas river,
 * the same TIGER/Line centerline the map is drawn from, rotated to run
 * horizontally and stroked across the boundary: dark ink where it lies on the
 * light band, cream where it lies on the dark one. One continuous line, two
 * inks, and the eye reads continuity across a hard edge, which is the effect
 * a gradient was going to fake.
 *
 * It is the river that already means something on this site rather than a
 * decorative squiggle, which is the whole argument for it over a wave shape
 * from a CSS generator.
 *
 * Implementation. Two clipped halves stacked on the boundary, each containing
 * the same SVG at the same size and position, so the path lines up exactly
 * across the join. Both halves are pointer-events:none and aria-hidden: this
 * is texture, it carries no information, and it must never take a click from
 * the band underneath.
 */

/**
 * The long Arkansas centerline, rotated a quarter turn so its meander runs
 * across the page instead of down it. The viewBox frames the rotated path:
 * after rotate(-90) a point (x, y) lands at (y, -x), so the path's own
 * x 397.2..489.6 by y -56.8..205.7 becomes x -56.8..205.7 by y -489.6..-397.2.
 */
const RIVER = RIVER_LINE_PATHS[1];
const VIEW = "-56.8 -489.6 262.5 92.4";

export function BandSeam({
  /**
   * Which way the boundary runs. "intoDark" is a light band above and a dark
   * band below, which is the common case; "intoLight" is the reverse.
   */
  direction = "intoDark",
  className = "",
}: {
  direction?: "intoDark" | "intoLight";
  className?: string;
}) {
  const above = direction === "intoDark" ? "text-navy" : "text-cream";
  const below = direction === "intoDark" ? "text-cream" : "text-navy";
  // Ink on a light ground reads far heavier than the same value reversed, so
  // the two halves are not the same opacity. Matched by eye against each other
  // rather than set to one number for tidiness.
  const aboveOpacity = direction === "intoDark" ? 0.1 : 0.14;
  const belowOpacity = direction === "intoDark" ? 0.14 : 0.1;

  const river = (tone: string, opacity: number, shift: string) => (
    <div className={`absolute inset-x-0 ${shift} h-16 overflow-hidden`}>
      <svg
        viewBox={VIEW}
        preserveAspectRatio="none"
        className={`absolute inset-x-0 ${shift === "top-0" ? "top-0" : "-top-16"} h-32 w-full ${tone}`}
      >
        <g transform="rotate(-90)">
          <path
            d={RIVER}
            fill="none"
            stroke="currentColor"
            strokeOpacity={opacity}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 -top-16 z-20 h-32 ${className}`}
    >
      {river(above, aboveOpacity, "top-0")}
      {river(below, belowOpacity, "top-16")}
    </div>
  );
}
