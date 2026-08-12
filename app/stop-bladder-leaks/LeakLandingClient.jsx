"use client";

// The leak page's client half. Phone first: 98% of the traffic is a phone.
//
// WHY THE PAGE IS SHAPED THE WAY IT IS
//
// She is Problem-Aware, never Unaware. She did not search "bladder leakage
// exercises" to discover she leaks. So the page opens with a division of
// labour settled by the campaign's own search-terms data (Aug 2026: the word
// "exercises" appeared in 178 of 234 paid impressions, "bladder" in 84, and
// every live ad headline promises exercises): the H1 hands back the words she
// typed, because message match is what she scans for in the first second and
// what Quality Score prices; the eyebrow above it carries the pre-suasive
// emotional line; and the subhead carries the reframe (common, not something
// to live with, strengthen the muscles that control your bladder). Then the
// recognition section describes her Tuesday before the product says another
// word.
//
// The emotional spine, in order, and every section below is one beat of it:
//   1. hero          she is in the right place, and there is a way out
//   2. recognition   her exact life, in her own words, so she trusts us
//   3. the pivot     common, not normal, and it answers to training
//   4. why nothing    it was never her fault: pads hide, kegels went uncoached
//      worked
//   5. the method    pelvic floor muscle training, named, with the evidence
//   6. the plan      three steps, finite, 90 days
//   7. what changes  the after state, in specifics
//   8. proof         other women, at her life stage
//   9. offer         price anchored, guarantee in its own block, terms stated
//  10. FAQ           the six objections that actually stop her
//  11. close         "feel like yourself again", then the button
//
// Price is deliberately NOT in the hero. She meets it after the value, the
// method and the proof, which is where a considered health purchase belongs.
// It is stated plainly when it arrives, with the renewal terms, because hiding
// it reads as "too expensive to say" and because Google requires a subscription
// page to disclose price, period and auto-renewal.
//
// EVERY PROMISE IS A STRING THAT ALREADY SHIPS. The goal title, the showcase
// list, the CTA label, the guarantee lines and the quotes are imported from the
// same modules the funnel and paywall read, so this page can never promise
// something the product does not honour. Connective prose is new; claims are
// not.
//
// THE COMPLIANCE RAILS, which are not optional on a health page buying traffic:
//   * No "cure", "eliminate", "stop your leaks", "treatment", "clinically
//     proven". Those trigger Google's Unreliable Claims policy and FTC exposure
//     under the 2022 Health Products Compliance Guidance, which covers apps.
//   * Efficacy is anchored to the METHOD (pelvic floor muscle training, which
//     has Cochrane behind it), never to this app, which has no trial of its own.
//   * Outcome language is probabilistic: "many women", "with consistent
//     training", "fewer leaks". Never an endpoint promised as the likely result.
//   * The guarantee is a REFUND promise. The outcome phrases it hangs on are
//     subjective on purpose (see lib/guaranteeCopy.js). The old hero line
//     "Drier in 90 days, or your whole year back" was this page's own invention
//     and was an outcome-tied guarantee, which 16 CFR 239 treats as a
//     performance claim needing its own substantiation. It is gone.
//   * The Cochrane citation is CD005654: 31 trials, 1,817 women, 14 countries.
//     This page previously said "41 clinical trials", which was wrong. Checked
//     against cochrane.org on 2026-08-12.
//
// MESSAGE MATCH. Landing Page Experience is roughly a third of Quality Score
// and a below-average rating is most often caused by an ad promise the page
// does not repeat. Every live ad headline has a home here: "Bladder Leak Help
// for Women" and "Bladder Leakage Exercises" (hero), "5-Minute Daily Sessions"
// and "Train at Home, No Equipment" and "No Clinic Visits Needed" (hero trust
// row and FAQ), "Built With Women's Health PTs" (method), "Exercises for
// Incontinence" and "Rebuild Pelvic Strength" (method), "90-Day Money-Back
// Guarantee" (offer).
//
// FAST ON PURPOSE. No Stripe, no Firebase, no program or catalog JSON, no hero
// video. The only image is the 18 KB logo at 32px. The LCP element is the H1.
//
// THE CTA IS A LINK INTO THE EXISTING FUNNEL, NOT A FORK OF IT. It navigates to
// /?goal=bladderLeaks. Funnel.js consumes that parameter on mount
// (components/funnel/funnelState.js, consumeGoalParam) and starts her past the
// goal screen with bladderLeaks chosen: the tap on this page IS the answer to
// the goal question, and re-asking what she typed into Google would spend the
// highest-attention moment of the funnel insulting her. Back still reaches the
// goal screen, where her goal sits pre-selected and changeable. The click's own
// query string (gclid and friends) is carried along on the same href, so the
// Purchase conversion still attributes to the ad that earned it.
//
// "See your plan first, no card needed" is a checked claim, not a flourish. The
// funnel order in funnelState.js is goal, howItHelps, intake, health,
// personalizing, planReveal, THEN paywall. She reaches her built plan before
// anything asks her to pay.
//
// House rules apply: no em dashes, no en dashes, plain English.

import React, { useEffect, useRef, useState } from "react";
import { Check, Droplet, MonitorPlay, Shield, Star, Timer, TrendingUp, Zap } from "lucide-react";

