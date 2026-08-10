"use client";

// The left pane of the funnel on a desktop, from 1280px up.
//
// The question column deliberately does not grow. Every piece of adjacent
// evidence says widening a form column costs completions, and these screens are
// built thumb first with pinned footers and 56px buttons, so stretching one
// across a monitor makes a considered layout look broken. What changes with the
// viewport is the frame around it, and an empty frame is the actual defect: not
// the whitespace, the fact that the whitespace has no job.
//
// So this pane gets one, and it changes as she moves:
//
//   goal, howItHelps          the promise and who else is here
//   intake, health            her plan so far, filling in as she answers
//   personalizing and after   what the plan contains, and the guarantee
//
// It is decorative in the strict sense: every word here is either repeated
// inside the card or is an answer she just typed, so a screen reader that never
// reaches it loses nothing. It is hidden below 1280px, where a second column
// would only squeeze the first.

import React from "react";
import { Check, MonitorPlay, Shield, Timer, TrendingUp, Zap } from "lucide-react";

import { goalById } from "@/lib/program";
import { BADGE_TITLE } from "@/lib/guaranteeCopy";
import { SHOWCASE_TITLE, showcaseItems } from "@/lib/paywallCopy";
import {
  MEMBER_COUNT_TO, TESTIMONIALS, WELCOME_BENEFITS, WELCOME_HEADLINE_LINES,
  WELCOME_SUBHEADLINE, memberCountLine,
} from "./copy";
import { STEP, activityPhrase, conditionPhrase, feetInchesLabel, lbsToKg, inchesToCm } from "./funnelState";
import SFIcon from "./icons";

// Same five glyphs the paywall draws for the same five words. Kept local for
// the same reason as in LandingScreen: importing from Paywall.jsx would drag
// Stripe into a screen that has no checkout on it.
const SHOWCASE_ICONS = {
  bolt: Zap,
  timer: Timer,
  videos: MonitorPlay,
  progress: TrendingUp,
  shield: Shield,
};

const SKIN = {
  light: {
    title: "text-app-textPrimary",
    body: "text-app-textSecondary",
    strong: "text-app-textPrimary",
    card: "border-white/70 bg-white/70 shadow-[0_16px_44px_rgba(198,58,92,0.12)]",
    rule: "border-app-borderIdle",
    accent: "text-ios-pink",
    badgeBox: "border-app-primary/20 bg-app-primary/10",
    badgeText: "text-app-primaryInk",
  },
  dark: {
    title: "text-white",
    body: "text-white/60",
    strong: "text-white/90",
    card: "border-white/10 bg-white/[0.06] shadow-[0_16px_44px_rgba(0,0,0,0.35)]",
    rule: "border-white/10",
    accent: "text-ios-pink",
    badgeBox: "border-white/15 bg-white/10",
    badgeText: "text-white/80",
  },
};

function Badge({ skin }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 ${skin.badgeBox}`}
    >
      <Shield aria-hidden="true" size={13} strokeWidth={2.4} className={skin.accent} />
      <span className={`text-[12px] font-semibold uppercase tracking-[0.06em] ${skin.badgeText}`}>
        {BADGE_TITLE}
      </span>
    </span>
  );
}

/** One "you told us" row. Renders nothing until there is an answer to show. */
function Fact({ label, value, skin }) {
  if (!value) return null;
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0 ${skin.rule}`}>
      <dt className={`text-[13px] uppercase tracking-[0.06em] ${skin.body}`}>{label}</dt>
      <dd className={`text-right text-[15px] font-semibold ${skin.strong}`}>{value}</dd>
    </div>
  );
}

