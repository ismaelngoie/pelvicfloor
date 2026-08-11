"use client";

// The leak page's client half. Phone first: 98% of the traffic is a phone, so
// the whole offer (H1, proof, guarantee, price, one CTA) fits in the first
// screenful of a 375x812 viewport, and everything below it exists for the
// minority who scroll before they tap.
//
// EVERY PROMISE HERE IS A STRING THAT ALREADY SHIPS. The goal title, the
// showcase list, the CTA label, the guarantee lines and the quotes are all
// imported from the same modules the funnel and paywall read, so this page can
// never promise something the product does not honour. Connective words are
// new; claims are not. The two lines this page adds on its own ("Drier in 90
// days, or your whole year back", the Cochrane sentence) are guarantee-framed
// and evidence-framed on purpose: the money-back promise carries the boldness,
// and pelvic floor muscle training is the one method in this category with
// genuine Cochrane-grade support behind it.
//
// FAST ON PURPOSE. No Stripe, no Firebase, no program or catalog JSON, no
// hero video, no butterflies. The only image is the 18 KB logo at 36px. The
// LCP element is the H1 itself.
//
// THE CTA IS A LINK INTO THE EXISTING FUNNEL, NOT A FORK OF IT. It navigates
// to /?goal=bladderLeaks. Funnel.js consumes that parameter on mount
// (components/funnel/funnelState.js, consumeGoalParam) and starts her past the
// goal screen with bladderLeaks chosen: the tap on this page IS the answer to
// the goal question, and re-asking what she typed into Google would spend the
// highest-attention moment of the funnel insulting her. Back still reaches the
// goal screen, where her goal sits pre-selected and changeable. The click's
// own query string (gclid and friends) is carried along on the same href, so
// the Purchase conversion still attributes to the ad that earned it.
//
// House rules apply: no em dashes, no en dashes, plain English.

import React, { useEffect, useState } from "react";
import { Check, Droplet, MonitorPlay, Shield, Timer, TrendingUp, Zap } from "lucide-react";

