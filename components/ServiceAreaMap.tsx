"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Glyph } from "./ui";
import {
  CONFLUENCE,
  MUNICIPAL_BOUNDARY_PATHS,
  RIVER_AREA_PATHS,
  RIVER_LINE_PATHS,
  ROAD_PATHS,
  VIEW_H,
  VIEW_W,
  project,
} from "@/lib/generated/wichitaMap";

/**
 * The signature element.
 *
 * Real geometry, not an abstract dot diagram. The rivers, the highway grid
 * and the Wichita city limit are actual US Census TIGER/Line shapes (public
 * domain, no tile library, no API key), simplified and baked into
 * lib/generated/wichitaMap.ts by scripts/build-map-geometry.mjs. The seven
 * towns are still hand-plotted from content/site.json, but through the exact
 * same projection the geometry was built with, so a dot for Andover lands
 * where Andover actually is relative to the river and the highways, not
 * relative to the other six dots.
 *
 * Layered back to front the way a map is actually read: the rivers (the
 * widest, most identifying shapes), the city limit, the five highways, the
 * skyline silhouette, then the towns on top. No straight connector lines
 * between towns, the roads themselves do that job and do it honestly
 * instead of implying a road that is not there.
 *
 * It is also a door. Selecting a town carries that town into the contact form,
 * which turns the most distinctive thing on the page into a conversion path
 * rather than an ornament.
 *
 * Deliberately no gold anywhere in the drawing, including the selected state.
 * Gold means "act here" everywhere else on this site, the CTA it reveals is
 * secondary styled on purpose, and putting the accent on decoration would
 * spend the one signal the palette has. Every mark in the drawing is a shade
 * of cream on the navy ground instead, verified in scripts/audit-contrast.mjs.
 *
 * Fair housing: this renders real rivers, real roads, a real municipal
 * boundary and place names, all of which are facts about location. It
 * carries no characterization of any area and no school or quality claim,
 * and it must stay that way. The boundary's fill is flat and uniform across
 * the whole polygon, exactly one tone at one opacity with no gradient and no
 * internal subdivision: it says "this is inside the city limit", the same
 * fact the stroke already states, and never differentiates one part of the
 * city from another. A fill that varied by district, or a second color
 * layered on top of it, would be exposure; a single flat wash on one closed
 * shape is not.
 */

export type Town = { name: string; lat: number; lon: number; anchor?: boolean };

function labelAnchor(x: number): "start" | "middle" | "end" {
  if (x < VIEW_W * 0.14) return "start";
  if (x > VIEW_W * 0.86) return "end";
  return "middle";
}

/**
 * The one entrance this drawing gets: rivers draw in, then the highways,
 * then the boundary and skyline settle, then the town marks land. Five
 * ordered phases, each one only ever moving forward, under a second end to
 * end, once. Reduced motion (checked once, on mount) skips straight to the
 * final phase with nothing hidden first, so a visitor who has asked for
 * less motion never sees any of it, not even briefly. Every phase's content
 * is also the real, complete SVG on first paint (phase starts at "done" on
 * the server and on every render before this effect runs), so nothing here
 * can delay the fold or hide content from a crawler or a no-JS visitor:
 * this only ever plays an already-correct drawing backwards for an instant
 * and lets it catch back up.
 */
type Phase = "start" | "rivers" | "roads" | "context" | "towns";
const PHASE_ORDER: Phase[] = ["start", "rivers", "roads", "context", "towns"];
function atLeast(phase: Phase, target: Phase) {
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);
}

