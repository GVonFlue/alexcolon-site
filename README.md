# Alexander Colón, Wichita area real estate

Built by ProyTech to the ProyTech Website Build Doctrine.

Next.js App Router, TypeScript, Tailwind v4, Zod validated content. Deploys to
Vercel. Nine routes plus a branded 404.

---

## Read this before launch

Four things are deliberately missing from this build, because inventing them is
never acceptable and a placeholder must never reach a live site. Each one
withholds its section rather than rendering something untrue.

| What is missing | What it blocks | Who supplies it |
| --- | --- | --- |
| Alex's Kansas license number | The licensee line in the footer | Alex, in writing |
| Any verifiable figure about his business | The whole numbers band | Alex |
| Any testimonial with permission on file | Every proof band, on every route | Alex |
| The buyer's guide and VA checklist as actual documents | Nothing, but the forms promise them | Alex |

**The photograph has landed.** `public/brand/alex-portrait.png`, supplied by Alex
in September 2026: 2000x2000 RGBA, background already removed. It is the hero on
the homepage and the portrait on /about, and it is the open graph card. Both
slots stay on the null convention, so setting `src` back to null removes him and
leaves both compositions finished rather than broken. What was measured off the
file, and what those measurements constrain, is in `components/Hero.tsx` and
`docs/V11-REPORT.md`.

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
| `SITE_ORIGIN` | Canonical origin, no trailing slash | Falls back to the Vercel production domain, then to `VERCEL_URL`, and prints a loud banner in the build log. Only falls back to localhost off Vercel. See `lib/origin.ts` |
| `ALLOWED_ORIGINS` | Comma separated origin allowlist for the API routes | Origin check logs a warning and does not run |
| `LEAD_SHEET_WEBHOOK_URL` | Apps Script endpoint that appends a row. **The source of truth.** | Sink skipped, warning logged |
| `LEAD_SHEET_SHARED_SECRET` | Shared secret the Apps Script checks | Sent empty |
| `CRM_LEAD_ENDPOINT` / `CRM_API_KEY` | ProyTech CRM ingest | Sink skipped — and there's nowhere to point it yet, see `docs/wiring.md` |
| `GHL_WEBHOOK_URL` / `GHL_LOCATION_ID` | GoHighLevel inbound webhook | Sink skipped |
| `NOTIFY_EMAIL_ENDPOINT` / `NOTIFY_EMAIL_TO` | Instant notification. Speed to lead depends on this | Sink skipped |
| `ANTHROPIC_API_KEY` | The assistant | Assistant says it is not connected and gives the phone number |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5` | Uses the default |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | **Rate limiting does not run.** Loud warning on every guarded request. Read the warning below before setting `ANTHROPIC_API_KEY` |

### Read this before you turn the assistant on

**Rate limiting does not run without Upstash.** There is no in-memory fallback,
and there deliberately is not one: serverless functions do not share memory
between invocations, so an in-memory limiter would silently do nothing while
looking like it worked, which is worse than none at all.

What that means in practice: the moment you set `ANTHROPIC_API_KEY`, the chat
endpoint is a public URL that calls a paid API, and if Upstash is not configured
there is nothing stopping one person from calling it in a loop. Nobody has to
be malicious for this to cost money; a crawler is enough.

So all three of these go in during the same session, not one now and the rest
later:

1. The Anthropic Console spend cap. Set it before the key exists anywhere.
2. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. `ANTHROPIC_API_KEY`, last.

If you only have time to do one of them today, do none of them. The site
degrades honestly with no key: Lark says plainly that it is not connected, the
composer is disabled rather than accepting a question nobody will answer, and
the phone number is right there. That is a perfectly good state to sit in for a
week. A public unlimited endpoint is not.

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

An image slot carries a `source` on the same terms a fact does, and `lib/schema.ts`
refuses a `src` without one, and without the pixel dimensions. A photograph is a
claim about a person, so an unsourced one cannot ship, and a slot with no
dimensions cannot reserve its box and would shift the layout when it loads.

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
  measures a color that is never painted. Two of its colours are measured off
  the photograph rather than taken from the palette (his jacket `#E3C7B2`, his
  hair `#312A27`), because the moment a person is painted into a band, part of
  the ground under the text stops being a token.
