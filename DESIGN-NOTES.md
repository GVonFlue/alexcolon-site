# Design derivation and self critique

Written record for section 6 of the build doctrine. This is not documentation for
the client, it is the reasoning that produced the design, kept so the next person
to touch this build knows which decisions are load bearing.

---

## Which rung

**Rung 1, the client's references.** Alex gave no reference sites, but intake gave
axes, which is the thing worth extracting anyway:

> "Organized, thoughtful designs. Simple user interface. AI assistants. Prompts or
> info tabs."

and

> "I want visitors to call because the website answered some of their initial
> questions."

The axis is not "clean layout with a chatbot bolted on". The axis is **answer
first**. The site's argument is that you can find out what you need to know before
anyone asks you to commit to anything, and that this is unusual. Every structural
decision below follows from that.

Rung 2 was unavailable, there is no prior site. Rung 3, house style, was not
needed and is deliberately absent.

---

## The signature element

`components/ServiceAreaMap.tsx`. The seven towns Alex works, plotted from their
real latitude and longitude rather than arranged for looks.

It passes the test the doctrine sets: change the seven towns and the drawing
changes. A competitor with a different footprint gets a visibly different picture,
which is what makes it a signature rather than an ornament. It carries no
characterization of any place, only names and relative position, both of which are
facts.

The carrying cost calculator is the second distinctive element, and it exists
because of a constraint rather than in spite of one. See below.

---

## The AI design tells, checked explicitly

Stated in writing, as required.

**1. Cream `#F4F1EA` + high contrast serif + terracotta `#D97757`.**
This was the live risk. Alex's own cream is `#F7F4EE`, which sits close enough to
the tell that the palette alone could have landed there. Three deliberate moves
separate it:
- Navy `#172A3A` is the dominant structural color, not cream. Cream is the ground;
  navy carries the pick-your-door band, every conversion band and the footer, so
  the page reads navy-led rather than cream-led.
- The accent is muted gold `#B89A67`, not terracotta, and it appears only on the
  primary action.
- No serif anywhere. The display face is the same grotesque as the body, which is
  the single biggest departure from the tell.

**2. Near black background with one acid green or vermilion accent.**
Not applicable. Nothing in the palette is near black and nothing is saturated.

**3. Broadsheet layout, hairline rules, zero border radius, dense columns.**
Actively avoided. Generous vertical rhythm, one idea per band, 6px radius on
controls rather than zero, and a single column of prose at a 62ch measure rather
than dense columns.

**Also avoided:** the gradient-on-a-big-number hero stat, which was easy to resist
because there are no verified numbers to inflate. Numbered `01 / 02 / 03` markers
appear in exactly one place, the `steps` band, which is genuinely sequential, and
nowhere else. No decorative motion anywhere.

---

## The mandatory self critique

**Would I have produced this same design for any other Wichita real estate agent?**

The first pass, honestly, yes. Navy and cream with a gold accent, a hero, a
services grid and a testimonial row is what every agent site in this market looks
like, and the palette came from intake so it was not going to do the
differentiating on its own.

**What changed after that critique:**

1. **The numbers band was deleted rather than filled.** Alex has no verifiable
   figures. The template move is a strip reading "500+ Homes Sold, 15 Years
   Experience, 98% Satisfaction". Every one of those would have been invented. The
   band withholds itself, and the specificity that would have lived there moved to
   the one fact that is both true and unusual to state plainly: the seven named
   towns, in the eyebrow, above the fold.

2. **The proof band was left empty on every route.** No testimonial has permission
   on file. This is the weakest part of the site and it is weak honestly.

3. **The map replaced a photograph.** With no photography, the template answer is
   stock: a Wichita skyline, a keys-in-hand shot, a couple on a porch. Alex banned
   most of that by name and the doctrine bans the rest. So the visual anchor became
   a drawing of something true only about him.

4. **The loss aversion block became interactive.** The doctrine wants the cost of
   waiting stated as arithmetic. Every version of that sentence I could write
   needed a market figure I could not source. Making the visitor supply their own
   numbers solves it exactly: the arithmetic is real, nothing is invented, and it
   became a conversion surface and the "high tech" note intake asked for at the
   same time.

5. **The about page argues against itself.** It has a section headed "Who he is a
   poor fit for" because Alex said he wants to discourage people looking for an
   agent who tells them what they want to hear. No template ships that section.

**Where it is still generic:** the band rhythm and the card treatments are
conventional. That is a deliberate spend. The doctrine says a plain site that
catches every hand raised beats a beautiful one that catches nothing, and the
budget went to conversion completeness and to not lying.

---

## Typography

Inter for text, JetBrains Mono for eyebrows, labels and all figures.

The mono face is where "high tech" from intake actually lives, and it earns its
place functionally rather than decoratively: the carrying cost calculator needs
tabular figures so the total does not change width as the visitor types.

---

## Color discipline

One rule does most of the work: **gold is the primary action and nothing else.**

Gold as text on cream measures 2.46:1 and fails AA, which settles the question by
itself. The accent is therefore always a filled surface with navy on top, at
5.44:1. It appears nowhere decorative, including on the map, where the obvious
move would have been to mark Wichita in gold. Marking it navy keeps the accent
meaning exactly one thing everywhere on the site.

Interactive control borders sit at navy 55 percent, which measures 3.43:1
composited. The first pass used 35 percent, which measured 2.06:1 and failed
WCAG 1.4.11. `npm run audit:contrast` caught it.

---

## Motion

Restrained to the point of near absence. `prefers-reduced-motion` is honored in
CSS, and the two components that could have animated (the calculator total, the
mobile nav) render their final state immediately instead. The mobile menu toggles
with the `hidden` attribute rather than a height transition, so the DOM is correct
on first paint and no animation gates reaching the navigation.

