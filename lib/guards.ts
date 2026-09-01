import "server-only";

/**
 * Request guards shared by every write endpoint. Items 2, 3 and 4 of the
 * GetProyTech security review, applied here from the first commit rather than
 * retrofitted after a public repo made the endpoint shapes readable.
 */

export const HONEYPOT_FIELD = "company";
/** Anything faster than this is not a person reading a form. */
export const MIN_FORM_SECONDS = 3;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Origin allowlist. Worth the twenty minutes because it stops every casual
 * attempt and anything running from another website, but the Origin header can
 * be set by anyone with curl. This is a speed bump. Rate limiting is the
 * control that actually holds.
 */
export function originAllowed(req: Request): boolean {
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    console.warn(
      "[guard] ALLOWED_ORIGINS is unset, so the origin check is not running. Set it before launch.",
    );
    return true;
  }

  const origin = req.headers.get("origin");
  // A no-JS form POST from the same site may omit Origin in some browsers, so
  // fall back to Referer before rejecting a real visitor.
  if (!origin) {
    const referer = req.headers.get("referer");
    if (!referer) return true;
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return allowed.includes(origin);
}

type Bucket = { limit: number; windowSeconds: number };

/**
 * Upstash Redis backed. Do not replace this with an in-memory map: serverless
 * functions do not share memory between invocations, so an in-memory limiter
 * silently does nothing and reads as protection that is not there.
 */
export async function rateLimit(key: string, bucket: Bucket): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      `[guard] RATE LIMITING IS NOT ACTIVE for "${key}". UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are unset. This must be configured before launch.`,
    );
    return true;
  }

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(bucket.windowSeconds), "NX"],
      ]),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as { result: unknown }[];
    const count = Number(data[0]?.result ?? 0);
    return count <= bucket.limit;
  } catch (err) {
    // Fail open on limiter failure. A broken Redis must not stop real leads.
    console.error("[guard] rate limiter unavailable, failing open:", err);
    return true;
  }
}

export const BUCKETS = {
  lead: { limit: 5, windowSeconds: 3600 },
  chat: { limit: 20, windowSeconds: 3600 },
} as const;
