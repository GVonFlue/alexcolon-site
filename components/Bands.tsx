import Link from "next/link";
import type { Band, PageContent } from "@/lib/schema";
import { site, magnet, telHref, smsHref } from "@/lib/content";
import { AccentHeadline, CtaLink, Eyebrow, H2, Prose, Section, Split, type SectionTone } from "./ui";
import { ServiceAreaMap } from "./ServiceAreaMap";
import { Assistant } from "./Assistant";
import { LeadForm } from "./LeadForm";
import { CarryCostCalculator } from "./CarryCostCalculator";
import { Marquee } from "./Marquee";
import { NetProceeds } from "./tools/NetProceeds";
import { Affordability } from "./tools/Affordability";
import { VaTimeline } from "./tools/VaTimeline";
import { RentalCashflow } from "./tools/RentalCashflow";

/** The interactive tools, keyed by the name the content file uses. */
const TOOLS = {
  netProceeds: NetProceeds,
  affordability: Affordability,
  vaTimeline: VaTimeline,
  rentalCashflow: RentalCashflow,
} as const;

/**
 * v4 flips the ratio. Navy is the dominant ground now, cream is the exhale
 * between dark sections, and it is reserved for bands with a real fields
 * reason to need a light ground: prose, lossAversion (its calculator has
 * inputs), tool (all four do), faq and proof. Everything else, hero, steps,
 * trust, areaMap, pickYourDoor, the assistant, conversion and closingCta, is
 * a fixed dark chapter rather than part of a rotation, because on the actual
 * reference the dark sections run two and three in a row on purpose (Scout
 * straight into the steps section) rather than strictly alternating with
 * light ones. The light bands still rotate through these three so two
 * light bands next to each other are not the same flat fill twice.
 */
const LIGHT_TONES: SectionTone[] = ["cream", "paper", "wash"];

/** Magnets that want one extra free text field, and what to call it. */
const DETAIL_FIELD: Record<string, { label: string; placeholder: string }> = {
  "home-value": { label: "Address of the house", placeholder: "Street, city" },
  "rental-analysis": { label: "Address you are looking at", placeholder: "Street, city" },
};

