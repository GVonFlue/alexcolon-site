import type { ImageSlot } from "@/lib/schema";

/**
 * The headshot slot.
 *
 * It renders nothing today, because Alex's photograph does not exist yet and a
 * stock image of a person who is not him is the exact failure the null
 * convention is here to prevent. What this file is for is the day the real one
 * lands: it should arrive finished, not as a bare `<img>` somebody then has to
 * go and design around.
 *
 * Two decisions worth keeping:
 *
 * The frame does not crop. The obvious treatment is a fixed square or a 4:5
 * portrait with object-cover, and it works right up until the photographer
 * delivers a wide environmental shot, at which point the layout confidently
 * cuts Alex out of his own picture and nobody notices until he does. So the
 * image keeps its own aspect ratio and the frame adapts to it. When
 * width and height are recorded in content the browser reserves the right box
 * before the file loads, so there is no layout shift either.
 *
 * The glow sits behind the photograph rather than on it. A navy radial bloom
 * offset behind a slightly rotated frame gives the picture somewhere to sit on
 * a dark band, which is what stops a photograph on a navy ground reading like
 * a cut-out pasted onto it. No filter, no duotone, no gradient scrim over his
 * face: whatever the photographer delivered is what renders.
 */
export function Headshot({ slot }: { slot: ImageSlot }) {
  if (!slot.src) return null;

  return (
    <div className="relative mt-7 w-full max-w-[24rem]">
      {/* The bloom. Decorative, behind everything, and it never covers the
          photograph itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, var(--color-navy-lift) 0%, transparent 70%)",
        }}
      />
      <div className="card-lift overflow-hidden rounded-2xl border border-cream/12 p-2 lg:-rotate-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.src}
          alt={slot.alt}
          width={slot.width ?? undefined}
          height={slot.height ?? undefined}
          // h-auto with the intrinsic width is what keeps the photograph's own
          // proportions. No object-cover anywhere in this component, on purpose.
          className="h-auto w-full rounded-xl"
        />
      </div>
    </div>
  );
}
