# v1.1 delivery report

Visual and interaction upgrade, plus the integrations. Branch
`v11-visual-interaction`, six commits from `b798945`.

**A note on the starting point before anything else.** The brief described a
v1.1 build that was correct but plain. The repo was at v6. Several premises in
the brief were already fixed and several were exactly as described, and the
difference matters for reading the rest of this document:

| Brief said | Actual state at v6 |
| --- | --- |
| The map is inert | It already had real TIGER/Line geometry, hover, focus, select and `aria-pressed`. What it lacked was anything to *say* |
| Build one shared reveal primitive | `Reveal.tsx` existed. It also had a defect that made it a no-op on every long route, described below |
| All eight routes open the same way | True |
| `SITE_ORIGIN` unset, canonicals point at localhost | True |
| `twitter:card` is `summary` with no image | True |
| The assistant is called Wick | True |
| The numbers band renders nothing today | It did not exist at all; it was deleted in v1 |

The pass was run against the brief as the target state, not against its
description of the starting one.

---

## 1. What changed, grouped by area

### The three live defects

**Canonical origin.** `lib/origin.ts` resolves `SITE_ORIGIN`, then
`VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then localhost. It prints a
banner in the build log whenever it falls back on Vercel, and throws outright
when nothing resolves there, rather than silently publishing
`http://localhost:3000` from every canonical, the sitemap and the JSON-LD.

The brief asked for `VERCEL_URL`. The project's stable production domain sits
above it because `VERCEL_URL` carries a build hash and changes on every push,
so a canonical built from it would differ on every deploy. `VERCEL_URL` is
still the fallback beneath it.

**Preview indexing.** noindex is host-conditional. Off on every Vercel
production deployment including one with `SITE_ORIGIN` still unset, off
entirely away from Vercel, and on for a preview or development deployment. It
switches itself off with no edit when the deployment is production or when
`SITE_ORIGIN` names the host. The narrowness is deliberate: `app/robots.ts`
already warned that a leftover noindex launching a site invisible to Google is
the worse of the two failures.

**Link previews.** `twitter:card` is `summary_large_image`. Cards are generated
by `ImageResponse` at `app/opengraph-image.tsx` with per-route variants for
buy, sell, veterans and investors. Navy field, his name, the brokerage lockup,
the seven towns, Lark, one gold hairline, and no claim of any kind. Archivo is
fetched at build time and embedded, with a fallback to Satori's default font if
that fetch fails, because a card in the wrong font is a small problem and a
build that fails on a font CDN hiccup is a large one.

### Kansas advertising law

`lib/compliance-type.ts` registers every surface where Alex's name is set
beside the brokerage name and throws at module load if his name exceeds twice
the brokerage's font size. The brokerage now sits **adjacent to his name** in
the header and the footer identity block, not only in the footer compliance
line as before. Measured live in `shots.mjs` from the browser's own computed
styles: header 1.42x, footer 1.40x, OG card 1.79x, cap 2x.

### Design system

No new hue. The navy became a ramp (`navy-deep`, `navy`, `navy-glow`,
`navy-lift`) and gold gained low-alpha hairlines and a pale champagne tint for
dark gradient stops. Depth comes from alternating light and dark bands, layered
drifting radial gradients, a grain overlay at 5 percent, warm navy-tinted
elevation on cream, a light top edge instead of a black shadow on dark cards,
one hairline gold rule opening each band, and the geometry motif.

**The geometry motif** reuses the real rivers, highways and city limit the map
is drawn from, at three to five percent, on dark bands. The paths are already
in the bundle, so it costs nothing, and it is the cheapest thing here that
makes the page read as being about this city.

### Motion

One shared reveal primitive, IntersectionObserver plus CSS transitions, fires
once and never re-arms. 12px rise, opacity fade, 60ms positional child stagger
where a band opts in. The hero field drifts over 48 to 54 seconds, the headline
reveals by line, the CTAs settle last. Map marks drop in 70ms apart and only
the active one pulses. The carry cost total eases using the same hook the four
tools already share. Buttons lift 1px on hover and press back on active.

Everything above is off under `prefers-reduced-motion`, and `shots.mjs` asserts
it both ways round: nothing animating, and nothing left invisible.

### Every route opens differently

A variant table places the light and picks which geometry sits behind it. It
structurally cannot reach the type scale, the CTA pair, the brokerage lockup or
the compliance geometry, which are identical on all eight routes. Buying gets
the highways, selling the city limit, veterans everything, investors the
highways lit from the opposite corner.

### The map

