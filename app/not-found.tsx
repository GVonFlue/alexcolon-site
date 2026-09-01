import Link from "next/link";
import { site, telHref, smsHref } from "@/lib/content";
import { CtaLink, Eyebrow, Section } from "@/components/ui";

export const metadata = {
  title: "Page not found | Alexander Colón",
  description:
    "That page is not here. The main sections of the site and Alex's phone number are on this page so you can carry on.",
};

/**
 * A build with no 404 page is unfinished. Branded, and it gives a way back
 * rather than dead ending, including the phone number, because someone who hit
 * a broken link is exactly the visitor most likely to leave.
 */
export default function NotFound() {
  const routes = [
    { href: "/buy", label: "Buying a house" },
    { href: "/sell", label: "Selling a house" },
    { href: "/veterans", label: "VA loan purchases" },
    { href: "/investors", label: "Investment property" },
    { href: "/areas", label: "Where Alex works" },
    { href: "/about", label: "About Alex" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <Section tone="cream" className="min-h-[60vh]">
      <Eyebrow>404</Eyebrow>
      <h1 className="display max-w-[36rem] text-[2rem] font-semibold leading-[1.12] text-navy sm:text-[2.6rem]">
        That page is not here
      </h1>
      <p className="measure mt-5 text-[1.05rem] leading-[1.7] text-subtle">
        Either the link was wrong or the page moved. Everything on the site is listed below, and
        if you were looking for something specific you can text Alex and ask where it went.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <CtaLink
          cta={{ label: "Text Alex a question", href: smsHref(), kind: "direct", emphasis: "primary" }}
        />
        <CtaLink
          cta={{
            label: `Call ${site.phone.display}`,
            href: telHref(),
            kind: "direct",
            emphasis: "secondary",
          }}
        />
      </div>

      <nav aria-label="All pages" className="mt-12 border-t border-line pt-8">
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="inline-flex min-h-[44px] items-center text-[1rem] text-navy underline underline-offset-4 decoration-navy/30 hover:decoration-navy"
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Section>
  );
}
