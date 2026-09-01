import { pages } from "@/lib/content";
import { metadataFor, renderPage } from "@/lib/page-factory";

export const metadata = metadataFor(pages.veterans);

export default function Page() {
  return renderPage(pages.veterans);
}
