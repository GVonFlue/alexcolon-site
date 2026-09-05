import Link from "next/link";
import type { Cta } from "@/lib/schema";
import { Reveal } from "./Reveal";
import { BandTexture } from "./BandTexture";
import { BandSeam } from "./BandSeam";

/**
 * Button styling encodes rule 3 of the nine checks. The gold accent is a filled
 * surface used by exactly one action per screenful and nothing else on the site,
 * so its presence always means "act here". Navy on gold measures 5.44:1.
 */
const emphasisClass: Record<Cta["emphasis"], string> = {
  primary:
    "cta-primary bg-gold text-navy font-semibold shadow-[0_1px_0_rgba(23,42,58,0.18)] hover:brightness-[1.04] active:brightness-[0.98]",
  secondary:
    "cta-secondary bg-transparent text-navy font-semibold border border-navy/55 hover:border-navy hover:bg-navy/[0.04]",
  quiet:
    "cta-quiet bg-transparent text-subtle font-medium underline underline-offset-4 decoration-subtle/45 hover:text-ink hover:decoration-ink",
};

/**
 * The small directional glyph on primary and secondary buttons. It is not on
 * the quiet variant, which reads as a text link and where an arrow would just
 * be noise. It shifts half a pixel on hover, guarded by the same
 * prefers-reduced-motion rule that flattens every other transition on the
 * site, so this never has to think about reduced motion on its own.
 */
export function Glyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="ml-2 h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
    >
      <path
        d="M2 8h11M8.5 3.5 13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CtaLink({ cta, className = "" }: { cta: Cta; className?: string }) {
  // 44x44 minimum tap target is a definition-of-done line, so the quiet variant
  // still carries vertical padding even though it reads as a text link.
  const base =
    cta.emphasis === "quiet"
      ? "inline-flex items-center min-h-[44px] py-2 text-[0.95rem]"
      : "group inline-flex items-center justify-center min-h-[52px] px-6 py-3 rounded-full text-[0.98rem] transition-[filter,background-color,border-color] duration-150";

  const external = /^(tel:|sms:|mailto:|https?:)/.test(cta.href);
  const cls = `${base} ${emphasisClass[cta.emphasis]} ${className}`;
  const content =
    cta.emphasis === "quiet" ? (
      cta.label
    ) : (
      <>
        {cta.label}
        <Glyph />
      </>
    );

  if (external) {
    return (
      <a href={cta.href} className={cls} data-cta-kind={cta.kind} data-cta-emphasis={cta.emphasis}>
        {content}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={cls} data-cta-kind={cta.kind} data-cta-emphasis={cta.emphasis}>
      {content}
    </Link>
  );
}

/**
 * "wash" and "navyWash" are gradient variants of cream and navy, not new
 * grounds: wash moves between the already-verified cream and paper tokens, so
 * every contrast pairing proven against either end holds everywhere between
 * them, and navyWash moves from navy to the darker navy-deep, which only ever
 * raises contrast for the light text painted on it. See globals.css.
 */
const TONES = {
  cream: "bg-cream text-ink",
  paper: "bg-paper text-ink",
  navy: "bg-navy text-cream on-dark",
  wash: "wash text-ink",
  navyWash: "navy-wash text-cream on-dark",
} as const;

export type SectionTone = keyof typeof TONES;

/** The tones that are a dark ground, and therefore get grain and texture. */
const DARK_TONES: SectionTone[] = ["navy", "navyWash"];

export function Section({
  children,
  tone = "cream",
  pad,
  className = "",
  id,
  stagger = false,
  texture,
  seam,
  style,
}: {
  children: React.ReactNode;
  tone?: SectionTone;
  /**
   * Overrides the default vertical padding on the inner block. Passing extra
   * classes via `className` lands on the outer `<section>`, which has no size
   * of its own, so it cannot shrink the padding the inner block already
   * carries; it can only add to it. A band that actually needs less space
   * (the hero) has to replace that padding here instead.
   */
  pad?: string;
  className?: string;
  id?: string;
  /** Stagger this band's own direct children on reveal. Opt in per band. */
  stagger?: boolean;
  /**
   * Draw the map geometry motif behind this band. Dark tones only: at the
   * opacity this runs at it is invisible on cream and would only cost a
   * needless SVG in the markup.
   */
  texture?: "rivers" | "roads" | "boundary" | "full";
  /**
   * Draw the river seam across this band's top edge. Set where the ground
   * actually changes between light and dark; Bands.tsx works that out from the
   * tone sequence rather than each call site guessing.
   */
  seam?: "intoDark" | "intoLight";
  /** Custom properties only, used by the per-route hero atmosphere. */
  style?: React.CSSProperties;
}) {
  const dark = DARK_TONES.includes(tone);

  return (
    // Reveal is the site's one scroll-reveal pattern, applied here and only
    // here so every band gets it the same way instead of each call site
    // reinventing it. See Reveal.tsx for why the hero is unaffected.
    //
    // `relative` and `isolate` exist for the two decorative layers below: the
    // grain pseudo-element and the geometry texture both position against this
    // box, and isolate keeps their z-index from escaping into the page.
    <Reveal
      id={id}
      style={style}
      className={`relative isolate ${TONES[tone]} ${dark ? "grain" : ""} ${className}`}
    >
      {dark && texture && <BandTexture variant={texture} />}
      {seam && <BandSeam direction={seam} />}
      {/*
       * Cut from py-16/20/24 (up to 96px a side, 192px between two adjacent
       * bands) to this. Premium is not the same as empty: there was enough
       * dead space between some bands to fit another one in it.
       *
       * z-10 puts the content above the grain and the geometry motif, both of
       * which sit at z-0 on the section itself.
       */}
      <div
        className={`relative z-10 mx-auto w-full max-w-[76rem] px-5 sm:px-8 ${
          stagger ? "stagger" : ""
        } ${pad ?? "py-11 sm:py-14 lg:py-16"}`}
      >
        {children}
      </div>
    </Reveal>
  );
}

