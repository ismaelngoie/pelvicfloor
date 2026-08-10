"use client";

// Screen 4. Four questions, asked by Coach Mia rather than printed on a form.
//
// Two things carried over deliberately from the old funnel: the chat framing,
// because it is why women answer a weight question at all, and the scroll wheel
// itself. One thing added, because its absence was a real gap: units. The phone
// has always offered lbs/kg and feet/cm. The web asked everyone for pounds and
// inches, which quietly told most of the world this app was not for them.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  MIA_NAME_QUESTION, miaAgeQuestion, miaHeightQuestion, miaWeightQuestion,
} from "./copy";
import {
  AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE, clamp, cmToInches, feetInchesLabel,
  inchesToCm, kgToLbs, lbsToKg,
} from "./funnelState";
import WheelPicker, { buildRange } from "./WheelPicker";
import { trackIntakeStep } from "@/lib/analytics";
import {
  PrimaryButton, ScreenHeader, Typewriter, useKeyboardInset, useReducedMotion,
} from "./ui";

const SUB_STEPS = ["name", "age", "weight", "height"];

function TypingDots() {
  return (
    <span className="flex items-center gap-[5px] py-1" aria-label="Coach Mia is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-pulse rounded-full bg-ios-gray4 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

function MiaBubble({ text, showTyping }) {
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/coachMiaAvatar.png"
        alt="Coach Mia"
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-full border-2 border-ios-pink/25 object-cover"
      />
      <div className="min-w-0 flex-1 rounded-[24px] rounded-tl-none bg-white px-[18px] py-4 shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        {showTyping ? (
          <TypingDots />
        ) : (
          <Typewriter
            key={text}
            text={text}
            className="block text-[16px] leading-[1.25] text-app-textPrimary sm:text-[17px]"
          />
        )}
      </div>
    </div>
  );
}

