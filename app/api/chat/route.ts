import { NextResponse } from "next/server";
import { assistantSourceTag, site } from "@/lib/content";
import { captureLead } from "@/lib/leads";
import {
  ASSISTANT_ROUTES,
  captureTool,
  captureToolResult,
  offlineMessage,
  systemPrompt,
} from "@/lib/assistant";
import { BUCKETS, clientIp, originAllowed, rateLimit } from "@/lib/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const API = "https://api.anthropic.com/v1/messages";

/** Cost discipline. Caps what a single call can cost regardless of input. */
const MAX_TURNS = 14;
const MAX_CHARS_PER_MESSAGE = 1500;
const MAX_TOKENS = 500;

type Msg = { role: "user" | "assistant"; content: unknown };

/**
 * How many times the model may be handed the capture tool across one
 * conversation.
 *
 * Two. The brief's bound, enforced on the server rather than trusted to the
 * system prompt: an instruction not to ask a third time is a strong nudge, and
 * removing the tool from the request is a guarantee. Counted from the
 * transcript the client sends rather than held in server memory, because a
 * serverless function does not have any.
 */
const MAX_CAPTURE_TURNS = 2;

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: { messages?: Msg[]; sessionId?: string; route?: string; captureTurns?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Honest degradation, with the correct number for this brand.
    return NextResponse.json({ ok: true, reply: offlineMessage(), offline: true });
  }

  const ip = clientIp(req);
  if (!(await rateLimit(`chat:${ip}`, BUCKETS.chat))) {
    return NextResponse.json({
      ok: true,
      reply: `The assistant has hit its limit for this connection. Call or text Alex at ${site.phone.display} and he will pick it up directly.`,
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = incoming.slice(-MAX_TURNS).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content:
      typeof m.content === "string" ? m.content.slice(0, MAX_CHARS_PER_MESSAGE) : m.content,
  }));

  /**
   * The lead reference derives from the session, not from a random value, so a
   * follow up message updates the existing row instead of creating a second
   * half filled lead. Always a string: external record IDs are never parsed.
   */
  const sessionId = String(body.sessionId ?? "").slice(0, 100);
  const externalRef = sessionId ? `chat:${sessionId}` : undefined;

  /**
   * Which page the visitor is on. Validated against the known routes rather
   * than interpolated: this string reaches the system prompt and the source
   * tag, and an unvalidated one is an injection point into both.
   */
  const claimed = String(body.route ?? "/");
  const route = ASSISTANT_ROUTES.includes(claimed) ? claimed : "/";

  /**
   * The capture bound. The client reports how many times it has already been
   * asked; the server clamps it and simply stops offering the tool once the
   * budget is spent. A client that lies by sending 0 forever gets at most one
   * extra ask per request, and cannot conjure a lead, because the server still
   * refuses to record one without a name and a way to reach them.
   */
  const spent = Math.max(0, Math.min(MAX_CAPTURE_TURNS, Number(body.captureTurns) || 0));
  const mayCapture = spent < MAX_CAPTURE_TURNS;

  async function callModel(msgs: Msg[]) {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(route),
        tools: mayCapture ? [captureTool] : [],
        messages: msgs,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) as {
      content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
      stop_reason: string;
    };
  }

  try {
    let data = await callModel(messages);
    let captured = false;

    const toolUse = data.content.find((c) => c.type === "tool_use");
    if (toolUse && toolUse.name === captureTool.name) {
      const input = (toolUse.input ?? {}) as Record<string, string>;

      // Only capture if we actually have a way to reach them. The model was told
      // this, and the server enforces it rather than trusting that it complied.
      if (input.name && (input.email || input.phone)) {
        await captureLead(
          {
            name: input.name,
            email: input.email || `${sessionId || "unknown"}@no-email-given.invalid`,
            phone: input.phone ?? "",
            message: input.summary ?? "",
            detail: input.requestedTime ? `Requested time: ${input.requestedTime}` : "",
            sourceTag: assistantSourceTag(route),
            route,
            externalRef,
          },
          {
            receivedAt: new Date().toISOString(),
            ip,
            userAgent: req.headers.get("user-agent") ?? "",
          },
        );
        captured = true;
      }

      const followUp: Msg[] = [
        ...messages,
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: captured
                ? captureToolResult(Boolean(input.requestedTime))
                : "Not recorded. You do not have a way to reach this person yet. Ask for one thing, either an email or a phone number, and do not ask for both at once. Do not tell them anything was recorded.",
            },
          ],
        },
      ];
      data = await callModel(followUp);
    }

    const reply = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n")
      .trim();

    return NextResponse.json({
      ok: true,
      reply: reply || offlineMessage(),
      captured,
      /**
       * Echoed back so the client can carry the count into the next request.
       * A capture that succeeded spends the whole budget: there is nothing
       * left to ask for.
       */
      captureTurns: captured ? MAX_CAPTURE_TURNS : spent + (toolUse ? 1 : 0),
    });
  } catch (err) {
    console.error("[chat] model call failed:", err);
    // The visitor is not shown our infrastructure problem, and is not left
    // without a way to get an answer.
    return NextResponse.json({
      ok: true,
      reply: `Something went wrong on our end, not yours. Call or text Alex at ${site.phone.display} and he will answer it directly.`,
    });
  }
}

/**
 * Config probe. The assistant asks this on mount so its status line can tell the
 * truth before anyone types.
 *
 * Without it the component has no way to know it is offline until a visitor has
 * already asked a real question and waited for the answer, which means the label
 * reads "ready" while the thing is not. That is describing intended behavior as
 * completed behavior, in the one component built specifically not to do that.
 *
 * It returns a boolean about our own configuration and nothing else. No key, no
 * model name, no error detail.
 */
export async function GET(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
