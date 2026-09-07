"use client";

// The reveal (PlanRevealViewController, phase three): black, serif headline
// with her name and outcome, the NOW → DAY 7 flight, then the receipts, the
// evidence, why five minutes, and everything around the plan.

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AudioLines, CircleCheck, Info, MessagesSquare, Sparkle, TrendingUp } from "lucide-react";
import {
  activityLevel, focusData, frequencyData, goalData, impactReceiptPhrase, meaningData, revealSentence,
  situationData, triedData,
} from "./appCopy";
import {
  DR_REED, REVEAL, baseline, clinicalEvidence, dashboardSession, durationLabel, milestones, revealCta,
  revealHeadlinePhrase, trackingSignals, whyFiveMinutes,
} from "./revealCopy";
import { bmi as bmiOf, naturalList } from "./funnelState";
import { BackButton, Button, Card, Eyebrow } from "./atelier";
import { RichText, useMounted, useReducedMotion, useThemeColor } from "./ui";

const CredentialsSheet = dynamic(() => import("./ReedSheets").then((m) => m.CredentialsSheet), { ssr: false });

/** HolographicTimelineView: the curve from NOW to DAY 7 and the four milestone rows. */
function Timeline({ rows, labels }) {
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const w = 340;
  const h = 150;
  const path = `M 20 ${h - 30} C 120 ${h - 34}, 200 ${h - 10}, ${w - 20} 30`;
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="relative" style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
        <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="pelviRevealCurve" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(230,84,115,0.35)" />
              <stop offset="100%" stopColor="#F94F70" />
            </linearGradient>
            <linearGradient id="pelviRevealFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(230,84,115,0.35)" />
              <stop offset="100%" stopColor="rgba(230,84,115,0)" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${w - 20} ${h - 30} Z`} fill="url(#pelviRevealFill)" opacity={mounted ? 1 : 0} style={{ transition: "opacity 1.2s ease-out 0.4s" }} />
          <path
            d={path}
            fill="none"
            stroke="url(#pelviRevealCurve)"
            strokeWidth="3"
            strokeLinecap="round"
            className={reduced ? undefined : "funnel-draw"}
            strokeDasharray={reduced ? undefined : 520}
            strokeDashoffset={reduced ? 0 : 520}
            style={{ "--funnel-draw-duration": "1.6s" }}
          />
          {rows.map((row) => {
            const x = 20 + (w - 40) * row.progress;
            const y = h - 30 - (h - 60) * Math.pow(row.progress, 1.15);
            return <circle key={row.marker} cx={x} cy={y} r="5" fill="#0A0A10" stroke="#F94F70" strokeWidth="2.5" />;
          })}
          <circle cx={w - 20} cy="30" r="6" fill="#FFFFFF" className="funnel-pop" style={{ animationDelay: "1.5s", transformBox: "fill-box", transformOrigin: "center" }} />
        </svg>
        <span className="absolute bottom-0 left-0 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/60">{labels.now}</span>
        <span className="absolute right-0 top-0 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-atelier-roseBright funnel-fade" style={{ animationDelay: "1.6s" }}>
          {labels.outcome}
        </span>
      </div>
      <ol className="mt-4 space-y-2.5">
        {rows.map((row, i) => (
          <li key={row.marker} className="funnel-rise flex items-start gap-3 rounded-[14px] bg-black/40 px-3 py-2.5" style={{ animationDelay: `${600 + i * 160}ms` }}>
            <span className="mt-[2px] w-[46px] shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-atelier-roseBright">{row.marker}</span>
            <span className="text-[14px] leading-snug text-white/85">{row.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-[19px] font-bold leading-snug text-white">{children}</h2>;
}
function Divider() {
  return <div className="my-3 h-px w-full bg-white/10" />;
}
function BodyLine({ children }) {
  return <p className="text-[14px] leading-snug text-white/[0.78]">{children}</p>;
}

function ResultRow({ value, label, fill, emphasized }) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[26px] font-bold ${emphasized ? "text-atelier-roseBright" : "text-white/70"}`}>{value}</span>
        <span className="text-right text-[13px] text-white/70">{label}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${emphasized ? "bg-atelier-roseBright" : "bg-white/40"}`} style={{ width: `${Math.round(fill * 100)}%` }} />
      </div>
    </div>
  );
}

export default function PlanRevealScreen({ profile, onNext, onBack }) {
  useThemeColor("#000000");
  const { pathway, goalId } = profile;
  const goal = goalData(pathway, goalId);
  const focus = focusData(pathway, goalId, profile.focusId);
  const situation = situationData(pathway, goalId, profile.situationId);
  const frequency = frequencyData(pathway, goalId, profile.frequencyId);
  const tried = triedData(pathway, goalId, profile.triedId);
  const meaning = meaningData(profile.meaningId);
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  const receipts = useMemo(() => {
    if (!goal) return [];
    const lines = [];
    const focusTitle = focus?.title || goal.memberSentencePhrase.replace(/\b\w/g, (c) => c.toUpperCase());
    const situationLine = revealSentence(pathway, goalId, profile.situationId, profile.frequencyId);
    if (situationLine) lines.push(situationLine);
    const wants = impactReceiptPhrase(pathway, goalId, profile.impactIds);
    if (wants) lines.push(`You want **${wants}** back. Your plan trains for exactly that, starting day one.`);
    let focusLine = `Your focus, **${focusTitle}**, changes the exercise order, pacing and coaching throughout your plan.`;
    if (tried && tried.id !== "nothing") {
      focusLine += ` Because **${tried.title.toLowerCase()}** did not solve it, your plan adds guided form, progression and feedback instead of repeating the same approach.`;
    }
    lines.push(focusLine);
    const body = [];
    if (profile.age > 0) body.push(`**age ${profile.age}**`);
    const bmiValue = bmiOf(profile.weightLbs, profile.heightInches);
    if (bmiValue > 0) body.push(`**BMI ${bmiValue.toFixed(1)}**`);
    const activity = activityLevel(profile.activity);
    if (activity) body.push(`**${activity.calibration}**`);
    if (body.length) lines.push(`With ${naturalList(body)}, Coach Mia adjusts your reps, timed work and recovery to fit you.`);
    const health = (profile.conditions || []).map((c) => c.trim()).filter(Boolean);
    if (health.length) {
      const visible = health.slice(0, 2).map((h) => `**${h}**`);
      const remaining = health.length - visible.length;
      const suffix = remaining > 0 ? ` and **${remaining} more**` : "";
      lines.push(`Your answers about ${naturalList(visible)}${suffix} change support, pressure limits and exercise positions.`);
    } else {
      lines.push(`Your medical check-in found no listed limits, so Coach Mia™ begins at the level chosen for **${focusTitle}**.`);
    }
    lines.push("Coach Mia™ adjusts your **5 minutes** every day as you improve, so it always fits you.");
    return lines.slice(0, 4);
  }, [goal, focus, tried, pathway, goalId, profile]);

  if (!goal) return null;

  const name = (profile.name || "").trim().split(" ")[0];
  const headline = revealHeadlinePhrase(goalId, focus, goal.memberSentencePhrase);
  const subtitle = meaning ? REVEAL.subtitleWithMeaning(meaning.echo) : REVEAL.subtitleDefault;
  const rows = milestones(goalId, focus, frequency);
  const labels = baseline(goalId, frequency);
  const evidence = clinicalEvidence(goalId, pathway);
  const why = whyFiveMinutes(pathway);
  const session = dashboardSession(goalId, pathway);
  const concern = focus?.title.toLowerCase() || goal.memberSentencePhrase;
  const signals = trackingSignals(goalId, pathway, focus);
  const rise = (ms) => ({ animationDelay: `${ms}ms` });

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-black font-figtree text-white">
      <div className="shrink-0 px-4 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} tone="dark" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 pb-6">
        <h1 className="funnel-rise pt-1 font-serif text-[34px] leading-[1.06] text-white/[0.92]" style={rise(60)}>
          {name ? <em className="text-white">{name}, </em> : null}
          your plan {headline.preposition}
          <br />
          <em className="text-white">{headline.outcome}</em> is ready.
        </h1>
        <p className="funnel-rise mt-2.5 text-[16px] leading-snug text-white/80" style={rise(140)}>
          <RichText text={subtitle} boldClassName="font-semibold text-white" />
        </p>

        <h2 className="funnel-rise mt-4 text-[19px] font-bold text-white" style={rise(200)}>{REVEAL.milestoneHeadline}</h2>
        <div className="funnel-rise mt-3" style={rise(260)}>
          <Timeline rows={rows} labels={labels} />
        </div>

        <div className="funnel-rise mt-5" style={rise(340)}>
          <Card tone="dark" emphasized>
            <div className="flex items-center gap-3">
              <Sparkle aria-hidden="true" size={22} className="shrink-0 text-atelier-rose" fill="currentColor" />
              <div>
                <Eyebrow>{REVEAL.calibration.eyebrow}</Eyebrow>
                <SectionTitle>{REVEAL.calibration.title}</SectionTitle>
              </div>
            </div>
            <Divider />
            <ul className="space-y-2.5">
              {receipts.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <CircleCheck aria-hidden="true" size={18} className="mt-[1px] shrink-0 text-atelier-rose" />
                  <p className="text-[14px] leading-snug text-white/90">
                    <RichText text={line} boldClassName="font-semibold text-white" />
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="funnel-rise mt-4" style={rise(420)}>
          <Card tone="dark">
            <Eyebrow>{REVEAL.evidence.eyebrow}</Eyebrow>
            <SectionTitle>{evidence.title}</SectionTitle>
            {evidence.rows ? (
              <>
                {evidence.rows.map((row) => (
                  <ResultRow key={row.value} {...row} />
                ))}
              </>
            ) : (
              <>
                <p className="mt-3 text-[28px] font-bold leading-none text-atelier-rose">{evidence.statistic}</p>
                <div className="mt-2">
                  <BodyLine>{evidence.detail}</BodyLine>
                </div>
              </>
            )}
            <p className="mt-3 text-[12px] text-white/55">{evidence.source}</p>
          </Card>
        </div>

        <div className="funnel-rise mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4" style={rise(480)}>
          <Eyebrow>{REVEAL.why.eyebrow}</Eyebrow>
          <p className="mt-1.5 font-serif text-[22px] leading-tight text-white">{why.headline}</p>
          <p className="mt-2 text-[14px] leading-snug text-white/80">{why.body}</p>
          <p className="mt-3 text-[11.5px] leading-snug text-white/55">{why.footnote}</p>
        </div>

        <h2 className="funnel-rise mt-6 text-[19px] font-bold text-white" style={rise(540)}>{REVEAL.insightsHeadline}</h2>
        <div className="funnel-rise mt-3" style={rise(600)}>
          <Card tone="dark">
            <FeatureRow icon={<AudioLines size={20} aria-hidden="true" />} title={session ? `${session.title} • ${durationLabel(session.seconds)} guided audio` : REVEAL.audioFallback.title} detail={session ? session.subtitle : REVEAL.audioFallback.detail} />
            <Divider />
            <FeatureRow icon={<MessagesSquare size={20} aria-hidden="true" />} title={REVEAL.coachContextTitle} detail={REVEAL.coachContextDetail(concern)} />
            <Divider />
            <FeatureRow icon={<TrendingUp size={20} aria-hidden="true" />} title={signals.join(" • ")} detail={REVEAL.trackingDetail} />
          </Card>
        </div>

        <button
          type="button"
          onClick={() => setCredentialsOpen(true)}
          className="funnel-rise mt-5 flex w-full items-center gap-3 rounded-full border border-white/12 bg-white/[0.06] py-2 pl-2 pr-4 text-left"
          style={rise(660)}
          aria-label="Clinically reviewed by Doctor Evelyn Reed, physical therapist. Shows her credentials."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DR_REED.headshot} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover object-top" />
          <span className="flex-1 truncate text-[13.5px] font-semibold text-white">{DR_REED.reviewedLine}</span>
          <Info aria-hidden="true" size={16} className="shrink-0 text-atelier-rose" />
        </button>
      </div>
      <div className="shrink-0 bg-gradient-to-t from-black via-black/95 to-black/70 px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
        <Button onClick={onNext} variant="roseBright" breathe id="onboarding.timeline.continue">
          {revealCta(goalId)}
        </Button>
      </div>
      {credentialsOpen ? <CredentialsSheet open onClose={() => setCredentialsOpen(false)} /> : null}
    </div>
  );
}

function FeatureRow({ icon, title, detail }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-atelier-rose/[0.16] text-atelier-rose">{icon}</span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-white">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-white/[0.78]">{detail}</p>
      </div>
    </div>
  );
}
