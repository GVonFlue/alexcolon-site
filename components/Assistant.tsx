"use client";

import { useEffect, useRef, useState } from "react";

type Chip = { label: string; prompt: string; kind: "info" | "conversion" };
type Turn = { role: "user" | "assistant"; content: string };

/**
 * Embedded in the page body in the top third, named, first person, with a live
 * status line. Not a floating bubble nobody clicks.
 *
 * The page never ends on this component. Every route closes on a CTA.
 */
export function Assistant({
  name,
  introduction,
  chips,
  phoneDisplay,
  telHref,
}: {
  name: string;
  introduction: string;
  chips: Chip[];
  phoneDisplay: string;
  telHref: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
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
      if (data.offline) setOffline(true);
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

  return (
    <div className="rounded-lg border border-navy/15 bg-paper">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${offline ? "bg-field" : "bg-navy"}`}
        />
        <p className="label text-subtle">
          {name} · {offline ? "not connected" : busy ? "thinking" : "ready"}
        </p>
      </div>

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
  );
}
