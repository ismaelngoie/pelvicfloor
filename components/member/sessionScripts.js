// The guided, eyes-free sessions, as plain data.
//
// Ported beat for beat from the iOS app's Core/Sessions/SessionScripts.swift.
// Every step keeps its phase, its duration, its on-screen label, its detail
// line and the exact words the coach says. If a line changes on the phone it
// has to change here too, or the two products start saying different things to
// the same woman.
//
// Nothing in this file imports React. The copy is the product, and it should be
// readable without any playback machinery in the way.
//
// DELIBERATE BROWSER DIFFERENCES
//   • Voice. iOS plays a recorded clip and falls back to AVSpeechSynthesizer.
//     The browser has no clips in the bundle, so every cue goes through the Web
//     Speech API. The words are identical, which is the part that matters.
//   • Haptics. navigator.vibrate exists on Android and does nothing on iOS
//     Safari. The buzz is a bonus, never the instruction: the ring and the one
//     big word carry the session on their own.

/** How large the breathing ring is during each phase. 1 is neutral. */
export const PHASE_SCALE = {
  settle: 1.0,
  squeeze: 0.84,
  hold: 0.84,
  release: 1.0,
  rest: 1.0,
  breatheIn: 1.13,
  breatheOut: 0.88,
  closing: 1.02,
};

/** Effort phases get the warmer, more saturated ring. */
export function isEffortPhase(phase) {
  return phase === "squeeze" || phase === "hold";
}

/** One timed beat. `cues` are { text, at } where `at` is seconds into the step. */
function step(phase, duration, label, detail, cues, extra = {}) {
  return {
    phase,
    duration,
    label,
    detail,
    cues: [...cues].sort((a, b) => a.at - b.at),
    countsAloud: Boolean(extra.countsAloud),
    rep: extra.rep ?? null,
  };
}

const cue = (text, at = 0) => ({ text, at });

function script({ id, title, subtitle, steps }) {
  let running = 0;
  const offsets = [];
  for (const s of steps) {
    offsets.push(running);
    running += s.duration;
  }
  const reps = steps.map((s) => s.rep || 0);
  return {
    id,
    title,
    subtitle,
    steps: steps.map((s, i) => ({ ...s, id: i })),
    stepOffsets: offsets,
    totalDuration: running,
    repTotal: reps.length ? Math.max(...reps) : 0,
  };
}