---

# v2

Three defects and one structural problem, all found by looking at the deployed
site in a real browser rather than at the code. A green build catches none of
these.

## What was wrong

**The page used half its width.** At 1440px the hero headline stopped around 60
percent and everything to the right was empty, and every prose band did the same
thing. The 62 character measure was correct for reading and wrong for the page:
a single column in a void reads as unfinished rather than as restraint.

**The assistant's status line lied.** It rendered "ready" before any request,
because the component had no way to know it was offline until a visitor had
already asked a real question and waited. Somebody types something real and is
then told the thing is not connected. That is describing intended behavior as
completed behavior, in the one component built specifically not to do that.

**The sticky header was translucent.** At 95 percent opacity the band headings
underneath ghosted through it while scrolling, which reads as a rendering bug.

**The signature element was buried.** The map was six bands down, which is a
strange place for the only thing on the site that is true of no competitor.

## What changed

**A `Split` band layout.** Heading in its own column, content beside it. The
measure stays honest and the width has something to do. It collapses to one
column below the large breakpoint, where the heading simply sits above its
content as before.

**The map moved into the hero and became a door.** It fills the second column,
which fixes the emptiness and puts the distinctive thing in the fold at the same
time. Selecting a town carries that town into the contact form through a query
parameter, so the most characteristic element on the page is now a conversion
path rather than an ornament. Its CTA is secondary styled, because the hero
already spends the one primary this screenful gets.

The eyebrow used to list the seven towns. The map names all seven now, so the
eyebrow was duplication, and at 1440px it wrapped "Rose Hill" onto its own line.

**The town list moved into `content/site.json`, coordinates included.** The map
used to hold its own copy. Two lists of the same seven towns is one edit away
from disagreeing with itself.

**The status line probes on mount.** `GET /api/chat` returns one boolean about
our own configuration and nothing else. The component starts in a "checking"
state and never claims a readiness it has not verified.

**FAQ became native disclosure.** `details` and `summary`, so it is interactive
with no JavaScript at all, keyboard operable and screen reader labelled for
free, and the answers stay in the rendered HTML while collapsed so the copy
auditor and search engines both still see them.

## Four interactive tools, one per audience

| Route | Tool | The question it answers |
| --- | --- | --- |
| /buy | Affordability | What price does the payment I am comfortable with support |
| /sell | Net proceeds | What actually lands in my account after the sale |
| /veterans | Timeline builder | Which day does each thing have to happen by |
| /investors | Rental cash flow | What is left every month, including when it is negative |

**Every figure comes from the visitor.** No interest rate, no commission rate, no
days on market, no appreciation assumption is baked into any of them. That is
what makes them publishable for a client who has no verified numbers of his own:
the output is arithmetic rather than a claim, so nothing here can be wrong about
the market because nothing here says anything about the market.

Three consequences worth naming:

- The commission field on the net proceeds tool ships blank and says so. Quoting
  a rate would be both an unsourced market figure and a statement no agent
  should make on a web page.
- The VA timeline's stage durations start empty rather than at a plausible
  default. "A VA loan closes in thirty five days" has no source, and a schedule
  built on an invented duration is worse than no schedule when somebody has
  orders. With nothing entered it still answers the one question needing no
  assumption at all, which is how many days are left.
- The rental tool puts vacancy and maintenance in fields rather than footnotes,
  because leaving them out is exactly what turns a property that loses money
  every month into one that looks like it clears a few hundred. When the result
  is negative it renders in the semantic negative color at full size rather than
  being rounded into looking fine.

## One thing the audit caught that is worth recording

The rendered sweep failed `/sell` on the word "best", from the phrase "your best
estimate" in a tool's hint text. The content auditor could not have caught it:
that string lives in a component, not in `content/*.json`.

This is the argument for the rendered sweep being the authoritative one, and it
is the second time on this build that checking the render rather than the source
found something the source check structurally could not. The copy was changed.
The rule was not.

---

# v3

The build was correct, honest, and passing every audit, and it was visually
flat. The brief for this pass was explicit about the difference: make it feel
alive without breaking a single thing that makes it honest. That is a
technique problem, not a content problem, so the work was to study two other
ProyTech sites (gvonflue.vercel.app, getproytech.com), extract the axis rather
than the look, and translate it into Alex's own navy, cream and gold system.

## What was taken, and why none of it cost anything

**Pill eyebrows, a pill nav, and a fuller button radius.** Purely typographic
and geometric. Nothing here touches a fact, a claim, or a color rule.

**More light-to-dark swings.** The page ran several cream bands together and
read as one long scroll. Section now has a real tone rotation (cream, paper,
wash) for bands with no fixed reason to be light or dark, and the two bands
that are deliberately dark, pickYourDoor and the conversion moment, stay
fixed so they keep reading as landmarks instead of blending into a pattern.

**Gradient washes instead of flat fills.** `wash` moves between the
already-verified cream and paper tokens, so every contrast pairing proven at
either end holds everywhere in between. `navyWash` moves from navy to a new,
darker navy-deep, which only ever raises contrast for the light text painted
on it. Neither introduces risk; both were still added to
scripts/audit-contrast.mjs, because a new hex value gets checked regardless
of how confident the math looks on paper.

**One accent word in the display type.** The references use color in
headlines freely. This site's whole color discipline is "gold is a fill,
never type," stated in section 6 of the doctrine and enforced by
audit-contrast.mjs's FORBIDDEN list. Taking this technique meant not
breaking that rule, so it became a new, separately verified token
(`--color-gold-ink`, 5.17:1 on cream, 5.67:1 on paper) used for exactly one
phrase on one headline, driven by an optional `accentPhrase` field rather
than hardcoded, so a phrase that does not literally occur in the headline
renders the headline plain instead of silently eating text.

