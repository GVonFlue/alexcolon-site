"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The one scroll-reveal pattern on the site. Applied to section-level
 * containers only (Section wraps every band in it, see ui.tsx), never to
 * individual cards, list items or headings inside a band: "scattered
 * decorative motion", the doctrine's own name for fade-ups on every element,
 * is exactly what this avoids by living in exactly one place.
 *
 * Correctness comes first. The server-rendered, no-JS default is fully
 * visible, real content, so a crawler, a screen reader, or a visitor whose
 * JS never loads sees the whole page immediately; nothing here can gate
 * usability or delay the fold. Only after mount, and only for a section that
 * is not already in or near the viewport, does this briefly hide it and
 * cross-fade it back in the first time it is scrolled to, once, via
 * IntersectionObserver rather than a scroll listener or a scroll library. A
 * section already in view at mount (the hero, and often the band right
 * under it) is left alone entirely, which is also what keeps this from
 * fighting with the hero's own load-time stagger.
 *
 * Reduced motion is honored twice: the effect below never hides anything
 * when the visitor has asked for reduced motion (JS), and globals.css kills
 * every transition duration site-wide as a second, independent line of
 * defense (CSS) in case this check is ever bypassed.
 *
 * A timed fallback backs the observer up: if a section is hidden and 60ms
 * pass without it ever intersecting, it reveals anyway. A page captured in
 * one shot rather than genuinely scrolled through, a full page screenshot
 * tool doing its own resize, print, or a crawler that renders without
 * simulating scroll, none of them are guaranteed to ever fire an
 * intersection, and content that only ever appears on a scroll nobody
 * performs is exactly the "gates usability" failure this component exists
 * to avoid. This was caught by this site's own shots.mjs, whose full-page
 * capture left everything below the fold at zero opacity; 60ms is far
 * below anything a real screenshot, crawl, or print takes to run, but is
 * still enough behind the earlier already-in-view check that a genuine
 * scroll almost always wins the race and gets the real, visible reveal.
 */
export function Reveal({
  className = "",
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already visible, or close to it: never hide, so there is no flash and
    // nothing above (or barely below) the fold waits on a scroll to appear.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return;

    setHidden(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHidden(false);
          io.disconnect();
          clearTimeout(fallback);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const fallback = setTimeout(() => {
      setHidden(false);
      io.disconnect();
    }, 60);
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={`${className} transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hidden ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {children}
    </section>
  );
}
