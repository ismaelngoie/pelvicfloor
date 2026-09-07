"use client";

// The funnel, end to end: the web copy of the iOS 3.1.8 onboarding.
//
// What this file owns is small on purpose: which screen is showing, what she
// has told us, and the phone-shaped frame it all sits in. Every screen is a
// plain component that takes what it needs and calls back. Nothing below reads
// from Firebase, because she has not signed in yet.
//
//   Back. Every screen after Welcome has it, and the question screens walk
//   back through their own sub-steps before leaving.
//   Resume. Ad traffic gets interrupted. If she leaves after answering three
//   questions and comes back tomorrow, she comes back to question four.

import React, { useCallback, useEffect, useRef, useState } from "react";
import "./funnel.css";
import {
  BACKWARD, FORWARD, PATHWAY, STEP, consumeGoalParam, emptyProfile, readFunnelState,
  resumeStep, writeFunnelState,
} from "./funnelState";
import { useIsomorphicLayoutEffect } from "./ui";
import {
  trackFunnelStep, trackGoalChosen, trackHealthAnswers, trackPaywallReached,
} from "@/lib/analytics";
import { isEntitled } from "@/lib/entitlement";
import { SHOW_BRIDGE_VIDEO } from "./revealCopy";
import FunnelAside from "./FunnelAside";
import LandingScreen from "./LandingScreen";
import WelcomeScreen from "./WelcomeScreen";
import PathwayScreen from "./PathwayScreen";
import SelectGoalScreen from "./SelectGoalScreen";
import GoalFocusScreen from "./GoalFocusScreen";
import CalibrationScreen from "./CalibrationScreen";
import MethodScreen from "./MethodScreen";
import HowPelviHelpsScreen from "./HowPelviHelpsScreen";
import PersonalIntakeScreen from "./PersonalIntakeScreen";
import HealthInfoScreen from "./HealthInfoScreen";
import PersonalizingScreen from "./PersonalizingScreen";
import PlanRevealScreen from "./PlanRevealScreen";
import BridgeScreen from "./BridgeScreen";

/**
 * The frame every funnel screen sits in. Three deliberate modes:
 *
 *   PHONE, below 704px. Full bleed.
 *   TABLET, 704 to 1279. One card, 544px wide, on a blush page.
 *   DESKTOP, 1280 and up. Two panes; the card stays phone-sized and `aside`
 *     fills the frame around it.
 *
 * `tone` follows the screen inside: the plan reveal, the bridge and the
 * personalizing build go black edge to edge, and a black card on a pink page
 * reads as a rendering fault.
 */
const FRAME_SKIN = {
  light: {
    page: "tab:bg-blush",
    blobA: "bg-brand-roseLight/20",
    blobB: "bg-brand-rose/15",
    card: "tab:border-white/70 tab:shadow-[0_30px_80px_rgba(198,58,92,0.20)]",
  },
  dark: {
    page: "tab:bg-plum",
    blobA: "bg-brand-rose/15",
    blobB: "bg-ios-purple/10",
    card: "tab:border-white/10 tab:shadow-[0_30px_80px_rgba(0,0,0,0.55)]",
  },
};

