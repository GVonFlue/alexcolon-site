#!/usr/bin/env node
/**
 * Content auditor. Runs before every build, so a copy violation fails the build
 * rather than reaching a review. The rendered HTML sweep in audit-rendered.mjs
 * is the authoritative one; this is the fast gate that catches it at the source.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { scan, scanArea, pronounRatio } from "./rules.mjs";

const CONTENT_DIR = new URL("../content/", import.meta.url).pathname;

/** Keys whose values are prose and get the full treatment. */
const PROSE_KEYS = new Set([
  "headline",
  "support",
  "body",
  "intro",
  "line",
  "detail",
  "promise",
  "a",
  "q",
  "successMessage",
  "consentLine",
  "quote",
  "tagline",
  "introduction",
  "description",
  "title",
  "heading",
  "label",
  "lane",
  "submitLabel",
  "eyebrow",
  "job",
]);

/** Fields deliberately exempt: they document what is missing, for us, not visitors. */
const EXEMPT_KEYS = new Set(["pending", "needed", "source", "prompt"]);

let failures = 0;
let checked = 0;

function walk(value, path, out) {
  if (typeof value === "string") {
    const key = path[path.length - 1];
    const parentKey = typeof key === "number" ? path[path.length - 2] : key;
    if (EXEMPT_KEYS.has(parentKey)) return;
    if (!PROSE_KEYS.has(parentKey)) return;
    out.push({ path: path.join("."), text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, [...path, i], out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(v, [...path, k], out);
  }
}

const site = JSON.parse(readFileSync(join(CONTENT_DIR, "site.json"), "utf8"));
const allowRealtor = site.compliance?.narMembershipConfirmed === true;

const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));

console.log("Copy audit");
console.log("==========");
console.log(
  `REALTOR mark: ${allowRealtor ? "PERMITTED, NAR membership confirmed" : "BLOCKED, NAR membership not confirmed"}\n`,
);

for (const file of files) {
  const json = JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
  const strings = [];
  walk(json, [], strings);

  const problems = [];
  for (const { path, text } of strings) {
    checked += 1;
    for (const v of scan(text, { allowRealtor })) {
      problems.push({ path, text, ...v });
    }
  }

  if (problems.length) {
    failures += problems.length;
    console.log(`FAIL  ${file}`);
    for (const p of problems) {
      console.log(`      [${p.ruleSet}] "${p.phrase}"  at ${p.path}`);
      console.log(`          ${p.text.slice(0, 130)}${p.text.length > 130 ? "..." : ""}`);
    }
  } else {
    console.log(`pass  ${file}`);
  }
}

/**
 * The service area facts, scanned with the stricter area-scoped rule set.
 *
 * These need their own pass for two reasons. The walk above only descends into
 * PROSE_KEYS, and a town fact's text lives under `value`, which is not one, so
 * without this the entire town card dataset would ship unscanned. And the town
 * cards are the surface where a fair housing violation is most likely to be
 * introduced by someone trying to make a card more interesting, so they get
 * the strict list rather than the general one.
 *
 * `source` and `pending` stay exempt, the same as everywhere else: they are
 * notes to us about what is missing and they never reach a visitor.
 */
console.log("\nService area facts, strict fair housing rules");
console.log("--------------------------------------------");
let areaProblems = 0;
let areaChecked = 0;
for (const area of site.serviceAreas ?? []) {
  const facts = area.facts ?? {};
  const hits = [];
  for (const [field, fact] of Object.entries(facts)) {
    if (!fact || typeof fact.value !== "string") continue;
    areaChecked += 1;
    for (const v of scanArea(fact.value, { allowRealtor })) {
      hits.push({ field, ...v, text: fact.value });
    }
  }
  if (hits.length) {
    areaProblems += hits.length;
    failures += hits.length;
    console.log(`FAIL  ${area.name}`);
    for (const h of hits) console.log(`      [${h.ruleSet}] "${h.phrase}"  at facts.${h.field}: ${h.text}`);
  } else {
    const withValue = Object.values(facts).filter((f) => f && typeof f.value === "string").length;
    const withheld = Object.values(facts).length - withValue;
    console.log(`pass  ${String(area.name).padEnd(11)} ${withValue} published, ${withheld} withheld`);
  }
}

/**
 * The areas route's own prose gets the strict list too. It is the page the
 * town cards live on, so a characterization in a heading above them is the
 * same violation as one inside them.
 */
{
  const areasJson = JSON.parse(readFileSync(join(CONTENT_DIR, "areas.json"), "utf8"));
  const strings = [];
  walk(areasJson, [], strings);
  const hits = [];
  for (const { path, text } of strings) {
    for (const v of scanArea(text, { allowRealtor })) hits.push({ path, ...v });
  }
  if (hits.length) {
    failures += hits.length;
    console.log(`FAIL  areas.json prose`);
    for (const h of hits) console.log(`      [${h.ruleSet}] "${h.phrase}"  at ${h.path}`);
  } else {
    console.log(`pass  areas.json prose`);
  }
}

/**
 * Pronoun ratio, per page. This is a personal brand build, so the doctrine's
 * exception applies and the target is judged rather than enforced at 4:1. Third
 * person references to Alex count as neither, which is correct: "he" is not the
 * site talking about itself.
 */
console.log("\nPronoun ratio, you against we, per route");
console.log("----------------------------------------");
let ratioWarnings = 0;
for (const file of files) {
  if (file === "site.json" || file === "magnets.json") continue;
  const json = JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
  const strings = [];
  walk(json, [], strings);
  const text = strings.map((s) => s.text).join(" ");
  const { second, first, ratio } = pronounRatio(text);
  const shown = ratio === Infinity ? "no first person at all" : `${ratio.toFixed(2)}:1`;
  const bad = ratio < 1;
  const warn = ratio < 3 && ratio !== Infinity;
  if (bad) failures += 1;
  if (warn) ratioWarnings += 1;
  console.log(
    `${bad ? "FAIL" : warn ? "warn" : "pass"}  ${String(json.route).padEnd(12)} you=${String(second).padEnd(4)} we=${String(first).padEnd(4)} ${shown}`,
  );
}

console.log(
  `\n${checked} strings checked, plus ${areaChecked} service area facts (${areaProblems} area failure(s)). ${failures} failure(s), ${ratioWarnings} ratio warning(s).`,
);

if (failures > 0) {
  console.error("\nCopy audit failed. Fix the copy. Do not loosen the rules.");
  process.exit(1);
}
console.log("Copy audit passed.");
