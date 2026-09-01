import { site } from "@/lib/content";

/**
 * The signature element.
 *
 * A hand authored map of the seven towns Alex works, plotted from their actual
 * coordinates rather than arranged for looks. It is true only of this client:
 * change the seven towns and the drawing changes, which is the test the doctrine
 * sets for whether a signature element is one.
 *
 * Deliberately no accent color. Gold means "act here" everywhere else on this
 * site, so putting it on decoration would spend the one signal the palette has.
 *
 * Fair housing: this renders place names and relative position, both of which
 * are facts. It carries no characterization of any area and no school or
 * quality claim, and it must stay that way.
 */

type Town = { name: string; lat: number; lon: number; anchor?: boolean };

const TOWNS: Town[] = [
  { name: "Wichita", lat: 37.6872, lon: -97.3301, anchor: true },
  { name: "Maize", lat: 37.7756, lon: -97.467 },
  { name: "Park City", lat: 37.7994, lon: -97.32 },
  { name: "Goddard", lat: 37.6597, lon: -97.5753 },
  { name: "Andover", lat: 37.7142, lon: -97.1353 },
  { name: "Derby", lat: 37.5453, lon: -97.2683 },
  { name: "Rose Hill", lat: 37.5589, lon: -97.1275 },
];

const W = 800;
const H = 500;
const PAD_X = 92;
const PAD_Y = 92;

const lons = TOWNS.map((t) => t.lon);
const lats = TOWNS.map((t) => t.lat);
const minLon = Math.min(...lons);
const maxLon = Math.max(...lons);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);

function project(t: Town) {
  const x = PAD_X + ((t.lon - minLon) / (maxLon - minLon)) * (W - PAD_X * 2);
  const y = PAD_Y + ((maxLat - t.lat) / (maxLat - minLat)) * (H - PAD_Y * 2);
  return { x, y };
}

/** Keeps labels off the edge of the drawing on the outermost towns. */
function labelAnchor(x: number): "start" | "middle" | "end" {
  if (x < W * 0.2) return "start";
  if (x > W * 0.8) return "end";
  return "middle";
}

export function ServiceAreaMap() {
  const anchor = TOWNS.find((t) => t.anchor)!;
  const anchorPos = project(anchor);

  return (
    <figure className="mt-10">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Relative positions of the ${TOWNS.length} towns Alex works: ${site.serviceAreas.join(", ")}. Wichita sits at the center.`}
      >
        {/* Connector lines from the anchor. Line weight only, no fill, so this
            reads as structure rather than decoration competing for attention. */}
        <g stroke="currentColor" className="text-navy/22" strokeWidth={1.25}>
          {TOWNS.filter((t) => !t.anchor).map((t) => {
            const p = project(t);
            return <line key={t.name} x1={anchorPos.x} y1={anchorPos.y} x2={p.x} y2={p.y} />;
          })}
        </g>

        {TOWNS.map((t) => {
          const p = project(t);
          const isAnchor = Boolean(t.anchor);
          const ta = labelAnchor(p.x);
          const dx = ta === "start" ? -1 : ta === "end" ? 1 : 0;
          return (
            <g key={t.name}>
              {isAnchor && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={17}
                  fill="none"
                  stroke="currentColor"
                  className="text-navy/30"
                  strokeWidth={1.25}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isAnchor ? 7 : 4.5}
                fill="currentColor"
                className="text-navy"
              />
              <text
                x={p.x + dx * 2}
                y={p.y - (isAnchor ? 30 : 18)}
                textAnchor={ta}
                fill="currentColor"
                className="text-navy"
                /*
                 * A cream halo painted behind the glyphs, so a connector line
                 * passing under a label does not cut through the word. Stroke
                 * first, fill second, which is what paint-order controls.
                 */
                stroke="#F7F4EE"
                strokeWidth={5}
                paintOrder="stroke"
                strokeLinejoin="round"
                style={{
                  fontSize: isAnchor ? 20 : 17,
                  fontWeight: isAnchor ? 650 : 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {t.name}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="sr-only">
        A diagram placing {site.serviceAreas.join(", ")} in their actual relative
        positions, with Wichita at the center. It shows location only and makes no
        claim about any of these places.
      </figcaption>
    </figure>
  );
}
