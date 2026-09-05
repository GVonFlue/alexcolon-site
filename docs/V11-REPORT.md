# v1.1 delivery report

Visual and interaction upgrade, plus the integrations. Branch
`v11-visual-interaction`, eight commits from `b798945`.

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

Named checks, all passing in Chromium:

- Map hover/select: drift **0.00px**, growth 1.833x, `aria-pressed` true, CTA present
- Map keyboard: focus opens the panel, Escape closes it, Enter selects
- Kansas lockup: header 1.42x, footer 1.40x, cap 2x
- Keyboard walk, lead form 6 controls, buyer guide form 6, valuation form 7,
  all reachable and all painting a visible focus ring
- Assistant keyboard: not connected, so the composer is correctly disabled, the
  offline copy is present, and the phone number is reachable from the keyboard.
  The **connected** branch of that check has never run, because there is no API
  key here
- Reduced motion: nothing animating, nothing hidden, all eight routes

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

**The assistant's connected keyboard path is untested.** The keyboard check is
state aware and asserts the correct thing for each state, but only the
not-connected branch has ever executed here.

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

---

# v1.2 delivery report

The photograph landed. This pass is what happened when it was measured rather
than described.

**One thing was blocked last pass and is not any more.** Alex's headshot could
not be read because macOS denied access to the folder it was in. It was copied to
a readable location and Full Disk Access was granted, so it was read, measured,
and built against.

---

## 1. The file, measured on arrival

`~/Alex-Colon-incoming/alex-portrait.png`, copied byte for byte to
`public/brand/alex-portrait.png` (md5 `6a390f4b45a0d879704a4d76bc598c11`).

| What | Measured |
| --- | --- |
| Dimensions | 2000 x 2000, 8 bit RGBA, non-interlaced |
| Alpha | Real: 2,186,054 px fully transparent (54.7%), 1,774,950 fully opaque (44.4%), 38,996 partial (0.97%) |
| Subject bounding box | x 15..1999 by y 250..1999 (at alpha > 8) |
| Headroom above his hair | 250px, 12.5% of the frame |
| Head width | 685px at its widest (y 800), hair and beard included, 34% of the frame |
| Shoulder width at the bottom row | 1974px of 2000, so he is nearly 3x wider at the chest than at the head |
| Jacket | `#E3C7B2` (mean of two 400x450 samples) |
| Hair | `#312A27` (mean of x 760..1160, y 260..420) |
| File metadata | `software: Canva doc=DAHSmnVlWBM ... brand=ICT Home Collective`, `artist: Garrett Von Flue` |

**Three of the brief's expectations, checked.**

*"Roughly square."* Correct, exactly square.

*"Background already removed, a cutout on transparency."* Correct, and the alpha
is genuinely used rather than a fully opaque channel.

*"Chest up with very little headroom above his hair."* Chest up, yes. The
headroom is 250px, which is 12.5 percent of the frame. That is a lot rather than
very little, and it is useful: it means the frame can be anchored without the
crop ever reaching the top of his head.

**The halo, tested rather than looked at.** The check is not to inspect the edge,
which is unreliable against a dark preview. It is to compare every partially
transparent pixel with the nearest fully opaque one within 4px: a light fringe
from background removal makes edge pixels systematically **brighter** than the
subject just inside them.

| | |
| --- | --- |
| Edge pixels sampled (alpha 20..235) | 12,478 |
| Mean luminance delta, edge minus interior | **-4.91** |
| 5th / 25th / 50th / 75th / 95th percentile | -26.1 / -13.1 / -5.5 / +2.3 / +19.5 |

Negative throughout the middle of the distribution, which is dark hair and jacket
shadow, not a fringe. **There is no halo, and nothing was feathered.** Feathering
a clean matte only softens it. Inspected at 2x on the source and again at 2x on
the rendered page: individual hair strands survive with soft alpha and the ground
behind them is navy with no ring.

---

## 2. The constraint the brief was half right about

The brief warned that his jacket is a warm tan close to the site's gold. It is
warmer and lighter than gold rather than the same colour, and the problem is
larger than gold:

