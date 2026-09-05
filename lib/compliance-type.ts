/**
 * Kansas advertising law, expressed as numbers instead of as a comment.
 *
 * K.S.A. 58-3086 and the Kansas Real Estate Commission's advertising rules
 * require the supervising broker's business or trade name to appear in a
 * readable and identifiable manner, and require that an associated licensee's
 * own name not be given greater prominence than the broker's. The working
 * limit this build holds itself to is the strict one: the agent's name never
 * exceeds twice the brokerage name's font size, and the two appear adjacent to
 * each other rather than in different regions of the page.
 *
 * Every place the two names are set together registers its sizes here, and
 * `assertLockups` throws at module load if any pairing breaks the ratio. That
 * makes the rule a build failure rather than something a restyle can quietly
 * violate: changing a heading size in a component without changing the number
 * here does not break anything, but changing the number to something illegal
 * does, and the rendered check in scripts/shots.mjs measures the sizes the
 * browser actually computed so the two cannot drift apart either.
 *
 * Sizes are in rem for the DOM lockups and in px for the OG image, which is
 * rendered by Satori at a fixed 1200x630 and has no rem to resolve against.
 * The ratio is unitless, so mixing the two is safe as long as a single lockup
 * never mixes them, which `assertLockups` also checks.
 */

export const MAX_AGENT_TO_BROKERAGE_RATIO = 2;

export type Lockup = {
  /** Where this pairing is painted, for the error message and the report. */
  where: string;
  unit: "rem" | "px";
  agent: number;
  brokerage: number;
};

/**
 * Every surface that sets Alex's name beside the brokerage name. Adding a new
 * one without adding it here is caught by the rendered check, which walks
 * `[data-compliance-lockup]` in the DOM rather than trusting this list.
 *
 * The open graph card's two sizes went up (68/38 to 74/40) when the card was
 * rebuilt around the photograph. The reason is legibility rather than taste:
 * an iMessage link preview renders the 1200px card at roughly 300px, a quarter
 * of its nominal size, so 38px of brokerage name arrives as 9.5px and 40px
 * arrives as 10px. Both names had to grow together, which is also the only way
 * to grow either one: the ratio moved 1.79x to 1.85x and the cap is still 2x.
 */
export const LOCKUPS: Lockup[] = [
  { where: "sticky header wordmark", unit: "rem", agent: 1.02, brokerage: 0.72 },
  { where: "footer identity block", unit: "rem", agent: 1.15, brokerage: 0.82 },
  { where: "open graph card", unit: "px", agent: 74, brokerage: 40 },
];

export function assertLockups(lockups: Lockup[] = LOCKUPS): void {
  for (const l of lockups) {
    if (!(l.agent > 0) || !(l.brokerage > 0)) {
      throw new Error(
        `Compliance lockup "${l.where}" has a non-positive font size. Both names must actually render.`,
      );
    }
    const ratio = l.agent / l.brokerage;
    if (ratio > MAX_AGENT_TO_BROKERAGE_RATIO) {
      throw new Error(
        `Compliance lockup "${l.where}" sets the agent name at ${ratio.toFixed(2)}x the ` +
          `brokerage name. Kansas advertising rules cap this at ` +
          `${MAX_AGENT_TO_BROKERAGE_RATIO}x. Raise the brokerage size or lower the agent size.`,
      );
    }
  }
}
assertLockups();

/** The registered sizes, as the CSS the components actually use. */
export function lockupSize(where: string, part: "agent" | "brokerage"): string {
  const l = LOCKUPS.find((x) => x.where === where);
  if (!l) throw new Error(`No compliance lockup registered for "${where}".`);
  return `${l[part]}${l.unit}`;
}
