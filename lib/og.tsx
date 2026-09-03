import { ImageResponse } from "next/og";
import { site } from "./content";
import { LOCKUPS } from "./compliance-type";

/**
 * The open graph card, generated at build time by Next's ImageResponse.
 *
 * Why this matters more here than on most builds: Alex's primary action is a
 * text message, and a text message renders a link preview. For most people the
 * card is literally the first thing they will ever see of this site, before
 * the site itself. Up to v6 every route emitted `twitter:card: summary` with
 * no image at all, so that first impression was a bare line of text.
 *
 * Constraints this inherits from the rest of the build:
 *
 *   - Kansas advertising law. The brokerage name sits directly under Alex's
 *     name, and the two font sizes come from the same registry the DOM lockups
 *     use (lib/compliance-type.ts), which throws if the ratio is ever illegal.
 *   - Nothing invented. There is no number, no testimonial, no claim on the
 *     card, because there is none to make. It carries his name, the brokerage,
 *     the seven towns, and Lark.
 *   - The palette, unchanged. Navy field, cream type, one gold hairline.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const LOCKUP = LOCKUPS.find((l) => l.where === "open graph card")!;

/**
 * Archivo, fetched at build time so the card is set in the same display face
 * as the site. If the fetch fails the card still renders in Satori's own
 * default font: a card in the wrong font is a small problem, and a build that
 * fails because Google Fonts was briefly unreachable is a large one.
 */
async function displayFont(): Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] | undefined> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Archivo:wght@500;800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());

    const urls = [...css.matchAll(/src:\s*url\(([^)]+)\)/g)].map((m) => m[1]);
    if (urls.length < 2) return undefined;

    const [regular, bold] = await Promise.all([
      fetch(urls[0]).then((r) => r.arrayBuffer()),
      fetch(urls[urls.length - 1]).then((r) => r.arrayBuffer()),
    ]);
    return [
      { name: "Archivo", data: regular, weight: 400, style: "normal" },
      { name: "Archivo", data: bold, weight: 700, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}

/**
 * Lark, flattened for Satori: no animation, no CSS variables, no filters, and
 * the feather ticks dropped because they add nothing at card size. Same
 * geometry as components/Lark.tsx otherwise, so the bird on a link preview is
 * the bird on the page.
 */
function LarkMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M43 36 L60 46 L58 51 L42 43 Z" fill="#393C38" />
      <path d="M43 39 L57 50 L54 53 L41 45 Z" fill="#5B5544" />
      <path
        d="M17 30 C16 19, 25 11, 33 13 C43 14, 50 22, 50 33 C50 43, 42 50, 32 50 C22 50, 17 41, 17 30 Z"
        fill="#5B5544"
      />
      <path
        d="M17 30 C17 41, 22 50, 32 50 C36 44, 36 30, 30 18 C23 17, 17 22, 17 30 Z"
        fill="#B89A67"
      />
      <path d="M22 30 L26.5 37 L31 29" fill="none" stroke="#172A3A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 24 C43 25, 49 30, 48 38 C43 41, 37 37, 35 30 Z" fill="#393C38" />
      <path
        d="M16 22 C16 13, 24 9, 31 12 C35 16, 35 23, 31 27 C24 29, 17 27, 16 22 Z"
        fill="#5B5544"
      />
      <path d="M17 25 C20 28, 26 29, 30 27 C29 24, 26 22, 21 22 Z" fill="#B89A67" />
      <path d="M17 17 C21 15, 26 15, 30 17" fill="none" stroke="#F7F4EE" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 20 L4 22.5 L16 24.5 Z" fill="#F7F4EE" />
      <circle cx="22" cy="20" r="2.1" fill="#172A3A" />
      <path d="M28 50 L28 56 M25 56 L32 56 M36 49 L37 55 M34 55 L41 55" stroke="#393C38" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Per-route atmosphere. Same structure and the same lockup every time, only
 * the gradient placement and the eyebrow change, which is the same rule the
 * hero variants follow on the site itself: the variation is atmosphere, never
 * structure.
 */
export type OgVariant = "home" | "buy" | "sell" | "veterans" | "investors";

const VARIANTS: Record<OgVariant, { eyebrow: string; glow: string }> = {
  home: { eyebrow: "Wichita area real estate", glow: "50% -10%" },
  buy: { eyebrow: "Buying a house here", glow: "12% 0%" },
  sell: { eyebrow: "Selling a house here", glow: "88% 0%" },
  veterans: { eyebrow: "VA loans and PCS timelines", glow: "20% 100%" },
  investors: { eyebrow: "Investment property analysis", glow: "82% 100%" },
};

export async function ogImage(variant: OgVariant = "home", headline?: string) {
  const v = VARIANTS[variant];
  const brokerage = site.compliance.brokerageName.value;
  const fonts = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          backgroundColor: "#172A3A",
          backgroundImage: `radial-gradient(ellipse 90% 70% at ${v.glow}, #1C3350 0%, #172A3A 55%, #0F1D28 100%)`,
          fontFamily: fonts ? "Archivo" : undefined,
          color: "#F7F4EE",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The one gold hairline, the same rule that opens a section. */}
          <div style={{ display: "flex", width: 56, height: 3, backgroundColor: "#B89A67", borderRadius: 2 }} />
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#C9CDD2",
            }}
          >
            {v.eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 900,
            }}
          >
            {headline ?? "Straight answers before you commit to anything"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {/*
            The Kansas lockup. Agent name over brokerage name, adjacent, with
            the sizes taken from lib/compliance-type.ts rather than typed in
            here, so the ratio assertion covers this card too.
          */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: LOCKUP.agent,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              {site.agentName}
            </div>
            {brokerage && (
              <div style={{ display: "flex", marginTop: 8, fontSize: LOCKUP.brokerage, color: "#C9CDD2" }}>
                {brokerage}
              </div>
            )}
            <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: "#C9CDD2" }}>
              {site.serviceAreas.map((a) => a.name).join("  ·  ")}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <LarkMark size={150} />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
