#!/usr/bin/env node
/**
 * What this build is still missing, read from the content files themselves so it
 * can never drift from what the site actually renders.
 *
 * Say what is not built. Say what is blocked and on whom. A report that only
 * contains good news is a report nobody can act on.
 */
import { readFileSync } from "node:fs";

const read = (f) =>
  JSON.parse(readFileSync(new URL(`../content/${f}`, import.meta.url).pathname, "utf8"));

const site = read("site.json");
const { magnets } = read("magnets.json");

const blocking = [];
const withheld = [];
const confirm = [];

const c = site.compliance;

for (const [field, fact] of Object.entries({
  brokerageName: c.brokerageName,
  brokerageAddress: c.brokerageAddress,
  brokeragePhone: c.brokeragePhone,
  licenseNumber: c.licenseNumber,
})) {
  if (fact.value === null) blocking.push([field, fact.pending]);
  else if (/confirm/i.test(fact.source ?? "")) confirm.push([field, fact.value, fact.source]);
}

if (!c.narMembershipConfirmed) {
  withheld.push([
    "REALTOR trademark",
    "NAR membership is not confirmed, so the word is a build failure anywhere on the site. Flip compliance.narMembershipConfirmed when it is confirmed.",
  ]);
}
if (site.numbers.length === 0) {
  withheld.push([
    "numbers band",
    "No verifiable figures supplied, so the band withholds itself rather than shipping invented credibility. Four real figures would turn it on.",
  ]);
}
if (site.testimonials.length === 0) {
  withheld.push([
    "every proof band",
    "No testimonial has permission on file. Never publish one without permission, and never edit the words. This is the single highest value thing Alex can send.",
  ]);
}
if (site.headshot.src === null) {
  withheld.push(["headshot slot in the trust band", site.headshot.needed]);
}
if (site.assistant.bookingUrl === null) {
  withheld.push([
    "any booking claim by the assistant",
    "No calendar integration exists, so the assistant is forbidden from saying an appointment is booked, confirmed, scheduled or held. It passes a requested time. Set assistant.bookingUrl when a real one exists.",
  ]);
}
for (const m of magnets) {
  if (!m.assetReady) {
    blocking.push([
      `magnet: ${m.title}`,
      "The document does not exist yet. The form honestly says Alex sends it himself rather than promising a download, but he has to actually have it before launch.",
    ]);
  }
}

const wrap = (s, indent = 8) =>
  s
    .split(" ")
    .reduce(
      (lines, w) => {
        if ((lines.at(-1) + " " + w).length > 88 - indent) lines.push(w);
        else lines[lines.length - 1] += ` ${w}`;
        return lines;
      },
      [""],
    )
    .map((l) => " ".repeat(indent) + l.trim())
    .join("\n");

console.log("Build report");
console.log("============\n");

console.log(`BLOCKING LAUNCH  (${blocking.length})`);
console.log("Needed from Alex before this site can go live.\n");
for (const [field, why] of blocking) {
  console.log(`  - ${field}`);
  console.log(wrap(why));
  console.log();
}

console.log(`\nVERIFY BEFORE LAUNCH  (${confirm.length})`);
console.log("Taken from a primary source. Alex should confirm each one himself.\n");
for (const [field, value, source] of confirm) {
  console.log(`  - ${field}: ${value}`);
  console.log(wrap(source));
  console.log();
}

console.log(`\nWITHHELD, BUILT AND WAITING  (${withheld.length})`);
console.log("These render nothing today. Supply the fact and they appear, no code change.\n");
for (const [field, why] of withheld) {
  console.log(`  - ${field}`);
  console.log(wrap(why));
  console.log();
}

console.log("\nNothing above is a placeholder anywhere in the rendered HTML.");
console.log("Run `npm run audit:all` to confirm.");