| ink | on his jacket `#E3C7B2` |
| --- | --- |
| cream `#F7F4EE` | **1.46:1** |
| dim `#C9CDD2` | **1.01:1** |
| gold `#B89A67` | **1.66:1** |
| navy `#172A3A` | 9.15:1 |

Every ink this site paints on a dark band is a light one, so **no colour in the
palette may sit on his jacket at full strength**, and dim, the supporting copy
colour, is the worst of the three. Gold is separately a problem for the reason
the brief gave: it is close enough in hue as well as value to read as a smudge.

Two mechanisms enforce it now.

`scripts/audit-contrast.mjs` gained `jacket` and `hair` as measured colours
alongside the palette tokens, with all three failing pairs in its FORBIDDEN list.
It failed the build once during this pass: the hero's attribution line was
`text-dim/90` and measured **4.44:1** over the feathered edge.

`scripts/shots.mjs` gained `checkPortraitContrast`, which captures each ink's box
and computed colour, hides the ink layer, screenshots the ground, and takes the
**worst pixel** in each box. A ratio against a token stops being a ratio against
the ground the moment a photograph is part of the ground. It failed twice during
this pass, both real.

---

## 3. What changed, and why

### The hero

- The frame is `aspect-[3/4]` over a square source, so `object-fit: cover` scales
  to its height and crops **horizontally only**. The top of his head cannot be
  cropped at any frame size, at any viewport width. All vertical cropping is done
  by a clipping box that only ever takes from the bottom.
- Anchored with `right: calc(50% - 50vw)`, so his right edge lands on the screen
  edge at every width rather than stopping at the 76rem container and leaving a
  navy strip beside him.
- **Two masks, nested, not composited.** The tidy spelling is two mask layers plus
  `mask-composite: intersect`. Rejected for how it fails: an engine without
  `mask-composite` falls back to `add`, the union, which would leave him fully
  opaque exactly where the copy crosses him. That is a silent contrast failure in
  the engine that could not be tested on this machine, introduced by the tidier
  code. Nesting cannot fail that way.
- **`mask-repeat: no-repeat` on every fade.** A mask gradient tiles by default,
  so an element wider than its first tile gets the gradient again rather than its
  end value. This put a hard vertical cut down the /about portrait at exactly the
  point where it bleeds past its column. Found by looking at it, then measured.
- The rim light is champagne, not gold, at two radii. Gold is the primary action
  and a decorative glow the size of a person is the largest single draw on that
  signal anywhere on the site.
- The drifting field's bright stop moved behind his head, applied by the presence
  of a portrait rather than by the route variant table, so the table's rule
  ("atmosphere, never structure") still holds.

### The overlap the brief asked for, and what it became

**The headline does not cross his shoulder, and it cannot.** Verified visually
with the real photograph at 1024, 1280 and 1440, which is what the brief asked
for.

The geometry: a headline sits at the top of a hero, and at the top of the frame
the only part of him that exists is his head, which is narrow and centred. His
shoulders are at the bottom, level with the supporting copy and the buttons. At
1280 the longest headline line ends around x 613 and his nearest pixel at that
height is 217px further right. Closing that gap means either moving him left,
which loses the bleed and puts a navy strip on his right, or scaling him up until
his shoulder reaches the headline, which crops his face at the band's top edge.

What crosses him instead:

- **The map card**, hard, over his chest, at `z-30` with a backdrop blur. A real
  occlusion, which is the strongest depth cue on the band.
- **The copy column**, into his feathered edge, where he is 0 to 38 percent
  opaque. Cream tolerates 38 and measures 5.24:1 there. Dim tolerates 25, and is
  held under it by the support column being 34rem and the attribution 32rem
  against the headline's 38rem. Those widths are a contrast decision now, not a
  typographic one.

### Mobile, decided by looking at it

The previous pass dropped the portrait below `md` and said plainly there was no
honest way to judge without a photograph. With one:

**He works at 390.** His face renders **149px** across, which is a face rather
than a thumbnail, and it is the strongest thing on the viewport carrying most of
his traffic. He is right anchored, bleeding through the page gutter and the
band's bottom padding, directly under the buttons, with nothing painted on him.