/** The promise, for the two screens before we know anything about her. */
function Offer({ skin }) {
  return (
    <>
      <h2 className={`text-[34px] font-bold leading-[1.06] tracking-[-0.02em] ${skin.title}`}>
        {WELCOME_HEADLINE_LINES[0]}
        <br />
        {WELCOME_HEADLINE_LINES[1]}
      </h2>
      <p className={`mt-4 max-w-[26rem] text-[17px] leading-[1.45] ${skin.body}`}>
        {WELCOME_SUBHEADLINE}
      </p>
      <ul className="mt-8 space-y-4">
        {WELCOME_BENEFITS.map((benefit) => (
          <li key={benefit.text} className="flex items-start gap-3.5">
            <SFIcon
              name={benefit.icon}
              size={20}
              strokeWidth={2}
              className={`mt-[2px] shrink-0 ${skin.accent}`}
            />
            <span className={`text-[16px] font-medium leading-snug ${skin.strong}`}>
              {benefit.text}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// The intake screen's four questions, in the order it asks them. Duplicated
// from PersonalIntakeScreen's private SUB_STEPS rather than exported from it,
// because that screen resets intakeStep to "name" as it hands over and an
// export would invite someone to read it as "where she is" from the outside.
// Here it is only ever used to count how many questions are behind her.
const INTAKE_ORDER = ["name", "age", "weight", "height"];

/** Her plan so far. Every row appears the moment she answers that question. */
function PlanSoFar({ step, profile, skin }) {
  const goal = profile.goalId ? goalById(profile.goalId) : null;
  // On the intake screen, the questions before the current one are answered.
  // Past it, all four are.
  const answered =
    step === STEP.intake ? Math.max(0, INTAKE_ORDER.indexOf(profile.intakeStep)) : INTAKE_ORDER.length;
  const answeredHealth = profile.noConditions || (profile.conditions || []).length > 0;
  const weight =
    profile.weightUnit === "kg"
      ? `${lbsToKg(profile.weightLbs)} kg`
      : `${profile.weightLbs} lbs`;
  const height =
    profile.heightUnit === "cm"
      ? `${inchesToCm(profile.heightInches)} cm`
      : feetInchesLabel(profile.heightInches);

  return (
    <>
      <p className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${skin.badgeText}`}>
        Your plan so far
      </p>
      <h2 className={`mt-4 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${skin.title}`}>
        {goal ? goal.title : WELCOME_HEADLINE_LINES[0]}
      </h2>
      <dl className={`mt-7 rounded-[22px] border px-6 py-2 ${skin.card}`}>
        <Fact label="Name" value={answered >= 1 ? profile.name?.trim() : ""} skin={skin} />
        <Fact label="Age" value={answered >= 2 ? `${profile.age}` : ""} skin={skin} />
        <Fact label="Weight" value={answered >= 3 ? weight : ""} skin={skin} />
        <Fact label="Height" value={answered >= 4 ? height : ""} skin={skin} />
        <Fact
          label="Built around"
          value={answeredHealth ? conditionPhrase(profile.conditions, profile.noConditions) : ""}
          skin={skin}
        />
        <Fact
          label="Your pace"
          value={profile.activity ? activityPhrase(profile.activity) : ""}
          skin={skin}
        />
      </dl>
      <p className={`mt-6 text-[15px] leading-relaxed ${skin.body}`}>
        {memberCountLine(MEMBER_COUNT_TO)}
      </p>
    </>
  );
}

/** What she is about to be shown a price for. */
function Outcome({ profile, skin }) {
  const items = showcaseItems(profile.goalId);
  return (
    <>
      <Badge skin={skin} />
      <h2 className={`mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${skin.title}`}>
        {SHOWCASE_TITLE}
      </h2>
      <ul className="mt-7 space-y-4">
        {items.map((item) => {
          const Glyph = SHOWCASE_ICONS[item.icon];
          return (
            <li key={item.text} className="flex items-start gap-3.5">
              {Glyph ? (
                <Glyph aria-hidden="true" size={20} strokeWidth={2} className={`mt-[2px] shrink-0 ${skin.accent}`} />
              ) : (
                <Check aria-hidden="true" size={20} strokeWidth={2.4} className={`mt-[2px] shrink-0 ${skin.accent}`} />
              )}
              <span className={`text-[16px] font-medium leading-snug ${skin.strong}`}>
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={`mt-8 border-t pt-6 text-[15px] leading-relaxed ${skin.rule} ${skin.body}`}>
        <em className="not-italic">&ldquo;{TESTIMONIALS[9].text}&rdquo;</em>{" "}
        <span className={`font-semibold ${skin.strong}`}>{TESTIMONIALS[9].author}</span>
      </p>
    </>
  );
}

/**
 * Beside the money screen, and only there.
 *
 * The paywall already lists what the plan includes and already restates the
 * guarantee, so repeating either of those next to it would read as a page that
 * has lost its place. Quotes are the one thing it shows one at a time, so
 * showing three at once beside it adds rather than echoes.
 */
function Proof({ skin }) {
  return (
    <>
      <Badge skin={skin} />
      <h2 className={`mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${skin.title}`}>
        {memberCountLine(MEMBER_COUNT_TO)}
      </h2>
      <ul className="mt-8 space-y-5">
        {[0, 3, 9].map((i) => (
          <li key={TESTIMONIALS[i].text} className={`rounded-[20px] border p-5 ${skin.card}`}>
            <p className={`text-[15px] leading-relaxed ${skin.strong}`}>
              <em className="not-italic">&ldquo;{TESTIMONIALS[i].text}&rdquo;</em>
            </p>
            <p className={`mt-2.5 text-[14px] font-semibold ${skin.body}`}>
              {TESTIMONIALS[i].author}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * `variant="proof"` is passed by the paywall's own frame rather than derived
 * from the step, because inside the funnel STEP.paywall is a single commit on
 * the way out: it still has the plan reveal mounted while the hand-off lands,
 * and switching the pane on it would show a flash of the wrong panel.
 */
export default function FunnelAside({ step, profile, tone = "light", variant = null }) {
  const skin = SKIN[tone] || SKIN.light;

  let body = null;
  if (variant === "proof") body = <Proof skin={skin} />;
  else if (step === STEP.goal || step === STEP.howItHelps) body = <Offer skin={skin} />;
  else if (step === STEP.intake || step === STEP.health) {
    body = <PlanSoFar step={step} profile={profile} skin={skin} />;
  } else body = <Outcome profile={profile} skin={skin} />;

  const showBadgeFooter = !variant && (step === STEP.goal || step === STEP.howItHelps);

  return (
    <div aria-hidden="true" className="w-full">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-[12px] object-contain"
        />
        <span className={`text-[17px] font-bold tracking-[-0.2px] ${skin.title}`}>Pelvi Health</span>
      </div>

      <div className="mt-10">{body}</div>

      {showBadgeFooter ? (
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Badge skin={skin} />
          <span className={`text-[14px] ${skin.body}`}>{memberCountLine(MEMBER_COUNT_TO)}</span>
        </div>
      ) : null}
    </div>
  );
}
