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
const APP = `http://127.0.0.1:${APP_PORT}`;
const SINK = `http://127.0.0.1:${SINK_PORT}`;

/** What the mock sinks received, and how they should behave. */
const received = { sheet: [], crm: [], ghl: [], notify: [] };
const behaviour = { sheet: 200, crm: 200, ghl: 200, notify: 200 };

let sinkServer;
let app;
let appLog = "";

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

  app = spawn("npx", ["next", "start", "-p", APP_PORT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: {
      ...process.env,
      SITE_ORIGIN: APP,
      ALLOWED_ORIGINS: APP,
      LEAD_SHEET_WEBHOOK_URL: `${SINK}/sheet`,
      CRM_LEAD_ENDPOINT: `${SINK}/crm`,
      GHL_WEBHOOK_URL: `${SINK}/ghl`,
      NOTIFY_EMAIL_ENDPOINT: `${SINK}/notify`,
      NOTIFY_EMAIL_TO: "alex@athomewichita.com",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    },
  });
  app.stdout.on("data", (d) => (appLog += d.toString()));
  app.stderr.on("data", (d) => (appLog += d.toString()));

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(APP, { signal: AbortSignal.timeout(2500) });
      if (r.ok) break;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
});

after(async () => {
  // The spawned server and the mock sink both hold the event loop open, so the
  // teardown is explicit. Without this the suite passes and then hangs, which
  // reads as a failure in CI.
  killTree(app);
  sinkServer?.closeAllConnections?.();
  await new Promise((r) => sinkServer.close(r));
  app?.unref?.();
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
  assert.equal(received.crm[0].json.source, VALID_TAG);
  assert.equal(received.ghl[0].json.source, VALID_TAG);
  assert.equal(received.sheet[0].json.sourceTag, VALID_TAG);
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
  assert.equal(payload.lead.sourceTag, VALID_TAG);
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
