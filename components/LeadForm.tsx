"use client";

import { useEffect, useRef, useState } from "react";
import type { LeadMagnet } from "@/lib/schema";
import { Glyph } from "./ui";

/**
 * Forms work with JavaScript disabled. This is a real form element with a real
 * action, and JS is enhancement. Without it the browser posts form encoded and
 * the endpoint answers 303 to /thanks carrying the success state.
 *
 * The honeypot and the minimum time on form are the spam controls. No CAPTCHA:
 * at this traffic volume a CAPTCHA costs more conversions than it saves.
 */
export function LeadForm({
  magnet,
  route,
  detailLabel,
  detailPlaceholder,
}: {
  magnet: LeadMagnet;
  route: string;
  detailLabel?: string;
  detailPlaceholder?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const startedAt = useRef<number>(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  /**
   * Carries a town selected on the service area map into this form, so the
   * visitor arrives with their question already started rather than facing an
   * empty box. Read from location rather than useSearchParams on purpose: the
   * hook opts the whole route out of static rendering, and a prefill is not
   * worth that.
   */
  useEffect(() => {
    const about = new URLSearchParams(window.location.search).get("about");
    if (!about) return;
    const clean = about.replace(/[^\p{L}\p{N}\s'.-]/gu, "").slice(0, 60).trim();
    if (clean) setMessage(`I am looking at ${clean}. `);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => {
      payload[k] = typeof v === "string" ? v : "";
    });
    payload.startedAt = String(startedAt.current);
    delete payload.redirectTo;

    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setState("error");
        setError(data.error ?? "That did not go through. Call or text (813) 613-8822 instead.");
        return;
      }
      setState("done");
      form.reset();
      // form.reset() does not clear a controlled field.
      setMessage("");
    } catch {
      setState("error");
      setError(
        "Something went wrong on our end, not yours. Call or text (813) 613-8822 and it will get handled.",
      );
    }
  }

  if (state === "done") {
    return (
      <div
        className="rounded-lg border border-navy/20 bg-paper p-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-[1.05rem] font-semibold text-navy">Sent.</p>
        <p className="measure mt-2 text-[1rem] leading-[1.7] text-subtle">
          {magnet.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action="/api/lead"
      method="post"
      onSubmit={onSubmit}
      className="rounded-lg border border-navy/15 bg-paper p-6 sm:p-7"
      noValidate={false}
    >
      {/* Never trusted from the client beyond membership in the known set. */}
      <input type="hidden" name="sourceTag" value={magnet.sourceTag} />
      <input type="hidden" name="route" value={route} />
      <input type="hidden" name="redirectTo" value={route} />
      <input type="hidden" name="startedAt" value="" />

      {/* Honeypot. Off screen rather than display:none, hidden from assistive
          technology, and skipped by the keyboard. A bot that fills it is told it
          succeeded and nothing is stored, so it learns nothing. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`company-${magnet.id}`}>Company</label>
        <input id={`company-${magnet.id}`} type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`name-${magnet.id}`} className="label mb-2 block text-subtle">
            Your name
          </label>
          <input
            id={`name-${magnet.id}`}
            name="name"
            type="text"
            required
            autoComplete="name"
            className="min-h-[48px] w-full rounded-md border border-field bg-paper px-3 text-[1rem] text-ink"
          />
        </div>

        <div>
          <label htmlFor={`email-${magnet.id}`} className="label mb-2 block text-subtle">
            Email
          </label>
          <input
            id={`email-${magnet.id}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-[48px] w-full rounded-md border border-field bg-paper px-3 text-[1rem] text-ink"
          />
        </div>

        <div>
          <label htmlFor={`phone-${magnet.id}`} className="label mb-2 block text-subtle">
            Phone
          </label>
          <input
            id={`phone-${magnet.id}`}
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-describedby={`phone-help-${magnet.id}`}
            className="min-h-[48px] w-full rounded-md border border-field bg-paper px-3 text-[1rem] text-ink"
          />
          {/* Optional fields say why they are wanted. */}
          <p id={`phone-help-${magnet.id}`} className="mt-2 text-[0.85rem] leading-snug text-subtle">
            Optional, so Alex can text you back instead of writing a long email.
          </p>
        </div>

        {detailLabel && (
          <div className="sm:col-span-2">
            <label htmlFor={`detail-${magnet.id}`} className="label mb-2 block text-subtle">
              {detailLabel}
            </label>
            <input
              id={`detail-${magnet.id}`}
              name="detail"
              type="text"
              placeholder={detailPlaceholder}
              className="min-h-[48px] w-full rounded-md border border-field bg-paper px-3 text-[1rem] text-ink placeholder:text-subtle/70"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor={`message-${magnet.id}`} className="label mb-2 block text-subtle">
            Anything Alex should know
          </label>
          <textarea
            id={`message-${magnet.id}`}
            name="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-field bg-paper px-3 py-3 text-[1rem] leading-relaxed text-ink"
          />
        </div>
      </div>

      {state === "error" && error && (
        <p role="alert" className="mt-4 rounded-md border border-navy/55 bg-cream px-4 py-3 text-[0.95rem] text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="group mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-gold px-6 text-[1rem] font-semibold text-navy shadow-[0_1px_0_rgba(23,42,58,0.18)] transition-[filter] duration-150 hover:brightness-[1.04] active:brightness-[0.98] disabled:opacity-70 sm:w-auto"
      >
        {state === "sending" ? "Sending" : magnet.submitLabel}
        {state !== "sending" && <Glyph />}
      </button>

      {/* Defuses the obvious objection at the point of friction. */}
      <p className="measure mt-4 text-[0.88rem] leading-relaxed text-subtle">{magnet.consentLine}</p>
    </form>
  );
}
