# Alexander Colón, Wichita area real estate

Built by ProyTech to the ProyTech Website Build Doctrine.

Next.js App Router, TypeScript, Tailwind v4, Zod validated content. Deploys to
Vercel. Nine routes plus a branded 404.

---

## Read this before launch

Three things are deliberately missing from this build, because inventing them is
never acceptable and a placeholder must never reach a live site. Each one
withholds its section rather than rendering something untrue.

| What is missing | What it blocks | Who supplies it |
| --- | --- | --- |
| Alex's Kansas license number | The licensee line in the footer | Alex, in writing |
| Any verifiable figure about his business | The whole numbers band | Alex |
| Any testimonial with permission on file | Every proof band, on every route | Alex |
| Real photography | The headshot slot in the trust band | Alex |
| The buyer's guide and VA checklist as actual documents | Nothing, but the forms promise them | Alex |

Run `npm run report` at any time to print the current list from the content
files themselves.

**The domain is not athomewichita.com.** That is At Home Wichita Real Estate's
brokerage site. It sits on GoDaddy nameservers and carries live Google Workspace
mail for the whole office, including Alex's own address. Do not touch its DNS.
Alex's site needs its own domain, or a subdomain the broker sets up as a single
CNAME with no MX change.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in what you have; everything degrades honestly
npm run dev
```

`npm run build` runs the copy audit first and fails the build on a violation.

---

## Environment variables

Every value is read server side. Nothing is prefixed `NEXT_PUBLIC_`, so nothing
here can be bundled into client JavaScript. Set them in Vercel's Environment
Variables screen, never in the repo.

| Variable | What it does | Missing behaviour |
| --- | --- | --- |
| `SITE_ORIGIN` | Canonical origin, no trailing slash | Falls back to localhost |
| `ALLOWED_ORIGINS` | Comma separated origin allowlist for the API routes | Origin check logs a warning and does not run |
| `LEAD_SHEET_WEBHOOK_URL` | Apps Script endpoint that appends a row. **The source of truth.** | Sink skipped, warning logged |
| `LEAD_SHEET_SHARED_SECRET` | Shared secret the Apps Script checks | Sent empty |
| `CRM_LEAD_ENDPOINT` / `CRM_API_KEY` | ProyTech CRM ingest | Sink skipped |
| `GHL_WEBHOOK_URL` / `GHL_LOCATION_ID` | GoHighLevel inbound webhook | Sink skipped |
| `NOTIFY_EMAIL_ENDPOINT` / `NOTIFY_EMAIL_TO` | Instant notification. Speed to lead depends on this | Sink skipped |
| `ANTHROPIC_API_KEY` | The assistant | Assistant says it is not connected and gives the phone number |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5` | Uses the default |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | **Rate limiting does not run.** Loud warning on every guarded request |

Set the Anthropic Console spend limit before the key goes live. It is the real
backstop and it takes two minutes.

---

## Editing content

**Nothing the client will need to change is hardcoded in a component.** All copy
lives in `content/*.json` and is validated by `lib/schema.ts` at module load, so
a bad edit fails the build rather than reaching production.

- `content/site.json` is identity, contact, compliance, service areas, assistant config
- `content/magnets.json` is the lead magnets and their value stacks
- `content/{home,buy,sell,veterans,investors,areas,about,contact}.json` is one file per route

Each page is an ordered list of `bands`. The band types are the discriminated
union in `lib/schema.ts`; the renderer is `components/Bands.tsx`.

### The null convention

A fact we have is `{ "value": "...", "source": "where it was confirmed" }`.
A fact we do not have is `{ "value": null, "pending": "what we need and from whom" }`.

A null field renders nothing. It never renders a placeholder. When Alex sends the
license number, put it in `compliance.licenseNumber.value` with its source and the
footer line appears on every route with no code change.

Same convention for `numbers`, `testimonials` and `headshot`: an empty array or a
null `src` withholds the entire band.

