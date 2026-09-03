import { z } from "zod";

/**
 * Content schema. This is the single source of truth for everything the client
 * will ever need to change, which is why nothing here is hardcoded in a
 * component. It is also the contract the future self-edit portal validates
 * patches against, so a bad edit fails here rather than in production.
 *
 * The important convention: a field that is `null` means "not verified yet".
 * Components withhold the section rather than rendering a placeholder.
 * Hard stop 1 of the build doctrine: if a required fact is missing, the field
 * stays null and the section withholds itself. Inventing is never acceptable.
 */

/** A fact we are willing to publish, plus where it came from. */
export const VerifiedFact = z.object({
  value: z.string().min(1),
  /** Where this was confirmed. Required, so an unsourced fact cannot ship. */
  source: z.string().min(1),
});
export type VerifiedFact = z.infer<typeof VerifiedFact>;

/** A fact we do not have yet. Renders nothing. */
export const PendingFact = z.object({
  value: z.null(),
  /** What we need and who we need it from, surfaced in the build report. */
  pending: z.string().min(1),
});

export const MaybeFact = z.union([VerifiedFact, PendingFact]);
export type MaybeFact = z.infer<typeof MaybeFact>;

export const ImageSlot = z.object({
  /** null until real photography exists. Never a stock substitute. */
  src: z.string().nullable(),
  alt: z.string(),
  /** Shown in the build report so the client knows exactly what to send. */
  needed: z.string(),
  /**
   * The photograph's own pixel dimensions, once there is one.
   *
   * Present so the frame can reserve the right box before the image loads and
   * so the layout can adapt to whatever shape Alex's photographer delivers.
   * The alternative, a fixed aspect ratio with object-cover, crops him out of
   * his own picture the moment the shot is a different shape than the one the
   * layout assumed, and nobody notices until he does.
   */
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
});
export type ImageSlot = z.infer<typeof ImageSlot>;

export const Cta = z.object({
  /** States the outcome, never the mechanism. Never "Submit". */
  label: z.string().min(1),
  href: z.string().min(1),
  /** "give" is the low friction offer, "direct" is a human, "tool" is a calculator. */
  kind: z.enum(["give", "direct", "tool", "portal"]),
  /** Exactly one primary per screenful. Hick's Law. */
  emphasis: z.enum(["primary", "secondary", "quiet"]),
});
export type Cta = z.infer<typeof Cta>;

export const ValueStackItem = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const LeadMagnet = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Why it is worth handing over an email, in the visitor's terms. */
  promise: z.string().min(1),
  /** Six items beats one sentence. */
  stack: z.array(ValueStackItem).min(4),
  /**
   * False until the actual PDF or document exists. When false the form says
   * Alex will send it, never that it downloads instantly.
   * Hard stop 8: never describe intended behavior as completed behavior.
   */
  assetReady: z.boolean(),
  /** Explicit per form. Most CRMs default unattributed API leads to "Other". */
  sourceTag: z.string().min(1),
  submitLabel: z.string().min(1),
  /** Defuses the obvious objection at the point of friction. */
  consentLine: z.string().min(1),
  /** Sets expectation about what arrives. Never how fast unless it is real. */
  successMessage: z.string().min(1),
});
export type LeadMagnet = z.infer<typeof LeadMagnet>;

export const Testimonial = z.object({
  quote: z.string().min(1),
  /** The person's name as they gave it. Rendered per `displayAs`, never raw. */
  attribution: z.string().min(1),
  /** Hard stop 3. No permission, no publication. Words are never edited. */
  permissionOnFile: z.literal(true),
  /**
   * How much of the name that person agreed to have published.
   *
   * Permission to be quoted and permission to be named are two different
   * permissions, and people routinely grant the first and not the second. A
   * seller mid-divorce, somebody who bought with a VA loan and would rather
   * not advertise where they now live, anyone in a small town: all real, all
   * common. Recording the preference with the quote is what makes it survive
   * the next person who edits this file, and it means the component never has
   * to guess.
   *
   * Required, with no default. A missing preference is not permission to
   * publish a full name.
   */
  displayAs: z.enum(["full", "firstAndLastInitial", "firstOnly", "initials", "anonymous"]),
  context: z.string().nullable(),
});
export type Testimonial = z.infer<typeof Testimonial>;