The overlap does not work at 390 and that is not a taste call: below `lg` the
copy column is essentially the viewport, so any portrait behind it is a portrait
behind text at 1.46:1.

That treatment now runs to 1023 rather than 767. 768 to 1023 was tried as a
narrower version of the desktop composition and is the worst of both: the frame
shrinks to clear a copy column that is still nearly the full width, which pushes
him into the bottom right corner at a size where his face stops carrying and
leaves the top right of the band empty.

### /about

A different composition, not the same crop resized:

| | hero | /about |
| --- | --- | --- |
| crop window | 1500px of source | 1428px |
| anchored | right, bleeding off the viewport | left, bleeding off the page gutter |
| faded | left | right |
| covered by | the map card | nothing |
| his face at 1280 | ~253px | ~278px |

The thing that made it hard is a property of the photograph. He is a wide,
symmetric, chest-up cutout whose shoulders reach both edges of the frame, so
cropping close enough for a large face always cuts the silhouette, and a cutout
whose silhouette is cut is a rectangular photograph with no border. The first
attempt did exactly that and looked like a snapshot in a box. It works by hiding
both cut edges: one runs off the page gutter, the other dissolves.

**One portrait per page.** `site.headshot` and the hero's `portrait` are the same
file and the trust band appears on both `/` and `/about`, so turning both on put
him on the homepage twice. The trust band now withholds its portrait on any page
whose hero already carries one, derived from the page's own bands rather than
hardcoded per route.

### The open graph cards

All five regenerated with him on them. Navy field, him cut out on the right
bleeding off the bottom and the right, name and brokerage lockup on the left,
Lark small at 62px.

Sized for the size it actually renders at, which is not 1200x630. iMessage draws
it at roughly 300px, a quarter of nominal:

| | at 1200px | at ~300px |
| --- | --- | --- |
| his face | ~225px | ~56px |
| his name | 74px | ~18px |
| the brokerage | 40px | ~10px |
| the seven towns | 21px | ~5px |

The long headline the card used to carry measured about 13px after that
reduction: a sentence nobody can read, occupying the space his face needed. It is
gone and **nothing replaced it**. No number, no testimonial, no adjective. What
is left says who this is.

The two lockup sizes went up, 68/38 to 74/40, which is a compliance change as
much as a legibility one: the brokerage name had to grow with his, which is also
the only direction it may grow. Ratio 1.79x to **1.85x**, cap 2x, still asserted
at module load.

Satori has no `mask-image`, so the leftward fade is baked into the alpha channel
of `public/brand/alex-portrait-og.png` by `scripts/build-og-portrait.mjs`. Its
output is committed, the same arrangement `build-map-geometry.mjs` uses, so a
deploy never depends on a browser binary being present.

### Schema

`ImageSlot` gained a `source` field on the same terms a fact has one, plus two
refinements: a non-null `src` must carry a `source`, and must carry its pixel
width and height. A photograph is a claim about a person, so an unsourced one
cannot ship, and a slot with no dimensions cannot reserve its box.

---

## 4. What the auditors caught that a person would not have

Four real defects, all found by the new checks rather than by looking.

1. **The map card covered the copy at 1024.** `lg:left-[46%]` lands inside a
   38rem text column when the container is that narrow. The support paragraph and
   one CTA were occluded. Measured at **1.47:1**. It is anchored by its right
   edge now, so it cannot drift back over the copy as the container narrows.
2. **The hero attribution line at 4.44:1.** `text-dim/90` over the feathered
   edge. It is full `text-dim` now. Thinning a line K.S.A. 58-3086 wants readable
   to save a little visual weight was the wrong trade before it started failing.
3. **The same line again, at 3.94:1, for a different reason.** Its box had no
   `max-width`, so it ran the full width of the headline column and reached past
   the portrait's feathered edge even though the sentence inside it did not. A
   width that only holds while the copy stays short is not a guarantee.
4. **/about overflowed the page horizontally**, 1px at 390, 2px at 414, 10px at
   768. The portrait's bloom used a negative horizontal inset on an element that
   already bleeds left through the page gutter, so there was nothing left for it
   to bleed into on the right.

