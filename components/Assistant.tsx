"use client";

import { useEffect, useRef, useState } from "react";
import { AccentHeadline, Eyebrow, H2 } from "./ui";

type Chip = { label: string; prompt: string; kind: "info" | "conversion" };
type Turn = { role: "user" | "assistant"; content: string };

/**
 * A small, abstract mark identifying the assistant, not a mascot. No face, no
 * character design, nothing anthropomorphic: three concentric arcs standing
 * for a signal, which is what a status dot already means everywhere else on
 * this site. Inventing an actual character is a brand decision that is
 * Alex's to make, not this build's, which is also why this stays an abstract
 * mark rather than adopting the reference's own illustrated mascot.
 */
function AssistantMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-cream shadow-[0_10px_24px_-10px_rgba(23,42,58,0.5)]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        <circle cx="12" cy="12" r="2.3" fill="currentColor" />
        <circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

/**
 * Embedded in the page body in the top third, named, first person, with a live
 * status line. Not a floating bubble nobody clicks.
 *
 * Rebuilt to the reference's own "Meet Scout" format: a centered column,
 * roughly 640 to 720px rather than the full band width, with the section's
 * own header (eyebrow, a heading that highlights the assistant's name, one
 * line of intro) and the capability chips centered above the card, then the
 * card itself with a proper header bar (avatar, name, sub-label, the status
 * dot it has actually earned) over the conversation. Full width with the
 * avatar stranded on the left and the rest of the card empty, which is what
 * this replaces, is a layout mistake a reference this direct is worth
 * copying the fix for.
 *
 * The page never ends on this component. Every route closes on a CTA.
 */
