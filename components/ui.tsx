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

export function CtaLink({ cta, className = "" }: { cta: Cta; className?: string }) {
  // 44x44 minimum tap target is a definition-of-done line, so the quiet variant
  // still carries vertical padding even though it reads as a text link.
  const base =
    cta.emphasis === "quiet"
      ? "inline-flex items-center min-h-[44px] py-2 text-[0.95rem]"
      : "inline-flex items-center justify-center min-h-[52px] px-6 py-3 rounded-md text-[0.98rem] transition-[filter,background-color,border-color] duration-150";

  const external = /^(tel:|sms:|mailto:|https?:)/.test(cta.href);
  const cls = `${base} ${emphasisClass[cta.emphasis]} ${className}`;

  if (external) {
    return (
      <a href={cta.href} className={cls} data-cta-kind={cta.kind} data-cta-emphasis={cta.emphasis}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={cls} data-cta-kind={cta.kind} data-cta-emphasis={cta.emphasis}>
      {cta.label}
    </Link>
  );
}

export function Section({
  children,
  tone = "cream",
  className = "",
  id,
}: {
  children: React.ReactNode;
  tone?: "cream" | "paper" | "navy";
  className?: string;
  id?: string;
}) {
  const tones = {
    cream: "bg-cream text-ink",
    paper: "bg-paper text-ink",
    navy: "bg-navy text-cream on-dark",
  };
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-[76rem] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`label ${tone === "dark" ? "text-dim" : "text-subtle"} mb-4`}>{children}</p>
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
