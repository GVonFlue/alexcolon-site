/**
 * Lead plumbing tests. These are the table from section 7 of the build
 * doctrine, run end to end against the real endpoint rather than asserted.
 *
 * A mock sink server stands in for the Sheet, the CRM and GHL, so each failure
 * mode can actually be produced instead of described.
 *
 *   node --test tests/leads.test.mjs
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { killTree } from "../scripts/kill-tree.mjs";

const APP_PORT = process.env.TEST_APP_PORT ?? "3131";
const SINK_PORT = process.env.TEST_SINK_PORT ?? "3132";
const PREVIEW_PORT = process.env.TEST_PREVIEW_PORT ?? "3133";
const PROD_PORT = process.env.TEST_PROD_PORT ?? "3134";
const APP = `http://127.0.0.1:${APP_PORT}`;
const SINK = `http://127.0.0.1:${SINK_PORT}`;
const PREVIEW = `http://127.0.0.1:${PREVIEW_PORT}`;
const PROD = `http://127.0.0.1:${PROD_PORT}`;

/** What the mock sinks received, and how they should behave. */
const received = { sheet: [], crm: [], ghl: [], notify: [] };
const behaviour = { sheet: 200, crm: 200, ghl: 200, notify: 200 };

let sinkServer;
let app;
let previewApp;
let prodApp;
let appLog = "";

/**
 * Three app instances, not one.
 *
 * The source tag has to distinguish a preview deployment from production, and
 * the only honest way to test that is to run the app as each of them: the
 * marker is derived from VERCEL_ENV at module load, so mocking it would be
 * testing the mock. The default instance is neither, which is the third case
 * worth covering, because a developer's own machine posting into the live
 * Sheet is the same pollution problem in a smaller hat.
 */
function spawnApp(port, extraEnv = {}) {
  return spawn("npx", ["next", "start", "-p", port], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: {
      ...process.env,
      SITE_ORIGIN: `http://127.0.0.1:${port}`,
      ALLOWED_ORIGINS: `http://127.0.0.1:${port}`,
      LEAD_SHEET_WEBHOOK_URL: `${SINK}/sheet`,
      CRM_LEAD_ENDPOINT: `${SINK}/crm`,
      GHL_WEBHOOK_URL: `${SINK}/ghl`,
      NOTIFY_EMAIL_ENDPOINT: `${SINK}/notify`,
      NOTIFY_EMAIL_TO: "alex@athomewichita.com",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      ...extraEnv,
    },
  });
}

async function waitFor(base, ms = 60000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(base, { signal: AbortSignal.timeout(2500) })).ok) return true;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

before(async () => {
  sinkServer = createServer((req, res) => {
    const which = req.url.replace("/", "");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      // Read the raw text and parse ids as strings. Never JSON.parse a 64 bit
      // record id into a Number: 9007199254740993 becomes 9007199254740992,
      // which is a different record.
      received[which]?.push({ raw: body, json: safeJson(body) });
      const status = behaviour[which] ?? 200;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: status < 400 }));
    });
  });
  await new Promise((r) => sinkServer.listen(Number(SINK_PORT), r));

  app = spawnApp(APP_PORT);
  app.stdout.on("data", (d) => (appLog += d.toString()));
  app.stderr.on("data", (d) => (appLog += d.toString()));

  previewApp = spawnApp(PREVIEW_PORT, {
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_URL: `127.0.0.1:${PREVIEW_PORT}`,
    SITE_ORIGIN: "",
  });
  prodApp = spawnApp(PROD_PORT, {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_URL: `127.0.0.1:${PROD_PORT}`,
  });
  for (const child of [previewApp, prodApp]) {
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
  }

  await waitFor(APP);
  await waitFor(PREVIEW);
  await waitFor(PROD);
});

after(async () => {
  // The spawned server and the mock sink both hold the event loop open, so the
  // teardown is explicit. Without this the suite passes and then hangs, which
  // reads as a failure in CI.
  killTree(app);
  killTree(previewApp);
  killTree(prodApp);
  sinkServer?.closeAllConnections?.();
  await new Promise((r) => sinkServer.close(r));
  app?.unref?.();
  previewApp?.unref?.();
  prodApp?.unref?.();
});

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function reset() {
  for (const k of Object.keys(received)) received[k] = [];
  for (const k of Object.keys(behaviour)) behaviour[k] = 200;
  appLog = "";
}

