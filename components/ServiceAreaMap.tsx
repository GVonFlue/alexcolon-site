"use client";

import Link from "next/link";
import { useState } from "react";
import { Glyph } from "./ui";

/**
 * The signature element.
 *
 * A hand authored map of the seven towns Alex works, plotted from their actual
 * coordinates rather than arranged for looks. It is true only of this client:
 * change the seven towns and the drawing changes, which is the test the doctrine
 * sets for whether a signature element is one.
 *
 * It is also a door. Selecting a town carries that town into the contact form,
 * which turns the most distinctive thing on the page into a conversion path
 * rather than an ornament.
 *
 * Deliberately no accent color. Gold means "act here" everywhere else on this
 * site, so putting it on decoration would spend the one signal the palette has.
 *
 * Fair housing: this renders place names and relative position, both of which
 * are facts. It carries no characterization of any area and no school or
 * quality claim, and it must stay that way.
 */

export type Town = { name: string; lat: number; lon: number; anchor?: boolean };

const W = 800;
const H = 500;
const PAD_X = 92;
const PAD_Y = 92;

/**
 * Projects the towns into the drawing. Guards the single-town case, where the
 * extent is zero and every coordinate would otherwise come out NaN.
 */
function projector(towns: Town[]) {
  const lons = towns.map((t) => t.lon);
  const lats = towns.map((t) => t.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;
  return (t: Town) => ({
    x: PAD_X + ((t.lon - minLon) / spanLon) * (W - PAD_X * 2),
    y: PAD_Y + ((maxLat - t.lat) / spanLat) * (H - PAD_Y * 2),
  });
}

function labelAnchor(x: number): "start" | "middle" | "end" {
  if (x < W * 0.2) return "start";
  if (x > W * 0.8) return "end";
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
  const project = projector(towns);
  const anchorPos = project(towns.find((t) => t.anchor) ?? towns[0]);

  return (
    <figure className={compact ? "m-0" : "mt-10"}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="group"
        aria-label={`The ${towns.length} towns Alex works. Select one to ask him about it.`}
      >
        <g stroke="currentColor" className="text-navy/22" strokeWidth={1.25}>
          {towns.filter((t) => !t.anchor).map((t) => {
            const p = project(t);
            return <line key={t.name} x1={anchorPos.x} y1={anchorPos.y} x2={p.x} y2={p.y} />;
          })}
        </g>

        {towns.map((t) => {
          const p = project(t);
          const isAnchor = Boolean(t.anchor);
          const isOn = selected === t.name;
          const ta = labelAnchor(p.x);
          const dx = ta === "start" ? -1 : ta === "end" ? 1 : 0;
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
              className="cursor-pointer focus:outline-none [&:focus-visible_circle.hit]:stroke-navy"
            >
              {/* A 44px target at every rendered size, invisible but hittable. */}
              <circle className="hit" cx={p.x} cy={p.y} r={30} fill="transparent" strokeWidth={2} />
              {(isAnchor || isOn) && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={17}
                  fill="none"
                  stroke="currentColor"
                  className={isOn ? "text-navy" : "text-navy/30"}
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isAnchor ? 7 : isOn ? 6.5 : 4.5}
                fill="currentColor"
                className="text-navy"
              />
              <text
                x={p.x + dx * 2}
                y={p.y - (isAnchor ? 32 : 20)}
                textAnchor={ta}
                fill="currentColor"
                className="text-navy"
                stroke="#F7F4EE"
                strokeWidth={6}
                paintOrder="stroke"
                strokeLinejoin="round"
                style={{
                  fontSize: isAnchor ? 26 : 22,
                  fontWeight: isAnchor || isOn ? 650 : 500,
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
      <div className="mt-4 min-h-[52px]">
        {selected ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[0.98rem] text-ink">
              Looking at <span className="font-semibold text-navy">{selected}</span>?
            </p>
            <Link
              href={`/contact?about=${encodeURIComponent(selected)}`}
              className="group inline-flex min-h-[44px] items-center justify-center rounded-full border border-navy/55 px-4 text-[0.93rem] font-semibold text-navy transition-[border-color,background-color] duration-150 hover:border-navy hover:bg-navy/[0.04]"
              data-cta-kind="give"
              data-cta-emphasis="secondary"
            >
              Ask Alex about {selected}
              <Glyph />
            </Link>
          </div>
        ) : (
          <p className="text-[0.93rem] text-subtle">
            Select a town to ask Alex something specific about it.
          </p>
        )}
      </div>

      <figcaption className="sr-only">
        A diagram placing {towns.map((t) => t.name).join(", ")} in their actual relative
        positions, with Wichita at the center. It shows location only and makes no claim about
        any of these places.
      </figcaption>
    </figure>
  );
}
