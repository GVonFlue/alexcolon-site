import Image from "next/image";
import type { Band } from "@/lib/schema";
import { site } from "@/lib/content";
import { AccentHeadline, CtaLink, Eyebrow, Section } from "./ui";
import { LineReveal } from "./LineReveal";

/**
 * The hero.
 *
 * WHY THIS WAS REWRITTEN, because the previous version was cleverer and worse.
 *
 * It composed the portrait as an absolutely positioned element with percentage
 * offsets, masked on two axes, with the map card also absolutely positioned
 * over his lower half. Every piece was measured and every piece was
 * individually defensible. It still produced, in order: the card landing on his
 * chest, his head clipped at the band's top edge, and a hard vertical seam down
 * the middle of the band. Each fix moved the problem somewhere else, because
 * three absolutely positioned layers in one box have no way to tell each other
 * where they are.
 *
 * A grid does. Two columns cannot overlap, a column's children cannot escape
 * it, and a flow item cannot land on the item above it. The composition below
 * is less inventive on paper and it is correct at every width without anyone
 * having to measure it, which at this point is worth considerably more.
 *
 * THE PATTERN IS THE COMMON ONE, deliberately. A two column hero pairing a
 * headline with a portrait is what personal brand agent sites converge on, for
 * a good reason: the visitor wants to see who they would be calling, next to
 * the reason they would call.
 *
 * THE PHOTOGRAPH, MEASURED. `alex-portrait.png` is 2000x2000 RGBA, cut out on
 * transparency. The subject's bounding box is x 15..1999 by y 250..1999, so the
 * top 12.5 percent of the frame is empty and the figure touches the bottom edge
 * and both sides. His head is 685px across at its widest, centred near x 960.
 *
 * WHY THE FRAME IS TALLER THAN IT IS WIDE, AND WHY THAT MATTERS. `object-fit:
 * cover` on a square source in a 4:5 box scales the image to the box's HEIGHT,
 * so it crops horizontally and never vertically. The top of his head cannot be
 * cut off at any width, by construction rather than by a value someone tuned.
 * That was the failure mode of two previous versions and it is now impossible.
 * The only thing objectPosition can move here is the horizontal window.
 *
 * THE PLATE. He is a cut-out, so he needs a ground or he reads as a sticker
 * pasted onto the band. The plate is a rounded panel with a lifted navy
 * gradient and a gold hairline: it is what he stands in, it gives the right
 * column an edge, and it is contained, so unlike the full height version it
 * cannot produce a seam across the band.
 *
 * CONTRAST. Nothing is painted on him, at any width, which is the point of the
 * columns. His jacket measures #E3C7B2 and against it cream is 1.46:1, dim is
 * 1.01:1 and gold is 1.66:1, so no colour in this palette may sit on him at
 * full strength. Separating the columns removes that constraint rather than
 * working around it, and the mask machinery the old composition needed to make
 * an overlap legal is gone with it.
 *
 * KANSAS. "At Home Wichita Real Estate" appears twice in the hero region, in
 * the header lockup and in the attribution line under the body. Both are
 * structural. K.S.A. 58-3086 wants the supervising broker's name displayed in a
 * readable and identifiable manner; removing either is a regulatory change and
 * not a design one.
 *
 * THE NULL CONVENTION STILL APPLIES. `hero.portrait.src` may be null and the
 * hero has to look finished without it. Both layouts below are live code.
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
 * Where the light goes when there is a person standing in the field.
 *
 * The hero's decorative gradient layers drift slowly. A drifting field behind a
 * static cut-out reads as a mistake if the light has no relationship to him,
 * because the eye reads the two as one object and then watches half of it move.
 * Anchoring the bright stop behind his head makes the drift read as light
 * moving around a subject, and a rim light wants a source anyway.
 *
 * Applied on top of the variant rather than inside the variant table on
 * purpose. The table's rule is that a route's atmosphere cannot reach anything
 * structural, and that holds: this is the presence of a portrait talking, not a
 * route, and it still only moves two gradient stops.
 */
const PORTRAIT_FIELD = {
  "--hero-x": "70%",
  "--hero-y": "6%",
  "--hero-bloom": "16% 94%",
} as const;

