"use client";

// The funnel, end to end.
//
// This replaces a single 3,123 line file that held six screens, two payment
// modals, four background systems and twelve copy tables, redefined its screen
// component on every render, and had no way to go backwards from any of it.
//
// What this file owns is small on purpose: which screen is showing, what she
// has told us, and the phone-shaped frame it all sits in. Every screen is a
// plain component that takes what it needs and calls back. Nothing below reads
// from Firebase, because she has not signed in yet.
//
// Two things the old funnel did not have:
//   Back. Every screen after Welcome has it, and on the intake screen it walks
//   back through the four questions one at a time rather than dumping her out.
//   Resume. Ad traffic gets interrupted. If she leaves after answering three
//   questions and comes back tomorrow, she comes back to question four.

import React, { useCallback, useEffect, useRef, useState } from "react";
import "./funnel.css";
import {
  BACKWARD, FORWARD, STEP, emptyProfile, readFunnelState, resumeStep,
  writeFunnelState,
} from "./funnelState";
import { useIsomorphicLayoutEffect } from "./ui";
import WelcomeScreen from "./WelcomeScreen";
import SelectGoalScreen from "./SelectGoalScreen";
import HowPelviHelpsScreen from "./HowPelviHelpsScreen";
import PersonalIntakeScreen from "./PersonalIntakeScreen";
import HealthInfoScreen from "./HealthInfoScreen";
import PersonalizingScreen from "./PersonalizingScreen";
import EmailCaptureScreen from "./EmailCaptureScreen";
import PlanRevealScreen from "./PlanRevealScreen";

/**
 * The desktop treatment: the funnel in a phone-shaped card on blush. It is not
 * nostalgia. The screens are built thumb-first with pinned footers and 56px
 * buttons, and stretching that across a 1,400px monitor makes a considered
 * layout look broken. A phone on a desk still reads as a phone.
 */
export function FunnelFrame({ children }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-app-background md:bg-blush">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/4 hidden h-[26rem] w-[26rem] rounded-full bg-brand-roseLight/20 blur-3xl md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 hidden h-[30rem] w-[30rem] rounded-full bg-brand-rose/15 blur-3xl md:block"
      />
      <div className="relative flex h-full w-full items-center justify-center md:p-6">
        <div className="relative h-full w-full overflow-hidden bg-app-background md:max-h-[860px] md:w-[400px] md:rounded-[40px] md:border md:border-white/70 md:shadow-[0_30px_80px_rgba(198,58,92,0.20)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Funnel({ onReachPaywall }) {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(STEP.welcome);
  const [profile, setProfile] = useState(emptyProfile);
  const screenRef = useRef(null);
  const isFirstScreen = useRef(true);

  // Welcome is the starting state so that the exported HTML for "/" is the real
  // landing page, headline and benefits and all, rather than a spinner.
  //
  // Resume then happens in a LAYOUT effect, which runs after hydration commits
  // but before the browser paints. A returning member is put back where she was
  // without ever seeing the welcome screen flash past. A plain effect would run
  // after paint and show it.
  useIsomorphicLayoutEffect(() => {
    const saved = readFunnelState();
    if (saved) {
      setProfile(saved.profile);
      setStep(resumeStep(saved));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeFunnelState(step, profile);
  }, [hydrated, step, profile]);

  // Move focus to the new screen.
  //
  // Nothing here is a page navigation, so the browser does nothing on its own:
  // the button she pressed unmounts, focus falls back to <body>, and the next
  // Tab starts again from the top of the document. A screen reader says
  // nothing at all, so eight screens go past in silence. Focusing the screen
  // container puts the reader at the new heading and the next Tab lands on the
  // first control of the screen she is actually on.
  //
  // Not on the first screen: the welcome screen is where the page loads, and
  // stealing focus on load is its own bug.
  useEffect(() => {
    if (isFirstScreen.current) {
      isFirstScreen.current = false;
      return;
    }
    screenRef.current?.focus({ preventScroll: true });
  }, [step]);

  const patch = useCallback((partial) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  }, []);

  const goBack = useCallback(() => {
    setStep((current) => BACKWARD[current] || STEP.welcome);
  }, []);

  const advance = useCallback(
    (from) => {
      if (from === STEP.health) {
        // Coming back to change an answer should not cost her the seven second
        // build again, but changing her goal should, because it is a new plan.
        if (profile.planBuilt) {
          setStep(profile.emailAsked ? STEP.planReveal : STEP.email);
          return;
        }
        setStep(STEP.personalizing);
        return;
      }
      setStep(FORWARD[from] || STEP.welcome);
    },
    [profile.planBuilt, profile.emailAsked]
  );

  const chooseGoal = useCallback(
    (goalId) => {
      setProfile((prev) =>
        prev.goalId === goalId ? prev : { ...prev, goalId, planBuilt: false }
      );
    },
    []
  );

  const reachPaywall = useCallback(() => {
    const finished = { ...profile, reachedPaywallAt: new Date().toISOString() };
    // Written here rather than left to the effect below. Handing over swaps the
    // funnel out for the paywall in the same commit, so this component unmounts
    // before its effects run and the queued state never lands. Without this
    // line a member who reloads on the paywall is dropped back into the funnel.
    writeFunnelState(STEP.paywall, finished);
    setProfile(finished);
    setStep(STEP.paywall);
    onReachPaywall?.(finished);
  }, [profile, onReachPaywall]);

  const renderScreen = () => {
    switch (step) {
      case STEP.goal:
        return (
          <SelectGoalScreen
            goalId={profile.goalId}
            onSelect={chooseGoal}
            onNext={() => advance(STEP.goal)}
            onBack={goBack}
          />
        );
      case STEP.howItHelps:
        return (
          <HowPelviHelpsScreen
            goalId={profile.goalId}
            onNext={() => advance(STEP.howItHelps)}
            onBack={goBack}
          />
        );
      case STEP.intake:
        return (
          <PersonalIntakeScreen
            profile={profile}
            onPatch={patch}
            onNext={() => advance(STEP.intake)}
            onBack={goBack}
          />
        );
      case STEP.health:
        return (
          <HealthInfoScreen
            profile={profile}
            onPatch={patch}
            onNext={() => advance(STEP.health)}
            onBack={goBack}
          />
        );
      case STEP.personalizing:
        return (
          <PersonalizingScreen
            profile={profile}
            onDone={() => {
              patch({ planBuilt: true });
              setStep(profile.emailAsked ? STEP.planReveal : STEP.email);
            }}
            onBack={goBack}
          />
        );
      case STEP.email:
        return (
          <EmailCaptureScreen
            profile={profile}
            onSubmit={(email) => {
              patch({ email, emailAsked: true });
              setStep(STEP.planReveal);
            }}
            onSkip={() => {
              patch({ emailAsked: true });
              setStep(STEP.planReveal);
            }}
            onBack={goBack}
          />
        );
      case STEP.planReveal:
      case STEP.paywall:
        return (
          <PlanRevealScreen profile={profile} onReachPaywall={reachPaywall} onBack={goBack} />
        );
      case STEP.welcome:
      default:
        return (
          <WelcomeScreen
            onNext={() => {
              if (!profile.startedAt) patch({ startedAt: new Date().toISOString() });
              setStep(STEP.goal);
            }}
          />
        );
    }
  };

  return (
    <FunnelFrame>
      <div ref={screenRef} tabIndex={-1} className="h-full w-full">
        {renderScreen()}
      </div>
    </FunnelFrame>
  );
}
