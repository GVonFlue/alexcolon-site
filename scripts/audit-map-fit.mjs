#!/usr/bin/env node
/**
 * Confirms every town's label actually fits inside the generated map's
 * viewBox, right now, independent of how lib/generated/wichitaMap.ts got
 * its padding.
 *
 * content/site.json (the town list) is a file a client edits directly.
 * The map's VIEW_W/VIEW_H/project are generated once and only change when
 * someone runs scripts/build-map-geometry.mjs by hand. Add a town, rename
 * one to something longer, and the generated file does not know until
 * that script runs again, so this audit recomputes each label's real
 * extent from the current content/site.json against the currently
 * generated viewBox and fails loudly if any of them no longer agree,
 * rather than a visitor finding the clipped label.
 *
 * checkMapFit is the same function the negative test in
 * scripts/audit-negative.mjs exercises with a deliberately long fake town
 * name, so this check is proven able to fail before it is trusted to pass.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkMapFit } from "./map-fit-check.mjs";

const ROOT = process.cwd();

console.log("Map fit audit");
console.log("=============\n");

const towns = JSON.parse(readFileSync(path.join(ROOT, "content", "site.json"), "utf8")).serviceAreas;
const map = await import(path.join(ROOT, "lib", "generated", "wichitaMap.ts"));

const result = checkMapFit(towns, map);

if (result.ok) {
  console.log(`pass  all ${towns.length} town labels fit inside the generated viewBox (${map.VIEW_W}x${map.VIEW_H})`);
  console.log("\nMap fit audit passed.");
  process.exit(0);
}

console.log(`FAIL  ${result.violations.length} label(s) do not fit the currently generated map:`);
for (const v of result.violations) console.log(`      ${v}`);
console.log("\nRun node scripts/build-map-geometry.mjs to refit the view to the current town list.");
console.error("Map fit audit failed.");
process.exit(1);
