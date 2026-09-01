# Wiring v1

Everything needed to take `github.com/proygo/alexcolon-site` from pushed to
capturing leads. Follow it in order, because two of the values depend on the
deploy existing first.

---

## Order of operations

1. Import to Vercel and deploy with **no environment variables**. Gets you a URL.
2. Set up the Google Sheet receiver.
3. Set the environment variables using the URL from step 1.
4. Redeploy and walk every form.

Steps 1 and 2 are independent. Do them in either order or at the same time.

---

## Step 1. Vercel import

Vercel is already connected to the GitHub account, so this is dashboard clicks.

- **Add New > Project > Import** `proygo/alexcolon-site`
- Framework preset: **Next.js**, detected automatically
- Build command, output directory, install command: **leave every one on default**
- Root directory: `./`
- Deploy

The build runs `npm run build`, which runs the copy audit first. If a copy rule
is ever violated the Vercel build fails rather than shipping the violation, which
is the intended behaviour.

Note: the repo's default branch is **`master`**, not `main`. Vercel picks it up
either way; just don't be surprised when the production branch reads `master`.

Write down the deployment URL. It looks like
`https://alexcolon-site.vercel.app`. Call it `<URL>` below.

---

## Step 2. The Google Sheet

The script is in the repo at `integrations/leads-sheet.gs`. Its own header
comment has the click-by-click, but the short version:

1. New Google Sheet, first tab named **`Leads`**.
2. **Extensions > Apps Script**, paste the whole file in.
3. **Project Settings > Script Properties**, add:
   - `SHARED_SECRET` = a long random string. Generate with `openssl rand -hex 32`
   - `NOTIFY_EMAIL` = `alex@athomewichita.com` (optional but this is your speed to
     lead; without it nothing emails on a new lead)
4. **Deploy > New deployment > Web app**, Execute as **Me**, access **Anyone**.
   "Anyone" is required because Vercel calls it with no Google identity. The
   shared secret is the actual guard.
5. Copy the `/exec` URL.
6. Run `testAppend()` once in the editor to create the header row and approve the
   auth prompt. Delete the test row it writes.

**When you edit the script later:** Deploy > Manage deployments > edit the
existing one > Version: *New version*. Creating a *new* deployment issues a new
URL while the site keeps posting to the old one, and leads disappear silently.

---

## Step 3. Environment variables

Vercel > Project > Settings > Environment Variables. Set each for **Production,
Preview and Development** unless noted.

### Set these now

| Variable | Value |
| --- | --- |
| `SITE_ORIGIN` | `<URL>` — no trailing slash |
| `ALLOWED_ORIGINS` | `<URL>` — add the real domain later, comma separated, no spaces |
| `LEAD_SHEET_WEBHOOK_URL` | the `/exec` URL from step 2 |
| `LEAD_SHEET_SHARED_SECRET` | the same secret you put in Script Properties |

That is the minimum for a functioning v1. With just these four, every form
captures to the Sheet and Alex gets an email.

### Add when ready

| Variable | Value | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | from console.anthropic.com | **Set a spend limit in the Console first.** It is the real backstop and takes two minutes. Without this key the assistant says it is not connected and gives Alex's number, which is honest but is not the product. |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | Only if you want to pin something else |
| `UPSTASH_REDIS_REST_URL` | from Upstash | **Until both Upstash vars are set, rate limiting is not running.** The app logs a loud warning on every guarded request. Do not talk yourself out of this one: `/api/chat` bills your Anthropic key. |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash | |
| `CRM_LEAD_ENDPOINT` | your CRM ingest URL | See the contract below before setting |
| `CRM_API_KEY` | CRM bearer token | |
| `GHL_WEBHOOK_URL` | GHL inbound webhook | |
| `GHL_LOCATION_ID` | GHL location | |
| `NOTIFY_EMAIL_ENDPOINT` | | **Skip this.** The Apps Script sends the notification now, so this sink is redundant unless you want a second one. |
| `NOTIFY_EMAIL_TO` | | Same |

Every unset sink is skipped with a warning in the Vercel function log. Nothing
breaks and no lead is lost.

---

## The CRM contract — checked against the real repo, and it does not exist yet

An earlier build session guessed at this because it could not read
`GVonFlue/proytech-crm`. That guess has now been checked against the real repo
at commit `8707c4a` (29 Aug 2026), and the finding is not "here are the real
field names" — it's that **there is nothing at the other end to POST to.**

What's actually there:

- No route under `api/` in `proytech-crm` accepts an external lead. Every
  route is calendar, AI (Claude Haiku), or auth. `api/import-leads.js` looks
  like a candidate but only maps CSV column headers to field names for a
  human doing a manual import inside the CRM's own UI — it requires a signed-in
  session (`requireAuth: true`) and returns a column mapping, not a write.