export function Assistant({
  eyebrow,
  heading,
  intro,
  name,
  siteName,
  introduction,
  chips,
  goodAt,
  phoneDisplay,
  telHref,
}: {
  eyebrow?: string;
  heading: string;
  intro: string;
  name: string;
  siteName: string;
  introduction: string;
  chips: Chip[];
  goodAt: string[];
  phoneDisplay: string;
  telHref: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  /**
   * Starts as "checking", never as ready. The component does not know whether
   * the assistant is connected until the probe answers, and claiming readiness
   * it has not verified is the same class of lie as a green checkmark nobody
   * earned. A visitor who types a real question and then gets told the thing is
   * not connected has been misled by the label.
   */
  const [status, setStatus] = useState<"checking" | "ready" | "offline">("checking");
  const [sessionId, setSessionId] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Session derived, not random per message, so a follow up updates the same
    // lead row instead of creating a second half filled one.
    const existing = sessionStorage.getItem("assistant-session");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    sessionStorage.setItem("assistant-session", id);
    setSessionId(id);
  }, []);

  // Ask the server whether it is actually configured, before anyone types.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat", { method: "GET" })
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        if (!cancelled) setStatus(d.configured ? "ready" : "offline");
      })
      .catch(() => {
        // If the probe itself cannot be reached, say offline rather than ready.
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const data = (await res.json()) as { reply?: string; offline?: boolean };
      // The reply itself is the second source of truth, in case the key was
      // removed between mount and this request.
      setStatus(data.offline ? "offline" : "ready");
      setTurns([...next, { role: "assistant", content: data.reply ?? "" }]);
    } catch {
      setTurns([
        ...next,
        {
          role: "assistant",
          content: `Something went wrong on our end, not yours. Call or text Alex at ${phoneDisplay} and he will answer it directly.`,
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      });
    }
  }

  const statusLabel =
    status === "checking"
      ? "checking"
      : status === "offline"
        ? "not connected"
        : busy
          ? "thinking"
          : "ready";

  return (
    <div className="mx-auto max-w-[42rem]">
      <div className="text-center">
        {eyebrow && (
          <div className="flex justify-center">
            <Eyebrow tone="dark">{eyebrow}</Eyebrow>
          </div>
        )}
        <H2 className="text-cream">
          <AccentHeadline text={heading} phrase={name} dark />
        </H2>
        <p className="measure mx-auto mt-4 text-[1.05rem] leading-[1.7] text-dim">{intro}</p>

        {/* Capability chips, centered above the card rather than buried
            inside it: the same three or so labels the reference puts above
            Scout ("~60 second qualify", "Zero pressure"), each one already
            true of something this site actually does. */}
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {goodAt.map((g) => (
            <li
              key={g}
              className="label rounded-full border border-cream/20 bg-cream/[0.06] px-3.5 py-1.5 text-dim"
            >
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/*
        The card. A proper header bar now (avatar, name, the site it belongs
        to, the status dot it has actually earned, divided from the body by
        a real rule) instead of the mark and the status line just floating
        at the top of one undivided box. Still a light surface on purpose:
        there is an input field at the bottom, inputs need a light ground
        the same reason a tool's fields do, and a card that is dark on top
        and light on the bottom would read as two things stapled together
        rather than one.
      */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-navy/10 bg-paper text-left shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-4 border-b border-line bg-navy/[0.02] px-6 py-5 sm:px-7">
          <AssistantMark />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="truncate text-[1.15rem] font-extrabold tracking-[-0.01em] text-navy">
                {name}
              </span>
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  status === "offline" ? "bg-field" : status === "checking" ? "bg-line" : "bg-navy"
                }`}
              />
            </div>
            <p className="truncate text-[0.85rem] text-subtle">{siteName}</p>
          </div>
          <p className="label ml-auto shrink-0 text-subtle">{statusLabel}</p>
        </div>

        <div className="p-6 sm:p-7">
          {/*
            One recessed well for the transcript, chips floating free above
            the composer instead of fenced into their own strip, and a single
            pill-shaped composer that merges the field and the send action
            the way an actual chat product does. Nothing here is boxed off
            from anything else; spacing does the separating, not rules.
          */}
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label={`Conversation with ${name}`}
            className="max-h-[22rem] overflow-y-auto rounded-xl bg-cream/70 px-5 py-5 shadow-[inset_0_1px_3px_rgba(23,42,58,0.08)]"
          >
            {turns.length === 0 ? (
              <p className="measure text-[1rem] leading-[1.7] text-subtle">{introduction}</p>
            ) : (
              <ul className="space-y-4">
                {turns.map((t, i) => (
                  <li key={i} className={t.role === "user" ? "text-right" : ""}>
                    <p className="label mb-1 text-subtle">{t.role === "user" ? "You" : name}</p>
                    <p
                      className={`measure inline-block whitespace-pre-wrap rounded-md px-4 py-3 text-left text-[1rem] leading-[1.65] ${
                        t.role === "user" ? "bg-navy text-cream" : "bg-paper text-ink shadow-[0_1px_2px_rgba(23,42,58,0.08)]"
                      }`}
                    >
                      {t.content}
                    </p>
                  </li>
                ))}
                {busy && (
                  <li>
                    <p className="label text-subtle">{name} is typing</p>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Two informational chips and one conversion chip. */}
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => send(c.prompt)}
                disabled={busy}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-left text-[0.9rem] disabled:opacity-60 ${
                  c.kind === "conversion"
                    ? "border-navy bg-navy text-cream font-semibold"
                    : "border-navy/55 text-ink hover:border-navy hover:bg-navy/[0.04]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="mt-4 flex items-center gap-1.5 rounded-full border border-field bg-paper py-1.5 pl-5 pr-1.5 transition-colors focus-within:border-navy"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask {name} a question
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question"
              className="min-h-[40px] min-w-0 flex-1 bg-transparent text-[1rem] text-ink placeholder:text-subtle/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-navy px-5 text-[0.95rem] font-semibold text-cream transition-opacity disabled:opacity-40"
            >
              Ask
            </button>
          </form>

          <p className="mt-4 text-[0.85rem] leading-relaxed text-subtle">
            {name} is an assistant, not Alex, and it does not have his calendar. For anything
            time sensitive, call or text{" "}
            <a href={telHref} className="figure underline underline-offset-4">
              {phoneDisplay}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
