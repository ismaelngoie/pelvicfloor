"use client";

// The funnel's memory, and the small amount of arithmetic it does.
//
// She is not signed in yet, so this is localStorage and nothing else. Firebase
// only gets involved once there is an account to attach a record to. The point
// of persisting at all is resume: ad traffic gets interrupted, and a woman who
// answered four questions and then took a phone call should not have to answer
// them again.

import { ACTIVITY_LEVELS, HEALTH_CONDITIONS } from "./copy";

export const FUNNEL_STORAGE_KEY = "pelvi.funnel.v1";
const MAX_RESUME_AGE_MS = 30 * 24 * 60 * 60 * 1000; // a month, then start fresh

export const STEP = {
  welcome: "welcome",
  goal: "goal",
  howItHelps: "howItHelps",
  intake: "intake",
  health: "health",
  personalizing: "personalizing",
  email: "email",
  planReveal: "planReveal",
  paywall: "paywall",
};

// iOS order. Email capture sits between the plan-building animation and the
// timeline, not after it: the plan is finished, so "Where should we send it?"
// is true, and the timeline runs straight into the paywall with nothing between.
export const FORWARD = {
  welcome: STEP.goal,
  goal: STEP.howItHelps,
  howItHelps: STEP.intake,
  intake: STEP.health,
  health: STEP.personalizing,
  personalizing: STEP.email,
  email: STEP.planReveal,
  planReveal: STEP.paywall,
};

// Back skips the screens that are not questions. Sending her back through a
// seven second animation to change one answer is a punishment, not navigation.
export const BACKWARD = {
  goal: STEP.welcome,
  howItHelps: STEP.goal,
  intake: STEP.howItHelps,
  health: STEP.intake,
  personalizing: STEP.health,
  email: STEP.health,
  planReveal: STEP.health,
  paywall: STEP.planReveal,
};

// iOS defaults. Not the web's old 30/140/65: a default is a suggestion, and
// 45 is the middle of who actually buys this.
export function emptyProfile() {
  return {
    goalId: null,
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
    email: "",
    emailAsked: false,
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
    if (!saved || saved.v !== 1 || !saved.profile) return null;
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
      JSON.stringify({ v: 1, step, profile, savedAt: Date.now() })
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
  } catch {
    /* see above */
  }
}

/**
 * Where a returning member should land.
 *
 * Two steps are never resumed into: the plan-building animation, because it is
 * a transition and not a place, and the timeline before a plan exists.
 */
export function resumeStep(saved) {
  if (!saved?.step) return STEP.welcome;
  const { step, profile } = saved;
  // Nothing past the goal screen can render without a goal. A record that lost
  // one, however that happened, restarts at the question rather than crashing
  // on a lookup two screens later.
  if (step !== STEP.welcome && !profile.goalId) return STEP.goal;
  if (step === STEP.personalizing) return STEP.health;
  if ((step === STEP.planReveal || step === STEP.paywall) && !profile.planBuilt) {
    return STEP.health;
  }
  return step;
}

/** Everything answered, so the paywall can be trusted to render. */
export function isProfileComplete(profile) {
  return Boolean(
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

/** BMI to one decimal place, from pounds and inches. */
export function bmi(weightLbs, heightInches) {
  const kg = weightLbs / LB_PER_KG;
  const metres = (heightInches * CM_PER_INCH) / 100;
  if (!metres) return "0.0";
  return (kg / (metres * metres)).toFixed(1);
}

export function activityPhrase(activityId) {
  return ACTIVITY_LEVELS.find((a) => a.id === activityId)?.phrase || "lightly active";
}

/**
 * "pelvic pain", "bladder leaks and prostate concerns", "A, B and C".
 * With nothing selected the sentence still has to read, so it becomes the thing
 * she actually told us: that her needs are her own.
 */
export function conditionPhrase(conditions, noConditions) {
  if (noConditions || !conditions?.length) return "your unique needs";
  const nouns = conditions
    .map((id) => HEALTH_CONDITIONS.find((c) => c.id === id)?.noun)
    .filter(Boolean);
  if (nouns.length === 0) return "your unique needs";
  if (nouns.length === 1) return nouns[0];
  return `${nouns.slice(0, -1).join(", ")} and ${nouns[nouns.length - 1]}`;
}

/**
 * Email is valid when there is something before the @, a dot after it, and a
 * domain long enough to be real. Same shape as the iOS check, so the button
 * enables at the same moment on both.
 */
export function isEmailValid(value) {
  const email = (value || "").trim();
  const at = email.indexOf("@");
  if (at < 1) return false;
  if (email.indexOf("@", at + 1) !== -1) return false;
  const domain = email.slice(at + 1);
  if (domain.length < 3) return false;
  const dot = domain.indexOf(".");
  return dot > 0 && dot < domain.length - 1;
}