- The `leads` table's only policy (`leads_all` in `MIGRATION.sql`) requires
  `auth.uid()` to match an owner, the lead's `owner_id`, or the caller's pool
  membership. There is no policy that permits an anonymous or API-key insert.
  All writes go through the browser client (`src/lib/supabase.js`,
  `db.upsertLead`) from a rep's own authenticated session.
- The CRM's own engineering notes say this outright, in
  `SPEED-TO-LEAD-SCOPE.md`: *"a form / webhook intake — no — there is no
  intake endpoint. `api/import-leads.js` only maps CSV columns; every other
  route is calendar, AI or auth."*

So `lib/leads.ts` is **unchanged** in this pass. The guessed shape below is
still just a guess, and adapting it to match a real contract would mean
inventing one, which is the thing this task exists to prevent. `CRM_LEAD_ENDPOINT`
stays unset, which is the honest and already-correct state, not a placeholder
for a fix still pending:

```json
{
  "full_name": "Pat Rivera",
  "email": "pat@example.org",
  "phone": "3165551234",
  "notes": "message and detail, joined by a blank line",
  "source": "Colon - Home Valuation Request",
  "landing_route": "/sell",
  "external_ref": "chat:8f2c...",
  "received_at": "2026-09-01T17:04:22.113Z"
}
```

**Two things that must not change whenever this does get wired to a real
endpoint on the CRM side:**

- `source` must carry `lead.sourceTag` verbatim. Most CRMs default an
  unattributed API lead to "Other", which destroys exactly the reporting that
  proves ROI at the sixty day case study.
- `external_ref` stays a **string** and is never parsed. Several real estate CRMs
  use 64-bit integer ids, and `Number(9007199254740993)` returns
  `9007199254740992`, which is a different record. There is a test for this
  (`tests/leads.test.mjs`, "a 64-bit external record ID survives the round
  trip as a string").

**What actually unblocks this:** `proytech-crm` needs a public ingest route —
something like `POST /api/lead-intake` behind its own bearer secret, inserting
through a `security definer` function the way `is_owner()` and `my_pools()`
already do in `MIGRATION.sql`, so an external POST can create a row without an
authenticated Supabase session. That is a change to the CRM repo, not
something this site's codebase can do on its own. Until it exists, leave
`CRM_LEAD_ENDPOINT` unset — the sink skips cleanly, and a sink pointed at a
nonexistent endpoint 4xxs silently in the logs instead.

---

## Step 4. Verify on the real deployment

Do not skip this. A green build will never catch a runtime error.

- [ ] Every route loads. `/`, `/buy`, `/sell`, `/veterans`, `/investors`,
      `/areas`, `/about`, `/contact`, and a made-up URL for the 404.
- [ ] Submit the contact form. **A row appears in the Sheet** with the right
      `sourceTag`, and the notification email arrives.
- [ ] Submit the valuation form on `/sell`. Different `sourceTag` in the Sheet.
- [ ] Tap the phone number on a real phone. It should dial, not copy.
- [ ] Tap the text link on a real phone. It should open Messages.
- [ ] If the Anthropic key is set: send the assistant a message, then a follow-up.
      **Two messages must produce one Sheet row, not two.** That is the session
      derived `externalRef` doing its job.
- [ ] Ask the assistant "which area has the best schools" and confirm it declines
      to rank and offers facts instead. That is the fair housing constraint.
- [ ] Ask it to book you for Tuesday at 3. It must say Alex will confirm, and must
      **not** say booked, confirmed, scheduled, or on the calendar.
- [ ] Vercel > Deployment > Functions log: confirm no `[lead][RECOVERABLE]` lines
      and no rate limiting warnings once Upstash is set.
- [ ] Run Lighthouse against the live URL. Targets: Performance 90+,
      Accessibility 95+, SEO 100. These could not be verified pre-deploy.
- [ ] Run Google's Rich Results Test against the live URL for the JSON-LD.

---

## Before it becomes the public site

Still open, and both need Alex:

1. **His Kansas license number**, in writing. Goes in
   `content/site.json` at `compliance.licenseNumber.value` with its source. The
   footer line then appears on every route with no code change.
2. **The domain.** Not `athomewichita.com` — that is the brokerage's, on GoDaddy,
   carrying live Google Workspace mail for the whole office. Register Alex his
   own. When it is pointed, add it to both `SITE_ORIGIN` and `ALLOWED_ORIGINS`
   and confirm apex and www both resolve.

Also confirm with him: brokerage name, office address, office phone (all three
taken from the brokerage's public site and marked "confirm before launch" in
`content/site.json`), and whether At Home Wichita's compliance contact requires
anything beyond the generic set. There is an `additionalRequired` array waiting.

Run `npm run report` any time for the current list, generated from the content
files rather than from this document, so it cannot drift.
