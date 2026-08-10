"use client";

// The landing page, from tablet width upwards.
//
// Below 704px this whole tree is display:none and the phone keeps the funnel's
// welcome card, byte for byte. Above it, what a visitor used to get was a 400px
// phone card floating in a pink void: the first thing seen, before a word is
// read, on the one screen we pay to fill. So the same offer is laid out as a
// page instead. Hero, what she gets, the guarantee, the proof, one way in.
//
// EVERY CLAIM HERE IS A STRING THAT ALREADY SHIPS. The headline, benefits and
// quotes come from ./copy, which is the funnel's port of the iOS strings; the
// guarantee lines come from lib/guaranteeCopy.js and the plan list from
// lib/paywallCopy.js. Connective words are new, promises are not, because a
// promise made on this page has to be honoured on a refund claim.
//
// No dates. Every dated guarantee line is computed from `new Date()`, and this
// page is prerendered at build time, so a date baked into the export would be
// wrong by morning and would tear on hydration. Day 7 and day 90 are named on
// the paywall, after mount, where they are correct.

import React from "react";
import {
  Check, MonitorPlay, Shield, Timer, TrendingUp, Zap,
} from "lucide-react";

import { GOALS } from "@/lib/program";
import {
  BADGE_TITLE, COVERAGE_TITLE, LADDER_LINE, MILESTONE_CARD_BODY,
  MILESTONE_CARD_TITLE, coverageBody,
} from "@/lib/guaranteeCopy";
import { SHOWCASE_TITLE, showcaseItems } from "@/lib/paywallCopy";
import {
  GOAL_HEADLINE, GOAL_SUBTITLE, MEMBER_COUNT_TO, TESTIMONIALS,
  WELCOME_BENEFITS, WELCOME_CTA, WELCOME_HEADLINE_A11Y, WELCOME_HEADLINE_LINES,
  WELCOME_SUBHEADLINE, memberCountLine,
} from "./copy";
import SFIcon from "./icons";

// The five glyphs the default showcase asks for. Deliberately a local map and
// not an import from Paywall.jsx: that file is the money screen, it pulls in
// Stripe, and the landing page must not carry a byte of it. Same lucide
// choices, so the two screens draw the same picture for the same word.
const SHOWCASE_ICONS = {
  bolt: Zap,
  timer: Timer,
  videos: MonitorPlay,
  progress: TrendingUp,
  shield: Shield,
};

// The type scale keeps a rem term in the middle of every clamp. `clamp(2rem,
// 4vw, 3.5rem)` is locked to the viewport and does not grow when the reader
// zooms, which fails WCAG 1.4.4; the rem term is what keeps zoom working.
const HERO_TITLE = { fontSize: "clamp(2.125rem, 1.55rem + 1.75vw, 3.375rem)" };
const SECTION_TITLE = { fontSize: "clamp(1.625rem, 1.35rem + 0.85vw, 2.25rem)" };
const LEAD = { fontSize: "clamp(1.0625rem, 1rem + 0.28vw, 1.25rem)" };

/**
 * The one button shape on this page.
 *
 * `size` is a prop rather than an override passed through className, because
 * Tailwind resolves a class collision by the order the rules land in the
 * stylesheet, not by the order they appear on the element: "h-14 h-12" gives
 * you h-14 every time. Nothing here ever emits two heights.
 */
