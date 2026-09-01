"use client";

import { useEffect, useState } from "react";

/**
 * A low, quiet strip of the same lanes pickYourDoor already renders, so there
 * is one list of the four audience lanes rather than two that can drift apart.
 * Purely decorative: the real, accessible, linked list is the grid above it,
 * so this repeats nothing a screen reader needs to hear.
 *
 * Starts static on every render, server and client alike, which is what makes
 * the DOM correct on first paint. Only after mount does it check whether the
 * visitor's system asks for reduced motion, and only then does it double the
 * track and start the CSS animation. Reduced motion is honored twice: this
 * check keeps a doubled, half-animated track from ever reaching the page, and
 * globals.css separately flattens the animation itself if this check is ever
 * bypassed, e.g. by a browser that changes the setting mid-session.
 */
export function Marquee({ items }: { items: string[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAnimated(!query.matches);
    const onChange = () => setAnimated(!query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Looping needs the track doubled and left un-clipped so translateX(-50%)
  // lands exactly on the seam. Static needs the opposite: one copy, centered,
  // wrapping normally on a narrow screen instead of running off the edge.
  const track = animated ? [...items, ...items] : items;

  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-line bg-cream py-3.5">
      <div
        className={
          animated
            ? "marquee-track flex w-max items-center whitespace-nowrap"
            : "flex flex-wrap items-center justify-center gap-x-2 gap-y-2 px-5"
        }
      >
        {track.map((label, i) => (
          <span key={i} className="flex items-center gap-5">
            <span className="label text-subtle">{label}</span>
            {(animated || i < track.length - 1) && (
              <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-navy/25" />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
