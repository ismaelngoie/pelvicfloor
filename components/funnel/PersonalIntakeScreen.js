"use client";

// Coach Mia's intake (PersonalIntakeViewController): name, age, height,
// weight, in her own words and in that order, then the 5-minute clinical
// profile card and one member's story before the health check-in.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  INTAKE_SCREEN, frequencyData, goalData, memberPortrait, memberStory, miaQuestion, profileContext, situationData,
  triedData,
} from "./appCopy";
import {
  AGE_RANGE, HEIGHT_RANGE, INTAKE_STEPS, WEIGHT_RANGE, clamp, cmToInches, feetInchesLabel, feetInchesPrime,
  inchesToCm, kgToLbs, lbsToKg,
} from "./funnelState";
import WheelPicker, { buildRange } from "./WheelPicker";
import { trackIntakeStep } from "@/lib/analytics";
import { Body, Button, Card, Eyebrow, Face, Footer, Header, Screen } from "./atelier";
import { Typewriter, useKeyboardInset } from "./ui";

function MiaBubble({ text, onDone }) {
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coachMiaAvatar.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-atelier-rose/[0.12] object-cover" />
      <div className="min-w-0 flex-1 rounded-[18px] rounded-tl-[6px] border border-atelier-line bg-atelier-card px-4 py-3">
        <p className="text-[15px] leading-[1.45] text-atelier-ink" aria-live="polite">
          <Typewriter key={text} text={text} tailClassName="text-transparent" onDone={onDone} />
        </p>
      </div>
    </div>
  );
}

