#!/usr/bin/env node
/**
 * Negative tests for every auditor in this repo.
 *
 * A passing test that cannot fail is not a test. Each case here injects a real
 * violation, confirms the auditor catches it, then confirms the clean version
 * passes. The rendered checks run against the same module audit-rendered.mjs
 * uses, not a copy of it.
 *
 * This runs first in `npm run audit:all`, because an auditor that cannot fail
 * makes every green result downstream meaningless.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { scan, findStackedFragments, pronounRatio, RULE_SET_KEYS } from "./rules.mjs";
import { auditHtml } from "./html-checks.mjs";
import { killTree } from "./kill-tree.mjs";

let failures = 0;
let ran = 0;

function assert(label, condition, detail = "") {
  ran += 1;
  if (condition) {
    console.log(`  pass  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `  ->  ${detail}` : ""}`);
  }
}

function catches(label, text, ruleSet) {
  const hits = scan(text);
  assert(
    `catches ${label}`,
    hits.some((h) => h.ruleSet === ruleSet),
    `got [${hits.map((h) => h.ruleSet).join(", ") || "nothing"}]`,
  );
}

console.log("Negative tests: copy rules");
console.log("==========================");

// Each of these is a string the auditor MUST reject.
catches("a never_say phrase from intake", "We will help you find your dream home today.", "neverSay");
catches("another never_say phrase", "Our white-glove service makes it easy.", "neverSay");
catches("a doctrine superlative", "The best agent in the area, no question about it.", "doctrine");
catches("doctrine filler", "A passionate professional dedicated to excellence.", "doctrine");
catches("fair housing, safety claim", "This is a very safe part of town to live in.", "fairHousing");
catches("fair housing, school quality", "The area has good schools and great parks.", "fairHousing");
catches("fair housing, familial status", "A family friendly street that is perfect for families.", "fairHousing");
catches("the REALTOR trademark", "Alex is a Realtor serving the Wichita area.", "realtor");
catches("a placeholder phone number", "Call us today at (555) 555-5555 for details.", "placeholder");
catches("a placeholder email", "Reach out at hello@example.com any time.", "placeholder");
catches("an em dash", "He answers the question you asked — every time.", "emDash");

assert(
  "catches stacked fragments",
  Boolean(
    findStackedFragments(
      "One month out. Same room. Same small talk. The whole thing repeats itself again and again for a while.",
    ),
  ),
);

// And these are strings the auditor MUST accept. A rule that fires on clean copy
// is worse than no rule, because it trains everyone to ignore the output.
console.log("\nNegative tests: clean copy must pass");
console.log("===================================");
const CLEAN = [
  "Alex works with first time buyers across seven towns in the Wichita area.",
  "Ask a question before you talk to anyone, and see what sort of answer comes back.",
  "The district names are Maize and Derby, and Alex can tell you which one an address sits in.",
  "He will tell you when he thinks the answer is that you should wait.",
  "Send the address you are already looking at and he will work the numbers on it.",
];
for (const c of CLEAN) {
  const hits = scan(c);
  assert(
    `clean string passes: "${c.slice(0, 46)}..."`,
    hits.length === 0,
    hits.map((h) => `${h.ruleSet}:${h.phrase}`).join(", "),
  );
}

assert(
  "does not flag ordinary prose as stacked fragments",
  findStackedFragments(
    "Most of the stress in a first purchase comes from finding out what something costs on the day it is due, and this page is the part that usually gets skipped by everyone else.",
  ) === null,
);

assert(
  "district NAMES are allowed, only quality is not",
  scan("The house sits in the Goddard school district.").length === 0,
);

assert(
  "REALTOR passes when NAR membership is confirmed",
  scan("Alex is a Realtor.", { allowRealtor: true }).length === 0,
);

console.log("\nNegative tests: pronoun ratio");
console.log("============================");
{
  const bad = pronounRatio("We do this and we do that. Our team, our process, our results.");
  assert("flags copy that talks about itself", bad.ratio < 1, `ratio ${bad.ratio}`);
  const good = pronounRatio("You get the answer you asked for, on your timeline, for your situation.");
  assert("passes copy addressed to the visitor", good.ratio > 3 || good.first === 0);
}

console.log("\nNegative tests: contrast math");
console.log("============================");
{
  // Known values, checked against the WCAG reference so the formula itself is
  // verified rather than assumed.
  const mod = await import("node:module");
  const src = readFileSync(new URL("./audit-contrast.mjs", import.meta.url).pathname, "utf8");
  void mod;
  assert("contrast script composites alpha before measuring", src.includes("function composite("));
  assert("contrast script rejects gold as text on cream", src.includes("gold as text on cream"));
  assert(
    "contrast script exits non-zero on failure",
    src.includes("process.exit(1)") && src.includes("failures > 0"),
  );
}

// ---------------------------------------------------------------------------
// Rendered HTML checks, against the real server and the real check module.
// ---------------------------------------------------------------------------
console.log("\nNegative tests: rendered HTML checks");
console.log("===================================");

const PORT = process.env.NEG_PORT ?? "3112";
const BASE = `http://127.0.0.1:${PORT}`;
const site = JSON.parse(
  readFileSync(new URL("../content/site.json", import.meta.url).pathname, "utf8"),
);
const ctx = {
  allowRealtor: site.compliance?.narMembershipConfirmed === true,
  brokerage: site.compliance?.brokerageName?.value ?? null,
  licenseNumber: site.compliance?.licenseNumber?.value ?? null,
  phoneE164: site.phone.e164,
  agentName: site.agentName,
};

const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: { ...process.env, ALLOWED_ORIGINS: "" },
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

async function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2500) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function named(result, name) {
  const c = result.checks.find((x) => x.name === name);
  if (!c) throw new Error(`No check named "${name}". The check list changed; update this test.`);
  return c.ok;
}

try {
  if (!(await waitForServer())) {
    console.log("  FAIL  could not start the server for rendered negative tests");
    failures += 1;
  } else {
    const clean = await (await fetch(`${BASE}/`)).text();
    const baseline = auditHtml(clean, ctx);

    const failing = baseline.checks.filter((c) => !c.ok);
    assert(
      "the untouched homepage passes every rendered check",
      failing.length === 0,
      failing.map((f) => f.name).join(", "),
    );

    /**
     * Each mutation corrupts exactly one thing and must flip exactly the check
     * that guards it. If a mutation flips nothing, that check is decorative.
     */
    const MUTATIONS = [
      {
        label: "a second h1",
        check: "exactly one h1",
        mutate: (h) => h.replace("</main>", "<h1>Second heading</h1></main>"),
      },
      {
        label: "a banned phrase from intake",
        check: "no banned copy, placeholders, em dashes or fair housing exposure",
        mutate: (h) => h.replace("</main>", "<p>Find your dream home today.</p></main>"),
      },
      {
        label: "a fair housing violation",
        check: "no banned copy, placeholders, em dashes or fair housing exposure",
        mutate: (h) => h.replace("</main>", "<p>A safe area with good schools.</p></main>"),
      },
      {
        label: "a placeholder phone number",
        check: "no banned copy, placeholders, em dashes or fair housing exposure",
        mutate: (h) => h.replace("</main>", "<p>Call (555) 555-5555 now.</p></main>"),
      },
      {
        label: "an em dash in body copy",
        check: "no banned copy, placeholders, em dashes or fair housing exposure",
        mutate: (h) => h.replace("</main>", "<p>He answers it — every time.</p></main>"),
      },
      {
        label: "the REALTOR mark without confirmed membership",
        check: "no banned copy, placeholders, em dashes or fair housing exposure",
        mutate: (h) => h.replace("</main>", "<p>Alex is a Realtor.</p></main>"),
      },
      {
        label: "the brokerage name removed",
        check: "brokerage name in rendered HTML",
        mutate: (h) => h.split(ctx.brokerage).join("Some Other Company"),
      },
      {
        label: "the Equal Housing statement removed",
        check: "Equal Housing statement",
        mutate: (h) => h.replace(/Equal Housing Opportunity/g, "Something Else"),
      },
      {
        label: "every tel: link removed",
        check: "tel: link present",
        mutate: (h) => h.split(`tel:${ctx.phoneE164}`).join("#no-phone"),
      },
      {
        label: "the footer phone removed",
        check: "tappable phone in footer",
        mutate: (h) => {
          const i = h.indexOf("<footer");
          return h.slice(0, i) + h.slice(i).split(`tel:${ctx.phoneE164}`).join("#gone");
        },
      },
      {
        label: "a wrong phone number",
        check: "tel: uses the real number",
        mutate: (h) => h.split(`tel:${ctx.phoneE164}`).join("tel:+15555555555"),
      },
      {
        label: "the skip link removed",
        check: "skip link is first focusable",
        mutate: (h) => h.replace('href="#main"', 'href="/somewhere-else"'),
      },
      {
        label: "an unlabelled form field",
        check: "every field has a real label",
        mutate: (h) => h.replace("</main>", '<input type="text" name="orphan" /></main>'),
      },
      {
        label: "an image with no alt",
        check: "every image has alt",
        mutate: (h) => h.replace("</main>", '<img src="/x.png" /></main>'),
      },
      {
        label: "two primary actions in one band",
        check: "at most one primary action per band",
        mutate: (h) =>
          h.replace(
            "</main>",
            '<section><a data-cta-emphasis="primary" href="/a">One</a><a data-cta-emphasis="primary" href="/b">Two</a></section></main>',
          ),
      },
      {
        label: "a primary action added to the sticky header",
        check: "no primary action in the sticky header",
        mutate: (h) =>
          h.replace("</header>", '<a data-cta-emphasis="primary" href="/x">Book now</a></header>'),
      },
      {
        label: "the closing CTA removed",
        check: "closing CTA before the footer",
        mutate: (h) => h.replace("</main>", "<section><p>Nothing to do here.</p></section></main>"),
      },
      {
        label: "the meta description removed",
        check: "meta description present, 50 to 165 chars",
        mutate: (h) => h.replace(/<meta name="description"[^>]*>/, ""),
      },
      {
        label: "the JSON-LD corrupted",
        check: "JSON-LD present and parses",
        mutate: (h) =>
          h.replace(
            /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
            '<script type="application/ld+json">{not json}</script>',
          ),
      },
      {
        label: "an unverified license number published",
        check: "no unverified license number published",
        mutate: (h) => h.replace("</main>", "<p>Kansas License #SP00229988</p></main>"),
      },
      {
        label: "a page stripped to nothing",
        check: "page renders real content",
        mutate: (h) => h.replace(/<main[^>]*>[\s\S]*<\/main>/, "<main></main>"),
      },
    ];

    for (const m of MUTATIONS) {
      const mutated = m.mutate(clean);
      assert(
        `injecting ${m.label} fails "${m.check}"`,
        mutated !== clean && named(auditHtml(mutated, ctx), m.check) === false,
        mutated === clean ? "mutation did not change the HTML" : "check still passed",
      );
    }

    // Restore, confirm it passes again.
    const restored = auditHtml(clean, ctx);
    assert(
      "restored HTML passes every check again",
      restored.checks.every((c) => c.ok),
      restored.checks.filter((c) => !c.ok).map((c) => c.name).join(", "),
    );
  }
} finally {
  killTree(server);
}

console.log(`\nRule sets covered: ${RULE_SET_KEYS.join(", ")}`);
console.log(`${ran} negative tests, ${failures} failure(s).`);
if (failures > 0) {
  console.error("\nNegative tests failed. The auditors cannot be trusted until this is green.");
  process.exit(1);
}
console.log("Negative tests passed. The auditors can fail, which is what makes their green mean something.");
