import { pages } from "@/lib/content";
import { metadataFor, renderPage } from "@/lib/page-factory";

export const metadata = metadataFor(pages.about);

export default function Page() {
  return renderPage(pages.about);
}
