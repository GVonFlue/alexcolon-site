"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
 */
export function Header({
  phoneDisplay,
  telHref,
  smsHref,
  agentName,
}: {
  phoneDisplay: string;
  telHref: string;
  smsHref: string;
  agentName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[76rem] items-center gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className="flex min-h-[44px] shrink-0 items-center text-[1.02rem] font-semibold tracking-[-0.015em] text-navy"
        >
          {agentName}
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[44px] items-center rounded px-3 text-[0.95rem] ${
                      active ? "font-semibold text-navy" : "text-subtle hover:text-navy"
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
          className="ml-auto hidden min-h-[44px] items-center text-[0.95rem] text-subtle hover:text-navy lg:ml-4 lg:inline-flex"
        >
          <span className="figure">{phoneDisplay}</span>
        </a>

        <a
          href={smsHref}
          className="ml-auto inline-flex min-h-[44px] items-center justify-center rounded-md border border-navy/55 px-4 text-[0.92rem] font-semibold text-navy hover:border-navy hover:bg-navy/[0.04] lg:ml-3"
        >
          Text Alex
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-navy/55 text-navy lg:hidden"
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
          first paint and no animation gates reaching the navigation. */}
      <div id="mobile-nav" hidden={!open} className="border-t border-line lg:hidden">
        <ul className="mx-auto w-full max-w-[76rem] px-5 py-2 sm:px-8">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center border-b border-line/70 text-[1rem] text-ink"
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={telHref} className="flex min-h-[48px] items-center text-[1rem] text-ink">
              Call <span className="figure ml-2">{phoneDisplay}</span>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
