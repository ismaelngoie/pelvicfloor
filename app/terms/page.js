// app/terms/page.js
//
// The subscription terms, the price, how to cancel, and the guarantees.
//
// THE ONE RULE THAT MATTERS HERE.
//
// The paywall's promise is the one that will be held against the business. A
// member did not read this page before she paid; she read the money screen. So
// this page does not get to have its own opinion about what she was promised.
// Every number and every condition below is IMPORTED from the same modules the
// paywall renders from:
//
//   lib/guaranteeCopy.js  the 90-Day Goal Guarantee, ported verbatim from iOS
//   lib/paywallCopy.js    the money screen's own words, including the refund FAQ
//   lib/pricing.js        the advertised price
//
// That is deliberate and it is the whole design of this file. If somebody
// changes SESSIONS_PER_WEEK from 5 to 4, this page changes with it in the same
// build. Nobody has to remember. Do not retype any of these values as literals
// to "make the page read better"; the day the two drift is the day a refund
// claim becomes an argument about which page she is entitled to rely on, and
// the answer to that is always the one she was shown at the till.
//
// The one thing here that is NOT imported is the day 30 rung, because there is
// no copy anywhere that defines it. See the OWNER NOTES at the bottom.
//
// House style: no em dashes, no en dashes, short sentences.

import LegalPage, { Contents, Summary, Callout } from "@/components/legal/LegalPage";
import {
  CLAIM_EMAIL,
  COVERAGE_TITLE,
  QUALIFYING_WEEKS_REQUIRED,
  SESSIONS_PER_WEEK,
  TOTAL_WEEKS,
  outcomePhrase,
} from "@/lib/guaranteeCopy";
import { REFUND_FAQ_ANSWER, firstSubCTA } from "@/lib/paywallCopy";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "@/lib/pricing";
import { GOALS } from "@/lib/program";

