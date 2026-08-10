"use client";

// Per-goal wording and colour for the member app.
//
// The iOS app keeps four separate vocabularies for the same goal and mixing
// them up is the fastest way to ship a broken sentence:
//
//   displayTitle    "Support My Fitness"     on a card she taps
//   sentencePhrase  "support your fitness"   in prose about her
//   gerund          "supporting her fitness" in prose about other members
//   libraryPhrase   "staying fit"            after "Because your goal is …"
//
// Sources: GoalID.swift, ExerciseLibraryModel.swift (libraryGoalPhrase and
// libraryFocusTags), ProgramStyleProvider (pathway titles), and
// DailySymptomCheckIn.swift (goalFeelingQuestion).

/**
 * Ends the live line: "Live: 142 members improving bladder control right now."
 * A gerund, because the sentence has a plural subject and the app's own
 * sentence phrase ("support your fitness") reads as nonsense there.
 *
 * These are the phrases CommunityPulseViewModel.updateLogic() uses on the phone
 * (Scene/Main/Today/Header/LiveCommunity.swift), word for word. She reads this
 * line on both devices in the same week; it has to be the same sentence.
 */
export function goalGerund(goalId) {
  switch (goalId) {
    case "pregnancyPrep": return "preparing for pregnancy";
    case "postpartum": return "supporting postpartum recovery";
    case "coreStrength": return "building core stability";
    case "bladderLeaks": return "improving bladder control";
    case "pelvicPain": return "easing pelvic discomfort";
    case "intimacy": return "improving intimacy";
    case "fitness": return "building whole-body strength";
    case "stability": return "building core stability";
    case "diastasisRecti": return "closing their gap";
    default: return "improving pelvic health";
  }
}

/** Ends the sentence "Because your goal is …". */
export function libraryGoalPhrase(goalId) {
  switch (goalId) {
    case "pregnancyPrep": return "getting ready for pregnancy";
    case "postpartum": return "recovering after birth";
    case "coreStrength": return "a stronger core";
    case "bladderLeaks": return "fewer leaks";
    case "pelvicPain": return "less pelvic pain";
    case "intimacy": return "better intimacy";
    case "fitness": return "staying fit";
    case "stability": return "better balance";
    case "diastasisRecti": return "healing your tummy gap";
    default: return "a stronger core";
  }
}

/** Catalog tags that serve this goal, used to build her personal rail. */
export function libraryFocusTags(goalId) {
  switch (goalId) {
    case "pregnancyPrep": return ["postpartum", "breathing", "mobility"];
    case "postpartum": return ["postpartum"];
    case "coreStrength": return ["core", "pilates"];
    case "bladderLeaks": return ["strength", "core"];
    case "pelvicPain": return ["relaxation", "stretch", "mobility"];
    case "intimacy": return ["relaxation", "yoga", "mobility"];
    case "fitness": return ["cardio", "strength"];
    case "stability": return ["balance", "posture", "core"];
    case "diastasisRecti": return ["core", "postpartum"];
    default: return ["core"];
  }
}

/** The name on the journey card, matching the iOS pathway header. */
export function pathwayTitle(goalId) {
  switch (goalId) {
    case "bladderLeaks": return "The 90-Day Leakproof Seal";
    case "intimacy": return "The 90-Day Intimacy Journey";
    case "postpartum": return "The 90-Day Postpartum Rebuild";
    case "pregnancyPrep": return "The 90-Day Pregnancy Prep";
    case "pelvicPain": return "The 90-Day Pain Release";
    case "diastasisRecti": return "The 90-Day Gap Healer";
    default: return "The 90-Day Total Core";
  }
}

export function pathwaySubtitle(goalId) {
  switch (goalId) {
    case "bladderLeaks": return "Rebuild your seal, day by day. Guaranteed.";
    case "intimacy": return "Feel more, sense more, connect more. Guaranteed.";
    case "postpartum": return "Gentle, steady recovery you can trust. Guaranteed.";
    case "pregnancyPrep": return "A strong, ready foundation for what's next. Guaranteed.";
    case "pelvicPain": return "Unwind tension, restore ease. Guaranteed.";
    case "diastasisRecti": return "Close your gap safely, without surgery. Guaranteed.";
    default: return "A stronger center for everything you do. Guaranteed.";
  }
}

/** The 1 to 5 question on the daily check-in, phrased for her goal. */
export function goalFeelingQuestion(goalId) {
  switch (goalId) {
    case "intimacy": return "How connected do you feel to your body today?";
    case "bladderLeaks": return "How sure do you feel about your control today?";
    case "postpartum": return "How strong does your recovery feel today?";
    case "pregnancyPrep": return "How ready does your body feel today?";
    case "pelvicPain": return "How at ease does your body feel today?";
    default: return "How strong does your core feel today?";
  }
}

/** iOS asks about leaks only when leaks are the point. */
export function showsLeakQuestion(goalId) {
  return goalId === "bladderLeaks" || goalId === "postpartum";
}

export function showsPainQuestion(goalId) {
  return goalId === "pelvicPain" || goalId === "pregnancyPrep";
}

/** Her opening question in Coach Mia's prompt rail. */
export function goalPrompt(goalId) {
  switch (goalId) {
    case "pelvicPain": return "Gentle stretches for pain relief?";
    case "bladderLeaks": return "How do I stop leaks during the day?";
    case "postpartum": return "Which exercises are safe after birth?";
    case "intimacy": return "How does this help intimacy?";
    case "pregnancyPrep": return "How do I get my body ready for pregnancy?";
    case "diastasisRecti": return "Is the gap in my tummy closing?";
    default: return "How can I improve my posture?";
  }
}

// The accent gradient behind the journey card. These are the UIKit system
// colours the iOS pathway uses, written out as hex.
const SYSTEM = {
  blue: "#007AFF", cyan: "#32ADE6", pink: "#FF2D55", red: "#FF3B30",
  green: "#34C759", mint: "#00C7BE", purple: "#AF52DE", indigo: "#5856D6",
  orange: "#FF9500", yellow: "#FFCC00", teal: "#30B0C7",
};

export function goalAccent(goalId) {
  switch (goalId) {
    case "bladderLeaks": return [SYSTEM.blue, SYSTEM.cyan];
    case "intimacy": return [SYSTEM.pink, SYSTEM.red];
    case "postpartum": return [SYSTEM.green, SYSTEM.mint];
    case "pregnancyPrep": return [SYSTEM.purple, SYSTEM.indigo];
    case "pelvicPain": return [SYSTEM.orange, SYSTEM.yellow];
    case "diastasisRecti": return [SYSTEM.teal, SYSTEM.mint];
    default: return [SYSTEM.indigo, SYSTEM.blue];
  }
}

/** `linear-gradient(...)` ready for a style attribute. */
export function goalAccentCSS(goalId, angle = "135deg") {
  const [from, to] = goalAccent(goalId);
  return `linear-gradient(${angle}, ${from} 0%, ${to} 100%)`;
}