Eight facts per town, hover/focus/tap opening the same panel, Escape and
outside tap closing it, and one conversion path carrying the town into a
prefilled text message. Lark perches on the active mark. Fair housing rules
scoped to the area data, with a negative test proving they fire.

### Lark

Western meadowlark, inline animated SVG, no library, no raster asset, all
jitter seeded from a constant hash. Four states. Renamed everywhere. Trained
from config and content only, route aware, capture bounded at two turns by the
server rather than by the prompt, with fair housing, the no-calendar rule, the
no-invented-figures rule and the capture bound all restated in the tool result.

### Integrations

`deploy/leads-apps-script.gs`, `docs/lead-payload.md` (versioned contract),
per-surface and per-deployment source tags, and the rate limiting warning in
the README.

### Pending content

Numbers band with count-up, testimonial band built for three with a per-quote
name permission, and a headshot frame that adapts to the photograph rather than
cropping it. All three render nothing today.

---

## 2. Files touched, and files deliberately not touched

**Added (15):** `lib/origin.ts`, `lib/compliance-type.ts`, `lib/og.tsx`,
`components/Lark.tsx`, `components/BandTexture.tsx`, `components/LineReveal.tsx`,
`components/TownPanel.tsx`, `components/CountUp.tsx`, `components/Headshot.tsx`,
`app/opengraph-image.tsx` and four route variants, `docs/lead-payload.md`.

**Modified (34):** `README.md`, `DESIGN-NOTES.md`, `app/globals.css`,
`app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/api/chat/route.ts`,
all nine `content/*.json`, `lib/schema.ts`, `lib/content.ts`, `lib/leads.ts`,
`lib/assistant.ts`, `components/{Bands,ui,Reveal,Header,Footer,Assistant,ServiceAreaMap,CarryCostCalculator}.tsx`,
`components/tools/fields.tsx`, `scripts/{rules,audit-copy,audit-contrast,audit-negative,shots}.mjs`,
`tests/leads.test.mjs`, `package-lock.json`.

**Moved (1):** `integrations/leads-sheet.gs` to `deploy/leads-apps-script.gs`,
where the brief asked for it. Moved rather than copied, so there are not two
receivers that can drift apart. `integrations/` is now gone.

**Deliberately not touched:**

- `lib/generated/wichitaMap.ts` and `scripts/build-map-geometry.mjs`. The
  geometry is correct and regenerating it needs the TIGER shapefiles. This
  constrained where Lark could be placed; see section 3.
- `lib/guards.ts`, `app/api/lead/route.ts`, `components/LeadForm.tsx`. The
  brief said not to redesign the sink order, and the lead path itself was
  sound. `lib/leads.ts` gained only the environment stamp and the deployment
  field.
- The four interactive tools. Out of scope and working.
- `package.json` dependencies. **Zero new runtime dependencies, and zero new
  dev dependencies.** The lockfile gained one `hasInstallScript` metadata line
  from `npm install`. Lighthouse was run through `npx` without being added to
  the project.
- `compliance.narMembershipConfirmed`, still `false`. The word REALTOR is still
  a build failure, proved by a negative test.
- `content/magnets.json` copy, `docs/lead-magnets/*`, `docs/wiring.md`,
  `docs/status.md`.

---

## 3. Design decisions and reasoning

### The typeface

**Currently loaded before this pass:** Inter (400 to 900) for everything
including display, and JetBrains Mono (400, 500) for eyebrows, labels and
figures. There was no separate display face; the honest description of every
heading was "the body face set larger", which v3 had recorded as a deliberate
departure from the cream-plus-serif-revival tell.

**Changed to Archivo for display.** Inter is an excellent text face and a
characterless display one: at 900 weight and -0.04em tracking it goes soft, and
that was most of why the fold read as competent rather than designed. Archivo
is a grotesque with squared terminals, narrower apertures and a different
rhythm, so the headings change voice while the body copy stays quiet and
readable.

It satisfies both constraints the brief set. Not a default serif revival paired
with warm cream, which is AI design tell number one and the live risk on this
palette. Not a generic geometric sans, so the headings are not the circles and
straight lines every AI-built site reaches for. No broadsheet hairline
treatment and no oversized pull quotes anywhere.

Tracking now scales with size (-0.025em generally, -0.04em on the hero) rather
than one flat value, because -0.04em on a 1.9rem H2 reads as a printing fault.
Every rule keeps a full fallback stack resolving to the same system stack the
body face uses.

### navy-lift, and the contrast failure that shaped the whole dark field

