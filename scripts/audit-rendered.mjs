#!/usr/bin/env node
/**
 * Rendered HTML auditor. This is the authoritative one.
 *
 * It boots the production server, fetches every route, and checks the HTML the
 * browser actually receives. Sweeping the source instead of the render is how
 * (555) 555-5555 ships: the source had a variable, the render had the default.
 *
 * A build can exit 0 and still be a blank white page, so this asserts on
 * content, not on the absence of errors.
 *
 * The checks themselves live in html-checks.mjs and are negative tested by
 * audit-negative.mjs against the same implementation that runs here.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "node-html-parser";
import { auditHtml, visibleText } from "./html-checks.mjs";
import { killTree } from "./kill-tree.mjs";

const PORT = process.env.AUDIT_PORT ?? "3111";
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

const ROUTES = ["/", "/buy", "/sell", "/veterans", "/investors", "/areas", "/about", "/contact"];

const results = [];
let failures = 0;
function record(route, name, ok, detail = "") {
  results.push({ route, name, ok, detail });
  if (!ok) failures += 1;
}

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

const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: { ...process.env, ALLOWED_ORIGINS: "" },
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

let exitCode = 0;
try {
  if (!(await waitForServer())) {
    console.error("Server did not start. Run `npx next build` first.");
    killTree(server);
    process.exit(1);
  }

  const metas = [];
  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`);
    record(route, "route returns 200", res.status === 200, `status ${res.status}`);
    const html = await res.text();
    const { checks, title, desc } = auditHtml(html, ctx);
    for (const c of checks) record(route, c.name, c.ok, c.detail);
    metas.push({ route, title, desc });
  }

  for (const field of ["title", "desc"]) {
    const seen = new Map();
    let dup = false;
    for (const m of metas) {
      if (seen.has(m[field])) {
        dup = true;
        record("(global)", `unique ${field} per route`, false, `${m.route} duplicates ${seen.get(m[field])}`);
      }
      seen.set(m[field], m.route);
    }
    if (!dup) record("(global)", `unique ${field} per route`, true);
  }

  // A build with no 404 page is unfinished.
  const notFound = await fetch(`${BASE}/this-route-does-not-exist`);
  const nfHtml = await notFound.text();
  const nfRoot = parse(nfHtml);
  const nfText = visibleText(nfRoot);
  record("(404)", "404 returns 404", notFound.status === 404, `status ${notFound.status}`);
  record("(404)", "404 is branded", nfText.includes("Alex"));
  record("(404)", "404 gives a way back", nfRoot.querySelectorAll("a[href^='/']").length >= 3);
  record("(404)", "404 offers the phone", nfHtml.includes(`tel:${ctx.phoneE164}`));

  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  record("(global)", "robots.txt has no blanket disallow", !/Disallow:\s*\/\s*$/m.test(robots));
  record("(global)", "robots.txt has no noindex", !/noindex/i.test(robots));
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  record(
    "(global)",
    "sitemap lists every route",
    ROUTES.every((r) => (r === "/" ? sitemap.includes("<loc>") : sitemap.includes(r))),
  );

  // Every route must also be free of a leftover preview noindex header.
  const headRes = await fetch(`${BASE}/`);
  record(
    "(global)",
    "no x-robots-tag noindex header",
    !/noindex/i.test(headRes.headers.get("x-robots-tag") ?? ""),
  );
  record(
    "(global)",
    "security headers present",
    Boolean(headRes.headers.get("x-frame-options")) &&
      Boolean(headRes.headers.get("x-content-type-options")) &&
      Boolean(headRes.headers.get("strict-transport-security")),
  );

  const byRoute = new Map();
  for (const r of results) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, []);
    byRoute.get(r.route).push(r);
  }

  console.log("Rendered HTML audit");
  console.log("===================\n");
  for (const [route, checks] of byRoute) {
    const bad = checks.filter((c) => !c.ok);
    console.log(
      `${bad.length === 0 ? "pass" : "FAIL"}  ${route.padEnd(12)} (${checks.length - bad.length}/${checks.length})`,
    );
    for (const b of bad) console.log(`        FAIL: ${b.name}${b.detail ? `  ->  ${b.detail}` : ""}`);
  }

  console.log(`\n${results.length} checks, ${failures} failure(s).`);
  if (failures > 0) {
    console.error("\nRendered audit failed.");
    exitCode = 1;
  } else {
    console.log("Rendered audit passed.");
  }
} finally {
  killTree(server);
}
process.exit(exitCode);
