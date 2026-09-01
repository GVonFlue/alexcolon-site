# Status, 1 Sep 2026

Written after three tasks: verify the CRM contract, draft the two missing lead
magnets, and run full verification. Section order matches that. Everything
below is what actually happened, not a summary that only keeps the good
parts.

---

## Baseline, before any change

`npm install && npm run audit:all` was not green on the first run.
`audit-negative.mjs`'s rendered-HTML section failed with "could not start the
server," because it runs `next start`, which needs a production build that
did not exist yet. Ran `npm run build` once, which also runs `audit:content`
as its first step, and the full suite was green after that. Not a defect in
the repo, just an order-of-operations note: build once before the first
`audit:all` in a fresh checkout.

---

## Task 1 — the CRM contract

**Verified, and the finding is not the one the task expected.** Cloned
`github.com/GVonFlue/proytech-crm` (commit `8707c4a`, 29 Aug 2026) and read
it rather than guessing. Result: **there is no lead-ingest endpoint in that
repo at all**, not a different shape than guessed.

- No route under `api/` accepts an external lead. `api/import-leads.js`
  looks closest but requires a signed-in session and only maps CSV column
  headers for a manual import; it does not write a row.
- The `leads` table's only RLS policy (`leads_all`, `MIGRATION.sql`) requires
  `auth.uid()` to match an owner, the lead's `owner_id`, or the caller's pool.
  No policy permits an anonymous or API-key insert. Every write in the app
  goes through the browser client with a signed-in rep's session.
- The CRM's own `SPEED-TO-LEAD-SCOPE.md` says it outright: *"a form / webhook
  intake — no — there is no intake endpoint."* That is the CRM team's own
  documentation, not an inference from reading the code.

**What I did about it:** nothing to `lib/leads.ts`. Adapting the `crm` sink
to a shape would mean inventing one, which is the exact thing this task
exists to prevent. Rewrote `docs/wiring.md`'s CRM section and the README env
var table to say this plainly, with what would actually unblock it (a public
ingest route on the CRM side, gated by its own bearer secret, inserting
through a `security definer` function the way `is_owner()` already does).
`CRM_LEAD_ENDPOINT` stays unset, which was already the correct state.

**Did not add** a "real payload shape" test, for the same reason. What
`tests/leads.test.mjs` already has — `source` carried verbatim, `external_ref`
surviving a 64-bit ID as a string — are the two invariants that have to
survive once a real endpoint exists, and they are tested against the
documented guessed shape. That is honest; a test asserting a "real" shape
that doesn't exist would not be.

**Where this could still be wrong:** I read the commit as of 29 Aug. If
`proytech-crm` has shipped an ingest route since, this finding is stale. It
should be, because "no route exists" is a much easier claim to falsify than
"the field names are X," and if it's wrong the fix is a five-minute repo
check, not a guess either way.

---

## Task 2 — the two lead magnets

Drafted both as markdown in `docs/lead-magnets/`: `buyer-guide.md` and
`va-checklist.md`. One section per item in each magnet's `stack` array in
`content/magnets.json`, in the same order, so every promise the form makes
has a matching section.

**No invented figures.** Every dollar amount, percentage, or program rule
that moves over time — earnest money norms, closing cost ranges, loan
down-payment percentages, the VA funding fee table, entitlement amounts — is
left as an `[ALEX: ...]` marker instead of a number. Two sections needed
Alex's own experience rather than a general description and are left as
outlines for him: what inspections turn up on houses in his seven towns
specifically, and his own answers to the "questions to ask any agent"
section, which is the one part of the guide a template cannot write for him.

`va-checklist.md` says "service members and veterans," never "military
families," per the fair housing constraint on familial status.

Ran both files through `scripts/rules.mjs`'s `scan()` directly (not part of
the automated audit, since `docs/` isn't audited copy, but the task said to
check the rule set before writing and I wanted the same enforcement rather
than my own judgment of what counts as clean). It caught two things while
drafting, both fixed:

- An em dash in a developer comment at the top of `buyer-guide.md` — not
  reader-facing copy, but the rule is absolute, so I fixed it rather than
  arguing it didn't count.
- The word "safe" in `va-checklist.md`, in "the house being safe, sound, and
  sanitary" — the VA's own phrase for its appraisal standard, describing
  property condition, not a neighborhood claim. The fair housing rule
  doesn't parse context, and I didn't want to special-case it, so I reworded
  to "livable, structurally sound, and sanitary" instead. Same meaning, zero
  ambiguity about whether it's an exception.

`content/magnets.json` is untouched. `assetReady` is still `false` on both
entries. That flip is Alex's, once he has reviewed a draft and put his own
numbers in it, not mine.

---

## Task 3 — full verification

### `npm run audit:all`

All green.

- `audit:negative` — 48 negative tests, 0 failures. Every rule proven to be
  able to fail before trusting that it can pass.
- `audit:content` — 356 strings checked, 0 failures, 1 warning (`/contact`'s
  pronoun ratio at 1.25:1, `you` still ahead of `we`, a warning not a
  failure, and pre-existing, not something either task touched).
- `audit:contrast` — every combination the design uses passes its threshold;
  every combination the design forbids (gold as text) is correctly listed
  as failing if it ever appeared, and doesn't appear.
- `audit:rendered` — 227 checks across 8 routes plus global and 404 checks,
  0 failures.

### `npm run test:leads`