import {
  BADGE_TITLE, COVERAGE_TITLE, LADDER_LINE, MILESTONE_CARD_BODY,
  coverageBody,
} from "@/lib/guaranteeCopy";
import { DEFAULT_PRICE_LABEL } from "@/lib/pricing";
import { ctaLabel, showcaseItems } from "@/lib/paywallCopy";
import {
  MEMBER_COUNT_TO, TESTIMONIALS, howItHelps, memberCountLine,
} from "@/components/funnel/copy";
import SFIcon from "@/components/funnel/icons";
import { trackLandingPageView } from "@/lib/analytics";

const GOAL_ID = "bladderLeaks";

// The prerendered href, correct on its own: a visitor whose JavaScript never
// ran still lands in the funnel with her goal chosen. The effect below only
// adds the ad parameters on top.
const BASE_START_HREF = `/?goal=${GOAL_ID}`;

// The same glyph choices the paywall and the desktop landing page make for
// these keys, mapped locally so this page imports neither of those screens.
const SHOWCASE_ICONS = {
  drop: Droplet,
  timer: Timer,
  videos: MonitorPlay,
  progress: TrendingUp,
  shield: Shield,
};

// rem in the middle term so the reader's zoom still grows the type (WCAG
// 1.4.4), exactly as components/funnel/LandingScreen.jsx does.
const H1_SIZE = { fontSize: "clamp(1.75rem, 1.35rem + 1.9vw, 2.75rem)" };
const H2_SIZE = { fontSize: "clamp(1.375rem, 1.2rem + 0.8vw, 1.875rem)" };

// --- The words this page adds on its own ------------------------------------
//
// Kept together, at the top, so the copy can be read and revised as copy rather
// than hunted for inside JSX. Everything here is prose written for this page;
// anything that is a promise about the product is imported above instead.

// Her life, in the specifics she would use herself. Recognition is the whole
// job of this block: she should think "that is my exact Tuesday" before she has
// been asked for anything. Six is the limit. A seventh turns recognition into
// an inventory of her failures.
const RECOGNITION = [
  "You cross your legs before you sneeze.",
  "You know where the bathroom is in every store you walk into.",
  "You wear black. Not because you like black.",
  "There is a spare pair in your bag. Just in case.",
  "You said no to the trampoline with your kids.",
  "You have not told your partner, or your doctor, or your best friend.",
];

// Why she is still leaking, told as four things that were done TO her. Every
// one of these ends with her off the hook. She has been quietly blaming herself
// for years and the page will not get a sale until that is lifted.
const WHY_NOTHING_WORKED = [
  {
    title: "Pads were built to hide it",
    body:
      "They soak up the evidence and leave the cause exactly where it was. That is not a fix, it is a subscription to the problem, and you have been paying it every month for years.",
  },
  {
    title: "Nobody ever coached your kegels",
    body:
      "When researchers watched women do kegels after spoken instructions, only about half got them right, and one in four was pushing down instead of lifting, which can make leaks worse. No one has ever watched you do one and told you whether you lift or push. That is not you failing. That is being handed one word and no instructions.",
  },
  {
    title: "A video is not a plan",
    body:
      "Random squeezes with no order, nothing that gets harder as you get stronger, and no reason to come back tomorrow. You stopped because there was nothing there to keep.",
  },
  {
    title: "You were told it was just your age",
    body:
      "At 32 it was “that is what happens after a baby”. At 45 it was “that is just what happens now”. Leaks are common at both. Common is not the same as permanent.",
  },
];

// The after state, written as a specific day rather than as a stronger pelvic
// floor. Nobody wants a stronger pelvic floor. She wants the trampoline.
const TRANSFORMATION = [
  "A sneeze arrives and you do not brace for it.",
  "You laugh at the joke properly, the whole way through.",
  "You get on the trampoline.",
  "You pack for the day without doing the bathroom math first.",
  "The pads go in the trash, and you do not replace them.",
  "You stop thinking about it, which is the part you actually miss.",
];

// The six objections that genuinely stop her, in the order they occur to her.
// Answers are short and concrete: an FAQ that hedges is worse than no FAQ.
const FAQ = [
  {
    q: "Is this just kegels?",
    a:
      "Kegels are one movement in it. The plan is pelvic floor muscle training: finding the right muscle, working it in the right order, holding and releasing at the right speeds, and getting harder as you get stronger, with your breath and your deep core included because they work as one unit. That structure is the part you have never had.",
  },
  {
    q: "I have tried things before and nothing worked.",
    a:
      "That is the most common thing women tell us, and it is usually because they were given exercises instead of a plan. If 90 days of this does not get you there, you get the year back. The risk sits with us on purpose.",
  },
  {
    q: "Do I need to go to a clinic, or buy anything?",
    a:
      "No. It is your phone, five minutes, at home, in whatever you are already wearing. No equipment, no appointment, no waiting list, and nobody examines you.",
  },
  {
    q: "Will anyone know?",
    a:
      "No. There is nothing to pick up at a store and nothing showing up on your doorstep. Your answers and your progress are yours, and we do not sell them to anyone.",
  },
  {
    q: "Does it work after a baby, or after menopause?",
    a:
      "Both are in scope. They have different causes, birth on one side and falling estrogen on the other, and the plan is built around which one you tell us about, along with your age and how you spend your day.",
  },
  {
    q: "Does it help in the bedroom too?",
    a:
      "The same muscles run both, which is why intimacy is one of the eight goals Pelvi trains. Your plan builds control, relaxation and feeling together, so what improves for the sneeze tends to improve there too.",
  },
  {
    q: "I do not have five spare minutes.",
    a:
      "You already spend more than five minutes a day on this. Finding the bathroom, choosing the dark pants, packing the spare pair, deciding not to go. This asks for less time than the leaks are already taking.",
  },
];