import {
  BADGE_TITLE, COVERAGE_TITLE, LADDER_LINE, MILESTONE_CARD_BODY,
  MILESTONE_CARD_TITLE, coverageBody,
} from "@/lib/guaranteeCopy";
import { DEFAULT_PRICE_LABEL } from "@/lib/pricing";
import { ctaLabel, showcaseItems } from "@/lib/paywallCopy";
import {
  MEMBER_COUNT_TO, TESTIMONIALS, WELCOME_BENEFITS, howItHelps, memberCountLine,
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

/** The one button shape on this page. A plain anchor: "/" is a new document. */
function StartLink({ href, children, className = "" }) {
  return (
    <a
      href={href}
      className={`inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-pill bg-gradient-to-b from-ios-pink to-ios-pink/85 px-8 text-[17px] font-bold text-white shadow-[0_8px_24px_rgba(255,45,85,0.30)] transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none xs:w-auto ${className}`}
    >
      {children || ctaLabel(GOAL_ID)}
    </a>
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

  // The page's own rung, 00_lp_leaks, one notch below the funnel's 01_landing.
  // It is what lets the owner split sessions by doorway in Clarity: paywall
  // rates for sessions carrying this tag against sessions that start at
  // 01_landing is the whole LP-versus-homepage question.
  useEffect(() => {
    trackLandingPageView(GOAL_ID);
  }, []);

  const leaks = howItHelps(GOAL_ID);
  const plan = showcaseItems(GOAL_ID);
  // Same split the desktop landing page does: one iOS string, three rows.
  const rungs = LADDER_LINE.split(/\s{3,}/).filter(Boolean).map((r) => r.replace(/^✓\s*/, ""));
  const coverage = coverageBody(GOAL_ID).split("\n").map((line) => line.replace(/^•\s*/, ""));
  // The three quotes about leaks, byte for byte from the protected set.
  const quotes = [TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[5]];

  const priceLine = `${DEFAULT_PRICE_LABEL} for the full year. Less than one physio visit.`;

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
          The whole offer in one phone screenful: headline, proof, guarantee,
          honest price, one thumb-reachable CTA. Nothing above the button that
          a 375x812 viewport cannot fit. */}
      <section className="relative overflow-hidden bg-blush">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-24 hidden h-[26rem] w-[26rem] rounded-full bg-brand-roseLight/25 blur-3xl tab:block"
        />
        <div className="relative mx-auto w-full max-w-[42rem] px-5 pb-9 pt-6 text-center pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:pb-14 tab:pt-12">
          <GuaranteeBadge />

          <h1 style={H1_SIZE} className="mt-4 font-bold leading-[1.08] tracking-[-0.02em]">
            The pelvic floor exercise plan built to stop bladder leaks
          </h1>

          <p className="mx-auto mt-3 max-w-[30rem] text-[15px] leading-[1.4] text-app-textSecondary sm:text-[17px]">
            5 minutes a day, with 500+ videos approved by physios, in a plan
            made for your body.
          </p>

          <p className="mt-3 text-[15px] font-semibold text-app-primaryInk sm:text-[16px]">
            Drier in 90 days, or your whole year back.
          </p>

          <div className="mt-5 flex flex-col items-center gap-3">
            <StartLink href={startHref} />
            <p className="text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
              {priceLine}
            </p>
            <p className="text-[13px] leading-snug text-app-textSecondary sm:text-[14px]">
              {memberCountLine(MEMBER_COUNT_TO)}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- what changes
          The six leak tiles the funnel's own "how Pelvi helps" screen shows,
          fronted by its subtitle. Shipped words, laid out as a page. */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <div className="mx-auto max-w-[36rem] text-center">
            <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
              {plan[0].text}
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
        </div>
      </section>

      {/* ------------------------------------------------- how it works */}
      <section className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            How your plan works
          </h2>

          <ol className="mx-auto mt-8 max-w-[36rem] space-y-5">
            {[
              {
                title: "Tell Coach Mia about you",
                body: "A few quick questions about your body and your day. It takes about a minute.",
              },
              {
                title: "Get your 90-day plan",
                body: WELCOME_BENEFITS[0].text,
              },
              {
                title: "Keep it for three months",
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

          {/* The evidence line. The method, not the app, is what the research
              backs, and that is exactly how it is phrased. */}
          <p className="mx-auto mt-8 max-w-[36rem] rounded-[18px] border border-app-borderIdle bg-app-surface p-5 text-[14px] leading-relaxed text-app-textSecondary sm:text-[15px]">
            The exercises are pelvic floor muscle training, the same method
            pelvic health physios teach in clinic. It is the most studied
            approach for stress leaks, supported by a Cochrane review of 41
            clinical trials.
          </p>

          <div className="mt-8 flex justify-center">
            <StartLink href={startHref} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the plan */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="text-center font-bold leading-[1.15] tracking-[-0.02em]">
            Your personalized plan includes
          </h2>
          <ul className="mx-auto mt-7 max-w-[32rem] space-y-3">
            {plan.map((item) => {
              const Glyph = SHOWCASE_ICONS[item.icon] || Zap;
              return (
                <li
                  key={item.text}
                  className="flex items-center gap-3.5 rounded-[18px] border border-app-borderIdle bg-app-background px-4 py-3.5"
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

      {/* ------------------------------------------------- the proof */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="mx-auto max-w-[36rem] text-center font-bold leading-[1.15] tracking-[-0.02em]">
            {memberCountLine(MEMBER_COUNT_TO)}
          </h2>
          <ul className="mx-auto mt-8 grid max-w-[64rem] gap-4 sm:grid-cols-3">
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
            Every quote is one member's experience. Results vary, and that is
            what the guarantee below is for.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------- the guarantee */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[44rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] sm:px-6 tab:py-16">
          <div className="text-center">
            <GuaranteeBadge />
            <h2 style={H2_SIZE} className="mt-4 font-bold leading-[1.15] tracking-[-0.02em]">
              {MILESTONE_CARD_TITLE}
            </h2>
          </div>

          <div className="mx-auto mt-7 max-w-[36rem] space-y-4">
            <div className="rounded-[20px] border border-app-borderIdle bg-app-background p-5">
              <ul className="space-y-3">
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
        </div>
      </section>

      {/* ------------------------------------------------- the way in */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[42rem] px-5 py-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] text-center sm:px-6 tab:py-16">
          <h2 style={H2_SIZE} className="font-bold leading-[1.15] tracking-[-0.02em]">
            Ready to stop planning your day around a bathroom?
          </h2>
          <p className="mx-auto mt-3 max-w-[30rem] text-[15px] leading-[1.4] text-app-textSecondary sm:text-[16px]">
            {priceLine}
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <StartLink href={startHref} />
            <GuaranteeBadge />
          </div>
        </div>
      </section>

      <footer className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-2 px-5 py-8 pb-[calc(2rem+var(--sab))] pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] text-[14px] text-app-textSecondary sm:px-6 tab:flex-row tab:items-center tab:justify-between">
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
      </footer>
    </div>
  );
}
