import Image from "next/image";
import type { ImageSlot } from "@/lib/schema";

/**
 * The trust band's portrait, which in practice means the one on /about.
 *
 * This is deliberately not the hero's treatment at a different size, and the
 * difference is a composition rather than a scale factor:
 *
 *   | | hero | here |
 *   | crop | 1500px source window, chest up | 1428px window, head and shoulders |
 *   | anchored | right, bleeding off the viewport | left, bleeding off the page gutter |
 *   | faded | on the left, where the copy comes from | on the right, same reason mirrored |
 *   | covered by | the map card, over his chest | nothing |
 *   | his face | ~253px at 1280 | ~278px at 1280 |
 *   | his job | supporting the headline | being the subject |
 *
 * WHY THE CROP CANNOT SIMPLY BE TIGHTER. This photograph is a wide, symmetric,
 * chest-up cut-out: his shoulders reach both edges of the 2000px frame by the
 * bottom row. Cropping in far enough for a large face therefore always cuts the
 * silhouette, and a cut-out whose silhouette is cut is just a rectangular
 * photograph with no border. The composition works by hiding both cut edges
 * instead: one runs off the page gutter, the other dissolves. That is the same
 * trick the hero uses, mirrored, and it is the reason he can be cropped this
 * close here without reading as a boxed photo.
 *
 * THE THREE NESTED ELEMENTS ARE NOT DECORATION. The rim and the rightward fade
 * are on the outermost one, the fixed-height clip and its base fade are on the
 * middle one, and the aspect-correct frame is innermost. An element filters,
 * then masks, and a descendant masks before an ancestor filters, so this order
 * is what makes the rim trace his already-dissolved silhouette rather than
 * outlining a rectangle. Putting the rim and the `overflow-hidden` on the same
 * element puts a glowing box behind him, which is worth knowing before anyone
 * flattens this.
 *
 * THE CLIP IS A FIXED HEIGHT ON PURPOSE. The frame is `aspect-[5/7]` over a
 * square source, so `object-fit: cover` scales to its height and crops
 * horizontally only: the top of his head can never be cut off at any width.
 * All the vertical cropping is the clip's job, it only ever takes from the
 * bottom, and it lands on his chest rather than his collar.
 *
 * THE NULL CONVENTION STILL APPLIES. A null src renders nothing at all: not a
 * silhouette, not a grey box, not a stock person.
 */
export function Headshot({ slot }: { slot: ImageSlot }) {
  if (!slot.src || !slot.width || !slot.height) return null;

  return (
    <div className="relative mt-8 w-full">
      {/*
        The bloom. Decorative, behind him, offset up and left so it reads as a
        light with a direction rather than as a halo centred on his head, which
        is what the rim on the other side is answering. navy-lift is a verified
        token and this is the raised-surface role it exists for; no text on this
        band is painted over it.
      */}
      <div
        aria-hidden="true"
        // inset-x-0, not a negative inset. A negative one overflowed the page
        // by 1px at 390, 2px at 414 and 10px at 768: this element already
        // bleeds left through the page gutter, so any extra negative inset on
        // the right has nothing left to bleed into. The gradient's own falloff
        // does the spreading instead, which is what it was for.
        className="pointer-events-none absolute inset-x-0 top-[-4%] -z-10 h-[62%] opacity-80"
        style={{
          background:
            "radial-gradient(64% 58% at 44% 34%, var(--color-navy-lift) 0%, transparent 76%)",
        }}
      />
      {/*
        The bleed lives on the OUTER element, not the clip.

        It was on the clip first, and the mask on this element then covered only
        the column it was measured against while the figure extended 96px past
        it, so the overhang got a second tile of the gradient and read as a hard
        vertical cut. Both elements now describe the same box.
      */}
      <div className="portrait-rim portrait-fade-x-right -ml-5 max-w-[26rem] sm:-ml-8 sm:max-w-[30rem] lg:-ml-24 lg:max-w-none">
        {/*
          The clip is an aspect ratio, not a height, and that is a bug fix
          rather than a preference.

          It was `h-[22rem] sm:h-[26rem] lg:h-[36rem]`, three fixed heights
          against a frame whose height scales with the column. Between 640 and
          1023, where the trust band is one column and this element is therefore
          as wide as the page, the frame grew to 1030px tall while the clip
          stayed at 416, and the visible fraction fell to 40 percent: at 768 he
          was cut off just below his eyes. Nothing failed. No band overflowed,
          no contrast dropped, no console error. It needed a person to look at
          it, which is exactly the class of defect that survives a green build.

          11/12 against the frame's 5/7 keeps the visible fraction at 78 percent
          at every width, so the cut always lands on his chest. scripts/shots.mjs
          now asserts that fraction rather than trusting this arithmetic. The
          max-widths above are the other half: without them this element is as
          wide as the page below lg, and 78 percent of a frame that tall is
          still an 800px portrait on a 768px screen.
        */}
        <div className="portrait-fade-y relative aspect-[11/12] overflow-hidden">
          <div data-portrait-frame="" className="absolute inset-x-0 top-0 aspect-[5/7]">
            <Image
              src={slot.src}
              alt={slot.alt}
              width={slot.width}
              height={slot.height}
              // Eager, not `priority`, and that is a measurement rather than a
              // preference. He is this page's LCP element, so he must not be
              // lazy. But `priority` also injects a preload link, and on
              // Lighthouse's throttled mobile connection that preload competes
              // with the render-blocking CSS: /about scored 74 with a 4.1s
              // first contentful paint against 1.8s on every other route, and
              // the whole gap was first paint waiting behind a photograph.
              loading="eager"
              fetchPriority="auto"
              // Derived, not guessed. `object-fit: cover` on a square source in a
              // 5:7 box scales to the box HEIGHT, so what the browser has to
              // fetch is the frame's height, which is 1.4x its width, not its
              // width. Declaring the width here asks for a source ~30 percent
              // too small and gets an upscaled, soft portrait on the one page
              // where he is the largest thing on the screen.
              sizes="(min-width: 1024px) 54rem, (min-width: 640px) 42rem, 140vw"
              className="h-full w-full object-cover"
              // Slides the 1428px window so his head sits right of the frame's
              // centre, away from the gutter he bleeds through.
              style={{ objectPosition: "38% 50%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