5. **`--portrait-bottom` was dead code.** The variable was declared in
   `globals.css` and never applied in the JSX, so a `bottom-0` utility quietly
   won and the frame ended 64px above the band's edge: he dissolved inside the
   band rather than running past it, which is the one thing the composition was
   supposed to do. The crop check found it by reporting the frame as 100 percent
   visible when it was meant to be clipped.

6. **Making the hero portrait eager made a phone download it twice.** Both
   treatments, the in-flow one and the absolutely positioned one, are always in
   the DOM with CSS hiding whichever is not in play. That is free while the
   images are lazy, because a `display: none` image never intersects and is
   never fetched. It stopped being free the moment the LCP element was made
   eager: the delivery check reported 76KB in two WebP requests at 1024 where it
   had been 43KB in one. The hidden treatment now declares `sizes: 0px` outside
   its own range, so the browser picks the smallest candidate in the srcset,
   about 1KB, and the total is back to 44KB.

**And one the auditors could not have caught, which is worth recording for the
same reason.** The /about portrait's clip was three fixed heights against a
frame whose height scales with its column. Between 640 and 1023, where that
column is the whole page, the visible fraction fell to 40 percent and **he was
cut off just below his eyes**. Nothing failed: no overflow, no contrast drop, no
console error. It took looking at 768px. The clip is an aspect ratio now, so the
cut lands in the same place on him at every width, and `checkPortraitCrop` in
`shots.mjs` asserts that the cut is below source y 1400 rather than trusting the
arithmetic. That check exists because of this defect and 768 is in its width list
permanently for the same reason.

---

## 5. Verification

### Auditors

| Suite | Result |
| --- | --- |
| `npm run audit:negative` (runs first) | **75 tests, 0 failures** |
| `npm run audit:content` | **pass.** 404 strings plus 27 service area facts, 0 failures, 1 ratio warning (`/contact`, 1.25:1, pre-existing and judged) |
| `npm run audit:contrast` | **pass.** 0 failures, now including the jacket and the hair |
| `npm run audit:rendered` | **pass.** 227 checks, 0 failures |
| `npm run audit:map-fit` | **pass** |
| `npm run audit:all` | **exit 0** |
| `npm test` | **36 tests, 0 failures** |
| `npm run build` | **clean** |
| `node scripts/shots.mjs` | **Chromium all pass. 1 failure: WebKit could not launch.** See section 7 |

No horizontal scroll at 320, 360, 390, 414, 768, 1024, 1280 or 1440, on all eight
routes. No console errors at any width. Every band reaches its revealed state
after a real scroll. Reduced motion: nothing animating, nothing hidden, all eight
routes.

### The portrait's own checks, in Chromium

**Contrast, sampled from the pixels the browser painted:**

| width | headline | support | attribution | gold accent phrase | gold CTA |
| --- | --- | --- | --- | --- | --- |
| 390 | 9.88:1 | 5.91:1 | 7.12:1 | 4.37:1 | 4.41:1 |
| 768 | 9.90:1 | 6.06:1 | 6.88:1 | 4.07:1 | 3.68:1 |
| 1024 | 8.83:1 | 6.09:1 | 9.21:1 | 4.97:1 | 5.36:1 |
| 1440 | 8.74:1 | 6.09:1 | 9.22:1 | 4.97:1 | 5.38:1 |

Floor is 4.5:1 for ink and 3:1 for gold against whatever is under it.

**Where he is cut, in the source photograph's own coordinates:**

| width | `/` | `/about` |
| --- | --- | --- |
| 390 | y 1548 (77% of frame) | y 1558 (78%) |
| 768 | y 1446 (72%) | y 1558 (78%) |
| 1024 | y 1946 (97%) | y 1558 (78%) |
| 1440 | y 1950 (97%) | y 1558 (78%) |

Floor is y 1400. His crown is at y 250 and his chin at roughly y 1150.

**What it costs a phone, and whether it moves the page:**

