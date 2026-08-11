"use client";

// Screen 5. The safety questions, and the last thing she is asked.
//
// "None of these" is mutually exclusive with the four cards on purpose: an
// answer of "nothing, and also pelvic pain" is not an answer, and letting it
// through would put a contradiction into the plan copy two screens later.

import React from "react";
import { CircleCheck } from "lucide-react";
import {
  ACTIVITY_HELPER, ACTIVITY_LEVELS, ACTIVITY_QUESTION, HEALTH_CONDITIONS,
  HEALTH_HEADLINE, HEALTH_NONE_LABEL, health,
} from "./copy";
import SFIcon from "./icons";
import { PrimaryButton, ScreenHeader, ScrollMoreHint, useHasMoreBelow } from "./ui";

function ConditionCard({ condition, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(condition.id)}
      aria-pressed={selected}
      className={`relative flex h-[115px] w-full flex-col items-center gap-2 rounded-[24px] bg-white px-2 pb-3 pt-[18px] text-center transition-all duration-200 motion-reduce:transition-none ${
        selected
          ? "scale-[1.04] border-[3px] border-ios-pink shadow-[0_5px_14px_rgba(255,45,85,0.16)]"
          : "border-[1.5px] border-app-borderIdle shadow-[0_5px_10px_rgba(0,0,0,0.04)]"
      }`}
    >
      <span className="flex h-[35px] items-center justify-center">
        <SFIcon name={condition.icon} size={28} className="text-ios-pink" strokeWidth={1.5} />
      </span>
      <span className="flex min-h-[40px] items-center justify-center text-[14px] font-semibold leading-tight text-app-textPrimary sm:text-[15px]">
        {condition.title}
      </span>
      {selected ? (
        <CircleCheck
          aria-hidden="true"
          size={24}
          strokeWidth={2.2}
          className="funnel-pop absolute right-2 top-2 text-ios-pink"
        />
      ) : null}
    </button>
  );
}

function Pill({ children, selected, onClick, pressed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex h-[50px] w-full items-center justify-center rounded-[25px] bg-white px-4 text-[15px] font-medium transition-colors duration-200 motion-reduce:transition-none sm:text-[16px] ${
        selected
          ? "border-[3px] border-ios-pink text-ios-pink"
          : "border-[1.5px] border-app-borderIdle text-app-textSecondary"
      }`}
    >
      {children}
    </button>
  );
}

export default function HealthInfoScreen({ profile, onPatch, onNext, onBack }) {
  const block = health(profile.goalId);
  const { ref, hasMore, onScroll } = useHasMoreBelow();

  const conditions = profile.conditions || [];
  const answeredConditions = profile.noConditions || conditions.length > 0;
  // Whether she has told us everything, used ONLY to fill the progress rail and
  // to decide what to default on the way out. It no longer gates the button.
  const ready = answeredConditions && Boolean(profile.activity);

  // THE BUTTON IS NEVER DISABLED, and that is deliberate.
  //
  // It used to need both answers. A disabled primary button is indistinguishable
  // from a broken one: paid visitors were tapping it, getting nothing, and
  // leaving. Neither answer is load-bearing enough to lose a sale over. No
  // condition selected already means "none", and activityPhrase() in
  // funnelState.js has always fallen back to "lightly active", so an unanswered
  // screen produces exactly the plan it produced before, with no empty strings
  // downstream.
  //
  // The defaults are written on the way out rather than left undefined so the
  // plan reveal, the analytics tags and the member record all see the same
  // values a woman who answered explicitly would have produced.
  const continueToPlan = () => {
    const patch = {};
    if (!answeredConditions) patch.noConditions = true;
    if (!profile.activity) patch.activity = "light";
    if (Object.keys(patch).length) onPatch(patch);
    onNext();
  };

  const toggleCondition = (id) => {
    const next = conditions.includes(id)
      ? conditions.filter((c) => c !== id)
      : [...conditions, id];
    onPatch({ conditions: next, noConditions: false });
  };

  const chooseNone = () => {
    onPatch({ conditions: [], noConditions: !profile.noConditions });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app-background">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <ScreenHeader onBack={onBack} railStep={4} railFraction={ready ? 1 : 0.5} />
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={ref}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain no-scrollbar px-6 pb-10 pt-6"
        >
          <h1 className="text-center text-[26px] font-bold leading-[1.04] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
            {HEALTH_HEADLINE}
          </h1>
          <p className="mx-auto mt-3 max-w-[21rem] text-center text-[14px] leading-[1.18] text-app-textSecondary sm:text-[16px]">
            {block.subtitle}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-4">
            {HEALTH_CONDITIONS.map((condition) => (
              <ConditionCard
                key={condition.id}
                condition={condition}
                selected={conditions.includes(condition.id)}
                onToggle={toggleCondition}
              />
            ))}
          </div>

          <p
            aria-live="polite"
            className={`mt-3 min-h-[20px] text-[14px] font-medium text-app-positiveInk transition-opacity duration-200 motion-reduce:transition-none ${
              answeredConditions ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Rendered empty rather than faded out. The old version kept the
                sentence in the DOM at opacity 0, so aria-live had nothing to
                announce when it appeared: the text had not changed, only its
                opacity, and a reader was told nothing either way. */}
            {answeredConditions
              ? profile.noConditions
                ? block.helperNone
                : block.helperSelected
              : ""}
          </p>

          <div className="mt-4">
            <Pill selected={profile.noConditions} pressed={profile.noConditions} onClick={chooseNone}>
              {HEALTH_NONE_LABEL}
            </Pill>
          </div>

          <h2 className="mt-8 text-center text-[18px] font-bold text-app-textPrimary sm:text-[19px]">
            {ACTIVITY_QUESTION}
          </h2>
          <div className="mt-4 space-y-3">
            {ACTIVITY_LEVELS.map((level) => (
              <Pill
                key={level.id}
                selected={profile.activity === level.id}
                pressed={profile.activity === level.id}
                onClick={() => onPatch({ activity: level.id })}
              >
                {level.title}
              </Pill>
            ))}
          </div>

          <p
            aria-live="polite"
            className={`mt-3 min-h-[20px] text-[14px] font-medium text-app-positiveInk transition-opacity duration-200 motion-reduce:transition-none ${
              profile.activity ? "opacity-100" : "opacity-0"
            }`}
          >
            {profile.activity ? ACTIVITY_HELPER : ""}
          </p>
        </div>
        <ScrollMoreHint visible={hasMore} />
      </div>

      <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5">
        <PrimaryButton onClick={continueToPlan}>
          {block.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
