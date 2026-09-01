import "server-only";
import { SiteConfig, PageContent, MagnetsFile, type LeadMagnet } from "./schema";

import siteJson from "@/content/site.json";
import magnetsJson from "@/content/magnets.json";
import homeJson from "@/content/home.json";
import buyJson from "@/content/buy.json";
import sellJson from "@/content/sell.json";
import veteransJson from "@/content/veterans.json";
import investorsJson from "@/content/investors.json";
import areasJson from "@/content/areas.json";
import aboutJson from "@/content/about.json";
import contactJson from "@/content/contact.json";

/**
 * Validation happens once, at module load, which means a bad content edit fails
 * the build rather than rendering a broken page. This is the check the future
 * self-edit portal will run against a proposed patch before it is written.
 */
function parse<T>(schema: { parse: (v: unknown) => T }, raw: unknown, label: string): T {
  try {
    return schema.parse(raw);
  } catch (err) {
    throw new Error(
      `Content validation failed for ${label}. Fix the content file, do not loosen the schema.\n${String(err)}`,
    );
  }
}

export const site = parse(SiteConfig, siteJson, "content/site.json");

const magnetsFile = parse(MagnetsFile, magnetsJson, "content/magnets.json");
export const magnets = magnetsFile.magnets;

export const pages = {
  home: parse(PageContent, homeJson, "content/home.json"),
  buy: parse(PageContent, buyJson, "content/buy.json"),
  sell: parse(PageContent, sellJson, "content/sell.json"),
  veterans: parse(PageContent, veteransJson, "content/veterans.json"),
  investors: parse(PageContent, investorsJson, "content/investors.json"),
  areas: parse(PageContent, areasJson, "content/areas.json"),
  about: parse(PageContent, aboutJson, "content/about.json"),
  contact: parse(PageContent, contactJson, "content/contact.json"),
} as const;

export const allPages = Object.values(pages);

/** Unique title and meta description per route. Definition of done, Technical. */
(function assertUniqueMeta() {
  for (const field of ["title", "description", "route"] as const) {
    const seen = new Map<string, string>();
    for (const p of allPages) {
      const prior = seen.get(p[field]);
      if (prior) {
        throw new Error(
          `Duplicate ${field} across routes: "${p[field]}" on both ${prior} and ${p.route}.`,
        );
      }
      seen.set(p[field], p.route);
    }
  }
})();

export function magnet(id: string): LeadMagnet {
  const found = magnets.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown lead magnet "${id}".`);
  return found;
}

/** Every valid source tag. The API rejects anything not on this list. */
export const validSourceTags: readonly string[] = [
  ...magnets.map((m) => m.sourceTag),
  site.assistant.sourceTag,
];

export function telHref() {
  return `tel:${site.phone.e164}`;
}
export function smsHref() {
  return `sms:${site.phone.e164}`;
}

/**
 * The compliance strings that must render on every page. Kansas requires the
 * supervising broker's name directly, not behind a link, so this is called by
 * the footer on every route rather than living on a single legal page.
 */
export function complianceLines(): string[] {
  const c = site.compliance;
  const out: string[] = [];

  if (c.brokerageName.value) {
    const parts = [c.brokerageName.value];
    if (c.brokerageAddress.value) parts.push(c.brokerageAddress.value);
    if (c.brokeragePhone.value) parts.push(c.brokeragePhone.value);
    out.push(parts.join(" · "));
  }

  // Withheld until Alex confirms the number in writing. Never guessed.
  if (c.licenseNumber.value) {
    out.push(`${site.agentName}, Kansas license ${c.licenseNumber.value}`);
  }

  if (c.idxDisclaimer) out.push(c.idxDisclaimer);
  out.push(...c.additionalRequired);
  return out;
}

/**
 * Hard stop 4. The trademark is gated on confirmed NAR membership, and it is
 * not confirmed, so nothing in this build may use it. Kept as a function so the
 * day membership is confirmed it flips in one place.
 */
export function mayUseRealtorMark(): boolean {
  return site.compliance.narMembershipConfirmed;
}

/** Every unverified fact, for the build report. Nothing here renders. */
export function pendingFacts(): { field: string; needed: string }[] {
  const out: { field: string; needed: string }[] = [];
  const c = site.compliance;
  for (const [field, fact] of Object.entries({
    brokerageName: c.brokerageName,
    brokerageAddress: c.brokerageAddress,
    brokeragePhone: c.brokeragePhone,
    licenseNumber: c.licenseNumber,
  })) {
    if (fact.value === null) out.push({ field, needed: (fact as { pending: string }).pending });
  }
  if (site.headshot.src === null)
    out.push({ field: "headshot", needed: site.headshot.needed });
  if (site.numbers.length === 0)
    out.push({
      field: "numbers",
      needed:
        "No verifiable figures supplied, so the numbers band withholds itself rather than shipping invented credibility.",
    });
  if (site.testimonials.length === 0)
    out.push({
      field: "testimonials",
      needed:
        "No testimonials with permission on file. Hard stop 3, so every proof band withholds itself.",
    });
  for (const m of magnets) {
    if (!m.assetReady)
      out.push({
        field: `magnet:${m.id}`,
        needed: `"${m.title}" does not exist as a document yet. The form promises Alex will send it rather than an instant download, which is honest but he has to actually have it before launch.`,
      });
  }
  return out;
}