| width | transferred | format | rendered | CLS (webfont blocked) |
| --- | --- | --- | --- | --- |
| 390 | 32 KB | WebP | 326 x 434 | 0.0000 |
| 768 | 32 KB | WebP | 448 x 597 | 0.0000 |
| 1024 | 44 KB | WebP | 461 x 614 | 0.0000 |
| 1440 | 53 KB | WebP | 553 x 737 | 0.0000 |

Against a 4.9MB master that never leaves the server. The check also asserts the
`src` goes through `/_next/image` and that a `sizes` attribute exists, because a
wrong `sizes` is invisible on a fast connection and expensive on a phone.

### The cutout edge, at 1x and 2x

Inspected twice: on the source file at 2x, and again at 2x on the rendered page
against the real navy field. Individual hair strands survive with soft alpha,
there is no ring, and the champagne rim reads as separation rather than as a
glow. next/image served `w=750` at DPR 1 and `w=1920` at DPR 2 for a 553px frame
whose cover fit needs 737 source pixels, which is correct in both cases.

### Kansas advertising law, re-verified

The hero gained a large new element and the ratio is measured from computed
styles, so it was re-checked rather than assumed. Header **1.42x**, footer
**1.40x**, both measured live from the browser's own computed font sizes. The OG
card moved from 1.79x to **1.85x** by design, asserted at module load. Cap is 2x.
The brokerage name still appears twice in the hero region, in the header lockup
and in the attribution line, and the attribution's ink got **stronger** during
this pass rather than weaker.

### Fair housing, the null convention, reduced motion, dependencies

No new copy was written that describes a place or a person, so nothing new
entered the fair housing surface. The negative suite still proves all eight rule
sets can fail. Both image slots stay on the null convention and both compositions
are built to look finished with `src` back to null. Nothing new animates.
**Zero new dependencies, runtime or dev.**

---

## 6. Lighthouse

Lighthouse 12, mobile preset with its default throttling, run against
`next start` on this machine with Chrome launched by Lighthouse itself.

**A note on comparing these to the v1.1 numbers: do not, closely.** The previous
pass drove Lighthouse through a shared Playwright Chromium over a debugging
port; this one lets Lighthouse launch its own. Two runs of the same build under
those two arrangements differed by more than the portrait did, and an earlier
attempt this pass produced `/about` at 80 while the machine was busy and 93 while
it was quiet. Treat these as a set measured against each other, not against
v1.1's set.

| Route | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | LCP element |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 93 | 100 | 100 | 100 | 2.0 s | 2.9 s | 20 ms | 0.004 | **the portrait** |
| `/buy` | 93 | 100 | 100 | 100 | 1.8 s | 3.0 s | 10 ms | 0.013 | a paragraph |
| `/sell` | 96 | 100 | 100 | 100 | 1.8 s | 2.6 s | 40 ms | 0.003 | a paragraph |
| `/veterans` | 96 | 100 | 100 | 100 | 1.8 s | 2.6 s | 30 ms | 0.012 | a paragraph |
| `/investors` | 93 | 100 | 100 | 100 | 1.9 s | 3.0 s | 10 ms | 0.064 | a paragraph |
| `/areas` | 95 | 100 | 100 | 100 | 1.8 s | 2.8 s | 10 ms | 0.016 | a paragraph |
| `/about` | 96 | 100 | 100 | 100 | 1.7 s | 2.7 s | 10 ms | 0.014 | **the portrait** |
| `/contact` | **89** | 100 | 100 | 100 | 1.6 s | 3.6 s | 80 ms | 0 | a paragraph |

**Lowest score per category, and the route that produced it:**

- **Performance 89, `/contact`**, which carries no portrait at all. Its LCP is
  3.6s and its TBT 80ms, both the worst on the site, and neither has anything to
  do with this pass.
- Accessibility 100, every route.
- Best practices 100, every route.
- SEO 100, every route.

**The two routes that do carry a portrait score 93 and 96**, and the portrait is
the LCP element on both. That was the number this pass was most exposed on, since
a hero photograph is the classic LCP regression, and the answer is that it is not
one here: the derivative a phone fetches is 32KB of WebP and the frame reserves
its box from recorded dimensions, so there is nothing to wait for and nothing to
shift.

