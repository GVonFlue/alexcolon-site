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
 * THE PHOTOGRAPH, MEASURED. Everything below is sized from the real file rather
 * than from an assumption about what a headshot looks like. `alex-portrait.png`
 * is 2000x2000 RGBA. The subject's bounding box is x 15..1999 by y 250..1999, so
 * the top 12.5 percent of the frame is empty and the figure touches the bottom
 * edge and both sides. His head is 685px across at its widest, hair and beard
 * included, which is 34 percent of the frame width, and his shoulders splay to
 * nearly the full 2000px by the bottom row. That second number drives the whole
 * composition: printing the frame at a width that makes his head a sensible size
 * in a hero would put his shoulders across the entire band, so the frame is
 * cropped horizontally (PORTRAIT_CROP below) rather than scaled down.
 *
 * THE CONTRAST CONSTRAINT, WHICH IS LOAD BEARING. His jacket measures #E3C7B2.
 * Against it, cream is 1.46:1, dim is 1.01:1 and gold is 1.66:1. Every text
 * colour this dark hero paints is a light one, so there is no colour in the
 * palette that may sit on the jacket at full strength, so any overlap between
 * copy and photograph is only legal in the feathered zone, where he is
 * transparent enough that the composited ground stays near navy. Two inks, two
 * ceilings. Cream tolerates him at 38 percent, which is what the
 * mask reaches at the headline column's right edge at 1024, the binding width.
 * Dim tolerates only 25, which is why the support and attribution columns are
 * narrower than the headline column: that is a contrast decision wearing a
 * typographic one's clothes, and widening either is a contrast change.
 * scripts/shots.mjs samples the real painted pixels under every line of hero
 * copy and under the one gold action, so this is a measured rule, not a hope.
 *
 * THE COMPOSITION. Three techniques do the work, and they only work together:
 *
 *   1. Two nested masks, not one. The outer element fades him out to the left,
 *      which does two jobs at once: it hides the vertical line where the
 *      horizontal crop ends, and it is what makes the headline overlap legal.
 *      The inner element fades the last few percent of his height, so the band's
 *      own bottom edge dissolves him instead of cutting him. They are nested
 *      rather than composited with `mask-composite`, on purpose: if an engine
 *      does not support `mask-composite: intersect` the two layers fall back to
 *      `add`, which is the union, which would leave him NOT faded exactly where
 *      the headline crosses him. Nesting cannot fail that way, and it needs no
 *      support beyond plain `mask-image`.
 *   2. The bounding box is broken, twice, but NOT by the headline. The brief
 *      asked for a headline word crossing his shoulder and with this photograph
 *      that is not available: a headline sits at the top of a hero, where the
 *      only part of him that exists is his head, and his shoulders are level
 *      with the supporting copy and the buttons. At 1280 the longest headline
 *      line ends around x 613 and his nearest pixel at that height is 217px
 *      further right. Closing that either loses the bleed or crops his face at
 *      the band's top edge. So the overlap moved rather than being faked: the
 *      map card sits above him at z-30, hard, over his chest, with a backdrop
 *      blur so he stays faintly visible through it, and the copy column reaches
 *      into his feathered edge. A real occlusion is the stronger cue anyway.
 *      Overlap is what proves two elements were composed together rather than
 *      placed side by side; which two elements overlap is negotiable.
 *   3. One grain overlay spans the whole hero, above both the raster portrait
 *      and the vector map. Shared grain is what makes a photograph and an SVG
 *      look like they were shot on the same film. Separate grain per layer,
 *      or grain on only one of them, does the opposite.
 *
 * THE NULL CONVENTION STILL APPLIES. `hero.portrait.src` may go back to null at
 * any time and the hero has to look finished without it: no silhouette, no grey
 * box, no stock person. Both layouts are live code, not a degraded path.
 *
 * KANSAS. "At Home Wichita Real Estate" appears twice in the hero region, in
 * the header lockup and in the attribution line under the body, and both are
 * required. See lib/compliance-type.ts and the attribution field in
 * lib/schema.ts.
 */

/**
 * The horizontal crop, as an `object-position` percentage.
 *
 * The source is square and the frame it renders into is portrait, so
 * `object-fit: cover` scales to the frame's height and crops horizontally only.
 * Nothing is ever cut off the top or the bottom of the figure, which matters:
 * the crop can never take the top of his head off, however the frame is sized.
 *
 * At the 3:4 frame below the visible window is 1500 source pixels wide, and this
 * value slides it. 62 percent starts that window at source x 310, which puts his
 * head (centred at source x 960) at about 43 percent of the frame's width: right
 * of centre, so his left shoulder rather than his face is what the copy column
 * approaches, and far enough from the frame's right edge that his ear is not
 * clipped when the frame bleeds off the viewport.
 */