- `node scripts/shots.mjs` also samples the **real painted pixels** under every
  line of hero copy and under the gold action, at three widths, and fails on
  anything under 4.5:1 (3:1 for gold against its own ground). A ratio against a
  token is not a ratio against a photograph.
- `node scripts/build-og-portrait.mjs` regenerates the open graph card's own
  crop from the master portrait. Run it if the photograph changes. Its output is
  committed, the same arrangement `build-map-geometry.mjs` uses, so a deploy
  never needs a browser binary.

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
- Every lead carries an explicit source tag, one per surface: five form tags and
  one assistant tag per route. Unknown tags are rejected.
- **Preview traffic is marked.** On any deployment that is not production, the
  source tag arrives with the deployment appended (`... [preview]`) and a
  `deployment` field is sent alongside it. The marker is added server side after
  validation, so it cannot be spoofed in either direction. Filter on the field,
  not the tag. This exists because a preview deployment has real working forms,
  and every lead generated while testing one used to land in the live Sheet
  indistinguishable from a genuine one.
- The full request shape is documented in `docs/lead-payload.md`, written so the
  CRM can be built against it without reading `lib/leads.ts`.
- External record IDs are strings and are never parsed.
- Spam controls are a honeypot plus a three second minimum on form. No CAPTCHA.
- Forms work with JavaScript disabled: real `<form action>`, 303 to `/thanks`.

`npm run test:leads` proves each of these against the real endpoint.

---

## The assistant

Named **Lark**, a western meadowlark, which is the Kansas state bird. Server side
only, `app/api/chat/route.ts`, Claude Haiku.

- It is never presented as Alex and says so in its own introduction. It is a
  bird, so it cannot be mistaken for him, which is the rule that matters.
- The mascot is `components/Lark.tsx`: inline animated SVG, no library, no raster
  asset. Every fill is navy, cream, gold, or a measured blend of the two, so it
  cannot pull the palette anywhere the site does not already go. All jitter is
  seeded from a constant hash rather than `Math.random`, so the server and the
  client render identical markup.
- Four states: idle, thinking, answering, and not connected. Every one of them
  begins and ends on the resting pose, which is what lets the blanket
  `prefers-reduced-motion` rule leave a bird perched naturally rather than one
  frozen mid-blink.
- **Knowledge comes from config and content only.** The system prompt reads the
  seven town fact sets, the four audience lanes, the buyer's guide outline and
  the FAQ out of `content/*.json` at request time, so a copy edit changes what
  Lark knows in the same commit it changes what the page says. Only verified
  facts reach it: a null field is absent, so it cannot state something the site
  is withholding.
- **Chips are per route.** `/veterans` and `/investors` do not get the same three
  starter questions. A route can override `assistant.chips` in its own content
  file; one that does not falls back to the site-wide set.
- Capture is a tool call, never parsed from free text.
- **Bounded to two capture turns.** Past the bound the server stops sending the
  tool at all rather than merely discouraging a third ask.
- **There is no calendar integration.** The system prompt and the tool result both
  forbid saying an appointment is booked, confirmed, scheduled, held, or on the
  calendar. It passes a requested time along. Set `assistant.bookingUrl` in
  `site.json` when a real booking URL exists, and not one second before.
- Fair housing constraints are restated in the tool result, not only in the system
  prompt, so the model cannot drift out of them mid conversation. So are the
  no-calendar rule, the no-invented-figures rule and the capture bound.
- With no API key it says it is not connected, in words, in the card, and gives
  the correct phone number. That state is server rendered, so it is true in the
  markup before any JavaScript runs.

---

## Design notes

Palette is Alex's own from intake. The one rule that matters: **gold is reserved
for the primary action.** Gold as text on cream measures 2.46:1 and fails, so the
accent is always a filled surface with navy on top, which is 5.44:1. It appears
nowhere decorative, including on the map.