The CLS column is the font-swap shift described in section 8, not the portrait.
It is highest on `/investors` at 0.064, which has no portrait, and lowest on `/`
at 0.004, which has the largest one.


### The one thing the numbers changed about the code

The hero portrait was marked `fetchpriority="low"` and lazy, on the reasoning
that the headline is this page's LCP element and should stay that way. Lighthouse
disagrees: on the mobile preset the LCP element on `/` is that image, and it was
arriving lazily. **Lazy-loading the LCP element is unambiguously wrong** whatever
a single measurement says, so it is eager now.

Eager rather than `priority`, and the distinction is measurable rather than
theoretical. `priority` also injects a preload link, which on a throttled
connection competes with the render-blocking CSS and the font stylesheet.

/about's portrait carried `priority` at first, on the reasoning that it is
unambiguously that page's LCP element and above the fold. Measured back to back
on a quiet machine: **95 with `priority` (FCP 1.7s, LCP 2.9s) against 96 with
plain eager (FCP 1.7s, LCP 2.6s)**, and in a busy full-suite run the `priority`
version fell to 74 with a 4.1s first paint while every other route sat at 1.8s.
The whole gap was first paint queued behind a photograph. Both treatments on this
site are eager now and neither is preloaded.

---

## 7. WebKit, again, and what that leaves unverified

**WebKit still cannot be launched on this machine.** `webkit.launch()` dies with
`Bus error: 10`, exit code 138, before a page exists. Tried this pass:

- A **fresh forced re-download** of the browser (`npx playwright install --force
  webkit`, 78.4 MiB), in case the installed build was corrupt. Identical failure.
- `npx playwright install webkit` reports: *"You are using a frozen webkit
  browser which does not receive updates anymore on mac14-arm64. Please update to
  the latest version of your operating system to test up-to-date browsers."* This
  machine is macOS 14.3 (23D56) on arm64, Playwright 1.62.1, build
  `webkit_mac14_arm64_special-2251`. The build Playwright ships for this OS does
  not run on it.
- **Real Safari over `safaridriver`** as the fallback. The binary exists at
  `/System/Cryptexes/App/usr/bin/safaridriver`, but a session request returns
  nothing: driving Safari needs "Allow Remote Automation" enabled and
  `safaridriver --enable`, which requires an interactive administrator password
  this session does not have.

This is not something the site's code can fix and it is not something to claim
past. `shots.mjs` reports it as a hard failure rather than skipping it, which is
why the suite exits 1, and it is written to run cleanly wherever WebKit does
launch.

**What that leaves unverified in Safari, specific to this pass.** Most of this
site's traffic will be iOS Safari, so this list is the largest gap in the
verification and every item on it is a portrait-specific mechanism:

1. **`mask-image` on both fades.** The whole composition depends on it. Both the
   prefixed and unprefixed properties are declared, and the two masks are nested
   rather than composited precisely so that an engine without `mask-composite`
   cannot fail in the dangerous direction. That is a design decision made
   *because* WebKit could not be tested, not a substitute for testing it.
2. **`mask-repeat: no-repeat`.** Added after the repeat default put a hard cut
   down the /about portrait in Chromium. Whether WebKit's default matches is
   unverified.
3. **`aspect-ratio` with `object-fit: cover` on a square source.** The guarantee
   that the top of his head can never be cropped rests on the cover fit scaling
   to the box's height. Verified in Chromium at eight widths.
4. **`filter: drop-shadow` tracing the alpha channel** for the rim light, and
   the interaction between an ancestor's filter and a descendant's mask, which
   is what makes the rim follow his dissolved silhouette rather than outline a
   rectangle.
5. **`right: calc(50% - 50vw)`** for the full-bleed anchor, including whether
   WebKit's `50vw` includes the scrollbar.
6. **WebP with alpha from `next/image`.** Safari has supported it since 14, so
   this is very likely fine, but "very likely" is not "measured here".
