"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Glyph } from "./ui";
import {
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
 * widest, most identifying shapes), the city limit, the five highways, then
 * the towns on top. No straight connector lines between towns anymore, the
 * roads themselves now do that job and do it honestly instead of implying a
 * road that is not there.
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
 * carries no characterization of any area, no shading of any area, and no
 * school or quality claim, and it must stay that way. The boundary is a
 * stroked outline only, never a fill, on purpose: filling it would read as
 * "this side of the line is different," which is exactly the claim this
 * graphic is not allowed to make.
 */

export type Town = { name: string; lat: number; lon: number; anchor?: boolean };

function labelAnchor(x: number): "start" | "middle" | "end" {
  if (x < VIEW_W * 0.14) return "start";
  if (x > VIEW_W * 0.86) return "end";
  return "middle";
}

export function ServiceAreaMap({
  towns,
  compact = false,
}: {
  towns: Town[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const anchor = towns.find((t) => t.anchor) ?? towns[0];
  const glowId = useId();

  return (
    <figure className={compact ? "m-0" : "mt-10"}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="group"
        aria-label={`A map of the Wichita area showing the Arkansas and Little Arkansas rivers, the main highways, the city limit, and the ${towns.length} towns Alex works. Select a town to ask him about it.`}
      >
        <defs>
          {/* A real soft halo rather than a flat outline ring, reused for
              whichever town is the anchor or currently selected. */}
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Rivers first: the widest, most identifying shapes on the ground,
            so everything else draws on top of them. A soft fill for the
            channel plus a slightly brighter stroke, both cream, both
            verified against navy-glow in the contrast auditor. */}
        <g className="text-cream" aria-hidden="true">
          {RIVER_AREA_PATHS.map((d, i) => (
            <path key={`ra${i}`} d={d} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} />
          ))}
          {RIVER_LINE_PATHS.map((d, i) => (
            <path key={`rl${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round" />
          ))}
        </g>

        {/* The city limit: a real, jagged, annexation-drawn boundary, not a
            circle standing in for one. Stroked only, never filled, so it
            reads as a location fact rather than a shaded claim about
            anything inside it. */}
        <g className="text-cream" aria-hidden="true">
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
        <g className="text-cream" aria-hidden="true">
          {ROAD_PATHS.map((r) => (
            <path key={r.id} d={r.d} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>

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
              className="cursor-pointer focus:outline-none [&:focus-visible_circle.hit]:stroke-cream"
            >
              {/* A 44px target at every rendered size, invisible but hittable. */}
              <circle className="hit" cx={p.x} cy={p.y} r={26} fill="transparent" strokeWidth={2} />
              {glowing && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 10}
                  fill="currentColor"
                  className="text-cream/40"
                  filter={`url(#${glowId})`}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill="currentColor"
                className={glowing ? "text-cream" : "text-cream/60"}
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
                className={glowing ? "text-cream" : "text-cream/75"}
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
