/**
 * One rule set, used by both the content auditor and the rendered HTML auditor,
 * so there is a single implementation for the negative tests to exercise.
 *
 * Our copy auditor was wrong four times before it was right on the last build,
 * and the fourth error was in the dangerous direction: it was passing strings it
 * should have failed. Hence scripts/audit-negative.mjs, which injects each
 * violation, confirms the rule fails, restores, and confirms it passes.
 */

/** Word boundary match that tolerates the surrounding punctuation of real copy. */
function words(list) {
  return list.map((w) => ({
    phrase: w,
    re: new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s\\u00a0-]+")}($|[^a-z0-9])`, "i"),
  }));
}

/** From intake. Alex named every one of these himself. */
export const NEVER_SAY = words([
  "dream home",
  "forever home",
  "unlock the door",
  "turning dreams into reality",
  "real estate journey",
  "luxury living",
  "white glove",
  "white-glove",
  "premier",
  "elite",
  "top producer",
  "best in class",
  "one stop shop",
  "stress free",
  "hassle free",
  "seamless",
]);

/** Section 5 of the build doctrine. Vague words are the absence of a claim. */
export const DOCTRINE_BANNED = words([
  "passionate",
  "proven system",
  "next level",
  "dedicated to excellence",
  "committed to your success",
  "best",
  "leading",
  "world class",
  "cutting edge",
  "state of the art",
  "unparalleled",
  "second to none",
]);

/**
 * Hard stop 5. Fair housing applies to every string on a real estate build.
 * District and place NAMES are facts and are fine. District QUALITY is exposure.
 */
export const FAIR_HOUSING = words([
  "safe",
  "safest",
  "unsafe",
  "safety",
  "crime",
  "crime rate",
  "family friendly",
  "great for families",
  "perfect for families",
  "good schools",
  "great schools",
  "best schools",
  "top schools",
  "top rated schools",
  "school ratings",
  "highly rated schools",
  "up and coming",
  "exclusive neighborhood",
  "desirable neighborhood",
  "prestigious",
  "quiet neighborhood",
  "adults only",
  "no children",
  "christian",
  "church nearby",
  "ethnic",
  "integrated neighborhood",
  "traditional neighborhood",
  "mature neighborhood",
  "good area",
  "bad area",
  "nice area",
]);

/** Hard stop 4. Gated on confirmed NAR membership, which is not confirmed. */
export const REALTOR_MARK = [{ phrase: "REALTOR", re: /(^|[^a-z0-9])realtors?(®|\b)/i }];

/** Hard stop 2. Never publish a placeholder to a live site. */
export const PLACEHOLDERS = [
  { phrase: "(555) 555-5555", re: /\(?555\)?[\s.-]?555[\s.-]?5555/ },
  { phrase: "555-1234", re: /555[\s.-]?1234/ },
  { phrase: "lorem ipsum", re: /lorem\s+ipsum/i },
  { phrase: "example.com", re: /@example\.com|https?:\/\/(www\.)?example\.com/i },
  { phrase: "mymailservice", re: /mymailservice/i },
  { phrase: "yourdomain", re: /yourdomain/i },
  { phrase: "TODO", re: /(^|[^a-z])TODO($|[^a-z])/ },
  { phrase: "FIXME", re: /(^|[^a-z])FIXME($|[^a-z])/ },
  { phrase: "Lorem", re: /(^|[^a-z])Lorem($|[^a-z])/ },
  { phrase: "placeholder text", re: /placeholder text/i },
  { phrase: "your text here", re: /your text here/i },
  { phrase: "coming soon", re: /coming soon/i },
];

/** Section 5. Em dashes are prohibited, always. */
export const EM_DASH = [
  { phrase: "em dash", re: /—/ },
  { phrase: "en dash used between words", re: /[a-z]\s–\s[a-z]/i },
];

const RULE_SETS = {
  neverSay: { label: "never_say list from intake", rules: NEVER_SAY },
  doctrine: { label: "doctrine banned words", rules: DOCTRINE_BANNED },
  fairHousing: { label: "fair housing", rules: FAIR_HOUSING },
  realtor: { label: "REALTOR trademark without confirmed NAR membership", rules: REALTOR_MARK },
  placeholder: { label: "placeholder content", rules: PLACEHOLDERS },
  emDash: { label: "em dash", rules: EM_DASH },
};

/**
 * Stacked short fragments. "One month out. Same room. Same small talk." reads as
 * machine written to everyone under forty. Only applied to real prose, so a
 * label or a nav item is never flagged for being short.
 */
export function findStackedFragments(text) {
  if (text.length < 80) return null;
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let run = 0;
  for (const s of sentences) {
    const count = s.split(/\s+/).filter(Boolean).length;
    if (count > 0 && count <= 4) {
      run += 1;
      if (run >= 3) return "three or more consecutive sentences of four words or fewer";
    } else {
      run = 0;
    }
  }
  return null;
}

const SECOND = /\b(you|your|yours|you're|you'll|you've|you'd)\b/gi;
const FIRST = /\b(we|us|our|ours|we're|we'll|we've|i|me|my|mine|i'm|i'll|i've)\b/gi;

export function pronounRatio(text) {
  const second = (text.match(SECOND) ?? []).length;
  const first = (text.match(FIRST) ?? []).length;
  return { second, first, ratio: first === 0 ? Infinity : second / first };
}

/**
 * Returns every violation in a string. `only` narrows to a subset of rule sets,
 * which is what lets the negative test exercise one rule at a time.
 */
export function scan(text, { only = null, allowRealtor = false } = {}) {
  const found = [];
  for (const [key, set] of Object.entries(RULE_SETS)) {
    if (only && !only.includes(key)) continue;
    if (key === "realtor" && allowRealtor) continue;
    for (const rule of set.rules) {
      if (rule.re.test(text)) {
        found.push({ ruleSet: key, label: set.label, phrase: rule.phrase });
      }
    }
  }
  if (!only || only.includes("fragments")) {
    const frag = findStackedFragments(text);
    if (frag) found.push({ ruleSet: "fragments", label: "stacked fragments", phrase: frag });
  }
  return found;
}

export const RULE_SET_KEYS = [...Object.keys(RULE_SETS), "fragments"];
