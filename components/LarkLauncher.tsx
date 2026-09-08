"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Lark } from "./Lark";
import { Assistant } from "./Assistant";
import type { AssistantChip } from "@/lib/schema";

/* ============================================================================
   LarkLauncher.tsx — Lark as a persistent widget, not a page section.

   WHY THIS WRAPS THE EXISTING ASSISTANT RATHER THAN REPLACING IT.

   components/Assistant.tsx already holds every hard-won behaviour: the
   two-turn capture bound, the offline state that renders on the server so a
   visitor with no API key configured sees the phone number rather than a
   spinner, the refusal handling, the source tagging, and the tests that cover
   all of it. Rewriting that to move it into a corner would throw away work
   that took several passes to get right, in exchange for a different shell.

   So the shell is the only new thing. The launcher owns open/closed, the
   collapsed pill, the panel chrome and the page-context chips. Everything
   inside the panel is the component that already worked.

   THE THINGS THE BRIEF IS SPECIFIC ABOUT, AND WHY EACH ONE IS HERE:

   - Small bottom-right pill. "Lark", a green online dot, and a short prompt.
   - No bird lore. The meadowlark MARK stays as a silent avatar, which Garrett
     confirmed. What is gone is the paragraph explaining what a lark is: an
     avatar is a face, not a story.
   - It must never cover a form submit button, consent control or primary CTA
     on mobile. See the note on the mobile panel below, which is why the
     expanded state is full-width on a phone rather than a floating card.
   - Page-aware prompts, so it does not feel like the same widget bolted onto
     eight different pages.
   ============================================================================ */

/*
 * Chips per route, from section 11.3 of the brief.
 *
 * Not in content/site.json, deliberately: these are a property of the
 * INTERFACE, not of the page's copy. A chip is a question the visitor might
 * ask given where they are standing, and it changes when the route's job
 * changes, not when its wording does.
 */
const CHIPS_BY_ROUTE: Record<string, string[]> = {
  /* Three per route. The brief lists four for home; "Help me analyze a rental"
     is the one dropped, because the investors page carries it and a home-page
     chip that duplicates a page-specific one earns the least. */
  "/": [
    "What can I afford?",
    "What could my home sell for?",
    "Can I use my VA loan?",
  ],
  "/buy": [
    "What would my payment look like?",
    "How much cash might I need?",
    "How does the buying process work?",
  ],
  "/sell": [
    "What could my home sell for?",
    "What might I walk away with?",
    "Should I make repairs first?",
  ],
  "/veterans": [
    "Can I use my VA loan again?",
    "Do VA loans require a down payment?",
    "What is the VA funding fee?",
  ],
  "/investors": [
    "What is a DSCR loan?",
    "What does NOI mean?",
    "Help me analyze a rental property.",
  ],
};

const FALLBACK_CHIPS = [
  "What can I afford?",
  "What could my home sell for?",
  "I have a different question.",
];

export function LarkLauncher({
  name,
  siteName,
  introduction,
  goodAt,
  phoneDisplay,
  telHref,
  initialConfigured,
}: {
  name: string;
  siteName: string;
  introduction: string;
  goodAt: string[];
  phoneDisplay: string;
  telHref: string;
  initialConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
   * Exactly three, because AssistantChip.array().length(3) in lib/schema.ts
   * says so and the Assistant's layout is built for three. The home list below
   * carries a fourth as a comment rather than a runtime surprise: four chips
   * wrap onto a second row in a 26rem panel and the schema would reject them
   * anyway.
   *
   * `kind` splits an informational chip from one that leads toward a handoff.
   * The last chip in each set is the conversion one.
   */
  const labels = CHIPS_BY_ROUTE[pathname] ?? FALLBACK_CHIPS;
  const chips: AssistantChip[] = labels.slice(0, 3).map((label, i) => ({
    label,
    prompt: label,
    kind: i === 2 ? "conversion" : "info",
  }));

  /*
   * Escape closes, and focus returns to the launcher.
   *
   * Returning focus is not politeness. Without it, a keyboard visitor who
   * closes the panel lands at the top of the document and has to tab through
   * the entire page again to get back to where they were.
   */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/*
        The collapsed pill.

        bottom-4 right-4 on a phone, and the panel below is full width there.
        The brief forbids covering a submit button or a consent control, and a
        floating card that sits over the middle of a 390px screen does exactly
        that. A small pill in the corner does not.
      */}
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="lark-panel"
          className="fixed bottom-4 right-4 z-[70] flex items-center gap-3 rounded-full border border-gold/50 bg-navy py-2.5 pl-2.5 pr-5 text-left shadow-[0_16px_40px_-16px_rgb(23_42_58_/_0.55)] transition-transform duration-200 ease-out hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-lift">
            {/* The mark, silent. No explanation of what a lark is anywhere. */}
            <Lark size={30} state={initialConfigured ? "idle" : "disconnected"} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[0.95rem] font-semibold text-cream">{name}</span>
              {/*
                The online dot, with a text label for screen readers. The brief
                also says never rely on colour alone for a state, so the dot
                carries a ring as well as a fill.
              */}
              <span
                className={`h-2 w-2 rounded-full ring-2 ${
                  initialConfigured ? "bg-[#4ADE80] ring-[#4ADE80]/30" : "bg-subtle ring-subtle/30"
                }`}
              />
              <span className="sr-only">{initialConfigured ? "online" : "offline"}</span>
            </span>
            <span className="block text-[0.8rem] leading-tight text-dim">
              Have a real estate question?
            </span>
          </span>
        </button>
      )}

      {/*
        The expanded panel.

        Not a full-screen takeover on desktop, per the brief: a fixed card in
        the corner, capped so it never grows past the viewport. On a phone it
        IS effectively full width, because a 390px screen has no room for a
        floating card that does not cover something that matters.

        max-h uses dvh rather than vh so iOS Safari's collapsing toolbar does
        not push the input off the bottom of the screen.
      */}
      {open && (
        <div
          id="lark-panel"
          ref={panelRef}
          role="dialog"
          aria-label={`${name}, real estate assistant`}
          className="fixed inset-x-3 bottom-3 z-[70] flex max-h-[min(78dvh,40rem)] flex-col overflow-hidden rounded-[1.25rem] border border-gold/40 bg-paper shadow-[0_30px_70px_-24px_rgb(23_42_58_/_0.5)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[26rem]"
        >
          <div className="flex items-center gap-3 border-b border-ink/10 bg-navy px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-lift">
              <Lark size={26} state={initialConfigured ? "idle" : "disconnected"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.95rem] font-semibold text-cream">{name}</span>
              <span className="block text-[0.78rem] leading-tight text-dim">
                Real estate assistant
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label="Close the assistant"
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-dim transition-colors hover:bg-cream/10 hover:text-cream"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/*
            The conversation itself, unchanged. Every guardrail, the two-turn
            capture bound, the offline copy and the source tagging come with
            it. `compact` tells Assistant it is in a panel rather than a band,
            so it drops the band heading and its own outer card.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Assistant
              compact
              heading=""
              intro=""
              name={name}
              siteName={siteName}
              introduction={introduction}
              chips={chips}
              goodAt={goodAt}
              phoneDisplay={phoneDisplay}
              telHref={telHref}
              route={pathname}
              initialConfigured={initialConfigured}
            />
          </div>
        </div>
      )}
    </>
  );
}
