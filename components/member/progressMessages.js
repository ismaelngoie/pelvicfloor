// The line on the Today tab's progress card.
//
// Ported from ProgressMessageProvider in the iOS app's
// Scene/Main/Today/Progress Card/ProgressCardView.swift. One message per goal
// per state, picked by day of year so it changes daily and never flickers
// between renders, exactly as on the phone.

const MESSAGES = {
  bladderLeaks: {
    inProgress: [
      "Keep going! Every minute builds reliable control.",
      "You're strengthening your leakproof seal.",
      "This builds confidence for a worry-free life.",
      "Great work! Consistency is key to bladder control.",
      "Each moment builds towards a future without leaks.",
    ],
    complete: [
      "👏 You've built your leakproof foundation for the day!",
      "Great session! One step closer to total control.",
      "Daily goal crushed! Your consistency is paying off.",
      "Fantastic! Today was an investment in your confidence.",
      "Workout complete! Feel the strength you're building.",
    ],
  },
  intimacy: {
    inProgress: [
      "You're doing great. This brings back deeper feeling.",
      "Keep it up. You're building strength for more pleasure.",
      "Every rep wakes your body up a little more.",
      "This is a real act of care for yourself.",
      "Stay focused. You're building confidence from within.",
    ],
    complete: [
      "Amazing work! Today's practice for better intimacy is done.",
      "Goal done. You put this time into yourself.",
      "Fantastic! You've strengthened your connection to pleasure.",
      "Daily plan crushed! Your consistency is key.",
      "Great session! You're building strength for sensation.",
    ],
  },
  postpartum: {
    inProgress: [
      "Wonderful job. You're gently rebuilding your core.",
      "Be proud of this time you're taking for yourself.",
      "This is how you safely restore your foundation.",
      "Keep going, mama. You're doing amazing work.",
      "Every minute is a step towards feeling strong again.",
    ],
    complete: [
      "Fantastic! You've completed today's healing session.",
      "Amazing work, mama! Your body thanks you.",
      "Goal complete! You're patiently rebuilding your strength.",
      "Session complete! Reclaiming your core, one day at a time.",
      "You did it! Be proud of today's recovery work.",
    ],
  },
  pregnancyPrep: {
    inProgress: [
      "Great work! Creating a strong home for your baby-to-be.",
      "Keep it up! This strength will support you.",
      "Every rep is a gift to your future self and baby.",
      "Building a strong core for the months ahead.",
      "You're doing amazing. This is the groundwork.",
    ],
    complete: [
      "Excellent! Today's prep for a healthy pregnancy is done.",
      "Goal complete! Your body is getting stronger.",
      "Great session! You're building a supportive foundation.",
      "Workout crushed! Investing in a smoother pregnancy.",
      "Fantastic job nurturing your body for the future!",
    ],
  },
  coreStrength: {
    inProgress: [
      "Feel that power! You're forging a stronger core.",
      "Keep pushing! This is where true stability comes from.",
      "Every second is building a rock-solid center.",
      "Great form. This shows up in everything you do.",
      "Great work. Feel that deep core switch on.",
    ],
    complete: [
      "Awesome! Another brick in your foundation of strength.",
      "Core work complete! Your stability is improving daily.",
      "Goal crushed! That's how you build real power.",
      "Great session! You've strengthened your fitness core.",
      "Workout complete! Your posture and power thank you.",
    ],
  },
  pelvicPain: {
    inProgress: [
      "Gently now. Every movement is an act of self-care.",
      "You're releasing tension and inviting in comfort.",
      "Keep breathing. You're creating space and relief.",
      "This is how a comfortable, steady core is built.",
      "Listen to your body. You're doing wonderful work.",
    ],
    complete: [
      "Beautifully done. You've completed today's session for relief.",
      "Great job! A powerful step toward comfort.",
      "Session complete! You're creating a pain-free foundation.",
      "Fantastic! Consistency here is key to lasting ease.",
      "Goal crushed! You've invested in your well-being.",
    ],
  },
  fitness: {
    inProgress: [
      "This is the secret weapon for your other goals!",
      "A stronger core means better running and lifting.",
      "Keep it up. Steady is how you get stronger.",
      "Great work! This is the foundation for performance.",
      "Every rep here supports all your other activities.",
    ],
    complete: [
      "Excellent! You've just boosted your entire fitness foundation.",
      "Workout complete! Your core is ready for any challenge.",
      "Goal crushed. This work lifts all your other training.",
      "Great session! You're building the core of an athlete.",
      "Fantastic. This is how you reach your next level.",
    ],
  },
  stability: {
    inProgress: [
      "Feeling taller! Each rep improves your posture.",
      "This is the key to standing strong and confident.",
      "Keep going! You're building a stable, supportive core.",
      "Great focus! This is how you prevent future aches.",
      "You're building a base for easy, tall posture.",
    ],
    complete: [
      "Great work! You've completed today's posture practice.",
      "Session complete! You're building a more stable you.",
      "Goal crushed! You're standing taller and stronger.",
      "Fantastic! Your spine will thank you for today's work.",
      "Workout complete! Enjoy that solid stability.",
    ],
  },
};

const FALLBACK = {
  inProgress: [
    "Keep going, you're doing great!",
    "Every minute counts. You've got this!",
    "Showing up is the whole trick.",
  ],
  complete: [
    "👏 You crushed today's plan!",
    "Great job! Your workout is complete.",
    "Amazing work today!",
  ],
};

/** Day of the year, so the pick is stable for a whole day. */
function dayIndex(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000) - 1;
}

/**
 * @param {string} goalId
 * @param {number} progress 0 to 1 through today's five minutes
 */
export function progressMessage(goalId, progress) {
  const set = MESSAGES[goalId] || FALLBACK;
  const index = Math.max(0, dayIndex());
  if (progress >= 1) return set.complete[index % set.complete.length];
  if (progress > 0) return `(${Math.round(progress * 100)}%) ${set.inProgress[index % set.inProgress.length]}`;
  return "Your first 5 minutes start today's progress!";
}
