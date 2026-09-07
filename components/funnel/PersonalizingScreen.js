"use client";

// "Coach Mia™ is building your … plan" (PlanRevealViewController, phase two):
// seven seconds, black, the rose core, then the checklist that echoes her own
// situation and focus before the reveal.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Circle } from "lucide-react";
import { PERSONALIZING, focusData, personalizedChecklist, personalizingCopy, situationData } from "./appCopy";
import { BackButton } from "./atelier";
import { Typewriter, useThemeColor } from "./ui";

const PHASE_1 = 0.25;
const PHASE_2 = 0.2;
const CHECKLIST_START = PHASE_1 + PHASE_2;
const CHECKLIST_SPAN = 1 - CHECKLIST_START;

function AICore() {
  return (
    <div aria-hidden="true" className="funnel-fade relative h-[150px] w-[150px]">
      <svg viewBox="0 0 150 150" className="h-full w-full">
        <circle cx="75" cy="75" r="40" fill="none" stroke="#E65473" strokeWidth="3" strokeLinecap="round" strokeDasharray="170 82" className="funnel-ring-a" style={{ transformBox: "view-box", transformOrigin: "75px 75px" }} />
        <circle cx="75" cy="75" r="55" fill="none" stroke="#E65473" strokeWidth="2" strokeLinecap="round" strokeDasharray="230 116" opacity="0.7" className="funnel-ring-b" style={{ transformBox: "view-box", transformOrigin: "75px 75px" }} />
        <circle cx="75" cy="75" r="70" fill="none" stroke="#E65473" strokeWidth="1" strokeLinecap="round" strokeDasharray="300 140" opacity="0.5" className="funnel-ring-c" style={{ transformBox: "view-box", transformOrigin: "75px 75px" }} />
      </svg>
      <span className="funnel-orb absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-atelier-rose" style={{ boxShadow: "0 0 15px rgba(230,84,115,0.9)" }} />
    </div>
  );
}

function ChecklistRow({ label, state, progress }) {
  const done = state === "done";
  return (
    <li className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-[18px]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-atelier-rose transition-opacity duration-300 motion-reduce:transition-none"
        style={{ opacity: state === "working" ? 0.25 + progress * 0.75 : 0 }}
      />
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {done ? (
          <Check aria-hidden="true" size={20} strokeWidth={3} className="funnel-pop text-atelier-rose" />
        ) : (
          <Circle aria-hidden="true" size={18} strokeWidth={0} fill="currentColor" className={state === "working" ? "text-atelier-rose" : "text-atelier-rose/60"} />
        )}
      </span>
      <span className="relative text-[15px] font-medium text-white/85 sm:text-[16px]">{label}</span>
      <span className="sr-only">{done ? "Ready" : "Getting ready"}</span>
    </li>
  );
}

export default function PersonalizingScreen({ profile, onDone, onBack }) {
  const { pathway, goalId } = profile;
  const block = useMemo(() => personalizingCopy(goalId, pathway, profile.name), [goalId, pathway, profile.name]);
  const checklist = useMemo(
    () =>
      personalizedChecklist({
        goalId,
        situation: situationData(pathway, goalId, profile.situationId),
        focus: focusData(pathway, goalId, profile.focusId),
        fallback: block.checklist,
      }),
    [goalId, pathway, profile.situationId, profile.focusId, block]
  );
  const [t, setT] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useThemeColor("#000000");

  useEffect(() => {
    let frame = 0;
    let settle = 0;
    const start = performance.now();
    const tick = (now) => {
      const next = Math.min(1, (now - start) / PERSONALIZING.totalMs);
      setT(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else settle = window.setTimeout(() => doneRef.current?.(), 900);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, []);

  const inChecklist = t >= CHECKLIST_START;
  const checklistT = inChecklist ? (t - CHECKLIST_START) / CHECKLIST_SPAN : 0;
  const perItem = 1 / checklist.length;
  const activeIndex = Math.min(checklist.length - 1, Math.floor(checklistT / perItem));
  const statusLine = t < PHASE_1 ? block.connecting : block.calibrating;
  const footerStatus =
    t >= 1
      ? PERSONALIZING.finalStatus
      : inChecklist
        ? `${PERSONALIZING.analyzing}${checklist[activeIndex]}`
        : t < PHASE_1
          ? PERSONALIZING.connecting
          : PERSONALIZING.calibrating;
  const percent = Math.round(t * 100);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-black font-figtree">
      <div className="shrink-0 px-4 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} tone="dark" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar px-6 pb-4">
        <h1 className="shrink-0 pt-2 text-center font-serif text-[26px] leading-tight text-white sm:text-[28px]">{block.title}</h1>
        <p className="mx-auto mt-2 max-w-[22rem] shrink-0 text-center text-[15px] leading-snug text-white/60 sm:text-[16px]">{block.subtitle}</p>
        {inChecklist ? null : (
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <div className="flex min-h-[60px] w-full items-end justify-center">
              <p aria-live="polite" className="w-full text-center text-[19px] font-medium leading-snug text-white/85 sm:text-[22px]">
                <Typewriter key={statusLine} text={statusLine} centered />
              </p>
            </div>
            <div className="mt-6">
              <AICore />
            </div>
          </div>
        )}
        {inChecklist ? (
          <ul className="funnel-fade my-auto space-y-4 py-6">
            {checklist.map((item, i) => {
              const itemStart = i * perItem;
              const local = (checklistT - itemStart) / perItem;
              const state = local >= 1 ? "done" : local >= 0 ? "working" : "pending";
              return <ChecklistRow key={item} label={item} state={state} progress={Math.min(1, Math.max(0, local))} />;
            })}
          </ul>
        ) : null}
      </div>
      <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),18px)] pt-3 tab:pb-6">
        <div className="flex items-end justify-between">
          <span className="text-[15px] font-medium text-white/85 sm:text-[16px]">{PERSONALIZING.progress}</span>
          <span className="font-mono text-[22px] font-bold text-white sm:text-[24px]">{percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={PERSONALIZING.mainTitle}>
          <div className="h-full rounded-full bg-atelier-rose" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-[14px] font-medium text-atelier-rose sm:text-[15px]">{footerStatus}</p>
      </div>
    </div>
  );
}