export function FunnelFrame({ children, aside = null, tone = "light" }) {
  const skin = FRAME_SKIN[tone] || FRAME_SKIN.light;
  return (
    <div className={`fixed inset-0 overflow-hidden bg-atelier-paper ${skin.page}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -left-24 top-1/4 hidden h-[26rem] w-[26rem] rounded-full blur-3xl tab:block ${skin.blobA}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-24 bottom-0 hidden h-[30rem] w-[30rem] rounded-full blur-3xl tab:block ${skin.blobB}`}
      />
      <div className="relative mx-auto flex h-full w-full max-w-[84rem] items-stretch pl-[var(--sal)] pr-[var(--sar)]">
        {aside ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center py-12 pl-10 pr-8 xl:flex">
            <div className="max-h-full w-full max-w-[32rem] overflow-y-auto no-scrollbar">{aside}</div>
          </div>
        ) : null}
        <div
          className={`flex h-full w-full items-center justify-center tab:p-6 ${
            aside ? "xl:w-[36rem] xl:shrink-0" : ""
          }`}
        >
          <div
            className={`relative h-full w-full overflow-hidden bg-atelier-paper tab:max-h-[54rem] tab:w-[34rem] tab:rounded-[36px] tab:border xl:w-[30rem] ${skin.card}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const DARK_STEPS = new Set([STEP.personalizing, STEP.planReveal, STEP.bridge, STEP.paywall]);

export default function Funnel({ onReachPaywall }) {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(STEP.welcome);
  const [profile, setProfile] = useState(emptyProfile);
  const [returning, setReturning] = useState(false);
  const screenRef = useRef(null);
  const isFirstScreen = useRef(true);

  // Welcome is the starting state so that the exported HTML for "/" is the real
  // landing page. Resume happens in a LAYOUT effect, after hydration commits
  // but before paint, so a returning member never sees the welcome screen flash.
  //
  // The paid landing pages (app/stop-bladder-leaks) arrive as /?goal=<id>.
  // That tap already answered the pathway and goal questions, so she starts on
  // the focus screen with both chosen and both still reachable through Back.
  useIsomorphicLayoutEffect(() => {
    const saved = readFunnelState();
    const adGoal = consumeGoalParam();
    if (adGoal) {
      const base = saved ? saved.profile : emptyProfile();
      const changed = base.goalId !== adGoal || base.pathway !== PATHWAY.women;
      const nextProfile = changed
        ? {
            ...emptyProfile(),
            pathway: PATHWAY.women,
            goalId: adGoal,
            startedAt: base.startedAt || new Date().toISOString(),
          }
        : base;
      const resumed = saved && !changed ? resumeStep(saved) : null;
      const shallow = new Set([STEP.welcome, STEP.pathway, STEP.goal]);
      const nextStep = resumed && !shallow.has(resumed) ? resumed : STEP.focus;
      setProfile(nextProfile);
      setStep(nextStep);
      writeFunnelState(nextStep, nextProfile);
    } else if (saved) {
      setProfile(saved.profile);
      setStep(resumeStep(saved));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeFunnelState(step, profile);
  }, [hydrated, step, profile]);

  // Only ever consulted on the landing step, and only to stop selling.
  useEffect(() => {
    setReturning(isEntitled());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    trackFunnelStep(step);
  }, [hydrated, step]);

  useEffect(() => {
    if (!hydrated || !profile.goalId) return;
    trackGoalChosen(profile.goalId);
  }, [hydrated, profile.goalId]);

  // Move focus to the new screen so a screen reader lands on the new heading.
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

  const stepBack = useCallback(() => {
    setStep((current) => BACKWARD[current] || STEP.welcome);
  }, []);

  /** The chevron in the top left, routed through history so it and Android's Back are one action. */
  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.pelviFunnelStep) {
      window.history.back(); // -> popstate -> stepBack()
      return;
    }
    stepBack();
  }, [stepBack]);

  // Android's Back button: one spare history entry parked in front of her on
  // every step past the landing screen.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return undefined;
    if (step === STEP.welcome) return undefined;

    if (!window.history.state?.pelviFunnelStep) {
      try {
        window.history.pushState({ pelviFunnelStep: true }, "");
      } catch {
        return undefined;
      }
    }

    const onPopState = () => stepBack();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hydrated, step, stepBack]);

  const reachPaywall = useCallback(
    (from = profile) => {
      const finished = { ...from, reachedPaywallAt: new Date().toISOString() };
      writeFunnelState(STEP.paywall, finished);
      setProfile(finished);
      setStep(STEP.paywall);
      trackPaywallReached(finished);
      onReachPaywall?.(finished);
    },
    [profile, onReachPaywall]
  );

  const advance = useCallback(
    (from) => {
      if (from === STEP.health) {
        trackHealthAnswers(profile);
        // The build always runs after the health check-in, exactly as the
        // phone does it: the seven seconds are part of the reveal, not a cost
        // to be skipped.
        setStep(STEP.personalizing);
        return;
      }
      if (from === STEP.planReveal) {
        if (SHOW_BRIDGE_VIDEO) setStep(STEP.bridge);
        else reachPaywall();
        return;
      }
      if (from === STEP.bridge) {
        reachPaywall();
        return;
      }
      setStep(FORWARD[from] || STEP.welcome);
    },
    [profile, reachPaywall]
  );

  const choosePathway = useCallback((pathway) => {
    setProfile((prev) => {
      if (prev.pathway === pathway) return prev;
      // A different body is a different question set: every answer that hangs
      // off the goal starts over, her name and measurements do not.
      return {
        ...prev,
        pathway,
        goalId: null,
        focusId: null,
        situationId: null,
        frequencyId: null,
        triedId: null,
        impactIds: [],
        meaningId: null,
        calibrationStep: 0,
        prevalenceSeen: false,
        conditions: [],
        noConditions: false,
        planBuilt: false,
      };
    });
  }, []);

  const chooseGoal = useCallback((goalId) => {
    setProfile((prev) => {
      if (prev.goalId === goalId) return prev;
      return {
        ...prev,
        goalId,
        focusId: null,
        situationId: null,
        frequencyId: null,
        triedId: null,
        impactIds: [],
        meaningId: null,
        calibrationStep: 0,
        prevalenceSeen: false,
        conditions: [],
        noConditions: false,
        planBuilt: false,
      };
    });
  }, []);

  const chooseFocus = useCallback((focusId) => {
    setProfile((prev) => (prev.focusId === focusId ? prev : { ...prev, focusId, planBuilt: false }));
  }, []);

  /**
   * Leave the landing page. The desktop landing's goal cards send a goal: that
   * tap answers the pathway (women's) and the goal, so she lands on the goal
   * screen with it chosen and the button live.
   */
  const start = useCallback(
    (goalId) => {
      if (goalId) {
        choosePathway(PATHWAY.women);
        chooseGoal(goalId);
      }
      if (!profile.startedAt) patch({ startedAt: new Date().toISOString() });
      setStep(goalId ? STEP.goal : STEP.pathway);
    },
    [choosePathway, chooseGoal, patch, profile.startedAt]
  );

  const renderScreen = () => {
    switch (step) {
      case STEP.pathway:
        return (
          <PathwayScreen
            pathway={profile.pathway}
            onSelect={choosePathway}
            onNext={() => advance(STEP.pathway)}
            onBack={goBack}
          />
        );
      case STEP.goal:
        return (
          <SelectGoalScreen
            pathway={profile.pathway}
            goalId={profile.goalId}
            onSelect={chooseGoal}
            onNext={() => advance(STEP.goal)}
            onBack={goBack}
          />
        );
      case STEP.focus:
        return (
          <GoalFocusScreen
            profile={profile}
            onSelect={chooseFocus}
            onNext={() => advance(STEP.focus)}
            onBack={goBack}
          />
        );
      case STEP.calibration:
        return (
          <CalibrationScreen
            profile={profile}
            onPatch={patch}
            onNext={() => advance(STEP.calibration)}
            onBack={goBack}
          />
        );
      case STEP.method:
        return <MethodScreen profile={profile} onNext={() => advance(STEP.method)} onBack={goBack} />;
      case STEP.howItHelps:
        return (
          <HowPelviHelpsScreen profile={profile} onNext={() => advance(STEP.howItHelps)} onBack={goBack} />
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
              setStep(STEP.planReveal);
            }}
            onBack={goBack}
          />
        );
      case STEP.planReveal:
      case STEP.paywall:
        return <PlanRevealScreen profile={profile} onNext={() => advance(STEP.planReveal)} onBack={goBack} />;
      case STEP.bridge:
        return <BridgeScreen onDone={() => advance(STEP.bridge)} />;
      case STEP.welcome:
      default:
        return <WelcomeScreen onNext={() => start()} returning={returning} />;
    }
  };

  const isWelcome = step === STEP.welcome;
  const tone = DARK_STEPS.has(step) ? "dark" : "light";

  return (
    <>
      {/* Two trees on the landing step, and the choice between them is made in
          CSS, not JavaScript: below 704px the funnel card is the page; from
          704px up the marketing page is. */}
      {isWelcome ? (
        <div className="hidden tab:block">
          <LandingScreen onStart={start} returning={returning} />
        </div>
      ) : null}

      <div className={isWelcome ? "tab:hidden" : undefined}>
        <FunnelFrame
          tone={tone}
          aside={isWelcome ? null : <FunnelAside step={step} profile={profile} tone={tone} />}
        >
          <div ref={screenRef} tabIndex={-1} className="h-full w-full">
            {renderScreen()}
          </div>
        </FunnelFrame>
      </div>
    </>
  );
}
