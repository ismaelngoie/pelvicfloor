"use client";

// "A METHOD BUILT AROUND YOUR ANSWERS" (NormalizationInterstitialView): the
// title answers what she already tried, the bowl shows the three phases.

import React from "react";
import { METHOD_SCREEN, goalData, methodContent, methodTitle } from "./appCopy";
import { SealLine } from "./CalibrationScreen";
import SFIcon from "./icons";
import { Body, Button, Eyebrow, Footer, Header, Screen, Subtitle, Title } from "./atelier";

/** PelvicFloorClinicalVisual: the bowl, the ring and the three numbered phases. */
export function ClinicalVisual({ phases, symbol }) {
  const w = 224;
  const h = 112;
  const bowl = [
    `M ${w * 0.08} ${h * 0.12}`,
    `C ${w * 0.11} ${h * 0.62} ${w * 0.31} ${h * 0.92} ${w * 0.5} ${h * 0.92}`,
    `C ${w * 0.69} ${h * 0.92} ${w * 0.89} ${h * 0.62} ${w * 0.92} ${h * 0.12}`,
    `C ${w * 0.79} ${h * 0.18} ${w * 0.66} ${h * 0.48} ${w * 0.5} ${h * 0.52}`,
    `C ${w * 0.34} ${h * 0.48} ${w * 0.21} ${h * 0.18} ${w * 0.08} ${h * 0.12}`,
    "Z",
  ].join(" ");
  return (
    <div
      className="relative overflow-hidden rounded-[27px] border border-atelier-line"
      style={{ background: "linear-gradient(135deg, #FFFCF8 0%, rgba(230,84,115,0.12) 100%)", minHeight: 214 }}
    >
      <div className="relative mx-auto mt-6 h-[112px] w-[224px]" aria-hidden="true">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
          <defs>
            <linearGradient id="pelviBowlFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
              <stop offset="100%" stopColor="rgba(230,84,115,0.22)" />
            </linearGradient>
            <linearGradient id="pelviBowlStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="rgba(230,84,115,0.62)" />
            </linearGradient>
            <radialGradient id="pelviBowlGlow" cx="50%" cy="0%" r="70%">
              <stop offset="0%" stopColor="rgba(230,84,115,0.76)" />
              <stop offset="100%" stopColor="rgba(196,62,99,0.24)" />
            </radialGradient>
          </defs>
          <path d={bowl} fill="url(#pelviBowlFill)" stroke="url(#pelviBowlStroke)" strokeWidth="2" style={{ filter: "drop-shadow(0 9px 13px rgba(196,62,99,0.14))" }} />
          <ellipse cx={w / 2} cy={h / 2 + 21} rx="71" ry="26" fill="url(#pelviBowlGlow)" style={{ filter: "drop-shadow(0 5px 10px rgba(230,84,115,0.32))" }} />
        </svg>
        <span
          className="absolute left-1/2 top-1/2 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-white/90 bg-atelier-rose text-white shadow-[0_5px_8px_rgba(196,62,99,0.2)]"
          style={{ marginTop: -15 }}
        >
          <SFIcon name={symbol} size={26} strokeWidth={2.2} />
        </span>
      </div>
      <div className="mt-6 flex gap-[7px] px-3 pb-5">
        {phases.map((phase, index) => (
          <div key={phase} className="flex flex-1 items-center justify-center gap-[5px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atelier-rose text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <span className="truncate text-[12.5px] font-semibold text-atelier-ink">{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MethodScreen({ profile, onNext, onBack }) {
  const goal = goalData(profile.pathway, profile.goalId);
  if (!goal) return null;
  const content = methodContent(profile.goalId, profile.pathway, profile.situationId, profile.focusId);
  return (
    <Screen>
      <Header onBack={onBack} railStep={2} railFraction={1} />
      <Body>
        <div className="flex min-h-full flex-col pb-4 pt-2 text-center">
          <div className="funnel-rise" style={{ animationDelay: "40ms" }}>
            <Eyebrow>{METHOD_SCREEN.eyebrow}</Eyebrow>
          </div>
          <div className="funnel-rise mt-3" style={{ animationDelay: "110ms" }}>
            <Title center size={30}>{methodTitle(profile.triedId)}</Title>
            <Subtitle center className="mt-3">{content.subtitle}</Subtitle>
          </div>
          <div className="funnel-rise mt-6" style={{ animationDelay: "190ms" }}>
            <ClinicalVisual phases={content.phases} symbol={content.symbol} />
          </div>
          <div className="funnel-rise mt-4 text-left" style={{ animationDelay: "260ms" }}>
            <SealLine>{METHOD_SCREEN.clinical}</SealLine>
          </div>
        </div>
      </Body>
      <Footer>
        <Button onClick={onNext} variant="rose" id="onboarding.method.continue">
          {METHOD_SCREEN.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
