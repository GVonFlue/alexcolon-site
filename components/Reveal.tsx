"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The one scroll-reveal primitive on the site.
 *
 * Applied to section-level containers only (Section wraps every band in it,
 * see ui.tsx), never to individual cards, headings or list items. A band opts
 * its own direct children into a 60ms positional stagger by passing
 * `stagger`, which is the only way a child element on this site is ever
 * animated on scroll: the delay comes from CSS nth-child in globals.css, not
 * from a per-item prop, so no call site can invent its own timing.
 *
 * ONCE ONLY. The observer disconnects on its first intersection and the
 * revealed state is never unset. Re-triggering on scroll back is the specific
 * thing that makes a site feel cheap, and it is also what turns a long page
 * into a flickering one on a trackpad.
 *
 * Correctness comes first. The server-rendered, no-JS default is fully
 * visible, real content: `hidden` starts false and only an effect can set it,
 * so a crawler, a screen reader, a print, or a visitor whose JS never loads
 * sees the whole page immediately. Nothing here can gate usability or delay
 * the fold.
 *
 * WHAT CHANGED IN v1.1, and why. The previous version carried a 60ms timer
 * that revealed a hidden section whether or not it had ever intersected. That
 * was added to fix a real bug (shots.mjs captures a full page in one shot and
 * does not reliably fire an IntersectionObserver, so every band below the fold
 * screenshotted at opacity 0), but it fixed it by defeating the feature: 60ms
 * after mount every section on the page was revealed, so the reveal only ever
 * played for bands already within a screen of the fold. The scroll reveal was
 * effectively dead code on every long route.
 *
 * The fix belongs in the verification tool, not in the component: shots.mjs
 * now scrolls the page the way a person does before it captures. What remains
 * here are four guards that reveal without ever being on a timer, each of them
 * a real condition under which an intersection may genuinely never arrive:
 *
 *   1. reduced motion requested        never hide anything, at all
 *   2. no IntersectionObserver         never hide anything, at all
 *   3. the document does not scroll    an observer would never fire
 *   4. the page is about to print      reveal everything first
 */
export function Reveal({
  className = "",
  id,
  stagger = false,
  children,
}: {
  className?: string;
  id?: string;
  /** Stagger this section's own direct children by 60ms each. */
  stagger?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // A document shorter than its own viewport can never be scrolled, so an
    // observer on a section below the fold would never fire. There is no
    // "below the fold" to reveal into either, so there is nothing to hide.
    if (document.documentElement.scrollHeight <= window.innerHeight + 4) return;

    // Already visible, or within a screen of it: never hide, so there is no
    // flash, nothing above the fold waits on a scroll, and this never fights
    // with the hero's own load-time entrance.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setHidden(true);

    const reveal = () => {
      setHidden(false);
      io.disconnect();
      window.removeEventListener("beforeprint", reveal);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);

    // Print produces no scroll and no intersection. Reveal first, then print.
    window.addEventListener("beforeprint", reveal);

    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", reveal);
    };
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      // data-reveal lets scripts/shots.mjs assert that every section actually
      // reached its revealed state after scrolling, rather than the screenshot
      // silently capturing a page of empty bands again.
      data-reveal={hidden ? "hidden" : "shown"}
      className={`${className} ${stagger ? "stagger" : ""} ${hidden ? "reveal" : "reveal-in"}`}
    >
      {children}
    </section>
  );
}
