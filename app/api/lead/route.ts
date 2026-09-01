import { NextResponse } from "next/server";
import { LeadInput, captureLead } from "@/lib/leads";
import {
  BUCKETS,
  HONEYPOT_FIELD,
  MIN_FORM_SECONDS,
  clientIp,
  originAllowed,
  rateLimit,
} from "@/lib/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fields the endpoint knows about. Anything else and the request is rejected. */
const KNOWN_KEYS = new Set([
  "name",
  "email",
  "phone",
  "message",
  "detail",
  "sourceTag",
  "route",
  "externalRef",
  HONEYPOT_FIELD,
  "startedAt",
  "redirectTo",
]);

function successRedirect(req: Request, redirectTo: string | null) {
  // No-JS path. 303 carries the success state in the URL so the thank you page
  // renders without any client JavaScript running at all.
  const base = process.env.SITE_ORIGIN ?? new URL(req.url).origin;
  const url = new URL("/thanks", base);
  if (redirectTo) url.searchParams.set("from", redirectTo);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const isFormPost = contentType.includes("application/x-www-form-urlencoded");

  let raw: Record<string, unknown> = {};
  try {
    if (isFormPost) {
      const fd = await req.formData();
      fd.forEach((v, k) => {
        raw[k] = typeof v === "string" ? v : "";
      });
    } else {
      raw = (await req.json()) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const redirectTo = typeof raw.redirectTo === "string" ? raw.redirectTo : null;

  const fail = (status: number, error: string) =>
    isFormPost
      ? successRedirect(req, redirectTo) // never leak guard behaviour to a bot
      : NextResponse.json({ ok: false, error }, { status });

  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Unknown form keys are rejected, so a source tag cannot be smuggled in
  // alongside extra fields the handler was never written to consider.
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) {
      return fail(400, "Unrecognized field.");
    }
  }

  // A filled honeypot is told it succeeded and stores nothing, so the bot
  // learns nothing from the response and does not adapt.
  const honeypotFilled = String(raw[HONEYPOT_FIELD] ?? "").trim().length > 0;

  // Minimum time on form. A human has not read and completed this in under
  // three seconds; a script has.
  const startedAt = Number(raw.startedAt ?? 0);
  const tooFast =
    Number.isFinite(startedAt) &&
    startedAt > 0 &&
    (Date.now() - startedAt) / 1000 < MIN_FORM_SECONDS;

  if (honeypotFilled || tooFast) {
    return isFormPost
      ? successRedirect(req, redirectTo)
      : NextResponse.json({ ok: true, delivered: [], failed: [] });
  }

  const parsed = LeadInput.safeParse(raw);
  if (!parsed.success) {
    return fail(422, parsed.error.issues[0]?.message ?? "Please check the form.");
  }

  const ip = clientIp(req);
  if (!(await rateLimit(`lead:${ip}`, BUCKETS.lead))) {
    return fail(429, "Too many submissions from this connection. Call or text instead.");
  }

  await captureLead(parsed.data, {
    receivedAt: new Date().toISOString(),
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  return isFormPost
    ? successRedirect(req, redirectTo)
    : NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
