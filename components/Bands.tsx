import Link from "next/link";
import type { Band, PageContent, Testimonial } from "@/lib/schema";
import { site, magnet, telHref, smsHref } from "@/lib/content";
import { AccentHeadline, CtaLink, Eyebrow, H2, Prose, Section, SectionRule, Split, type SectionTone } from "./ui";
import { ServiceAreaMap } from "./ServiceAreaMap";
import { Assistant } from "./Assistant";
import { LeadForm } from "./LeadForm";
import { CarryCostCalculator } from "./CarryCostCalculator";
import { Marquee } from "./Marquee";
import { Hero } from "./Hero";
import { CountUp } from "./CountUp";
import { Headshot } from "./Headshot";
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

/**
 * How much of a person's name may be published, per what they agreed to.
 *
 * Permission to be quoted and permission to be named are different
 * permissions, and the second one is routinely withheld for reasons that are
 * nobody's business. The preference is recorded with the quote (see
 * lib/schema.ts) and applied here, so the component never has to guess and a
 * later editor cannot accidentally promote a first name to a full one.
 *
 * "anonymous" still names the context when there is one, because "a seller in
 * Derby" is what makes an unnamed quote worth reading, and it is not
 * identifying.
 */
function displayName(t: Testimonial): string | null {
  const parts = t.attribution.trim().split(/\s+/);
  switch (t.displayAs) {
    case "full":
      return t.attribution;
    case "firstAndLastInitial":
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
    case "firstOnly":
      return parts[0];
    case "initials":
      return parts.map((w) => `${w[0]}.`).join("");
    case "anonymous":
      return null;
  }
}

function BandProof({ band, tone }: { band: Extract<Band, { type: "proof" }>; tone: SectionTone }) {
  // Hard stop 3. No testimonial without permission on file, and the words are
  // never edited. With none on file the band withholds itself entirely rather
  // than shipping a placeholder or a generic trust badge.
  //
  // The grid is built for three, which is what Alex is being asked for, and it
  // degrades honestly: one quote renders as one wide card rather than as a
  // third of a row with two holes beside it.
  const quotes = site.testimonials;
  if (quotes.length === 0) return null;

  const cols =
    quotes.length === 1 ? "" : quotes.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <Section tone={tone} stagger>
      <div>
        <SectionRule />
        <H2 className="text-navy">{band.heading}</H2>
      </div>
      <ul className={`mt-9 grid gap-6 ${cols}`}>
        {quotes.map((t, i) => {
          const name = displayName(t);
          return (
            <li
              key={i}
              className="card-warm flex flex-col rounded-xl border border-navy/10 bg-paper p-6"
            >
              {/* A quote mark rather than a stock avatar. There is no
                  photograph of any of these people and there is not going to
                  be one. */}
              <span aria-hidden="true" className="display text-[2.5rem] leading-none text-navy/15">
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-[1.02rem] leading-[1.7] text-ink">
                {t.quote}
              </blockquote>
              <p className="mt-5 border-t border-line pt-4 text-[0.9rem] text-subtle">
                {[name, t.context].filter(Boolean).join(", ") || "Name withheld by request"}
              </p>
            </li>
          );
        })}
      </ul>
      {/* One CTA under the row, not one per card. Three identical buttons in a
          row is three primary actions competing in the same screenful. */}
      <div className="mt-8">
        <CtaLink
          cta={{
            label: "Text Alex a question",
            href: smsHref(),
            kind: "direct",
            emphasis: "secondary",
          }}
        />
      </div>
    </Section>
  );
}

/**
 * The numbers band. Withholds itself entirely while there are no verified
 * figures, which is today. See lib/schema.ts for why it exists anyway.
 */
