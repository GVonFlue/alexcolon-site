"use client";

import type { MaybeFact } from "@/lib/schema";
import { Glyph } from "./ui";

/**
 * The town card.
 *
 * The field list is closed, and it is closed in the schema as well as here, so
 * there is no field that could hold a characterization even if someone wanted
 * to add one. What a card may say about a place: which county it is in, how
 * far away it is, what the district is called, what era the housing is from,
 * when it was incorporated, where its own website is, whether the MLS covers
 * it, and one verifiable note.
 *
 * What it may never say: that a place is safe, quiet, desirable, family
 * friendly, up and coming, or has good schools, and anything at all about who
 * lives there. scripts/rules.mjs enforces that against the data with a rule set
 * scoped to exactly these fields, and scripts/audit-negative.mjs proves the
 * rule fires.
 *
 * The null convention runs the whole card. A fact we do not have is
 * `{ value: null, pending }`, and a null row renders nothing at all, not a dash
 * and not "coming soon". Most of these are null today, which is why the card is
 * built to look deliberate when it is half empty: the rows it does carry are
 * left-labelled and evenly spaced, so a card with three facts reads as a short
 * card rather than as a broken one.
 *
 * OUT OF FLOW, AND WHY IT HAS TO BE.
 *
 * This panel used to sit under the map in normal flow, and doing so produced a
 * genuine hover feedback loop in the hero. Measured at 1440px: the caption slot
 * went from 60px to 454px on hover, the figure from 351px to 745px, and because
 * the hero row is a two-column grid with items-center, the whole row re-centred.
 * The map moved 124px UP under a stationary cursor while the headline moved 73px
 * DOWN. The cursor then found itself off the town, the panel closed, everything
 * snapped back, and it repeated at reflow speed.
 *
 * The panel is therefore absolutely positioned inside a relative figure, and the
 * figure's height is exactly the map's height whatever is showing. Hover cannot
 * change layout height because hover no longer touches layout at all.
 *
 * POINTER EVENTS. The container is pointer-events:none so the panel can never
 * become the event target for a pointer that is over a town beneath it, which
 * would fire mouseleave on that town and restart the same loop by a different
 * route. Only the controls inside it take pointer events back, because a CTA
 * nobody can click is not a conversion path.
 */

const ROWS: { key: string; label: string }[] = [
  { key: "county", label: "County" },
  { key: "driveToDowntown", label: "To downtown" },
  { key: "schoolDistrict", label: "District" },
  { key: "housingEra", label: "Housing" },
  { key: "yearIncorporated", label: "Incorporated" },
  { key: "mlsCoverage", label: "MLS" },
  { key: "note", label: "Note" },
];

export type TownFacts = Record<string, MaybeFact>;

/**
 * How tall the full fact card has to be so that every town's card is the same
 * height.
 *
 * Towns publish different numbers of facts today (Wichita has two rows,
 * Andover has four and a district note), so the card's height changed when a
 * visitor moved from one town to the next. Out of flow that moves nothing on
 * the page, but the card itself is a persisting element whose top edge moved,
 * and the browser records that as a layout shift: measured at 0.0065 per
 * change, on a card that had already been taken out of the document flow.
 *
 * So every card is sized to the tallest one. The three constants are measured
 * from the rendered card rather than derived from the CSS, which makes them
 * exactly the kind of number that goes stale silently, so they are not trusted:
 * `tests/map-stability.test.mjs` asserts all seven cards render the same height
 * and fails if any of these drifts.
 *
 * The variance is a symptom of half the town data being withheld. When Alex
 * supplies the missing facts every town will carry all seven rows, maxRows will
 * be 7 for everyone, and this will compute the same number it would have
 * anyway.
 */
const PANEL_BASE_PX = 238;
const PANEL_ROW_PX = 49.3;
const PANEL_NOTE_PX = 60.2;

export function fullPanelMinHeight(towns: { facts?: TownFacts }[]): number {
  let maxRows = 0;
  let anyNote = false;
  for (const t of towns) {
    const f = t.facts ?? {};
    const rows = ROWS.filter((r) => typeof f[r.key]?.value === "string").length;
    if (rows > maxRows) maxRows = rows;
    if (typeof f.schoolDistrict?.value === "string") anyNote = true;
  }
  return Math.ceil(PANEL_BASE_PX + maxRows * PANEL_ROW_PX + (anyNote ? PANEL_NOTE_PX : 0));
}