**The hero's second column as a real object.** A rounded, shadowed, slightly
rotated card holding the map, instead of the map floating directly on the
page background. Depth, not a new fact.

**The assistant as a character.** An avatar, its own earned status dot, and a
chip row naming what it does. The avatar is deliberately not a mascot: three
concentric arcs, no face, nothing anthropomorphic. Scout works in the
reference because it is Garrett's decision to make about his own product.
Inventing a character for Alex is a brand decision, and it is his, not this
build's.

**A marquee of the four audience lanes.** Built from the exact array
pickYourDoor already renders, so it is a second *view* of one list, not a
second list. Static and centered on every first paint; only after mount does
it check `prefers-reduced-motion`, and only then does it double the track and
start the loop.

## What was not taken, and what it would have broken

**The avatar stack claiming "120+ families guided home."** Alex has no
verified numbers and no testimonials on file. This was the single biggest
trap in the references: both sinks (the numbers band, every proof band) are
designed to withhold themselves for exactly this reason, and copying the
component would have meant inventing both a statistic and social proof to
put inside it.

**The floating cards showing a pipeline value and a lead list.** Mock data
presented in a chrome that implies it is live. Alex's actual equivalent is
real: the four interactive tools. Those got the card depth and the shadow
instead, because they compute something true from whatever the visitor
enters rather than displaying a number nobody can verify.

**The warm-cream-and-terracotta palette.** This is AI design tell number one
in section 6 of the doctrine, close to verbatim. It is earned on ProyTech's
own site by a real logo and real product screenshots. Alex has neither, so
the site stays navy-led with gold as the one accent, same as v1.

**A splash gate, and the word Realtor.** Neither reference technique
survives contact with Alex's own intake ("simple interface") or with hard
stop 4 (NAR membership is not confirmed, and the auditor fails the build on
the word regardless of what any reference site does).

## The mandatory self critique

**Does it read as designed now, or just as decorated?** Designed, with one
place that is still closer to decorated than the rest: the pick-your-door
cards' shadow is nearly invisible against the dark navyWash ground, because a
dark shadow on a dark background does very little. It is not wrong, and nothing
fails because of it, but if this gets another pass, that shadow should become
a faint light-side highlight (a top inner border at low opacity) rather than
a black-based box-shadow, which is the technique that actually reads as depth
on a dark card.

**What is still flat.** The routes without a `feature` on their hero
(`/buy`, `/sell`, `/veterans`, `/investors`) still show an empty second
column at the width where the featured homepage hero now shows a map. That
match the brief exactly as written, Split was scoped to prose, steps,
lossAversion, faq, areaMap and tool, not hero, and only the homepage hero
was asked to carry the map, so this is not a missed instruction. It is a
genuine asymmetry a future pass could close, most likely by giving each of
those heroes a small, real, page-specific object (the net proceeds number
line, a compact version of the tool itself) rather than reusing the map
everywhere it does not belong.

**Would this same pass have happened for any other agent using these same
two references?** The rotation, the pills, the glyphs and the gradients,
yes, that part is a technique lift and would look similar on any build using
this component system. What is specific to Alex is everything the pass
refused to copy: no invented number, no invented testimonial, no invented
character, and an accent color used exactly once, on a phrase that describes
what this specific site promises (real answers) rather than as a repeatable
decorative habit.

---

# v4

v3 added the vocabulary of a designed site, pills, one accent phrase, a
gradient tone, an arrow glyph, without changing the actual ratio underneath
it: the site was still about 85 percent cream, and the accent phrase read
muddy because gold-ink is a compromise color that only exists because gold
itself fails on a light ground. Put side by side with gvonflue.vercel.app,
the difference was not technique, it was commitment. The reference is
dark-first. This build was light-first with dark accents.

## The central fix

Inverted it. Navy is now the dominant ground: the hero on every route, the
steps band, trust, areaMap, pickYourDoor, the assistant, conversion and
closingCta. Cream is what is left, and it is reserved for bands with an
actual reason to need a light ground: the two calculators, the four tools,
faq, and the currently-empty proof band. That is not an aesthetic split, it
is a fields split, checked once and then followed everywhere.

The direct consequence: the one accent phrase per page is real gold now, not
gold-ink. Gold as text clears 5.44:1 on navy and only 2.46:1 on cream, which
is the entire reason gold-ink existed at all in v3. Removing the reason to
need a compromise color was better than shipping a better compromise color.

Dark sections paint a radial glow (navy-glow at the top, fading through navy
to navy-deep) rather than a flat fill, the same technique the reference's
own dark sections use. navy-glow is a new, real color, not just a lighter
opacity trick, and it is verified in scripts/audit-contrast.mjs against
cream, dim and gold before it was used anywhere, because a headline can land
right at the glow's brightest point, not only at the gradient's darker
edges.

## What else changed

**Type got heavier and bigger.** Display weight moved from 600 to 800
(band headings) and 900 (the hero h1). Tracking tightened to -0.03em
everywhere display type is used, -0.04em on the hero specifically, with
line-height down to 0.98 there. The hero h1 is roughly 20 to 30 percent larger
in raw size, and reads considerably heavier than that number suggests
because weight and tracking both changed with it. It is not sized to match
the reference's exact scale: their headline is four words, this site's is a
full sentence, and matching their point size line for line would have
pushed the primary CTA below a normal laptop viewport. Sized instead to the
tallest headline this site actually has, checked against the shortest
common viewport height, not against a screenshot.

