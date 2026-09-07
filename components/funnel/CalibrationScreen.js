"use client";

// The five calibration questions (SymptomIntakeView), with the prevalence beat
// after she sets her baseline. A tap selects and is seen; the page only turns
// when she presses the step's own commitment button. Re-tapping corrects.

import React, { useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  CALIBRATION_SKIP, CALIBRATION_STEPS, MEANING_OPTIONS, PREVALENCE_SCREEN, calibrationQuestion, goalData,
} from "./appCopy";
import { Acknowledgment, Body, Button, ChoiceRow, Eyebrow, Footer, Header, Screen, Subtitle, Title } from "./atelier";

function Prevalence({ content, onBack, onContinue }) {
  return (
    <Screen>
      <Header onBack={onBack} railStep={2} railFraction={0.4} />
      <Body>
        <div className="flex min-h-full flex-col justify-center pb-4 pt-2 text-center">
          <div className="funnel-rise" style={{ animationDelay: "40ms" }}>
            <Eyebrow>{PREVALENCE_SCREEN.eyebrow}</Eyebrow>
          </div>
          <div className="funnel-rise mt-5" style={{ animationDelay: "120ms" }}>
            {content.statLines.map((line) => (
              <p key={line} className="font-serif text-[38px] leading-[1.04] text-atelier-ink">
                {line}
              </p>
            ))}
          </div>
          <div className="funnel-rise mt-4" style={{ animationDelay: "200ms" }}>
            {content.beatLines.map((line) => (
              <p key={line} className="text-[17px] font-semibold leading-snug text-atelier-ink2">
                {line}
              </p>
            ))}
          </div>
          <div className="funnel-rise mt-6 rounded-[20px] border border-atelier-line bg-atelier-card p-4 text-left" style={{ animationDelay: "280ms" }}>
            <Eyebrow>{PREVALENCE_SCREEN.studies}</Eyebrow>
            <p className="mt-2 text-[16px] font-semibold leading-snug text-atelier-ink">{content.receipt}</p>
            <p className="mt-1.5 text-[12.5px] text-atelier-ink3">{content.source}</p>
          </div>
          <p className="funnel-rise mt-5 text-[15px] leading-snug text-atelier-ink2" style={{ animationDelay: "340ms" }}>
            {content.reassurance}
          </p>
        </div>
      </Body>
      <Footer>
        <Button onClick={onContinue} variant="rose" id="onboarding.prevalence.continue">
          {content.cta}
        </Button>
      </Footer>
    </Screen>
  );
}

export default function CalibrationScreen({ profile, onPatch, onNext, onBack }) {
  const { pathway, goalId } = profile;
  const goal = goalData(pathway, goalId);
  const step = Math.min(4, Math.max(0, profile.calibrationStep || 0));
  const [showingPrevalence, setShowingPrevalence] = useState(false);
  if (!goal) return null;

  const setStep = (next) => onPatch({ calibrationStep: next });

  const hasSelection = [
    Boolean(profile.situationId),
    Boolean(profile.frequencyId),
    Boolean(profile.triedId),
    (profile.impactIds || []).length > 0,
    Boolean(profile.meaningId),
  ][step];

  const clearStep = () => {
    switch (step) {
      case 0: onPatch({ situationId: null }); break;
      case 1: onPatch({ frequencyId: null }); break;
      case 2: onPatch({ triedId: null }); break;
      case 3: onPatch({ impactIds: [] }); break;
      default: onPatch({ meaningId: null });
    }
  };

  const advance = () => {
    if (step === 1) {
      setShowingPrevalence(true);
      return;
    }
    if (step >= 4) {
      onNext();
      return;
    }
    setStep(step + 1);
  };

  const goBack = () => {
    if (showingPrevalence) {
      setShowingPrevalence(false);
      return;
    }
    if (step === 0) {
      onBack();
      return;
    }
    setStep(step - 1);
  };

  if (showingPrevalence) {
    return (
      <Prevalence
        content={goal.prevalence}
        onBack={goBack}
        onContinue={() => {
          setShowingPrevalence(false);
          onPatch({ prevalenceSeen: true, calibrationStep: 2 });
        }}
      />
    );
  }

  const copy = CALIBRATION_STEPS[step];
  const tried = profile.triedId ? goal.tried.find((t) => t.id === profile.triedId) : null;

  const toggleImpact = (id) => {
    const current = profile.impactIds || [];
    onPatch({ impactIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] });
  };

  let options;
  switch (step) {
    case 0:
      options = goal.situations.map((o) => ({ id: o.id, title: o.title, selected: profile.situationId === o.id, pick: () => onPatch({ situationId: o.id }) }));
      break;
    case 1:
      options = goal.frequencies.map((o) => ({ id: o.id, title: o.title, selected: profile.frequencyId === o.id, pick: () => onPatch({ frequencyId: o.id }) }));
      break;
    case 2:
      options = goal.tried.map((o) => ({ id: o.id, title: o.title, selected: profile.triedId === o.id, pick: () => onPatch({ triedId: o.id }) }));
      break;
    case 3:
      options = goal.impacts.map((o) => ({ id: o.id, title: o.title, selected: (profile.impactIds || []).includes(o.id), pick: () => toggleImpact(o.id) }));
      break;
    default:
      options = MEANING_OPTIONS.map((o) => ({ id: o.id, title: o.title, selected: profile.meaningId === o.id, pick: () => onPatch({ meaningId: o.id }) }));
  }

  return (
    <Screen>
      <Header onBack={goBack} railStep={2} railFraction={(step + 1) * 0.2} />
      <Body>
        <div key={step} className="funnel-rise pb-4 pt-3" style={{ animationDelay: "40ms" }}>
          <Title>{calibrationQuestion(pathway, goalId, step)}</Title>
          <Subtitle className="mt-2">{copy.subtitle}</Subtitle>
          <div className="mt-5 space-y-2.5" role={step === 3 ? "group" : "radiogroup"}>
            {options.map((option) => (
              <ChoiceRow key={option.id} id={option.id} title={option.title} selected={option.selected} onClick={option.pick} />
            ))}
          </div>
          {step === 2 && tried ? (
            <div key={tried.id} className="funnel-fade mt-4" aria-live="polite">
              <Acknowledgment>{tried.acknowledgment}</Acknowledgment>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              clearStep();
              advance();
            }}
            className="mt-2 flex w-full items-center justify-center py-3 text-[14px] font-medium text-atelier-ink2"
            id="onboarding.symptom.skip"
          >
            {CALIBRATION_SKIP}
          </button>
        </div>
      </Body>
      <Footer>
        <Button onClick={advance} disabled={!hasSelection} variant="rose" id="onboarding.symptom.continue">
          {copy.cta}
        </Button>
      </Footer>
    </Screen>
  );
}

export function SealLine({ children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[19px] border border-atelier-line bg-atelier-card p-3.5">
      <BadgeCheck aria-hidden="true" size={18} className="mt-[1px] shrink-0 text-atelier-rose" />
      <p className="text-[13.5px] leading-snug text-atelier-ink2">{children}</p>
    </div>
  );
}