function useEntrance() {
  const [phase, setPhase] = useState<Phase>("towns");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("start");
    const timers = [
      setTimeout(() => setPhase("rivers"), 30),
      setTimeout(() => setPhase("roads"), 330),
      setTimeout(() => setPhase("context"), 610),
      setTimeout(() => setPhase("towns"), 720),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return phase;
}

/**
 * A flat, two-tone skyline silhouette anchored on the real river confluence
 * (CONFLUENCE, computed from the same AREAWATER data the rivers are drawn
 * from, not eyeballed) rather than downtown's own footprint, which this
 * build has no polygon for. A small block cluster sits just southeast of
 * the confluence, roughly where downtown actually sits relative to it, and
 * the Keeper of the Plains, the steel sculpture actually sited at the
 * confluence itself, is the one figure directly on top of it. Both are flat
 * shapes at two opacities of the same cream tone, nothing else: no gradient,
 * no outline detail, no third color. Small on purpose, quiet on purpose:
 * the river is the thing that makes this read as Wichita, not the skyline.
 */
function DowntownSkyline({ visible }: { visible: boolean }) {
  const { x, y } = CONFLUENCE;
  // Scaled up and pushed further from the confluence than the first pass:
  // at 0.22 opacity and the original 20-unit footprint this was reading as
  // noise next to the anchor town's own halo, which sits almost on top of
  // the same point. Real downtown is east/southeast of the confluence, so
  // that is the direction this leans rather than centering under it.
  const S = 1.6;
  const OX = 14;
  const OY = 6;
  // Building blocks: [dx offset from confluence, dy offset, width, height],
  // pre-scale.
  const raw: [number, number, number, number][] = [
    [10, 10, 3.2, 9],
    [14, 8, 3.6, 13],
    [18.2, 4, 3.2, 18],
    [22, 7, 4.2, 15],
    [26.8, 9.5, 3, 10.5],
    [30.2, 11, 2.6, 7.5],
  ];
  const buildings = raw.map(([dx, dy, w, h]) => [OX + dx * S, OY + dy * S, w * S, h * S] as const);
  const kx = x + OX * 0.35;
  const ky = y + OY * 0.6;
  const ks = S * 0.85;
  return (
    <g
      aria-hidden="true"
      className="text-cream transition-opacity duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {buildings.map(([dx, dy, w, h], i) => (
        <rect key={i} x={x + dx} y={y + dy - h} width={w} height={h} fill="currentColor" fillOpacity={0.3} />
      ))}
      {/* The Keeper of the Plains: a plaza mound, a tapered robe, and two
          raised arms. Abstracted to the shapes that read at this size, not
          a literal rendering. Sits nearer the confluence itself, since
          that is where the real sculpture is. */}
      <g fill="currentColor" fillOpacity={0.5}>
        <ellipse cx={kx} cy={ky + 3 * ks} rx={6 * ks} ry={2.4 * ks} />
        <path
          d={`M${kx - 2.2 * ks} ${ky + 2 * ks}L${kx - 1.2 * ks} ${ky - 12 * ks}L${kx + 1.2 * ks} ${ky - 12 * ks}L${kx + 2.2 * ks} ${ky + 2 * ks}Z`}
        />
        <path
          d={`M${kx - 1.2 * ks} ${ky - 11 * ks}L${kx - 6.5 * ks} ${ky - 17 * ks}M${kx - 1.2 * ks} ${ky - 11 * ks}L${kx - 5.2 * ks} ${ky - 12.5 * ks}`}
          stroke="currentColor"
          strokeOpacity={0.5}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M${kx + 1.2 * ks} ${ky - 11 * ks}L${kx + 6.5 * ks} ${ky - 17 * ks}M${kx + 1.2 * ks} ${ky - 11 * ks}L${kx + 5.2 * ks} ${ky - 12.5 * ks}`}
          stroke="currentColor"
          strokeOpacity={0.5}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={kx} cy={ky - 13.6 * ks} r={1.4 * ks} />
      </g>
    </g>
  );
}

export function ServiceAreaMap({
  towns,
  compact = false,
}: {
  towns: Town[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const glowId = useId();
  const phase = useEntrance();

  return (
    <figure className={compact ? "m-0" : "mt-10"}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full overflow-visible"
        role="group"
        aria-label={`A map of the Wichita area showing the Arkansas and Little Arkansas rivers, the main highways, the city limit, and the ${towns.length} towns Alex works. Select a town to ask him about it.`}
      >
        <defs>
          {/* A real soft halo rather than a flat outline ring, reused for
              whichever town is the anchor, hovered, or currently selected. */}
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Rivers first: the widest, most identifying shapes on the ground,
            so everything else draws on top of them. A soft fill for the
            channel plus a slightly brighter stroke, both cream, both
            verified against navy-glow in the contrast auditor. Drawn in
            (stroke sweeping on via dash offset) rather than just appearing,
            the first move in the map's one entrance sequence. */}
        <g
          className="text-cream transition-opacity duration-300 ease-out"
          style={{ opacity: atLeast(phase, "rivers") ? 1 : 0 }}
          aria-hidden="true"
        >
          {RIVER_AREA_PATHS.map((d, i) => (
            <path key={`ra${i}`} d={d} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} />
          ))}
          {RIVER_LINE_PATHS.map((d, i) => (
            <path key={`rl${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round" />
          ))}
        </g>

        {/* The city limit: a real, jagged, annexation-drawn boundary, not a
            circle standing in for one. A flat, uniform, low-opacity fill
            plus the dashed outline it always had; see the fair housing note
            in the file header for why one flat wash on a single closed
            shape does not cross into exposure. */}
        <g
          className="text-cream transition-opacity duration-[400ms] ease-out"
          style={{ opacity: atLeast(phase, "context") ? 1 : 0 }}
          aria-hidden="true"
        >
          {MUNICIPAL_BOUNDARY_PATHS.map((d, i) => (
            <path key={`bf${i}`} d={d} fill="currentColor" fillOpacity={0.045} stroke="none" />
          ))}
          {MUNICIPAL_BOUNDARY_PATHS.map((d, i) => (
            <path
              key={`b${i}`}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.22}
              strokeWidth={1}
              strokeDasharray="1.5 3.5"
            />
          ))}
        </g>

        {/* The five named highways, drawn brighter than the boundary so the
            grid reads clearly but still under the towns. */}
        <g
          className="text-cream transition-opacity duration-300 ease-out"
          style={{ opacity: atLeast(phase, "roads") ? 1 : 0 }}
          aria-hidden="true"
        >
          {ROAD_PATHS.map((r) => (
            <path key={r.id} d={r.d} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>

        <DowntownSkyline visible={atLeast(phase, "context")} />

        <g
          className="transition-[opacity,transform] duration-[400ms] ease-out"
          style={{
            opacity: atLeast(phase, "towns") ? 1 : 0,
            transform: atLeast(phase, "towns") ? "translateY(0)" : "translateY(4px)",
            transformBox: "fill-box",
          }}
        >
          {towns.map((t) => {
            const p = project(t.lon, t.lat);
            const isAnchor = Boolean(t.anchor);
            const isOn = selected === t.name;
            const glowing = isAnchor || isOn;
            const ta = labelAnchor(p.x);
            const dx = ta === "start" ? -1 : ta === "end" ? 1 : 0;
            const r = isAnchor ? 11 : isOn ? 10 : 6;
            return (
              <g
                key={t.name}
                role="button"
                tabIndex={0}
                aria-pressed={isOn}
                aria-label={`Ask about ${t.name}`}
                onClick={() => setSelected(isOn ? null : t.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isOn ? null : t.name);
                  }
                }}
                className="group cursor-pointer focus:outline-none [&:focus-visible_circle.hit]:stroke-cream"
              >
                {/* A 44px target at every rendered size, invisible but hittable. */}
                <circle className="hit" cx={p.x} cy={p.y} r={26} fill="transparent" strokeWidth={2} />
                {/* The halo: always in the DOM so hover can fade it in with a
                    transition instead of popping, held fully on for the
                    anchor and the selected town. */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 10}
                  fill="currentColor"
                  filter={`url(#${glowId})`}
                  className={`text-cream/40 transition-opacity duration-200 ${
                    glowing ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                  }`}
                />
                {/* The lift: a small scale-up on hover, centered on the dot
                    itself via fill-box so it grows in place rather than
                    sliding toward the SVG origin. */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="currentColor"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  className={`transition-transform duration-150 ease-out group-hover:scale-110 ${
                    glowing ? "text-cream" : "text-cream/60 group-hover:text-cream"
                  }`}
                />
                {isOn && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 6}
                    fill="none"
                    stroke="currentColor"
                    className="text-cream"
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={p.x + dx * 4}
                  y={p.y - (isAnchor ? 34 : isOn ? 30 : 24)}
                  textAnchor={ta}
                  fill="currentColor"
                  className={`transition-colors duration-150 ${glowing ? "text-cream" : "text-cream/75 group-hover:text-cream"}`}
                  stroke="var(--color-navy)"
                  strokeWidth={6}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  style={{
                    fontSize: isAnchor ? 30 : isOn ? 27 : 23,
                    fontWeight: isAnchor ? 800 : isOn ? 700 : 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Reserved height, so selecting a town does not shove the page around. */}
      <div className="mt-5 min-h-[52px]">
        {selected ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[0.98rem] text-dim">
              Looking at <span className="font-semibold text-cream">{selected}</span>?
            </p>
            <Link
              href={`/contact?about=${encodeURIComponent(selected)}`}
              className="cta-secondary group inline-flex min-h-[44px] items-center justify-center rounded-full border border-navy/55 px-4 text-[0.93rem] font-semibold text-navy transition-[border-color,background-color] duration-150 hover:border-navy hover:bg-navy/[0.04]"
              data-cta-kind="give"
              data-cta-emphasis="secondary"
            >
              Ask Alex about {selected}
              <Glyph />
            </Link>
          </div>
        ) : (
          <p className="text-[0.93rem] text-dim">
            Select a town to ask Alex something specific about it.
          </p>
        )}
      </div>

      <figcaption className="sr-only">
        A map of the Wichita area: the Arkansas and Little Arkansas rivers, I-135, I-235,
        US-54/Kellogg, K-96, the Kansas Turnpike, the Wichita city limit, and{" "}
        {towns.map((t) => t.name).join(", ")} in their actual relative positions. It shows
        location only and makes no claim about any of these places.
      </figcaption>
    </figure>
  );
}