7. **The contrast measurements themselves.** Every ratio in section 5 is
   Chromium's rasterisation of the composite. The arithmetic is engine
   independent; the pixels are not.

---

## 8. Unverified, stated as unverified

Everything from v1.1's section 6 that has not changed still stands. New or
changed this pass:

**The open graph cards have still not been seen in a real link preview.** They
were rendered, fetched as PNGs and inspected, and this pass added a contact sheet
that draws them at 180, 260 and 320px on both a light and a dark message ground,
which is the reduction an iMessage preview actually applies. That is a
simulation of the size, not a test of the medium. **Nobody has pasted the URL
into Messages**, because there is no way to do that from here, and the brief was
explicit that this has never been done. It still has not been. It needs a person
with a phone and takes about thirty seconds, and it is the single cheapest
remaining verification on this build.

**The photograph's provenance is recorded as supplied, not as confirmed.** The
`source` field says Alex supplied it in September 2026, which is what the brief
stated. The file's own metadata says it was produced in Canva, authored
`Garrett Von Flue`, with a brand tag of **`ICT Home Collective`**. That brand
name is not "At Home Wichita Real Estate", which is the brokerage this entire
site is legally required to name. It is almost certainly just the Canva workspace
the background removal was done in and nothing more, but it is a brokerage-shaped
string attached to an asset on a site with a Kansas advertising obligation, so it
is written down here rather than noticed later. Worth one question to Alex.

**The webfont layout shift is measured but not fixed.** 0.0149 at 1024 and the
same on `/buy`, which carries no portrait, so it is `font-display: swap` rather
than anything this pass added. The portrait's own contribution is zero, asserted
with the webfont blocked. Section 3 of the design notes has the two available
fixes and why neither was taken quietly at the end of a pass about a photograph.

**The rim light and the fades have never been seen on a real phone screen.**
Chromium at `deviceScaleFactor: 2` is not an OLED panel, and a low-alpha
champagne glow is exactly the kind of thing that can band on real hardware.

**Nothing about Lark, the lead sinks, the count-up or the testimonial band
changed**, so every unverified item v1.1 recorded about them is unchanged and
still true.

---

## 9. Still blocked on Alex

Unchanged from v1.1 except that **the photograph is no longer on the list**. In
the order that unblocks the most:

1. **Testimonials with permission on file**, including how much of each name he
   has permission to publish. Still the highest value thing he can send.
2. **His Kansas licence number, in writing.**
3. **Any verifiable figure about his business, with its source.** Four turns the
   numbers band on.
4. **The town facts.** Drive distance and honest drive time for all seven,
   typical housing era for all seven, one verifiable note per town if he has one,
   incorporation years for six, and a decision on Wichita's and Park City's
   school district rows.
5. **The buyer's guide and the VA checklist as actual documents.**
6. **Confirmation of the brokerage name, address and phone**, which are still
   published from the brokerage's own site and have never been confirmed by him,
   and now also a word about the `ICT Home Collective` tag in the photograph's
   metadata.
7. **A decision on the domain.** `alexcolonhomes.com` is purchased and not yet
   live. Not `athomewichita.com`.

### And the one that is not blocked on Alex

**The repository is public.** `README.md` says in its own deploy section to push
it private, and gives the reason. Unchanged from v1.1 and it should not survive
to cutover.

---

## 10. Files touched

**Added (3):** `public/brand/alex-portrait.png` (the master, 4.9MB, byte
identical to what Alex supplied), `public/brand/alex-portrait-og.png` (generated,
560x625, committed), `scripts/build-og-portrait.mjs` (its generator).

**Modified (11):** `components/{Hero,Headshot,Bands,ui,LineReveal}.tsx`,
`app/globals.css`, `content/{home,site}.json`, `lib/{schema,og,compliance-type}.ts`,
`scripts/{audit-contrast,shots}.mjs`, `README.md`, `DESIGN-NOTES.md`,
`docs/V11-REPORT.md`.

**Deliberately not touched:** the map geometry and its generator, the lead path,
the four interactive tools, the assistant, `compliance.narMembershipConfirmed`
(still `false`), and `package.json`. **Zero new dependencies, runtime or dev.**
