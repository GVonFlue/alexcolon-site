import Link from "next/link";
import { site, complianceLines, telHref, smsHref } from "@/lib/content";

const NAV = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/veterans", label: "Veterans" },
  { href: "/investors", label: "Investors" },
  { href: "/areas", label: "Areas" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function EqualHousingMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        d="M12 3.4 2.8 10.2h2.3V20h13.8v-9.8h2.3L12 3.4Zm0 2.6 5.6 4.2V18H6.4v-7.8L12 6Z"
        fill="currentColor"
      />
      <path d="M9 12.4h6v1.5H9v-1.5Zm0 2.8h6v1.5H9v-1.5Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Compliance renders in the footer of every route, in the rendered HTML rather
 * than only in a component that could be omitted from a page.
 *
 * K.S.A. 58-3086 requires the supervising broker's business or trade name in a
 * readable and identifiable manner on all advertising, and Kansas is stricter
 * than the NAR code here: it has to appear directly, not behind a link. So the
 * brokerage line is text on the page, not a link to a disclosures page.
 */
export function Footer() {
  const lines = complianceLines();
  const licensePending = site.compliance.licenseNumber.value === null;

  return (
    <footer className="border-t border-line bg-navy text-cream on-dark">
      <div className="mx-auto w-full max-w-[76rem] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[1.15rem] font-semibold tracking-[-0.015em]">{site.agentName}</p>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-dim">{site.tagline}</p>

            <div className="mt-6 flex flex-col gap-1">
              {/* Tappable tel in the footer, on every route. */}
              <a href={telHref()} className="inline-flex min-h-[44px] items-center text-[1.05rem] font-semibold">
                <span className="figure">{site.phone.display}</span>
              </a>
              <a href={smsHref()} className="inline-flex min-h-[44px] items-center text-[0.98rem] text-dim hover:text-cream">
                Text the same number
              </a>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex min-h-[44px] items-center text-[0.98rem] text-dim hover:text-cream"
              >
                {site.email}
              </a>
            </div>
          </div>

          <div>
            <nav aria-label="Footer">
              <ul className="grid grid-cols-2 gap-x-6">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className="inline-flex min-h-[44px] items-center text-[0.98rem] text-dim hover:text-cream"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Real profiles only. An icon pointing nowhere generates the support
                call it exists to prevent, so an empty list renders nothing. */}
            {site.social.length > 0 && (
              <ul className="mt-4 flex gap-4">
                {site.social.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} className="text-dim hover:text-cream" rel="noopener noreferrer" target="_blank">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-cream/15 pt-8">
          <div className="flex flex-col gap-4 text-[0.86rem] leading-relaxed text-dim sm:flex-row sm:items-start sm:gap-6">
            {site.compliance.equalHousing && (
              <p className="flex items-center gap-2 whitespace-nowrap">
                <EqualHousingMark />
                <span>Equal Housing Opportunity</span>
              </p>
            )}
            <div className="space-y-1">
              {lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
              {licensePending && (
                // Withheld rather than guessed. Hard stops 1 and 6.
                <p className="sr-only">
                  Licensee identification is pending confirmation and is intentionally not
                  displayed.
                </p>
              )}
              <p>
                © {new Date().getFullYear()} {site.agentName}. Information on this site is
                provided for general reference and is not a representation about any specific
                property.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