/** lbs | kg, feet | cm. Two options, so a real radio group beats a select. */
function UnitToggle({ label, options, value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="mx-auto flex w-[168px] rounded-full bg-app-borderIdle p-1"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`h-9 flex-1 rounded-full text-[14px] transition-colors duration-150 motion-reduce:transition-none ${
              active
                ? "bg-ios-pink font-semibold text-white"
                : "font-medium text-app-textSecondary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function NameField({ value, onChange, onSubmit }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[20rem]">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          // Clarity masks input values by default, and this says so out loud so
          // that flipping the project to a looser masking mode in the Clarity
          // dashboard cannot quietly start recording first names. What analytics
          // gets from this screen is which question she was on, never her answer.
          data-clarity-mask="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder="Your first name"
          aria-label="Your first name"
          autoComplete="given-name"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          className="w-full bg-transparent px-9 pb-2 text-center text-[24px] font-medium text-app-textPrimary caret-ios-pink outline-none placeholder:text-app-textSecondary/45 sm:text-[28px]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear your name"
            className="absolute bottom-2 right-0 flex h-9 w-9 items-center justify-center rounded-full text-app-textSecondary/60 transition-colors active:bg-black/5"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className={`h-[2px] w-full rounded-full transition-colors duration-200 motion-reduce:transition-none ${
          focused ? "bg-ios-pink" : "bg-app-borderIdle"
        }`}
      />
    </div>
  );
}

export default function PersonalIntakeScreen({ profile, onPatch, onNext, onBack }) {
  const reduced = useReducedMotion();
  const keyboardInset = useKeyboardInset();
  // Which of the four questions she is on is part of "where she was". Coming
  // back to the name field when she had already answered three questions is a
  // resume in name only.
  const [subStep, setSubStep] = useState(
    SUB_STEPS.includes(profile.intakeStep) ? profile.intakeStep : "name"
  );
  const [greeting, setGreeting] = useState(!reduced);
  const [name, setName] = useState(profile.name || "");

  // --- Clarity: the four questions are four rungs, not one --------------------
  //
  // The funnel's step id for this whole screen is "intake", and Funnel.js
  // deliberately records nothing for it, because "she left somewhere in the
  // intake" is not an answer anybody can act on. Recorded per sub-step, the
  // wheel pickers are separable from the name field and from each other, which
  // is how "they leave on the height picker" becomes a number instead of a
  // hunch. Nothing she typed or scrolled to is sent, only which question she
  // was looking at.
  useEffect(() => {
    trackIntakeStep(subStep);
  }, [subStep]);

  // One typing indicator, on the very first question only. After that Mia is
  // already "in the room" and a second pause just costs 800ms.
  useEffect(() => {
    if (!greeting) return undefined;
    const timer = setTimeout(() => setGreeting(false), 800);
    return () => clearTimeout(timer);
  }, [greeting]);

  const ageRange = useMemo(() => buildRange(AGE_RANGE.min, AGE_RANGE.max), []);
  const weightRange = useMemo(
    () =>
      profile.weightUnit === "kg"
        ? buildRange(WEIGHT_RANGE.kg.min, WEIGHT_RANGE.kg.max)
        : buildRange(WEIGHT_RANGE.lbs.min, WEIGHT_RANGE.lbs.max),
    [profile.weightUnit]
  );
  const heightRange = useMemo(
    () =>
      profile.heightUnit === "cm"
        ? buildRange(HEIGHT_RANGE.cm.min, HEIGHT_RANGE.cm.max)
        : buildRange(HEIGHT_RANGE.ft.min, HEIGHT_RANGE.ft.max),
    [profile.heightUnit]
  );

  const weightValue =
    profile.weightUnit === "kg"
      ? clamp(lbsToKg(profile.weightLbs), WEIGHT_RANGE.kg.min, WEIGHT_RANGE.kg.max)
      : clamp(profile.weightLbs, WEIGHT_RANGE.lbs.min, WEIGHT_RANGE.lbs.max);

  const heightValue =
    profile.heightUnit === "cm"
      ? clamp(inchesToCm(profile.heightInches), HEIGHT_RANGE.cm.min, HEIGHT_RANGE.cm.max)
      : clamp(profile.heightInches, HEIGHT_RANGE.ft.min, HEIGHT_RANGE.ft.max);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2;

  const question = {
    name: MIA_NAME_QUESTION,
    age: miaAgeQuestion(profile.goalId, trimmedName),
    weight: miaWeightQuestion(profile.goalId, profile.age),
    height: miaHeightQuestion(profile.goalId),
  }[subStep];

  const index = SUB_STEPS.indexOf(subStep);
  const canAdvance = subStep === "name" ? nameValid : true;

  const moveTo = (next) => {
    setSubStep(next);
    onPatch({ intakeStep: next });
  };

  const goBack = () => {
    if (index === 0) {
      onBack();
      return;
    }
    moveTo(SUB_STEPS[index - 1]);
  };

  const goForward = () => {
    if (!canAdvance) return;
    if (subStep === "name") onPatch({ name: trimmedName });
    if (index === SUB_STEPS.length - 1) {
      onPatch({ intakeStep: "name" });
      onNext();
      return;
    }
    moveTo(SUB_STEPS[index + 1]);
  };

  const conversion = {
    name: null,
    age: `${profile.age} years old`,
    weight:
      profile.weightUnit === "kg"
        ? `${kgToLbs(weightValue)} lbs`
        : `${lbsToKg(weightValue)} kg`,
    height:
      profile.heightUnit === "cm"
        ? feetInchesLabel(cmToInches(heightValue))
        : `${inchesToCm(heightValue)} cm`,
  }[subStep];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app-background">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <ScreenHeader onBack={goBack} railStep={3} railFraction={(index + 1) / 4} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 pb-4 pt-6">
        <div className="flex min-h-full flex-col">
          <MiaBubble text={question} showTyping={greeting && subStep === "name"} />

          {/* The answer sits centred between what Mia said and the button, so
              the eye travels question, answer, next, with nothing in between. */}
          <div className="flex flex-1 flex-col justify-center py-8">
            {subStep === "name" ? (
              <NameField value={name} onChange={setName} onSubmit={goForward} />
            ) : null}

            {subStep === "age" ? (
              <div className="space-y-3">
                <WheelPicker
                  range={ageRange}
                  value={clamp(profile.age, AGE_RANGE.min, AGE_RANGE.max)}
                  onChange={(age) => onPatch({ age })}
                  label="Your age in years"
                  valueText={`${profile.age} years old`}
                />
                <p className="text-center text-[14px] text-app-textSecondary">{conversion}</p>
              </div>
            ) : null}

            {subStep === "weight" ? (
              <div className="space-y-4">
                <UnitToggle
                  label="Weight units"
                  value={profile.weightUnit}
                  onChange={(weightUnit) => onPatch({ weightUnit })}
                  options={[
                    { id: "lbs", label: "lbs" },
                    { id: "kg", label: "kg" },
                  ]}
                />
                <WheelPicker
                  range={weightRange}
                  value={weightValue}
                  onChange={(next) =>
                    onPatch({
                      weightLbs: profile.weightUnit === "kg" ? kgToLbs(next) : next,
                    })
                  }
                  unit={profile.weightUnit}
                  label={`Your weight in ${profile.weightUnit === "kg" ? "kilograms" : "pounds"}`}
                  valueText={`${weightValue} ${profile.weightUnit}`}
                />
                <p className="text-center text-[14px] text-app-textSecondary">{conversion}</p>
              </div>
            ) : null}

            {subStep === "height" ? (
              <div className="space-y-4">
                <UnitToggle
                  label="Height units"
                  value={profile.heightUnit}
                  onChange={(heightUnit) => onPatch({ heightUnit })}
                  options={[
                    { id: "ft", label: "feet" },
                    { id: "cm", label: "cm" },
                  ]}
                />
                <WheelPicker
                  range={heightRange}
                  value={heightValue}
                  onChange={(next) =>
                    onPatch({
                      heightInches: profile.heightUnit === "cm" ? cmToInches(next) : next,
                    })
                  }
                  unit={profile.heightUnit === "cm" ? "cm" : undefined}
                  formatLabel={profile.heightUnit === "cm" ? undefined : feetInchesLabel}
                  label={`Your height in ${profile.heightUnit === "cm" ? "centimetres" : "feet and inches"}`}
                  valueText={
                    profile.heightUnit === "cm"
                      ? `${heightValue} centimetres`
                      : feetInchesLabel(heightValue)
                  }
                />
                <p className="text-center text-[14px] text-app-textSecondary">{conversion}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5"
        style={keyboardInset ? { paddingBottom: keyboardInset + 16 } : undefined}
      >
        <PrimaryButton onClick={goForward} disabled={!canAdvance}>
          {subStep === "height" ? "Continue" : "Next"}
        </PrimaryButton>
      </div>
    </div>
  );
}
