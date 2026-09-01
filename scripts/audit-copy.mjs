#!/usr/bin/env node
/**
 * Content auditor. Runs before every build, so a copy violation fails the build
 * rather than reaching a review. The rendered HTML sweep in audit-rendered.mjs
 * is the authoritative one; this is the fast gate that catches it at the source.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { scan, pronounRatio } from "./rules.mjs";

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
  `\n${checked} strings checked. ${failures} failure(s), ${ratioWarnings} ratio warning(s).`,
);

if (failures > 0) {
  console.error("\nCopy audit failed. Fix the copy. Do not loosen the rules.");
  process.exit(1);
}
console.log("Copy audit passed.");