/**
 * The funnel href with the ad click's own query string carried along.
 *
 * gclid has to survive this hop: gtag on "/" reads it off the landing URL and
 * writes the attribution cookie the Purchase conversion is later matched
 * against (see the note at the foot of lib/openPlanScript.js). gtag also runs
 * on THIS document, so the cookie is normally written before she ever taps,
 * but an ad blocker or a fast thumb can beat it, and carrying the parameters
 * costs nothing.
 */
function useStartHref() {
  const [href, setHref] = useState(BASE_START_HREF);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("goal", GOAL_ID);
      setHref(`/?${params.toString()}`);
    } catch {
      // The base href still enters the funnel with the goal chosen; only the
      // ad parameters are lost, and only for a browser that broke URLSearchParams.
    }
  }, []);
  return href;
}

/**
 * THE STICKY CTA's on switch. The page is around 8,500px tall on a phone and
 * nearly all of its traffic is a thumb on a phone, so the button must never be
 * a scroll away. The bar shows once the hero's own button has left the screen
 * and steps aside while the closing section's button is visible, so there are
 * never two identical buttons stacked on top of each other.
 *
 * IntersectionObserver against the viewport: the page's scroll container is a
 * fixed element that fills the viewport exactly, so the default root sees the
 * same geometry. If IO is missing (it is baseline in every browser this page
 * supports), the bar simply never shows and the three inline buttons carry the
 * page, which is exactly what shipped before the bar existed.
 */
function useStickyCta(heroCtaRef, closeRef) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = heroCtaRef.current;
    const close = closeRef.current;
    if (!hero || !close || typeof IntersectionObserver === "undefined") return undefined;
    let heroIn = true;
    let closeIn = false;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroIn = entry.isIntersecting;
        if (entry.target === close) closeIn = entry.isIntersecting;
      }
      setShow(!heroIn && !closeIn);
    });
    io.observe(hero);
    io.observe(close);
    return () => io.disconnect();
  }, [heroCtaRef, closeRef]);
  return show;
}

/** The one button shape on this page. A plain anchor: "/" is a new document.
 *
 * Deep pink, not ios-pink. White 17px text on #FF2D55 measures about 3.6:1,
 * under the 4.5:1 WCAG 1.4.3 minimum, and half this page's audience is 45 to
 * 60 years old reading a phone. The repo already defines primaryInk #C0374F at
 * 5.38:1 on white for exactly this reason (see tailwind.config.js), so the
 * gradient runs primaryInk into a 10% darker stop: same pill, same white
 * label, every stop past 5:1. The button she meets next inside the funnel is
 * still ios-pink, and the two read as the same brand pink; only the pale end
 * of the old gradient is gone. */
function StartLink({ href, children, className = "" }) {
  return (
    <a
      href={href}
      className={`inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-pill bg-gradient-to-b from-app-primaryInk to-[#A93046] px-8 text-[17px] font-bold text-white shadow-[0_8px_24px_rgba(192,55,79,0.35)] transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none xs:w-auto ${className}`}
    >
      {children || ctaLabel(GOAL_ID)}
    </a>
  );
}

/**
 * The line that rides under every button. Three friction removers in the order
 * she worries about them: it costs nothing to look, it is private, and she is
 * not trapped. Repeated at every CTA because a woman who scrolls to the bottom
 * before tapping should not have to scroll back up to be reassured.
 */
function CtaReassurance({ className = "" }) {
  return (
    <p className={`text-[13px] leading-snug text-app-textSecondary sm:text-[14px] ${className}`}>
      See your plan first. No card needed. Cancel anytime.
    </p>
  );
}

/**
 * The paywall's own rating stat ("4.9, App Store Rating", one gold star,
 * Paywall.jsx line 312), carried onto this page by the owner's explicit
 * decision so the doorway and the checkout wear the same number. Ratings
 * displays are among the strongest-evidenced conversion elements for
 * considered purchases (Spiegel Research Center), and this page showed none.
 */
function RatingBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Star size={15} className="text-ios-yellow" fill="currentColor" aria-hidden="true" />
      <span className="text-[14px] font-bold">4.9</span>
      <span className="text-[13px] text-app-textSecondary sm:text-[14px]">App Store rating</span>
    </span>
  );
}

function GuaranteeBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-app-primary/20 bg-app-primary/10 px-3.5 py-1.5 ${className}`}
    >
      <Shield aria-hidden="true" size={13} strokeWidth={2.4} className="text-app-primary" />
      {/* primaryInk, not primary: 12px of #E65473 on blush measures 3.4:1. */}
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-app-primaryInk">
        {BADGE_TITLE}
      </span>
    </span>
  );
}

export default function LeakLandingClient() {
  const startHref = useStartHref();
  const heroCtaRef = useRef(null);
  const closeRef = useRef(null);
  const stickyShown = useStickyCta(heroCtaRef, closeRef);

  // The page's own rung, 00_lp_leaks, one notch below the funnel's 01_landing.
  // It is what lets the owner split sessions by doorway in Clarity: paywall
  // rates for sessions carrying this tag against sessions that start at
  // 01_landing is the whole LP-versus-homepage question.
  useEffect(() => {
    trackLandingPageView(GOAL_ID);
  }, []);

  // Warm the funnel document while she reads. The CTA is a plain anchor into a
  // new document on purpose, which means the tap pays a full navigation; a
  // prefetch hint during idle time makes that navigation start from cache.
  // Best effort by design: rel=prefetch is a hint the browser may ignore, and
  // if it does, the tap simply costs what it costs today.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/";
    link.as = "document";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const leaks = howItHelps(GOAL_ID);
  const plan = showcaseItems(GOAL_ID);
  // Same split the desktop landing page does: one iOS string, three rows.
  const rungs = LADDER_LINE.split(/\s{3,}/).filter(Boolean).map((r) => r.replace(/^✓\s*/, ""));
  const coverage = coverageBody(GOAL_ID).split("\n").map((line) => line.replace(/^•\s*/, ""));
  // Four leak quotes from the protected set, byte for byte, chosen for three
  // jobs. 8 is the trampoline, the most emotionally loaded line we own. 9 is
  // Marianne at 54: she answers the "I will start and quit" objection out loud
  // AND she is the only quote speaking for the perimenopausal half of this
  // audience, who will not see themselves in a 37 year old.
  //
  // TESTIMONIALS[5] is deliberately NOT here even though it is a great leak
  // quote, because it is also attributed to "Priya, 37" and running it next to
  // 8 put the same woman on the wall twice. Ages now read 46, 37, 54, 39.
  const quotes = [TESTIMONIALS[1], TESTIMONIALS[8], TESTIMONIALS[9], TESTIMONIALS[0]];

  return (
    // fixed and self-scrolling for the same reason the funnel frame is: the
    // root layout caps its column at 1152px for the member app's benefit, and
    // a marketing page whose backgrounds stop dead at 1152px looks broken.
    <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-app-background text-app-textPrimary">
      <header className="border-b border-app-borderIdle/70 bg-white/85 pt-[var(--sat)]">
        <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center gap-2.5 px-5 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:h-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-[9px] object-contain"
          />
          <span className="text-[16px] font-bold tracking-[-0.2px]">Pelvi Health</span>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero
          One message and one action. The eyebrow is the pre-suasive line: it
          gets a silent yes out of her before a single word of product, and it
          is the reason the H1 lands as relief rather than as advertising. */}
      <section className="relative overflow-hidden bg-blush">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-24 hidden h-[26rem] w-[26rem] rounded-full bg-brand-roseLight/25 blur-3xl tab:block"
        />
        <div className="relative mx-auto w-full max-w-[42rem] px-5 pb-9 pt-7 text-center pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:pb-14 tab:pt-12">
          <p className="text-[14px] font-semibold leading-snug text-app-primaryInk sm:text-[15px]">
            You have probably never said this out loud.
          </p>

          <h1 style={H1_SIZE} className="mt-2.5 font-bold leading-[1.08] tracking-[-0.02em]">
            Pelvic floor exercises for bladder leaks. Five minutes a day, at
            home.
          </h1>

          <p className="mx-auto mt-3.5 max-w-[32rem] text-[15px] leading-[1.45] text-app-textSecondary sm:text-[17px]">
            Bladder leaks are common, and you do not have to live with them.
            Your plan is built with women&apos;s health physical therapists to
            strengthen the muscles that control your bladder. No clinic visit,
            no equipment, and nobody has to know.
          </p>

          <div ref={heroCtaRef} className="mt-6 flex flex-col items-center gap-3">
            <StartLink href={startHref} />
            <CtaReassurance />
            {/* Risk reversal at the first decision point. VWO's UnderstandQuran
                test put the money-back line at the sign-up moment for +32.6%
                sales; this page held its guarantee until the offer section,
                three screens down. One line, no outcome promise. */}
            <p className="text-[13px] font-semibold leading-snug text-app-primaryInk sm:text-[14px]">
              Backed by a 90-day money-back guarantee.
            </p>
          </div>

          <div className="mt-5 flex flex-col items-center gap-1.5">
            <RatingBadge />
            <p className="text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
              {memberCountLine(MEMBER_COUNT_TO)}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- recognition
          The most important block on the page. She has spent years assuming
          nobody knows what this is actually like. Six specifics prove we do,
          and that is what buys the right to sell her anything. */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            You have built a whole life around this
          </h2>

          <ul className="mx-auto mt-7 max-w-[34rem] space-y-2.5">
            {RECOGNITION.map((line) => (
              <li
                key={line}
                className="rounded-[16px] border border-app-borderIdle bg-app-background px-4 py-3.5 text-[15px] font-medium leading-snug sm:text-[16px]"
              >
                {line}
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-7 max-w-[34rem] text-center text-[17px] font-bold leading-snug sm:text-[19px]">
            You did not just change your plans. Little by little, you made
            yourself smaller.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------- the pivot
          Pain to hope, in one short block. In the stigma research this exact
          sentence, that it is common, is what lifts the shame, and the shame is
          what has kept her from doing anything about it for years. Everything
          after this point is allowed to be hopeful. */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[40rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] text-center sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
            Here is what nobody told you
          </h2>
          <p className="mx-auto mt-4 max-w-[34rem] text-[16px] leading-[1.55] sm:text-[18px]">
            About one woman in three lives with this. You are not unusual, you
            are not careless, and there is nothing wrong with you. Common is not
            the same as normal, and it is not the same as permanent. The pelvic
            floor is muscle, and what feels like a weak bladder is often weak
            muscle underneath it. Muscle gets stronger when you train it, at 32
            and at 62.
          </p>

          {/* THE BREADCRUMB. An easy, anonymous, self-descriptive question as
              a micro-commitment in the longest CTA-free stretch of the page.
              KlientBoost's published breadcrumb cases run from +214% to a
              twenty-fold lift on cold paid traffic: the first yes costs
              nothing, and the big yes follows more easily. Each chip IS the
              funnel link, so tapping her answer starts the quiz; the leakType
              parameter rides along in the URL for analytics and for the day
              the funnel wants to consume it, and is harmlessly ignored today.
              Chip answers map to the three clinical patterns (stress, urge,
              mixed) without using those words on her. */}
          <div className="mx-auto mt-8 max-w-[24rem]">
            <p className="text-center text-[16px] font-bold leading-snug sm:text-[17px]">
              Quick question. When do leaks show up for you?
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {[
                { label: "When I cough, sneeze, or laugh", type: "stress" },
                { label: "When I suddenly have to go", type: "urge" },
                { label: "Honestly, both", type: "mixed" },
              ].map((chip) => (
                <a
                  key={chip.type}
                  href={`${startHref}&leakType=${chip.type}`}
                  className="flex min-h-[52px] items-center justify-center rounded-pill border-2 border-app-primary/45 bg-white px-5 text-center text-[15px] font-semibold text-app-primaryInk transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none sm:text-[16px]"
                >
                  {chip.label}
                </a>
              ))}
            </div>
            <p className="mt-3 text-center text-[13px] leading-snug text-app-textSecondary">
              Tap the one that sounds like you. It starts your plan. No card
              needed.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- why nothing worked
          Her objection is not "does this work", it is "nothing works for me".
          That belief has to be dismantled before an offer can land, and the
          only way to dismantle it is to explain her past failures back to her
          in a way where none of them are her fault. */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <div className="mx-auto max-w-[36rem] text-center">
            <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
              It is not that you failed at this
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              You were never actually given a plan. Here is what you were given
              instead.
            </p>
          </div>

          <ul className="mx-auto mt-8 max-w-[36rem] space-y-4">
            {WHY_NOTHING_WORKED.map((item) => (
              <li
                key={item.title}
                className="rounded-[20px] border border-app-borderIdle bg-app-background p-5"
              >
                <h3 className="text-[16px] font-bold leading-snug sm:text-[17px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-app-textSecondary">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- the method
          The new mechanism, named, with the evidence attached to the METHOD and
          not to this app. Note the careful seam in the second paragraph: the
          trial numbers describe what pelvic floor muscle training did in
          Cochrane's trials, and the sentence that follows says only that this
          is the method Pelvi teaches. It never claims those results for Pelvi. */}
      <section className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <div className="mx-auto max-w-[36rem] text-center">
            <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
              What actually works has a name
            </h2>
            <p className="mt-4 text-[16px] leading-[1.55] sm:text-[17px]">
              Pelvic floor muscle training. Finding the right muscle, working it
              in the right order, holding and letting go at the right speeds, and
              making it harder as you get stronger. It is the first thing a
              women&apos;s health physical therapist teaches for bladder leaks, and it is the
              most studied approach there is.
            </p>
          </div>

          <div className="mx-auto mt-7 max-w-[36rem] rounded-[20px] border border-app-borderIdle bg-app-surface p-5">
            <p className="text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              Cochrane, the independent group doctors rely on to weigh medical
              evidence, pooled 31 trials covering 1,817 women across 14
              countries. Among the women doing pelvic floor muscle training for
              stress incontinence, the leaks that come with a sneeze, a laugh
              or a run, 74% reported they were better or their symptoms had
              gone, against 11% of the women who were not doing it. The reviewers
              concluded it belongs in first line care, and that side effects were
              rare and minor.
            </p>
            {/* The guideline line welds the page's two strongest assets into
                one argument: the method is first line care in national
                guidance (NICE NG123: supervised pelvic floor muscle training
                of at least 3 months, first line for stress or mixed UI), and
                the 90 day plan and guarantee are that protocol, not a number
                we invented. No claim that NICE endorses this app. */}
            <p className="mt-3.5 text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              Clinical guidelines, including the UK&apos;s National Institute
              for Health and Care Excellence, recommend at least three months
              of pelvic floor muscle training as first line treatment for
              stress and mixed bladder leaks in women. That is why your plan
              and your guarantee both run the full 90 days.
            </p>
            <p className="mt-3.5 text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              That is the method. Pelvi is that method, built with
              women&apos;s health physical therapists into 500+ short video sessions and
              arranged into a 90 day plan around your age, your body and your
              day. Results are not the same for everyone, which is what the
              guarantee below is for.
            </p>
            {/* The named expert. Nerva converts on Dr Simone Peters of Monash;
                an unnamed "built with physical therapists" is a claim, a named
                board certified specialist is a person. Dr. Reed is the
                reviewer named across the owner's blog (32 of 53 posts), added
                here on his instruction. WCS is the ABPTS board certification
                in women's health, spelled out because the initials mean
                nothing to a lay reader. */}
            <p className="mt-3.5 border-t border-app-borderIdle pt-3.5 text-[14px] leading-relaxed text-app-textSecondary sm:text-[15px]">
              <span className="font-semibold text-app-textPrimary">
                Reviewed by Dr. Evelyn Reed, DPT, WCS,
              </span>{" "}
              a doctor of physical therapy, board certified in women&apos;s
              health.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- how it works */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            How your plan works
          </h2>

          <ol className="mx-auto mt-8 max-w-[36rem] space-y-5">
            {[
              {
                title: "Tell Coach Mia about you",
                body: "Coach Mia asks a few quiet questions about your body and your day, then builds your 90 day plan around exactly what you tell her. It takes about a minute, and nobody sees the answers but you.",
              },
              {
                title: "See your plan before you pay",
                body: "Your 90 days, built around what you just told us, on screen before anything asks you for a card.",
              },
              {
                title: "Five minutes a day, for three months",
                body: MILESTONE_CARD_BODY,
              },
            ].map((step, i) => (
              <li key={step.title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-primary/10 text-[15px] font-bold text-app-primaryInk">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold leading-snug">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-app-textSecondary">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col items-center gap-3">
            <StartLink href={startHref} />
            <CtaReassurance />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the plan */}
      <section className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            Your personalized plan includes
          </h2>
          <ul className="mx-auto mt-7 max-w-[32rem] space-y-3">
            {plan.map((item) => {
              const Glyph = SHOWCASE_ICONS[item.icon] || Zap;
              return (
                <li
                  key={item.text}
                  className="flex items-center gap-3.5 rounded-[18px] border border-app-borderIdle bg-app-surface px-4 py-3.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-app-primary/10">
                    <Glyph aria-hidden="true" size={19} strokeWidth={2} className="text-app-primary" />
                  </span>
                  <span className="text-[15px] font-medium leading-snug sm:text-[16px]">
                    {item.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- what changes
          The after state twice over: the six shipped tiles, which are the
          product's own promise, then the specific day in prose, which is what
          she is actually buying. */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          {/* NOT plan[0].text here. That string is already the first row of the
              showcase list in the section directly above, and rendering it
              again as this heading put the identical sentence on screen twice
              in a row. This section is the after state, so it gets the after
              state's own name. */}
          <div className="mx-auto max-w-[36rem] text-center">
            <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
              What you get back
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              {leaks.subtitle}
            </p>
          </div>

          <ul className="mx-auto mt-8 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-3 tab:gap-4">
            {leaks.tiles.map((tile) => (
              <li
                key={tile.text}
                className="flex flex-col items-center gap-2.5 rounded-[18px] border border-app-borderIdle bg-app-background px-3 py-5 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-app-primary/10">
                  <SFIcon name={tile.icon} size={20} className="text-app-primary" strokeWidth={2} />
                </span>
                <span className="text-[14px] font-medium leading-snug sm:text-[15px]">
                  {tile.text}
                </span>
              </li>
            ))}
          </ul>

          <ul className="mx-auto mt-9 max-w-[34rem] space-y-2.5">
            {TRANSFORMATION.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-positive/15">
                  <Check aria-hidden="true" size={13} strokeWidth={3} className="text-app-positiveInk" />
                </span>
                <span className="text-[15px] leading-snug sm:text-[16px]">{line}</span>
              </li>
            ))}
          </ul>

          {/* THE INTIMACY CALLOUT. Every buyer of this app arrives through some
              door, and intimacy is the single most chosen goal in the funnel,
              so the overlap deserves to be said rather than implied. It lives
              here, in the after state, and NOT in the H1: the headline's job
              is to repeat the ad she clicked ("bladder leakage exercises"),
              and diluting that costs Quality Score on every click. The
              mechanism claim is anatomical fact (one set of muscles does both
              jobs), and the outcome is carried by a quote from the protected
              set, byte for byte, covered by the typicality line below. */}
          <aside className="mx-auto mt-6 max-w-[34rem] rounded-[20px] border border-app-primary/25 bg-blush p-5">
            <h3 className="text-[16px] font-bold leading-snug sm:text-[17px]">
              And the part nobody says out loud
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
              The muscles that stop the leaks are the same muscles that matter
              in the bedroom. Train one and you have trained the other.
            </p>
            <figure className="mt-3.5 border-l-2 border-app-primary/40 pl-3.5">
              <blockquote className="text-[15px] leading-snug sm:text-[16px]">
                <em className="not-italic">&ldquo;{TESTIMONIALS[2].text}&rdquo;</em>
              </blockquote>
              <figcaption className="mt-1 text-[13px] font-semibold text-app-textSecondary">
                {TESTIMONIALS[2].author}
              </figcaption>
            </figure>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------- the proof */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          {/* Not memberCountLine again: that exact sentence is already the
              trust line under the hero CTA, and repeating it word for word as
              a section heading read as a copy-paste slip. Consensus persuades
              hardest when the crowd looks like the reader, so the heading says
              who these women are rather than how many of them there are. */}
          <h2 style={H2_SIZE} className="mx-auto max-w-[36rem] text-center font-bold leading-[1.15] tracking-[-0.02em]">
            Women who were exactly where you are
          </h2>
          <div className="mt-3 flex justify-center">
            <RatingBadge />
          </div>
          <ul className="mx-auto mt-8 grid max-w-[64rem] gap-4 sm:grid-cols-2 tab:grid-cols-4">
            {quotes.map((quote) => (
              <li key={quote.text}>
                <figure className="flex h-full flex-col rounded-[20px] border border-white/70 bg-white/85 p-5 shadow-[0_8px_24px_rgba(198,58,92,0.08)]">
                  <blockquote className="flex-1 text-[15px] leading-[1.5] sm:text-[16px]">
                    <em className="not-italic">&ldquo;{quote.text}&rdquo;</em>
                  </blockquote>
                  <figcaption className="mt-3 text-[14px] font-semibold text-app-textSecondary">
                    {quote.author}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          {/* The typicality line the FTC's Endorsement Guides ask for when a
              quote shows a faster-than-typical result ("Zero leaks by week
              2"). One sentence, and it hands the boldness straight to the
              guarantee, which is the promise we actually control. */}
          <p className="mx-auto mt-6 max-w-[36rem] text-center text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
            Every quote is one member&apos;s experience. Results vary, and that is
            what the guarantee below is for.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------- the offer
          Price meets her here and nowhere earlier, anchored against the two
          things she is already paying: pads forever, and the physio visit she
          has been avoiding. The renewal terms are stated in the same breath,
          which ROSCA requires and which is also simply how you keep the trust
          the rest of the page just built. */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <div className="text-center">
            <GuaranteeBadge />
            {/* Not MILESTONE_CARD_TITLE. The shipped string is "Week 6 is the
                milestone. Day 90 is the promise.", and inside the funnel the
                plan reveal has already established what week 6 means. Here
                nothing has, so "Week 6" was an unexplained number sitting
                directly above the refund rungs, where it could be misread as
                one more condition. The page renders only the half it has
                earned. The shipped string itself is untouched. */}
            <h2 style={H2_SIZE} className="mt-4 font-bold leading-[1.15] tracking-[-0.02em]">
              Day 90 is the promise.
            </h2>
          </div>

          <div className="mx-auto mt-7 max-w-[36rem] space-y-4">
            {/* Price, anchored. The comparison is the argument: she is already
                spending money on this problem, just in a form that never ends. */}
            <div className="rounded-[20px] border border-app-primary/25 bg-blush p-5 text-center">
              <p className="text-[15px] leading-relaxed text-app-textSecondary sm:text-[16px]">
                Women with regular leaks spend about $500 a year on pads and
                extra laundry, and that was measured in 2005 dollars. Year
                after year, and none of it was ever going to change anything.
                One session with a pelvic floor physical therapist often costs
                $150 or more, a full course takes weeks of visits, and step one
                is telling a stranger everything you have never said out loud.
              </p>
              <p className="mt-4 text-[19px] font-bold leading-snug sm:text-[21px]">
                Pelvi is {DEFAULT_PRICE_LABEL} for the year. Around 41 cents a
                day.
              </p>
              {/* $492/365 is $1.35 a day against our $0.41: "about triple" is
                  accurate and rounds in the conservative direction. Gourville's
                  pennies-a-day research says the per-day frame works best when
                  it stands next to a small ongoing expense, which is exactly
                  what the pads line above just established. */}
              <p className="mt-1.5 text-[14px] leading-snug text-app-textSecondary sm:text-[15px]">
                In that 2005 study, women spent about triple that just managing
                the problem.
              </p>
              <p className="mt-2.5 text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
                Billed once, renews yearly, cancel anytime.
              </p>
              <div className="mt-3 flex justify-center">
                <RatingBadge />
              </div>
            </div>

            {/* One human voice at the money moment. VWO's WikiJob test moved
                plain testimonials to the decision point for +34% purchases
                while the same quotes lower on the page moved nothing, so
                placement, not volume, is the lever. TESTIMONIALS[7] is the one
                protected quote that answers the exact question she is asking
                this card ("is this worth paying for?") and the only leak-fit
                quote not already used above, so nothing on the page repeats. */}
            <figure className="rounded-[20px] border border-app-borderIdle bg-blush/60 p-4">
              <blockquote className="text-center text-[15px] leading-snug sm:text-[16px]">
                <em className="not-italic">&ldquo;{TESTIMONIALS[7].text}&rdquo;</em>
              </blockquote>
              <figcaption className="mt-1.5 text-center text-[13px] font-semibold text-app-textSecondary">
                {TESTIMONIALS[7].author}
              </figcaption>
            </figure>

            {/* The three rungs used to sit here bare, and a reader who has not
                memorised the iOS guarantee had no way to know what "Day 7: any
                reason" was a list OF. Three unlabelled checkmarks read as
                cryptic tiers, not as what they are: three separate days on
                which she qualifies for the same full refund. So the card now
                says what the list is before the list starts. The rung strings
                themselves are shipped iOS copy and stay byte for byte. */}
            <div className="rounded-[20px] border border-app-borderIdle bg-app-background p-5">
              <h3 className="text-[16px] font-bold leading-snug">
                Three ways to get all of it back
              </h3>
              {/* No "email us" here. A refund that starts with "email" reads
                  like a refund that starts with an argument. The mechanics
                  live in the coverage card below; this line's only job is
                  that the money comes back. */}
              <p className="mt-1.5 text-[14px] leading-relaxed text-app-textSecondary sm:text-[15px]">
                Any one of these gets you the full {DEFAULT_PRICE_LABEL} back.
                No forms, no phone calls, no hoops.
              </p>
              <ul className="mt-4 space-y-3">
                {rungs.map((rung) => (
                  <li key={rung} className="flex items-start gap-3">
                    <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-positive/15">
                      <Check aria-hidden="true" size={13} strokeWidth={3} className="text-app-positiveInk" />
                    </span>
                    <span className="text-[15px] font-medium leading-snug">{rung}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[20px] border border-app-borderIdle bg-app-background p-5">
              <h3 className="text-[16px] font-bold leading-snug">{COVERAGE_TITLE}</h3>
              <ul className="mt-4 space-y-3">
                {coverage.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-app-primary"
                    />
                    <span className="text-[14px] leading-relaxed text-app-textSecondary sm:text-[15px]">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The button belongs HERE, not only after the FAQ. This is peak
              intent on the page: she has just been given the price, the anchor
              that makes it look small, and the promise that she gets it back.
              Without this she has to scroll past six questions she may not
              have to find a way to act on a decision she has already made. */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <StartLink href={startHref} />
            <CtaReassurance />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the questions
          Native details elements: they are keyboard and screen reader correct
          for free, they cost no JavaScript, and a closed answer does not push
          the final CTA off the bottom of the page. */}
      <section className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-11 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            The things women ask us first
          </h2>

          <ul className="mx-auto mt-7 max-w-[36rem] space-y-3">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="group rounded-[18px] border border-app-borderIdle bg-app-surface px-4 open:pb-4">
                  {/* list-none kills the triangle in Chrome and Firefox; Safari
                      needs the webkit pseudo element named explicitly. */}
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-bold leading-snug [&::-webkit-details-marker]:hidden sm:text-[16px]">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[20px] font-normal leading-none text-app-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-[15px] leading-relaxed text-app-textSecondary">
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- the way in
          The summit line, then the button under it. Nothing else competes at
          this point: no price, no new argument, no third idea. She has read the
          whole page and the only thing left to give her is the reason she came. */}
      {/* closeRef wraps the close AND the footer: if it sat on the close
          section alone, scrolling past it into the footer would bring the bar
          back up over the legal links, the one place it must never sit. */}
      <div ref={closeRef}>
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[42rem] px-5 py-12 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] text-center sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
            Feel like yourself again
          </h2>
          <p className="mx-auto mt-3.5 max-w-[32rem] text-[16px] leading-[1.5] text-app-textSecondary sm:text-[17px]">
            Five minutes tonight, at home, with nobody watching. Ninety days from
            now you could be the woman who sneezes and does not think about it.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <StartLink href={startHref} />
            <CtaReassurance />
            {/* The hero's member line again, word for word, so the last thing
                under the last button is the crowd she is joining. */}
            <p className="text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
              {memberCountLine(MEMBER_COUNT_TO)}
            </p>
            <GuaranteeBadge className="mt-1" />
          </div>
        </div>
      </section>

      <footer className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-8 pb-[calc(2rem+var(--sab))] pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] text-[14px] text-app-textSecondary sm:px-6">
          {/* Not medical advice, said plainly. She is making a health decision
              on the strength of this page and is owed the boundary. */}
          <p className="mx-auto max-w-[44rem] text-center text-[13px] leading-relaxed">
            Pelvi Health is an exercise program, not a medical service, and
            nothing here is medical advice or a diagnosis. If your leaking is
            new, painful, bloody, or comes with a fever, please see a doctor
            first.
          </p>
          <div className="mt-6 flex flex-col gap-2 border-t border-app-borderIdle pt-6 tab:flex-row tab:items-center tab:justify-between">
            {/* No year: it would be baked in at build time and wrong by January. */}
            <p>© Pelvi Health, LLC</p>
            <nav className="flex flex-wrap items-center gap-x-6">
              <a className="inline-flex min-h-[44px] items-center underline-offset-2 hover:text-app-textPrimary" href="/privacy-policy">Privacy</a>
              <a className="inline-flex min-h-[44px] items-center underline-offset-2 hover:text-app-textPrimary" href="/terms">Terms</a>
              <a className="inline-flex min-h-[44px] items-center underline-offset-2 hover:text-app-textPrimary" href="mailto:contact@pelvi.health">
                contact@pelvi.health
              </a>
            </nav>
          </div>
        </div>
      </footer>
      </div>

      {/* ------------------------------------------------- the sticky CTA
          Slides up once the hero button is gone, steps aside for the closing
          button, and is inert (aria-hidden, no pointer events) while off
          screen so it can never trap a screen reader or a stray tap. */}
      <div
        aria-hidden={!stickyShown}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-app-borderIdle bg-white/95 pb-[max(0.75rem,var(--sab))] pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] pt-3 backdrop-blur transition-transform duration-300 motion-reduce:transition-none ${
          stickyShown ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        {/* GoodUI's sticky-bar pattern (28 tests): winning bars pair the value
            line with the button rather than shipping a bare button. One line,
            above the pill so the thumb never covers it: the guarantee, the
            per-day price, the no-card promise. */}
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-2">
          {/* One line on every real phone (287px rendered, 335px available at
              375). Only a 320px screen wraps it, and it wraps whole. */}
          <p className="text-center text-[12px] font-medium leading-snug text-app-textSecondary">
            90-day money-back guarantee &middot; 41&cent;/day &middot; no card
          </p>
          <StartLink href={startHref} className="xs:!w-full" />
        </div>
      </div>
    </div>
  );
}
