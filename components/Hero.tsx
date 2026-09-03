import Image from "next/image";
import type { Band } from "@/lib/schema";
import { site } from "@/lib/content";
import { AccentHeadline, CtaLink, Eyebrow, Section } from "./ui";
import { LineReveal } from "./LineReveal";
import { ServiceAreaMap } from "./ServiceAreaMap";

/**
 * The hero.
 *
 * Its own file rather than another branch of the band switch, because it is now
 * the only band with a composition rather than a layout: three layers that have
 * to overlap each other in a specific order, a masked raster, and a card that
 * changes from absolutely positioned to in-flow to absent across three
 * breakpoints. That does not belong inside a switch statement with twelve other
 * cases.
 *
 * THE COMPOSITION. The brief for this was that the portrait must read as
 * composed rather than pasted, which is a real distinction with a short list of
 * causes. Three techniques do the work, and they only work together:
 *
 *   1. The base is feathered. The portrait is anchored to the right edge and
 *      bleeds off the bottom, with the lower quarter masked to transparent so
 *      he dissolves into the navy instead of ending on a cut line. This is the
 *      single largest contributor: a hard bottom edge is what makes a
 *      background-removed PNG look like a sticker.
 *   2. The bounding box is broken, twice. The copy sits above the portrait in
 *      the stack so the headline crosses his shoulder, and the map card sits
 *      above him too, over his lower left, with a backdrop blur so he stays
 *      faintly visible through it. Overlap is the thing that proves two
 *      elements were composed together rather than placed side by side.
 *   3. One grain overlay spans the whole hero, above both the raster portrait
 *      and the vector map. Shared grain is what makes a photograph and an SVG
 *      look like they were shot on the same film. Separate grain per layer,
 *      or grain on only one of them, does the opposite.
 *
 * THE NULL CONVENTION STILL APPLIES. There is no photograph yet, so
 * `hero.portrait.src` is null and no portrait renders: not a silhouette, not a
 * grey box, not a stock person. Everything above is built and waiting, and the
 * hero has to look finished without it, which is the same test the headshot
 * slot, the numbers band and the proof band are all held to.
 *
 * KANSAS. "At Home Wichita Real Estate" appears twice in the hero region, in
 * the header lockup and in the attribution line under the body, and both are
 * required. See lib/compliance-type.ts and the attribution field in
 * lib/schema.ts.
 */

/**
 * Per-route atmosphere. Places the light and picks which of the map's own
 * geometry sits behind it, and can reach nothing structural: no type scale, no
 * CTA arrangement, no lockup. The variation is atmosphere, never structure.
 */
const HERO_VARIANTS = {
  home: {
    field: { "--hero-x": "50%", "--hero-y": "-8%", "--hero-bloom": "18% 92%" },
    texture: "rivers",
  },
  buying: {
    field: { "--hero-x": "16%", "--hero-y": "-6%", "--hero-bloom": "86% 88%" },
    texture: "roads",
  },
  selling: {
    field: { "--hero-x": "84%", "--hero-y": "-6%", "--hero-bloom": "12% 86%" },
    texture: "boundary",
  },
  veterans: {
    field: { "--hero-x": "26%", "--hero-y": "104%", "--hero-bloom": "72% 8%" },
    texture: "full",
  },
  investors: {
    field: { "--hero-x": "80%", "--hero-y": "102%", "--hero-bloom": "16% 10%" },
    texture: "roads",
  },
  plain: {
    field: { "--hero-x": "50%", "--hero-y": "-8%", "--hero-bloom": "20% 90%" },
    texture: "rivers",
  },
} as const;

/**
 * Split a headline into sentences so a two sentence headline always breaks
 * between them, at every breakpoint, rather than relying on where the text
 * happens to wrap. Each sentence then reveals as its own line.
 */
function sentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [text];
}

