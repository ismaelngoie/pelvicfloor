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
import {
  trackEmailChoice, trackFunnelStep, trackGoalChosen, trackHealthAnswers,
  trackPaywallReached,
} from "@/lib/analytics";
import { hasActivePlan } from "@/lib/identity";
import { isEntitled } from "@/lib/entitlement";
import FunnelAside from "./FunnelAside";
import RecognisedScreen from "./RecognisedScreen";
import LandingScreen from "./LandingScreen";
import WelcomeScreen from "./WelcomeScreen";
import SelectGoalScreen from "./SelectGoalScreen";
import HowPelviHelpsScreen from "./HowPelviHelpsScreen";
import PersonalIntakeScreen from "./PersonalIntakeScreen";
import HealthInfoScreen from "./HealthInfoScreen";
import PersonalizingScreen from "./PersonalizingScreen";
import EmailCaptureScreen from "./EmailCaptureScreen";
import PlanRevealScreen from "./PlanRevealScreen";

/**
 * The frame every funnel screen sits in. Three deliberate modes, not a fluid
 * continuum, because that is what real funnels ship and it is what can actually
 * be QA'd.
 *
 *   PHONE, below 704px. Full bleed, exactly as it was. 98% of the traffic and a
 *     hard constraint: nothing above this line changes a pixel of it.
 *   TABLET, 704 to 1279. One card, 544px wide, on a blush page. 704 rather than
 *     Tailwind's 768 because an iPad mini in portrait is 744px and used to get
 *     the phone layout stretched across it.
 *   DESKTOP, 1280 and up. Two panes. The card does NOT grow to fill a monitor,
 *     because the evidence on form columns runs the other way and these screens
 *     are built thumb first. What grows is the frame around it, and `aside` is
 *     the job that frame is given.
 *
 * `tone` follows the screen inside: the plan reveal and the paywall go black
 * edge to edge, and a black card on a pink page reads as a rendering fault.
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
    <div className={`fixed inset-0 overflow-hidden bg-app-background ${skin.page}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -left-24 top-1/4 hidden h-[26rem] w-[26rem] rounded-full blur-3xl tab:block ${skin.blobA}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-24 bottom-0 hidden h-[30rem] w-[30rem] rounded-full blur-3xl tab:block ${skin.blobB}`}
      />
      {/* Capped at 1440 and centred. Past that the extra width becomes more
          background, never more content: a 1920px monitor should not get a
          wider reading measure than a 1440px one. The left and right insets are
          for a phone held sideways, where they are not zero and text otherwise
          runs under the rounded corner. */}
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
            className={`relative h-full w-full overflow-hidden bg-app-background tab:max-h-[54rem] tab:w-[34rem] tab:rounded-[36px] tab:border xl:w-[30rem] ${skin.card}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Funnel({ onReachPaywall }) {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(STEP.welcome);
  const [profile, setProfile] = useState(emptyProfile);
  // True for the one round trip between "she gave us her address" and knowing
  // whether we are already charging her for this.
  const [checkingEmail, setCheckingEmail] = useState(false);
  // "Has this browser already bought the thing this page is selling."
  //
  // Read after mount and never during render: this is a static export, so the
  // HTML for "/" is built once on a machine with no localStorage, and deciding
  // anything from storage during the first client render is a hydration
  // mismatch that throws the whole tree away. It starts false, which is the
  // prerendered state, and flips one frame later for the member who needs it.
  const [returning, setReturning] = useState(false);
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

  // Only ever consulted on the landing step, and only to stop selling. It can
  // say yes to somebody whose subscription has since been cancelled, which is
  // why what it swaps in is a door to /app and never an unlock: the gate there
  // asks Stripe.
  useEffect(() => {
    setReturning(isEntitled());
  }, []);

  // --- Clarity: which rung she is standing on -------------------------------
  //
  // Gated on `hydrated` on purpose. The first render is always the welcome
  // screen and the resume happens in a layout effect, so an ungated version
  // would record "01_landing" for every returning visitor before recording
  // where she actually is, and the funnel arithmetic would count her twice.
  //
  // The intake screen records nothing here: its four questions are their own
  // rungs and PersonalIntakeScreen owns them. See FUNNEL_LADDER.
  useEffect(() => {
    if (!hydrated) return;
    trackFunnelStep(step);
  }, [hydrated, step]);

  // Her goal is the single most useful thing to segment every other number by,
  // so it is a tag rather than only an event. Written from an effect rather
  // than from inside chooseGoal so that a resumed session tags it too, and so
  // that nothing impure happens inside a state updater.
  useEffect(() => {
    if (!hydrated || !profile.goalId) return;
    trackGoalChosen(profile.goalId);
  }, [hydrated, profile.goalId]);

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
        // Counts and activity level only, never which conditions she ticked.
        // Rule 4 in the header of lib/analytics.js explains the line.
        trackHealthAnswers(profile);
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
    // The whole profile, not just the two fields the branching reads, because
    // trackHealthAnswers needs the answers themselves and a narrower dependency
    // list would hand it a stale copy. Every call site passes this as an inline
    // arrow anyway, so nothing downstream re-renders because of the wider list.
    [profile]
  );

  const chooseGoal = useCallback(
    (goalId) => {
      setProfile((prev) =>
        prev.goalId === goalId ? prev : { ...prev, goalId, planBuilt: false }
      );
    },
    []
  );

  /**
   * Leave the landing page for the first question.
   *
   * The goal argument is what the landing page's goal cards send: tapping
   * "Stop Bladder Leaks" out there is the answer to the first question, so she
   * arrives on the goal screen with it already chosen and the button live,
   * rather than being asked something she just told us. It still lands on the
   * goal screen, so nothing about the step order or what gets recorded moves.
   */
  const start = useCallback(
    (goalId) => {
      if (goalId) chooseGoal(goalId);
      if (!profile.startedAt) patch({ startedAt: new Date().toISOString() });
      setStep(STEP.goal);
    },
    [chooseGoal, patch, profile.startedAt]
  );

  /**
   * She gave us her address. Before anything else, ask quietly whether we are
   * already charging her for this.
   *
   * This is the earliest point in the funnel where the question can be asked at
   * all, and it is the last point where the answer still saves her something: a
   * plan reveal for a plan she has, a paywall for a price she pays, and a
   * checkout that would have refused her at the very end with "that email
   * already has an active plan". If the answer is yes she goes to
   * RecognisedScreen and the selling stops.
   *
   * hasActivePlan never throws and gives up after three seconds, so the worst
   * case is the funnel she was about to see anyway, three seconds later. The
   * button says "One moment" while it waits rather than sitting dead.
   */
  const submitEmail = useCallback(
    async (email) => {
      // "given", never the address. The field itself is masked.
      trackEmailChoice("given");
      patch({ email, emailAsked: true });
      setCheckingEmail(true);
      const known = await hasActivePlan(email);
      setCheckingEmail(false);
      setStep(known ? STEP.recognised : STEP.planReveal);
    },
    [patch]
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
    // Before the hand-off, because the hand-off unmounts this component and the
    // step effect above never gets to run for the paywall rung.
    trackPaywallReached(finished);
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
            busy={checkingEmail}
            onSubmit={submitEmail}
            onSkip={() => {
              trackEmailChoice("skipped");
              patch({ emailAsked: true });
              setStep(STEP.planReveal);
            }}
            onBack={goBack}
          />
        );
      case STEP.recognised:
        return (
          <RecognisedScreen
            email={profile.email}
            onBack={goBack}
            onNotMe={() => setStep(STEP.email)}
            onContinueAnyway={() => setStep(STEP.planReveal)}
          />
        );
      case STEP.planReveal:
      case STEP.paywall:
        return (
          <PlanRevealScreen profile={profile} onReachPaywall={reachPaywall} onBack={goBack} />
        );
      case STEP.welcome:
      default:
        return <WelcomeScreen onNext={() => start()} returning={returning} />;
    }
  };

  const isWelcome = step === STEP.welcome;
  // The plan reveal and the paywall are black edge to edge, so the page behind
  // the card follows them down rather than leaving a black card on pink.
  const tone = step === STEP.planReveal || step === STEP.paywall ? "dark" : "light";

  return (
    <>
      {/* Two trees on the landing step, and the choice between them is made in
          CSS, not in JavaScript.

          The alternative is a width read in an effect, which cannot run until
          after hydration: every desktop visitor would get one painted frame of
          a 400px phone card stretched across her monitor before it swapped.
          That is the screen every paid click lands on, so a flash there is not
          a cosmetic problem.

          The price is paid by the phone, and it is worth stating exactly: 4.5 KB
          gzipped of extra HTML in the export, which is display:none, so no
          JavaScript runs for it, nothing is fetched for it, and it is never laid
          out or painted. Below 704px the funnel card is the page, byte for byte
          as it was; from 704px up the marketing page is. */}
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
