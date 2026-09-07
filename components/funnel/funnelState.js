"use client";

// The funnel's memory, and the small amount of arithmetic it does.
//
// She is not signed in yet, so this is localStorage and nothing else. Firebase
// only gets involved once there is an account to attach a record to. The point
// of persisting at all is resume: ad traffic gets interrupted, and a woman who
// answered four questions and then took a phone call should not have to answer
// them again.
//
// The step list mirrors the iOS 3.1.8 onboarding one for one:
//
//   welcome -> pathway -> goal -> focus -> calibration (5 questions, with the
//   prevalence beat after the second) -> method -> howItHelps (constellation)
//   -> intake (Coach Mia: name, age, height, weight, profile, story) -> health
//   -> personalizing -> planReveal -> bridge (Dr Reed) -> paywall

import { goalData } from "./appCopy";

export const FUNNEL_STORAGE_KEY = "pelvi.funnel.v2";
const MAX_RESUME_AGE_MS = 30 * 24 * 60 * 60 * 1000; // a month, then start fresh

export const STEP = {
  welcome: "welcome",
  pathway: "pathway",
  goal: "goal",
  focus: "focus",
  calibration: "calibration",
  method: "method",
  howItHelps: "howItHelps",
  intake: "intake",
  health: "health",
  personalizing: "personalizing",
  planReveal: "planReveal",
  bridge: "bridge",
  paywall: "paywall",
};

export const FORWARD = {
  welcome: STEP.pathway,
  pathway: STEP.goal,
  goal: STEP.focus,
  focus: STEP.calibration,
  calibration: STEP.method,
  method: STEP.howItHelps,
  howItHelps: STEP.intake,
  intake: STEP.health,
  health: STEP.personalizing,
  personalizing: STEP.planReveal,
  planReveal: STEP.bridge,
  bridge: STEP.paywall,
};

// Back skips the screens that are not questions. Sending her back through a
// seven second animation to change one answer is a punishment, not navigation.
export const BACKWARD = {
  pathway: STEP.welcome,
  goal: STEP.pathway,
  focus: STEP.goal,
  calibration: STEP.focus,
  method: STEP.calibration,
  howItHelps: STEP.method,
  intake: STEP.howItHelps,
  health: STEP.intake,
  personalizing: STEP.health,
  planReveal: STEP.health,
  bridge: STEP.planReveal,
  paywall: STEP.planReveal,
};

export const PATHWAY = {
  women: "womensPelvicHealth",
  men: "mensPelvicHealth",
};

export const INTAKE_STEPS = ["name", "age", "height", "weight", "profile", "story"];

// iOS defaults. 45 is the middle of who actually buys this.
export function emptyProfile() {
  return {
    pathway: null,
    goalId: null,
    focusId: null,
    situationId: null,
    frequencyId: null,
    triedId: null,
    impactIds: [],
    meaningId: null,
    calibrationStep: 0,
    prevalenceSeen: false,
    name: "",
    age: 45,
    weightLbs: 150,
    heightInches: 65,
    weightUnit: "lbs",
    heightUnit: "ft",
    intakeStep: "name",
    conditions: [],
    noConditions: false,
    activity: null,
    planBuilt: false,
    startedAt: null,
  };
}

// --- Storage ---------------------------------------------------------------

export function readFunnelState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FUNNEL_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.v !== 2 || !saved.profile) return null;
    if (!saved.savedAt || Date.now() - saved.savedAt > MAX_RESUME_AGE_MS) return null;
    return { step: saved.step, profile: { ...emptyProfile(), ...saved.profile } };
  } catch {
    return null;
  }
}

export function writeFunnelState(step, profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FUNNEL_STORAGE_KEY,
      JSON.stringify({ v: 2, step, profile, savedAt: Date.now() })
    );
  } catch {
    // Private browsing, a full quota, a locked-down browser. Losing resume is
    // survivable; throwing here would lose the whole funnel.
  }
}

export function writeFunnelStep(step) {
  const current = readFunnelState();
  writeFunnelState(step, current?.profile || emptyProfile());
}

export function clearFunnelState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FUNNEL_STORAGE_KEY);
    window.localStorage.removeItem("pelvi.funnel.v1");
  } catch {
    /* see above */
  }
}

// --- The paid landing hand-off ----------------------------------------------
//
// app/stop-bladder-leaks (and every future per-theme ad page) enters the
// funnel as /?goal=<goalId>. Tapping "Start My Leak-Free Plan" over there IS
// the answer to the goal question. Funnel.js consumes this once, on mount, and
// starts her on the goal screen with the women's pathway and the goal chosen.
//
// The parameter is stripped after it is read, AND ONLY IT: gclid and the other
// ad parameters stay in the address bar for gtag to read.

export function consumeGoalParam() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const goal = params.get("goal");
    if (!goal || !goalData(PATHWAY.women, goal)) return null;
    params.delete("goal");
    const rest = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`
    );
    return goal;
  } catch {
    return null;
  }
}

/**
 * Where a returning member should land.
 *
 * Three steps are never resumed into: the plan-building animation, because it
 * is a transition and not a place, the Dr Reed bridge, which only makes sense
 * straight after the reveal, and the timeline before a plan exists.
 */
export function resumeStep(saved) {
  if (!saved?.step) return STEP.welcome;
  const { step, profile } = saved;
  if (step !== STEP.welcome && !profile.pathway) return STEP.pathway;
  if (step !== STEP.welcome && step !== STEP.pathway && !profile.goalId) return STEP.goal;
  if (step === STEP.personalizing) return STEP.health;
  if (step === STEP.bridge) return STEP.planReveal;
  if ((step === STEP.planReveal || step === STEP.paywall) && !profile.planBuilt) {
    return STEP.health;
  }
  return step;
}

/** Everything answered, so the paywall can be trusted to render. */
export function isProfileComplete(profile) {
  return Boolean(
    profile?.pathway &&
      profile?.goalId &&
      profile?.activity &&
      (profile.noConditions || (profile.conditions || []).length > 0)
  );
}

// --- Units and arithmetic --------------------------------------------------

const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;

export const lbsToKg = (lbs) => Math.round(lbs / LB_PER_KG);
export const kgToLbs = (kg) => Math.round(kg * LB_PER_KG);
export const inchesToCm = (inches) => Math.round(inches * CM_PER_INCH);
export const cmToInches = (cm) => Math.round(cm / CM_PER_INCH);

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const AGE_RANGE = { min: 16, max: 100 };
export const WEIGHT_RANGE = { lbs: { min: 80, max: 400 }, kg: { min: 35, max: 180 } };
export const HEIGHT_RANGE = { ft: { min: 48, max: 96 }, cm: { min: 120, max: 240 } };

export function feetInchesLabel(totalInches) {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}' ${inches}"`;
}

/** The phone's own spelling for the clinical profile card: 5′ 5″. */
export function feetInchesPrime(totalInches) {
  return `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″`;
}

/** BMI to one decimal place, from pounds and inches. */
export function bmi(weightLbs, heightInches) {
  const kg = weightLbs / LB_PER_KG;
  const metres = (heightInches * CM_PER_INCH) / 100;
  if (!metres) return 0;
  return Number((kg / (metres * metres)).toFixed(1));
}

/** "A", "A and B", "A, B, and C": the phone's naturalList, Oxford comma and all. */
export function naturalList(items) {
  const values = (items || []).filter(Boolean);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}