function BandNumbers({ band }: { band: Extract<Band, { type: "numbers" }> }) {
  if (site.numbers.length === 0) return null;

  return (
    <Section tone="navyWash" texture="roads" stagger>
      <div>
        <SectionRule />
        <H2 className="text-cream">{band.heading}</H2>
        {band.intro && (
          <p className="measure mt-4 text-[1.02rem] leading-[1.7] text-dim">{band.intro}</p>
        )}
      </div>
      <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {site.numbers.map((n) => (
          <li key={n.label} className="border-t border-cream/15 pt-5">
            <p className="display text-[2.6rem] font-extrabold leading-none text-cream">
              <CountUp figure={n.figure} />
            </p>
            <p className="mt-3 text-[1rem] leading-[1.5] text-dim">{n.label}</p>
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
            // The hero is a composition rather than a layout now, so it lives
            // in its own file instead of another branch of this switch.
            return <Hero key={i} band={band} isH1 />;

          case "assistant":
            // Dark on purpose: this is the direct analog of the reference's
            // own "Meet Scout" section, a character introduction rather than
            // a form bolted onto the page.
            return (
              <Section key={i} tone="navyWash" id="ask">
                <Assistant
                  eyebrow={band.eyebrow}
                  heading={band.heading}
                  intro={band.intro}
                  name={site.assistant.name}
                  siteName={site.siteName}
                  introduction={site.assistant.introduction}
                  // This route's own chips if it has them, the site-wide set
                  // if it does not. The same three chips on all eight routes
                  // is the tell that the assistant is decoration.
                  chips={band.chips ?? site.assistant.chips}
                  route={page.route}
                  // Read on the server, so the first paint tells the truth
                  // about whether anything is going to answer. See Assistant.
                  initialConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
                  goodAt={site.assistant.goodAt}
                  phoneDisplay={site.phone.display}
                  telHref={telHref()}
                />
              </Section>
            );

          case "contactStrip":
            // A door, not a form: a compact band between two content bands
            // carrying only the tappable phone, the text link, and one line
            // of copy. Light and quiet on purpose, the opposite weight of
            // conversion's full form, so a page scanning past it still lands
            // on it as a distinct, easy option rather than more of the same
            // ask.
            return (
              <Section key={i} tone={nextLightTone()} pad="py-8 sm:py-9">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
                  <p className="text-[1.05rem] font-medium text-ink">{band.line}</p>
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:justify-end">
                    <a
                      href={telHref()}
                      className="figure inline-flex min-h-[44px] items-center text-[1.05rem] font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy"
                    >
                      {site.phone.display}
                    </a>
                    <CtaLink
                      cta={{
                        label: "Text Alex a question",
                        href: smsHref(),
                        kind: "direct",
                        emphasis: "secondary",
                      }}
                    />
                  </div>
                </div>
              </Section>
            );

          case "pickYourDoor":
            return (
              <div key={i}>
                <Section tone="navyWash" texture="boundary" stagger>
                  <div>
                    <SectionRule />
                    <H2>{band.heading}</H2>
                  </div>
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
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2 className="text-navy">{band.heading}</H2>
                    </div>
                  }
                >
                  <Prose paragraphs={band.body} />
                </Split>
              </Section>
            );

          case "steps":
            // Dark: this is the site's one genuinely sequential content, the
            // same reason the reference gives its own step-by-step section
            // the dark, numbered treatment rather than a plain light list.
            return (
              <Section key={i} tone="navyWash" texture="roads">
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2 className="text-cream">{band.heading}</H2>
                    </div>
                  }
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
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2 className="text-navy">{band.heading}</H2>
                    </div>
                  }
                >
                  <Prose paragraphs={band.body} />
                  {band.calculator === "carryCost" && <CarryCostCalculator />}
                </Split>
              </Section>
            );

          case "trust":
            return (
              <Section key={i} tone="navyWash" texture="rivers">
                <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                  <div>
                    <SectionRule />
                    <H2 className="text-cream">{band.heading}</H2>
                    {/* Withholds itself until real photography exists. No stock
                        image of a person who is not Alex. See Headshot.tsx for
                        what happens the day one arrives. */}
                    <Headshot slot={site.headshot} />
                  </div>
                  <Prose paragraphs={band.body} tone="dark" />
                </div>
              </Section>
            );

          case "areaMap":
            // Dark, to match the map's own redesign: cream and gold marks on
            // navy, not grey dots on a white card. Stacked, not Split: a
            // short heading and intro next to a map this size left the map
            // squeezed into Split's narrower content lane while the heading
            // column sat mostly empty beside it, wasted width on one side
            // and a wasted-looking excess of height on the other. The map
            // is this page's actual subject, not a content-column
            // illustration, so it gets the full band width to be as large
            // as its own aspect ratio calls for instead of being fit to a
            // column sized for prose.
            return (
              <Section key={i} tone="navyWash" texture="rivers">
                <div className="max-w-[42rem]">
                  <SectionRule />
                  <H2 className="text-cream">{band.heading}</H2>
                  <p className="mt-4 text-[1.02rem] leading-[1.7] text-dim">{band.intro}</p>
                </div>
                <ServiceAreaMap towns={site.serviceAreas} phoneE164={site.phone.e164} />
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
              <Section key={i} tone="navyWash" id={m.id === "buyer-guide" ? "guide" : m.id === "home-value" ? "valuation" : m.id === "va-checklist" ? "checklist" : m.id === "rental-analysis" ? "analysis" : "contact"}>
                <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
                  <div>
                    <SectionRule />
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
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2 className="text-navy">{band.heading}</H2>
                    </div>
                  }
                >
                  <Prose paragraphs={band.body} />
                  <Tool />
                </Split>
              </Section>
            );
          }

          case "proof":
            return <BandProof key={i} band={band} tone={nextLightTone()} />;

          case "numbers":
            return <BandNumbers key={i} band={band} />;

          case "faq":
            return (
              <Section key={i} tone={nextLightTone()}>
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2 className="text-navy">{band.heading}</H2>
                    </div>
                  }
                >
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
              <Section key={i} tone="navyWash" texture="full">
                <div className="max-w-[42rem]">
                  <SectionRule />
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
