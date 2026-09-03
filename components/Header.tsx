"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CtaLink } from "./ui";

const NAV = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/veterans", label: "Veterans" },
  { href: "/investors", label: "Investors" },
  { href: "/areas", label: "Areas" },
  { href: "/about", label: "About" },
];

/**
 * The persistent nav CTA required on every page.
 *
 * It is secondary styled on purpose. The hero on every route carries the one
 * primary styled action, and a primary button in a sticky header would put two
 * of them in the same screenful, which is a Hick's Law defect even though it
 * feels like helpfulness.
 *
 * Translucent navy with a blur, not the flat cream bar this carried before.
 * Every route is navy-dominant now (see Bands.tsx), so a cream header sat as
 * a hard, light seam across the top of a dark page and read as bolted on
 * from a different site. `on-dark` picks up the same secondary/quiet CTA and
 * gold-focus-ring overrides every other dark section already gets, so this
 * needed no styling invented just for the header.
 */
export function Header({
  phoneDisplay,
  telHref,
  smsHref,
  agentName,
  brokerageName,
}: {
  phoneDisplay: string;
  telHref: string;
  smsHref: string;
  agentName: string;
  /** Null only if the brokerage name is somehow unverified; then no lockup. */
  brokerageName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    // Translucent navy, not flat cream: at 92 percent opacity plus a blur the
    // composited worst case (this over the lightest thing that can scroll
    // under it) is still far past AA, verified in audit-contrast.mjs, and the
    // blur means nothing sharp from the page below shows through the way flat
    // 95 percent cream once let band headings ghost through while scrolling.
    // on-dark picks up the secondary CTA and gold focus ring every other dark
    // section already gets.
    <header className="on-dark sticky top-0 z-50 border-b border-cream/12 bg-navy/92 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[76rem] items-center gap-4 px-5 py-3 sm:px-8">
        {/*
          The Kansas lockup. K.S.A. 58-3086 requires the supervising broker's
          business name in a readable and identifiable manner, and the
          licensee's own name must not be given greater prominence. Up to v6
          the brokerage appeared only in the footer compliance line, which is
          on the page but not adjacent to his name; here they are one block.

          The two font sizes are registered in lib/compliance-type.ts, which
          throws at module load if the agent name ever exceeds twice the
          brokerage name, and scripts/shots.mjs measures what the browser
          actually computed so the constant and the rendering cannot drift.
        */}
        <Link
          href="/"
          data-compliance-lockup="sticky header wordmark"
          className="flex min-h-[44px] shrink-0 flex-col justify-center leading-tight"
        >
          <span
            data-compliance-part="agent"
            className="text-[1.02rem] font-semibold tracking-[-0.015em] text-cream"
          >
            {agentName}
          </span>
          {brokerageName && (
            <span
              data-compliance-part="brokerage"
              className="hidden text-[0.72rem] font-medium tracking-[0.01em] text-dim sm:block"
            >
              {brokerageName}
            </span>
          )}
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-0.5 rounded-full border border-cream/15 bg-cream/[0.06] p-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[38px] items-center rounded-full px-3.5 text-[0.92rem] transition-colors duration-150 ${
                      active ? "bg-cream font-semibold text-navy" : "text-dim hover:text-cream"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tappable tel in the header, on every route. */}
        <a
          href={telHref}
          className="ml-auto hidden min-h-[44px] items-center text-[0.95rem] text-dim hover:text-cream lg:ml-4 lg:inline-flex"
        >
          <span className="figure">{phoneDisplay}</span>
        </a>

        <CtaLink
          cta={{ label: "Text Alex", href: smsHref, kind: "direct", emphasis: "secondary" }}
          className="ml-auto !min-h-[44px] !px-4 !py-0 lg:ml-3"
        />

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-cream/50 text-cream lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
            {open ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" fill="none" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" fill="none" />
            )}
          </svg>
        </button>
      </div>

      {/* Rendered in the DOM and toggled with hidden, so the markup is correct on
          first paint and no animation gates reaching the navigation. Its own
          opaque navy, not translucent: this panel sits over whatever content
          is underneath rather than at the top edge where the blur above lives,
          so it gets a plain solid fill instead. */}
      <div id="mobile-nav" hidden={!open} className="border-t border-cream/12 bg-navy lg:hidden">
        <ul className="mx-auto w-full max-w-[76rem] px-5 py-2 sm:px-8">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center border-b border-cream/10 text-[1rem] text-cream"
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={telHref} className="flex min-h-[48px] items-center text-[1rem] text-cream">
              Call <span className="figure ml-2">{phoneDisplay}</span>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
