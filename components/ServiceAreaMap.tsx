"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LarkPerch } from "./Lark";
import { TownPanel, fullPanelMinHeight, type TownFacts } from "./TownPanel";
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

export type Town = {
  name: string;
  lat: number;
  lon: number;
  anchor?: boolean;
  facts?: TownFacts;
};

function labelAnchor(x: number): "start" | "middle" | "end" {
  if (x < VIEW_W * 0.14) return "start";
  if (x > VIEW_W * 0.86) return "end";
  return "middle";
}

/** The two CSS custom properties .mark-scale (globals.css) pivots its scale
 * transform on. React's CSSProperties type does not know about custom
 * properties, hence the cast. The values carry an explicit "px" unit, not a
 * bare number: a bare unitless number substituted into translate() via
 * var() computed the whole transform to "none" (an unquoted number is not
 * a valid CSS <length>, and that invalidity does not get the same SVG
 * unitless-user-units leniency a literal token written directly in the
 * transform function gets). "px" on SVG content maps 1:1 to the element's
 * own user-space units, the same coordinate system p.x/p.y are already in,
 * so this is not a unit conversion, just spelling the length correctly. */
function mapCoordVars(p: { x: number; y: number }): React.CSSProperties {
  return { "--mx": `${p.x}px`, "--my": `${p.y}px` } as React.CSSProperties;
}

/**
 * The map's one entrance, staggered per layer group with the .map-in class
 * (see globals.css): rivers, then highways, then the boundary and skyline,
 * then the town marks, four delays under a second end to end, once. Pure
 * CSS, not a JS phase timer, specifically because a JS timer chain proved
 * fragile: under a throttled CPU the React re-render each setTimeout
 * triggered fell behind the timers themselves, and the map sat showing only
 * the rivers, nothing else, for seconds. A CSS animation is real, complete
 * markup from first paint (a no-JS visitor, a crawler, or print all see the
 * finished drawing, since the animation plays without any JS at all) and
 * reaches its end state in real time close to its stated duration
 * regardless of main-thread load, which a JS-driven re-render on every
 * frame does not.
 */
const MAP_DELAY = { rivers: "0ms", roads: "220ms", context: "400ms", towns: "480ms" } as const;

/**
 * The town marks drop in one after another rather than as a block, starting
 * once the ground underneath them has finished drawing. 70ms apart: enough to
 * read as seven separate arrivals, short enough that the last one lands well
 * under a second after the first. Once, on the map's first appearance, because
 * .pin-drop is a plain CSS animation with no iteration and nothing re-arms it.
 */