function StartButton({ onStart, size = "lg", className = "", children }) {
  const metrics =
    size === "sm" ? "h-12 px-6 text-[15px]" : "h-14 px-8 text-[17px]";
  // shrink-0 and whitespace-nowrap below are not decoration: in the two-pane
  // hero this button shares a flex row with the member count line, and without
  // them a 1024px iPad in landscape folded the label onto two lines.
  return (
    <button
      type="button"
      onClick={() => onStart()}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[28px] bg-gradient-to-b from-ios-pink to-ios-pink/85 font-bold text-white shadow-[0_8px_24px_rgba(255,45,85,0.30)] transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${metrics} ${className}`}
    >
      {children || WELCOME_CTA}
    </button>
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

function Quote({ quote }) {
  return (
    <figure className="flex h-full flex-col rounded-[22px] border border-app-borderIdle bg-app-surface p-6 shadow-[0_4px_16px_rgba(26,26,38,0.05)]">
      <blockquote className="flex-1 text-[16px] leading-[1.5] text-app-textPrimary">
        <em className="not-italic">&ldquo;{quote.text}&rdquo;</em>
      </blockquote>
      <figcaption className="mt-4 text-[14px] font-semibold text-app-textSecondary">
        {quote.author}
      </figcaption>
    </figure>
  );
}

/**
 * @param {object} props
 * @param {Function} props.onStart
 * @param {boolean} [props.returning]  this browser already carries a live paid
 *   entitlement, so the top-right pair stops offering to sell her the thing she
 *   is already being charged for. The page below it stays a marketing page,
 *   because a member may legitimately be reading it; what changes is the one
 *   control that is always on screen.
 */
export default function LandingScreen({ onStart, returning = false }) {
  // "✓ Day 7: any reason   ✓ Day 30: still not sure   ✓ Day 90: didn't hit your
  // goal" is one string on iOS, split on its run of spaces here so the three
  // rungs can be three rows. The words are untouched.
  const rungs = LADDER_LINE.split(/\s{3,}/).filter(Boolean).map((r) => r.replace(/^✓\s*/, ""));
  const coverage = coverageBody(null).split("\n").map((line) => line.replace(/^•\s*/, ""));
  const plan = showcaseItems(null);

  return (
    // fixed, not a block in the flow, for the same reason the funnel frame is:
    // the root layout caps its column at 1152px for the member app's benefit,
    // and a marketing page whose section backgrounds stop dead at 1152px looks
    // broken. This owns the viewport and scrolls inside itself, exactly as the
    // funnel card does. The body is already overflow:hidden, so nothing else
    // was scrolling anyway.
    <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-app-background text-app-textPrimary">
      {/* sticky, not fixed. iOS 26 has an open bug where Safari refuses to
          render fixed and sticky content that falls under its floating bottom
          controls, and sticky in flow is the version of this that survives it.
          The top padding tracks the safe area so the bar clears the notch when
          an iPad is held in the orientation that has one. */}
      <header className="sticky top-0 z-40 border-b border-app-borderIdle/70 bg-white/85 pt-[var(--sat)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between gap-4 px-6 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:h-[72px] lg:px-10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-[10px] object-contain"
            />
            <span className="text-[17px] font-bold tracking-[-0.2px]">Pelvi Health</span>
          </div>
          <div className="flex items-center gap-4 lg:gap-5">
            <GuaranteeBadge className="hidden lg:inline-flex" />
            {/* Every real product has this in the top right, and this one had it
                nowhere. A member who lands on the marketing page, because that
                is what she bookmarked or what the ad pointed at, had no route to
                her own plan except through the funnel that sells it to her
                again. A plain anchor, because /app is a different document. */}
            {returning ? (
              <a
                href="/app"
                className="inline-flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-[28px] bg-gradient-to-b from-ios-pink to-ios-pink/85 px-6 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(255,45,85,0.30)] transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Open your plan
              </a>
            ) : (
              <>
                <a
                  href="/app"
                  className="whitespace-nowrap text-[14px] font-semibold text-app-textPrimary hover:text-app-primaryInk"
                >
                  Log in
                </a>
                <StartButton onStart={onStart} size="sm" />
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-blush">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-24 h-[34rem] w-[34rem] rounded-full bg-brand-roseLight/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-brand-rose/10 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-[72rem] px-6 py-14 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-12 lg:px-10 lg:py-20 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-14">
          <div className="mx-auto max-w-[42rem] text-center lg:mx-0 lg:max-w-none lg:text-left">
            <GuaranteeBadge />

            <h1
              aria-label={WELCOME_HEADLINE_A11Y}
              style={HERO_TITLE}
              className="mt-6 font-bold leading-[1.05] tracking-[-0.02em]"
            >
              {/* Two spans rather than a <br>: below 1024 the two halves flow
                  and wrap wherever the column ends, and from 1024 each becomes
                  a block, which is the line break without a <br> that has to
                  be display-toggled. */}
              <span aria-hidden="true" className="block">
                <span className="lg:block">{WELCOME_HEADLINE_LINES[0]}</span>{" "}
                <span className="lg:block">{WELCOME_HEADLINE_LINES[1]}</span>
              </span>
            </h1>

            <p
              style={LEAD}
              className="mx-auto mt-5 max-w-[34rem] leading-[1.45] text-app-textSecondary lg:mx-0"
            >
              {WELCOME_SUBHEADLINE}
            </p>

            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <StartButton onStart={onStart} className="w-full sm:w-auto" />
              <p className="text-[14px] leading-snug text-app-textSecondary">
                {memberCountLine(MEMBER_COUNT_TO)}
              </p>
            </div>

            <ul className="mt-10 grid gap-4 text-left sm:grid-cols-3 lg:gap-5">
              {WELCOME_BENEFITS.map((benefit) => (
                <li key={benefit.text} className="flex gap-3 lg:flex-col lg:gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/80 shadow-[0_2px_8px_rgba(198,58,92,0.10)]">
                    <SFIcon name={benefit.icon} size={19} className="text-ios-pink" strokeWidth={2} />
                  </span>
                  <span className="text-[15px] font-medium leading-snug">{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The panel that gives the surround a job.
              Quotes rather than the plan list: the plan gets its own section
              two screens down, and a hero that says the same thing twice on
              one screen reads as a page that has lost its place.
              Desktop only. On a tablet this would push the CTA below the fold,
              which is the one thing the hero cannot afford. */}
          <aside className="hidden lg:block">
            <div className="rounded-[28px] border border-white/70 bg-white/75 p-7 shadow-[0_24px_60px_rgba(198,58,92,0.16)] backdrop-blur-sm">
              <ul className="space-y-6">
                {[0, 4, 8].map((i) => (
                  <li key={TESTIMONIALS[i].text} className="border-b border-app-borderIdle pb-6 last:border-b-0 last:pb-0">
                    <p className="text-[15px] leading-relaxed">
                      <em className="not-italic">&ldquo;{TESTIMONIALS[i].text}&rdquo;</em>
                    </p>
                    <p className="mt-2 text-[14px] font-semibold text-app-textSecondary">
                      {TESTIMONIALS[i].author}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* ---------------------------------------------------------------- goals */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[72rem] px-6 py-16 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:px-10 lg:py-20">
          <div className="mx-auto max-w-[38rem] text-center">
            <h2 style={SECTION_TITLE} className="font-bold leading-[1.1] tracking-[-0.02em]">
              {GOAL_HEADLINE}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-app-textSecondary">
              {GOAL_SUBTITLE}
            </p>
          </div>

          {/* Real buttons, not decoration. Each one starts the funnel on the
              goal screen with that goal already chosen, so the tap she just
              made is the answer to the first question rather than a scroll
              back to a generic CTA. */}
          <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {GOALS.map((goal) => (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => onStart(goal.id)}
                  className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-app-borderIdle px-4 py-6 text-center transition-all duration-200 hover:-translate-y-[2px] hover:border-ios-pink hover:shadow-[0_10px_24px_rgba(255,45,85,0.16)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  style={{ background: `linear-gradient(160deg, ${goal.from} 0%, ${goal.to} 100%)` }}
                >
                  <span aria-hidden="true" className="text-[30px] leading-none">
                    {goal.emoji}
                  </span>
                  <span className="text-[15px] font-semibold leading-tight">{goal.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ the plan */}
      <section className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto w-full max-w-[72rem] px-6 py-16 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:px-10 lg:py-20">
          <h2
            style={SECTION_TITLE}
            className="mx-auto max-w-[38rem] text-center font-bold leading-[1.1] tracking-[-0.02em]"
          >
            {SHOWCASE_TITLE}
          </h2>

          <ul className="mx-auto mt-10 grid max-w-[64rem] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {plan.map((item) => {
              const Glyph = SHOWCASE_ICONS[item.icon] || Zap;
              return (
                <li
                  key={item.text}
                  className="flex items-start gap-4 rounded-[22px] border border-app-borderIdle bg-app-surface p-6 shadow-[0_4px_16px_rgba(26,26,38,0.05)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-app-primary/10">
                    <Glyph aria-hidden="true" size={21} strokeWidth={2} className="text-app-primary" />
                  </span>
                  <span className="text-[16px] font-medium leading-snug">{item.text}</span>
                </li>
              );
            })}
            <li className="flex items-center rounded-[22px] border-[1.5px] border-dashed border-app-primary/30 bg-app-primary/[0.05] p-6">
              <p className="text-[15px] leading-relaxed text-app-textSecondary">
                {MILESTONE_CARD_BODY}
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- the guarantee */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[72rem] px-6 py-16 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:px-10 lg:py-20">
          <div className="mx-auto max-w-[40rem] text-center">
            <GuaranteeBadge />
            <h2 style={SECTION_TITLE} className="mt-5 font-bold leading-[1.1] tracking-[-0.02em]">
              {MILESTONE_CARD_TITLE}
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-[64rem] gap-5 lg:grid-cols-2">
            {/* No heading over the ladder on purpose. Anything written here
                would be a fourth promise sitting on top of three that are
                already exact, and the exact ones are the ones we have to
                honour. The badge and the heading above frame it. */}
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-7 shadow-[0_10px_30px_rgba(198,58,92,0.10)]">
              <ul className="space-y-4">
                {rungs.map((rung) => (
                  <li key={rung} className="flex items-start gap-3">
                    <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-positive/15">
                      <Check aria-hidden="true" size={13} strokeWidth={3} className="text-app-positiveInk" />
                    </span>
                    <span className="text-[16px] font-medium leading-snug">{rung}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/80 p-7 shadow-[0_10px_30px_rgba(198,58,92,0.10)]">
              <h3 className="text-[17px] font-bold leading-snug">{COVERAGE_TITLE}</h3>
              <ul className="mt-5 space-y-3.5">
                {coverage.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-app-primary"
                    />
                    <span className="text-[15px] leading-relaxed text-app-textSecondary">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- the proof */}
      <section className="border-t border-app-borderIdle bg-app-surface">
        <div className="mx-auto w-full max-w-[72rem] px-6 py-16 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] lg:px-10 lg:py-20">
          <div className="mx-auto max-w-[38rem] text-center">
            <h2 style={SECTION_TITLE} className="font-bold leading-[1.1] tracking-[-0.02em]">
              {memberCountLine(MEMBER_COUNT_TO)}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {TESTIMONIALS.slice(0, 9).map((quote) => (
              <li key={quote.text}>
                <Quote quote={quote} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- the way in */}
      <section className="border-t border-app-borderIdle bg-blush">
        <div className="mx-auto w-full max-w-[48rem] px-6 py-16 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] text-center lg:py-20">
          <h2 style={SECTION_TITLE} className="font-bold leading-[1.1] tracking-[-0.02em]">
            {WELCOME_HEADLINE_LINES[0]} {WELCOME_HEADLINE_LINES[1]}
          </h2>
          <p style={LEAD} className="mx-auto mt-4 max-w-[32rem] leading-[1.45] text-app-textSecondary">
            {WELCOME_SUBHEADLINE}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <StartButton onStart={onStart} className="w-full sm:w-auto" />
            <GuaranteeBadge />
          </div>
        </div>
      </section>

      <footer className="border-t border-app-borderIdle bg-app-background">
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-4 px-6 py-10 pb-[calc(2.5rem+var(--sab))] pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] text-[14px] text-app-textSecondary lg:flex-row lg:items-center lg:justify-between lg:px-10">
          {/* No year. It would be baked in at build time, so it is wrong the
              moment January arrives and it tears on hydration when it is. */}
          <p>© Pelvi Health, LLC</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a className="hover:text-app-textPrimary" href="/blog">Blog</a>
            {/* /privacy-policy and /terms, not the old .html files. Both are
                app router pages now. The files these used to point at
                described a different product at a domain we do not own. */}
            <a className="hover:text-app-textPrimary" href="/privacy-policy">Privacy</a>
            <a className="hover:text-app-textPrimary" href="/terms">Terms</a>
            <a className="hover:text-app-textPrimary" href="mailto:hello@pelvi.health">
              hello@pelvi.health
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