The brief's lifted navy `#22475E` measures **3.69:1 against gold**, which fails
AA. It is kept at exactly that value but scoped to raised card surfaces that
never carry the accent phrase, and gold-on-navy-lift is in the contrast
auditor's FORBIDDEN list.

That number then constrained the layered gradients, and the auditor caught it
rather than a human. The first version put the two decorative washes on top of
a base that already peaked at `navy-glow`, and the build failed: the one gold
accent phrase a page carries measured **4.03:1** where the champagne bloom
overlapped the brightest point. `navy-glow` had already been chosen in v4 as the
brightest ground gold tolerates at all, so there was no headroom above it, and
no combination of the two decorative alphas cleared 4.5.

The fix was to lower the base rather than dim the decoration. The base tops out
at flat navy and the decorative lift raises it back toward the same ceiling
instead of past it. The brightest composited ground any text can land on is
`#203646`, gold measures **4.68:1** on it, and that exact composite is a checked
pair rather than an argument in a comment.

### The reveal primitive, and the defect inside the previous fix

v5 correctly caught that a full-page screenshot does not fire an
IntersectionObserver, and fixed it with a 60ms timer that revealed a hidden
section whether or not it had ever intersected.

That fixed the screenshot by removing the feature. Sixty milliseconds after
mount every section on the page was revealed, so the reveal only ever played
for bands already within a screen of the fold, and was dead code on every long
route. Nothing failed, which is why it survived a pass.

The timer is gone, replaced by four guards that are conditions rather than
clocks: reduced motion, no `IntersectionObserver`, a document too short to
scroll, and `beforeprint`. The screenshot problem moved to the tool, where it
belonged: `shots.mjs` scrolls the page the way a person does, then asserts no
band is still hidden.

### Lark's palette, and the one gold exception

Every fill is navy, cream, gold, or gold composited over navy-deep at a fixed
alpha (`#5B5544` back, `#393C38` wing), so the mascot cannot pull the palette
anywhere the site does not already go.

**The breast is full-strength `#B89A67`, and that is the only use of
full-strength gold on this site that is not a call to action.** Recorded rather
than quietly taken. The palette rule is that gold means "act here", and a
gold-breasted bird spends a little of that signal. Accepted because the breast
is the identifying feature of the species (a champagne tint reads as a
sparrow), the mark never appears in a button-shaped surface, and it renders at
38px or smaller everywhere except the OG card. If you would rather it were a
tint, it is one constant in `components/Lark.tsx`.

### Where Lark sits on the map, which is a constraint and not a composition

Every town's label sits directly above its dot, and the viewBox is padded to
exactly the label extent the current seven towns need: **Derby has 26 units of
clearance below its dot and Park City six above its label**. There is no room in
any direction to grow that envelope without regenerating the geometry from the
TIGER shapefiles.

So Lark stands in the one gap that already exists, below the label's descenders
and inside the bottom allowance `map-label-metrics.mjs` already reserves for the
dot and its halo. `audit-map-fit` stays green with its formula unchanged. This
is why the bird is beside the mark rather than standing on top of it.

### The town card's closed field set

The set is closed in `lib/schema.ts`, not only in the component, so there is no
field that could hold a characterization even if someone wanted to add one.
That is a stronger guarantee than a rule that catches bad wording after
somebody has written it, and the wording rule exists as well.

`schoolDistrict` carries a name and nothing else. The card states once, as its
own line, that district boundaries do not follow city limits and that Alex
should be asked about a specific address. That is a fact about boundaries, not
a statement about schools.

### The name lockup as a build failure

A constant in a TypeScript file is a claim about the CSS rather than the CSS,
so the ratio is enforced twice: `assertLockups()` throws at module load, and
`shots.mjs` walks `[data-compliance-lockup]` in a real browser and compares
computed font sizes. Only the second can fail for a reason nobody anticipated,
such as a Tailwind class that did not apply or a lockup somebody added and did
not register.

---

## 4. Every town fact left null, and who supplies it

27 of 56 fields carry a verified value with a source. 29 are null. Nothing was
filled in from memory.

**What was verified, and from where:**

- County, all seven, from Sedgwick County's and Butler County's own published
  lists of their incorporated cities.
- All seven city websites, each fetched and confirmed as official.
  `cityofmaize.org` and `andoverks.com` both 301 to `.gov` addresses; the
  redirect targets are what is stored.
- Andover incorporated 1957, from the city's own published history (a third
  class city on 4 February 1957, population 166).
- Five school district names, from a county or district primary source.
- MLS coverage, from the published 18-county service area of the operating
  association. Sedgwick and Butler are both in it, so all seven are covered.