export const metadata = {
  title: "Terms",
  description: `The Pelvi Health subscription terms: ${DEFAULT_PRICE_LABEL} a ${DEFAULT_PRICE_PERIOD}, how to cancel in two taps, and exactly what the 7 day, 30 day and 90-Day Goal Guarantee promises cover.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms | Pelvi Health",
    description: `${DEFAULT_PRICE_LABEL} a ${DEFAULT_PRICE_PERIOD}, cancel in two taps, and the 90-Day Goal Guarantee in full.`,
    url: "https://pelvi.health/terms",
    type: "website",
  },
};

const UPDATED = "August 9, 2026";

const SECTIONS = [
  { id: "what-pelvi-is", label: "What Pelvi is" },
  { id: "not-medical-advice", label: "This is not medical advice" },
  { id: "who-can-use", label: "Who can use it" },
  { id: "subscription", label: "The subscription and the price" },
  { id: "cancel", label: "How to cancel" },
  { id: "guarantees", label: "The guarantees" },
  { id: "guarantee-90", label: "The 90-Day Goal Guarantee in full" },
  { id: "iphone", label: "If you bought in the iPhone app" },
  { id: "your-account", label: "Your account and your content" },
  { id: "our-content", label: "Our content" },
  { id: "fair-use", label: "Fair use" },
  { id: "availability", label: "Availability and changes" },
  { id: "liability", label: "Liability" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms"
      subtitle="The subscription, the guarantees, and how to leave."
      updated={UPDATED}
    >
      <Summary>
        <p className="!mt-0">
          <strong>The short version.</strong> Pelvi costs {DEFAULT_PRICE_LABEL} a{" "}
          {DEFAULT_PRICE_PERIOD}. It renews every {DEFAULT_PRICE_PERIOD} until you stop it, and you
          stop it in two taps from the You tab or by emailing us. Cancel in the first 7 days for
          any reason and you pay nothing. At day 90, if you did the sessions and did not get where
          you wanted to go, we refund the full {DEFAULT_PRICE_LABEL} you paid. Pelvi is exercise
          coaching. It is not medical care.
        </p>
      </Summary>

      <Contents items={SECTIONS} />

      {/* ------------------------------------------------------------------ */}
      <h2 id="what-pelvi-is">1. What Pelvi is</h2>
      <p>
        Pelvi Health, LLC gives you a personalised pelvic floor and core programme: a short daily
        session, a library of exercise videos, progress tracking, and Coach Mia. You can use it on
        this website and in the Pelvic Floor &amp; Core Coach app for iPhone. Using either one means
        you accept these terms.
      </p>
      <p>
        How we handle your information is a separate page:{" "}
        <a href="/privacy-policy">the Privacy Policy</a>. It is worth your five minutes, because
        pelvic health answers are sensitive and we say exactly what happens to them.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="not-medical-advice">2. This is not medical advice</h2>
      <p>
        Pelvi is education and exercise coaching. It is not medical advice, it is not a diagnosis,
        it is not treatment, and no video here can know what is happening in your body. We are not
        your doctor and Coach Mia is not a clinician.
      </p>
      <Callout>
        <p className="!mt-0">
          <strong>Talk to a doctor or a pelvic health physiotherapist first</strong> if you are
          pregnant or recently gave birth, if you have had surgery, if you have pain that is new or
          getting worse, if you are bleeding, or if you have any condition that exercise might
          affect. If something hurts while you are doing a session, stop.
        </p>
      </Callout>
      <p>
        In an emergency, call your local emergency number. Do not wait for a reply from us.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="who-can-use">3. Who can use it</h2>
      <p>
        You have to be 18 or over to subscribe, and old enough where you live to enter into a
        contract. The account is yours. Do not share your sign-in.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="subscription">4. The subscription and the price</h2>
      <ul>
        <li>
          Pelvi costs <strong>{DEFAULT_PRICE_LABEL} per {DEFAULT_PRICE_PERIOD}</strong>, in US
          dollars.
        </li>
        <li>
          You are charged when you subscribe, and then on the same date every{" "}
          {DEFAULT_PRICE_PERIOD} afterwards.
        </li>
        <li>
          <strong>It renews by itself</strong> until you cancel. There is no fixed term and no
          lock-in.
        </li>
        <li>
          Payments on this website are taken by Stripe. Your receipt comes from Stripe by email.
        </li>
        <li>
          Taxes may be added at checkout depending on where you live. The total you are charged is
          shown before you confirm.
        </li>
      </ul>
      <p>
        If we ever change the price, we will email you first and you will have the chance to cancel
        before the new price applies. A price change never applies to a {DEFAULT_PRICE_PERIOD} you
        have already paid for.
      </p>
      <p>
        If a payment fails, Stripe will try again over the following days. If it keeps failing, the
        subscription stops and you lose access until you fix the card. We do not send debt
        collectors after anyone over a pelvic floor app.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="cancel">5. How to cancel</h2>
      <p>This is the same answer the paywall gives, word for word:</p>
      <Callout>
        <p className="!mt-0">{REFUND_FAQ_ANSWER}</p>
      </Callout>
      <p>
        In longer form: sign in, open the <strong>You</strong> tab, and tap{" "}
        <strong>Manage or cancel</strong>. That opens the Stripe billing portal, where you can
        cancel, change your card and see your invoices. Or email{" "}
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> and ask, and we will do it for you.
      </p>
      <p>
        You can cancel at any time, and you do not have to give a reason. When you cancel you keep
        access until the end of the {DEFAULT_PRICE_PERIOD} you have already paid for. After that
        you are not charged again.
      </p>
      <p>
        There is nothing to talk you out of it, no retention offer to click past, and no phone call
        to make. If you ever find one, that is a bug and we want to hear about it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="guarantees">6. The guarantees</h2>
      <p>
        There are three, they stack, and they are what the money screen promises. Written out here
        so you have the terms and not just our word.
      </p>

      <h3>Day 7: any reason</h3>
      <p>{firstSubCTA(DEFAULT_PRICE_LABEL)}</p>
      <p>
        No conditions at all. You do not have to have opened a single session, and you do not have
        to explain yourself.
      </p>

      <h3>Day 30: still not sure</h3>
      <p>
        If you have given it 30 days and you are still not sure Pelvi is for you, email{" "}
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> before day 30 and we refund everything
        you have paid so far. Again, no conditions and no explanation needed.
      </p>

      <h3>Day 90: you did the work and did not get there</h3>
      <p>
        This is the 90-Day Goal Guarantee, and it is the one with a condition attached: you have to
        have done the sessions. It is set out in full in the next section.
      </p>

      <Callout>
        <p className="!mt-0">
          <strong>What &quot;100% money back&quot; means.</strong> It means we refund the whole
          amount, not a portion of it, and we do not keep a fee. The day 7 and day 30 promises have
          no conditions whatsoever. The day 90 promise has exactly one condition, which is doing{" "}
          {SESSIONS_PER_WEEK} sessions a week. Nothing else is ever required, and there is never a
          form.
        </p>
      </Callout>

      {/* ------------------------------------------------------------------ */}
      <h2 id="guarantee-90">7. {COVERAGE_TITLE}</h2>
      <p>These are the terms, in the same words the paywall uses:</p>
      <ul>
        <li>
          Complete <strong>{SESSIONS_PER_WEEK} sessions a week</strong> for at least{" "}
          <strong>{QUALIFYING_WEEKS_REQUIRED} of {TOTAL_WEEKS} weeks</strong>.
        </li>
        <li>
          If you are not where the promise says you will be by day 90, email{" "}
          <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>.
        </li>
        <li>
          <strong>We refund the full {DEFAULT_PRICE_LABEL} you paid.</strong> No forms.
        </li>
        <li>Your 7-day money-back guarantee is separate and needs no conditions.</li>
      </ul>

      <h3>What &quot;where the promise says you will be&quot; means for your goal</h3>
      <p>
        The promise is about the goal you picked, so it is different for each one. If you are not
        doing the thing below by day 90, the guarantee applies to you:
      </p>
      <ul>
        {/* Rendered from lib/guaranteeCopy.js outcomePhrase(). These sentences
            are the offer. They are subjective on purpose: "without thinking
            about it" is the outcome she came for, and "without leaking" is an
            absolute promise nobody can honour. Read the header of that file
            before touching a word of this. */}
        {GOALS.map((goal) => (
          <li key={goal.id}>
            <strong>{goal.title}:</strong> {outcomePhrase(goal.id)}.
          </li>
        ))}
      </ul>

      {/* "stability" was a goal in an earlier version and members who chose it
          still exist; see the note in lib/guaranteeCopy.js. It is not in GOALS
          any more, so it is not in the list above, and outcomePhrase falls
          through to the default for it. Rendering that default here rather
          than typing it out keeps this sentence true if the default changes. */}
      <p>
        If you picked a goal we have since retired, your promise is the general one:{" "}
        {outcomePhrase("")}. Nothing you were promised expires because we reorganised a menu.
      </p>

      <h3>How we check</h3>
      <p>
        We look at the sessions recorded on your account. That is all. You do not have to keep a
        diary, take photographs, fill in a questionnaire or prove anything about your body. If your
        sessions are there and you say you did not get where you wanted to go, we believe you.
      </p>
      <p>
        Sessions you did in the iPhone app count too. Your app and your website records are joined
        by your email address, so a session done on the phone is a session on your account.
      </p>
      <p>
        Email us within 30 days of day 90 so there is a sensible end to it. If you miss that
        window, write to us anyway and we will still look.
      </p>
      <p>
        A refund ends your access. That is the only thing you give up, and your subscription stops
        at the same time so you are not charged again.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="iphone">8. If you bought in the iPhone app</h2>
      <p>
        A subscription bought inside the iPhone app is an Apple purchase, and Apple&apos;s rules
        apply to it rather than ours. Cancel it in Settings on your iPhone: tap your name, then
        Subscriptions. Refunds for App Store purchases are requested from Apple at{" "}
        <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">
          reportaproblem.apple.com
        </a>
        .
      </p>
      <p>
        The guarantees above still stand. If Apple turns down a refund we think you are owed, email{" "}
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> and we will sort it out directly with
        you. You should not lose a guarantee because of which button you happened to press.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="your-account">9. Your account and your content</h2>
      <p>
        Your check-ins, your messages to Coach Mia and anything else you write stay yours. We use
        them to run the service for you: to build your plan, to show your progress, and to answer
        you. We do not publish them and we do not sell them.
      </p>
      <p>
        If you send us feedback about the product, we can act on it and build it without owing you
        anything for it. That is the only licence we take.
      </p>
      <p>
        Keep your account details to yourself. Tell us if you think somebody else has got into it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="our-content">10. Our content</h2>
      <p>
        The videos, the programmes, the writing, the design and the Pelvi name belong to us or to
        the people we license them from. While you subscribe you may use all of it for yourself.
        You may not copy it, share it, re-upload it, sell it or use it to run classes.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="fair-use">11. Fair use</h2>
      <p>Please do not:</p>
      <ul>
        <li>share your account with people who have not paid;</li>
        <li>download or scrape the videos;</li>
        <li>try to break, overload or reverse engineer the service;</li>
        <li>use it for anything illegal.</li>
      </ul>
      <p>
        If somebody is doing one of these things we can close their account. If we close yours for
        this reason we will refund the part of the {DEFAULT_PRICE_PERIOD} you have not used.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="availability">12. Availability and changes</h2>
      <p>
        We aim to keep Pelvi running all the time and we will not always manage it. Videos get
        added, programmes get improved, and occasionally something is retired. If we ever have to
        shut the service down we will tell you and refund whatever you have paid for time you did
        not get.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="liability">13. Liability</h2>
      <p>
        Exercise carries risk, and only you know what your body is doing today. You are responsible
        for deciding whether a session is right for you, for stopping when something hurts, and for
        getting medical advice when you need it. See <a href="#not-medical-advice">section 2</a>.
      </p>
      <p>
        We provide Pelvi as it is. Beyond the guarantees on this page, and to the extent the law
        allows, we are not liable for indirect or consequential losses, and our total liability to
        you is limited to what you have paid us in the twelve months before the claim.
      </p>
      <p>
        Nothing here takes away rights you have under consumer law where you live, including your
        statutory cancellation rights in the UK and the EU. If a term on this page conflicts with
        those rights, your rights win.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="changes">14. Changes to these terms</h2>
      <p>
        If we change these terms we will update this page and the date at the top. If a change
        affects what you pay or what a guarantee covers, we will email you before it applies to
        you, and the terms you subscribed under keep covering the {DEFAULT_PRICE_PERIOD} you already
        paid for.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="contact">15. Contact</h2>
      <p>
        Email <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>. Refunds, cancellations,
        guarantee claims and complaints all go to the same address, and a person reads it.
      </p>
      <p>
        Pelvi Health, LLC. For privacy questions, see{" "}
        <a href="/privacy-policy">the Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}

// ---------------------------------------------------------------------------
// OWNER NOTES. Decisions that are yours, not mine. Nothing below is claimed on
// the page.
//
//  1. DAY 30 WAS AN UNDEFINED PROMISE. lib/guaranteeCopy.js LADDER_LINE puts
//     "✓ Day 30: still not sure" in the paywall footer, and that rung is the
//     ONLY place day 30 appears anywhere in this repo or in the iOS copy. There
//     were no terms behind it. A refund ladder rung with nothing behind it is
//     the worst of both worlds: she relies on it, and you have not decided what
//     it means, so the argument happens later at the worst possible moment.
//     Section 6 now defines it the way a reader of that rung would naturally
//     read it: email before day 30, no conditions, refund everything paid so
//     far. If you meant something narrower, change section 6 AND the rung in
//     the same breath. Do not change only one.
//
//  2. GOVERNING LAW IS DELIBERATELY ABSENT. There is no governing law or venue
//     clause on this page, because I do not know where Pelvi Health, LLC is
//     registered and inventing "the State of Delaware" would be inventing a
//     term. The old public/terms-of-use.html shipped literal
//     "[[STATE / COUNTRY]]" and "[[JURISDICTION]]" placeholders to production,
//     which is worse. Tell me the state and I will add the clause.
//
//  3. STRIPE PORTAL: CONFIRM IT CANCELS AT PERIOD END. Section 5 says "you keep
//     access until the end of the year you have already paid for" (the period
//     word is read from lib/pricing.js), which is Stripe's default
//     (cancel_at_period_end) and the fair reading. If the
//     portal in your Stripe dashboard is set to cancel immediately, either flip
//     the setting or change that sentence. Right now the page and the dashboard
//     have to agree and only you can see the dashboard.
//
//  4. THE 90-DAY CHECK NEEDS THE COMPLETIONS TO EXIST. Section 7 promises we
//     check the sessions recorded on the account and nothing else. Web sessions
//     write to users/{id}/completions (lib/memberStore.js recordDayCompletion)
//     and iOS writes the same shape, so the data is there. What does not exist
//     is a report. When the first claim lands you will be counting documents by
//     hand. Eleven qualifying weeks out of thirteen at five a week is a query,
//     not a judgement call, so it is worth writing once.
//
//  5. "SESSIONS DONE IN THE APP COUNT TOO" DEPENDS ON THE EMAIL JOIN. Section 7
//     says this, and it is true only while lib/memberStore.js findMemberByEmail
//     actually matches her two records. That join is by email address and it is
//     case sensitive on the iOS side, which is why that function asks for both
//     spellings. If the join breaks, this sentence becomes a promise the data
//     cannot keep, and it breaks silently.
//
//  6. THE PAYWALL SAYS "10,200+ women" AND "4.9 App Store Rating". Neither is
//     on this page, because neither is a term of the contract, but both are
//     advertising claims on the screen that takes the money and both need to be
//     true and evidenced if anyone asks. Same for "500+ videos approved by
//     physios": public/content/video_catalog.json holds 533 videos, so the
//     count is safe; "approved by physios" is the half that needs a name behind
//     it.
//
//  7. NO REFUND WINDOW IS ENFORCED IN CODE. Day 7, day 30 and day 90 are all
//     honoured by hand, by you, in the inbox. That is fine at this size and it
//     is the honest way to run it. It does mean the promise is only as good as
//     the inbox, so do not let contact@pelvi.health go unread.
// ---------------------------------------------------------------------------