This is the same shape as the self-edit portal's content contract, so this site
is Phase 0 ready as it stands.

---

## Auditors

```bash
npm run audit:all        # negative tests, copy, contrast, rendered HTML
npm run audit:negative   # proves the auditors can fail
npm run test:leads       # the lead plumbing table, end to end
node scripts/shots.mjs   # renders every route in Chromium, checks overflow and console
```

`audit:negative` runs **first** on purpose. It injects a real violation for every
rule, confirms the auditor catches it, restores, and confirms it passes again. An
auditor that cannot fail makes every green result downstream meaningless.

- `scripts/rules.mjs` is the single rule set: the never_say list from intake, the
  doctrine's banned words, fair housing, the REALTOR gate, placeholders, em dashes,
  stacked fragments, pronoun ratio.
- `scripts/html-checks.mjs` is the rendered HTML check set, shared by the rendered
  auditor and the negative tests so they exercise the same implementation.
- `scripts/audit-contrast.mjs` composites alpha before measuring. Reading raw RGB
  measures a color that is never painted.

### The REALTOR gate

`compliance.narMembershipConfirmed` is `false`, so the word is a build failure
anywhere on the site. Flip it to `true` only when membership is confirmed.

---

## Lead plumbing

One code path, `lib/leads.ts`. Forms and the assistant both go through
`captureLead`. Delivery order is validate, Sheet, CRM, GHL, notify.

- A downstream failure is never shown to the visitor.
- If every sink is down, the full payload goes to the log in one recoverable
  line tagged `[lead][RECOVERABLE]`.
- Every lead carries an explicit source tag. Unknown tags are rejected.
- External record IDs are strings and are never parsed.
- Spam controls are a honeypot plus a three second minimum on form. No CAPTCHA.
- Forms work with JavaScript disabled: real `<form action>`, 303 to `/thanks`.

`npm run test:leads` proves each of these against the real endpoint.

---

## The assistant

Named Wick. Server side only, `app/api/chat/route.ts`, Claude Haiku.

- It is never presented as Alex and says so in its own introduction.
- Capture is a tool call, never parsed from free text.
- **There is no calendar integration.** The system prompt and the tool result both
  forbid saying an appointment is booked, confirmed, scheduled, held, or on the
  calendar. It passes a requested time along. Set `assistant.bookingUrl` in
  `site.json` when a real booking URL exists, and not one second before.
- Fair housing constraints are restated in the tool result, not only in the system
  prompt, so the model cannot drift out of them mid conversation.
- With no API key it says it is not connected and gives the correct phone number.

---

## Design notes

Palette is Alex's own from intake. The one rule that matters: **gold is reserved
for the primary action.** Gold as text on cream measures 2.46:1 and fails, so the
accent is always a filled surface with navy on top, which is 5.44:1. It appears
nowhere decorative, including on the map.

The signature element is `components/ServiceAreaMap.tsx`: the seven towns plotted
from their real coordinates. Change the towns and the drawing changes.

Typography is loaded with a stylesheet link plus preconnect. Switching to
`next/font` self hosting is a contained change in `app/layout.tsx` and scores
marginally better; it could not be verified from the build container, which has no
egress to Google Fonts. Every rule declares a full fallback stack, so the page is
correct before the webfont arrives and correct if it never does.

---

## Deploy

1. Push to GitHub. **Private.** A public repo publishes the exact request shape of
   every endpoint and makes the honeypot readable on line 18.
2. Import to Vercel, set the environment variables, deploy.
3. Point the domain. Apex and www must both resolve.
4. Remove any deployment protection or preview-only setting as part of the cutover,
   not after. A leftover noindex launches a site invisible to Google and nobody
   notices for weeks. `npm run audit:rendered` checks for one.
5. Run `npm run audit:all` against the deployed URL's content, then walk every form
   and confirm the row lands in the Sheet with the right source tag.
