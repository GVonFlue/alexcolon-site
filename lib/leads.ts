import "server-only";
import { z } from "zod";
import { validSourceTags } from "./content";

/**
 * The single code path every captured lead travels, whether it came from a form
 * or from the assistant. Two capture surfaces with two paths is how one of them
 * quietly stops writing and nobody notices for a month.
 *
 * Delivery order is fixed: validate, Sheet, CRM, GHL. The Sheet is the source of
 * truth and therefore the highest priority sink on the build.
 */

export const LeadInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  /** Optional on purpose. The microcopy says why it is wanted. */
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  /** Free text the visitor typed for a specific magnet, e.g. a property address. */
  detail: z.string().trim().max(500).optional().or(z.literal("")),
  /**
   * Never trusted from the client beyond membership in the known set. An unknown
   * key is rejected outright so a source tag cannot be spoofed.
   */
  sourceTag: z.string().refine((t) => validSourceTags.includes(t), {
    message: "Unrecognized source tag.",
  }),
  route: z.string().max(120).default("/"),
  /**
   * Chatbot leads derive this from the session so a follow-up message updates
   * the existing row instead of creating a second half filled lead.
   */
  externalRef: z.string().max(120).optional(),
});
export type LeadInput = z.infer<typeof LeadInput>;

export type CaptureResult = {
  /** The visitor sees this. It is true for every case except a validation error. */
  ok: boolean;
  /** Which sinks accepted it. Internal only, never rendered. */
  delivered: string[];
  failed: string[];
};

/**
 * External record IDs are always strings and never parsed. Several real estate
 * CRMs use 64-bit integer IDs, and Number(9007199254740993) returns
 * 9007199254740992, which is a different record.
 */
export function asExternalId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // Reaching here means an upstream JSON.parse already lost precision.
    // Fail loudly rather than write a corrupted ID.
    throw new Error(
      "External record ID arrived as a number. Read it as a string before parsing, or precision is already gone.",
    );
  }
  return String(value);
}

type Sink = {
  name: string;
  enabled: boolean;
  send: (lead: LeadInput, meta: Meta) => Promise<void>;
};

type Meta = { receivedAt: string; ip: string; userAgent: string };

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    // A slow sink must not hold the visitor's response open.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

function sinks(): Sink[] {
  return [
    {
      name: "sheet",
      enabled: Boolean(process.env.LEAD_SHEET_WEBHOOK_URL),
      send: (lead, meta) =>
        post(process.env.LEAD_SHEET_WEBHOOK_URL!, {
          secret: process.env.LEAD_SHEET_SHARED_SECRET ?? "",
          ...lead,
          ...meta,
        }),
    },
    {
      name: "crm",
      enabled: Boolean(process.env.CRM_LEAD_ENDPOINT),
      send: (lead, meta) =>
        post(
          process.env.CRM_LEAD_ENDPOINT!,
          {
            full_name: lead.name,
            email: lead.email,
            phone: lead.phone || null,
            notes: [lead.message, lead.detail].filter(Boolean).join("\n\n") || null,
            // Never dropped. Most CRMs default unattributed API leads to "Other",
            // which destroys the reporting that proves ROI at the sixty day mark.
            source: lead.sourceTag,
            landing_route: lead.route,
            external_ref: lead.externalRef ?? null,
            received_at: meta.receivedAt,
          },
          { authorization: `Bearer ${process.env.CRM_API_KEY ?? ""}` },
        ),
    },
    {
      name: "ghl",
      enabled: Boolean(process.env.GHL_WEBHOOK_URL),
      send: (lead, meta) =>
        post(process.env.GHL_WEBHOOK_URL!, {
          locationId: process.env.GHL_LOCATION_ID ?? null,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || null,
          source: lead.sourceTag,
          customField: { landing_route: lead.route, detail: lead.detail ?? "" },
          receivedAt: meta.receivedAt,
        }),
    },
    {
      name: "notify",
      enabled: Boolean(process.env.NOTIFY_EMAIL_ENDPOINT),
      send: (lead) =>
        post(process.env.NOTIFY_EMAIL_ENDPOINT!, {
          to: process.env.NOTIFY_EMAIL_TO,
          subject: `New lead: ${lead.sourceTag}`,
          text: [
            `Name:   ${lead.name}`,
            `Email:  ${lead.email}`,
            `Phone:  ${lead.phone || "(not given)"}`,
            `Source: ${lead.sourceTag}`,
            `Page:   ${lead.route}`,
            "",
            lead.detail || "",
            lead.message || "",
          ].join("\n"),
        }),
    },
  ];
}

/**
 * A downstream failure is never surfaced to the visitor, and never loses the
 * lead. If every sink is down the full payload goes to the log in one
 * recoverable line. That is a net, not a floor.
 */
export async function captureLead(lead: LeadInput, meta: Meta): Promise<CaptureResult> {
  const delivered: string[] = [];
  const failed: string[] = [];
  const active = sinks().filter((s) => s.enabled);

  for (const sink of sinks()) {
    if (!sink.enabled) {
      console.warn(`[lead] sink "${sink.name}" is not configured; skipping.`);
    }
  }

  const results = await Promise.allSettled(
    active.map(async (s) => {
      await s.send(lead, meta);
      return s.name;
    }),
  );

  results.forEach((r, i) => {
    const name = active[i].name;
    if (r.status === "fulfilled") delivered.push(name);
    else {
      failed.push(name);
      console.error(`[lead] sink "${name}" failed:`, r.reason);
    }
  });

  if (delivered.length === 0) {
    // Single line, machine parseable, contains everything needed to replay it.
    console.error(
      `[lead][RECOVERABLE] ${JSON.stringify({ lead, meta, failedSinks: failed })}`,
    );
  }

  // The CRM being down is our problem, not the visitor's. They see success.
  return { ok: true, delivered, failed };
}
