"use client";

import { useEffect, useRef, useState } from "react";
import { H2 } from "./ui";

type Chip = { label: string; prompt: string; kind: "info" | "conversion" };
type Turn = { role: "user" | "assistant"; content: string };

/**
 * A small, abstract mark identifying the assistant, not a mascot. No face, no
 * character design, nothing anthropomorphic: three concentric arcs standing
 * for a signal, which is what a status dot already means everywhere else on
 * this site. Inventing an actual character is a brand decision that is
 * Alex's to make, not this build's.
 */
function AssistantMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-cream shadow-[0_10px_24px_-10px_rgba(23,42,58,0.5)]"
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8">
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
 * Presented as a character rather than a form field bolted onto the page: an
 * avatar, a status dot it has actually earned (see the probe below), a short
 * section that sells what it does, and a row of chips naming what it is
 * actually good at, each one true of something that already exists elsewhere
 * on this site rather than a new claim invented for the card.
 *
 * The page never ends on this component. Every route closes on a CTA.
 */
export function Assistant({
  heading,
  intro,
  name,
  introduction,
  chips,
  goodAt,
  phoneDisplay,
  telHref,
}: {
  heading: string;
  intro: string;
  name: string;
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
    <div>
      <H2 className="text-cream">{heading}</H2>
      <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-dim">{intro}</p>

      {/*
        The character card. An avatar and a status dot it has actually earned
        (see the probe in the effect above), plus a row naming what it is
        good at, each one already true elsewhere on this site. This is what
        turns the widget below into someone rather than a form field. It
        stays a light card on the new dark section, the same way the lead
        form does: the input at the bottom needs a light ground, and the rest
        of the card reads as one surface rather than two.
      */}
      <div className="mt-8 rounded-2xl border border-navy/10 bg-paper p-7 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)] sm:p-9">
        <div className="flex flex-wrap items-center gap-5">
          <AssistantMark />
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[1.5rem] font-extrabold tracking-[-0.01em] text-navy">{name}</span>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "offline" ? "bg-field" : status === "checking" ? "bg-line" : "bg-navy"
                }`}
              />
            </div>
            <p className="label text-subtle">{statusLabel}</p>
          </div>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {goodAt.map((g) => (
            <li
              key={g}
              className="label rounded-full border border-navy/12 bg-navy/[0.035] px-3.5 py-1.5 text-navy"
            >
              {g}
            </li>
          ))}
        </ul>

        <div className="mt-7 rounded-xl border border-line">
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label={`Conversation with ${name}`}
            className="max-h-[22rem] overflow-y-auto px-5 py-5"
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
                        t.role === "user" ? "bg-navy text-cream" : "bg-cream text-ink"
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
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => send(c.prompt)}
                disabled={busy}
                className={`inline-flex min-h-[44px] items-center rounded-md border px-4 text-left text-[0.9rem] disabled:opacity-60 ${
                  c.kind === "conversion"
                    ? "border-navy bg-navy text-cream font-semibold"
                    : "border-navy/55 text-ink hover:border-navy"
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
            className="flex items-end gap-2 border-t border-line px-5 py-4"
          >
            <div className="flex-1">
              <label htmlFor="assistant-input" className="sr-only">
                Ask {name} a question
              </label>
              <input
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question"
                className="min-h-[48px] w-full rounded-md border border-field bg-paper px-3 text-[1rem] text-ink placeholder:text-subtle/70"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-navy/55 px-5 text-[0.95rem] font-semibold text-navy disabled:opacity-50"
            >
              Ask
            </button>
          </form>

          <p className="border-t border-line px-5 py-3 text-[0.85rem] leading-relaxed text-subtle">
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
