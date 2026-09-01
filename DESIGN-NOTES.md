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
