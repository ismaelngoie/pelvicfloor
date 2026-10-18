// app/privacy-policy/page.js
//
// Pelvi's real privacy policy. Read the notes before editing it.
//
// WHAT THIS REPLACES, AND WHY IT MATTERS MORE THAN IT LOOKS.
//
// https://pelvi.health/privacy-policy served public/privacy-policy.html, which
// was written for a different product: it named "PELVIC FLOOR EXERCISES" at
// pelvicfloor.vagitight.com, it still carried literal [[EMAIL]] placeholders in
// the section telling people how to exercise their GDPR rights, and it made
// three statements that were flatly untrue of this site:
//
//   "We do NOT collect sensitive health data"  -> the funnel asks for pelvic
//      pain, bladder leaks, postpartum status and prostate concerns, and the
//      member area records daily leak and pain check-ins.
//   "We do not use third-party ad trackers"    -> app/layout.js loads the
//      Google Ads tag (AW-17911323675) on every page.
//   No mention of Stripe, Microsoft Clarity or Firestore at all.
//
// A policy that denies collecting the exact category of data the product is
// built on is worse than no policy. Google Ads and Meta both suspend accounts
// over a landing page whose policy does not match the page, and session
// recording plus card payments are each independently disclosable.
//
// THE RULES THIS PAGE IS WRITTEN UNDER.
//
//  1. Everything here is checked against the code, not assumed. Every claim
//     below has a file behind it, and the ones that were hardest to pin down
//     carry a comment naming that file. If you change what the product does,
//     this page is part of the change.
//  2. No em dashes and no en dashes. House style, whole repo.
//  3. Short sentences. A member reading this on a phone at 11pm has to be able
//     to find out what happens to her health answers without a lawyer.
//  4. Nothing is promised here that the product does not do. Where something is
//     genuinely undecided it is left as an OWNER NOTE in these comments and NOT
//     as a commitment on the page. Those notes are listed at the bottom of this
//     file. Read them before you tell anyone this page is finished.

import LegalPage, { Contents, Summary, Callout } from "@/components/legal/LegalPage";
import { CLAIM_EMAIL } from "@/lib/guaranteeCopy";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "@/lib/pricing";
import { PrivacyChoicesButton } from "@/components/MarketingChoices";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What Pelvi Health collects when you build a plan, what happens to your pelvic health answers, who we share data with, and how to get everything deleted.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy | Pelvi Health",
    description:
      "What we collect, why, who sees it, and how to get it deleted. Written for a person, not a lawyer.",
    url: "https://pelvi.health/privacy-policy",
    type: "website",
  },
};

const UPDATED = "October 18, 2026";

