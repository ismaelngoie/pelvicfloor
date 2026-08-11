"use client";

// Screen 2. One tap, and it decides the other ninety days.
//
// The grid scrolls on short phones, which is where the old version fell over:
// the cards were in the same scroll box as the heading, so the third row rode
// up over the subtitle. Here the heading is pinned, only the grid moves, and a
// fade plus a chevron says there is more underneath. The third row is left
// deliberately peeking above the fold, exactly as on iOS, because a grid that
// looks complete does not get scrolled.

import React from "react";
import { Check } from "lucide-react";
import { GOALS } from "@/lib/program";
import { GOAL_CTA, GOAL_HEADLINE, GOAL_SUBTITLE } from "./copy";
import {
  PrimaryButton, ScreenHeader, ScrollMoreHint, useHasMoreBelow,
} from "./ui";

function GoalCard({ goal, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(goal.id)}
      aria-pressed={selected}
      className={`relative flex h-[134px] w-full flex-col items-center justify-center gap-3 rounded-[26px] px-3 pb-3.5 pt-5 text-center transition-all duration-200 motion-reduce:transition-none ${
        selected
          ? "scale-[1.04] border-[2.5px] border-ios-pink shadow-[0_6px_18px_rgba(255,45,85,0.18)]"
          : "border-[1.5px] border-app-borderIdle shadow-[0_6px_14px_rgba(0,0,0,0.05)]"
      }`}
      style={{ background: `linear-gradient(160deg, ${goal.from} 0%, ${goal.to} 100%)` }}
    >
      {/* Selection wash. A tint over the whole card, not a new background, so
          the per-goal gradient still shows through. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-[24px] bg-ios-pink/[0.08] transition-opacity duration-200 motion-reduce:transition-none ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        aria-hidden="true"
        className="relative flex h-11 items-center justify-center text-[32px] leading-none"
      >
        {goal.emoji}
      </span>
      <span
        className={`relative flex min-h-[44px] items-center justify-center text-[14px] font-semibold leading-tight sm:text-[15px] ${
          selected ? "text-ios-pink" : "text-app-textPrimary"
        }`}
      >
        {goal.title}
      </span>
      {selected ? (
        <span
          aria-hidden="true"
          className="funnel-pop absolute right-2.5 top-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ios-pink"
        >
          <Check size={15} strokeWidth={3} className="text-white" />
        </span>
      ) : null}
    </button>
  );
}

export default function SelectGoalScreen({ goalId, onSelect, onNext, onBack }) {
  const { ref, hasMore, onScroll } = useHasMoreBelow();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-app-background">
      {/* A soft pink spotlight behind the chosen card, so the selection lands
          somewhere rather than just switching a border on. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-500 motion-reduce:transition-none ${
          goalId ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(255,45,85,0.12) 0%, rgba(255,45,85,0) 68%)",
        }}
      />

      <div className="relative z-10 shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <ScreenHeader onBack={onBack} railStep={1} railFraction={goalId ? 1 : 0.14} />
        <h1 className="mt-8 text-center text-[26px] font-bold leading-[1.04] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
          {GOAL_HEADLINE}
        </h1>
        <p className="mx-auto mt-3 max-w-[22rem] text-center text-[14px] leading-[1.18] text-app-textSecondary sm:text-[16px]">
          {GOAL_SUBTITLE}
        </p>
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        <div
          ref={ref}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain no-scrollbar px-6 pb-8 pt-[18px]"
        >
          <div className="grid grid-cols-2 gap-4">
            {GOALS.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                selected={goalId === goal.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
        <ScrollMoreHint visible={hasMore} />
      </div>

      <div className="relative z-10 shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5">
        {/* A disabled button that does not say why reads as a broken one, and on
            paid traffic that is a lost sale. The goal genuinely IS required (the
            whole 90 day plan is built from it), so rather than letting anyone
            through, the button explains itself until she has picked. */}
        <PrimaryButton onClick={onNext} disabled={!goalId}>
          {goalId ? GOAL_CTA : "Pick a goal above to continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