export const Compliance = z.object({
  /**
   * K.S.A. 58-3086 requires the supervising broker's business or trade name in
   * a readable and identifiable manner on all advertising. Kansas is stricter
   * than the NAR code here: it must appear directly, not behind a link. So this
   * renders on every page, not only the footer.
   */
  brokerageName: MaybeFact,
  brokerageAddress: MaybeFact,
  brokeragePhone: MaybeFact,
  /** Alex's Kansas license number. Null until he confirms it himself. */
  licenseNumber: MaybeFact,
  /**
   * REALTOR is a trademark. Hard stop 4: only usable with confirmed NAR
   * membership. This gates the word everywhere in the build.
   */
  narMembershipConfirmed: z.boolean(),
  equalHousing: z.boolean(),
  /** Required only if MLS listing data is displayed on the site. */
  idxDisclaimer: z.string().nullable(),
  /** Anything the brokerage's compliance contact adds. Survives the next build. */
  additionalRequired: z.array(z.string()),
});
export type Compliance = z.infer<typeof Compliance>;

/**
 * A starter chip on the assistant. `prompt` is what is actually sent when it
 * is pressed, which is why it is a full sentence rather than the short label
 * the visitor sees.
 */
export const AssistantChip = z.object({
  label: z.string().min(1),
  prompt: z.string().min(1),
  kind: z.enum(["info", "conversion"]),
});
export type AssistantChip = z.infer<typeof AssistantChip>;

export const SiteConfig = z.object({
  agentName: z.string().min(1),
  /** Site is domain agnostic until cutover. Read from SITE_ORIGIN at runtime. */
  siteName: z.string().min(1),
  tagline: z.string().min(1),
  phone: z.object({
    /** Digits only, for tel: hrefs. */
    e164: z.string().regex(/^\+1\d{10}$/),
    display: z.string().min(1),
    /** Call, text, or both. Drives the microcopy next to the number. */
    accepts: z.array(z.enum(["call", "text"])).min(1),
  }),
  email: z.string().email(),
  /**
   * The single source of truth for where Alex works. Carries coordinates because
   * the map draws from this list: if the towns lived in the component and the
   * names lived here, editing one would silently disagree with the other.
   * Ordered, and exactly one entry is the anchor.
   */
  serviceAreas: z
    .array(
      z.object({
        name: z.string().min(1),
        lat: z.number(),
        lon: z.number(),
        anchor: z.boolean().optional(),
        /**
         * The town card's contents, and nothing beyond this list.
         *
         * The list is closed on purpose. Every field here is a fact about a
         * place: which county it is in, how far away it is, what the district
         * is called, when the town was incorporated, where its own website is.
         * None of them is a characterization, a rating, or a statement about
         * who lives anywhere, and no field exists that could hold one, which
         * is a stronger guarantee than a rule that catches bad wording after
         * somebody has already written it. scripts/rules.mjs carries the
         * wording rule as well, scoped to exactly this data.
         *
         * schoolDistrict is the field to be most careful with. The district
         * NAME is a fact and may be published. District quality, ratings,
         * rankings and comparisons are fair housing exposure and may not, in
         * this field or anywhere near it.
         *
         * Every one is a MaybeFact, so an unverified fact is null with a
         * pending note naming who supplies it, and the card renders that row
         * as nothing rather than as a placeholder.
         */
        facts: z.object({
          county: MaybeFact,
          /** Approximate driving distance and an honest drive time downtown. */
          driveToDowntown: MaybeFact,
          /** The district's name only. Never a rating or a characterization. */
          schoolDistrict: MaybeFact,
          /** The era of the housing stock, stated as fact, not as appeal. */
          housingEra: MaybeFact,
          yearIncorporated: MaybeFact,
          /** The city's own website. An absolute URL in `value`. */
          website: MaybeFact,
          /** Whether the South Central Kansas MLS covers it. */
          mlsCoverage: MaybeFact,
          /** One factual, verifiable note, or null. */
          note: MaybeFact,
        }),
      }),
    )
    .min(1),
  /** Real profiles only. An icon pointing nowhere is withheld, not dead. */
  social: z.array(z.object({ label: z.string(), href: z.string().url() })),
  compliance: Compliance,
  /**
   * Verifiable figures only. Empty array withholds the whole numbers band
   * rather than shipping a band of invented credibility.
   */
  numbers: z.array(
    z.object({
      figure: z.string().min(1),
      label: z.string().min(1),
      source: z.string().min(1),
    }),
  ),
  testimonials: z.array(Testimonial),
  headshot: ImageSlot,
  assistant: z.object({
    name: z.string().min(1),
    /** The bot is never presented as Alex. It says what it is. */
    introduction: z.string().min(1),
    /** Two informational, one conversion. The fallback for a route with none. */
    chips: AssistantChip.array().length(3),
    /**
     * There is no calendar integration. Until a booking URL exists the
     * assistant is forbidden from saying an appointment is booked, confirmed,
     * scheduled, held, or on the calendar. It passes a requested time.
     */
    bookingUrl: z.string().url().nullable(),
    sourceTag: z.string().min(1),
    /**
     * Short capability labels for the chip row on the assistant's character
     * card. Plain nouns describing what it actually already does elsewhere on
     * the site (the buy/sell/veterans/investors pages, the handoff to Alex),
     * never a new claim invented for the card itself.
     */
    goodAt: z.array(z.string().min(1)).min(3).max(6),
  }),
});
export type SiteConfig = z.infer<typeof SiteConfig>;

