import Link from "next/link";
import type { Band, PageContent, Testimonial } from "@/lib/schema";
import { site, magnet, telHref, smsHref } from "@/lib/content";
import { AccentHeadline, CtaLink, Eyebrow, H2, Prose, Section, SectionRule, Split, type SectionTone } from "./ui";
import { Assistant } from "./Assistant";
import { Calculator } from "./tools/Calculator";
import { LeadForm } from "./LeadForm";
import { CarryCostCalculator } from "./CarryCostCalculator";
import { Hero } from "./Hero";
import { BandTexture } from "./BandTexture";
import { CountUp } from "./CountUp";
import { Headshot } from "./Headshot";

/** The interactive tools, keyed by the name the content file uses. */
/*
 * ONE CALCULATOR, THREE MODES.
 *
 * Was four unrelated widgets on four pages. The brief: "The calculator is one
 * shared system with three modes, not a collection of unrelated widgets
 * scattered around the site", and separately "Do not create a separate VA
 * calculator" — which retires vaTimeline outright.
 *
 * The old tool KEYS still map, so no content file has to change and no page
 * breaks mid-migration. Each one now opens the shared calculator on the mode
 * that page is for: /sell lands on proceeds, /buy on payment, /investors on
 * rental. A visitor on the sell page should not have to pick "seller" out of a
 * list before the page starts being useful.
 *
 * vaTimeline maps to the payment mode rather than to nothing, because the
 * veterans page's own band is being cut in batch 4 and a null here would leave
 * a heading with a hole under it until then.
 */