**The map got redrawn, not patched.** It was flagged as the worst element on
the site and it earned that: grey dots floating in the middle of a mostly
empty white card, no relationship to the palette at all. It now lives on
the dark ground with cream marks, a real soft halo behind the anchor and
the selected town, tightened padding so the drawing fills its card, and a
selected state that changes four things at once (glow, ring, dot size,
label weight) rather than one. No gold anywhere in it, including the
selected state: that would have spent the one signal the palette has on
decoration.

**Real elevation, not a thicker border.** Cards (the assistant, the lead
form, every tool frame, the pick-your-door lanes) now carry a layered
shadow, a light inset top edge plus a soft ambient shadow, rather than one
flat drop shadow. pick-your-door's lanes sit on navy-glow specifically, a
genuine lighter value than the section around them, not a translucent tint
of the same color.

**The assistant got bigger, not just darker.** It was the thing Alex
specifically asked for at intake and it was reading as the least
considered part of the page. Larger mark, larger name at extrabold weight,
more padding, a real shadow. The card itself stays a light surface on
purpose: there is an input field at the bottom of it, inputs need a light
ground the same reason a tool's fields do, and a card that is dark on top
and light on the bottom would read as two things stapled together rather
than one.

**Density.** Section's default padding dropped from py-16/20/24 to
py-11/14/16. There was enough space between some bands to fit another one
in it, and premium is not the same as empty.

**One entrance, on the hero only.** A CSS keyframe, no JavaScript state,
staggered slightly between the text column and the map column. Reduced
motion is caught by the same blanket transition killer that already
handles every other animation on the site, so this needed no reduced-motion
branch of its own. Nothing else on the page animates on scroll.

## The mandatory self critique

**Does the fold command attention the way the reference does?** Closer than
it did, not equal to it, and the honest reason is the same one from the
typography section: the reference's headline is a four word brand line and
this site's is a full, specific sentence, because the site's whole voice is
answer-first plain language rather than a tagline. A four-word version of
this headline would be a generic real estate tagline, which is a worse
trade than a slightly less dominant fold. What the fold does now that it
did not before: real depth (the glow, the map's own halo), real weight, and
a color that is actually the brand color instead of a darkened stand-in
for it.

**Is it designed now, or decorated differently?** Designed. The test that
matters is whether the dark ground changed anything besides color, and it
did: the map's whole drawing logic changed, the card elevation model
changed, the type scale and weight changed, and the padding rhythm changed
site-wide. A decorated pass would have painted the existing layout navy and
called it done.

**What is the single worst-looking element remaining?** The pick-your-door
cards' elevation reads correctly up close but the four cards are visually
closer to each other in weight than the hero and the map are to everything
around them; on a fast scroll they read as a solid navy block before the
individual doors resolve. A future pass could differentiate the four lanes
further (an icon per lane, not just a label) the way each of the four tools
already has a distinct shape, rather than four identically-structured
cards. Not fixed here because that is closer to a features change than a
visual design one, and this pass's brief was explicit about which one this
was.

---

# Between v4 and v5

Three things landed here that never got written up: the map was rebuilt
from real US Census TIGER/Line geometry instead of the seven-dots-and-
spider-lines diagram v4 had only restyled, the sticky header moved from a
flat cream bar (which sat as a hard seam across the top of every now-dark
page) to translucent navy with a blur, and the assistant's interior went
from three stacked bordered boxes, the visual grammar of a form, to one
recessed transcript well, free-floating chips and a pill composer. All
three are the foundation this pass's own map and assistant work builds on.

# v5

The brief for this pass was explicit that the palette, the type and the
dark inversion already work: this is about motion, the map, and the
interior pages carrying their own weight, not another palette pass.

## The map, again

Two previous prompts asked for real geometry and both times it got
restyled instead of rebuilt. That part was actually already fixed between
v4 and this pass (see above); what this pass added on top of the real
geometry is a flat, two-tone downtown skyline and the Keeper of the
Plains anchored on the actual river confluence, a five-phase orchestrated
entrance (rivers, then highways, then the boundary and skyline, then the
towns, under a second, once), a flat uniform fill on the municipal
boundary alongside its stroke, and hover states that lift the dot,
strengthen the label and fade the halo in rather than only reacting to a
click.

The confluence is computed, not eyeballed: `findConfluence` in
scripts/build-map-geometry.mjs takes the closest pair of vertices between
the Arkansas and Little Arkansas AREAWATER polygons and exports the
midpoint as `CONFLUENCE`. It came out to lon -97.34813, lat 37.69113,
within hundredths of a degree of where the actual sculpture sits. That is
not a coincidence worth taking credit for; it is what happens when the
method (real polygon data, not memory) is right.

## The assistant, rebuilt to the reference's own format

The reference presents Scout as a centered column with the section's own
header above it and the capability chips above the card, not a full width
band with the avatar stranded on the left. It now matches that shape:
eyebrow, a heading that highlights its own name the same way a hero's
accentPhrase highlights a word, one line of intro, the capability chips
centered above a card that is itself constrained to roughly 672px rather
than the full band. The card gained a proper header bar (avatar, name,
the site it belongs to, the status dot) divided from the transcript by a
real rule. The honest status behavior, checking on mount, never claiming
a readiness it has not verified, did not change, because it did not need
to.

## Motion: one pattern, applied once, and the bug it caught

Section reveals on scroll now, added in exactly one place, `Section`
itself in ui.tsx, via a new `Reveal` component, rather than at each of the
dozen or so call sites that render one. That is what "one pattern used
consistently" actually requires: not a rule anyone has to remember to
follow, a place where following it is the only option.

It also produced this pass's one real bug, caught by this project's own
verification step rather than by inspection. shots.mjs takes a full-page
screenshot of the homepage, and that capture does not reliably fire the
IntersectionObserver a scroll-triggered reveal depends on: every band
below the hero rendered at opacity 0 in the screenshot, which is exactly
the "no animation may gate usability" failure the component's own doctrine
forbids, just discovered by tooling instead of by a human missing it. The
fix is a 60ms timed fallback: a hidden section reveals on its own if
nothing has intersected by then, far below what any real screenshot,
crawl, or print takes to run. The same root cause, animation-delay
surviving a reduced-motion override that only zeroed animation-duration,
also affected the hero's own five-element stagger and got the same class
of fix in globals.css. Both are described in more detail in the commits
that made them; they are called out here because "did the verification
catch anything" is a fair question and the honest answer is yes, once,
and this is what it caught.

The hero's own stagger went from two blocks (the text column, then the
map) to five (eyebrow, headline, support, CTAs, map), still under a
second, still plays once on load. Split's dead space (a heading column
with nothing under it once the body column ran longer, ~200px of it on
/buy) got a vertical rule filling the column instead of invented filler
copy, the doctrine's own suggested fix. The four tools' result figure
eases toward a changed value instead of just swapping text, skipped
entirely for the very first value a tool ever shows and for anyone with
reduced motion set.

