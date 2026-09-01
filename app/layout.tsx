import type { Metadata } from "next";
import "./globals.css";
import { site, telHref, smsHref } from "@/lib/content";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/ui";

/**
 * Typography.
 *
 * Inter for text, JetBrains Mono for eyebrows, labels and figures. The mono face
 * is where the "high tech" adjective from intake actually lives, and it keeps
 * the carrying cost figures tabular so they do not change width as the visitor
 * types.
 *
 * Loaded with a stylesheet link plus preconnect rather than next/font. Both
 * work; next/font self hosts and scores marginally better, and switching to it
 * is a contained change in this file if you want that after launch. Every rule
 * that uses these faces declares a full fallback stack in globals.css, so the
 * page is correct before the stylesheet arrives and correct if it never does.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap";

const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: site.siteName, template: `%s` },
  description: site.tagline,
  openGraph: { type: "website", siteName: site.siteName, locale: "en_US" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = site.compliance;

  /**
   * JSON-LD. Only fields backed by a verified fact are emitted. The license
   * number is absent because it is not confirmed, and an unconfirmed number in
   * structured data is still a published claim.
   */
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.agentName,
    telephone: site.phone.e164,
    email: site.email,
    url: origin,
    areaServed: site.serviceAreas.map((a) => ({
      "@type": "City",
      name: a.name,
      addressRegion: "KS",
    })),
  };
  if (c.brokerageName.value) {
    jsonLd.parentOrganization = {
      "@type": "RealEstateAgent",
      name: c.brokerageName.value,
    };
  }
  if (c.brokerageAddress.value) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: "6530 E. 13th St. N.",
      addressLocality: "Wichita",
      addressRegion: "KS",
      postalCode: "67206",
      addressCountry: "US",
    };
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <SkipLink />
        <Header
          agentName={site.agentName}
          phoneDisplay={site.phone.display}
          telHref={telHref()}
          smsHref={smsHref()}
        />
        <main id="main">{children}</main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