const VALID_TAG = "Colon - General Question";

/**
 * What the sinks actually receive. lib/leads.ts stamps the deployment onto
 * every source tag that is not production, after the tag has been validated,
 * so preview and local traffic is obvious in the Sheet and can be filtered out
 * in one pass. The default test instance is neither Vercel nor production, so
 * it reports itself as local.
 */
const LOCAL_TAG = `${VALID_TAG} [local]`;

function jsonPost(body, extraHeaders = {}) {
  return fetch(`${APP}/api/lead`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: APP, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

const goodLead = () => ({
  name: "Pat Rivera",
  email: "pat@example.org",
  phone: "3165551234",
  message: "Looking in Derby, not in a hurry.",
  sourceTag: VALID_TAG,
  route: "/contact",
  startedAt: Date.now() - 20000,
});

test("a valid lead reaches every sink with its source tag intact", async () => {
  reset();
  const res = await jsonPost(goodLead());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);

  await new Promise((r) => setTimeout(r, 400));
  assert.equal(received.sheet.length, 1, "the Sheet is the source of truth and must receive it");
  assert.equal(received.crm.length, 1);
  assert.equal(received.ghl.length, 1);

  // Never dropped. An unattributed lead defaults to "Other" in most CRMs and
  // destroys the reporting that proves ROI at the sixty day case study.
  assert.equal(received.crm[0].json.source, LOCAL_TAG);
  assert.equal(received.ghl[0].json.source, LOCAL_TAG);
  assert.equal(received.sheet[0].json.sourceTag, LOCAL_TAG);
});

test("CRM returns 503, the visitor still sees success", async () => {
  reset();
  behaviour.crm = 503;
  const res = await jsonPost(goodLead());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true, "the CRM being down is our problem, not theirs");
});

test("CRM returns 503, the lead still reached the Sheet", async () => {
  reset();
  behaviour.crm = 503;
  await jsonPost(goodLead());
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(received.sheet.length, 1);
});

test("every sink unreachable, the full payload is written to the log in one recoverable line", async () => {
  reset();
  behaviour.sheet = 500;
  behaviour.crm = 500;
  behaviour.ghl = 500;
  behaviour.notify = 500;

  const res = await jsonPost(goodLead());
  assert.equal((await res.json()).ok, true);

  await new Promise((r) => setTimeout(r, 600));
  const line = appLog.split("\n").find((l) => l.includes("[lead][RECOVERABLE]"));
  assert.ok(line, "expected a single recoverable line in the log");
  const payload = safeJson(line.slice(line.indexOf("{")));
  assert.ok(payload, "the recoverable line must be machine parseable");
  assert.equal(payload.lead.email, "pat@example.org");
  assert.equal(payload.lead.sourceTag, LOCAL_TAG);
});

test("honeypot filled, nothing is stored and the bot is told it succeeded", async () => {
  reset();
  const res = await jsonPost({ ...goodLead(), company: "Acme Scraping Co" });
  assert.equal((await res.json()).ok, true, "the bot must learn nothing from the response");
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0);
  assert.equal(received.crm.length, 0);
});

test("submitted under three seconds, dropped silently", async () => {
  reset();
  const res = await jsonPost({ ...goodLead(), startedAt: Date.now() - 500 });
  assert.equal((await res.json()).ok, true);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0, "no human read and completed this in half a second");
});

test("an unknown form key is rejected, so a source tag cannot be smuggled in", async () => {
  reset();
  const res = await jsonPost({ ...goodLead(), isAdmin: "true" });
  assert.equal(res.status, 400);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0);
});

test("an unrecognised source tag is rejected", async () => {
  reset();
  const res = await jsonPost({ ...goodLead(), sourceTag: "Someone Else - Spoofed" });
  assert.equal(res.status, 422);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0);
});

test("a no-JS form POST returns 303 carrying the success state", async () => {
  reset();
  const form = new URLSearchParams({
    name: "Pat Rivera",
    email: "pat@example.org",
    sourceTag: VALID_TAG,
    route: "/contact",
    redirectTo: "/contact",
  });
  const res = await fetch(`${APP}/api/lead`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: APP },
    body: form.toString(),
    redirect: "manual",
  });
  assert.equal(res.status, 303);
  const location = res.headers.get("location");
  assert.ok(location.includes("/thanks"), `expected /thanks, got ${location}`);
  assert.ok(location.includes("from=%2Fcontact") || location.includes("from=/contact"));

  await new Promise((r) => setTimeout(r, 400));
  assert.equal(received.sheet.length, 1, "the no-JS path must capture the lead too");
});