**What is null, and who supplies it:**

| Field | Towns | Who | Why it is null |
| --- | --- | --- | --- |
| `driveToDowntown` | all 7 | **Alex** | Deliberately not taken from a mapping API. The useful number is what the drive takes at the hour someone would make it, and a free-flow figure published as fact would be a small lie. He drives these every week. |
| `housingEra` | all 7 | **Alex** | No public dataset states this per city at a quality worth publishing, and it must carry no characterization of the housing or of who lives in it. |
| `note` | all 7 | **Alex or Garrett** | Nothing written rather than padding the card. A note that is merely true and dull is worse than an empty row, and one that is interesting because it characterizes the place is a fair housing problem. |
| `yearIncorporated` | Wichita, Park City, Goddard, Derby | **Alex or Garrett, with a citation** | Not stated on the city's own site and not otherwise verified for this build. |
| `yearIncorporated` | Maize | **The City of Maize** | Two sources contradict each other. The city's own site says "140 Years Incorporated", pointing at roughly 1886; other accounts give 1915. A contradiction is exactly the case for publishing nothing. |
| `yearIncorporated` | Rose Hill | **The City of Rose Hill** | Its own site says "established in 1955", which is not the same claim as incorporated in 1955, and this field must not blur the two. |
| `schoolDistrict` | Wichita, Park City | **Alex, or drop the row** | Addresses inside both fall into more than one district. Sedgwick County lists ten districts in the county. A single name published against either would be wrong for a real number of houses. |

One thing found while researching that is worth naming: the City of Rose Hill's
own website describes itself as "Ranked as the 9th Safest City in Kansas in
2021". That is exactly the kind of claim the area rules forbid, and it is a good
illustration of why the rule set is scoped tightly to this data. Nothing of the
sort was carried across.

---

## 5. Auditor results

All run against the final commit.

| Suite | Result |
| --- | --- |
| `npm run audit:negative` (runs first) | **75 tests, 0 failures.** Rule sets covered: neverSay, doctrine, fairHousing, realtor, placeholder, emDash, fragments, areaClaims |
| `npm run audit:content` | **pass.** 404 strings plus 27 service area facts, 0 failures, 1 ratio warning (`/contact`, 1.25:1, pre-existing and judged) |
| `npm run audit:contrast` | **pass.** 0 failures |
| `npm run audit:rendered` | **pass.** 227 checks, 0 failures |
| `npm run audit:map-fit` | **pass** |
| `npm run audit:all` | **exit 0** |
| `npm run test:leads` | **29 tests, 0 failures** (was 13) |
| `node scripts/shots.mjs` | **76 Chromium checks pass. 1 failure: WebKit could not launch.** See section 6 |

No horizontal scroll at 320, 360, 390, 414, 768, 1024, 1280 or 1440, on all
eight routes. No console errors at any width.

Named checks: map hover/select drift **0.00px**, growth 1.833x, `aria-pressed`
true, CTA present. Map keyboard: focus opens, Escape closes, Enter selects.
Kansas lockup: header 1.42x, footer 1.40x. Reduced motion: nothing animating,
nothing hidden, all eight routes.

### Lighthouse

Run with Lighthouse 12 against `next start` on this machine, mobile preset with
its default throttling, through Playwright's Chromium.

| Route | Perf | A11y | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 87 | 100 | 100 | 100 |
| `/buy` | 87 | 100 | 100 | 100 |
| `/sell` | 88 | 100 | 100 | 100 |
| `/veterans` | 87 | 100 | 100 | 100 |
| `/investors` | 87 | 100 | 100 | 100 |
| `/areas` | 87 | 100 | 100 | 100 |
| `/about` | **85** | 100 | 100 | 100 |
| `/contact` | 90 | 100 | 100 | 100 |

**Lowest score per category, and the route that produced it:**

- **Performance 85, `/about`**
- Accessibility 100, every route
- Best practices 100, every route
- SEO 100, every route

`/about` breaks down as FCP 2.8s, LCP 3.6s, TBT 10ms, CLS 0. The blocking and
layout numbers are excellent; the paint numbers are what the simulated mobile
throttling does to a first paint that waits on one render-blocking CSS chunk
and a third-party font stylesheet. The available lever is `next/font`
self-hosting, which removes the Google Fonts round trip entirely. It was not
done: the brief asked for these numbers to be reported, not optimised, and it
is a real tradeoff (the build would then require egress to Google Fonts, where
today a font CDN failure degrades to the fallback stack). It is a contained
change in `app/layout.tsx` if you want it.

