import "server-only";

/* ============================================================================
   lib/spend.ts — a daily ceiling on the assistant, denominated in DOLLARS.

   WHY NOT A RATE LIMIT. `rateLimit()` in lib/guards.ts caps how MANY calls one
   connection makes, which is the right shape for abuse and the wrong shape for
   a budget. One long conversation with a big system prompt can cost thirty
   times a short one, so "twenty messages per IP" tells you nothing about the
   bill. This counts what was actually spent and stops at a number.

   WHY IT LIVES IN THE CRM'S DATABASE. Serverless functions share no memory, so
   an in-process counter resets on every cold start and silently never fires.
   This site has no database of its own. The CRM does, it already has an
   `api_hits` ledger with a `cost` column built for exactly this, and the two
   projects are already wired together by the lead intake. Reusing that ledger
   means the assistant's spend sits in the same table as the CRM's, so the
   monthly total is one query rather than two.

   THE FAILURE DECISION, STATED RATHER THAN DEFAULTED. If the ledger is
   unreachable this FAILS OPEN: the assistant keeps working and the cap is not
   enforced for that request. The alternative is a client's chat widget going
   dark because a database in another project had a bad minute, which is a
   worse outcome than a few dollars. It is logged loudly each time so the
   failure is visible rather than silent.

   The cap is a ceiling, not a budget. Spending stops within one request of
   crossing it, not exactly on it, because the cost of a call is only known
   after it has been made.
   ============================================================================ */

/* Per-million-token rates in USD, mirroring api/_spend.js in the CRM. Kept in
   step deliberately: if these two drift, the same call bills differently
   depending on which product made it, and the monthly total stops meaning
   anything. */
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-5": { in: 2, out: 10 },
};

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

/**
 * What one call cost, in dollars.
 *
 * Cached reads bill at 10% of input and cache writes at 125%. Both are counted
 * because ignoring them makes a cached conversation look free, which is the
 * exact case this cap exists to measure.
 */
export function costOf(model: string, usage: Usage | undefined): number {
  const r = RATES[model] ?? { in: 3, out: 15 };
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const u = usage ?? {};
  return (
    n(u.input_tokens) * r.in +
    n(u.cache_creation_input_tokens) * r.in * 1.25 +
    n(u.cache_read_input_tokens) * r.in * 0.1 +
    n(u.output_tokens) * r.out
  ) / 1e6;
}

/** The configured ceiling. Unset or nonsense means no cap, and says so. */
export function dailyCap(): number | null {
  const v = Number(process.env.ASSISTANT_DAILY_CAP_USD);
  return Number.isFinite(v) && v > 0 ? v : null;
}

const BUCKET = "site-assistant";

function ledger(path: string, init?: RequestInit) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(4000),
  });
}

/**
 * Dollars spent since midnight UTC, or null if the ledger could not be read.
 *
 * Midnight UTC rather than Wichita's midnight, deliberately: the CRM's own
 * monthly figure is computed in UTC, and two windows that disagree by six
 * hours produce two different answers to "what did the assistant cost today".
 * One clock, even if it is not the local one.
 */
export async function spentToday(): Promise<number | null> {
  const from = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  try {
    const res = await ledger(
      `api_hits?bucket=eq.${encodeURIComponent(BUCKET)}&at=gte.${from}&select=cost`,
    );
    if (!res || !res.ok) return null;
    const rows = (await res.json()) as { cost?: number }[];
    return rows.reduce((a, r) => a + (Number(r?.cost) || 0), 0);
  } catch {
    return null;
  }
}

/**
 * Record what a call cost. Best effort, always.
 *
 * A failed write must never fail the visitor's request: the tokens are already
 * spent, and turning a billing bookkeeping error into a broken chat helps
 * nobody. An unrecorded call means the cap is a few cents generous, once.
 */
export async function logSpend(cost: number): Promise<void> {
  if (!Number.isFinite(cost) || cost <= 0) return;
  try {
    await ledger("api_hits", {
      method: "POST",
      body: JSON.stringify({ bucket: BUCKET, at: new Date().toISOString(), cost }),
    });
  } catch {
    console.warn("[spend] could not record a call. The cap is generous by", cost.toFixed(4));
  }
}

/**
 * Whether the assistant is allowed to spend right now.
 *
 * Returns `{ allowed, spent, cap }` so the caller can log the real numbers
 * rather than a bare boolean, which is the difference between "the cap fired"
 * and "the cap fired at $2.03 of $2.00".
 */
export async function withinDailyCap(): Promise<{
  allowed: boolean;
  spent: number | null;
  cap: number | null;
}> {
  const cap = dailyCap();
  if (cap === null) return { allowed: true, spent: null, cap: null };

  const spent = await spentToday();
  if (spent === null) {
    /* Fails open, loudly. See the header: a dark chat widget is a worse
       outcome than an unenforced cap for one request, but a silent one is
       worse than both. */
    console.error(
      "[spend] the ledger is unreachable, so the daily cap is NOT being enforced for this request.",
    );
    return { allowed: true, spent: null, cap };
  }
  return { allowed: spent < cap, spent, cap };
}