function UnitToggle({ options, value, onChange, label }) {
  return (
    <div className="mx-auto flex w-fit rounded-full border border-atelier-line bg-atelier-card p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-w-[64px] rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-colors ${
              active ? "bg-atelier-ink text-white" : "text-atelier-ink2"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({ value, label, detail }) {
  return (
    <div className="flex-1 rounded-[16px] border border-atelier-line bg-atelier-card px-2 py-3 text-center">
      <p className="text-[20px] font-bold leading-none text-atelier-ink">{value}</p>
      <p className="mt-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-atelier-rose">{label}</p>
      <p className="text-[11px] text-atelier-ink3">{detail}</p>
    </div>
  );
}

export default function PersonalIntakeScreen({ profile, onPatch, onNext, onBack }) {
  const { pathway, goalId } = profile;
  const goal = goalData(pathway, goalId);
  const step = INTAKE_STEPS.includes(profile.intakeStep) ? profile.intakeStep : "name";
  const index = INTAKE_STEPS.indexOf(step);
  const keyboardInset = useKeyboardInset();
  const [typed, setTyped] = useState(false);
  const inputRef = useRef(null);

  const situation = situationData(pathway, goalId, profile.situationId);
  const frequency = frequencyData(pathway, goalId, profile.frequencyId);
  const tried = triedData(pathway, goalId, profile.triedId);

  useEffect(() => {
    trackIntakeStep(step);
    setTyped(false);
  }, [step]);

  const question = useMemo(
    () =>
      miaQuestion({
        step,
        goalId,
        pathway,
        name: profile.name,
        age: profile.age,
        situationTitle: situation?.title?.toLowerCase() || null,
        triedId: profile.triedId,
      }),
    [step, goalId, pathway, profile.name, profile.age, profile.triedId, situation]
  );

  const go = (next) => onPatch({ intakeStep: next });
  const goBack = () => {
    if (index === 0) onBack();
    else go(INTAKE_STEPS[index - 1]);
  };
  const advance = () => {
    if (index >= INTAKE_STEPS.length - 1) onNext();
    else go(INTAKE_STEPS[index + 1]);
  };

  const ageRange = useMemo(() => buildRange(AGE_RANGE.min, AGE_RANGE.max), []);
  const weightRange = useMemo(
    () => (profile.weightUnit === "kg" ? buildRange(WEIGHT_RANGE.kg.min, WEIGHT_RANGE.kg.max) : buildRange(WEIGHT_RANGE.lbs.min, WEIGHT_RANGE.lbs.max)),
    [profile.weightUnit]
  );
  const heightRange = useMemo(
    () => (profile.heightUnit === "cm" ? buildRange(HEIGHT_RANGE.cm.min, HEIGHT_RANGE.cm.max) : buildRange(HEIGHT_RANGE.ft.min, HEIGHT_RANGE.ft.max)),
    [profile.heightUnit]
  );
  const weightValue = profile.weightUnit === "kg" ? lbsToKg(profile.weightLbs) : profile.weightLbs;
  const heightValue = profile.heightUnit === "cm" ? inchesToCm(profile.heightInches) : profile.heightInches;

  if (!goal) return null;

  const heightText = profile.heightUnit === "cm" ? `${inchesToCm(profile.heightInches)} cm` : feetInchesPrime(profile.heightInches);
  const weightText = profile.weightUnit === "kg" ? `${lbsToKg(profile.weightLbs)} kg` : `${profile.weightLbs} lb`;
  const name = (profile.name || "").trim();
  const story = memberStory(goalId, pathway);
  const canContinue =
    step === "name" ? name.length > 0 : true;

  const isQuestion = index <= 3;

  return (
    <Screen>
      <Header onBack={goBack} railStep={3} railFraction={0.2 + ((index + 1) / INTAKE_STEPS.length) * 0.8} />
      <Body>
        {isQuestion ? (
          <div key={step} className="funnel-rise space-y-5 pb-4 pt-2" style={{ animationDelay: "40ms" }}>
            <MiaBubble text={question} onDone={() => setTyped(true)} />

            {step === "name" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canContinue) advance();
                }}
              >
                <label className="sr-only" htmlFor="intake-name">Your first name</label>
                <input
                  id="intake-name"
                  ref={inputRef}
                  type="text"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder={INTAKE_SCREEN.namePlaceholder}
                  value={profile.name}
                  onChange={(e) => onPatch({ name: e.target.value })}
                  className="h-14 w-full rounded-[18px] border border-atelier-line bg-atelier-card px-5 text-[18px] font-semibold text-atelier-ink outline-none placeholder:font-normal placeholder:text-atelier-ink3 focus:border-atelier-rose"
                />
              </form>
            ) : null}

            {step === "age" ? (
              <div className="space-y-2">
                <WheelPicker range={ageRange} value={clamp(profile.age, AGE_RANGE.min, AGE_RANGE.max)} onChange={(age) => onPatch({ age })} label="Your age in years" valueText={`${profile.age} years old`} />
                <p className="text-center text-[14px] text-atelier-ink2">years old</p>
              </div>
            ) : null}

            {step === "height" ? (
              <div className="space-y-3">
                <UnitToggle
                  label="Height unit"
                  value={profile.heightUnit}
                  onChange={(heightUnit) => onPatch({ heightUnit })}
                  options={[{ value: "ft", label: "feet" }, { value: "cm", label: "cm" }]}
                />
                <WheelPicker
                  range={heightRange}
                  value={heightValue}
                  onChange={(next) => onPatch({ heightInches: profile.heightUnit === "cm" ? cmToInches(next) : next })}
                  unit={profile.heightUnit === "cm" ? "cm" : undefined}
                  formatLabel={profile.heightUnit === "cm" ? undefined : feetInchesLabel}
                  label={`Your height in ${profile.heightUnit === "cm" ? "centimeters" : "feet and inches"}`}
                  valueText={profile.heightUnit === "cm" ? `${heightValue} centimeters` : `${Math.floor(profile.heightInches / 12)} feet ${profile.heightInches % 12} inches`}
                />
                <p className="text-center text-[14px] text-atelier-ink2">
                  {profile.heightUnit === "cm" ? feetInchesLabel(profile.heightInches) : `${inchesToCm(profile.heightInches)} cm`}
                </p>
              </div>
            ) : null}

            {step === "weight" ? (
              <div className="space-y-3">
                <UnitToggle
                  label="Weight unit"
                  value={profile.weightUnit}
                  onChange={(weightUnit) => onPatch({ weightUnit })}
                  options={[{ value: "lbs", label: "lbs" }, { value: "kg", label: "kg" }]}
                />
                <WheelPicker
                  range={weightRange}
                  value={weightValue}
                  onChange={(next) => onPatch({ weightLbs: profile.weightUnit === "kg" ? kgToLbs(next) : next })}
                  unit={profile.weightUnit}
                  label={`Your weight in ${profile.weightUnit === "kg" ? "kilograms" : "pounds"}`}
                  valueText={`${weightValue} ${profile.weightUnit}`}
                  hint={INTAKE_SCREEN.weightCaption}
                />
                <p className="text-center text-[14px] text-atelier-ink2">
                  {profile.weightUnit === "kg" ? `${profile.weightLbs} lbs` : `${lbsToKg(profile.weightLbs)} kg`}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "profile" ? (
          <div className="funnel-rise pb-4 pt-2" style={{ animationDelay: "40ms" }}>
            <Card emphasized>
              <Eyebrow>{INTAKE_SCREEN.profile.eyebrow}</Eyebrow>
              <h1 className="mt-2 font-serif text-[28px] leading-[1.08] text-atelier-ink">{INTAKE_SCREEN.profile.title(name)}</h1>
              <p className="mt-2 text-[14px] leading-snug text-atelier-ink2">
                {profileContext({
                  situationTitle: situation?.title?.toLowerCase() || null,
                  frequencyTitle: frequency?.title?.toLowerCase() || null,
                  tried,
                  memberSentencePhrase: goal.memberSentencePhrase,
                })}
              </p>
              <div className="mt-4 flex gap-2">
                <MetricCard value={String(profile.age)} label="AGE" detail="pace" />
                <MetricCard value={heightText} label="HEIGHT" detail="range" />
                <MetricCard value={weightText} label="WEIGHT" detail="effort" />
              </div>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full border-[3px] border-atelier-rose bg-atelier-card">
                  <span className="font-serif text-[26px] leading-none text-atelier-ink">5</span>
                  <span className="text-[10px] font-bold tracking-[0.12em] text-atelier-rose">MIN</span>
                </span>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {INTAKE_SCREEN.profile.labels.map((label) => (
                    <li key={label} className="text-[10.5px] font-semibold tracking-[0.12em] text-atelier-ink2">{label}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-[16px] bg-atelier-rose/[0.07] p-3.5">
                <p className="text-[13px] font-semibold text-atelier-ink">{INTAKE_SCREEN.profile.howTitle}</p>
                <p className="mt-1 text-[13px] leading-snug text-atelier-ink2">{INTAKE_SCREEN.profile.howBody}</p>
              </div>
            </Card>
          </div>
        ) : null}

        {step === "story" ? (
          <div className="funnel-rise flex min-h-full flex-col justify-center pb-4 pt-2" style={{ animationDelay: "40ms" }}>
            <Card>
              <Eyebrow>{INTAKE_SCREEN.story.eyebrow}</Eyebrow>
              <div className="mt-4 flex justify-center">
                <Face src={memberPortrait(story.name)} name={story.name} size={72} />
              </div>
              <p className="mt-4 text-center font-serif text-[22px] italic leading-snug text-atelier-ink">“{story.quote}”</p>
              <p className="mt-3 text-center text-[13px] tracking-[0.14em] text-atelier-rose" aria-label="Five stars">{INTAKE_SCREEN.story.stars}</p>
              <p className="mt-1 text-center text-[13.5px] font-semibold text-atelier-ink2">{story.name}</p>
            </Card>
          </div>
        ) : null}
      </Body>
      <Footer className="transition-[padding] duration-150" >
        <div style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}>
          {step === "profile" ? (
            <Button onClick={advance} variant="rose" id="onboarding.intake.profile.continue">{INTAKE_SCREEN.profile.cta}</Button>
          ) : step === "story" ? (
            <Button onClick={advance} variant="rose" id="onboarding.intake.story.continue">{INTAKE_SCREEN.story.cta}</Button>
          ) : (
            <Button onClick={advance} disabled={!canContinue} variant="ink" id="onboarding.intake.continue">
              {step === "weight" ? INTAKE_SCREEN.buildProfile : INTAKE_SCREEN.next}
            </Button>
          )}
        </div>
      </Footer>
    </Screen>
  );
}