const TOWN_STAGGER_MS = 70;

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
function DowntownSkyline() {
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
    <g aria-hidden="true" className="map-in text-cream" style={{ animationDelay: MAP_DELAY.context }}>
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
  phoneE164,
}: {
  towns: Town[];
  compact?: boolean;
  /** For the SMS deep link on a town card. */
  phoneE164: string;
}) {
  /**
   * One piece of state for what the panel is showing, and one for whether it
   * was opened deliberately.
   *
   * The brief requires hover, keyboard focus and tap to open the same panel,
   * with tap primary because a phone has no hover. Two states is what makes
   * all three coexist without fighting: an unlocked panel follows the pointer
   * and the focus ring around and closes itself when they leave, and a locked
   * one was opened on purpose and stays until it is dismissed. Without the
   * lock, tapping a mark on a device that also synthesises a mouseleave would
   * open the panel and immediately shut it again.
   */
  const [active, setActive] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const glowId = useId();
  const figureRef = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    setActive(null);
    setLocked(false);
  }, []);

  // Escape closes, from anywhere, which is the behaviour a keyboard user will
  // try first. Outside pointerdown closes too, and pointerdown rather than
  // click so a tap that starts outside the map dismisses without waiting for
  // the tap to complete.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!figureRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [active, close]);

  const activeTown = towns.find((t) => t.name === active) ?? null;

  return (
    // `relative` is load bearing, not cosmetic: it is the containing block for
    // the fact panel, which is out of flow specifically so that hovering a town
    // cannot change this figure's height. See TownPanel.tsx for the measured
    // feedback loop that made this necessary.
    <figure ref={figureRef} className={`relative ${compact ? "m-0" : "mt-10"}`}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="group"
        aria-label={`A map of the Wichita area showing the Arkansas and Little Arkansas rivers, the main highways, the city limit, and the ${towns.length} towns Alex works. Select a town for facts about it and a way to ask him something specific.`}
      >
        <defs>
          {/* A real soft halo rather than a flat outline ring, reused for
              whichever town is the anchor, hovered, or currently selected. */}
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Rivers first: the widest, most identifying shapes on the ground,
            so everything else draws on top of them. */}
        <g className="map-in text-cream" style={{ animationDelay: MAP_DELAY.rivers }} aria-hidden="true">
          {RIVER_AREA_PATHS.map((d, i) => (
            <path key={`ra${i}`} d={d} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} />
          ))}
          {RIVER_LINE_PATHS.map((d, i) => (
            <path key={`rl${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round" />
          ))}
        </g>

        {/* The city limit: a real, jagged, annexation-drawn boundary. A flat,
            uniform, low-opacity fill plus the dashed outline; see the fair
            housing note in the file header for why one flat wash on a single
            closed shape does not cross into exposure. */}
        <g className="map-in text-cream" style={{ animationDelay: MAP_DELAY.context }} aria-hidden="true">
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
        <g className="map-in text-cream" style={{ animationDelay: MAP_DELAY.roads }} aria-hidden="true">
          {ROAD_PATHS.map((r) => (
            <path key={r.id} d={r.d} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>

        <DowntownSkyline />

        <g>
          {towns.map((t, i) => {
            const p = project(t.lon, t.lat);
            const isAnchor = Boolean(t.anchor);
            const isOn = active === t.name;
            const glowing = isAnchor || isOn;
            const ta = labelAnchor(p.x);
            const dx = ta === "start" ? -1 : ta === "end" ? 1 : 0;
            const r = isAnchor ? 11 : isOn ? 10 : 6;

            const open = () => {
              setActive(t.name);
            };
            const leave = () => {
              if (!locked) setActive((cur) => (cur === t.name ? null : cur));
            };
            const toggle = () => {
              if (isOn && locked) {
                close();
              } else {
                setActive(t.name);
                setLocked(true);
              }
            };

            return (
              <g
                key={t.name}
                role="button"
                tabIndex={0}
                aria-pressed={isOn}
                aria-label={`Ask about ${t.name}`}
                onPointerEnter={(e) => {
                  // Touch fires pointerenter immediately before the tap. Let
                  // the click handler own that case so a tap does not open on
                  // enter and then toggle straight back shut.
                  if (e.pointerType === "mouse") open();
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") leave();
                }}
                onFocus={open}
                onBlur={leave}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className="pin-drop group cursor-pointer focus:outline-none [&:focus-visible_circle.hit]:stroke-cream"
                style={{ animationDelay: `${480 + i * TOWN_STAGGER_MS}ms` }}
              >
                {/*
                  The hit target. Fixed size, never transformed, and a sibling
                  of the visual mark rather than its parent, so hovering can
                  never change the shape of the thing being hovered. That is
                  the property that keeps a hover from cancelling itself.

                  r=72 in map units, not 26. The old value carried the comment
                  "a 44px target at every rendered size" and did not deliver it
                  at any size: measured in the browser, 26 units came out at
                  25.4px in the desktop hero and would have been under 17px on a
                  390px phone, which is where a touch target actually matters
                  because touch is the only input there.

                  The binding case is the narrowest viewport, so the radius is
                  set from it: at 390px the map renders about 300px wide against
                  a 964 unit viewBox, so 72 units measures 44.9px. The same
                  radius is ~70px in the desktop hero and ~172px on /areas,
                  which is generous but invisible and costs nothing.

                  Overlap was checked rather than assumed: the closest pair of
                  towns is Derby and Rose Hill at 213 units, and the widest any
                  two of these circles can be is 144 units combined, so no two
                  hit areas touch anywhere on the map even at this radius.
                */}
                <circle className="hit" cx={p.x} cy={p.y} r={72} fill="transparent" strokeWidth={2} />

                {/* Only the active mark pulses. One ring, expanding and fading
                    out, and it starts and ends on its resting value so a
                    reduced-motion visitor is left with nothing showing rather
                    than a ring frozen mid-expansion. */}
                {isOn && (
                  <circle
                    className="pin-pulse text-cream"
                    cx={p.x}
                    cy={p.y}
                    r={r + 4}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  />
                )}

                {/* The halo: always in the DOM so hover can fade it in with a
                    transition instead of popping. */}
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

                {/* The lift: a small scale-up on hover, pivoted on the dot's
                    own coordinate via the .mark-scale CSS variables rather
                    than transform-box: fill-box (see globals.css for why). */}
                <g
                  className="mark-scale transition-transform duration-150 ease-out group-hover:[--ms:1.1] group-focus-visible:[--ms:1.1]"
                  style={mapCoordVars(p)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="currentColor"
                    className={glowing ? "text-cream" : "text-cream/60 group-hover:text-cream"}
                  />
                </g>
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

        {/*
          Lark perches on the active mark. Drawn last so it sits above every
          other layer, and outside the mark's own <g> so it is not inside a
          role="button" and cannot be announced as part of it.

          The offset is not a style choice, it is the only place the bird
          fits. Every town's label sits directly above its dot, and the
          viewBox is padded to exactly the label extent the seven current
          towns need: Derby has 26 units of clearance below its dot and Park
          City has six above its label, so there is no room in any direction
          to grow the envelope without regenerating the map geometry from the
          TIGER shapefiles. Standing Lark down and to the right puts it in the
          one gap that already exists: below the label's descenders, inside
          the 26 unit bottom allowance scripts/map-label-metrics.mjs already
          reserves for the dot and its halo, and well inside the label's own
          horizontal reach. It costs the map nothing and audit-map-fit stays
          green without its formula changing.
        */}
        {activeTown &&
          (() => {
            const p = project(activeTown.lon, activeTown.lat);
            return <LarkPerch x={p.x + 22} y={p.y + 22} lift={0} size={54} seed={activeTown.name} />;
          })()}
      </svg>

      {/*
        The panel and the resting hint, both absolutely positioned inside the
        figure, so the figure is exactly as tall as the map whatever is showing
        and hover cannot move a single pixel of layout.

        It floats over the drawing's lower left, which is the emptiest corner of
        this particular map on every breakpoint (Goddard is the only mark out
        there and it sits above this box). pointer-events-none on the wrapper
        means a pointer resting over a town that happens to be under the panel
        still belongs to the town: without it the panel becomes the event
        target, fires mouseleave on the mark beneath it, and the loop restarts
        by a different route than the one that was just fixed.

        aria-live announces the town when hover or focus changes it, without
        moving focus, which would trap a keyboard user walking the seven marks.
      */}
      <div
        // inset-0, not bottom-0. Anchoring to the bottom edge left this wrapper
        // sized to its own content, so when the hint was replaced by the taller
        // panel the wrapper's top edge moved and the browser recorded a real
        // layout shift, out of flow or not. The geometry never moved a pixel
        // and CLS was still 0.0065 per hover. A box pinned on all four sides
        // cannot change size, and the content is bottom-aligned inside it.
        className="pointer-events-none absolute inset-0 z-10 flex items-end p-3 sm:p-4"
        aria-live="polite"
      >
        {activeTown ? (
          <div
            className={compact ? "" : "max-w-[24rem]"}
            // Every town's card is the same height, so moving from one town to
            // the next never moves the card's top edge. Derived from the town
            // data, not typed in: see fullPanelMinHeight.
            style={compact ? undefined : { minHeight: fullPanelMinHeight(towns) }}
          >
            <TownPanel
              // Keyed by town, so moving from one town to the next replaces the
              // card instead of rearranging it in place. Towns publish
              // different numbers of facts, so a reused subtree left rows and
              // the CTA sitting at different heights and the browser recorded
              // each of those as a moved element: 0.032 of layout shift across
              // fourteen hovers, inside a card whose own box never changed.
              // It is a different card, so it is rendered as one.
              key={activeTown.name}
              town={activeTown.name}
              facts={activeTown.facts ?? {}}
              phoneE164={phoneE164}
              onClose={close}
              compact={compact}
            />
          </div>
        ) : (
          <p className="max-w-[26rem] text-[0.88rem] leading-snug text-dim sm:text-[0.93rem]">
            Hover, tab to, or tap a town for the facts about it and a way to ask Alex
            something specific.
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
