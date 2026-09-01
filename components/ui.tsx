import Link from "next/link";
import type { Cta } from "@/lib/schema";

/**
 * Button styling encodes rule 3 of the nine checks. The gold accent is a filled
 * surface used by exactly one action per screenful and nothing else on the site,
 * so its presence always means "act here". Navy on gold measures 5.44:1.
 */
const emphasisClass: Record<Cta["emphasis"], string> = {
  primary:
    "bg-gold text-navy font-semibold shadow-[0_1px_0_rgba(23,42,58,0.18)] hover:brightness-[1.04] active:brightness-[0.98]",
  secondary:
    "bg-transparent text-navy font-semibold border border-navy/55 hover:border-navy hover:bg-navy/[0.04]",
  quiet:
    "bg-transparent text-subtle font-medium underline underline-offset-4 decoration-subtle/45 hover:text-ink hover:decoration-ink",
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

export function Section({
  children,
  tone = "cream",
  pad,
  className = "",
  id,
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
}) {
  return (
    <section id={id} className={`${TONES[tone]} ${className}`}>
      <div className={`mx-auto w-full max-w-[76rem] px-5 sm:px-8 ${pad ?? "py-16 sm:py-20 lg:py-24"}`}>
        {children}
      </div>
    </section>
  );
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
      <div>
        {heading}
        {aside}
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
      <span className={dark ? "text-gold" : "text-gold-ink"}>{text.slice(i, i + phrase.length)}</span>
      {text.slice(i + phrase.length)}
    </>
  );
}

export function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`display text-[1.75rem] leading-[1.15] sm:text-[2.15rem] font-semibold ${className}`}>
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
