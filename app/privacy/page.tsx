import type { Metadata } from "next";
import { site, complianceLines } from "@/lib/content";
import { Section, H2, SectionRule } from "@/components/ui";

/* ============================================================================
   app/privacy/page.tsx — the privacy policy.

   NOT BOILERPLATE, DELIBERATELY. The brief is explicit: "The policy must
   describe what the site actually does; do not paste generic boilerplate that
   contradicts forms, Lark, analytics or CRM behavior."

   That rules out most of what a privacy policy usually contains. This site
   sets no analytics cookie, runs no pixel, and has no advertising tag on it
   today. A policy claiming otherwise would be inaccurate in the direction that
   matters least to a lawyer and most to a reader — it would describe tracking
   that is not happening.

   So everything below is written from lib/leads.ts, which is the only code
   that moves a visitor's information anywhere, and app/api/chat/route.ts,
   which is the only code that sends anything to a third party in real time.

   WHEN META OR ANALYTICS IS ADDED, THIS PAGE CHANGES IN THE SAME COMMIT. The
   brief requires it and the alternative is a policy that becomes false the
   moment somebody pastes a tag into the layout. The cookies section below says
   so in as many words, so a future reader knows the omission was a decision
   rather than an oversight.

   NOT LEGAL ADVICE, and it says so at the bottom. The brokerage and whoever
   handles compliance should read this before launch, particularly if
   automated SMS or email is ever switched on — the brief is right that a
   privacy policy is not consent.
   ============================================================================ */

export const metadata: Metadata = {
  title: `Privacy policy | ${site.agentName}`,
  description:
    "What information this website collects, how it is used, and who it is shared with.",
  robots: { index: true, follow: true },
};

const UPDATED = "September 2026";

function P({ children }: { children: React.ReactNode }) {
  return <p className="measure mt-3 text-[1rem] leading-[1.72] text-subtle">{children}</p>;
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="display mt-10 text-[1.25rem] font-bold text-navy first:mt-0">{children}</h3>
  );
}

export default function Page() {
  return (
    <Section tone="paper">
      <div>
        <SectionRule />
        <H2>Privacy policy</H2>
        <p className="label mt-3 text-subtle">Last updated {UPDATED}</p>
      </div>

      <div className="mt-8 max-w-[46rem]">
        <P>
          This policy covers alexcolonhomes.com, operated by {site.agentName}, a
          licensed Kansas real estate agent with {site.compliance.brokerageName.value}. It
          describes what the site actually collects and does, rather than everything a website
          could conceivably do.
        </P>

        <H>What is collected</H>
        <P>
          The site collects information you type into it, and nothing else about you personally.
          That means the name, email address and phone number you enter on a form, the property
          address if you are asking about a specific home, and anything you write in a message or
          say to Lark, the assistant.
        </P>
        <P>
          Alongside a form submission, the site records which page you were on, which form you
          used, and any campaign tags in the link you arrived through. That is how Alex can tell
          whether a lead came from the buyer&rsquo;s guide or from a Google search, and it is kept
          for that reason rather than to build a profile of you.
        </P>
        <P>
          The calculators are the exception worth stating plainly: nothing you type into them is
          sent anywhere or stored. They run entirely in your browser. If you choose to send a
          scenario to Alex afterwards, that is a separate action you take deliberately, and only
          then does anything leave your device.
        </P>

        <H>How it is used</H>
        <P>
          To answer your question, to send you a resource you asked for such as the
          buyer&rsquo;s guide, and to provide real estate services if you decide to work with
          Alex. Contact details are used to reply to you.
        </P>

        <H>Who it is shared with</H>
        <P>
          A form submission is recorded in a private spreadsheet and in the customer relationship
          system Alex uses to keep track of who he is helping. Both are operated by service
          providers on his behalf. The website itself is hosted by Vercel.
        </P>
        <P>
          Lark, the assistant, sends the text of your conversation to Anthropic to generate a
          reply. It is not used to train their models. If you ask Lark to pass something to Alex,
          a summary of the conversation goes into the same system as any other enquiry.
        </P>
        <P>
          Your information is not sold, and it is not shared with anyone other than the service
          providers described above and Alex&rsquo;s supervising broker where a transaction
          requires it.
        </P>

        <H>Cookies and tracking</H>
        <P>
          As of {UPDATED} this site sets no analytics cookies and runs no advertising or
          measurement pixel. There is no Meta Pixel, no Google Analytics and no third-party
          tracker on any page.
        </P>
        <P>
          If that changes, this page will be updated in the same release, and this paragraph will
          be replaced with a description of what was added and what it collects.
        </P>

        <H>Text messages and email</H>
        <P>
          Alex replies to enquiries directly. Submitting a form does not sign you up for an
          automated sequence. If you ask to be contacted by text, replying STOP will end it.
        </P>

        <H>Keeping and removing your information</H>
        <P>
          Enquiries are kept for as long as they are useful to an ongoing or potential working
          relationship, and records connected to a completed transaction are kept as long as
          Kansas real estate record-keeping requires.
        </P>
        <P>
          You can ask to see what is held about you, ask for it to be corrected, or ask for it to
          be deleted, by emailing{" "}
          <a href={`mailto:${site.email}`} className="link-underline text-navy">
            {site.email}
          </a>
          . Anything not required to be retained will be removed.
        </P>
        <P>
          Information is held in access-controlled systems and transmitted over encrypted
          connections. No system is perfectly secure and this policy does not claim otherwise.
        </P>

        <H>Children</H>
        <P>
          This site is intended for adults and is not directed at children under 13. If you
          believe a child has submitted information, email the address above and it will be
          removed.
        </P>

        <H>Questions, and changes to this policy</H>
        <P>
          Privacy questions go to{" "}
          <a href={`mailto:${site.email}`} className="link-underline text-navy">
            {site.email}
          </a>
          , or call or text {site.phone.display}. If this policy changes, the date at the top of
          the page changes with it.
        </P>
        <P>
          This page describes how this website handles information. It is not legal advice.
        </P>

        <div className="mt-12 border-t border-ink/12 pt-6">
          {complianceLines().map((line) => (
            <p key={line} className="text-[0.85rem] leading-[1.7] text-subtle">
              {line}
            </p>
          ))}
        </div>
      </div>
    </Section>
  );
}