/**
 * The horizontal window on the photograph.
 *
 * Only the first value does anything: a square source in a taller box crops
 * horizontally only. 48 percent centres his head, which sits near source x 960,
 * rather than centring the frame, which would leave his shoulders symmetrical
 * and his face off axis.
 */
const PORTRAIT_CROP = "48% 50%";

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
 * The portrait plate: the panel, the gradient he stands in, and the frame.
 *
 * `sizes` is derived rather than guessed, and the subtlety is worth writing
 * down. Cover on a square source in a 4:5 box scales the image to the box's
 * HEIGHT, so the width the browser must fetch is 1.25x the frame's width, not
 * the frame's width. Declaring the frame width asks for a source a fifth too
 * small and gets an upscaled, soft portrait.
 */
function PortraitPlate({
  slot,
  sizes,
  className = "",
}: {
  slot: NonNullable<Extract<Band, { type: "hero" }>["portrait"]>;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      data-hero-portrait=""
      className={`relative overflow-hidden rounded-[1.25rem] border border-gold/30 ${className}`}
      style={{
        background:
          "radial-gradient(72% 58% at 52% 8%, color-mix(in srgb, var(--color-navy-lift) 88%, transparent) 0%, color-mix(in srgb, var(--color-navy) 96%, transparent) 62%, var(--color-navy-deep) 100%)",
        boxShadow:
          "inset 0 1px 0 0 color-mix(in srgb, var(--color-cream) 8%, transparent), 0 40px 80px -34px rgb(0 0 0 / 0.75)",
      }}
    >
      <div data-portrait-frame="" className="relative aspect-[4/5] w-full">
        <Image
          src={slot.src!}
          alt={slot.alt}
          width={slot.width!}
          height={slot.height!}
          sizes={sizes}
          /*
           * Eager, but not preloaded.
           *
           * On the mobile Lighthouse preset the LCP element on this page is
           * this image, and lazy loading the LCP element is the one thing that
           * is unambiguously wrong. `priority` also injects a preload link,
           * which on a throttled connection competes with the render blocking
           * CSS and the font stylesheet; it cost 0.3s of LCP against plain
           * eager on /about, so neither treatment on this site is preloaded.
           */
          loading="eager"
          fetchPriority="auto"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: PORTRAIT_CROP }}
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
  const portrait = band.portrait;
  /*
   * next/image needs real dimensions, and so does a layout that must not
   * shift. The schema already refuses a src without them; this is the runtime
   * half of the same rule, and it is what keeps the no-portrait layout a live
   * path rather than a comment.
   */
  const hasPortrait = Boolean(portrait?.src && portrait.width && portrait.height);

  const field = { ...v.field, ...(hasPortrait ? PORTRAIT_FIELD : {}) };

  /*
   * The map card.
   *
   * In flow, always, in whichever column it belongs to. It was previously
   * absolutely positioned over the portrait's lower half, which is exactly why
   * it landed on his chest: it had no way to know where he ended.
   *
   * Below md it is not rendered here at all. It gets its own full width section
   * under the hero, which is the only place on a phone where the town targets
   * are big enough to hit comfortably.
   */
  /*
   * THE MAP IS GONE, and with it the whole "featured" branch.
   *
   * It carried real TIGER/Line river and highway geometry, a town panel with
   * keyboard focus, and a fair-housing rule set that allowed only facts. It
   * was the best-engineered thing on the page. It went because the seven-town
   * concept it existed to express went: the revision brief removes every
   * seven-town reference and replaces hard-limited service areas with
   * "Wichita and the surrounding area".
   *
   * The geometry survives. BandSeam and BandTexture both draw from the same
   * generated paths, so the site keeps the local drawing without keeping the
   * claim about which seven towns Alex will work in.
   */


  return (
    <>
      <Section
        tone="navyWash"
        texture={v.texture}
        className="hero-field overflow-hidden"
        style={field as React.CSSProperties}
        pad="pb-10 pt-6 sm:pb-12 sm:pt-8 lg:pb-16 lg:pt-12"
      >
        {/*
          The grid. One column below lg, two from lg up.

          0.82fr on the right rather than 1fr: the copy is the argument and the
          portrait supports it, so the type column stays the wider of the two
          everywhere both exist.
        */}
        <div
          /*
           * ORDER MATTERS BELOW lg, AND IT IS NOT THE DOM ORDER.
           *
           * Stacked, the copy column comes first in source, so on a phone you
           * scrolled the eyebrow, a three line headline, a paragraph in a
           * plate, the compliance line and two buttons before reaching a
           * photograph of the person the page is about. That is most of a
           * screen and a half of type before a face, on the viewport that
           * carries most of his traffic.
           *
           * `order` fixes it without moving anything in the DOM, so the
           * reading order for a screen reader and the tab order both stay
           * correct: headline, then him, then the rest of the copy.
           */
          className={
            hasPortrait
              ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14"
              : "grid gap-10"
          }
        >
          {/* The copy column. */}
          {/*
            `display: contents` below lg, a block at lg.
            Below lg this wrapper disappears and its two children become grid
            items in their own right, which is what lets the portrait sit
            BETWEEN them via `order`. At lg it is a block again and the copy is
            one column, so the desktop composition is untouched.
          */}
          <div className="contents lg:block lg:max-w-none">
          <div className="order-0 max-w-[42rem]">
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
              className="display display-xl text-[1.9rem] font-black text-cream sm:text-[2.6rem] lg:text-[3.2rem] xl:text-[3.6rem]"
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

            {/*
              Below lg the portrait is pulled up to here by `order`, so the
              support paragraph, the compliance line and the buttons all land
              underneath it. Above lg nothing moves.
            */}
          </div>

          <div className="order-2 max-w-[42rem]">
            <div className="hero-in" style={{ animationDelay: "260ms" }}>
              <p
                data-hero-ink="support"
                className="mt-4 max-w-[38rem] text-[0.97rem] leading-[1.62] text-dim sm:mt-5 sm:text-[1.02rem] lg:mt-6 lg:text-[1.05rem] lg:leading-[1.7]"
              >
                {band.support}
              </p>
            </div>

            {band.attribution && (
              <div className="hero-in" style={{ animationDelay: "310ms" }}>
                {/*
                  K.S.A. 58-3086. The brokerage's business name, in a readable
                  and identifiable manner, in the hero region. Smaller by
                  design, but not decoration and not removable.

                  Full dim, not dim at 90 percent. The contrast auditor measured
                  the 90 percent version at 4.44:1 and failed the build.
                  Thinning a line the statute wants readable, to save a little
                  visual weight, was the wrong trade even before it started
                  failing.
                */}
                <p
                  data-hero-ink="attribution"
                  data-compliance-lockup="hero attribution"
                  className="mt-4 max-w-[32rem] text-[0.85rem] leading-[1.55] text-dim sm:mt-5"
                >
                  {band.attribution}
                </p>
              </div>
            )}

            <div
              className="hero-in mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4 lg:mt-8"
              style={{ animationDelay: "360ms" }}
            >
              {band.ctas.map((c) => (
                <CtaLink key={c.label} cta={c} />
              ))}
            </div>
          </div>
          </div>

          {/*
            The right column: him, then the map beneath him.

            Both are flow items in the same column, so the card sits under him
            by construction. There is no offset to tune and no way for one to
            land on the other.

            Below lg the whole column stacks under the copy, which is where it
            belongs on a phone anyway: the headline and the call to action
            first, then his face, then the map.
          */}
          {(hasPortrait) && (
            <div className="order-1 flex flex-col gap-5 lg:order-none">
              {hasPortrait && (
                <PortraitPlate
                  slot={portrait!}
                  /*
                   * The 1.25x cover fit is baked into these numbers rather than
                   * left for the browser to get wrong. Capped below lg so he
                   * does not become a poster on a tablet.
                   */
                  sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 38vw, (min-width: 640px) 60vw, 92vw"
                  className="mx-auto w-full max-w-[22rem] sm:max-w-[26rem] lg:mx-0 lg:max-w-none"
                />
              )}
                          </div>
          )}
        </div>

        {/*
          One grain, over the whole hero, above the portrait and above the map.
          Shared grain is what makes a raster photograph and a vector drawing
          look like one image; grain on only one of them makes the seam worse.
          pointer-events:none so it can never take a click or a hover from the
          map underneath it.
        */}
        <div aria-hidden="true" className="hero-grain" />
      </Section>

      {/*
        Below md the map gets its own section directly under the hero, at full
        width, which is the only place on a phone where its town targets are
        big enough to hit comfortably.
      */}

    </>
  );
}
