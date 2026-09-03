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
}: {
  town: string;
  facts: TownFacts;
  phoneE164: string;
  onClose: () => void;
}) {
  const rows = ROWS.map((r) => ({ ...r, fact: facts?.[r.key] })).filter(
    (r) => r.fact && typeof r.fact.value === "string" && r.fact.value.length > 0,
  );
  const website = facts?.website;
  const hasDistrict = rows.some((r) => r.key === "schoolDistrict");

  return (
    <div className="card-lift rounded-xl border border-cream/12 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label text-dim">Town</p>
          <p className="display mt-1 text-[1.5rem] font-extrabold text-cream">{town}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-cream/10 hover:text-cream"
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
            className="link-underline text-cream"
          >
            The city&rsquo;s own website
          </a>
        </p>
      )}

      {/* One conversion path off this card, and the town comes with it. */}
      <div className="mt-6">
        <a
          href={smsAbout(phoneE164, town)}
          data-cta-kind="direct"
          data-cta-emphasis="secondary"
          className="cta-secondary group inline-flex min-h-[48px] items-center justify-center rounded-full border px-5 text-[0.95rem] font-semibold"
        >
          Text Alex about {town}
          <Glyph />
        </a>
      </div>
    </div>
  );
}
