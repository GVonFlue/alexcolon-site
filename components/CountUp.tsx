"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up the first time it is scrolled to.
 *
 * Built for a band that renders nothing today. Alex has no verified figures,
 * so site.numbers is empty and the numbers band withholds itself entirely; this
 * exists so that the day he sends real numbers with real sources, they arrive
 * finished rather than as plain text somebody then has to go and animate.
 *
 * It counts the numeric part of the figure and leaves everything else exactly
 * as written. "$1.2M" counts to 1.2 and keeps the dollar sign, the decimal and
 * the M; "Since 2019" does not count at all, because a year is not a quantity
 * and watching one spin up from zero is a gimmick. Whatever the string is, the
 * final frame is that string, character for character.
 *
 * Three ways it refuses to animate, all of which land on the real value:
 *
 *   1. prefers-reduced-motion, checked directly here as well as by the blanket
 *      CSS query, because this one is driven by JS and CSS cannot flatten it
 *   2. no IntersectionObserver
 *   3. a figure with no number in it
 *
 * The server renders the finished string, so a crawler, a print, or a visitor
 * whose JS never runs sees the real figure and never a zero.
 */
export function CountUp({ figure, durationMs = 1100 }: { figure: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(figure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // The first run of digits, with an optional decimal part. Everything before
    // and after it is preserved verbatim.
    const match = figure.match(/(\d[\d,]*)(\.\d+)?/);
    if (!match) return;

    const raw = match[0];
    const target = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;

    // A four digit whole number with no separators is almost always a year.
    // Counting up to 2019 from zero is the kind of motion that makes a site
    // look like it is trying.
    if (!match[2] && !raw.includes(",") && target >= 1900 && target <= 2100) return;

    const decimals = match[2] ? match[2].length - 1 : 0;
    const grouped = raw.includes(",");
    const before = figure.slice(0, match.index ?? 0);
    const after = figure.slice((match.index ?? 0) + raw.length);

    const render = (n: number) => {
      const fixed = n.toFixed(decimals);
      const withGroups = grouped
        ? Number(fixed).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : fixed;
      return `${before}${withGroups}${after}`;
    };

    let frame = 0;
    let started = 0;

    const step = (now: number) => {
      if (!started) started = now;
      const t = Math.min(1, (now - started) / durationMs);
      // Ease out cubic: fast at the start, settling rather than stopping dead.
      const eased = 1 - (1 - t) ** 3;
      setShown(t >= 1 ? figure : render(target * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setShown(render(0));
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [figure, durationMs]);

  // aria-hidden on the animating copy and the real figure in a visually hidden
  // sibling: a screen reader should be told the number once, not read a
  // counter thirty times as it ticks.
  return (
    <span ref={ref}>
      <span aria-hidden="true" className="figure tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{figure}</span>
    </span>
  );
}
