"use client";

// "What do you want to change first?" (GoalFocusViewController): the focus
// list for her goal, the reaction line once she picks, "Personalize My Plan".

import React from "react";
import { FOCUS_SCREEN, focusReaction, goalData } from "./appCopy";
import { Acknowledgment, Body, Button, Footer, Header, OptionCard, Screen, Subtitle, Title } from "./atelier";

export default function GoalFocusScreen({ profile, onSelect, onNext, onBack }) {
  const goal = goalData(profile.pathway, profile.goalId);
  const focusId = profile.focusId;
  if (!goal) return null;
  return (
    <Screen>
      <Header onBack={onBack} railStep={1} railFraction={1} />
      <Body>
        <div className="funnel-rise pt-4" style={{ animationDelay: "60ms" }}>
          <Title>{FOCUS_SCREEN.title}</Title>
          <Subtitle className="mt-2">{FOCUS_SCREEN.subtitle(goal.memberSentencePhrase)}</Subtitle>
        </div>
        <div className="mt-5 space-y-3 pb-4">
          {goal.focus.map((focus, i) => (
            <div key={focus.id} className="funnel-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
              <OptionCard
                id={focus.id}
                symbol={focus.symbol}
                title={focus.title}
                detail={focus.detail}
                selected={focusId === focus.id}
                onClick={() => onSelect(focus.id)}
              />
            </div>
          ))}
          {focusId ? (
            <div key={focusId} className="funnel-fade" aria-live="polite">
              <Acknowledgment>{focusReaction(focusId)}</Acknowledgment>
            </div>
          ) : null}
        </div>
      </Body>
      <Footer>
        <Button onClick={onNext} disabled={!focusId} id="onboarding.focus.continue">
          {FOCUS_SCREEN.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
