import Link from "next/link";
import { site, telHref, smsHref } from "@/lib/content";
import { CtaLink, Eyebrow, Section } from "@/components/ui";

export const metadata = {
  title: "Sent | Alexander Colón",
  description:
    "Your message reached Alex. He answers these himself, so the reply comes from him rather than from an autoresponder.",
  robots: { index: false, follow: true },
};

/**
 * The no-JavaScript success state. The lead endpoint answers a form encoded POST
 * with a 303 to this page, so a visitor with JS disabled gets a real
 * confirmation rather than a raw JSON body.
 */
export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const backHref = from && from.startsWith("/") ? from : "/";

  return (
    <Section tone="cream" className="min-h-[60vh]">
      <Eyebrow>Sent</Eyebrow>
      <h1 className="display max-w-[36rem] text-[2rem] font-semibold leading-[1.12] text-navy sm:text-[2.6rem]">
        That reached Alex
      </h1>
      <p className="measure mt-5 text-[1.05rem] leading-[1.7] text-subtle">
        He answers these himself, so the reply comes from him rather than from an autoresponder.
        If what you sent is time sensitive, texting is faster than waiting on the reply.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <CtaLink
          cta={{ label: "Text Alex a question", href: smsHref(), kind: "direct", emphasis: "primary" }}
        />
        <CtaLink
          cta={{
            label: `Call ${site.phone.display}`,
            href: telHref(),
            kind: "direct",
            emphasis: "secondary",
          }}
        />
      </div>

      <p className="mt-10">
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center text-[1rem] text-navy underline underline-offset-4 decoration-navy/30 hover:decoration-navy"
        >
          Back to where you were
        </Link>
      </p>
    </Section>
  );
}