const SECTIONS = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "health-data", label: "Your health data" },
  { id: "recording", label: "Session recording" },
  { id: "advertising", label: "Advertising" },
  { id: "cookies", label: "Cookies and browser storage" },
  { id: "why", label: "Why we are allowed to" },
  { id: "sharing", label: "Who else sees it" },
  { id: "iphone", label: "If you also use the iPhone app" },
  { id: "where", label: "Where your data is kept" },
  { id: "how-long", label: "How long we keep it" },
  { id: "delete", label: "How to delete everything" },
  { id: "rights", label: "Your rights" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="For pelvi.health and the Pelvic Floor &amp; Core Coach app."
      updated={UPDATED}
    >
      <Summary>
        <p className="!mt-0">
          <strong>The short version.</strong> The questions in the plan builder stay in your own
          browser until you pay. Paying sends your email, your name if you gave one, and the goal
          you picked to Stripe. Once you sign in, your sessions, your daily check-ins and your
          messages to Coach Mia are stored in Google Firebase. We record website sessions with
          Microsoft Clarity on eligible public pages. Analytics cookies and Google or Meta ad
          measurement can start automatically for eligible visits after a server country check.
          Other undecided visits use cookieless Clarity only. Saved opt-outs and browser privacy
          signals are respected, and email matching is off by default. The
          email address you type in the checkout is kept whether or not you pay, and we may use it
          to write to you and in advertising audiences — never with any health information attached.
          Your pelvic health answers are sensitive data and we treat them that way. We do not sell
          anything about you. Email{" "}
          <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> and we will delete the lot.
        </p>
      </Summary>

      <Contents items={SECTIONS} />

      {/* ------------------------------------------------------------------ */}
      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        Pelvi Health, LLC runs this website, the Pelvi member area at pelvi.health/app, and the
        Pelvic Floor &amp; Core Coach app for iPhone. In data protection language we are the
        controller of the information described here. You can reach us at any time at{" "}
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>.
      </p>
      <p>
        This policy covers pelvi.health and the app. It does not cover Cora, which is a separate
        product with its own policy at <a href="/cora/privacy-policy">pelvi.health/cora/privacy-policy</a>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="what-we-collect">2. What we collect</h2>

      <h3>The questions in the plan builder</h3>
      <p>
        Before you pay, we ask you for a goal, your first name, your age, your height, your weight,
        whether any of four health conditions apply to you, and how active you are. The conditions
        we ask about are pelvic pain, postpartum recovery, bladder leaks and prostate concerns.
        &quot;None of these&quot; is a real answer and it costs you nothing.
      </p>
      <Callout>
        <p className="!mt-0">
          <strong>Those answers do not leave your browser.</strong> They are saved on your own device
          so that you can close the tab and come back to where you were. Nothing is sent to us while
          you are answering them. They are deleted from your browser automatically after 30 days,
          and immediately if you clear your browsing data.
        </p>
      </Callout>
      <p>
        The one exception is the moment you pay. At that point we send Stripe your email address,
        your name if you gave one, and the short code for the goal you chose, for example{" "}
        <strong>bladderLeaks</strong>. The goal code goes on the subscription so that we can honour
        the 90-Day Goal Guarantee, which is a promise about the specific goal you picked. Your age,
        height, weight and health conditions are not sent to Stripe.
      </p>

      <h3>Your email address</h3>
      <p>
        We ask for it once, in the checkout, before you type a card. We need it for the receipt,
        for the billing portal, and to find your subscription again if you change device.
      </p>
      <p>
        <strong>We keep it even if you do not pay.</strong> Entering your address in the checkout
        creates a customer record at Stripe straight away, before any card details are entered, so
        if you change your mind at the card field we still have the address. That is worth saying
        plainly, because nothing on the screen tells you so.
      </p>
      <p>
        We may use it to email you about Pelvi — an offer, a discount, a reason to come back — and
        we may include it in the advertising audiences described in{" "}
        <a href="#advertising">section 5</a>. We do not sell it, and we never attach your goal or
        any other health answer to it. If you would rather we did neither, email{" "}
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> and say so. One line is enough and we
        will not ask why.
      </p>

      <h3>Your payment details</h3>
      <p>
        Payments are handled by Stripe. Your card number is typed into a form Stripe controls and
        it goes straight to Stripe. We never see it and it never touches our servers. What we can
        see afterwards is what Stripe shows us: your name and email, the last four digits, the
        country, and whether the subscription is active.
      </p>

      <h3>Your account</h3>
      <p>
        The member area is signed in with Google, through Firebase Authentication. From that we get
        your verified email address, your name, and your Google profile picture if you have one. We
        do not get your Google password and we cannot read anything else in your Google account.
      </p>

      <h3>What you do inside the member area</h3>
      <ul>
        <li>Which sessions you finished, on which day, and roughly how long you watched.</li>
        <li>Your streak, your best streak and which day of the 90-day plan you are on.</li>
        <li>
          Your daily check-in. Depending on your goal that can include whether you leaked
          yesterday, a pain score, your mood and your energy.
        </li>
        <li>The messages you send Coach Mia, and the replies.</li>
        <li>Exercises you saved, and your goal if you change it.</li>
      </ul>

      <h3>Technical data</h3>
      <p>
        Like every website, ours receives your IP address, your browser and device type, the
        approximate region that IP belongs to, and the page you came from. Cloudflare, which hosts
        this site, uses that to serve pages and to block attacks. Our checkout endpoint also uses
        your IP address to rate limit, so that nobody can hammer it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="health-data">3. Your health data</h2>
      <p>
        Some of what we have described is health information about you. Under UK and EU data
        protection law it is a special category of personal data, protected by Article 9 of the
        GDPR, and it gets stricter treatment than an email address does. We are not going to be
        coy about which parts those are.
      </p>
      <p>The health information we hold is:</p>
      <ul>
        <li>
          <strong>Your goal.</strong> Stopping bladder leaks, easing pelvic pain, recovering
          postpartum, preparing for pregnancy, healing diastasis recti, improving intimacy,
          building core strength or supporting your fitness.
        </li>
        <li>
          <strong>The conditions you ticked</strong> in the plan builder: pelvic pain, postpartum
          recovery, bladder leaks, prostate concerns.
        </li>
        <li>
          <strong>Your age, height and weight</strong>, when the app has them.
        </li>
        <li>
          <strong>Your daily check-ins</strong>, which can record leaks, pain, mood and energy.
        </li>
        <li>
          <strong>Your messages to Coach Mia</strong>, which are often about symptoms.
        </li>
        <li>
          <strong>What you did in the programme</strong>, because a plan built for postpartum
          recovery says something about you just by existing.
        </li>
      </ul>
      <p>
        We collect it for one reason: to build the plan you asked for, to keep it safe for your
        body, and to be able to check a guarantee claim. We do not use it to target ads. We do not
        sell it, we do not trade it, and we do not hand it to data brokers.
      </p>
      <p>
        You choose whether to answer. Nothing in the plan builder is ticked for you, you can answer
        &quot;None of these&quot;, and you can stop at any point. Answering is how you consent to us
        using those answers for your plan. You can withdraw that consent whenever you like, by
        emailing <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> or by following{" "}
        <a href="#delete">section 12</a>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="recording">4. Session recording</h2>
      <p>
        We use <strong>Microsoft Clarity</strong> on eligible public pages of this website.
        When our server country check permits automatic measurement, Clarity can use analytics
        cookies. We record this as an automatic setting, not as your opt-in or acceptance.
        Other undecided visits use cookieless Clarity. A previously saved analytics permission
        can still permit analytics storage. Automatic cookie and ad measurement stay off when
        country eligibility is unknown or restricted, and saved opt-outs and browser privacy
        signals are respected. Clarity can record your visit: the
        pages you open, where you move and tap, how far you scroll, and how long you stay. Those
        recordings can be played back like a video, and they are grouped into heatmaps. We use them
        to find the screens where people get stuck.
      </p>
      <h3>Where it records, and where it does not</h3>
      <p>
        Clarity is limited to a named set of public routes, including the landing pages, the plan
        builder, the plan, the paywall, eligible confirmation pages, the blog and these legal pages.
        New routes are excluded unless they are explicitly added to that public list.
      </p>
      <p>
        <strong>It is switched off inside the member area.</strong> Nothing on /app is recorded, so
        your daily check-ins, your leak and pain scores, your messages to Coach Mia and your billing
        details are never in a session replay. Our own admin screens and private account setup
        routes are excluded too. Pages with known sensitive query parameters, such as an email,
        token or payment intent secret, are excluded before the Clarity tag is loaded.
      </p>

      <h3>What is in a recording</h3>
      <p>
        The plan builder is part of the public site, so a replay of it shows the buttons you tapped,
        which includes the goal you chose and the conditions you ticked. That is health information
        about you, sitting in a Microsoft product, and we would rather tell you than have you find
        out. What you <em>type</em> is masked: your name and your email address are hidden from the
        recording, and the card fields are not ours to record at all, because Stripe draws them in
        its own frame that this site cannot see into.
      </p>
      <p>
        Alongside the replay we attach a few labels so we can find the sessions where people got
        stuck. Those labels are: which step of the plan builder you reached, which goal you chose,
        whether you gave an email address or skipped, <strong>how many</strong> conditions you
        ticked, your activity level, whether you reached the paywall, how far into checkout you
        got, and the error code if a payment failed.
      </p>
      <p>
        <strong>Which conditions you ticked is deliberately not one of those labels.</strong> A
        label is searchable and it outlives the recording, and a searchable list of people by
        pelvic condition is exactly the thing that should not exist. Only the number is stored. We
        also never tell Clarity your name or your email address, so a recording is not filed under
        who you are.
      </p>
      <p>
        Clarity is run by Microsoft. Their notice is at{" "}
        <a href="https://clarity.microsoft.com/terms" target="_blank" rel="noopener noreferrer">
          clarity.microsoft.com/terms
        </a>{" "}
        and their privacy statement is at{" "}
        <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer">
          privacy.microsoft.com/privacystatement
        </a>.
      </p>
      <p>
        Open Privacy settings and choose Turn off website analytics to stop new recordings.
        There is no automatic privacy popup or opt-in control. A previously saved analytics
        denial, Global Privacy Control or Do Not Track keeps Clarity off. We always deny
        Microsoft advertising storage in this integration. You can also block
        <strong> clarity.ms</strong> in your browser. Your plan,
        payment and account work without analytics. Email us to ask for deletion of a past
        recording that can be tied to you.
      </p>
      <PrivacyChoicesButton />

      {/* ------------------------------------------------------------------ */}
      <h2 id="advertising">5. Advertising</h2>
      <p>
        For eligible visits, a server country check can enable advertising measurement
        automatically. A previously saved advertising permission can also remain active.
        An automatic setting does not mean you opted in. When measurement is active, this site
        can load the <strong>Google Ads</strong>
        tag on public pages and the <strong>Meta Pixel</strong> on eligible general pages.
        These tools help measure which ads bring visits and purchases. They can set advertising
        cookies. Automatic cookie and ad measurement stay off when country eligibility is unknown
        or restricted. Saved opt-outs, Global Privacy Control and Do Not Track remain effective.
        We do not load these tags inside the member area, admin screens or payment-secret
        return pages. The Meta Pixel is also excluded from condition-specific landing pages.
      </p>
      <p>
        We do not send Google your health answers, your check-ins or your messages. We do not build
        advertising audiences out of what condition you ticked, and we never will. Google&apos;s own
        rules also forbid us from targeting ads at people based on sensitive health status.
      </p>
      <p>
        You can turn personalised advertising off in your Google account at{" "}
        <a href="https://myadcenter.google.com" target="_blank" rel="noopener noreferrer">
          myadcenter.google.com
        </a>
        , and you can block the tag with any tracker blocker. Nothing on this site depends on it.
      </p>

      <h3>Purchase measurement and optional matching</h3>
      <p>
        When Meta measurement is enabled, our server can send a confirmed first membership
        payment to Meta through its Conversions API. Stripe supplies the amount and currency.
        A transaction code prevents the same payment being counted twice. This can cover the
        first payment and later paid renewals while advertising measurement remains active.
        Where measurement is active,
        the event can include an advertising click or browser identifier, IP address and browser
        type. We send a general website address, not the condition page, health answers or a
        payment secret. We keep an anonymous first-party record that distinguishes automatic
        settings from user choices. Opting out also stops future server purchase reports.
      </p>
      <p>
        Email matching is off by default. It is used only if the integration is eligible and
        your previously saved, separate purchase-matching permission remains active. The current
        privacy settings can turn measurement off and do not offer an opt-in. Automatic
        measurement never enables email matching. If enabled under a separate saved matching
        permission, we normalize your verified receipt
        email and hash it with SHA-256 before sending it to Meta. Meta can compare the hash to
        its users to match a purchase to an ad. Hashing is a matching method, not anonymization.
        This integration does not upload abandoned-checkout email lists.
      </p>
      <p>
        We do not send health goals, assessment answers, check-ins, exercise history or coach
        messages to advertising platforms. We keep Meta’s data-sharing restrictions in place.
        Global Privacy Control and Do Not Track signals keep the new advertising integration off.
      </p>
      <p>
        You can turn future ad measurement or purchase matching off through Privacy settings. This does not remove
        events already delivered to an advertising platform. To request deletion or help with
        a past event, email <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="cookies">6. Cookies and browser storage</h2>
      <p>Here is everything this site puts on your device, and what each thing is for.</p>
      <ul>
        <li>
          <strong>Your plan builder answers.</strong> Stored by us in your browser, so you can
          finish later. Cleared after 30 days.
        </li>
        <li>
          <strong>Whether you have an active subscription.</strong> Stored by us in your browser so
          the app does not lock you out for the two seconds it takes to ask Stripe. It is only ever
          a cache. Stripe is always asked for the real answer.
        </li>
        <li>
          <strong>Your sign-in.</strong> Firebase Authentication stores a token so you are not
          asked to sign in on every visit.
        </li>
        <li>
          <strong>Microsoft Clarity cookies</strong> (named <strong>_clck</strong> and{" "}
          <strong>_clsk</strong>), which tie the pages of one visit together, can be used for an
          eligible automatic measurement setting or a previously saved analytics-storage
          permission. Other undecided visits use Clarity without these analytics cookies.
        </li>
        <li>
          <strong>Google Ads cookies</strong> (including <strong>_gcl_au</strong>), which measure
          whether an ad led to a signup, are used only while eligible automatic measurement or
          a saved advertising permission is active.
        </li>
        <li>
          <strong>Meta advertising cookies</strong> (such as <strong>_fbp</strong> and <strong>_fbc</strong>),
          used only while eligible automatic measurement or a saved advertising permission is
          active, to connect eligible visits and purchases to ads.
        </li>
        <li>
          <strong>Measurement settings and privacy choices.</strong> Stored for up to 180 days
          with a random first-party code. An eligible automatic setting can create this code;
          it is marked as automatic and is not a record of your acceptance. Explicit choices are
          marked as user choices. An essential denial cookie helps retain an opt-out
          if your browser blocks local storage. Opening Privacy settings does not save a choice.
          These records do not contain health answers.
        </li>
        <li>
          <strong>Stripe cookies</strong> on the checkout, which Stripe uses to detect fraud.
        </li>
      </ul>
      <p>
        You can clear all of it from your browser settings at any time. Clearing it signs you out
        and loses your unfinished plan builder answers. It does not cancel a subscription and it
        does not delete anything we hold about you. For that, see{" "}
        <a href="#delete">section 12</a>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="why">7. Why we are allowed to</h2>
      <p>
        If you are in the UK or the EU, the law wants us to name a legal basis for each thing we
        do. In plain terms:
      </p>
      <ul>
        <li>
          <strong>Your plan, your account and your subscription:</strong> we need this information
          to give you the thing you are paying for. That is a contract with you.
        </li>
        <li>
          <strong>Your health answers, check-ins and messages:</strong> your consent, given by
          answering, and withdrawable at any time.
        </li>
        <li>
          <strong>Session recording and analytics:</strong> your consent where local law requires
          it, and otherwise our interest in a website that works. You can opt out as described in{" "}
          <a href="#recording">section 4</a>.
        </li>
        <li>
          <strong>Advertising measurement:</strong> your consent where local law requires it, and
          otherwise our interest in knowing which ads are worth paying for.
        </li>
        <li>
          <strong>Emailing you about Pelvi, and the advertising audiences in{" "}
          <a href="#advertising">section 5</a>:</strong> your consent where local law requires it,
          and otherwise our legitimate interest in reaching people who came to us of their own
          accord and in not paying to advertise at people who have already bought. You can object
          at any time, and objecting is the end of it — there is no balancing test on our side and
          nothing to argue about.
        </li>
        <li>
          <strong>Fraud prevention, rate limiting and security:</strong> our legitimate interest in
          not being attacked, and our legal duty to keep your data safe.
        </li>
        <li>
          <strong>Receipts, tax records and refund claims:</strong> our legal obligations.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2 id="sharing">8. Who else sees it</h2>
      <p>
        We do not sell your personal information, and we do not hand it to anybody so that they can
        advertise their own products. We do use your email address to advertise ours, and{" "}
        <a href="#advertising">section 5</a> says exactly how. These are the companies that handle
        it on our behalf, and what each one gets.
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> takes the payment. It gets your name, email, card details, the
          goal code, and your billing country. Stripe is the company that actually cancels your
          plan and issues your refund.{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            stripe.com/privacy
          </a>
        </li>
        <li>
          <strong>Google</strong> does four jobs. Three are Firebase: it signs you in, it stores
          your member record and your check-ins and your Coach Mia messages in Firestore, and it
          serves the exercise videos. The fourth is advertising: the Google Ads tag, which measures
          our advertising, and — if and when we upload an audience as described in{" "}
          <a href="#advertising">section 5</a> — a scrambled form of your email address.{" "}
          <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">
            firebase.google.com/support/privacy
          </a>
        </li>
        <li>
          <strong>Meta</strong> receives eligible advertising measurement only while an eligible
          automatic setting or saved advertising permission is active. A hashed receipt email is included only under the
          separate matching conditions in <a href="#advertising">section 5</a>. We do not send
          health answers or private member activity to Meta.
        </li>
        <li>
          <strong>Microsoft</strong> runs Clarity, described in <a href="#recording">section 4</a>.
        </li>
        <li>
          <strong>Cloudflare</strong> hosts the website and runs the small server functions that
          talk to Stripe. It sees the traffic, including your IP address.{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
            cloudflare.com/privacypolicy
          </a>
        </li>
        <li>
          <strong>Apple</strong>, if you subscribed inside the iPhone app rather than here. Apple
          takes that payment and Apple handles that cancellation. We are told that a subscription
          exists, not your card details.
        </li>
      </ul>
      <p>
        Inside our own company, member records are visible to our staff through an admin dashboard,
        because somebody has to be able to answer &quot;where is my refund&quot;. Access is limited
        to the people who need it.
      </p>
      <p>
        We will also hand over data if a court or the law requires it, or if we have to in order to
        protect somebody from serious harm. If our business is ever sold, your data would move with
        it, and this policy would move with it too.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="iphone">9. If you also use the iPhone app</h2>
      <p>
        The app and the website are one product. If you use both, we join the two records{" "}
        <strong>by your verified email address</strong>. That is the only key we have: the app does
        not ask you to sign in, and the website signs you in with Google, so the addresses are what
        match.
      </p>
      <p>
        Practically, that means when you sign in here with a Google account whose address matches
        the address in the app, we adopt the record the app already made. Your streak, your history
        and your day count carry over instead of starting again. It also means the same record is
        readable from both places.
      </p>
      <p>
        If you do not want the two joined, sign in here with a different email address, or tell us
        and we will keep them apart.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="where">10. Where your data is kept</h2>
      <p>
        We are a United States company and our data is processed in the United States. Stripe,
        Google, Microsoft and Cloudflare all operate globally, so your data may be handled in more
        than one country.
      </p>
      <p>
        If you are in the UK or the EU, that means your data leaves your country. Each of those
        companies covers those transfers with the safeguards the law provides for, which in
        practice means Standard Contractual Clauses and, for the US companies, the EU-US Data
        Privacy Framework. If you want the detail for a particular one, ask us and we will point
        you at their paperwork.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="how-long">11. How long we keep it</h2>
      <ul>
        <li>
          <strong>Plan builder answers, in your browser:</strong> 30 days, then they delete
          themselves.
        </li>
        <li>
          <strong>Your member record, sessions, check-ins and Coach Mia messages:</strong> for as
          long as you have an account. If you cancel and do not come back, we delete it after 24
          months. You can ask us to do it sooner and we will.
        </li>
        <li>
          <strong>Payment and refund records:</strong> Stripe keeps these, and so do we, for as long
          as tax and accounting law requires. In the United States that is generally seven years.
          We cannot shorten this one, even if you ask.
        </li>
        <li>
          <strong>Clarity recordings:</strong> Microsoft deletes these on its own schedule, which is
          currently 30 days. We cannot extend it.
        </li>
        <li>
          <strong>Support emails:</strong> 24 months, so we can see the history if you write again.
        </li>
        <li>
          <strong>An email address entered in the checkout that never became a subscription:</strong>{" "}
          Stripe keeps that customer record, and we keep the address for the purposes in{" "}
          <a href="#advertising">section 5</a>, until you ask us to delete it. Ask and we will,
          including from any advertising audience we have uploaded it to.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2 id="delete">12. How to delete everything</h2>
      <p>
        Email <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a> from the address on your account
        and ask us to delete your data. That is the whole process. There is no form and we will not
        try to talk you out of it.
      </p>
      <p>Within 30 days we will:</p>
      <ol>
        <li>Delete your member record, your sessions, your check-ins and your Coach Mia messages.</li>
        <li>Cancel any active subscription, so you are not charged again.</li>
        <li>Delete your Stripe customer record, apart from what tax law makes us keep.</li>
        <li>Ask Microsoft to delete Clarity recordings that can be tied to you.</li>
      </ol>
      <p>
        To clear what is on your own device, clear this site&apos;s data in your browser settings.
        If you have the iPhone app, delete the app as well.
      </p>
      <p>
        Deleting is not the same as cancelling. If you only want to stop the payments, open the You
        tab in the member area and tap Manage or cancel. See the{" "}
        <a href="/terms">Terms</a> for how that works.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="rights">13. Your rights</h2>
      <p>Wherever you live, you can ask us to:</p>
      <ul>
        <li>tell you what we hold about you, and give you a copy;</li>
        <li>correct anything that is wrong;</li>
        <li>delete it;</li>
        <li>send it to you or to somebody else in a portable file;</li>
        <li>stop using it for something, including analytics and advertising;</li>
        <li>withdraw a consent you gave, without it affecting what we did before you did.</li>
      </ul>
      <p>
        Ask at <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>. We answer within 30 days. We
        will not charge you and we will not give you a worse service for asking.
      </p>
      <p>
        <strong>If you are in the UK or the EU:</strong> you can also complain to your data
        protection authority. In the UK that is the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
          ico.org.uk
        </a>
        . We would rather you gave us the chance to fix it first, but it is your right either way.
      </p>
      <p>
        <strong>If you are in California:</strong> you have the rights above under the CCPA, plus
        the right not to be discriminated against for using them. We do not sell or share personal
        information as those words are defined in that law, and we do not use sensitive personal
        information to infer anything about you.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="children">14. Children</h2>
      <p>
        Pelvi is for adults. It is not for anyone under 18, we do not aim any of it at children,
        and we do not knowingly collect their information. If you think a child has given us
        something, email us and we will delete it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="security">15. Security</h2>
      <p>
        Everything is sent over an encrypted connection. Card details never reach us. Member records
        are protected by rules that only let you read your own, and the billing endpoints will not
        answer unless you prove who you are with a signed token from Google.
      </p>
      <p>
        We will not pretend to be unbreakable, because nobody is. If something did go wrong and your
        data was exposed, we will tell you and the regulator inside the time the law allows.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="changes">16. Changes to this policy</h2>
      <p>
        If we change what we do, we will change this page and move the date at the top. If the
        change is a significant one, and especially if it affects your health data, we will email
        you before it takes effect rather than quietly editing the page.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 id="contact">17. Contact</h2>
      <p>
        Write to <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>. A person reads it. That
        address is also the one for refunds, for guarantee claims and for anything else, so you
        never have to work out which inbox you need.
      </p>
      <p>
        For the money side of things, including how to cancel and exactly what the {DEFAULT_PRICE_LABEL}{" "}
        a {DEFAULT_PRICE_PERIOD} subscription and the 90-Day Goal Guarantee promise, read the{" "}
        <a href="/terms">Terms</a>.
      </p>
    </LegalPage>
  );
}

// ---------------------------------------------------------------------------
// OWNER NOTES. None of these are on the page, on purpose: they are decisions
// that are yours to make, and inventing an answer here would be inventing a
// promise. Each one names what the page currently says so you can see the gap.
//
//  1. LEGAL ENTITY AND POSTAL ADDRESS. The page names "Pelvi Health, LLC",
//     which is what the landing page footer and the Cora policy already say.
//     GDPR Article 13 wants the controller's identity AND contact details; an
//     email address is accepted, a registered address is stronger, and Google
//     Ads reviewers look for one. Give me the state of registration and the
//     business address and I will add a line to section 1.
//
//  2. PRIVACY CONTROLS. MarketingChoices opens only on an explicit request and
//     can only turn measurement off. The shared lifecycle may record an eligible
//     server-country-informed automatic setting with analytics/advertising on
//     and matching off. It must retain basis: automatic, never label that as a
//     user opt-in, and preserve explicit opt-outs/GPC/DNT. Other undecided visits
//     use cookieless Clarity. Prior user permissions remain distinct. Google/Meta
//     gates remain separate; Microsoft Ads storage remains denied. Keep sections
//     4 and 5 in sync.
//
//  2b. SECTION 4 IS A DESCRIPTION OF lib/analytics.js. Every specific claim in
//     it maps to a line of that file: the allowlist, data-clarity-mask on the
//     two email fields, trackHealthAnswers storing condition_count rather than
//     the ids, and the absence of any clarity("identify") call. If somebody
//     widens ALLOWED_PREFIXES to "/", or tags a condition id, or calls
//     identify, this page becomes false the same day. Treat that file and this
//     section as one change.
//
//  3. EXPLICIT CONSENT FOR ARTICLE 9 DATA. Section 3 says answering is how you
//     consent. That is honest and it is the truth of what the screen does, but
//     Article 9(2)(a) asks for EXPLICIT consent for health data, which usually
//     means an unticked box and a sentence. components/funnel/HealthInfoScreen.js
//     has neither. One line under the conditions list, with a link to this page,
//     would make it airtight and would cost roughly nothing in conversion.
//
//  4. NOBODY SENDS A PLAN EMAIL. The funnel used to ask for an address mid-flow
//     and promise the plan and the written guarantee by email; that screen has
//     been removed, and no sending system exists anywhere in this repo. The one
//     address the site collects is entered at checkout. Stripe sends the receipt
//     and is already a named processor. When you wire up any other sender
//     (Resend, Postmark, Mailchimp, whatever), it becomes a processor and it has
//     to be named in section 8.
//
//  4b. SECTION 2 AND SECTION 5 NOW PROMISE MARKETING YOU HAVE NOT DONE YET, AND
//     THAT IS DELIBERATE. /admin has an Audience tab that lists every captured
//     address and exports it as a CSV for Google Customer Match and Meta Custom
//     Audiences, so the CAPABILITY is live even though no list has been uploaded.
//     Disclosing before the first upload rather than after is the only order that
//     is honest, which is why both sections say "may" and say plainly that
//     nothing has been uploaded yet. Two things to keep true:
//
//       * The moment you DO upload one, the words "We have not uploaded any list
//         yet" in section 5 become false. Change them that day.
//       * Section 5 promises no health information ever travels with a marketing
//         list. functions/api/audience.js enforces it by not returning the goal
//         at all, and lib/adminAudience.js has no goal column. If somebody adds
//         one back, this page becomes a lie and Google's sensitive-category
//         policy is breached at the same time. Treat those two files and that
//         section as one change, the way section 4 and lib/analytics.js are.
//
//     There is also no unsubscribe mechanism yet beyond emailing you, which is
//     what both sections say. A sender like Resend brings a real one; wire it up
//     before the first bulk send, not after.
//
//  5. THE AGE FLOOR CONTRADICTS ITSELF. This page and the Terms both say 18 and
//     over. components/funnel/funnelState.js sets AGE_RANGE.min to 16, so a
//     16 year old can complete the plan builder and reach the paywall. Either
//     raise the floor to 18 or lower the claim. Do not leave them disagreeing:
//     a policy that says "we do not knowingly collect from under 18s" beside a
//     picker that offers 16 is the kind of thing a regulator quotes back.
//
//  6. RETENTION PERIODS ARE COMMITMENTS, NOT OBSERVATIONS. "24 months after you
//     stop", "seven years for tax", "24 months for support email": these are
//     ordinary and defensible, and they are now published, so somebody has to
//     actually run them. Nothing in this repo deletes anything on a schedule.
//     A quarterly manual sweep is enough at this size. Diarise it.
//
//  7. THE DELETION PROMISE NEEDS A HUMAN. Section 12 promises deletion within
//     30 days including a Clarity deletion request to Microsoft. That is a real
//     commitment with no tooling behind it. The Firestore side is a handful of
//     document deletes; the Clarity side is a support request. Know how to do
//     both before the first request arrives.
//
//  8. INTERNATIONAL TRANSFERS. Section 10 names Standard Contractual Clauses
//     and the EU-US Data Privacy Framework, which is accurate for Stripe,
//     Google, Microsoft and Cloudflare as of today. It is a statement about
//     their paperwork, not about yours. If you ever sign a DPA of your own,
//     keep copies where you can find them.
// ---------------------------------------------------------------------------
