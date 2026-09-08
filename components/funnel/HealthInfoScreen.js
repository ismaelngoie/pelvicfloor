"use client";

// "Anything I should know before we start?" (PlanRevealViewController, phase
// one): the goal's own medical context list, her focus first, "None of
// these", the activity question, and the goal's build button.

import React from "react";
import { CircleCheck } from "lucide-react";
import {
  ACTIVITY_LEVELS, HEALTH_SCREEN, focusData, healthCopy, healthHelper, healthOptions, situationData,
} from "./appCopy";
import SFIcon from "./icons";
import { Body, Button, Footer, Header, Screen, Subtitle, Title } from "./atelier";

function ConditionCell({ option, selected, onClick, delay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-option={option.title}
      className={`funnel-rise relative flex min-h-[96px] flex-col items-start justify-between rounded-[18px] border bg-white p-3.5 text-left transition-colors ${
        selected ? "border-atelier-rose bg-atelier-rose/[0.06]" : "border-atelier-line"
      }`}
      style={{ animationDelay: `${delay}ms`, ...(selected ? { borderWidth: 1.6 } : {}) }}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-atelier-rose text-white" : "bg-atelier-rose/[0.12] text-atelier-rose"}`}>
        <SFIcon name={option.symbol} size={18} strokeWidth={2} />
      </span>
      <span className="mt-2.5 text-[13.5px] font-semibold leading-[1.2] text-atelier-ink">{option.title}</span>
      {selected ? (
        <CircleCheck aria-hidden="true" size={18} className="absolute right-3 top-3 text-atelier-rose" fill="currentColor" stroke="#fff" />
      ) : null}
    </button>
  );
}

export default function HealthInfoScreen({ profile, onPatch, onNext, onBack }) {
  const { pathway, goalId } = profile;
  const focus = focusData(pathway, goalId, profile.focusId);
  const situation = situationData(pathway, goalId, profile.situationId);
  const options = healthOptions(goalId, pathway, profile.focusId, situation);
  const copy = healthCopy(goalId, focus?.title, profile.focusId);
  const selected = new Set(profile.conditions || []);
  const answeredConditions = profile.noConditions || selected.size > 0;
  const ready = answeredConditions && Boolean(profile.activity);

  // The button is never locked (owner, 2026-09-07): a member who has nothing
  // to tell us should not have to say so first. Continuing with nothing chosen
  // records "none of these" and the middle activity level, so every screen
  // after this one still has an answer to build on.
  const continueAnyway = () => {
    const patch = {};
    if (!answeredConditions) patch.noConditions = true;
    if (!profile.activity) patch.activity = (ACTIVITY_LEVELS[1] || ACTIVITY_LEVELS[0])?.id;
    if (Object.keys(patch).length) onPatch(patch);
    onNext();
  };

  const toggle = (title) => {
    const next = new Set(selected);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    onPatch({ conditions: [...next], noConditions: false });
  };
  const chooseNone = () => onPatch({ conditions: [], noConditions: !profile.noConditions });

  return (
    <Screen>
      <Header onBack={onBack} railStep={4} railFraction={ready ? 1 : answeredConditions ? 0.5 : 0.14} />
      <Body>
        <div className="funnel-rise pt-3 text-center" style={{ animationDelay: "40ms" }}>
          <Title center size={28}>{copy.headline}</Title>
          <Subtitle center className="mt-2">{copy.subtitle}</Subtitle>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {options.map((option, i) => (
            <ConditionCell key={option.title} option={option} selected={selected.has(option.title)} onClick={() => toggle(option.title)} delay={120 + i * 40} />
          ))}
        </div>
        <button
          type="button"
          onClick={chooseNone}
          aria-pressed={profile.noConditions}
          className={`mt-3 flex h-12 w-full items-center justify-center rounded-[16px] border text-[15px] font-semibold transition-colors ${
            profile.noConditions ? "border-atelier-rose bg-atelier-rose/[0.08] text-atelier-rosewood" : "border-atelier-line bg-atelier-card text-atelier-ink"
          }`}
          id="health_none"
        >
          {HEALTH_SCREEN.none}
        </button>
        {answeredConditions ? (
          <p className="mt-3 text-center text-[13.5px] font-medium text-atelier-rosewood" aria-live="polite">
            {healthHelper(selected.size > 0, goalId, pathway, profile.focusId)}
          </p>
        ) : null}

        <div className="mt-7 pb-4">
          <h2 className="text-center text-[19px] font-bold leading-snug text-atelier-ink" id="health_activity_question">
            {HEALTH_SCREEN.activityTitle}
          </h2>
          <p className="mt-1.5 text-center text-[13.5px] leading-snug text-atelier-ink2">{HEALTH_SCREEN.activityReason}</p>
          <div className="mt-4 space-y-2.5" role="radiogroup" aria-labelledby="health_activity_question">
            {ACTIVITY_LEVELS.map((level) => {
              const active = profile.activity === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onPatch({ activity: level.id })}
                  className={`flex w-full items-center justify-between rounded-[18px] border px-[18px] py-4 text-left text-[16px] font-semibold text-atelier-ink transition-colors ${
                    active ? "border-atelier-rose bg-atelier-rose/10" : "border-atelier-line bg-atelier-card"
                  }`}
                  style={active ? { borderWidth: 1.6 } : undefined}
                >
                  {level.title}
                  <span aria-hidden="true" className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] ${active ? "border-atelier-rose bg-atelier-rose" : "border-atelier-ink3/45"}`} />
                </button>
              );
            })}
          </div>
          {profile.activity ? (
            <p className="mt-3 text-center text-[13.5px] font-medium text-atelier-rosewood" aria-live="polite">
              {HEALTH_SCREEN.activitySaved}
            </p>
          ) : null}
        </div>
      </Body>
      <Footer>
        <Button onClick={continueAnyway} variant="rose" id="onboarding.health.continue">
          {copy.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