const PORTRAIT_CROP = "62% 50%";

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
 * Where the light goes when there is a person standing in the field.
 *
 * The hero's two decorative gradient layers drift, slowly, over 54 seconds. A
 * drifting field behind a static cut-out reads as a mistake if the light has no
 * relationship to him, because the eye reads the two as one object and then
 * watches one half of it move. Anchoring the bright stop behind his head fixes
 * that: the drift becomes light moving around a subject rather than a
 * background sliding behind a sticker, and it is also just the right place for
 * it, since a rim light wants a source.
 *
 * This is applied on top of the variant rather than inside the variant table on
 * purpose. The table's rule is that a route's atmosphere cannot reach anything
 * structural, and it holds: this is not a route talking, it is the presence of
 * a portrait talking, and it still only moves two gradient stops.
 */
const PORTRAIT_FIELD = {
  "--hero-x": "72%",
  "--hero-y": "2%",
  "--hero-bloom": "14% 96%",
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

/**
 * The portrait itself, as the three nested elements the masking needs.
 *
 * `sizes` is passed in rather than defaulted, and it is derived rather than
 * guessed. The subtlety worth writing down: `object-fit: cover` on a square
 * source in a 3:4 box scales the image to the box's HEIGHT, so the width the
 * browser has to fetch is 1.333x the frame's width, not the frame's width.
 * Declaring the frame width asks for a source a third too small and gets an
 * upscaled, soft portrait. The lg value is therefore 0.48 (the frame) x 1.333
 * (the cover fit) x the container, which comes out at 64vw up to the 76rem
 * container cap and a flat 47rem beyond it.
 *
 * What it actually costs, measured: a phone at 390 fetches 14KB of WebP, 1024
 * fetches 32KB and 1440 fetches 53KB, against a 4.9MB master that never leaves
 * the server. scripts/shots.mjs asserts those numbers against a budget, because
 * a wrong `sizes` is invisible on a fast connection and expensive on a phone.
 */
function Portrait({
  slot,
  sizes,
  crop = PORTRAIT_CROP,
}: {
  slot: NonNullable<Extract<Band, { type: "hero" }>["portrait"]>;
  sizes: string;
  crop?: string;
}) {
  return (
    // The rim and the leftward fade both live here, outside the clipping box.
    // Order matters: an element filters, then masks, so the rim traces the
    // silhouette the inner box has already produced and the fade then takes
    // both the figure and its glow down together. A glow that survived the
    // fade would be a gold smear hanging in the navy with nothing inside it.
    <div className="portrait-rim portrait-fade-x h-full w-full">
      {/*
        The clipping box. `aspect-[3/4]` with object-cover is what turns a
        square frame into a portrait one without ever cropping vertically, and
        the bottom fade is here rather than on the parent so the two masks
        nest instead of needing mask-composite. See the file header.
      */}
      <div data-portrait-frame="" className="portrait-fade-y relative h-full w-full overflow-hidden">
        <Image
          src={slot.src!}
          alt={slot.alt}
          width={slot.width!}
          height={slot.height!}
          sizes={sizes}
          // Eager, but not preloaded.
          //
          // The previous pass assumed the headline would be the LCP element
          // here and marked the portrait low and lazy to keep it that way.
          // Lighthouse says otherwise: on the mobile preset the LCP element on
          // this page is this image, and it was arriving lazily. Lazy-loading
          // the LCP element is the one thing that is unambiguously wrong.
          //
          // Eager rather than `priority`, and the difference is measurable.
          // `priority` also injects a preload link, which on a throttled
          // connection competes with the render-blocking CSS and the font
          // stylesheet. /about's portrait carried `priority` for exactly one
          // Lighthouse run and cost 0.3s of LCP against plain eager, on the
          // page where he is the largest thing in the fold, so both treatments
          // on this site are eager and neither is preloaded.
          loading="eager"
          fetchPriority="auto"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: crop }}
        />
      </div>
    </div>
  );
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
  // shift. The schema already refuses a src without them; this is the runtime
  // half of the same rule, and it is what keeps the no-portrait layout a live
  // path rather than a comment.
  const hasPortrait = Boolean(portrait?.src && portrait.width && portrait.height);

  const field = { ...v.field, ...(hasPortrait ? PORTRAIT_FIELD : {}) };

  /*
   * Two layouts, chosen by whether there is a photograph.
   *
   * The composition in this file only makes sense when there is something to
   * compose with. Absolutely positioning the map card over the portrait's lower
   * left, with no portrait there, leaves it floating in the middle of an empty
   * right half, which is worse than the layout it replaced. So with no
   * photograph the hero falls back to two honest columns: copy left, map card
   * right, vertically centred.
   */
  const mapCard = featured ? (
    /*
     * One card, three behaviours.
     *
     *   below md   not here at all; it renders in its own section under the
     *              hero, because at 390px an overlapping card would cover the
     *              copy and push the hero past 100vh
     *   md         in flow under the copy stack, overlapping nothing
     *   lg and up  absolutely positioned over the portrait's lower half
     *
     * Anchored by its RIGHT edge, not its left. Anchoring left at a fixed
     * percentage put it over the copy column at 1024, where the container is
     * narrow enough that 46 percent lands inside a 38rem text column: the
     * support paragraph and one CTA were covered, and the pixel probe caught
     * it at 1.47:1. Measuring from the right instead ties the card to the side
     * of the band the portrait is on, which is the side it is meant to relate
     * to, and it cannot drift back over the copy as the container narrows.
     *
     * backdrop-blur plus a translucent navy fill is what makes the overlap
     * read as depth rather than as occlusion: he stays faintly visible through
     * it. The fill is navy at 82 percent, which is not a taste value. The card
     * can sit over any part of a photograph, so the worst case is the
     * brightest thing this photograph actually contains, which is his jacket
     * at #E3C7B2: cream on navy-at-82-over-that measures 6.5:1 and dim 4.8:1.
     * Gold fails on it, which is why nothing in this card is gold and the map
     * inside it has never used gold for anything.
     */
    <div
      className={
        hasPortrait
          ? "pointer-events-auto relative z-30 mt-8 hidden w-full md:mx-auto md:block md:max-w-[26rem] lg:absolute lg:bottom-4 lg:right-[3%] lg:left-auto lg:mt-0 lg:max-w-none lg:w-[min(21rem,32%)]"
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
        className="hero-field overflow-hidden"
        style={field as React.CSSProperties}
        pad="pb-8 pt-5 sm:pb-10 sm:pt-7 lg:pb-16 lg:pt-12"
      >
        <div
          className={
            hasPortrait
              ? // min-height, not a fixed one. The composition needs vertical
                // room for a figure whose head has to clear the headline and
                // whose chest has to reach the band's bottom edge, and a hero
                // sized only by its copy does not have it. It is a floor rather
                // than a height so a longer headline still grows the band
                // instead of overflowing a box tuned to today's copy.
                "relative lg:min-h-[30rem] xl:min-h-[33rem]"
              : "relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center lg:gap-14"
          }
        >
          {/*
            The portrait. Anchored to the right edge, running to the band's own
            bottom edge, and below the copy in the stack so the headline crosses
            his shoulder.

            Present from lg up only, not from md.

            768 to 1023 was tried as a narrower version of this composition and
            it is the worst of both: the frame has to shrink to clear a copy
            column that is still nearly the full width, which pushes him into
            the bottom right corner at a size where his face stops carrying and
            leaves the top right of the band empty. The in-flow treatment below
            reads better at that width and it is the same treatment 390 gets, so
            the breakpoint is one decision rather than three.
          */}
          {hasPortrait && (
            <div
              data-hero-portrait=""
              className="pointer-events-none absolute z-10 hidden aspect-[3/4] lg:block"
              style={{
                // Three values, one place. `--portrait-bottom` is why he runs
                // past the band's bottom edge instead of dissolving above it:
                // it was declared in globals.css and never actually applied
                // here, so a `bottom-0` class quietly won and he ended 64px
                // short of the boundary. The rendered crop check in
                // scripts/shots.mjs is what found that, by reporting the frame
                // as 100 percent visible when it was meant to be clipped.
                right: "var(--portrait-right)",
                bottom: "var(--portrait-bottom)",
                width: "var(--portrait-width)",
              }}
            >
              <Portrait
                slot={portrait!}
                sizes="(min-width: 1216px) 47rem, (min-width: 1024px) 64vw, 0px"
              />
            </div>
          )}

          <div
            className={`relative z-20 max-w-[42rem] ${
              hasPortrait ? "lg:max-w-[38rem]" : "lg:max-w-none"
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
            <Heading
              data-hero-ink="headline"
              className="display display-xl text-[1.8rem] font-black text-cream sm:text-[2.5rem] lg:text-[3.4rem] xl:text-[3.7rem]"
            >
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
              <p
                data-hero-ink="support"
                className="mt-4 max-w-[42rem] lg:max-w-[34rem] text-[0.97rem] leading-[1.62] text-dim sm:mt-5 sm:text-[1.02rem] lg:mt-6 lg:text-[1.05rem] lg:leading-[1.7]"
              >
                {band.support}
              </p>
            </div>

            {band.attribution && (
              <div className="hero-in" style={{ animationDelay: "310ms" }}>
                {/*
                  K.S.A. 58-3086. The brokerage's business name, in a readable
                  and identifiable manner, in the hero region. Smaller by
                  design, but not decoration and not removable: this and the
                  header lockup are the two places it appears above the fold.

                  Full dim, not dim at 90 percent, since the portrait landed.
                  The contrast auditor measured the 90 percent version at
                  4.44:1 over the feathered edge of the portrait and failed the
                  build. Thinning a line the statute wants readable, to save a
                  little visual weight, was the wrong trade even before it
                  started failing.

                  32rem at lg for the same reason the support paragraph is
                  narrower than the headline: dim tolerates far less of the
                  portrait than cream does. The rendered check measured this
                  box at 3.94:1 when it had no max-width and ran the full
                  38rem of the headline column, because the box reached past
                  the portrait's feathered edge even though the sentence
                  inside it did not. A width that only holds while the copy
                  stays short is not a guarantee.
                */}
                <p
                  data-hero-ink="attribution"
                  className="mt-3 max-w-[42rem] text-[0.86rem] leading-relaxed text-dim lg:mt-5 lg:max-w-[32rem] lg:text-[0.92rem]"
                >
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

          {/*
            Below lg, the portrait is in flow under the CTAs rather than behind
            the copy.

            This is the thing the previous pass could not decide without a
            photograph, and having one settled it in both directions. He works
            at 390: his face reads at 149px across, which is a face
            rather than a thumbnail. And overlapping the copy is not available
            here, because below lg the copy column is essentially the viewport, so any
            portrait behind it is a portrait behind text, and cream on his
            jacket measures 1.46:1.

            So he keeps full strength and gives up the overlap. Right-anchored,
            bleeding through the container's own gutter and through the band's
            bottom padding, with nothing painted on top of him. The negative
            margins are what make the bleed real: without them he would stop at
            the 20px page gutter and read as an inset picture.
          */}
          {hasPortrait && (
            /*
              The clipping box, and the reason it is a box rather than just the
              frame. Its height is fixed and the frame inside it is anchored to
              its TOP, so the only edge that ever cuts him is the bottom one.
              An earlier version sized the frame from this box's height instead,
              which is fine at 390 and silently crops his forehead at 1023: the
              box is wider than it is tall there, and a cover fit on a square
              source then scales to the width and takes 500 source pixels off
              the top. A fixed 3:4 frame cannot do that at any width.

              The fade is repeated here because this box's bottom edge, not the
              frame's, is where he actually ends. The frame's own fade is off
              screen below it and costs nothing.
            */
            <div
              data-hero-portrait=""
              className="portrait-fade-y relative -mb-8 -mr-5 mt-8 h-[21rem] overflow-hidden sm:-mb-10 sm:h-[27rem] lg:hidden"
            >
              <div className="absolute right-0 top-0 aspect-[3/4] w-[min(88%,22rem)] sm:w-[min(74%,28rem)]">
                <Portrait
                  slot={portrait!}
                  // 0px from lg up, where this treatment is display:none.
                  //
                  // Both treatments are always in the DOM and CSS hides the one
                  // that is not in play. That was free while the images were
                  // lazy, because a display:none image never intersects and is
                  // never fetched. Making the portrait eager (see Portrait)
                  // changed that: the hidden one started downloading too, and
                  // the delivery check caught it as 76KB in two WebP requests
                  // at 1024 where it had been 43KB in one. A `sizes` of 0px
                  // outside the range makes the browser pick the smallest
                  // candidate in the srcset, about 1KB, instead.
                  sizes="(min-width: 1024px) 0px, (min-width: 640px) min(99vw, 38rem), min(118vw, 30rem)"
                  // A tighter window than the desktop crop. The desktop framing
                  // at this width would put his head at about 95px across,
                  // which is a thumbnail of a face rather than a face, so the
                  // window slides right to hold his head and one shoulder
                  // instead of the whole chest.
                  crop="66% 50%"
                />
              </div>
            </div>
          )}
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
        <Section tone="navyWash" texture="rivers" className="md:hidden" pad="pb-12 pt-6">
          <ServiceAreaMap towns={site.serviceAreas} compact phoneE164={site.phone.e164} />
        </Section>
      )}
    </>
  );
}