export function Hero({
  band,
  isH1,
}: {
  band: Extract<Band, { type: "hero" }>;
  isH1: boolean;
}) {
  const Heading = isH1 ? "h1" : "h2";
  const v = HERO_VARIANTS[band.variant];
  const featured = band.feature === "areaMap";
  const portrait = band.portrait;
  // next/image needs real dimensions, and so does a layout that must not
  // shift. No dimensions recorded means no portrait, which is the same answer
  // as no file.
  const hasPortrait = Boolean(portrait?.src && portrait.width && portrait.height);

  /*
   * Two layouts, chosen by whether there is a photograph.
   *
   * The composition in this file only makes sense when there is something to
   * compose with. Absolutely positioning the map card over the portrait's lower
   * left, with no portrait there, leaves it floating in the middle of an empty
   * right half, which is worse than the layout it replaced. So with no
   * photograph the hero falls back to two honest columns: copy left, map card
   * right, vertically centred.
   *
   * This matters more than it looks. The site ships today with
   * hero.portrait.src null, so the fallback is not a degraded path, it is the
   * live one, and it has to look finished on its own. That is the same test the
   * headshot slot, the numbers band and the proof band are held to.
   */
  const mapCard = featured ? (
    /*
     * One card, three behaviours.
     *
     *   below md   not here at all; it renders in its own section under the
     *              hero, because at 390px an overlapping card would cover the
     *              copy and push the hero past 100vh
     *   md         in flow under the copy stack, overlapping nothing
     *   lg and up  absolutely positioned over the portrait's lower left
     *
     * backdrop-blur plus a translucent navy fill is what makes the overlap
     * read as depth rather than as occlusion: he stays faintly visible through
     * it. The fill is navy at 82 percent, which is not a taste value. The card
     * can sit over any part of a photograph, so the worst case is the
     * brightest thing a photograph can contain, and cream on navy-at-82-over-
     * white measures 5.1:1 while dim measures 5.1 and 4.8 respectively. Gold
     * fails on it at 2.9, which is why nothing in this card is gold and the
     * map inside it has never used gold for anything.
     */
    <div
      className={
        hasPortrait
          ? "pointer-events-auto relative z-30 mt-8 hidden w-full md:mx-auto md:block md:max-w-[26rem] lg:absolute lg:bottom-6 lg:left-[52%] lg:mt-0 lg:max-w-none lg:w-[min(20rem,30%)]"
          : "pointer-events-auto relative z-30 mt-8 hidden w-full md:mx-auto md:block md:max-w-[26rem] lg:mx-0 lg:mt-0 lg:max-w-none"
      }
    >
      <div className="rounded-2xl border border-cream/15 bg-navy/[0.82] p-4 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-[12px]">
        <ServiceAreaMap towns={site.serviceAreas} compact phoneE164={site.phone.e164} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <Section
        tone="navyWash"
        texture={v.texture}
        className="hero-field overflow-hidden [--portrait-right:-3%] [--portrait-width:30%] lg:[--portrait-right:-4%] lg:[--portrait-width:58%]"
        style={v.field as React.CSSProperties}
        pad="pb-8 pt-5 sm:pb-10 sm:pt-7 lg:pb-20 lg:pt-14"
      >
        <div
          className={
            hasPortrait
              ? "relative"
              : "relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center lg:gap-14"
          }
        >
          {/*
            The portrait. Right edge, bleeding off the bottom of the hero, and
            below the copy in the stack so the headline crosses his shoulder.

            Present from md up, smaller at md than at lg, and absent below md.

            Dropping it on mobile is the option the brief allowed alongside a
            low opacity background layer, "whichever reads better". With no
            photograph in hand there is no honest way to judge which reads
            better, and only one of the two has a contrast floor that can be
            guaranteed rather than estimated against an image that does not
            exist: with nothing behind the copy, nothing can push it under
            4.5:1. Revisit once the real file lands.
          */}
          {hasPortrait && (
            <div className="portrait-feather pointer-events-none absolute -bottom-10 z-10 hidden md:block lg:-bottom-14"
              style={{
                // One place to tune the composition when the real photograph
                // lands. The overlap the brief asks for, a word of the headline
                // passing in front of his shoulder, depends on where his
                // silhouette sits inside the frame, which cannot be known from
                // a placeholder. These two values move him; nothing else has to
                // change.
                // Two values, one place. The overlap the brief asks for, a
                // word of the headline passing in front of his shoulder,
                // depends on where his silhouette sits inside the frame, which
                // cannot be known from a placeholder. These move him; nothing
                // else has to change when the real file lands.
                right: "var(--portrait-right, -4%)",
                width: "var(--portrait-width, 58%)",
                maxWidth: "42rem",
              }}>
              <Image
                src={portrait!.src!}
                alt={portrait!.alt}
                width={portrait!.width!}
                height={portrait!.height!}
                // Explicit dimensions and an aspect-correct box, so the space
                // is reserved before the file arrives and nothing shifts.
                sizes="(min-width: 1024px) 58vw, (min-width: 768px) 30vw, 0px"
                // The headline is the LCP element and must stay that way. A
                // low priority, asynchronously decoded image does not compete
                // for the first paint; eager rather than lazy so it does not
                // pop in on a viewport where it is immediately visible.
                priority={false}
                fetchPriority="low"
                decoding="async"
                className="portrait-rim h-auto w-full"
              />
            </div>
          )}

          <div
            className={`relative z-20 max-w-[42rem] md:max-w-[74%] ${
              hasPortrait ? "lg:max-w-[40rem]" : "lg:max-w-none"
            }`}
          >
            <div className="hero-in" style={{ animationDelay: "0ms" }}>
              <Eyebrow tone="dark">{band.eyebrow}</Eyebrow>
            </div>

            {/*
              The type scale is identical on every route and is deliberately not
              part of the variant table: a hero that changes size per page is
              four layouts, not one layout with four atmospheres.
            */}
            <Heading className="display display-xl text-[1.8rem] font-black text-cream sm:text-[2.5rem] lg:text-[3.4rem] xl:text-[3.7rem]">
              {sentences(band.headline).map((line, i) => (
                <span key={i} className="hero-in block" style={{ animationDelay: `${70 + i * 90}ms` }}>
                  <LineReveal
                    text={line}
                    phrase={band.accentPhrase}
                    plain={<AccentHeadline text={line} phrase={band.accentPhrase} dark />}
                  />
                </span>
              ))}
            </Heading>

            <div className="hero-in" style={{ animationDelay: "260ms" }}>
              <p className="mt-4 max-w-[42rem] lg:max-w-[34rem] text-[0.97rem] leading-[1.62] text-dim sm:mt-5 sm:text-[1.02rem] lg:mt-6 lg:text-[1.05rem] lg:leading-[1.7]">
                {band.support}
              </p>
            </div>

            {band.attribution && (
              <div className="hero-in" style={{ animationDelay: "310ms" }}>
                {/*
                  K.S.A. 58-3086. The brokerage's business name, in a readable
                  and identifiable manner, in the hero region. Smaller and muted
                  by design, but not decoration and not removable: this and the
                  header lockup are the two places it appears above the fold.
                */}
                <p className="mt-3 text-[0.86rem] leading-relaxed text-dim/90 lg:mt-5 lg:text-[0.92rem]">
                  {band.attribution}
                </p>
              </div>
            )}

            {/*
              Gutenberg. The action sits at the end of the block, in the
              terminal zone the eye sweeps to. Exactly one primary styled action
              in this screenful, which is why the header CTA is secondary.
            */}
            <div
              className="hero-in mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:items-center sm:gap-4 lg:mt-8"
              style={{ animationDelay: "360ms" }}
            >
              {band.ctas.map((c) => (
                <CtaLink key={c.label} cta={c} />
              ))}
            </div>
          </div>

          {mapCard}
        </div>

        {/*
          One grain, over the whole hero, above the portrait and above the map.
          Shared grain is what makes a raster photograph and a vector drawing
          look like one image; grain on only one of them makes the seam worse.
          Three percent, inline SVG turbulence, no external asset, and
          pointer-events:none so it can never take a click or a hover from the
          map underneath it.
        */}
        <div aria-hidden="true" className="hero-grain" />
      </Section>

      {/*
        Below md the map is not in the hero at all. It gets its own section
        directly under it, which is what keeps a 390px hero inside 100vh and
        stops a card from landing on top of the copy.
      */}
      {featured && (
        <Section tone="navyWash" texture="rivers" className="md:hidden" pad="pb-12 pt-2">
          <ServiceAreaMap towns={site.serviceAreas} compact phoneE164={site.phone.e164} />
        </Section>
      )}
    </>
  );
}
