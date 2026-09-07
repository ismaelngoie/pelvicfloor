"use client";

// The pane beside the funnel card on a desktop. Decorative: everything it says
// the card is already saying, so it is aria-hidden and never carries a control.

import React from "react";
import { Check, MonitorPlay, Shield, Timer, TrendingUp, Zap } from "lucide-react";
import { BADGE_TITLE } from "@/lib/guaranteeCopy";
import { SHOWCASE_TITLE, showcaseItems } from "@/lib/paywallCopy";
import { WELCOME, anyGoalData, focusData, memberStory, activityLevel } from "./appCopy";
import { STEP, feetInchesLabel, lbsToKg, inchesToCm, INTAKE_STEPS } from "./funnelState";
import SFIcon from "./icons";

const SHOWCASE_ICONS = {
  bolt: Zap,
  timer: Timer,
  videos: MonitorPlay,
  progress: TrendingUp,
  shield: Shield,
};

const SKIN = {
  light: {
    title: "text-atelier-ink",
    body: "text-atelier-ink2",
    strong: "text-atelier-ink",
    card: "border-white/70 bg-white/70 shadow-[0_16px_44px_rgba(198,58,92,0.12)]",
    rule: "border-atelier-line",
    accent: "text-atelier-rose",
    badgeBox: "border-atelier-rose/20 bg-atelier-rose/10",
    badgeText: "text-atelier-rosewood",
  },
  dark: {
    title: "text-white",
    body: "text-white/60",
    strong: "text-white/90",
    card: "border-white/10 bg-white/[0.06] shadow-[0_16px_44px_rgba(0,0,0,0.35)]",
    rule: "border-white/10",
    accent: "text-atelier-rose",
    badgeBox: "border-white/15 bg-white/10",
    badgeText: "text-white/80",
  },
};

function Badge({ skin }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 ${skin.badgeBox}`}>
      <Shield aria-hidden="true" size={13} strokeWidth={2.4} className={skin.accent} />
      <span className={`text-[12px] font-semibold uppercase tracking-[0.06em] ${skin.badgeText}`}>
        {BADGE_TITLE}
      </span>
    </span>
  );
}

function Fact({ label, value, skin }) {
  if (!value) return null;
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0 ${skin.rule}`}>
      <dt className={`text-[13px] uppercase tracking-[0.06em] ${skin.body}`}>{label}</dt>
      <dd className={`text-right text-[15px] font-semibold ${skin.strong}`}>{value}</dd>
    </div>
  );
}