## Interior pages carrying their own weight

Every interior route had exactly one form, far down the page, and the
assistant existed nowhere but the homepage. It is on buy, sell, veterans,
investors and areas now, with different intro copy on each one, and a new
compact contactStrip band sits mid-page on the same five routes: a
tappable phone, a text link, one line of copy, deliberately not a third
form. The per-route audit against the doctrine's own checklist is in the
delivery notes for this pass rather than repeated here.

## The mandatory self critique

**Does the map read as Wichita to someone who lives there?** Closer than
it has, and the honest weak point is the skyline: at the sizes this map
actually renders (a compact hero card, or the larger /areas rendering) the
building cluster and the Keeper of the Plains are legible on a deliberate
zoom-in but read as texture, not a recognizable skyline, at normal viewing
size. That is mostly the tradeoff the brief itself asked for ("if it
starts looking like a stock city illustration, cut it, the river matters
more than the buildings") rather than an execution miss, but it means the
landmark is closer to a rumor than a feature right now.

**Is the motion orchestrated or scattered?** Orchestrated, and the count
is small on purpose: one hero stagger (five elements, one sequence), one
map entrance (four phases, one sequence), one scroll-reveal pattern
applied at the section level everywhere, real hover states on the map
marks and the pick-your-door lanes (unchanged this pass; they already did
this), and the tools' result figure. Nothing fades up per card, per list
item, or per heading, the exact scattered pattern this pass named as an
AI design tell.

**What is the single worst-looking thing left on the site?** The routes
without a `feature` on their hero (/buy, /sell, /veterans, /investors)
still show an empty second column at the width where the homepage hero
shows the map, the same gap v4's own self-critique named and did not
close, because giving each of those heroes a real, page-specific object
(the net proceeds line, a compact tool) is a features change this pass's
brief did not ask for either. It is the most visible remaining hole on
four of seven interior routes and the most honest answer to "what is
still wrong."

---

# v6

Three items carried over from the last report: verify WebKit rather than
citing its reputation, stop guessing the map's padding, and write down the
motion system instead of trimming it to fit a number.

## WebKit, tested rather than reasoned about

scripts/shots.mjs now runs every check, overflow at all five widths,
console errors, screenshots, and a new dedicated map hover/select
exercise, in both Chromium and WebKit, with screenshots split into
`audit-output/chromium/` and `audit-output/webkit/` so the two are
comparable file for file. This is permanent, not a one-off: it is what
`node scripts/shots.mjs` runs from now on.

**WebKit itself could not be exercised in this session's environment**,
and that needs to be said plainly rather than folded into a "tests
passed" summary. `playwright.webkit.launch()` succeeds, but
`browser.newContext().newPage()` hangs indefinitely, every time, with the
sandbox both on and explicitly off, confirmed with Playwright's own debug
tracing pinpointing the exact call that never returns. The system's real
Safari (17.4, installed) was the fallback plan, driven directly over
WebDriver via `safaridriver`, but that requires enabling Safari's "Allow
Remote Automation" first, which itself requires an interactive
administrator password this session does not have. Both are environment
limitations of this machine or its sandbox, not something fixable by
changing the site's code, and not something to claim past. scripts/shots.mjs
is written to run cleanly wherever WebKit actually launches (a real
Safari or a developer machine, for instance) and to report a hard,
visible failure rather than a silent skip when it cannot, which is what
happened here: it exits 1 and says exactly which engine and why.

**What did get verified in Chromium**, specifically to de-risk the parts
of this that were WebKit-shaped concerns even without a second engine to
compare against:

- The map's hover mechanism was rewritten off `transform-box: fill-box`
  entirely (see below), the change the brief asked for if fill-box
  misbehaved, done regardless of not being able to confirm the WebKit
  side, because the replacement is strictly more portable either way and
  the fill-box reference-box question this was worried about is real and
  documented independent of what this session could reproduce.
- Building that replacement surfaced two real, reproducible bugs, caught
  by testing the actual computed styles rather than by reading the JSX
  and assuming it would work:
  1. A hand-written `.group:hover .mark-scale` selector in globals.css
     compiled, through Tailwind v4's build, into a bare `.mark-scale`
     with the `.group:hover` condition silently dropped, permanently
     scaling every mark up regardless of hover state. Tailwind appears to
     specially process selectors built on its own `.group` marker class;
     writing raw CSS against that same class collided with it. Fixed by
     letting Tailwind's own `group-hover:` variant own the selector
     (`group-hover:[--ms:1.1]`, an arbitrary-property utility) instead of
     hand-writing one against `.group`.
  2. `--mx`/`--my` custom properties were set to bare unitless numbers
     (`"704.99"`), and substituting a bare number into `translate()` via
     `var()` computed the whole `transform` property to `none`: an
     unquoted number is not a valid CSS `<length>`, and that invalidity
     does not get the same "SVG content may use unitless numbers" leniency
     a literal token written directly in the transform function gets.
     Fixed by giving the custom properties an explicit `px` unit, which on
     SVG content maps 1:1 to the same user-space units p.x/p.y already
     are.

  Neither of these is a WebKit bug. Both are the kind of thing "verify by
  testing, not by reasoning" is supposed to catch, and did.

## The map mark hover mechanism, rebuilt

`transform-box: fill-box` plus `transform-origin: center` asked the
engine to compute the mark's own geometric bounding box and scale around
its center. That computation has a real cross-engine history of
resolving to the wrong reference box (the nearest SVG viewport instead of
the element), which would show up as a hover throwing the mark toward the
corner of the map rather than lifting it in place.

Replaced with `.mark-scale` in globals.css: `--mx`/`--my` carry the
mark's own coordinates (in px, see the bug above), and
`translate(mx,my) scale(var(--ms,1)) translate(-mx,-my)` is the plain
matrix for "scale by a factor around the point (mx,my)", arithmetic on
numbers already known at render time rather than a reference box the
browser has to compute. `--ms` itself toggles between 1 and 1.1 through
Tailwind's own `group-hover:`/`group-focus-visible:` variants, so the
existing group/hover/transition wiring didn't need to change, just what
it is driving.

Confirmed in Chromium with a real measurement, not a screenshot glance:
hovering a non-anchor mark moves its center by 0.00px while it grows by
exactly the expected 1.1x, and selecting it still sets `aria-pressed` and
surfaces the "Ask Alex about X" CTA. This exact check now runs on every
`node scripts/shots.mjs`, in both engines, and is reported as a named
failure (not folded into a generic screenshot pass) if it ever
regresses.

## The map's padding, measured instead of guessed

The 60/30/45/45 padding from last pass was tuned by eye to fit the seven
names actually in content/site.json today, which is exactly the kind of
number that stops being true the day a client renames a town or adds an
eighth one, since content/site.json is a file they edit directly and the
map's viewBox is generated once and does not know a town list changed
until someone re-runs scripts/build-map-geometry.mjs by hand.

scripts/map-label-metrics.mjs now estimates each town's actual worst-case
label reach from its name length, its worst-case font size (the anchor
town's own fixed size, or the "selected" size any other town can reach
the moment it is clicked), and a deliberately generous 0.6em-per-character
advance width, no DOM, no canvas, no measurement pass that could shift
first paint. scripts/build-map-geometry.mjs pads the view by the largest
reach any current town actually needs (it came out to 964x566 for today's
seven, up from the hand-tuned 762x572, because "Rose Hill" and "Park
City" both need more room than 45 units gave them).

The important half of this is the permanent check, not the one-time
calculation: scripts/audit-map-fit.mjs (now part of `npm run audit:all`)
independently recomputes every current town's label extent against
whatever viewBox is currently baked into lib/generated/wichitaMap.ts and
fails if any of them no longer fit, which is exactly the scenario a fixed
padding could not catch. Proven able to actually fail, not just report
green: the negative test suite (scripts/audit-negative.mjs) injects a
32-character fake town name at Rose Hill's own coordinates, the town that
already needed the most room, and confirms the check flags it by name
before confirming the real seven still pass.

## The motion system, named

Seven distinct patterns survive this pass, and the brief for this round
was explicit that seven deliberate ones is not the "scattered" failure
mode the doctrine warns about, that ceiling was a heuristic against
fade-ups sprinkled on every card, heading and list item, not a hard cap,
and cutting the tool easing to satisfy a number would have made the
product slightly worse for nobody's benefit. Consolidated to a named set
so "is this orchestrated" is answerable by reading a list instead of
counting call sites:

1. **Load entrance.** One sequence, once, on page load: the hero's five
   elements (eyebrow, headline, support, CTAs, map) via `.hero-in`, and
   the map's own four layers (rivers, highways, boundary+skyline, towns)
   via `.map-in`, both plain CSS keyframes with staggered
   `animation-delay`, no JS state driving either.
2. **Section reveal.** One IntersectionObserver-backed pattern
   (`Reveal.tsx`), applied at the section level only, every `Section`
   gets it automatically and no individual card, heading or list item
   carries its own.
3. **Interactive surfaces respond on hover.** Buttons, the pick-your-door
   lanes, and the map's town marks all lift, brighten, or shift on
   hover/focus. Three different surfaces, one rule: a hovered or focused
   interactive element visibly acknowledges it, immediately, with no
   scroll or load choreography attached. This is the one place last
   pass's report counted three separate near-identical entries where one
   name covers all of them; the behavior did not change, the description
   did.
4. **Marquee.** A continuous, decorative ticker of the same four audience
   lanes pickYourDoor already lists. The one loop on the site, and it is
   allowed to be one: it is texture, not an entrance, and was never in
   scope for "not a loop."
5. **Tool result easing.** The big figure in all four interactive tools
   eases toward a changed value (`fields.tsx`, shared by all four, not
   duplicated per tool). Skipped on the very first value a tool ever
   shows and under reduced motion, both inside the same hook, so it is
   never the reason a number is wrong on first paint.

Reduced motion is honored the same two ways everywhere in this list: the
JS-driven pieces (Reveal, the tool easing) check
`prefers-reduced-motion` directly, and globals.css's blanket query
zeroes `animation-duration`, `animation-delay`, `transition-duration` and
`transition-delay` site-wide as an independent second line of defense,
which is what actually catches the CSS-only pieces (1 and 3) without
either of them needing a reduced-motion branch of their own.

## Deferred: the hero map card on very tall, narrow viewports

Not touched this pass, staying on the list rather than being fixed
quietly or silently dropped. On a very tall, narrow viewport (a phone in
portrait with an unusually generous height, or a browser window resized
tall and thin) the hero's map card sizes itself from the map's own
aspect ratio and the column width, not from the available vertical space,
so it can end up visually small relative to how much vertical room the
fold actually has, floating rather than filling. The fix is almost
certainly a `max-height` tied to the viewport (something like a `dvh`
clamp on the card) with the map's own `h-auto w-full` still driving the
common case, rather than anything about the map's data or drawing; not
done here because it needs real testing across actual tall-narrow
viewports to get the clamp right rather than a guessed value, the same
discipline this pass's other two fixes were about.

---

# v1.1

The brief for this pass was to make a correct site feel world class rather than
correct-but-plain, and to wire the integrations. It arrived describing a v1.1
build; the repo was at v6, so several of its premises were already fixed (the
map was not inert, a reveal primitive existed, motion was a named system) and
several were exactly as described (SITE_ORIGIN fell back to localhost,
`twitter:card` was `summary` with no image on every route, the assistant still
carried its old name, there was no numbers band and no hero variation). The
pass was run
against the brief as the target state, not against its description of the
starting one.

## The three live defects, first

**Canonicals pointed at localhost.** `SITE_ORIGIN` was unset in production and
every route emitted `canonical: http://localhost:3000` while meta robots said
index, follow. `lib/origin.ts` now resolves SITE_ORIGIN, then the Vercel
production domain, then `VERCEL_URL`, then localhost, and it is loud about it:
a banner in the build log when it has to fall back on Vercel, and a thrown
error when nothing resolves there at all. The brief asked for `VERCEL_URL` as
the fallback; the project's stable production domain sits above it because
`VERCEL_URL` carries a build hash and changes every deploy, so using it for a
canonical would emit a different one on every push.

**A preview could be indexed.** noindex is host-conditional now. It is off on
every production deployment, including one with SITE_ORIGIN still unset, and
off entirely away from Vercel, so the only host that disallows itself is a
preview or development deployment. That narrowness is the point: app/robots.ts
already warned, correctly, that a leftover noindex launching a site invisible
to Google is the worse of the two failures, and this must never become that.

**Every link preview was a bare line of text.** `twitter:card` was `summary`
with no image anywhere. Alex's primary action is a text message, and a text
message renders a link preview, so for most people the card is literally the
first thing they will ever see of this site. There is a generated card now, at
1200x630, plus per-route variants for the four audience routes. It carries his
name, the brokerage, the seven towns and Lark, and no claim of any kind,
because there is no verified claim to make.

## Where the depth came from, and the number that constrained all of it

No new hue. The navy became a real ramp (deep, base, glow, lift) and gold gained
low-alpha hairlines and a pale champagne tint for dark gradient stops. Full
strength `#B89A67` is still the primary action and nothing else, with one
recorded exception: Lark's breast.

`navy-lift` is the brief's own `#22475E` and it needed a rule attached rather
than just adopting it. Gold as text on it measures 3.69:1, which fails AA, so
it is a raised card surface only and never the ground under the one gold accent
phrase a page carries. `audit-contrast.mjs` holds gold-on-navy-lift in its
FORBIDDEN list so a future edit cannot reintroduce it quietly.

That number then constrained the whole layered-gradient idea, and the auditor
is what found it. The first version of the dark field put the two decorative
washes on top of a base that already peaked at `navy-glow`, and the build
failed: the accent phrase measured 4.03:1 where the champagne bloom overlapped
the brightest point. `navy-glow` had already been chosen in v4 as the brightest
ground gold tolerates at all, so there was no headroom above it, and no
combination of the two decorative alphas cleared 4.5. The fix was to lower the
base rather than dim the decoration: the base tops out at flat navy and the
decorative lift raises it back toward the same ceiling instead of past it. The
brightest composited ground any text can land on is `#203646`, gold measures
4.68:1 on it, and that exact composite is now a checked pair rather than an
argument in a comment.

Depth otherwise comes from four things, none of which is a colour: grain at 5
percent on dark surfaces, warm navy-tinted elevation on cream instead of grey
shadow, a light top edge instead of a black shadow on dark cards, and the
geometry motif.

**The geometry motif is the piece worth keeping.** Dark bands carry the real
rivers, highways and city limit the map is drawn from, at three to five
percent. It costs nothing, because the paths are already in the bundle, and it
is the cheapest thing on this build that makes the page read as being about
this city rather than as a clean template that could belong to any agent
anywhere. The test is that removing it should make a band look flatter without
anyone being able to say what was taken away.

## Typography

Archivo for display, Inter kept for text, JetBrains Mono kept for figures.

Up to v6 the honest description of every heading here was "the body face set
larger", which v3 had recorded as a deliberate departure from the
cream-plus-serif-revival tell and which had quietly become the reason the fold
read as competent rather than designed. Inter is an excellent text face and a
characterless display one: at 900 weight and -0.04em it goes soft and generic.
Archivo is a grotesque with squared terminals, narrower apertures and a
genuinely different rhythm, so the headings change voice without touching the
body copy that has to stay quiet.

It keeps both constraints the choice sits inside. It is not a serif, so the
tell named in section 6 is still avoided, and it is not a geometric sans, so
the headings are not the circles and straight lines every AI-built site reaches
for. Tracking now scales with size (-0.025em generally, -0.04em on the hero)
rather than one flat value, because -0.04em on a 1.9rem H2 reads as a printing
fault. Full fallback stack, so the page is correct before the webfont arrives
and correct if it never does.

## The reveal primitive, and the bug hiding inside the previous fix

v5 added a scroll reveal and then, correctly, caught its own bug: a full-page
screenshot does not fire an IntersectionObserver, so every band below the fold
captured at opacity 0. The fix was a 60ms timer that revealed a hidden section
whether or not it had ever intersected.

That fixed the screenshot by removing the feature. Sixty milliseconds after
mount, every section on the page was revealed, so the reveal only ever played
for bands already within a screen of the fold and was dead code on every long
route. Nothing failed, which is why it survived a pass.

The timer is gone. What remains are four guards that are conditions rather than
clocks: reduced motion, no IntersectionObserver, a document too short to
scroll, and `beforeprint`. The screenshot problem was moved to where it
belonged, which is the tool: `shots.mjs` scrolls the page the way a person does
before it captures, and asserts afterwards that no band is still hidden. Making
that work required forcing instant scrolling in the harness, because
`scroll-behavior: smooth` turns every `scrollTo` into an animation and a loop
of them fights itself.

## The map, and the constraint that placed Lark

The map already had real geometry and real hover states. What it did not have
was anything to say: the copy under it promised "select a town to ask Alex
something specific about it" and selecting one produced a link.

Each town now carries a closed set of eight facts, closed in the schema as well
as in the component, so there is no field that could hold a characterization
even if someone wanted to add one. Twenty-seven of the fifty-six fields carry a
verified value with its source; twenty-nine are null with a pending note naming
who supplies them. Nothing was filled in from memory, and two of the nulls are
worth naming as method rather than as gaps: Maize's incorporation year is
withheld because the city's own site and other accounts contradict each other,
and Wichita's and Park City's school districts are withheld because addresses
inside both fall into more than one district, so a single name published
against either would be wrong for a real number of houses.

Hover, keyboard focus and tap all open the same panel, which took two pieces of
state rather than one: an unlocked panel follows the pointer and the focus
ring, a locked one was opened deliberately and stays. Without the lock, a tap
on a device that also synthesises a mouseleave opens the panel and immediately
shuts it.

**Lark's position on the map is a constraint, not a composition choice**, and
it is the honest answer to "why is the bird off to one side". Every town's
label sits directly above its dot, and the viewBox is padded to exactly the
label extent the current seven towns need: Derby has 26 units of clearance
below its dot and Park City six above its label. There is no room in any
direction to grow that envelope without regenerating the geometry from the
TIGER shapefiles. So Lark stands in the one gap that already exists, below the
label's descenders and inside the bottom allowance already reserved for the dot
and its halo, and `audit-map-fit` stays green without its formula changing.

## Lark

A western meadowlark: Kansas state bird, gold breast over a warm brown back
that is Alex's own two colours mixed rather than a new hue. It is a bird, which
is the rule that matters, since the README's own constraint is that the
assistant can never be mistaken for Alex. It also avoids every cliche Alex
named at intake, since there is no key, no door and no handshake anywhere in it.

The one full-strength use of gold on this site that is not a call to action.
Recorded rather than quietly taken: the palette rule is that gold means "act
here", and a gold-breasted bird spends a little of that signal. It is accepted
because the breast is the identifying feature of the species, a champagne tint
reads as a sparrow, and the mark never appears in a button-shaped surface.

The state that earns its keep is "not connected". With no API key the widget
used to sit on "checking" forever and a visitor had no way to tell it was
simply unconfigured rather than slow. Lark perches, stops moving and dims, the
composer and chips are disabled rather than accepting a question nobody will
answer, and the copy says so in plain words with the phone number. That state
is server rendered now: the component still never claims a readiness it has not
verified, but "checking" was the wrong default, because the server knows the
answer at render time and withholding it meant the honest copy existed only in
client-rendered HTML. A test caught that.

## The mandatory self critique

**Is the depth designed, or is it three effects stacked on the same layout?**
Designed, and the evidence is that the constraint pushed back. The gradient
layering could not be added as decoration: it forced the base tone down, and
that is a change to the ground the whole site is painted on rather than
something laid over it. The same is true of the geometry motif, which is reused
data rather than a texture, and of the hero variants, which are a table that
structurally cannot reach the type scale. What is closest to decoration is the
grain: it is genuinely just a noise overlay, and it is only defensible because
it is doing the one job nothing else does.

**Does the town card justify the map being the signature element?** Mostly not
yet, and that is a content problem this pass could not solve by working harder.
Half of every card is withheld. The three fields a visitor most wants,
how far it is, how long the drive really takes, and what the houses are like,
are exactly the three that could not be sourced without inventing them. A card
that says Butler County, Andover USD 385, 1957 and "covered by the MLS" is
true, and it is thinner than the interaction around it implies. The design is
built so that changes the day Alex sends the rest, and the honest statement
today is that the mechanism is finished and the content is not.

**What is the single worst thing remaining?** The hero's second column on
`/buy`, `/sell`, `/veterans` and `/investors`, which is the same hole v4 and v5
both named and neither closed. The variants give those four routes their own
light and their own geometry, which is a real improvement over four identical
openings, but at desktop width the column where the homepage shows the map is
still empty on all four. Closing it needs a real, page-specific object per
route rather than atmosphere, which is a features change rather than a visual
one, and it is now the third pass to say so.

**Would this same pass have happened for any other agent?** The navy ramp, the
grain, the elevation model and the type change, yes. What could not transfer is
the geometry motif, which is this client's own seven towns and two rivers, and
the town cards, whose entire design is organised around which facts about a
place a licensed agent is allowed to state. On a build with no fair housing
exposure the card would just be a card.
