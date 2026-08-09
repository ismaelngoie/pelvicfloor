"use client";

// The seven seconds between the last question and the plan.
//
// Let us be honest about what this is: the plan is already decided the moment
// she picks a goal. This screen is not computing anything. What it is doing is
// showing her the shape of the work, in her own words, so that the plan on the
// next screen reads as hers rather than as a page that was always going to load.
// Everything on it is true. Nothing on it is invented.

import React, { useEffect, useRef, useState } from "react";
import { Check, Circle } from "lucide-react";
import {
  PERSONALIZING_PHASE_1, PERSONALIZING_PHASE_2, PERSONALIZING_STATUS,
  PERSONALIZING_TOTAL_MS, personalizing,
} from "./copy";
import { BackButton, Typewriter, useThemeColor } from "./ui";

const CHECKLIST_START = PERSONALIZING_PHASE_1 + PERSONALIZING_PHASE_2;
const CHECKLIST_SPAN = 1 - CHECKLIST_START;

function AICore() {
  return (
    <div aria-hidden="true" className="funnel-fade relative h-[150px] w-[150px]">
      <svg viewBox="0 0 150 150" className="h-full w-full">
        <circle
          cx="75" cy="75" r="40" fill="none" stroke="#FF2D55" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="170 82" opacity="1"
          className="funnel-ring-a"
          style={{ transformBox: "view-box", transformOrigin: "75px 75px" }}
        />
        <circle
          cx="75" cy="75" r="55" fill="none" stroke="#FF2D55" strokeWidth="2"
          strokeLinecap="round" strokeDasharray="230 116" opacity="0.7"
          className="funnel-ring-b"
          style={{ transformBox: "view-box", transformOrigin: "75px 75px" }}
        />
        <circle
          cx="75" cy="75" r="70" fill="none" stroke="#FF2D55" strokeWidth="1"
          strokeLinecap="round" strokeDasharray="300 140" opacity="0.5"
          className="funnel-ring-c"
          style={{ transformBox: "view-box", transformOrigin: "75px 75px" }}
        />
      </svg>
      <span
        className="funnel-orb absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ios-pink"
        style={{ boxShadow: "0 0 15px rgba(255,45,85,0.9)" }}
      />
    </div>
  );
}

function ChecklistRow({ label, state, progress }) {
  const done = state === "done";
  return (
    <li
      className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-[18px]"
      aria-live="off"
    >
      {/* The pink stroke fills around the row while it is the one being worked
          on, then the circle becomes a tick. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-ios-pink transition-opacity duration-300 motion-reduce:transition-none"
        style={{
          opacity: state === "working" ? 0.25 + progress * 0.75 : done ? 0 : 0,
        }}
      />
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {done ? (
          <Check aria-hidden="true" size={20} strokeWidth={3} className="funnel-pop text-ios-pink" />
        ) : (
          <Circle
            aria-hidden="true"
            size={18}
            strokeWidth={0}
            fill="currentColor"
            className={state === "working" ? "text-ios-pink" : "text-ios-pink/60"}
          />
        )}
      </span>
      <span className="relative text-[15px] font-medium text-white/85 sm:text-[16px]">{label}</span>
      <span className="sr-only">{done ? "Ready" : "Getting ready"}</span>
    </li>
  );
}

export default function PersonalizingScreen({ profile, onDone, onBack }) {
  const block = personalizing(profile.goalId, profile.name);
  const [t, setT] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useThemeColor("#000000");

  useEffect(() => {
    let frame = 0;
    let settle = 0;
    const start = performance.now();
    const tick = (now) => {
      const next = Math.min(1, (now - start) / PERSONALIZING_TOTAL_MS);
      setT(next);
      if (next < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        // A beat on 100% before the plan appears. Landing the number and
        // switching screens in the same frame reads as a glitch.
        settle = window.setTimeout(() => doneRef.current?.(), 900);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, []);

  const inChecklist = t >= CHECKLIST_START;
  const checklistT = inChecklist ? (t - CHECKLIST_START) / CHECKLIST_SPAN : 0;
  const perItem = 1 / block.checklist.length;
  const activeIndex = Math.min(block.checklist.length - 1, Math.floor(checklistT / perItem));

  const statusLine = t < PERSONALIZING_PHASE_1 ? block.connecting : block.calibrating;

  const footerStatus =
    t >= 1
      ? PERSONALIZING_STATUS.done
      : inChecklist
        ? PERSONALIZING_STATUS.settingUp(block.checklist[activeIndex])
        : t < PERSONALIZING_PHASE_1
          ? PERSONALIZING_STATUS.matching
          : PERSONALIZING_STATUS.preparing;

  const percent = Math.round(t * 100);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-black font-system">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] md:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} tone="dark" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar px-6 pb-4">
        <h1 className="shrink-0 pt-2 text-center text-[22px] font-bold leading-tight text-white sm:text-[24px]">
          {block.title}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] shrink-0 text-center text-[15px] leading-snug text-neutral-400 sm:text-[16px]">
          {block.subtitle}
        </p>

        {inChecklist ? null : (
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <div className="flex min-h-[60px] w-full items-end justify-center">
              <p
                aria-live="polite"
                className="w-full text-center text-[19px] font-medium leading-snug text-white/85 sm:text-[22px]"
              >
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
            {block.checklist.map((item, i) => {
              const itemStart = i * perItem;
              const local = (checklistT - itemStart) / perItem;
              const state = local >= 1 ? "done" : local >= 0 ? "working" : "pending";
              return (
                <ChecklistRow
                  key={item}
                  label={item}
                  state={state}
                  progress={Math.min(1, Math.max(0, local))}
                />
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),18px)] pt-3 md:pb-6">
        <div className="flex items-end justify-between">
          <span className="text-[15px] font-medium text-white/85 sm:text-[16px]">Progress</span>
          <span className="font-mono text-[22px] font-bold text-white sm:text-[24px]">{percent}%</span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Building your plan"
        >
          <div className="h-full rounded-full bg-ios-pink" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-[14px] font-medium text-ios-pink sm:text-[15px]">{footerStatus}</p>
      </div>
    </div>
  );
}
