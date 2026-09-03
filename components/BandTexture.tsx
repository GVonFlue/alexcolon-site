import { MUNICIPAL_BOUNDARY_PATHS, RIVER_AREA_PATHS, ROAD_PATHS, VIEW_H, VIEW_W } from "@/lib/generated/wichitaMap";

/**
 * The signature texture on dark bands.
 *
 * It is the same geometry the map is drawn from: the Arkansas and the Little
 * Arkansas, I-135, I-235, US-54/Kellogg, K-96 and the Turnpike, and the
 * Wichita city limit, from US Census TIGER/Line shapefiles. Reusing it as a
 * background motif costs nothing (the paths are already in the bundle for the
 * map) and it is the cheapest way to make the page read as being about this
 * city rather than as a clean template that could belong to any agent
 * anywhere.
 *
 * Two and a half percent opacity. It must never be legible as a map, because
 * a legible map behind body copy is a decoration competing with the content
 * and it would also duplicate the real map's own job. The test is that
 * removing it should make the band look flatter without anyone being able to
 * say what was taken away.
 *
 * Fair housing: this draws rivers, roads and one municipal boundary, which are
 * facts about location. It carries no place names, no shading that varies by
 * area, and no characterization of anywhere. The boundary is a single closed
 * stroke at one uniform opacity, the same constraint the real map is held to.
 *
 * Purely decorative, so it is aria-hidden and carries no title or label. It is
 * also pointer-events-none, so it can never intercept a click meant for the
 * content sitting above it.
 */
export function BandTexture({
  variant = "rivers",
}: {
  /** Which layers to draw. Each route's hero picks a different one. */
  variant?: "rivers" | "roads" | "boundary" | "full";
}) {
  const showRivers = variant === "rivers" || variant === "full";
  const showRoads = variant === "roads" || variant === "full";
  const showBoundary = variant === "boundary" || variant === "full";

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-cream"
    >
      {showRivers &&
        RIVER_AREA_PATHS.map((d, i) => (
          <path key={`t-r${i}`} d={d} fill="currentColor" fillOpacity={0.03} stroke="currentColor" strokeOpacity={0.05} strokeWidth={1.6} />
        ))}
      {showRoads &&
        ROAD_PATHS.map((r) => (
          <path key={`t-h${r.id}`} d={r.d} fill="none" stroke="currentColor" strokeOpacity={0.045} strokeWidth={2} strokeLinecap="round" />
        ))}
      {showBoundary &&
        MUNICIPAL_BOUNDARY_PATHS.map((d, i) => (
          <path key={`t-b${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={1.4} />
        ))}
    </svg>
  );
}
