"use client";

// "Here's how we'll {goal}." (HowPelvicHelpViewController): the benefit
// constellation, built from her own answers first and the goal's outcomes
// second, with the personalization summary underneath.

import React, { useMemo } from "react";
import { BadgeCheck } from "lucide-react";
import {
  CONSTELLATION_SCREEN, constellationBase, constellationNodes, constellationSummary, focusData,
  focusSentencePhrase, frequencyData, goalData, impactsData, situationData, triedData,
} from "./appCopy";
import SFIcon from "./icons";
import { Body, Button, Footer, Header, Screen, Subtitle } from "./atelier";
import { useReducedMotion } from "./ui";

/** Six nodes around a rose core, spokes drawn in, exactly the phone's ring. */
function Constellation({ icon, nodes }) {
  const reduced = useReducedMotion();
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 112;
  const placed = nodes.map((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(nodes.length, 1);
    return { node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        {placed.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(230,84,115,0.35)"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            className={reduced ? undefined : "funnel-draw"}
            style={reduced ? undefined : { strokeDashoffset: 0, animationDelay: `${200 + i * 90}ms` }}
          />
        ))}
      </svg>
      <div
        className="funnel-pop absolute flex h-[72px] w-[72px] items-center justify-center rounded-full bg-atelier-rose text-white shadow-[0_12px_28px_rgba(230,84,115,0.35)]"
        style={{ left: cx - 36, top: cy - 36, animationDelay: "80ms" }}
      >
        <SFIcon name={icon} size={32} strokeWidth={1.8} />
      </div>
      {placed.map((p, i) => (
        <div
          key={`${p.node[1]}-${i}`}
          className="funnel-pop absolute flex w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
          style={{ left: p.x, top: p.y, animationDelay: `${260 + i * 90}ms` }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-atelier-line bg-atelier-card text-atelier-rose shadow-[0_6px_16px_rgba(28,24,32,0.08)]">
            <SFIcon name={p.node[0]} size={20} strokeWidth={2} />
          </span>
          <span className="mt-1.5 text-[11.5px] font-semibold leading-[1.15] text-atelier-ink">{p.node[1]}</span>
        </div>
      ))}
    </div>
  );
}

export default function HowPelviHelpsScreen({ profile, onNext, onBack }) {
  const { pathway, goalId } = profile;
  const goal = goalData(pathway, goalId);
  const base = useMemo(() => constellationBase(goalId, pathway, profile.focusId), [goalId, pathway, profile.focusId]);
  const focus = focusData(pathway, goalId, profile.focusId);
  const situation = situationData(pathway, goalId, profile.situationId);
  const frequency = frequencyData(pathway, goalId, profile.frequencyId);
  const tried = triedData(pathway, goalId, profile.triedId);
  const impacts = impactsData(pathway, goalId, profile.impactIds);
  const nodes = useMemo(
    () => constellationNodes({ base: base.nodes, focus, situation, impacts, tried }),
    [base, focus, situation, impacts, tried]
  );
  if (!goal) return null;
  const summary = constellationSummary({ fallback: base.subtitle, focus, situation, frequency, tried });
  const headlinePhrase = focusSentencePhrase(goalId, profile.focusId, goal.sentencePhrase);
  return (
    <Screen>
      <Header onBack={onBack} railStep={3} railFraction={0.2} />
      <Body>
        <div className="funnel-rise pt-3 text-center" style={{ animationDelay: "40ms" }}>
          <h1 className="font-serif text-[31px] leading-[1.08] text-atelier-ink" aria-label={`${CONSTELLATION_SCREEN.headlineLead} ${headlinePhrase}`}>
            <span aria-hidden="true">
              {CONSTELLATION_SCREEN.headlineLead}
              <br />
              <em>{headlinePhrase}</em>.
            </span>
          </h1>
        </div>
        <div className="mt-3">
          <Constellation icon={base.icon} nodes={nodes} />
        </div>
        <ul className="sr-only">
          {nodes.map((n) => (
            <li key={n[1]}>{n[1]}</li>
          ))}
        </ul>
        <div className="funnel-rise mt-2" style={{ animationDelay: "700ms" }}>
          <Subtitle center>{summary}</Subtitle>
        </div>
        <div className="funnel-rise mb-4 mt-4 flex items-start gap-2.5 rounded-[16px] bg-atelier-rose/[0.07] p-3" style={{ animationDelay: "800ms" }}>
          <BadgeCheck aria-hidden="true" size={16} className="mt-[1px] shrink-0 text-atelier-rose" />
          <p className="text-[12.5px] font-medium leading-snug text-atelier-ink2">{CONSTELLATION_SCREEN.proof}</p>
        </div>
      </Body>
      <Footer>
        <Button onClick={onNext} variant="rose" breathe id="onboarding.howItHelps.continue">
          {CONSTELLATION_SCREEN.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
