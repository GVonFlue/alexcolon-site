import type { Metadata } from "next";
import type { PageContent } from "./schema";
import { Bands } from "@/components/Bands";

/**
 * Every route is the same three lines: metadata from content, bands from
 * content. Nothing about a page's copy lives in a component, which is the whole
 * point of the content layer and what makes the self-edit portal possible later.
 */
export function metadataFor(page: PageContent): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.route },
    openGraph: { title: page.title, description: page.description, url: page.route },
  };
}

export function renderPage(page: PageContent) {
  return <Bands page={page} />;
}
