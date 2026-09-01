import type { MetadataRoute } from "next";

/**
 * Note for the cutover: there is no noindex here and there must not be one. A
 * noindex header left over from a preview environment launches a site invisible
 * to Google and nobody notices for weeks. If a preview deployment needs to be
 * hidden, hide it with Vercel's deployment protection, not with a header that
 * ships to production.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/thanks"] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