---

## 6. Unverified

Stated as unverified rather than assumed.

**WebKit could not be exercised on this machine.** `webkit.launch()` dies with
`Bus error: 10` before a page exists, with Playwright's own WebKit build
(`webkit_mac14_arm64_special-2251`) freshly installed. This is a different
failure from the one v6 recorded, which was a hang in `newContext().newPage()`,
but it is the same conclusion: **no route on this site has been rendered in
WebKit during this pass.** `shots.mjs` reports it as a hard failure rather than
skipping it, and it is written to run cleanly wherever WebKit does launch. Most
of this site's traffic will be iOS Safari, so this is the largest single gap in
the verification.

**The OG cards have not been seen in a real link preview.** They were rendered,
fetched as PNGs and inspected directly, and the meta tags were read off the
served HTML. Nobody has pasted the URL into iMessage.

**The lead sinks were tested against a mock server, not the real ones.** No row
has landed in a real Google Sheet, no lead has reached the real CRM or GHL,
and the Apps Script has never run inside Apps Script. It is syntax-checked as
JavaScript and its column list is asserted against a real request body, which is
not the same as having been deployed.

**Lark's model behaviour is untested.** There is no `ANTHROPIC_API_KEY` in this
environment, so no conversation has ever run. What is tested is the offline
path, the configuration probe, the per-route chips in served HTML, route
validation, and, at the source level, that the refusals and the capture bound
are present in the tool result. **The system prompt has never been exercised
against the model.** Whether Lark actually refuses a "which town is best"
question in practice is unverified.

**The count-up has never animated a real figure**, because `site.numbers` is
empty. The component is built and typechecked; it has not been seen counting.

**The testimonial band has never rendered**, for the same reason. The three-up
grid, the degradation to one and two, and the five name-display modes are built
and untested against real data.

**The headshot frame has never rendered an image.** Built, not seen.

**Lighthouse numbers are from this machine**, against `next start`, not from
the Vercel deployment. Production behind a CDN will differ, most likely upward.

**`compliance.brokerageName`, `brokerageAddress` and `brokeragePhone`** were
already in the repo sourced to the brokerage's own website with "Confirm with
Alex before launch" attached. That confirmation has still not happened, and
those three strings now appear more prominently than before, because the
brokerage name was added to the header and footer lockups.

---

## 7. Still blocked on Alex

In the order that unblocks the most.

1. **Testimonials with permission on file.** Still the highest value thing he
   can send, and now the band is built for three. Each one needs the quote, the
   attribution, and **how much of the name he has permission to publish**: full,
   first and last initial, first only, initials, or anonymous. Permission to be
   quoted and permission to be named are different permissions.
2. **His Kansas licence number, in writing.** The footer licensee line appears
   on every route the moment it lands.
3. **The photograph.** The frame adapts to whatever shape it is, so there is no
   crop to specify. Send the pixel dimensions with it and there is no layout
   shift either.
4. **Any verifiable figure about his business, with its source.** Four turns the
   numbers band on.
5. **The town facts.** Drive distance and honest drive time for all seven,
   typical housing era for all seven, one verifiable note per town if he has
   one, incorporation years for six, and a decision on Wichita and Park City's
   school district rows: a name he will stand behind, or drop the row.
6. **The buyer's guide and the VA checklist as actual documents.** Both forms
   promise Alex sends them himself, which is honest, but he has to have them.
7. **Confirmation of the brokerage name, address and phone**, which are
   published from the brokerage's own site and have never been confirmed by
   him. They are more prominent now.
8. **A decision on the domain.** Not athomewichita.com. The site needs its own,
   or a subdomain the broker sets up as a single CNAME with no MX change.

### And one that is not blocked on Alex

**The repository is public.** `README.md` says, in its own deploy section, to
push it private, and gives the reason: a public repo publishes the exact
request shape of every endpoint and makes the honeypot readable. That is a
decision for you, not something this pass changed, but it should not survive
to cutover.

### The order the assistant gets switched on

Stated here as well as in the README because it is the one sequence that costs
money if it is done wrong. Rate limiting does not run without Upstash and there
is no in-memory fallback, so setting `ANTHROPIC_API_KEY` first leaves a public
endpoint calling a paid API with nothing stopping a loop.

1. Anthropic Console spend cap.
2. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. `ANTHROPIC_API_KEY`, last, in the same session.

Doing none of them is fine. Lark says plainly that it is not connected, the
composer is disabled, and the phone number is right there.
