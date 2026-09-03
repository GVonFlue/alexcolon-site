"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The hero headline's entrance: it arrives one line at a time.
 *
 * Per-letter animation is the most recognisable motion tell on an AI-built
 * site, and it is also an accessibility problem, because the usual
 * implementation splits a sentence into one span per character and screen
 * readers then announce it as letters or insert pauses. This splits on the
 * browser's own line boxes and never below a word boundary, so the text runs
 * a reader encounters are the same words in the same order and the announced
 * headline is unchanged.
 *
 * Three properties make this safe to put on the largest element on the page:
 *
 *   1. The server renders the ordinary, complete headline. No JS, no
 *      measurement, no layout dependency. It is the LCP element and it paints
 *      exactly as it did before this component existed.
 *   2. The split is measured off a hidden copy rather than by rewriting the
 *      real heading, so the real heading is never emptied and re-filled.
 *   3. It reverts. Once the entrance has played, the component renders the
 *      normal headline again and the line spans are gone, so resizing the
 *      window afterwards re-wraps naturally instead of being stuck with line
 *      breaks measured at some earlier width.
 *
 * Under reduced motion none of this runs at all: phase stays "done" and the
 * plain headline is what renders, start to finish.
 */

type Props = {
  text: string;
  /** An exact substring to paint in the accent colour, if it occurs. */
  phrase?: string;
  /** Milliseconds between one line arriving and the next. */
  step?: number;
  /** Rendered before the first line has been measured, and after it reverts. */
  plain: React.ReactNode;
};

/** The accent phrase, applied to one line by intersecting character ranges. */
function LineContent({
  line,
  from,
  accent,
}: {
  line: string;
  from: number;
  accent: { start: number; end: number } | null;
}) {
  if (!accent) return <>{line}</>;
  const to = from + line.length;
  const s = Math.max(accent.start, from);
  const e = Math.min(accent.end, to);
  if (s >= e) return <>{line}</>;
  return (
    <>
      {line.slice(0, s - from)}
      <span className="text-gold">{line.slice(s - from, e - from)}</span>
      {line.slice(e - from)}
    </>
  );
}

export function LineReveal({ text, phrase, step = 90, plain }: Props) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"measure" | "play" | "done">("done");
  const [lines, setLines] = useState<{ text: string; from: number }[]>([]);

  // Enter the measuring phase after hydration, never during the server render.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("measure");
  }, []);

  useLayoutEffect(() => {
    if (phase !== "measure") return;
    const node = measureRef.current?.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      setPhase("done");
      return;
    }

    // Walk the string one character at a time and record where the browser
    // moved to a new line box. Ranges are cheap and a headline is under 100
    // characters, so this is a handful of microseconds, once.
    const range = document.createRange();
    const out: { text: string; from: number }[] = [];
    let start = 0;
    let lastTop: number | null = null;

    for (let i = 1; i <= text.length; i += 1) {
      range.setStart(node, i - 1);
      range.setEnd(node, i);
      const rect = range.getBoundingClientRect();
      if (rect.height === 0) continue;
      if (lastTop === null) {
        lastTop = rect.top;
      } else if (rect.top > lastTop + 1) {
        out.push({ text: text.slice(start, i - 1), from: start });
        start = i - 1;
        lastTop = rect.top;
      }
    }
    out.push({ text: text.slice(start), from: start });

    const cleaned = out
      .map((l) => {
        // A line box starts after the space that caused the break. Drop it
        // from the visible line but keep `from` pointing at the real offset,
        // so the accent phrase's character range still lines up.
        const lead = l.text.length - l.text.replace(/^\s+/, "").length;
        return { text: l.text.slice(lead), from: l.from + lead };
      })
      .filter((l) => l.text.length > 0);

    if (cleaned.length < 2) {
      // One line means there is nothing to stagger. Skip the whole mechanism
      // rather than animating a single block through a per-line pathway.
      setPhase("done");
      return;
    }

    setLines(cleaned);
    setPhase("play");
  }, [phase, text]);

  // Revert to the ordinary headline once the last line has finished.
  useEffect(() => {
    if (phase !== "play") return;
    const total = lines.length * step + 800;
    const t = setTimeout(() => setPhase("done"), total);
    return () => clearTimeout(t);
  }, [phase, lines.length, step]);

  const i = phrase ? text.indexOf(phrase) : -1;
  const accent = i === -1 || !phrase ? null : { start: i, end: i + phrase.length };

  if (phase === "measure") {
    return (
      <span ref={hostRef} className="relative block">
        {/* The real headline stays painted while the copy below is measured,
            so nothing flashes and the LCP element never goes blank. */}
        <span aria-hidden="true">{plain}</span>
        <span
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-full opacity-0"
        >
          {text}
        </span>
      </span>
    );
  }

  if (phase === "play") {
    return (
      <span className="block">
        {lines.map((l, n) => (
          <span
            key={`${l.from}-${n}`}
            className="line-in block"
            style={{ animationDelay: `${n * step}ms` }}
          >
            <LineContent line={l.text} from={l.from} accent={accent} />
          </span>
        ))}
      </span>
    );
  }

  return <>{plain}</>;
}
