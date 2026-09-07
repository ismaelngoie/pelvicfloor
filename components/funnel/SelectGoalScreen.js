"use client";

// "What would you like to work on?" (SelectGoalViewController): the goal grid
// for her pathway, in the phone's order, with the "You are in the right place"
// line once she picks one.

import React from "react";
import { Check } from "lucide-react";
import { GOAL_SCREEN, goalAcknowledgement, goalData, goalOrder } from "./appCopy";
import SFIcon from "./icons";
import { Body, Button, Footer, Header, Screen, Subtitle, Title } from "./atelier";

function GoalCard({ goal, selected, onClick, delay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-option={goal.id}
      className={`funnel-rise relative flex min-h-[124px] flex-col items-start justify-between overflow-hidden rounded-[20px] border bg-white p-4 text-left transition-colors ${
        selected ? "border-atelier-rose" : "border-atelier-line"
      }`}
      style={{ animationDelay: `${delay}ms`, ...(selected ? { borderWidth: 1.6 } : {}) }}
    >
      {selected ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-atelier-rose/[0.08]" /> : null}
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
          selected ? "bg-atelier-rose text-white" : "bg-atelier-rose/[0.12] text-atelier-rose"
        }`}
      >
        <SFIcon name={goal.symbol} size={20} strokeWidth={2} />
      </span>
      <span className="relative mt-3 text-[15px] font-semibold leading-[1.2] text-atelier-ink">{goal.title}</span>
      {selected ? (
        <span aria-hidden="true" className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-atelier-rose text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export default function SelectGoalScreen({ pathway, goalId, onSelect, onNext, onBack }) {
  const goals = goalOrder(pathway).map((id) => ({ id, ...goalData(pathway, id) }));
  const acknowledgement = goalId ? goalAcknowledgement(goalId, pathway) : "";
  return (
    <Screen>
      <Header onBack={onBack} railStep={1} railFraction={goalId ? 0.85 : 0.5} />
      <Body>
        <div className="funnel-rise pt-4" style={{ animationDelay: "60ms" }}>
          <Title>{GOAL_SCREEN.title}</Title>
          <Subtitle className="mt-2">{GOAL_SCREEN.subtitle}</Subtitle>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 pb-4">
          {goals.map((goal, i) => (
            <GoalCard key={goal.id} goal={goal} selected={goalId === goal.id} onClick={() => onSelect(goal.id)} delay={120 + i * 50} />
          ))}
        </div>
      </Body>
      <Footer>
        {acknowledgement ? (
          <p key={goalId} className="funnel-fade text-center font-serif text-[16px] italic leading-snug text-atelier-rosewood" aria-live="polite">
            {acknowledgement}
          </p>
        ) : null}
        <Button onClick={onNext} disabled={!goalId} id="onboarding.goal.continue">
          {GOAL_SCREEN.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
