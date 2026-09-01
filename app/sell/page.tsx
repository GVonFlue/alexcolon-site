import { pages } from "@/lib/content";
import { metadataFor, renderPage } from "@/lib/page-factory";

export const metadata = metadataFor(pages.sell);

export default function Page() {
  return renderPage(pages.sell);
}