/**
 * The SMS deep link, with the town carried into the message so Alex opens a
 * thread that already says what it is about.
 *
 * `?&body=` rather than `?body=` is deliberate and is not a typo: iOS has
 * historically wanted the ampersand form and Android the plain one, and the
 * combined form is the one that works on both. The body is encoded, so a town
 * name with a space in it (Park City, Rose Hill) survives.
 */
function smsAbout(e164: string, town: string): string {
  const body = `Hi Alex, I have a question about ${town}.`;
  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}

export function TownPanel({
  town,
  facts,
  phoneE164,
  onClose,
  compact = false,
}: {
  town: string;
  facts: TownFacts;
  phoneE164: string;
  onClose: () => void;
  /**
   * The hero's map card is roughly 300px tall at 1440px and the full fact card
   * is around 450px, so the full card cannot be shown over it without either
   * spilling out of the card or needing a scroll region, and a scroll region
   * has to take pointer events back, which is the thing this panel must not do.
   *
   * The compact variant is the honest resolution rather than a squeeze: the
   * hero map has always been a door (see DESIGN-NOTES v2), and /areas is where
   * the facts live. So the hero gets the town and the way to ask about it, and
   * a link to the full card rather than a shrunken copy of it.
   */
  compact?: boolean;
}) {
  const rows = ROWS.map((r) => ({ ...r, fact: facts?.[r.key] })).filter(
    (r) => r.fact && typeof r.fact.value === "string" && r.fact.value.length > 0,
  );
  const website = facts?.website;
  const hasDistrict = rows.some((r) => r.key === "schoolDistrict");

  if (compact) {
    return (
      <div className="card-lift pointer-events-none rounded-xl border border-cream/12 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="label text-dim">Town</p>
            <p className="display truncate text-[1.15rem] font-extrabold text-cream">{town}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <span className="sr-only">Close the {town} panel</span>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={smsAbout(phoneE164, town)}
            data-cta-kind="direct"
            data-cta-emphasis="secondary"
            className="cta-secondary pointer-events-auto group inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 text-[0.9rem] font-semibold"
          >
            Text Alex about {town}
            <Glyph />
          </a>
          <a href="/areas" className="link-underline pointer-events-auto text-[0.88rem] text-dim">
            All the facts
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card-lift pointer-events-none flex h-full flex-col rounded-xl border border-cream/12 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label text-dim">Town</p>
          <p className="display mt-1 text-[1.5rem] font-extrabold text-cream">{town}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto -mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-cream/10 hover:text-cream"
        >
          <span className="sr-only">Close the {town} panel</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {rows.length > 0 && (
        <dl className="mt-5 space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-cream/10 pt-3">
              <dt className="label text-dim">{r.label}</dt>
              <dd className="text-[0.98rem] leading-[1.55] text-cream">{r.fact!.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {hasDistrict && (
        // Stated once, on the card, rather than hedged into the district field
        // itself. The field is the district's name and nothing else; this is
        // the fact that stops the name being read as a promise about an
        // address. It is a statement about boundaries, not about schools.
        <p className="mt-4 text-[0.85rem] leading-relaxed text-dim">
          District boundaries do not follow city limits. Ask Alex which district a specific
          address is in.
        </p>
      )}

      {website && typeof website.value === "string" && (
        <p className="mt-4 text-[0.92rem]">
          <a
            href={website.value}
            rel="noopener noreferrer"
            target="_blank"
            className="link-underline pointer-events-auto text-cream"
          >
            The city&rsquo;s own website
          </a>
        </p>
      )}

      {/* One conversion path off this card, and the town comes with it.
          mt-auto so that on a town with fewer published facts the spare height
          falls between the facts and the action rather than dangling under it. */}
      <div className="mt-auto pt-6">
        <a
          href={smsAbout(phoneE164, town)}
          data-cta-kind="direct"
          data-cta-emphasis="secondary"
          className="cta-secondary pointer-events-auto group inline-flex min-h-[48px] items-center justify-center rounded-full border px-5 text-[0.95rem] font-semibold"
        >
          Text Alex about {town}
          <Glyph />
        </a>
      </div>
    </div>
  );
}