export const Band = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hero"),
    eyebrow: z.string(),
    headline: z.string().min(1),
    support: z.string().min(1),
    ctas: z.array(Cta).length(2),
    image: ImageSlot.nullable(),
    /**
     * What occupies the second column. With no photography, a hero that is only
     * a text column leaves half a desktop screen empty, which reads as
     * unfinished. "areaMap" puts the signature element in the fold instead of
     * six bands down, and it is the one thing on the page that is true only of
     * this client.
     */
    feature: z.enum(["areaMap", "none"]).default("none"),
    /**
     * An exact substring of `headline` to render in the accent color, e.g.
     * "real answers". Optional, and matched literally: if it does not occur
     * in the headline the whole headline just renders plain rather than
     * silently dropping text. Display type gets exactly this one exception to
     * "gold is a fill, never type," and only because gold-ink (see
     * globals.css) is a separately verified color for that one job.
     */
    accentPhrase: z.string().min(1).optional(),
    /**
     * Which atmosphere this route's hero opens with.
     *
     * All eight routes used to open identically, which is a strange thing for
     * a site whose entire structure is "four audiences, four doors". This
     * changes where the light falls and which of the map's own geometry sits
     * behind it, and nothing else: the type scale, the CTA pair, the brokerage
     * lockup and the compliance geometry are identical on every route by
     * construction, because the variant cannot reach any of them.
     */
    variant: z
      .enum(["home", "buying", "selling", "veterans", "investors", "plain"])
      .default("plain"),
  }),
  z.object({
    type: z.literal("assistant"),
    eyebrow: z.string().min(1).optional(),
    /**
     * This route's own starter chips. Optional: a route without them falls
     * back to site.assistant.chips.
     *
     * They are per route because the same three chips on all eight routes is
     * the tell that the assistant is decoration. Somebody on /veterans with a
     * report date and somebody on /investors with an address want different
     * first questions, and the chip row is the cheapest place to prove the
     * thing knows which page it is on.
     *
     * Same shape and same rule as the site-wide set: exactly three, two
     * informational and one conversion.
     */
    chips: AssistantChip.array().length(3).optional(),
    /**
     * Must contain the assistant's name (site.assistant.name) as a literal
     * substring, e.g. "Ask Lark before you talk to anyone": the component
     * finds it and renders it in the accent color the same way a hero's
     * accentPhrase works. If the name is not found the heading still renders,
     * just without the highlight, the same silent-plain fallback
     * AccentHeadline already uses everywhere else.
     */
    heading: z.string().min(1),
    intro: z.string().min(1),
  }),
  z.object({
    type: z.literal("pickYourDoor"),
    heading: z.string().min(1),
    lanes: z
      .array(
        z.object({
          lane: z.string().min(1),
          line: z.string().min(1),
          href: z.string().min(1),
        }),
      )
      .min(3)
      .max(4),
  }),
  z.object({
    type: z.literal("prose"),
    heading: z.string().min(1),
    /** One idea per band. Vertical, conversational. */
    body: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("steps"),
    heading: z.string().min(1),
    intro: z.string().nullable(),
    /** Numbered markers are allowed here because this is genuinely sequential. */
    steps: z.array(z.object({ title: z.string(), detail: z.string() })).min(2),
  }),
  z.object({
    type: z.literal("lossAversion"),
    heading: z.string().min(1),
    /** Arithmetic, not fear. */
    body: z.array(z.string().min(1)).min(1),
    calculator: z.enum(["carryCost", "none"]),
  }),
  z.object({
    type: z.literal("trust"),
    heading: z.string().min(1),
    body: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("conversion"),
    magnetId: z.string().min(1),
  }),
  /**
   * A compact, visually distinct door between two content bands: a tappable
   * phone, a text link, one line of copy. Deliberately not a third form: the
   * doctrine wants two or more genuinely distinct paths, and a second and
   * third form on the same page is one path repeated, not two.
   */
  z.object({
    type: z.literal("contactStrip"),
    line: z.string().min(1),
  }),
  z.object({
    type: z.literal("proof"),
    heading: z.string().min(1),
  }),
  /**
   * The numbers band.
   *
   * It renders nothing today, and that is the point of building it. Alex has
   * no verified figures, so site.numbers is an empty array and the whole band
   * withholds itself: no strip of "500+ Homes Sold, 15 Years Experience, 98%
   * Satisfaction", every word of which would be invented.
   *
   * When he sends real figures with their sources, they appear here with no
   * code change. Every entry carries its own source, so a figure that cannot
   * be attributed cannot be published.
   */
  z.object({
    type: z.literal("numbers"),
    heading: z.string().min(1),
    intro: z.string().nullable(),
  }),
  /**
   * An interactive tool. Every one of these takes all of its figures from the
   * visitor, so the result is arithmetic rather than a market claim. That is
   * what makes them publishable for a client with no verified numbers, and it
   * is the reason a tool can carry a page that a statistics band cannot.
   */
  z.object({
    type: z.literal("tool"),
    heading: z.string().min(1),
    body: z.array(z.string().min(1)).min(1),
    tool: z.enum(["netProceeds", "affordability", "vaTimeline", "rentalCashflow"]),
  }),
  z.object({
    type: z.literal("areaMap"),
    heading: z.string().min(1),
    intro: z.string().min(1),
  }),
  z.object({
    type: z.literal("faq"),
    heading: z.string().min(1),
    items: z
      .array(z.object({ q: z.string().min(1), a: z.string().min(1) }))
      .min(2),
  }),
  z.object({
    type: z.literal("closingCta"),
    heading: z.string().min(1),
    body: z.string().min(1),
    ctas: z.array(Cta).min(2),
  }),
]);
export type Band = z.infer<typeof Band>;

export const PageContent = z.object({
  route: z.string().min(1),
  /** Unique per route. Enforced across all pages by the content loader. */
  title: z.string().min(1).max(62),
  description: z.string().min(50).max(165),
  /** Exactly one h1 per page, and this is it. */
  h1: z.string().min(1),
  /** The one job this page has, named so it can be checked. */
  job: z.string().min(1),
  /** Named psychological principle behind the primary CTA. */
  primaryPrinciple: z.string().min(1),
  bands: z.array(Band).min(1),
});
export type PageContent = z.infer<typeof PageContent>;

export const MagnetsFile = z.object({ magnets: z.array(LeadMagnet).min(1) });
