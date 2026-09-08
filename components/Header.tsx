"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CtaLink } from "./ui";

const NAV = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/veterans", label: "Veterans" },
  { href: "/investors", label: "Investors" },
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  /*
   * The two header states the brief asks for: full presentation at the top,
   * shorter and quieter once the visitor has started reading.
   *
   * A 24px threshold rather than 0, so a one-pixel scroll or an iOS rubber-band
   * bounce does not flicker the bar. `passive: true` because this listener
   * never calls preventDefault and marking it so keeps it off the scroll's
   * critical path.
   *
   * The initial read happens before the listener is attached: a browser that
   * restores scroll position on back-navigation lands mid-page with no scroll
   * event, and without this the header would render in its top state over
   * content it is supposed to be floating above.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * Every piece of type in this bar has to flip with the ground under it.
   * Derived once, here, rather than repeated at seven call sites: the first
   * version of this hardcoded text-cream throughout and the scrolled state
   * rendered cream on white, which is invisible rather than merely wrong.
   */
  /*
   * THE BAR IS LIGHT IN BOTH STATES, and that is the fix for the washed-out
   * header.
   *
   * The first version made the top state transparent with `on-dark`, on the
   * assumption it sat on the navy hero. It does not: app/ground.css frames the
   * page in white gutters and the bar floats ABOVE the hero on the white page
   * background. Cream type on white is invisible, inside a gold box.
   *
   * On a white-first site the header is a light object throughout. What
   * changes between the states is weight, not colour: solid and full height at
   * the top, translucent with a blur and less padding once scrolling. That is
   * what the brief asks for — "full branded presentation" then "slightly
   * shorter, more subdued" — and it never has to guess what is behind it.
   */
  const strong = "text-navy";
  const quiet = "text-subtle";
  const quietHover = "hover:text-navy";
  const edge = "border-ink/25";

  return (
    /*
     * LIGHT-FIRST, AND TWO STATES.
     *
     * This was translucent navy, chosen when every band on every route was
     * navy and a light bar read as a different site. The brief inverts that:
     * white is the dominant ground now, so a navy bar would be the loudest
     * object on a quiet page and would fight the hero it sits on top of.
     *
     * At the top:      transparent, no border, full height. The hero shows
     *                  through and the header reads as part of it.
     * After scrolling: translucent white with a blur and a hairline, shorter,
     *                  and visibly subordinate to the page.
     *
     * `on-dark` is applied ONLY in the top state, because that is the only
     * state sitting on the navy hero. Once scrolled, the bar is light and the
     * type has to flip with it — carrying on-dark into the scrolled state
     * would leave cream text on a white bar, which is the exact bug this
     * comment exists to stop somebody reintroducing.
     */
    <header
      className={[
        "sticky top-0 z-50 transition-[background-color,border-color,padding,backdrop-filter] duration-300 ease-out",
        scrolled
          ? "border border-ink/10 bg-paper/85 shadow-[0_10px_30px_-18px_rgb(23_42_58_/_0.35)] backdrop-blur-md"
          : "border border-gold/45 bg-paper shadow-[0_14px_34px_-20px_rgb(23_42_58_/_0.4)]",
      ].join(" ")}
    >
      {/* The height change is the other half of the state: 12px of padding at
          the top, 8px once scrolled. Small enough to read as settling rather
          than as the page jumping. */}
      <div
        className={[
          "mx-auto flex w-full max-w-[76rem] items-center gap-4 px-5 transition-[padding] duration-300 ease-out sm:px-8",
          scrolled ? "py-2" : "py-3",
        ].join(" ")}
      >
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
            className={`text-[1.02rem] font-semibold tracking-[-0.015em] ${strong}`}
          >
            {agentName}
          </span>
          {brokerageName && (
            <span
              data-compliance-part="brokerage"
              className={`hidden text-[0.72rem] font-medium tracking-[0.01em] ${quiet} sm:block`}
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
                      active ? "bg-navy font-semibold text-cream" : `${quiet} ${quietHover}`
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
          className={`ml-auto hidden min-h-[44px] items-center text-[0.95rem] ${quiet} ${quietHover} lg:ml-4 lg:inline-flex`}
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
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border ${edge} ${strong} lg:hidden`}
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
