import Link from "next/link";
import type { Band, PageContent } from "@/lib/schema";
import { site, magnet, telHref, smsHref } from "@/lib/content";
import { CtaLink, Eyebrow, H2, Prose, Section } from "./ui";
import { ServiceAreaMap } from "./ServiceAreaMap";
import { Assistant } from "./Assistant";
import { LeadForm } from "./LeadForm";
import { CarryCostCalculator } from "./CarryCostCalculator";

/** Magnets that want one extra free text field, and what to call it. */
const DETAIL_FIELD: Record<string, { label: string; placeholder: string }> = {
  "home-value": { label: "Address of the house", placeholder: "Street, city" },
  "rental-analysis": { label: "Address you are looking at", placeholder: "Street, city" },
};

function BandHero({ band, isH1 }: { band: Extract<Band, { type: "hero" }>; isH1: boolean }) {
  const Heading = isH1 ? "h1" : "h2";
  return (
    // Less top padding than a standard band. Every pixel above the headline is
    // a pixel the five second test does not get to use.
    <Section tone="cream" className="pt-0 sm:pt-6">
      <div className="max-w-[52rem]">
        {band.eyebrow && <Eyebrow>{band.eyebrow}</Eyebrow>}
        <Heading className="display text-[2.05rem] font-semibold leading-[1.1] sm:text-[3rem] lg:text-[3.4rem] text-navy">
          {band.headline}
        </Heading>
        <p className="measure mt-6 text-[1.1rem] leading-[1.68] text-subtle">{band.support}</p>
        {/*
          Gutenberg. The action sits at the end of the block, in the terminal
          zone the eye sweeps to, rather than floating mid band.
          Exactly one primary styled action here, which is the only one in this
          screenful because the header CTA is secondary styled.
        */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {band.ctas.map((c) => (
            <CtaLink key={c.label} cta={c} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function BandProof({ band }: { band: Extract<Band, { type: "proof" }> }) {
  // Hard stop 3. No testimonial without permission on file, and the words are
  // never edited. With none on file the band withholds itself entirely rather
  // than shipping a placeholder or a generic trust badge.
  if (site.testimonials.length === 0) return null;

  return (
    <Section tone="cream">
      <H2 className="text-navy">{band.heading}</H2>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {site.testimonials.map((t, i) => (
          <li key={i} className="rounded-lg border border-navy/15 bg-paper p-6">
            <blockquote className="text-[1.02rem] leading-[1.7] text-ink">“{t.quote}”</blockquote>
            <p className="mt-4 text-[0.9rem] text-subtle">
              {t.attribution}
              {t.context ? `, ${t.context}` : ""}
            </p>
            {/* Every testimonial gets a CTA beside it. Proof next to the ask. */}
            <div className="mt-5">
              <CtaLink
                cta={{
                  label: "Text Alex a question",
                  href: smsHref(),
                  kind: "direct",
                  emphasis: "secondary",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Bands({ page }: { page: PageContent }) {
  return (
    <>
      {page.bands.map((band, i) => {
        switch (band.type) {
          case "hero":
            return <BandHero key={i} band={band} isH1 />;

          case "assistant":
            return (
              <Section key={i} tone="paper" id="ask">
                <H2 className="text-navy">{band.heading}</H2>
                <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-subtle">{band.intro}</p>
                <div className="mt-8">
                  <Assistant
                    name={site.assistant.name}
                    introduction={site.assistant.introduction}
                    chips={site.assistant.chips}
                    phoneDisplay={site.phone.display}
                    telHref={telHref()}
                  />
                </div>
              </Section>
            );

          case "pickYourDoor":
            return (
              <Section key={i} tone="navy">
                <H2>{band.heading}</H2>
                <ul className="mt-9 grid gap-px overflow-hidden rounded-lg border border-cream/15 bg-cream/15 sm:grid-cols-2 lg:grid-cols-4">
                  {band.lanes.map((lane) => (
                    <li key={lane.href} className="bg-navy">
                      <Link
                        href={lane.href}
                        className="flex h-full min-h-[168px] flex-col justify-between p-6 hover:bg-cream/[0.06]"
                      >
                        <span className="text-[1.3rem] font-semibold tracking-[-0.015em]">
                          {lane.lane}
                        </span>
                        <span className="mt-4 text-[0.98rem] leading-[1.6] text-dim">{lane.line}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            );

          case "prose":
            return (
              <Section key={i} tone="cream">
                <H2 className="text-navy">{band.heading}</H2>
                <Prose paragraphs={band.body} />
              </Section>
            );

          case "steps":
            return (
              <Section key={i} tone="paper">
                <H2 className="text-navy">{band.heading}</H2>
                {band.intro && (
                  <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-subtle">{band.intro}</p>
                )}
                {/* Numbered markers appear here and nowhere else on the site,
                    because this is the only content that is genuinely sequential. */}
                <ol className="mt-9 space-y-8">
                  {band.steps.map((s, n) => (
                    <li key={s.title} className="grid gap-3 sm:grid-cols-[3.5rem_1fr]">
                      <span className="figure text-[0.95rem] font-semibold text-subtle">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-[1.12rem] font-semibold text-navy">{s.title}</h3>
                        <p className="measure mt-2 text-[1rem] leading-[1.7] text-subtle">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            );

          case "lossAversion":
            return (
              <Section key={i} tone="cream">
                <H2 className="text-navy">{band.heading}</H2>
                <Prose paragraphs={band.body} />
                {band.calculator === "carryCost" && <CarryCostCalculator />}
              </Section>
            );

          case "trust":
            return (
              <Section key={i} tone="paper">
                <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                  <div>
                    <H2 className="text-navy">{band.heading}</H2>
                    {/* The headshot slot withholds itself until real photography
                        exists. No stock image of a person who is not Alex. */}
                    {site.headshot.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={site.headshot.src}
                        alt={site.headshot.alt}
                        className="mt-6 w-full max-w-[22rem] rounded-lg"
                      />
                    )}
                  </div>
                  <Prose paragraphs={band.body} />
                </div>
              </Section>
            );

          case "areaMap":
            return (
              <Section key={i} tone="cream">
                <H2 className="text-navy">{band.heading}</H2>
                <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-subtle">{band.intro}</p>
                <ServiceAreaMap />
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                  {site.serviceAreas.map((a) => (
                    <li key={a} className="label text-subtle">
                      {a}
                    </li>
                  ))}
                </ul>
              </Section>
            );

          case "conversion": {
            const m = magnet(band.magnetId);
            const detail = DETAIL_FIELD[m.id];
            return (
              <Section key={i} tone="navy" id={m.id === "buyer-guide" ? "guide" : m.id === "home-value" ? "valuation" : m.id === "va-checklist" ? "checklist" : m.id === "rental-analysis" ? "analysis" : "ask"}>
                <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
                  <div>
                    <H2>{m.title}</H2>
                    <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-dim">{m.promise}</p>
                    {/* Stacked value list. Six items beats one sentence. */}
                    <ul className="mt-8 space-y-5">
                      {m.stack.map((s) => (
                        <li key={s.label} className="border-t border-cream/15 pt-5">
                          <p className="text-[1.02rem] font-semibold">{s.label}</p>
                          <p className="mt-1.5 text-[0.96rem] leading-[1.65] text-dim">{s.detail}</p>
                        </li>
                      ))}
                    </ul>
                    {!m.assetReady && (
                      // Honest about what exists. The form says Alex sends it,
                      // because saying "instant download" would be describing
                      // intended behavior as completed behavior.
                      <p className="mt-7 text-[0.9rem] leading-relaxed text-dim">
                        Alex writes and sends this himself rather than serving an automated
                        download.
                      </p>
                    )}
                  </div>
                  <div>
                    <LeadForm
                      magnet={m}
                      route={page.route}
                      detailLabel={detail?.label}
                      detailPlaceholder={detail?.placeholder}
                    />
                  </div>
                </div>
              </Section>
            );
          }

          case "proof":
            return <BandProof key={i} band={band} />;

          case "faq":
            return (
              <Section key={i} tone="paper">
                <H2 className="text-navy">{band.heading}</H2>
                <dl className="mt-8 divide-y divide-line border-t border-line">
                  {band.items.map((item) => (
                    <div key={item.q} className="py-6">
                      <dt className="text-[1.08rem] font-semibold text-navy">{item.q}</dt>
                      <dd className="measure mt-2.5 text-[1rem] leading-[1.7] text-subtle">
                        {item.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>
            );

          case "closingCta":
            return (
              <Section key={i} tone="cream">
                <div className="rounded-lg border border-navy/15 bg-paper p-7 sm:p-10">
                  <H2 className="text-navy">{band.heading}</H2>
                  <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-subtle">{band.body}</p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {band.ctas.map((c) => (
                      <CtaLink key={c.label} cta={c} />
                    ))}
                  </div>
                </div>
              </Section>
            );
        }
      })}
    </>
  );
}
