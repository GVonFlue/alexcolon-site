import type { MetadataRoute } from "next";
import { isIndexable, siteOrigin } from "@/lib/origin";

/**
 * Note for the cutover: production must never carry a blanket disallow. A
 * noindex left over from a preview environment launches a site invisible to
 * Google and nobody notices for weeks.
 *
 * That is why the rule below is host-conditional rather than a static string.
 * `isIndexable` (lib/origin.ts) is true off Vercel and true on every Vercel
 * production deployment, including one with SITE_ORIGIN still unset, so the
 * only host that gets a disallow is a preview or development deployment: the
 * vercel.app URL that would otherwise be indexed and then compete with the
 * real domain after cutover. It switches itself off, with no edit here, the
 * moment the deployment is a production one or SITE_ORIGIN names the host.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/thanks"] }],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
