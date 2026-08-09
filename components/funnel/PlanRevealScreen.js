"use client";

// The plan, and the promise attached to it.
//
// Everything on this screen is derived from something she typed. The BMI is her
// numbers, the activity phrase is her answer, the condition phrase is her
// selection, and the two dates are today plus 7 and today plus 90. That is the
// difference between personalisation and a mail merge, and it is the reason the
// insight rows are worth the space they take.
//
// Guarantee wording comes from lib/guaranteeCopy.js and nowhere else. It is the
// same text the iOS app shows, and a member who reads one on her phone and the
// other on her laptop must not find two different promises.

import React, { useEffect, useMemo, useState } from "react";
import { Shield, Sparkle } from "lucide-react";
import { goalSentencePhrase } from "@/lib/program";
import {
  MILESTONE_CARD_BODY, MILESTONE_CARD_TITLE, connectorLine, day7String,
  day90String, milestoneCardPromise,
} from "@/lib/guaranteeCopy";
import { INSIGHTS_HEADLINE, milestones, timeline } from "./copy";
import { activityPhrase, bmi, conditionPhrase } from "./funnelState";
import { BackButton, PrimaryButton, RichText, useMounted, useReducedMotion, useThemeColor } from "./ui";

const CURVE = { x0: 20, y0: 144, x1: 120, y1: 152, x2: 200, y2: 68, x3: 300, y3: 34 };
const MILESTONE_T = [0.1, 0.3, 0.7, 1];
const CAPTION_INTERVAL_MS = 1600;

function pointAt(t) {
  const u = 1 - t;
  return {
    x: u * u * u * CURVE.x0 + 3 * u * u * t * CURVE.x1 + 3 * u * t * t * CURVE.x2 + t * t * t * CURVE.x3,
    y: u * u * u * CURVE.y0 + 3 * u * u * t * CURVE.y1 + 3 * u * t * t * CURVE.y2 + t * t * t * CURVE.y3,
  };
}

const CURVE_PATH = `M${CURVE.x0},${CURVE.y0} C${CURVE.x1},${CURVE.y1} ${CURVE.x2},${CURVE.y2} ${CURVE.x3},${CURVE.y3}`;

/** Drifting sparks. Decorative, client-only, and off under reduced motion. */
function Sparkles({ count = 14 }) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const specks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        top: 20 + Math.random() * 80,
        size: 2 + Math.random() * 3,
        duration: 4 + Math.random() * 5,
        delay: -Math.random() * 9,
        drift: (Math.random() - 0.5) * 40,
        opacity: 0.25 + Math.random() * 0.4,
      })),
    [count]
  );
  if (!mounted || reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {specks.map((s) => (
        <span
          key={s.key}
          className="funnel-sparkle absolute rounded-full bg-ios-pink"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            "--funnel-sparkle-duration": `${s.duration}s`,
            "--funnel-sparkle-x": `${s.drift}px`,
            "--funnel-sparkle-opacity": s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function PlanCurve({ marks, activeIndex }) {
  const reduced = useReducedMotion();
  const points = MILESTONE_T.map(pointAt);

  return (
    <svg
      viewBox="0 0 320 180"
      className="h-[180px] w-full"
      role="img"
      aria-label={`Your progress over the first six weeks: ${marks
        .map((m) => `week ${m.week}, ${m.text}`)
        .join("; ")}.`}
    >
      <defs>
        <linearGradient id="planCurveStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF2D55" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF2D55" stopOpacity="1" />
        </linearGradient>
        <filter id="planCurveGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        id="planCurve"
        d={CURVE_PATH}
        fill="none"
        stroke="url(#planCurveStroke)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#planCurveGlow)"
        pathLength="1"
        strokeDasharray="1"
        className="funnel-draw"
        style={{ strokeDashoffset: 1, "--funnel-draw-duration": "1.5s" }}
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === activeIndex ? 7 : 5}
            fill="#FFFFFF"
            opacity={i === activeIndex ? 1 : 0.55}
            style={{ transition: reduced ? undefined : "r 250ms ease-out, opacity 250ms ease-out" }}
          />
          <text
            x={p.x}
            y={p.y + 22}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#FFFFFF"
            opacity={i === activeIndex ? 0.9 : 0.45}
          >
            W{marks[i].week}
          </text>
        </g>
      ))}

      {reduced ? (
        <circle cx={CURVE.x3} cy={CURVE.y3} r="5" fill="#FFFFFF" />
      ) : (
        <circle r="5" fill="#FFFFFF" opacity="0.9">
          <animateMotion dur="2.5s" begin="0.4s" fill="freeze" path={CURVE_PATH} />
        </circle>
      )}
    </svg>
  );
}