The signature element is `components/ServiceAreaMap.tsx`: the seven towns plotted
from their real coordinates. Change the towns and the drawing changes.

Typography is **Archivo** for display, **Inter** for text, **JetBrains Mono** for
eyebrows, labels and figures.

Archivo is new in v1.1 and it replaces "the display face is the body face set
larger", which was the honest description of every heading up to v6. Inter is an
excellent text face and a characterless display one: at 900 weight and tight
tracking it goes soft, which was most of why the fold read as competent rather
than designed. Archivo is a grotesque with squared terminals and a different
rhythm, so the headings change voice without touching the body copy. It keeps
both rules that constrain the choice: not a serif, so the cream-plus-serif
revival tell is still avoided, and not a geometric sans.

Loaded with a stylesheet link plus preconnect. Switching to `next/font` self
hosting is a contained change in `app/layout.tsx` and scores marginally better.
Every rule declares a full fallback stack, so the page is correct before the
webfont arrives and correct if it never does.

---

## The leads Sheet

`deploy/leads-apps-script.gs` is the receiver, complete, as one file. Paste it in
fresh over the placeholder Apps Script gives you; there is nothing else to add.
The request shape it expects is in `docs/lead-payload.md`.

1. Create a Google Sheet. Name the first tab **Leads**.
2. **Extensions > Apps Script.** Delete the placeholder `myFunction`, paste the
   whole of `deploy/leads-apps-script.gs`, and save.
3. **Project Settings > Script Properties > Add script property:**
   - `SHARED_SECRET` = a long random string. Generate one with
     `openssl rand -hex 32`.
   - `NOTIFY_EMAIL` = Alex's address, if you want the Sheet itself to mail him
     on every new row. Optional, and it is a belt to the site's own notify sink
     rather than a replacement for it.

   The secret goes in Script Properties and nowhere else. Not in the file, not
   in the repo.
4. **Deploy > New deployment > Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**

   "Anyone" is required, because Vercel calls this without a Google identity.
   The shared secret is what actually guards it, which is the whole reason step
   3 matters.
5. Copy the `/exec` URL. That is `LEAD_SHEET_WEBHOOK_URL`. Put the same secret in
   `LEAD_SHEET_SHARED_SECRET` on Vercel. Set both for **every** environment you
   want leads from, production included.
6. In the Apps Script editor, run `testAppend()` once. It creates the header row
   and triggers the authorization prompt, which you have to approve by hand.
   Delete the test row afterwards.
7. Submit a real form on the deployed site and confirm the row lands with the
   right source tag.

**Re-deploying after an edit:** Deploy > Manage deployments > edit the existing
deployment > Version: **New version**. Creating a *new* deployment gives you a
new URL while the site keeps posting to the old one, which is a silent way to
lose every lead until somebody notices.

**Preview rows are tinted.** Any row whose `deployment` is not `production`
lands with a warm background, so nobody mistakes a test submission for a real
lead while skimming. Filter on the `deployment` column to drop them.

---

## Deploy

1. Push to GitHub. **Private.** A public repo publishes the exact request shape of
   every endpoint and makes the honeypot readable on line 18.
2. Import to Vercel, set the environment variables, deploy.
3. Point the domain. Apex and www must both resolve.
4. Remove any deployment protection or preview-only setting as part of the cutover,
   not after. A leftover noindex launches a site invisible to Google and nobody
   notices for weeks. `npm run audit:rendered` checks for one.

   The site's own noindex is host-conditional and needs no cutover step: a
   Vercel preview or development deployment disallows itself, and a production
   deployment does not, whether or not `SITE_ORIGIN` is set yet. See
   `lib/origin.ts`. Set `SITE_ORIGIN` anyway, or every canonical points at the
   deployment URL instead of the domain.
5. Run `npm run audit:all` against the deployed URL's content, then walk every form
   and confirm the row lands in the Sheet with the right source tag.
