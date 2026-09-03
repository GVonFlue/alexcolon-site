import type { MetadataRoute } from "next";
import { allPages } from "@/lib/content";
import { absoluteUrl } from "@/lib/origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return allPages.map((p) => ({
    url: absoluteUrl(p.route),
    lastModified: now,
    changeFrequency: "monthly",
    priority: p.route === "/" ? 1 : 0.7,
  }));
}
