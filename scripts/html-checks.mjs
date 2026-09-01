/**
 * The rendered HTML checks, in one importable place.
 *
 * audit-rendered.mjs runs these against the real server. audit-negative.mjs runs
 * the same functions against deliberately corrupted HTML and asserts each one
 * fails. Sharing the implementation is the point: a negative test that exercises
 * a copy of the logic proves nothing about the logic that actually ships.
 */
import { parse } from "node-html-parser";
import { scan } from "./rules.mjs";

/** Visible text only. Scripts, styles and noscript excluded. */
export function visibleText(root) {
  const clone = parse(root.toString());
  clone.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return clone.structuredText.replace(/\s+/g, " ").trim();
}

function hasLabelAncestor(node) {
  let cur = node.parentNode;
  while (cur) {
    if (cur.rawTagName && cur.rawTagName.toLowerCase() === "label") return true;
    cur = cur.parentNode;
  }
  return false;
}

/**
 * ctx: { allowRealtor, brokerage, phoneE164, agentName, licenseNumber }
 * Returns [{ name, ok, detail }]
 */
export function auditHtml(html, ctx) {
  const root = parse(html);
  const text = visibleText(root);
  const out = [];
  const check = (name, ok, detail = "") => out.push({ name, ok: Boolean(ok), detail });

  // --- Structure -----------------------------------------------------------
  const h1s = root.querySelectorAll("h1");
  check("exactly one h1", h1s.length === 1, `found ${h1s.length}`);
  check("html lang set", /<html[^>]*\slang=/.test(html));
  check("main landmark", root.querySelectorAll("main").length === 1);
  check("header landmark", root.querySelectorAll("header").length >= 1);
  check("footer landmark", root.querySelectorAll("footer").length >= 1);
  check("nav landmark", root.querySelectorAll("nav").length >= 1);

  const firstLink = root.querySelector("a");
  check(
    "skip link is first focusable",
    Boolean(firstLink) && firstLink.getAttribute("href") === "#main",
    firstLink ? `first anchor href is ${firstLink.getAttribute("href")}` : "no anchor",
  );

  // --- Content -------------------------------------------------------------
  const violations = scan(text, { allowRealtor: ctx.allowRealtor });
  check(
    "no banned copy, placeholders, em dashes or fair housing exposure",
    violations.length === 0,
    violations.map((v) => `[${v.ruleSet}] ${v.phrase}`).join(", "),
  );
  check("page renders real content", text.length > 1200, `${text.length} chars`);

  // --- Compliance ----------------------------------------------------------
  if (ctx.brokerage) {
    check("brokerage name in rendered HTML", text.includes(ctx.brokerage));
  }
  check("Equal Housing statement", /equal housing/i.test(text));
  check(
    "no unverified license number published",
    ctx.licenseNumber !== null || !/\blicen[cs]e\s*(number|#|no\.?)?\s*[:#]?\s*[A-Z0-9-]{4,}/i.test(text),
  );

  // --- Redundant lead generation -------------------------------------------
  const hrefs = root.querySelectorAll("a[href]").map((a) => a.getAttribute("href"));
  const telLinks = hrefs.filter((h) => h.startsWith("tel:"));
  const smsLinks = hrefs.filter((h) => h.startsWith("sms:"));
  const mailLinks = hrefs.filter((h) => h.startsWith("mailto:"));
  const forms = root.querySelectorAll("form[action='/api/lead']");
  const assistant = root.querySelectorAll("[role='log']").length > 0;

  const doors = [
    forms.length > 0 && "form",
    telLinks.length > 0 && "phone",
    smsLinks.length > 0 && "text",
    mailLinks.length > 0 && "email",
    assistant && "assistant",
  ].filter(Boolean);

  check("two or more distinct conversion paths", doors.length >= 2, `doors: ${doors.join(", ") || "none"}`);
  check("tel: link present", telLinks.length >= 1, `${telLinks.length} found`);
  check(
    "tel: uses the real number",
    telLinks.length > 0 && telLinks.every((h) => h === `tel:${ctx.phoneE164}`),
    telLinks.join(" "),
  );

  const header = root.querySelector("header");
  const footer = root.querySelector("footer");
  check("tappable phone in header", Boolean(header) && header.toString().includes(`tel:${ctx.phoneE164}`));
  check("tappable phone in footer", Boolean(footer) && footer.toString().includes(`tel:${ctx.phoneE164}`));

  const sections = root.querySelectorAll("main section");
  const last = sections[sections.length - 1];
  check(
    "closing CTA before the footer",
    Boolean(last) && last.querySelectorAll("[data-cta-emphasis='primary']").length >= 1,
  );
  check(
    "page does not end on the assistant",
    Boolean(last) && last.querySelectorAll("[role='log']").length === 0,
  );

  // --- Hick's Law ----------------------------------------------------------
  let worst = 0;
  for (const s of sections) {
    const n = s.querySelectorAll("[data-cta-emphasis='primary']").length;
    if (n > worst) worst = n;
  }
  check("at most one primary action per band", worst <= 1, `worst band has ${worst}`);
  check(
    "no primary action in the sticky header",
    !header || header.querySelectorAll("[data-cta-emphasis='primary']").length === 0,
  );

  // --- Accessibility -------------------------------------------------------
  const imgs = root.querySelectorAll("img");
  check(
    "every image has alt",
    imgs.every((i) => typeof i.getAttribute("alt") === "string"),
    `${imgs.length} images`,
  );

  const fields = root.querySelectorAll("input,textarea,select").filter((f) => {
    const type = (f.getAttribute("type") ?? "").toLowerCase();
    return !["hidden", "submit", "button"].includes(type);
  });
  const labelledFor = new Set(
    root.querySelectorAll("label").map((l) => l.getAttribute("for")).filter(Boolean),
  );
  const labelled = fields.filter((f) => {
    if (f.getAttribute("aria-label") || f.getAttribute("aria-labelledby")) return true;
    const id = f.getAttribute("id");
    if (id && labelledFor.has(id)) return true;
    return hasLabelAncestor(f);
  });
  check("every field has a real label", labelled.length === fields.length, `${labelled.length}/${fields.length}`);

  // --- SEO -----------------------------------------------------------------
  const title = root.querySelector("title")?.text?.trim() ?? "";
  const desc = root.querySelector("meta[name='description']")?.getAttribute("content") ?? "";
  check("title present and under 62 chars", title.length > 0 && title.length <= 62, `${title.length}`);
  check("meta description present, 50 to 165 chars", desc.length >= 50 && desc.length <= 165, `${desc.length}`);

  const ld = root.querySelector("script[type='application/ld+json']");
  let parsed = null;
  if (ld) {
    try {
      parsed = JSON.parse(ld.text);
    } catch {
      parsed = null;
    }
  }
  check("JSON-LD present and parses", Boolean(parsed));

  return { checks: out, title, desc };
}