const TOOL_MODE = {
  netProceeds: "proceeds",
  affordability: "payment",
  rentalCashflow: "rental",
  vaTimeline: "payment",
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
/*
 * THE LIGHT ROTATION, WEIGHTED TOWARD WHITE.
 *
 * Was ["cream", "paper", "wash"], an even third each, which made warm cream
 * the dominant impression on a page of light bands. The brief wants white as
 * "the primary page background and dominant negative space", with cream as
 * "subtle warm/off-white section backgrounds and soft contrast" — a break from
 * white, not a co-equal.
 *
 * Paper twice in four keeps white in the majority; wash is the gradient
 * between the two and reads as neither, so it does the work of a divider
 * without one being drawn.
 */
const LIGHT_TONES: SectionTone[] = ["paper", "cream", "paper", "wash"];

/**
 * One geometry fragment per lane, so the four cards are visibly four. Same
 * TIGER/Line source as the map and the seam; nothing new is downloaded or drawn.
 */
const LANE_TEXTURES = ["rivers", "roads", "boundary", "full"] as const;

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

function BandProof({ band, seam }: { band: Extract<Band, { type: "proof" }>; seam?: "intoDark" | "intoLight" }) {
  // Hard stop 3. No testimonial without permission on file, and the words are
  // never edited. With none on file the band withholds itself entirely rather
  // than shipping a placeholder or a generic trust badge.
  //
  // The grid is built for three, which is what Alex is being asked for, and it
  // degrades honestly: one quote renders as one wide card rather than as a
  // third of a row with two holes beside it.
  const quotes = site.testimonials;
  if (quotes.length === 0) return null;

  /*
   * WHY THIS BAND IS DARK WHEN ALMOST NOTHING ELSE IS.
   *
   * It used to be a light band with three bordered cards and a grey quote
   * mark, and it disappeared into the page: the most persuasive content on the
   * site rendered as the quietest thing on it. Somebody scrolling past a wall
   * of cream does not stop for one more cream card.
   *
   * Navy here is the exception that earns itself. Four bands on this site are
   * dark and this is one of them, so the section reads as a deliberate pause
   * rather than as more page. The gold accents work at full strength on navy
   * (5.50:1) where they were forbidden on cream (2.46:1), which is why the
   * quote marks can finally be gold instead of a 15 percent grey.
   *
   * THE HAIRLINES ARE AT 75 PERCENT, NOT 25. Measured: gold at 25 percent over
   * this card composites to 1.69:1 against the card it is meant to be the edge
   * of, which is not a border, it is a rumour. At 75 it is 4.04:1 against the
   * card and 3.62:1 against the band behind it, so it clears the 3:1 non-text
   * floor on BOTH sides of itself. A line separating two surfaces has to be
   * legible against both.
   *
   * VERIFIED, NOT DECORATED. Each card carries where the quote came from and
   * when. These are RealSatisfied survey responses with permission recorded,
   * not scraped reviews, and saying so is worth more than any amount of visual
   * flourish: a testimonial a visitor believes beats a testimonial that looks
   * expensive.
   */
  const cols =
    quotes.length === 1 ? "" : quotes.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <Section tone="navyWash" texture="rivers" stagger seam={seam}>
      <div>
        <SectionRule />
        <H2 className="text-cream">{band.heading}</H2>
        <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-[1.6] text-subtle">
          Printed exactly as they were written, published with permission.
        </p>

        {/*
          The source links, at SECTION level rather than on the cards.
          
          Deliberate, and the brief is specific about why: the quotes below came
          from RealSatisfied post-closing surveys, not from Google. Putting a
          Google badge on a card that holds a survey response would claim a
          provenance the quote does not have. At section level they read as
          "here is where you can go and check", which is true of both.

          Rendered only when a URL exists. A "Read more on Google" link that
          goes nowhere is worse than no link, because it implies a profile the
          visitor then cannot find.
        */}
        {(site.reviewLinks.google || site.reviewLinks.realSatisfied) && (
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.9rem]">
            {site.reviewLinks.google && (
              <a
                href={site.reviewLinks.google}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline text-navy"
              >
                Read the Google reviews
              </a>
            )}
            {site.reviewLinks.realSatisfied && (
              <a
                href={site.reviewLinks.realSatisfied}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline text-navy"
              >
                See the RealSatisfied profile
              </a>
            )}
          </p>
        )}
      </div>

      <ul className={`mt-9 grid gap-5 ${cols}`}>
        {quotes.map((t, i) => {
          const name = displayName(t);
          return (
            <li
              key={i}
              className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-gold/75 bg-navy-deep/70 p-7 shadow-[inset_0_1px_0_0_rgb(247_244_238_/_0.06),0_30px_64px_-32px_rgb(0_0_0_/_0.75)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1"
            >
              {/* A large gold quote mark, bled off the top corner and clipped by
                  the card. Decorative and aria-hidden: the blockquote below
                  already carries the semantics. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-7 select-none font-display text-[7rem] leading-none text-gold/20"
              >
                &rdquo;
              </span>

              <blockquote className="relative flex-1 text-[1.02rem] leading-[1.72] text-cream">
                {t.quote}
              </blockquote>

              <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-gold/75 pt-4">
                {/* Name only. The brief removes the location labels and the
                    "Verified survey" mark: the section line above already says
                    where these came from, and repeating it on every card reads
                    as protesting rather than as provenance. */}
                <p className="font-display text-[1.02rem] font-bold text-cream">
                  {name || "Name withheld by request"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* One CTA under the row, not one per card. Three identical buttons in a
          row is three primary actions competing in the same screenful. */}
      <div className="mt-9">
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
function BandNumbers({ band, seam }: { band: Extract<Band, { type: "numbers" }>; seam?: "intoDark" | "intoLight" }) {
  if (site.numbers.length === 0) return null;

  return (
    <Section tone="navyWash" texture="roads" stagger seam={seam}>
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

/**
 * The bands that are always dark.
 *
 * WAS NINE OF ELEVEN. Nine entries meant nearly every band on every route
 * rendered navy, and the page read as one uninterrupted dark scroll with
 * nothing to stop on. It is the single thing that made the site feel
 * monotonous, and no amount of texture, gloss or type fixed it, because the
 * problem was the ratio rather than the treatment.
 *
 * Every reference worth copying rations its dark surface. Increase uses one
 * dark surface, for code. Lithic uses black once, for the hero vault, then
 * runs warm the whole way down. Slash is fully dark and earns it with
 * thirteen neutral steps, which this site does not have.
 *
 * Four now, and each one earns it:
 *
 *   hero        the opening statement
 *   assistant   Lark, which is the one interactive moment on the page
 *   numbers     a short stat callout, which is what dark is best at
 *   closingCta  the close, mirroring the open
 *
 * pickYourDoor, steps, trust, areaMap and conversion all moved to light. The
 * lane cards and step plates are navy objects, so on a warm ground they now
 * read as cards on paper rather than as navy on navy.
 */
const DARK_BANDS = new Set([
  "hero",
  "assistant",
  "numbers",
  /* Proof is dark deliberately. See BandProof for why: on a light band the most
     persuasive content on the site rendered as the quietest thing on it, and
     gold is forbidden as an accent on cream (2.46:1) but clears comfortably on
     navy (5.50:1). It must be listed HERE and not only inside the component,
     or the light/dark rotation and the seam direction are both computed
     against a tone the band does not actually use. */
  "proof",
  "closingCta",
]);

/**
 * Whether a band will actually put anything on the page.
 *
 * Two bands withhold themselves entirely when their content is missing, which
 * is today for both. That matters here and not only to them: a band that
 * renders nothing is not a boundary, so the tone rotation and the seam between
 * light and dark both have to be computed over the bands that actually appear.
 * Counting a withheld band would put a seam against a section that is not there.
 */
function bandRenders(band: Band, testimonials: number, numbers: number): boolean {
  if (band.type === "proof") return testimonials > 0;
  if (band.type === "numbers") return numbers > 0;
  return true;
}

export function Bands({ page }: { page: PageContent }) {
  /**
   * One photograph of Alex per page.
   *
   * `site.headshot` and the homepage hero's `portrait` are the same file, and
   * the trust band appears on both `/` and `/about`. With both slots filled he
   * showed up twice on the homepage, once in the hero and again two thirds of
   * the way down, which reads as a site that has one asset and is determined to
   * use it. So the trust band withholds its portrait on any page whose hero
   * already carries one, and keeps it on every page whose hero does not, which
   * today means /about and only /about.
   *
   * Derived from the page's own bands rather than hardcoded per route, so a
   * future route that gives its hero a portrait gets the same behaviour with no
   * edit here.
   */
  const heroHasPortrait = page.bands.some(
    (b) => b.type === "hero" && Boolean(b.portrait?.src),
  );

  /*
   * Tone is decided once, here, rather than inline at each case.
   *
   * It used to be chosen inside the switch, which was fine until the seam
   * needed to know whether the band above it was light or dark. Deriving that
   * a second time would have been two sources of truth for the same fact, and
   * the failure mode is a seam pointing the wrong way on one route only.
   *
   * The light rotation is scoped to bands with no fixed reason to be either, so
   * pickYourDoor and conversion never throw the rhythm off: the next light band
   * after one of them takes the next tone in line rather than restarting.
   */
  let lightIndex = 0;
  const tones: (SectionTone | null)[] = page.bands.map((band) => {
    if (!bandRenders(band, site.testimonials.length, site.numbers.length)) return null;
    if (DARK_BANDS.has(band.type)) return "navyWash";
    return LIGHT_TONES[lightIndex++ % LIGHT_TONES.length];
  });

  const isDark = (t: SectionTone | null) => t === "navyWash" || t === "navy";

  /**
   * A seam is drawn where the ground actually changes, looking back past any
   * withheld band to the last one that rendered. The hero never gets one:
   * there is nothing above it to cross into.
   */
  const seamFor = (i: number): "intoDark" | "intoLight" | undefined => {
    if (i === 0 || tones[i] === null) return undefined;
    let prev = i - 1;
    while (prev >= 0 && tones[prev] === null) prev -= 1;
    if (prev < 0) return undefined;
    if (isDark(tones[i]) === isDark(tones[prev])) return undefined;
    return isDark(tones[i]) ? "intoDark" : "intoLight";
  };

  return (
    <>
      {page.bands.map((band, i) => {
        const tone = tones[i];
        const seam = seamFor(i);
        const nextLightTone = () => tone ?? "cream";
        switch (band.type) {
          case "hero":
            // The hero is a composition rather than a layout now, so it lives
            // in its own file instead of another branch of this switch.
            return <Hero key={i} band={band} isH1 />;

          /*
           * The assistant band is retired. Lark is mounted once in
           * app/layout.tsx as a persistent launcher, so a band here would be a
           * second instance of the same conversation on the same page.
           *
           * Kept as a null case rather than deleted from the schema: a content
           * file that still carries one renders nothing instead of throwing.
           */
          case "assistant":
            return null;

          case "contactStrip":
            // A door, not a form: a compact band between two content bands
            // carrying only the tappable phone, the text link, and one line
            // of copy. Light and quiet on purpose, the opposite weight of
            // conversion's full form, so a page scanning past it still lands
            // on it as a distinct, easy option rather than more of the same
            // ask.
            return (
              <Section key={i} seam={seam} tone={nextLightTone()} pad="py-8 sm:py-9">
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
            /*
             * The main navigational decision on the site, and until now four
             * identical rectangles with a label and a line of grey text. It
             * read as a table of contents rather than as a choice.
             *
             * Three things changed, none of them an icon. Alex banned keys,
             * doors and handshakes at intake, and the honest icons for
             * "selling" and "investing" do not exist, so a set of four would
             * have been four clip-art compromises.
             *
             *   The lane name is display type at a real size, so the four
             *   words a visitor is choosing between are the largest thing in
             *   the band rather than the same size as the copy under them.
             *
             *   Each lane names the concrete thing waiting behind it, taken
             *   from the four tools that already exist on those routes. A door
             *   with a stated reward is a choice; a door with a label is a
             *   list item.
             *
             *   Each card carries a different fragment of the city's own
             *   geometry, so the four are visibly four rather than one design
             *   repeated. Same source as the map and the seam, no new asset,
             *   and it is the differentiation v4's own self critique asked for
             *   and did not do.
             */
            return (
              <Section key={i} tone={nextLightTone()} stagger seam={seam}>
                  <div>
                    <SectionRule />
                    <H2>{band.heading}</H2>
                  </div>
                  <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {band.lanes.map((lane, n) => (
                      <li key={lane.href}>
                        <Link
                          href={lane.href}
                          className="group relative isolate flex h-full min-h-[15rem] flex-col overflow-hidden rounded-xl border border-cream/15 bg-navy-glow p-6 shadow-[0_4px_0_rgba(255,255,255,0.04)_inset,0_24px_50px_-24px_rgba(0,0,0,0.7)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-2 hover:border-cream/40 hover:shadow-[0_4px_0_rgba(255,255,255,0.07)_inset,0_34px_64px_-22px_rgba(0,0,0,0.8)]"
                        >
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 -z-10 opacity-70 transition-opacity duration-200 group-hover:opacity-100"
                          >
                            <BandTexture variant={LANE_TEXTURES[n % LANE_TEXTURES.length]} />
                          </span>
                          <span className="display text-[1.65rem] font-extrabold leading-none tracking-[-0.02em] text-cream">
                            {lane.lane}
                          </span>
                          <span className="mt-3 text-[0.95rem] leading-[1.55] text-dim">
                            {lane.line}
                          </span>
                          {lane.offer && (
                            <span className="mt-auto flex items-end justify-between gap-3 border-t border-cream/15 pt-4">
                              <span className="text-[0.9rem] font-medium leading-snug text-cream/85">{lane.offer}</span>
                              <span
                                aria-hidden="true"
                                className="shrink-0 text-cream transition-transform duration-200 group-hover:translate-x-1"
                              >
                                &rarr;
                              </span>
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                </ul>
              </Section>
            );

          case "prose":
            return (
              <Section key={i} seam={seam} tone={nextLightTone()}>
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
              <Section key={i} seam={seam} tone={nextLightTone()}>
                <Split
                  heading={
                    <div>
                      <SectionRule />
                      <H2>{band.heading}</H2>
                    </div>
                  }
                  aside={
                    band.intro ? (
                      <p className="mt-4 text-[1.02rem] leading-[1.7] text-subtle">{band.intro}</p>
                    ) : null
                  }
                >
                {/* Numbered markers appear here and nowhere else on the site,
                    because this is the only content that is genuinely sequential. */}
                <ol className="space-y-8">
                  {band.steps.map((s, n) => (
                    <li key={s.title} className="grid gap-3 sm:grid-cols-[3.5rem_1fr]">
                      <span className="figure text-[0.95rem] font-semibold text-subtle">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-[1.12rem] font-semibold text-ink">{s.title}</h3>
                        <p className="measure mt-2 text-[1rem] leading-[1.7] text-subtle">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                </Split>
              </Section>
            );

          case "lossAversion":
            return (
              <Section key={i} seam={seam} tone={nextLightTone()}>
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
                {/*
                  The calculator sits outside Split, at the full width of the
                  band. It was in Split's content column, which is sized for a
                  62 character measure and squeezed the most useful thing on the
                  site into half the page with its labels wrapping.

                  The band stays light, and that is a contrast decision rather
                  than a preference. The result figure is gold, gold fails on
                  every light ground and clears AA on navy, so the result panel
                  has to be dark; and a dark panel only reads as a result
                  because the band around it is light. Making the whole band
                  dark would force the result onto navy-lift, where gold
                  measures 3.69:1 and is forbidden, and would erase the
                  separation that makes the number land.
                */}
                {band.calculator === "carryCost" && <CarryCostCalculator />}
              </Section>
            );

          case "trust":
            return (
              <Section key={i} seam={seam} tone={nextLightTone()}>
                <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                  <div>
                    <SectionRule />
                    <H2>{band.heading}</H2>
                    {/* Withheld when this page's hero already shows him, and
                        withheld entirely while site.headshot.src is null. See
                        the note at the top of this component for the first
                        rule and Headshot.tsx for the second. */}
                    {!heroHasPortrait && <Headshot slot={site.headshot} />}
                  </div>
                  <Prose paragraphs={band.body} />
                </div>
              </Section>
            );

          /*
           * areaMap is retired with the seven-town concept. The band type
           * stays in the schema so no content file fails to parse, and any
           * page still carrying one renders nothing rather than crashing.
           * Remove the type once every content file is rebuilt.
           */
          case "areaMap":
            return null;

          case "conversion": {
            const m = magnet(band.magnetId);
            const detail = DETAIL_FIELD[m.id];
            return (
              <Section key={i} seam={seam} tone={nextLightTone()} id={m.id === "buyer-guide" ? "guide" : m.id === "home-value" ? "valuation" : m.id === "va-checklist" ? "checklist" : m.id === "rental-analysis" ? "analysis" : "contact"}>
                <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
                  <div>
                    <SectionRule />
                    <H2>{m.title}</H2>
                    <p className="measure mt-4 text-[1.05rem] leading-[1.7] text-subtle">{m.promise}</p>
                    {/* Stacked value list. Six items beats one sentence. */}
                    <ul className="mt-8 space-y-5">
                      {m.stack.map((s) => (
                        <li key={s.label} className="border-t border-cream/15 pt-5">
                          <p className="text-[1.02rem] font-semibold">{s.label}</p>
                          <p className="mt-1.5 text-[0.96rem] leading-[1.65] text-subtle">{s.detail}</p>
                        </li>
                      ))}
                    </ul>
                    {!m.assetReady && (
                      // Honest about what exists. The form says Alex sends it,
                      // because saying "instant download" would be describing
                      // intended behavior as completed behavior.
                      <p className="mt-7 text-[0.9rem] leading-relaxed text-subtle">
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
            const mode = TOOL_MODE[band.tool];
            return (
              <Section key={i} seam={seam} tone={nextLightTone()} id={band.tool}>
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
                {/* Full band width, for the same reason as the carry cost
                    calculator: Split's content column is sized for a 62
                    character measure, and a two-column field grid inside it
                    wraps its own labels. */}
                <Calculator initial={mode} />
              </Section>
            );
          }

          case "proof":
            return <BandProof key={i} band={band} seam={seam} />;

          case "numbers":
            return <BandNumbers key={i} band={band} seam={seam} />;

          case "faq":
            return (
              <Section key={i} seam={seam} tone={nextLightTone()}>
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
              <Section key={i} seam={seam} tone="navyWash" texture="full">
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