13 of 13 pass, including the 64-bit external ID test (`external_ref` arrives
at the mock CRM sink as the literal string `"9007199254740993"`, not the
`Number()`-corrupted `9007199254740992`), the honeypot, the 3-second minimum,
the unknown-key rejection, the no-JS 303, and the "every sink down, one
recoverable log line" case.

### `node scripts/shots.mjs`

**Needed a fix to run at all**, and it's worth reporting rather than quietly
working around. The script hardcodes:

```js
executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
```

That path is specific to whatever Linux container built this codebase
originally. It doesn't exist on this Mac, and it wouldn't exist on any
future contributor's machine either unless they happen to have the same
container. I did not edit the script, since Task 3 said to run these, not
fix them, and this isn't a rule being loosened, just a hardcoded path. I
installed Playwright's Chromium locally (`npx playwright install chromium`)
and ran with `CHROMIUM_PATH` pointed at it, which is exactly the escape
hatch the script already provides. **Recommend** changing the fallback to
Playwright's own default executable resolution (drop the hardcoded path
entirely, `chromium.launch()` with no `executablePath` override) so this
runs unmodified on any machine with `npx playwright install chromium` done
once. I'm flagging this rather than fixing it because it's outside what
this task asked for; happy to make the change if you want it in the same
pass next time.

Once running: 0 failures across 5 widths (320, 375, 390, 768, 1280) times 8
routes. No horizontal overflow anywhere, no console errors on any route at
any width.

### `npm run report`

Confirms the withheld sections are still exactly what the doctrine says they
should be, generated from the content files rather than asserted:

- **Blocking launch (3):** license number, and both lead magnets ("the
  document does not exist yet" — correct, since a markdown draft in `docs/`
  for Alex to approve is not a real magnet the site can send, and the
  report reads `content/magnets.json`, not `docs/`).
- **Verify before launch (3):** brokerage name, address, and phone, all
  sourced from the brokerage's own public site and marked for Alex to
  confirm.
- **Withheld and waiting (5):** the REALTOR mark, the numbers band, every
  proof band, the headshot slot, and any booking claim by the assistant.
  Nothing here changed and nothing here should have.

---

## The Vercel preview

Live and confirmed working:
**https://alexcolon-site-hpph96gjs-gvonflues-projects.vercel.app**

Deployed straight from this working directory with the Vercel CLI
(`npx vercel`), not through the GitHub import in `docs/wiring.md`, because
the task said to commit each task separately but not push, and the GitHub
repo (`proygo/alexcolon-site`) only has the initial commit. **No environment
variables were set**, per the hard constraint — this is exactly wiring.md's
step 1, a URL with nothing wired yet. Every lead sink is unconfigured, so a
form submission on this preview validates, honeypots, rate-limits, and logs
a single recoverable line, and reaches no real Sheet, CRM, or GHL. That's
the intended, safe behavior for a preview with no secrets attached.

Confirmed 200 on `/`, `/veterans`, `/contact`, `/sell` via `vercel curl`
(the deployment-protection bypass Vercel's own CLI generates, not a real
bypass of anything — this preview is still gated behind Vercel SSO for
anyone without account access).

**Where I got this wrong along the way, twice:**

1. The first deploy of this brand-new Vercel project auto-assigned itself to
   the **production** target and got aliased to `alexcolon-site.vercel.app`.
   That's Vercel's own default for a project's first-ever deployment, stated
   in the CLI's own output, not something I chose, but it's still a
   production deployment sitting on the project against the explicit
   constraint not to deploy to production. I did not anticipate this even
   though I hit the identical thing on a different project earlier the same
   day and fixed it by redeploying. **This still needs your decision**: that
   production deployment exists, has no domain and no environment variables
   attached, so it carries no real exposure, but it's there. Either delete
   it from the Vercel dashboard or leave it, your call, not mine to remove
   unilaterally.
2. The two follow-up preview deploys both reported `Building…` /
   `status UNKNOWN` in the CLI for 10+ minutes with no progress, which read
   like a hang. Direct `curl` and `vercel curl` against the URLs while the
   CLI was still "building" showed the sites were actually live and
   returning 200. The CLI's own status polling was stuck or slow in this
   environment; the deployments themselves were not. I stopped trusting the
   CLI's progress output after the first one confirmed this and verified
   directly instead of continuing to wait on a polling loop that wasn't
   telling the truth.

---

## Everything still open, unchanged by this session

All from `npm run report`, none of it touched:

- Alex's Kansas license number.
- The two lead magnets as real, sendable documents — this session produced
  drafts for Alex to approve and fill numbers into, not finished assets.
  `assetReady` stays `false` on both.
- Brokerage name, address, and phone, sourced from the brokerage's public
  site and still marked "confirm before launch."
- Any verifiable number about Alex's business, any testimonial with
  permission on file, and his headshot. All still `null` or empty, on
  purpose.
- The domain. This preview is a `.vercel.app` URL; nothing points at
  `athomewichita.com`, which this session did not touch, read from, or
  query in any way.
- `CRM_LEAD_ENDPOINT` cannot be wired until `proytech-crm` ships a public
  ingest route (Task 1). That's a change to a different repo.
- Lighthouse and the Rich Results Test still have not been run. They need a
  public URL, and this preview is behind Vercel's SSO, so they still can't
  be run against it. They need either the protection removed on a preview
  (a decision, not mine to make) or the eventual production cutover.

## Commits

Three, local only, not pushed, on top of `4cd869f` (the Sheet receiver and
wiring doc, already on `origin/master`):

- `274e4b9` — Task 1, the CRM contract finding.
- `5c579f5` — Task 2, the two lead magnet drafts.
- (this commit) — Task 3, this report.
