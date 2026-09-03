/**
 * Where this deployment thinks it lives, and whether it is allowed to be
 * indexed.
 *
 * Both questions used to be answered inline in three separate files
 * (app/layout.tsx, app/robots.ts, app/sitemap.ts), each with its own
 * `process.env.SITE_ORIGIN ?? "http://localhost:3000"`. That fallback is the
 * defect this module exists to close: with SITE_ORIGIN unset in production
 * every route emitted `canonical: http://localhost:3000` while meta robots
 * said index, follow, which points Google at a host that does not exist and
 * does it silently.
 *
 * Resolution order, most specific first:
 *
 *   1. SITE_ORIGIN                        the operator said so, believe them
 *   2. VERCEL_PROJECT_PRODUCTION_URL      the project's stable production domain
 *   3. VERCEL_URL                         this one deployment's own hostname
 *   4. http://localhost:3000              local development only
 *
 * The brief asked for VERCEL_URL as the fallback. VERCEL_PROJECT_PRODUCTION_URL
 * sits above it because VERCEL_URL is per deployment: it carries a build hash
 * and changes on every push, so using it for a canonical tag on the production
 * deployment would emit a different canonical every time Alex's site is
 * redeployed. VERCEL_URL is still the fallback under it, which is the behavior
 * that was actually asked for whenever the stable domain is not exposed.
 */

/** Strip a trailing slash and supply the scheme Vercel's own variables omit. */
function normalize(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return withScheme.replace(/\/+$/, "");
}

const LOCAL = "http://localhost:3000";

/** "production", "preview", "development", or null when this is not Vercel. */
export const vercelEnv = process.env.VERCEL_ENV ?? null;

/** True when this process is running inside a Vercel build or function. */
export const onVercel = Boolean(process.env.VERCEL);

export const configuredOrigin = normalize(process.env.SITE_ORIGIN);
const productionOrigin = normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const deploymentOrigin = normalize(process.env.VERCEL_URL);

export const siteOrigin =
  configuredOrigin ?? productionOrigin ?? deploymentOrigin ?? LOCAL;

/**
 * Loud, once, at module load, which on a Next build means it lands in the
 * build log where somebody reads it. Deliberately not a thrown error when a
 * Vercel origin is available: refusing to build would take a working site down
 * over a variable that has a correct automatic answer. It is a thrown error
 * when nothing at all resolves on Vercel, because at that point every
 * canonical, the sitemap and the JSON-LD would all publish localhost.
 */
function warnAboutOrigin() {
  if (configuredOrigin) return;
  if (!onVercel) return; // Local development. localhost is the right answer.

  const fallback = productionOrigin ?? deploymentOrigin;
  if (!fallback) {
    throw new Error(
      [
        "SITE_ORIGIN is not set and no Vercel origin could be resolved.",
        "Every canonical tag, the sitemap and the JSON-LD would publish",
        `${LOCAL}, which is not a real host. Set SITE_ORIGIN in the Vercel`,
        "Environment Variables screen for this environment and redeploy.",
      ].join(" "),
    );
  }

  console.error(
    [
      "",
      "==============================================================",
      "  SITE_ORIGIN is not set.",
      `  Falling back to ${fallback}`,
      "",
      "  This is a working canonical, not a correct one. Set",
      "  SITE_ORIGIN to the real domain in the Vercel Environment",
      "  Variables screen so canonicals, the sitemap, the JSON-LD and",
      "  the OG image URLs all point at the domain visitors use.",
      "==============================================================",
      "",
    ].join("\n"),
  );
}
warnAboutOrigin();

/**
 * Whether this host may be indexed.
 *
 * The failure this prevents: a vercel.app preview getting indexed and then
 * competing with the real domain after cutover, which is a duplicate-content
 * problem that outlives the preview itself.
 *
 * The failure it must NOT cause is the opposite one, named in app/robots.ts:
 * a leftover noindex launching a site invisible to Google. So the rule is
 * narrow. Indexing is suppressed only where the host is provably not the
 * production one:
 *
 *   - a Vercel preview or development deployment, always
 *   - never on a Vercel production deployment, even with SITE_ORIGIN unset,
 *     because there the fallback origin is already the production domain and
 *     an invisible launch is the worse of the two failures
 *   - never off Vercel, so `next start` behind the auditors and any
 *     self-hosted deployment behave exactly as they did before
 *
 * "It must switch off automatically when SITE_ORIGIN matches the host" is the
 * second clause: a preview that has been given a SITE_ORIGIN equal to its own
 * deployment URL is a deliberately published host and is indexed.
 */
export const isIndexable: boolean = (() => {
  if (!onVercel) return true;
  if (vercelEnv === "production") return true;
  if (configuredOrigin && configuredOrigin === deploymentOrigin) return true;
  return false;
})();

/** Absolute URL for a site-relative path, for canonicals and OG image tags. */
export function absoluteUrl(path: string): string {
  return `${siteOrigin}${path === "/" ? "" : path}`;
}

/**
 * What kind of deployment this is, in one word, for lead source tagging.
 *
 * "preview" is the one that matters. A preview deployment is a real, working
 * site with real, working forms, and every lead somebody generates while
 * clicking around one lands in the same Sheet as a real lead from the real
 * domain. That has burned this shop before: a round of internal testing on a
 * preview URL puts a dozen fake rows in the live sheet, indistinguishable from
 * the genuine ones, and the client finds them.
 *
 * lib/leads.ts stamps this onto every source tag that is not production, after
 * the tag has been validated against the allowlist, so a preview row is
 * obvious at a glance and can be filtered out in one pass.
 */
export type DeploymentKind = "production" | "preview" | "development" | "local";

export const deploymentKind: DeploymentKind = (() => {
  if (!onVercel) return "local";
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "development";
})();

export const isProductionDeployment = deploymentKind === "production";