/**
 * The hairline gold rule that opens a section. The one decorative use of the
 * accent colour on this site, allowed because it is a 2px hairline at partial
 * alpha in the whitespace above a heading and cannot be mistaken for a
 * control. It appears nowhere else: not beside body copy, not under a card,
 * not as a divider.
 */
export function SectionRule({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`rule-gold mb-6 ${className}`} />;
}

/**
 * The band layout used by everything that is heading plus content.
 *
 * A single centred column at a 62ch measure is right for reading and wrong for
 * the page: on a wide screen it leaves half the viewport empty, which reads as
 * unfinished rather than as restraint. Putting the heading in its own column
 * keeps the measure honest and gives the width something to do.
 *
 * It collapses to one column below the large breakpoint, where the heading
 * simply sits above its content as before.
 *
 * A band with no `aside` (prose, lossAversion, tool, faq) used to leave the
 * heading column floating over whatever empty space was left once the body
 * column ran longer, which on /buy's "The money, in the order it leaves your
 * account" was roughly 200px of nothing under a two-line heading. The grid
 * row already stretches both columns to the taller one's height (grid's own
 * default, not something added here); what was missing was anything in the
 * short column willing to use that height. Without an `aside`, this now
 * grows a vertical rule under the heading down to the bottom of the row,
 * which is deliberately just a rule and not invented copy: the column reads
 * as an intentional editorial spine bridging two uneven columns instead of a
 * heading abandoned in whitespace.
 */
export function Split({
  heading,
  aside,
  children,
}: {
  heading: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
      <div className="flex h-full flex-col">
        {heading}
        {aside}
        {!aside && (
          <div aria-hidden="true" className="mt-8 hidden flex-1 lg:block">
            <div className="h-full w-px bg-gradient-to-b from-current/20 via-current/10 to-transparent" />
          </div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A pill badge with a leading dot, replacing plain mono text floating above a
 * heading. The dot is a neutral navy or cream tint, never gold: it marks a
 * label, not an action, and gold means act here and nothing else on this
 * site.
 */
export function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  const surface =
    tone === "dark"
      ? "border-cream/20 bg-cream/[0.08] text-cream"
      : "border-navy/12 bg-navy/[0.035] text-navy";
  return (
    <p
      className={`label mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-[0.4rem] ${surface}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === "dark" ? "bg-cream/70" : "bg-navy/55"}`}
      />
      {children}
    </p>
  );
}

/**
 * Renders a headline with one exact substring in the accent color. If the
 * phrase is absent or does not literally occur in the text, the headline
 * renders plain: a highlight that silently fails to appear is fine, a
 * headline that silently loses words is not.
 *
 * gold-ink, not gold, because gold as type on a light ground fails contrast.
 * This is the one exception to "the accent is a fill, never type," and it
 * exists only because that color was verified for this job before it was
 * used anywhere. See globals.css.
 */
export function AccentHeadline({
  text,
  phrase,
  dark = false,
}: {
  text: string;
  phrase?: string;
  dark?: boolean;
}) {
  if (!phrase) return <>{text}</>;
  const i = text.indexOf(phrase);
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      {/* Tagged so the rendered checks can find the one gold phrase on a page
          without matching on a utility class name. On a dark hero it can sit
          near the portrait, and gold has a tighter tolerance for what it is
          painted over than cream does: see checkPortraitContrast in
          scripts/shots.mjs. */}
      <span data-accent-phrase="" className={dark ? "text-gold" : "text-gold-ink"}>
        {text.slice(i, i + phrase.length)}
      </span>
      {text.slice(i + phrase.length)}
    </>
  );
}

export function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`display text-[1.9rem] leading-[1.05] sm:text-[2.4rem] font-extrabold ${className}`}>
      {children}
    </h2>
  );
}

export function Prose({ paragraphs, tone = "light" }: { paragraphs: string[]; tone?: "light" | "dark" }) {
  return (
    <div className="measure mt-6 space-y-5">
      {paragraphs.map((p, i) => (
        <p key={i} className={`text-[1.0625rem] leading-[1.72] ${tone === "dark" ? "text-dim" : "text-subtle"}`}>
          {p}
        </p>
      ))}
    </div>
  );
}

/** First focusable element on every page. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-5 focus:py-3 focus:text-cream"
    >
      Skip to content
    </a>
  );
}
