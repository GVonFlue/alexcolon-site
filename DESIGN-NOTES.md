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
