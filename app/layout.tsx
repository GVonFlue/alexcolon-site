import type { Metadata } from "next";
import "./globals.css";
import { site, telHref, smsHref } from "@/lib/content";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/ui";
import { isIndexable, siteOrigin } from "@/lib/origin";

/**
 * Typography.
 *
 * Archivo for display, Inter for text, JetBrains Mono for eyebrows, labels and
 * figures.
 *
 * Archivo is new in v1.1 and it replaces "the display face is the body face
 * set larger", which was the honest description of every heading on this site
 * up to v6. Inter is an excellent text face and a characterless display one:
 * at 900 weight and -0.04em it goes soft and generic, which is most of why the
 * fold read as competent rather than as designed. Archivo is a grotesque with
 * squared terminals, narrow apertures and a genuinely different rhythm, so it
 * changes the voice of the headings without touching the body copy that has to
 * stay quiet and readable.
 *
 * It also keeps the two rules that constrain this choice. It is not a serif,
 * so the cream-plus-serif-revival tell named in section 6 is still avoided,
 * and it is not a geometric sans, so the headings are not the same circles and
 * straight lines every AI-built site reaches for.
 *
 * The mono face is where the "high tech" adjective from intake actually lives,
 * and it keeps the carrying cost figures tabular so they do not change width
 * as the visitor types.
 *
 * Loaded with a stylesheet link plus preconnect rather than next/font. Both
 * work; next/font self hosts and scores marginally better, and switching to it
 * is a contained change in this file if you want that after launch. Every rule
 * that uses these faces declares a full fallback stack in globals.css, so the
 * page is correct before the stylesheet arrives and correct if it never does.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: site.siteName, template: `%s` },
  description: site.tagline,
  openGraph: { type: "website", siteName: site.siteName, locale: "en_US" },
  /**
   * The card type. It was `summary` with no image, which is what every link to
   * this site looked like: a bare title, a bare line of text, and nothing to
   * see. Alex's primary action is a text message, so a link preview in a
   * message thread is the first thing most people will ever see of this site,
   * and an empty one is the worst possible first impression of a site whose
   * whole argument is that it answers things properly.
   *
   * The image itself is generated at app/opengraph-image.tsx. Next emits the
   * og:image and twitter:image tags for it automatically from the file
   * convention, so there is no URL written down here to go stale.
   */
  twitter: { card: "summary_large_image" },
  /**
   * Host-conditional. `isIndexable` is true off Vercel and on every Vercel
   * production deployment; it is false on a preview or development one, so a
   * vercel.app preview cannot be indexed and then compete with the real domain
   * after cutover. See lib/origin.ts.
   */
  robots: isIndexable
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
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
    url: siteOrigin,
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
          brokerageName={c.brokerageName.value}
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