function BandHero({ band, isH1 }: { band: Extract<Band, { type: "hero" }>; isH1: boolean }) {
  const Heading = isH1 ? "h1" : "h2";
  const featured = band.feature === "areaMap";

  return (
    // Dark ground: navy with the radial glow tone, so the fold has depth and
    // the one accent phrase a page carries can finally be real gold rather
    // than the darkened, type-safe compromise a light ground forces. Still
    // less top padding than a standard band, and now overriding the inner
    // block's padding directly rather than adding to it from outside.
    <Section tone="navyWash" pad="pb-14 pt-6 sm:pb-16 sm:pt-8 lg:pb-20 lg:pt-10">
      <div
        className={
          featured
            ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
            : ""
        }
      >
        <div className={`hero-in ${featured ? "" : "max-w-[52rem]"}`}>
          {band.eyebrow && <Eyebrow tone="dark">{band.eyebrow}</Eyebrow>}
          <Heading className="display text-[2.2rem] font-black leading-[0.98] tracking-[-0.04em] text-cream sm:text-[3rem] lg:text-[3.7rem] xl:text-[4rem]">
            <AccentHeadline text={band.headline} phrase={band.accentPhrase} dark />
          </Heading>
          <p className="measure mt-6 text-[1.1rem] leading-[1.68] text-dim">{band.support}</p>
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

        {/*
          The second column, a real object rather than a diagram floating in
          space: a raised card that is a genuine value step above its ground
          (navy-deep, not another flat cream card dropped onto navy), offset
          slightly on large screens for a stacked feel. Without it a desktop
          hero is a text column beside half a screen of nothing, which reads
          as unfinished rather than as restraint. The map is also the one
          element on this site that is true only of this client, so the fold
          is where it belongs.
        */}
        {featured && (
          <div className="hero-in lg:pl-4" style={{ animationDelay: "120ms" }}>
            <div className="rounded-2xl border border-cream/10 bg-navy-deep p-6 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.6)] sm:p-8 lg:-rotate-1 lg:translate-x-2">
              <ServiceAreaMap towns={site.serviceAreas} compact />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function BandProof({ band, tone }: { band: Extract<Band, { type: "proof" }>; tone: SectionTone }) {
  // Hard stop 3. No testimonial without permission on file, and the words are
  // never edited. With none on file the band withholds itself entirely rather
  // than shipping a placeholder or a generic trust badge.
  if (site.testimonials.length === 0) return null;

  return (
    <Section tone={tone}>
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
  // Scoped to bands that have no fixed reason to be light or dark, so
  // pickYourDoor and conversion (always navyWash) never throw the rhythm off:
  // the next light band after either of them still just takes the next tone
  // in line rather than restarting the cycle.
  let lightIndex = 0;
  const nextLightTone = () => LIGHT_TONES[lightIndex++ % LIGHT_TONES.length];

  return (
    <>
      {page.bands.map((band, i) => {
        switch (band.type) {
          case "hero":
            return <BandHero key={i} band={band} isH1 />;

          case "assistant":
            // Dark on purpose: this is the direct analog of the reference's
            // own "Meet Scout" section, a character introduction rather than
            // a form bolted onto the page.
            return (
              <Section key={i} tone="navyWash" id="ask">
                <Assistant
                  heading={band.heading}
                  intro={band.intro}
                  name={site.assistant.name}
                  introduction={site.assistant.introduction}
                  chips={site.assistant.chips}
                  goodAt={site.assistant.goodAt}
                  phoneDisplay={site.phone.display}
                  telHref={telHref()}
                />
              </Section>
            );

          case "pickYourDoor":
            return (
              <div key={i}>
                <Section tone="navyWash">
                  <H2>{band.heading}</H2>
                  <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {band.lanes.map((lane) => (
                      <li key={lane.href}>
                        <Link
                          href={lane.href}
                          className="group flex h-full min-h-[180px] flex-col justify-between rounded-xl border border-cream/15 bg-navy-glow p-6 shadow-[0_4px_0_rgba(255,255,255,0.04)_inset,0_24px_50px_-24px_rgba(0,0,0,0.7)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-1.5 hover:border-cream/35 hover:shadow-[0_4px_0_rgba(255,255,255,0.06)_inset,0_30px_60px_-22px_rgba(0,0,0,0.75)]"
                        >
                          <span className="text-[1.3rem] font-semibold tracking-[-0.015em]">
                            {lane.lane}
                          </span>
                          <span className="mt-4 flex items-end justify-between gap-3 text-[0.98rem] leading-[1.6] text-dim">
                            {lane.line}
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-cream transition-transform duration-150 group-hover:translate-x-1"
                            >
                              →
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
                {/* Low and quiet, the same four lanes rendered as a strip
                    rather than a second list, so there is one source for
                    them, not two that can drift apart. */}
                <Marquee items={band.lanes.map((l) => l.lane)} />
              </div>
            );

          case "prose":
            return (
              <Section key={i} tone={nextLightTone()}>
                <Split heading={<H2 className="text-navy">{band.heading}</H2>}>
                  <Prose paragraphs={band.body} />
                </Split>
              </Section>
            );

          case "steps":
            // Dark: this is the site's one genuinely sequential content, the
            // same reason the reference gives its own step-by-step section
            // the dark, numbered treatment rather than a plain light list.
            return (
              <Section key={i} tone="navyWash">
                <Split
                  heading={<H2 className="text-cream">{band.heading}</H2>}
                  aside={
                    band.intro ? (
                      <p className="mt-4 text-[1.02rem] leading-[1.7] text-dim">{band.intro}</p>
                    ) : null
                  }
                >
                {/* Numbered markers appear here and nowhere else on the site,
                    because this is the only content that is genuinely sequential. */}
                <ol className="space-y-8">
                  {band.steps.map((s, n) => (
                    <li key={s.title} className="grid gap-3 sm:grid-cols-[3.5rem_1fr]">
                      <span className="figure text-[0.95rem] font-semibold text-dim">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-[1.12rem] font-semibold text-cream">{s.title}</h3>
                        <p className="measure mt-2 text-[1rem] leading-[1.7] text-dim">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                </Split>
              </Section>
            );

          case "lossAversion":
            return (
              <Section key={i} tone={nextLightTone()}>
                <Split heading={<H2 className="text-navy">{band.heading}</H2>}>
                  <Prose paragraphs={band.body} />
                  {band.calculator === "carryCost" && <CarryCostCalculator />}
                </Split>
              </Section>
            );

          case "trust":
            return (
              <Section key={i} tone="navyWash">
                <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                  <div>
                    <H2 className="text-cream">{band.heading}</H2>
                    {/* The headshot slot withholds itself until real photography
                        exists. No stock image of a person who is not Alex. */}
                    {site.headshot.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={site.headshot.src}
                        alt={site.headshot.alt}
                        className="mt-6 w-full max-w-[22rem] rounded-lg border border-cream/10"
                      />
                    )}
                  </div>
                  <Prose paragraphs={band.body} tone="dark" />
                </div>
              </Section>
            );

          case "areaMap":
            // Dark, to match the map's own redesign: cream and gold marks on
            // navy, not grey dots on a white card.
            return (
              <Section key={i} tone="navyWash">
                <Split
                  heading={<H2 className="text-cream">{band.heading}</H2>}
                  aside={<p className="mt-4 text-[1.02rem] leading-[1.7] text-dim">{band.intro}</p>}
                >
                  <ServiceAreaMap towns={site.serviceAreas} />
                </Split>
                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                  {site.serviceAreas.map((a) => (
                    <li key={a.name} className="label text-dim">
                      {a.name}
                    </li>
                  ))}
                </ul>
              </Section>
            );

          case "conversion": {
            const m = magnet(band.magnetId);
            const detail = DETAIL_FIELD[m.id];
            return (
              <Section key={i} tone="navyWash" id={m.id === "buyer-guide" ? "guide" : m.id === "home-value" ? "valuation" : m.id === "va-checklist" ? "checklist" : m.id === "rental-analysis" ? "analysis" : "ask"}>
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

          case "tool": {
            const Tool = TOOLS[band.tool];
            return (
              <Section key={i} tone={nextLightTone()} id={band.tool}>
                <Split heading={<H2 className="text-navy">{band.heading}</H2>}>
                  <Prose paragraphs={band.body} />
                  <Tool />
                </Split>
              </Section>
            );
          }

          case "proof":
            return <BandProof key={i} band={band} tone={nextLightTone()} />;

          case "faq":
            return (
              <Section key={i} tone={nextLightTone()}>
                <Split heading={<H2 className="text-navy">{band.heading}</H2>}>
                {/*
                  Native disclosure. Interactive with no JavaScript at all,
                  keyboard operable and screen reader labelled for free, and the
                  answers stay in the rendered HTML while collapsed so the copy
                  auditor and search engines both still see them.
                */}
                <div className="border-t border-line">
                  {band.items.map((item) => (
                    <details key={item.q} className="group border-b border-line">
                      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.08rem] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                        {item.q}
                        <span
                          aria-hidden="true"
                          className="relative h-4 w-4 shrink-0 text-subtle"
                        >
                          <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
                          <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-150 group-open:scale-y-0" />
                        </span>
                      </summary>
                      <p className="measure pb-5 text-[1rem] leading-[1.7] text-subtle">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
                </Split>
              </Section>
            );

          case "closingCta":
            // Dark: the bookend to the hero rather than another light card.
            // No inner card here, unlike conversion's form: there are no
            // fields to protect on a light ground, just a closing statement.
            return (
              <Section key={i} tone="navyWash">
                <div className="max-w-[42rem]">
                  <H2 className="text-cream">{band.heading}</H2>
                  <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-dim">{band.body}</p>
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
