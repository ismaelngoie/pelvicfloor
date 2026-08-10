"use client";

// The safety screens, ported phrase for phrase from
// "Pelvic Floor/Core/Insights/InsightAnswerService.swift" (enum InsightSafety).
//
// These run BEFORE any network call. Severe or sudden pain, bleeding, numbness,
// fever, signs of infection and not being able to pass urine never reach the
// model at all: they route straight to "please see a clinician". That is the
// difference between a coach and a liability, and it is the one part of this
// port that must not drift from the phone.
//
// If you change a phrase here, change it in the Swift too, or the same question
// gets two different answers depending on which device she is holding.
//
// MATCHING IS WHOLE PHRASE, NOT SUBSTRING. That is not fussiness. "uti" is
// inside "routine" and "charge" is inside "discharge", so substring matching
// would send "what is my routine today" to a clinician and "is discharge
// normal" to billing.

/**
 * Human-readable categories. These are pasted into the model's instruction
 * verbatim, so the local screen and the model's own routing cannot drift apart.
 * They are the same five Coach Mia refuses to work around.
 */
export const RED_FLAG_CATEGORIES = [
  "severe, sharp or sudden pain",
  "any bleeding that is new, heavy or unexplained",
  "numbness, tingling that will not settle, or loss of feeling",
  "fever, chills, or signs of infection such as burning, foul smell or discharge",
  "not being able to pass urine, or not being able to empty at all",
];

/**
 * Phrases precise enough to act on without asking. Deliberately narrow: a false
 * positive sends a member to a clinician she did not need, so single vague
 * words like "pain" or "blood" are not in here.
 */
const RED_FLAG_PHRASES = [
  // Pain that is not the ordinary ache this app is for.
  "severe pain", "sharp pain", "sudden pain", "extreme pain", "worst pain",
  "stabbing pain", "excruciating", "unbearable", "pain is severe", "pain is unbearable",
  // Bleeding.
  "bleeding", "bled", "heavy bleeding", "blood in my urine", "blood in urine",
  "blood in my pee", "bleeding after sex", "blood clots", "clots",
  // Nerve signs.
  "numb", "numbness", "loss of feeling", "lost feeling", "cannot feel my", "can t feel my",
  // Infection.
  "fever", "chills", "infection", "infected", "uti", "utis",
  "burning when i pee", "burning when i urinate", "burns when i pee",
  "foul smell", "smells bad", "pus",
  // Retention.
  "cannot pee", "cant pee", "can t pee", "cannot urinate", "cant urinate",
  "unable to urinate", "cannot empty", "cant empty", "can t empty",
  "urinary retention",
  // Explicit emergencies.
  "emergency", "ambulance", "went to the er", "a and e",
];

/**
 * Questions about the product rather than the body. A false positive here only
 * costs a trip to Coach Mia, who can answer either kind, so this list can be a
 * little broader than the red flags.
 */
const APP_PHRASES = [
  "cancel", "cancelled", "cancelling", "unsubscribe", "refund", "refunded",
  "money back", "subscription", "subscribe", "billing", "billed",
  "charge", "charged", "charges", "price", "pricing", "app cost",
  "cost of the app", "free trial", "trial ends",
  "my streak", "streak reset", "lost my streak",
  "restore purchase", "restore my purchase", "restore purchases",
  "log in", "login", "sign in", "signed out", "password",
  "delete my account", "change my goal", "reset my program",
  // Deliberately NOT "unlock", "locked" or "start over": "how do I unlock a
  // tight pelvic floor" and "should I start over" are body questions. Anything
  // phrased like "why is day 8 locked" falls through to the model's own
  // routing, which is instructed to send it to the coach.
  "unlock day", "unlock the next",
  "app store", "app crashed", "app crashes",
  "app is not working", "app not working", "cannot download",
  "video won t play", "video wont play", "videos won t play", "videos wont play",
];

/**
 * Lowercase, punctuation to spaces, single spaced and padded, so a phrase
 * wrapped in spaces can only match on word boundaries. This is also what turns
 * "can't pee" into "can t pee", which is why that spelling is in the list.
 */
function normalise(text) {
  const words = String(text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ");
  return ` ${words} `;
}

function matches(question, phrases) {
  const haystack = normalise(question);
  return phrases.some((phrase) => haystack.includes(` ${phrase} `));
}

export function isRedFlag(question) {
  return matches(question, RED_FLAG_PHRASES);
}

export function isAppQuestion(question) {
  return matches(question, APP_PHRASES);
}

/**
 * The sentence Coach Mia's own Tier 1 protocol tells her to say, word for word
 * from the iOS system instruction. The phone reaches it through the model; the
 * web says it without spending a request, which is the same answer sooner.
 */
export const COACH_RED_FLAG_REPLY =
  "It sounds like that's something a medical professional should look at. "
  + "Please consult with a doctor or physical therapist to get the best and "
  + "safest care for your body.";

/** Ported from ClinicianOutcome.standard(question:) in AskedArticle.swift. */
export const CLINICIAN_OUTCOME = {
  headline: "Let's get someone to look at this",
  body:
    "What you described is the kind of thing a doctor or a pelvic health "
    + "physiotherapist should check in person. That is not a scary answer. It is the "
    + "fastest way to feel better, and it means anything you do next is safe for you.",
  whatToBring: [
    "When it started, and what makes it better or worse",
    "How often it happens in a normal week",
    "Anything new: a birth, surgery, an injury, or a new medicine",
    "Your bladder diary, if you have been keeping one",
  ],
};

/** Ported from CoachHandoffOutcome.standard(question:). */
export const COACH_HANDOFF_OUTCOME = {
  headline: "Coach Mia can help with that",
  body:
    "That one is about your account and your plan rather than your body. "
    + "Coach Mia has your program, your streak and your settings in front of her, "
    + "so she can answer it properly.",
};