/** "2:09". Precision is reassuring when you are deciding if you have time. */
export function durationLabel(totalSeconds) {
  const total = Math.round(totalSeconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// --- Urge Rescue -----------------------------------------------------------

/** Stop moving, five quick strong contractions, then slow breathing. 60s. */
const freezeAndSqueeze = script({
  id: "urge.freezeAndSqueeze",
  title: "Freeze & Squeeze",
  subtitle: "Sixty seconds. Stay where you are.",
  steps: [
    step("settle", 5, "Stand still", "Stop moving. Stand still. You have time.", [
      cue("You're okay. Stop where you are."),
      cue("Stand still. Don't rush.", 2.3),
    ]),

    step("squeeze", 2, "Squeeze", "Quick and strong. Lift up and in.", [cue("Quick, strong squeeze.")], { rep: 1 }),
    step("release", 2, "Let go", "Soften completely.", [cue("Let it go.")], { rep: 1 }),

    step("squeeze", 2, "Squeeze", "Quick and strong. Lift up and in.", [cue("Again.")], { rep: 2 }),
    step("release", 2, "Let go", "Soften completely.", [cue("Release.")], { rep: 2 }),

    step("squeeze", 2, "Squeeze", "Quick and strong. Lift up and in.", [cue("Squeeze.")], { rep: 3 }),
    step("release", 2, "Let go", "Soften completely.", [cue("Let it go.")], { rep: 3 }),

    step("squeeze", 2, "Squeeze", "Quick and strong. Lift up and in.", [cue("Again.")], { rep: 4 }),
    step("release", 2, "Let go", "Soften completely.", [cue("Release.")], { rep: 4 }),

    step("squeeze", 2, "Squeeze", "Last one. Strong.", [cue("Last one."), cue("Squeeze.", 0.9)], { rep: 5 }),
    step("release", 2, "Let go", "Soften completely.", [cue("Let it go.")], { rep: 5 }),

    step("breatheIn", 4, "Breathe in", "In through your nose, slowly.", [cue("Slow breath in.")]),
    step("breatheOut", 6, "Breathe out", "Out through your mouth. Long and easy.", [cue("Long breath out.")]),

    step("breatheIn", 4, "Breathe in", "In again. Let your ribs widen.", [cue("Slow breath in.")]),
    step("breatheOut", 6, "Breathe out", "Out. Let your shoulders drop.", [
      cue("Long breath out."),
      cue("Feel it settling.", 3.2),
    ]),

    step("breatheIn", 4, "Breathe in", "One more, in.", [cue("Slow breath in.")]),
    step("breatheOut", 6, "Breathe out", "And out. The urge is already fading.", [
      cue("Long breath out."),
      cue("The urge is passing.", 3.2),
    ]),

    step("closing", 5, "You're okay", "Walk when you're ready. You're in control.", [
      cue("Well done. You handled that."),
      cue("When you're ready, walk. Don't run.", 2.0),
    ]),
  ],
});

/** The pre-emptive brace, rehearsed three times. 60s. */
const knack = script({
  id: "urge.knack",
  title: "The Knack",
  subtitle: "Brace first. Then cough, sneeze or lift.",
  steps: [
    step("settle", 8, "The Knack", "A quiet brace, used just before a cough, a sneeze or a lift.", [
      cue("Before you cough or lift, brace first."),
      cue("Practise it a few times.", 3.4),
    ]),
    step("settle", 5, "Stand tall", "Stand tall. Soften your jaw. Let your shoulders drop.", [
      cue("Soften everything."),
    ]),

    step("squeeze", 3, "Lift", "Lift up and in. Gently, like closing a door.", [
      cue("Lift up, and in."),
      cue("Gently now.", 1.6),
    ], { rep: 1 }),
    step("hold", 3, "Hold", "Hold the lift. Now cough, or lift.", [cue("Hold through it.")], { rep: 1 }),
    step("release", 4, "Let go", "Let go completely.", [cue("And release."), cue("Soften everything.", 1.8)], { rep: 1 }),

    step("squeeze", 3, "Lift", "Again. Lift up and in.", [cue("And again."), cue("Lift up, and in.", 1.1)], { rep: 2 }),
    step("hold", 3, "Hold", "Hold the lift. Cough or lift.", [cue("Hold through it.")], { rep: 2 }),
    step("release", 4, "Let go", "Let go completely.", [cue("Let it go.")], { rep: 2 }),

    step("squeeze", 3, "Lift", "Last one. Lift up and in.", [cue("Last one."), cue("Squeeze now.", 1.0)], { rep: 3 }),
    step("hold", 3, "Hold", "Hold it there.", [cue("Hold.")], { rep: 3 }),
    step("release", 4, "Let go", "And release.", [cue("And release.")], { rep: 3 }),

    step("breatheOut", 7, "Breathe out", "Breathe out slowly. Let your whole middle soften.", [
      cue("Long breath out."),
      cue("Soften everything.", 2.8),
    ]),

    step("closing", 10, "That's the Knack", "Brace first, and you stay dry. It becomes automatic sooner than you think.", [
      cue("That's the trick. Use it any time."),
      cue("Nice work.", 3.4),
    ]),
  ],
});

export const URGE_MODES = [
  {
    id: "freezeAndSqueeze",
    title: "Freeze & Squeeze",
    tagline: "For an urge that's already here.",
    script: freezeAndSqueeze,
  },
  {
    id: "knack",
    title: "The Knack",
    tagline: "For the cough that's coming.",
    script: knack,
  },
];

// --- Audio kegels ----------------------------------------------------------

const ENCOURAGEMENTS = ["Nice work.", "That's the one.", "Keep breathing.", "You've got this.", "Steady."];

/**
 * Warm-up, the counted set, cool-down. Built from the level's own hold and rest
 * so there is exactly one place to tune the pacing, exactly as on iOS.
 */
function makeKegels({ id, title, holdSeconds, restSeconds, reps, openingCue }) {
  // Anything five seconds or longer gets counted out loud, and a counted hold
  // keeps one cue on the beat so nothing talks over the numbers.
  const countsAloud = holdSeconds >= 5;

  const steps = [
    step("settle", 10, "Settle", "Sitting or lying down, whichever you like. Breathe out and let your belly soften.", [
      cue("Let's begin. Get comfortable."),
      cue("First, a few easy breaths.", 3.0),
      cue("Breathe.", 6.8),
    ]),
    step("settle", 7, "Ready", `${reps} holds of ${holdSeconds} seconds. Letting go matters as much as lifting.`, [
      cue(openingCue),
      cue("Soften everything.", 4.0),
    ]),
  ];

  for (let rep = 1; rep <= reps; rep += 1) {
    const squeezeCues = [];
    if (rep === 1) squeezeCues.push(cue("Squeeze."));
    else if (rep === reps) squeezeCues.push(cue("Last one."));
    else if (rep % 2 === 0) squeezeCues.push(cue("And again."));
    else squeezeCues.push(cue("Lift up, and in."));
    if (!countsAloud && rep !== 1 && rep !== reps) squeezeCues.push(cue("Hold.", Math.max(1, holdSeconds - 1.4)));

    steps.push(
      step("squeeze", holdSeconds, "Squeeze", "Lift up and in, and hold.", squeezeCues, { countsAloud, rep })
    );

    const releaseCues = [cue("Let it go.")];
    if (rep === Math.ceil(reps / 2)) releaseCues.push(cue("Halfway there. You're doing well.", 1.8));
    else if (rep % 3 === 0) releaseCues.push(cue(ENCOURAGEMENTS[rep % ENCOURAGEMENTS.length], 1.8));

    steps.push(
      step("release", restSeconds, "Release", "Let go completely. The rest is part of the work.", releaseCues, { rep })
    );
  }

  steps.push(
    step("closing", 12, "Set complete", "Beautifully done. Let everything soften, and take one long breath out.", [
      cue("Beautiful. Let's slow it down."),
      cue("That's it. You're done for today.", 2.8),
      cue("Soften everything.", 6.0),
      cue("Breathe.", 8.8),
    ])
  );

  return script({ id: `kegels.${id}`, title, subtitle: "Eyes closed. Voice on.", steps });
}

/** Picker order: the two minute set first, because it is the one she will actually do on a Tuesday night. */
export const KEGEL_SETS = [
  {
    id: "quickSet",
    title: "Quick Set",
    blurb: "Short holds, steady rhythm. Two minutes, done.",
    script: makeKegels({ id: "quickSet", title: "Quick Set", holdSeconds: 4, restSeconds: 4, reps: 12, openingCue: "Quick set. Two minutes." }),
  },
  {
    id: "gentle",
    title: "Gentle",
    blurb: "Three-second holds. Kind on a tired floor.",
    script: makeKegels({ id: "gentle", title: "Gentle", holdSeconds: 3, restSeconds: 4, reps: 10, openingCue: "Gentle set. Three seconds each." }),
  },
  {
    id: "standard",
    title: "Standard",
    blurb: "Five-second holds. The everyday set.",
    script: makeKegels({ id: "standard", title: "Standard", holdSeconds: 5, restSeconds: 5, reps: 10, openingCue: "Standard set. Five seconds each." }),
  },
  {
    id: "strong",
    title: "Strong",
    blurb: "Eight-second holds. When you're ready to work.",
    script: makeKegels({ id: "strong", title: "Strong", holdSeconds: 8, restSeconds: 8, reps: 10, openingCue: "Strong set. Eight seconds each." }),
  },
];
