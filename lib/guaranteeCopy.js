// The 90-Day Goal Guarantee, ported verbatim from the iOS app.
//
// Source of truth: "Pelvic Floor/Core/UI/GuaranteeCopy.swift". These strings
// are the offer. Do not reword them on the web without changing them on iOS in
// the same breath, or a member will be shown two different promises.
//
// Two rules that are easy to break by accident:
//
//  1. Every outcome phrase is SUBJECTIVE on purpose. "without leaking" and
//     "without pain" are absolute promises we would have to honour on a refund
//     claim. "without thinking about it" and "without bracing for pain" are the
//     outcomes she actually came for, and they are the ones that ship.
//
//  2. No em dashes or en dashes anywhere in member-facing copy.

export const SESSIONS_PER_WEEK = 5;
export const QUALIFYING_WEEKS_REQUIRED = 11;
export const TOTAL_WEEKS = 13;
export const CLAIM_EMAIL = "hello@pelvi.health";

export const BADGE_TITLE = "90-DAY GOAL GUARANTEE";

/**
 * Slots into one sentence frame and must read like a human wrote it:
 *   "If you're not {phrase} by {date}, we refund every month you paid."
 * So every phrase is a verb phrase, never a noun.
 */
export function outcomePhrase(goalId) {
  switch (goalId) {
    case "intimacy":
      return "feeling more like yourself in the bedroom";
    case "bladderLeaks":
      return "getting through a cough, a laugh and a run without thinking about it";
    case "pelvicPain":
      return "sitting, moving and sleeping without bracing for pain";
    case "postpartum":
      return "feeling strong and steady in your own body again";
    case "pregnancyPrep":
      return "going into pregnancy feeling strong and ready";
    case "diastasisRecti":
      // No "no surgery" tail: both frames below append a date straight after,
      // so "with no surgery by November 7" reads as a surgery deadline. The
      // claim is carried on the surfaces that append nothing.
      return "feeling your tummy gap close and your middle get strong again";
    default:
      return "feeling strong and steady through your middle";
  }
}

// --- Dates -----------------------------------------------------------------

// "MMMM d" with no zero padding. "November 07" reads as a typo.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatGuaranteeDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function addDays(days, from = new Date()) {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export const day7Date = (from = new Date()) => addDays(7, from);
export const day90Date = (from = new Date()) => addDays(90, from);
export const day7String = (from = new Date()) => formatGuaranteeDate(day7Date(from));
export const day90String = (from = new Date()) => formatGuaranteeDate(day90Date(from));

// --- Lines -----------------------------------------------------------------

export function connectorLine(day7, day90) {
  return `First signs by ${day7}. The full result by ${day90}. Both guaranteed.`;
}

export function secondSubCTA(day90) {
  return `And if you're not there by ${day90} after ${SESSIONS_PER_WEEK} sessions a week, we refund every month you paid. Not just the first.`;
}

export const LADDER_LINE =
  "✓ Day 7: any reason   ✓ Day 30: still not sure   ✓ Day 90: didn't hit your goal";

export const COVERAGE_TITLE = "What the 90-Day Goal Guarantee covers";

export function coverageBody(goalId) {
  return [
    `• Complete ${SESSIONS_PER_WEEK} sessions a week for at least ${QUALIFYING_WEEKS_REQUIRED} of ${TOTAL_WEEKS} weeks.`,
    `• If you're not ${outcomePhrase(goalId)} by day 90, email ${CLAIM_EMAIL}.`,
    "• We refund every month you were charged. No forms.",
    "• Your 7-day money-back guarantee is separate and needs no conditions.",
  ].join("\n");
}

// --- Plan reveal -----------------------------------------------------------

export const MILESTONE_CARD_TITLE = "Week 6 is the milestone. Day 90 is the promise.";

export const MILESTONE_CARD_BODY =
  "Pelvic floor training needs about three months to hold. That is the clinical standard, so your plan runs 90 days.";

export function milestoneCardPromise(goalId, day90) {
  return `If you're not ${outcomePhrase(goalId)} by ${day90}, we refund every month you paid.`;
}

// --- Email capture ---------------------------------------------------------

export const EMAIL_SHIELD_LINE =
  "We'll include your 90-Day Goal Guarantee in writing, so you have the terms, not just our word.";

export const EMAIL_CHECKLIST = [
  "✓ Your personalized 90-day plan",
  "✓ Your 90-Day Goal Guarantee, in writing",
  "✓ Your Day 1 session, ready to go",
];

export const EMAIL_SKIP_REASSURANCE = "Skipping is fine. Your guarantee still applies.";