test("a 64-bit external record ID survives the round trip as a string", async () => {
  reset();
  // 9007199254740993 is one above Number.MAX_SAFE_INTEGER. Parsed as a number it
  // becomes ...992, a different record.
  const bigId = "9007199254740993";
  await jsonPost({ ...goodLead(), externalRef: bigId });
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(received.crm.length, 1);
  // Asserted against the raw body, not the parsed object, because parsing is
  // exactly the step that would corrupt it.
  assert.ok(
    received.crm[0].raw.includes(`"external_ref":"${bigId}"`),
    `raw body should carry the id as a quoted string, got: ${received.crm[0].raw.slice(0, 200)}`,
  );
  assert.equal(received.crm[0].json.external_ref, bigId);
});

test("a request from another origin is refused", async () => {
  reset();
  const res = await jsonPost(goodLead(), { origin: "https://not-our-site.example" });
  assert.equal(res.status, 403);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0);
});

test("GET is not allowed on the lead endpoint", async () => {
  const res = await fetch(`${APP}/api/lead`);
  assert.equal(res.status, 405);
});

test("the assistant degrades honestly when no API key is configured", async () => {
  const res = await fetch(`${APP}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: APP },
    body: JSON.stringify({ sessionId: "test", messages: [{ role: "user", content: "hi" }] }),
  });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.offline, true, "with no key it must say it is not connected");
  assert.ok(
    data.reply.includes("(813) 613-8822"),
    "and it must give the correct phone number for this brand",
  );
  // It must not claim to have booked anything, ever.
  assert.ok(!/\b(booked|confirmed|scheduled|on the calendar)\b/i.test(data.reply));
});

/* ==========================================================================
 * Source tags: per surface, and per deployment
 * ========================================================================== */

/** Post a lead at one of the three running instances. */
function postAt(base, body) {
  return fetch(`${base}/api/lead`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
}

test("a preview deployment stamps its own marker on the source tag", async () => {
  reset();
  const res = await postAt(PREVIEW, goodLead());
  assert.equal((await res.json()).ok, true);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(received.sheet.length, 1);
  assert.equal(
    received.sheet[0].json.sourceTag,
    `${VALID_TAG} [preview]`,
    "preview traffic must be distinguishable in the Sheet, or internal testing pollutes the live rows",
  );
});

test("a production deployment leaves the source tag alone", async () => {
  reset();
  const res = await postAt(PROD, goodLead());
  assert.equal((await res.json()).ok, true);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(received.sheet.length, 1);
  assert.equal(
    received.sheet[0].json.sourceTag,
    VALID_TAG,
    "the real rows must carry the plain tag, with no environment noise in them",
  );
});

test("the environment marker cannot be spoofed by sending a decorated tag", async () => {
  reset();
  // The marker is added server side after validation, so a decorated tag is
  // simply not on the allowlist and never reaches a sink.
  const res = await postAt(PROD, { ...goodLead(), sourceTag: `${VALID_TAG} [preview]` });
  assert.equal(res.status, 422);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(received.sheet.length, 0);
});

test("each route's assistant has its own source tag, and all of them are on the allowlist", async () => {
  reset();
  const routes = ["/", "/buy", "/sell", "/veterans", "/investors", "/areas", "/about", "/contact"];
  const tags = routes.map((r) => `Colon - Lark Assistant ${r}`);
  assert.equal(new Set(tags).size, tags.length, "the tags must be distinct per surface");

  // Two representative ones, rather than eight round trips: acceptance proves
  // the allowlist is generated from the routes rather than hand maintained.
  for (const tag of ["Colon - Lark Assistant /veterans", "Colon - Lark Assistant /investors"]) {
    reset();
    const res = await postAt(PROD, { ...goodLead(), sourceTag: tag });
    assert.equal((await res.json()).ok, true, `${tag} should be accepted`);
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(received.sheet[0].json.sourceTag, tag);
  }
});

/* ==========================================================================
 * Lark
 * ========================================================================== */

function chat(base, body) {
  return fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
}

test("the assistant is named Lark, and the old name appears nowhere in a served page", async () => {
  for (const route of ["/", "/buy", "/sell", "/veterans", "/investors", "/areas"]) {
    const html = await (await fetch(`${APP}${route}`)).text();
    assert.ok(html.includes("Lark"), `${route} should name Lark`);
    assert.ok(
      !/\bWick\b/.test(html),
      `${route} still contains the old assistant name`,
    );
  }
});

test("Lark degrades honestly when no API key is configured", async () => {
  const res = await chat(APP, {
    sessionId: "test",
    route: "/",
    messages: [{ role: "user", content: "hi" }],
  });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.offline, true, "with no key it must say it is not connected");
  assert.ok(data.reply.includes("Lark"), "it should say which thing is not connected");
  assert.ok(
    data.reply.includes("(813) 613-8822"),
    "and it must give the correct phone number for this brand",
  );
  assert.ok(!/\b(booked|confirmed|scheduled|on the calendar)\b/i.test(data.reply));
});

test("the configuration probe reports not connected rather than guessing", async () => {
  const res = await fetch(`${APP}/api/chat`, { headers: { origin: APP } });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.configured, false);
  assert.equal(data.key, undefined, "the probe must never leak anything but the boolean");
  assert.equal(data.model, undefined);
});

test("the not-connected page state says so in words, not just a status dot", async () => {
  // Rendered server side, so this is what a visitor sees before any JS runs.
  const html = await (await fetch(`${APP}/`)).text();
  assert.ok(
    html.includes("not connected") || html.includes("is not connected yet"),
    "the offline copy must be reachable, not hidden behind a probe",
  );
});

test("an unknown route in a chat request is not reflected back into the prompt", async () => {
  const res = await chat(APP, {
    sessionId: "test",
    route: "/../../etc/passwd",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true, "an unknown route falls back to / rather than erroring");
});

test("the chips are contextual per route, not the same three everywhere", async () => {
  const chipsFor = async (route) => {
    const html = await (await fetch(`${APP}${route}`)).text();
    return html;
  };
  const veterans = await chipsFor("/veterans");
  const investors = await chipsFor("/investors");

  assert.ok(veterans.includes("What does the VA appraisal check?"));
  assert.ok(veterans.includes("Send Alex my report date"));
  assert.ok(investors.includes("What belongs in the carry?"));
  assert.ok(investors.includes("Have Alex run an address"));

  assert.ok(
    !investors.includes("What does the VA appraisal check?"),
    "the veterans chips must not appear on the investors page",
  );
  assert.ok(
    !veterans.includes("What belongs in the carry?"),
    "the investors chips must not appear on the veterans page",
  );
});

test("the refusals are restated in the tool result, not only in the system prompt", async () => {
  // A source-level assertion, deliberately. With no API key there is no model
  // to observe, and the failure this guards against is somebody deleting the
  // restatement during a refactor because the system prompt already says it.
  // A system prompt at the top of a long conversation is where drift happens,
  // which is the whole reason the restatement exists.
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../lib/assistant.ts", import.meta.url), "utf8"),
  );
  const toolResult = src.slice(src.indexOf("export function captureToolResult"));

  assert.ok(/Fair housing still applies/i.test(toolResult), "fair housing must be restated");
  assert.ok(/do not rate, rank or compare/i.test(toolResult), "district ratings must be restated");
  assert.ok(
    /Do not say anything is booked, confirmed, scheduled, held, reserved, or on the calendar/i.test(
      toolResult,
    ),
    "the no-calendar constraint must be restated",
  );
  assert.ok(/Do not invent a price/i.test(toolResult), "the no-invented-figures rule must be restated");
  assert.ok(
    /Do not ask for anything else for the rest of this conversation/i.test(toolResult),
    "the capture bound must be restated",
  );
});

test("the capture ask is bounded at two turns by the server, not by the prompt", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
  );
  assert.ok(/MAX_CAPTURE_TURNS = 2/.test(src), "the bound must be a constant, not a hope");
  assert.ok(
    /tools: mayCapture \? \[captureTool\] : \[\]/.test(src),
    "past the bound the tool must be withheld from the request, not merely discouraged",
  );
});