function Offer({ skin }) {
  return (
    <>
      <h2 className={`font-serif text-[40px] leading-[1.06] tracking-[-0.01em] ${skin.title}`}>
        {WELCOME.headline.before}
        <em>{WELCOME.headline.italic}</em>
        {WELCOME.headline.after}
      </h2>
      <p className={`mt-4 max-w-[26rem] text-[17px] leading-[1.45] ${skin.body}`}>{WELCOME.subtitle}</p>
      <ul className="mt-8 space-y-4">
        {WELCOME.benefits.map((benefit) => (
          <li key={benefit.text} className="flex items-start gap-3.5">
            <SFIcon name={benefit.icon} size={20} strokeWidth={2} className={`mt-[2px] shrink-0 ${skin.accent}`} />
            <span className={`text-[16px] font-medium leading-snug ${skin.strong}`}>{benefit.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PlanSoFar({ step, profile, skin }) {
  const goal = profile.goalId ? anyGoalData(profile.goalId, profile.pathway) : null;
  const focus = profile.goalId ? focusData(profile.pathway, profile.goalId, profile.focusId) : null;
  const answered =
    step === STEP.intake ? Math.max(0, INTAKE_STEPS.indexOf(profile.intakeStep)) : INTAKE_STEPS.length;
  const answeredHealth = profile.noConditions || (profile.conditions || []).length > 0;
  const weight =
    profile.weightUnit === "kg" ? `${lbsToKg(profile.weightLbs)} kg` : `${profile.weightLbs} lbs`;
  const height =
    profile.heightUnit === "cm" ? `${inchesToCm(profile.heightInches)} cm` : feetInchesLabel(profile.heightInches);
  const conditions = profile.noConditions
    ? "your unique needs"
    : (profile.conditions || []).slice(0, 2).join(", ") + ((profile.conditions || []).length > 2 ? " and more" : "");
  return (
    <>
      <p className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${skin.badgeText}`}>Your plan so far</p>
      <h2 className={`mt-4 font-serif text-[34px] leading-[1.1] ${skin.title}`}>
        {goal ? goal.title : WELCOME.subtitle}
      </h2>
      <dl className={`mt-7 rounded-[22px] border px-6 py-2 ${skin.card}`}>
        <Fact label="Focus" value={focus?.title} skin={skin} />
        <Fact label="Name" value={answered >= 1 ? profile.name?.trim() : ""} skin={skin} />
        <Fact label="Age" value={answered >= 2 ? `${profile.age}` : ""} skin={skin} />
        <Fact label="Height" value={answered >= 3 ? height : ""} skin={skin} />
        <Fact label="Weight" value={answered >= 4 ? weight : ""} skin={skin} />
        <Fact label="Built around" value={answeredHealth ? conditions : ""} skin={skin} />
        <Fact label="Your pace" value={profile.activity ? activityLevel(profile.activity)?.phrase : ""} skin={skin} />
      </dl>
      <p className={`mt-6 text-[15px] leading-relaxed ${skin.body}`}>
        {WELCOME.memberCountLine(WELCOME.memberCountTo)}
      </p>
    </>
  );
}

function Outcome({ profile, skin }) {
  const items = showcaseItems(profile.goalId);
  const story = memberStory(profile.goalId, profile.pathway);
  return (
    <>
      <Badge skin={skin} />
      <h2 className={`mt-5 font-serif text-[34px] leading-[1.1] ${skin.title}`}>{SHOWCASE_TITLE}</h2>
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
              <span className={`text-[16px] font-medium leading-snug ${skin.strong}`}>{item.text}</span>
            </li>
          );
        })}
      </ul>
      <p className={`mt-8 border-t pt-6 text-[15px] leading-relaxed ${skin.rule} ${skin.body}`}>
        <em className="not-italic">&ldquo;{story.quote}&rdquo;</em>{" "}
        <span className={`font-semibold ${skin.strong}`}>{story.name}</span>
      </p>
    </>
  );
}

function Proof({ skin }) {
  return (
    <>
      <Badge skin={skin} />
      <h2 className={`mt-5 font-serif text-[34px] leading-[1.1] ${skin.title}`}>
        {WELCOME.memberCountLine(WELCOME.memberCountTo)}
      </h2>
      <ul className="mt-8 space-y-5">
        {[0, 3, 9].map((i) => (
          <li key={WELCOME.reviews[i].text} className={`rounded-[20px] border p-5 ${skin.card}`}>
            <p className={`text-[15px] leading-relaxed ${skin.strong}`}>
              <em className="not-italic">&ldquo;{WELCOME.reviews[i].text}&rdquo;</em>
            </p>
            <p className={`mt-2.5 text-[14px] font-semibold ${skin.body}`}>{WELCOME.reviews[i].author}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

const OFFER_STEPS = new Set([STEP.pathway, STEP.goal, STEP.focus, STEP.calibration, STEP.method, STEP.howItHelps]);
const PLAN_STEPS = new Set([STEP.intake, STEP.health]);

export default function FunnelAside({ step, profile, tone = "light", variant = null }) {
  const skin = SKIN[tone] || SKIN.light;
  let body = null;
  if (variant === "proof" || step === STEP.paywall) body = <Proof skin={skin} />;
  else if (OFFER_STEPS.has(step)) body = <Offer skin={skin} />;
  else if (PLAN_STEPS.has(step)) body = <PlanSoFar step={step} profile={profile} skin={skin} />;
  else body = <Outcome profile={profile} skin={skin} />;
  const showBadgeFooter = !variant && OFFER_STEPS.has(step);
  return (
    <div aria-hidden="true" className="w-full font-figtree">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-[12px] object-contain" />
        <span className={`text-[17px] font-bold tracking-[-0.2px] ${skin.title}`}>Pelvi Health</span>
      </div>
      <div className="mt-10">{body}</div>
      {showBadgeFooter ? (
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Badge skin={skin} />
          <span className={`text-[14px] ${skin.body}`}>{WELCOME.memberCountLine(WELCOME.memberCountTo)}</span>
        </div>
      ) : null}
    </div>
  );
}