export default function PlanRevealScreen({ profile, onReachPaywall, onBack }) {
  const reduced = useReducedMotion();
  useThemeColor("#000000");

  // One clock for the whole screen, so the dates in the subtitle, the connector
  // line and the guarantee card can never disagree by a day.
  const now = useMemo(() => new Date(), []);
  const day7 = day7String(now);
  const day90 = day90String(now);

  const phrase = goalSentencePhrase(profile.goalId);
  const block = timeline(profile.goalId);
  const marks = milestones(phrase);

  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      if (step >= marks.length) {
        clearInterval(timer);
        setActiveIndex(marks.length - 1);
        return;
      }
      setActiveIndex(step);
    }, CAPTION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [marks.length]);

  const fill = (template) =>
    template
      .replace("{date}", day90)
      .replace("{bmi}", bmi(profile.weightLbs, profile.heightInches))
      .replace("{activity}", activityPhrase(profile.activity))
      .replace("{age}", String(profile.age))
      .replace("{condition}", conditionPhrase(profile.conditions, profile.noConditions));

  const who = (profile.name || "").trim();
  const rise = (i) => ({ animationDelay: `${0.1 + i * 0.09}s` });

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-black font-system">
      <Sparkles />

      <div className="relative z-10 shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] md:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} tone="dark" />
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-6 pb-4">
        <h1
          className="funnel-rise pt-2 text-center text-[26px] font-bold leading-[1.04] tracking-[-0.4px] text-white/90 sm:text-[30px]"
          style={rise(0)}
        >
          {who ? `${who}, your` : "Your"} path to{" "}
          <span className="text-white">{phrase}</span> is ready.
        </h1>

        <p
          className="funnel-rise mx-auto mt-2.5 max-w-[22rem] text-center text-[15px] leading-snug text-white/80 sm:text-[16px]"
          style={rise(1)}
        >
          <RichText text={fill(block.subtitle)} />
        </p>

        <p
          className="funnel-rise mx-auto mt-2 max-w-[22rem] text-center text-[13px] leading-snug text-white/70 sm:text-[14px]"
          style={rise(2)}
        >
          <RichText text={connectorLine(`**${day7}**`, `**${day90}**`)} />
        </p>

        <div className="funnel-rise mt-5" style={rise(3)}>
          <PlanCurve marks={marks} activeIndex={activeIndex} />
          <p
            aria-hidden="true"
            className="mt-1 min-h-[20px] text-center text-[13px] font-semibold text-white/80"
          >
            Week {marks[activeIndex].week}: {marks[activeIndex].text}
          </p>
        </div>

        <div
          className="funnel-rise mt-5 rounded-[20px] border border-white/[0.14] bg-white/5 p-[18px]"
          style={rise(4)}
        >
          <div className="flex items-start gap-2">
            <Shield aria-hidden="true" size={18} strokeWidth={2.2} className="mt-[2px] shrink-0 text-ios-pink" />
            <h2 className="text-[15px] font-semibold leading-snug text-white sm:text-[16px]">
              {MILESTONE_CARD_TITLE}
            </h2>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-white/85 sm:text-[14px]">
            {MILESTONE_CARD_BODY}
          </p>
          <p className="mt-3 text-[13px] font-semibold leading-snug text-ios-pink sm:text-[14px]">
            {milestoneCardPromise(profile.goalId, day90)}
          </p>
        </div>

        <h2 className="funnel-rise mt-6 text-[17px] font-semibold text-white sm:text-[18px]" style={rise(5)}>
          {INSIGHTS_HEADLINE}
        </h2>
        <ul className="mt-4 space-y-[15px]">
          {block.insights.map((insight, i) => (
            <li key={insight} className="funnel-rise flex items-start gap-3" style={rise(6 + i)}>
              <Sparkle
                aria-hidden="true"
                size={20}
                strokeWidth={2}
                className="mt-[2px] shrink-0 text-ios-purple"
              />
              <span className="text-[13px] leading-snug text-white/80 sm:text-[14px]">
                <RichText text={fill(insight)} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 md:pb-5">
        <PrimaryButton onClick={onReachPaywall} variant="reveal" breathe={!reduced}>
          {block.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
