import type { MetadataRoute } from "next";
import { allPages } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000";
  const now = new Date();
  return allPages.map((p) => ({
    url: `${origin}${p.route === "/" ? "" : p.route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: p.route === "/" ? 1 : 0.7,
  }));
}
