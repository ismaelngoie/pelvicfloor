// Pure port of PlanCalibration and ExercisePrescriptionResolver in the native
// Core/Premium/PremiumCareExperience.swift. Height/weight use inches/pounds.

const has = (text, terms) => terms.some((term) => text.includes(term));
const clamp = (value, low, high) => Math.min(Math.max(value, low), high);
const titleOf = (value) => typeof value === "string" ? value : value?.title || "";

export function planCalibration(member = {}, { goalId = "coreStrength", focusId } = {}) {
  const validNumber = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
  const age = validNumber(member.age, 16, 110);
  const height = validNumber(member.heightInches ?? member.height, 48, 96);
  const weight = validNumber(member.weightLbs ?? member.weight, 80, 400);
  const bmi = height && weight ? 703 * weight / (height * height) : null;
  const activityTitle = titleOf(member.activityLevel || member.activity).trim().toLowerCase();
  const activity = has(activityTitle, ["sedentary", "mostly sitting"]) ? "mostlySitting"
    : has(activityTitle, ["moderate", "lightly", "daily walk"]) ? "lightlyActive"
      : activityTitle === "active" || has(activityTitle, ["very active", "regular workout"]) ? "veryActive" : "notProvided";
  const health = (Array.isArray(member.healthConditions) ? member.healthConditions : []).map((value) => titleOf(value).trim().toLowerCase()).filter(Boolean);
  const healthHas = (terms) => health.some((value) => has(value, terms));
  let dose = 1;
  let rounds = 3;
  let rest = goalId === "fitness" ? 20 : 15;
  let transition = 10;
  let supported = false;
  if (goalId === "pelvicPain") { dose = 0.8; rounds = 1; rest = 20; transition = 15; supported = true; }
  else if (["intimacy", "postpartum", "pregnancyPrep", "prolapse"].includes(goalId)) { dose = 0.85; rounds = 2; rest = 18; transition = 14; supported = true; }
  else if (goalId === "diastasisRecti") { dose = 0.9; rounds = 2; rest = 18; transition = 13; supported = true; }
  else if (["bladderLeaks", "coreStrength", "stability", "prostateRecovery", "bowelControl"].includes(goalId)) { dose = 0.95; rounds = 2; }
  const releaseFirst = ["intimacy.comfort", "intimacy.relaxation", "intimacy.dryness", "maleSexual.ejaculationControl", "maleSexual.pelvicTension", "postpartum.pressure", "pregnancy.relaxation", "pregnancy.comfort", "pain.flares", "pain.tightness", "pain.sitting", "pain.intimacy", "diastasis.doming", "diastasis.pressure", "bladder.urgency", "bladder.nighttime", "prolapse.pressure", "prolapse.heaviness", "prostate.urgency", "bowel.urgency", "bowel.emptying"];
  const transitionFirst = ["postpartum.return", "pregnancy.movement", "pain.movement", "fitness.impact", "stability.balance", "stability.walking", "prolapse.dailyMovement", "prolapse.exercise", "prostate.confidence", "bowel.confidence"];
  const recoveryFirst = ["core.endurance", "fitness.lifting", "fitness.impact", "diastasis.return", "postpartum.return", "maleSexual.erectionQuality", "prostate.continence", "prostate.drips"];
  if (releaseFirst.includes(focusId)) { dose = Math.min(dose, 0.75); rounds = 1; rest = Math.max(rest, 20); transition = Math.max(transition, 15); supported = true; }
  if (transitionFirst.includes(focusId)) { rounds = Math.min(rounds, 2); transition = Math.max(transition, 15); supported = true; }
  if (recoveryFirst.includes(focusId)) rest = Math.max(rest, 20);
  if (["intimacy.sensation", "intimacy.postpartum"].includes(focusId)) { dose = Math.min(dose, 0.85); rounds = 1; rest = Math.max(rest, 18); supported = true; }
  if (activity === "mostlySitting") { dose = Math.min(dose, 0.85); rounds = Math.min(rounds, 2); rest = Math.max(rest, 18); transition = Math.max(transition, 13); }
  else if (activity === "lightlyActive") dose = Math.min(dose, 0.95);
  const conservative = healthHas(["clinician restriction", "surgery", "c-section", "tear", "episiotomy", "less than 12 weeks", "hernia", "neurologic", "fertility treatment"]);
  const release = healthHas(["tight", "overactive", "pain", "penetration", "endometriosis", "vulvodynia", "dryness", "hormonal", "bladder irritation", "scar pain"]);
  const pressure = healthHas(["prolapse", "heaviness", "diastasis", "doming", "coning", "hernia", "leaks during", "leaks with", "impact", "lifting", "pressure during"]);
  if (conservative) { dose = Math.min(dose, 0.7); rounds = 1; rest = Math.max(rest, 24); transition = Math.max(transition, 18); supported = true; }
  else if (release) { dose = Math.min(dose, 0.75); rounds = 1; rest = Math.max(rest, 22); transition = Math.max(transition, 16); supported = true; }
  else if (pressure || health.length) { dose = Math.min(dose, 0.8); rounds = Math.min(rounds, 2); rest = Math.max(rest, 20); transition = Math.max(transition, 15); supported = true; }
  if (age >= 75) { dose = Math.min(dose, 0.75); rounds = 1; rest = Math.max(rest, 22); transition = Math.max(transition, 16); supported = true; }
  else if (age >= 65) { dose = Math.min(dose, 0.85); rounds = Math.min(rounds, 2); rest = Math.max(rest, 18); transition = Math.max(transition, 14); supported = true; }
  if (bmi && (bmi < 18.5 || bmi >= 35)) { dose = Math.min(dose, 0.9); rest = Math.max(rest, 18); transition = Math.max(transition, 14); supported = true; }
  else if (bmi >= 30) { rest = Math.max(rest, 18); transition = Math.max(transition, 13); supported = true; }
  return { age, bmi, activity, startingDoseScale: clamp(dose, 0.7, 1), startingRoundLimit: clamp(rounds, 1, 3), minimumRestSeconds: clamp(rest, 10, 30), positionTransitionSeconds: clamp(transition, 10, 20), usesSupportedSetup: supported };
}

export function bodyPosition(title) {
  const text = String(title || "").toLowerCase();
  if (has(text, ["side lying", "side-lying", "clamshell", "side plank"])) return "sideLying";
  if (has(text, ["supine", "lying", "dead bug", "heel tap", "bridge", "pelvic tilt", "knee drop", "90/90", "leg up the wall"])) return "supine";
  if (has(text, ["prone", "cobra", "swimmer"])) return "prone";
  if (has(text, ["quadruped", "hands and knees", "cat pose", "cat cow", "cat-cow", "bird dog", "fire hydrant", "bear hold"])) return "handsAndKnees";
  if (has(text, ["kneeling", "child's pose", "child’s pose", "half-kneel"])) return "kneeling";
  if (has(text, ["seated", "sitting", "chair"])) return "seated";
  if (has(text, ["standing", "squat", "lunge", "good morning", "deadlift", "warrior", "tree pose", "high knees", "step", "walk", "lifting"])) return "standing";
  return "unknown";
}

export function sidePlan(title) {
  const text = String(title || "").toLowerCase();
  if (has(text, ["left", "right"])) return "shownSide";
  if (has(text, ["single leg", "single-leg", "one leg", "side lunge", "clamshell", "side plank", "leg circle", "leg lift", "hip abduction", "fire hydrant", "bird dog", "warrior", "psoas", "piriformis"])) return "eachSide";
  return "none";
}

const POSITION_LABELS = { standing: "standing", seated: "seated", supine: "lying on your back", sideLying: "side-lying", prone: "lying on your front", kneeling: "kneeling", handsAndKnees: "hands and knees", unknown: "ready" };
const SETUPS = {
  standing: "Stand tall with clear space around you.", seated: "Sit near the edge of a sturdy chair, feet grounded.",
  supine: "Lie on your back with your head and knees supported.", sideLying: "Lie on your side with your head comfortably supported.",
  prone: "Lie on your front on a comfortable mat.", kneeling: "Use a mat or folded towel under your knees.",
  handsAndKnees: "Set up on hands and knees on a comfortable mat.", unknown: "Get comfortable with enough room to move.",
};
const SUPPORTS = {
  standing: "Keep a sturdy chair or wall within reach for support.", seated: "Use a sturdy chair with your feet fully supported.",
  supine: "Add pillows under your head or knees until you feel settled.", sideLying: "Use pillows under your head and between your knees as needed.",
  prone: "Add a folded towel or cushion wherever pressure feels uncomfortable.", kneeling: "Add a folded towel or cushion under any pressure point.",
  handsAndKnees: "Add a folded towel or cushion under any pressure point.", unknown: "Choose a stable, supported starting position.",
};
const GOAL_CUES = {
  pregnancyPrep: "Keep the effort comfortable. Stop for pain, dizziness, bleeding, or unusual pressure.",
  postpartum: "Use a gentle effort. Stop for pain, heaviness, or increased bleeding.",
  coreStrength: "Keep breathing and choose control over a bigger range.",
  bladderLeaks: "Exhale on effort and fully release between every rep.",
  pelvicPain: "Keep it easy. The sensation should settle, not build.",
  intimacy: "Comfort comes first. Soften fully between efforts.",
  fitness: "Exhale through effort. Reduce the load if leaking or heaviness appears.",
  stability: "Use support nearby and keep your pelvis steady, not rigid.",
  diastasisRecti: "Exhale through effort and reduce the range if you see doming.",
  prolapse: "Exhale through effort. Reduce the range if heaviness, bulging, or downward pressure increases.",
  prostateRecovery: "Use a gentle lift, keep breathing, and release fully between every rep.",
  bowelControl: "Lift without straining, keep breathing, and release completely between efforts.",
};

function setupLine(title, position) {
  let setup = SETUPS[position];
  if (title.includes("wall")) setup += " Keep a clear wall within reach.";
  else if (title.includes("chair")) setup += " Use a sturdy chair that will not slide.";
  else if (title.includes("foam")) setup += " Have your foam roller ready.";
  else if (title.includes("band")) setup += " Place your resistance band where the coach shows.";
  else if (has(title, ["weight", "dumbbell", "lifting"])) setup += " Choose a light weight you can control.";
  else if (title.includes("ball")) setup += " Have a small exercise ball ready.";
  return setup;
}

export function applyCalibration(base, calibration, { programDay = 1, difficulty = "easy" } = {}) {
  const day = clamp(programDay, 1, 90);
  const progression = (day - 1) / 89;
  const calibrationWeight = Math.max(0.35, 1 - progression * 0.65);
  const scale = 1 - (1 - calibration.startingDoseScale) * calibrationWeight;
  const allowance = Math.min(2, Math.floor((day - 1) / 30));
  let rounds = Math.max(1, Math.min(base.rounds, calibration.startingRoundLimit + allowance));
  let repetitions = base.repetitions == null ? null : Math.min(base.repetitions, Math.max(4, Math.round(base.repetitions * scale)));
  let workSeconds = base.practiceType !== "followAlong" && base.workSeconds != null
    ? Math.min(base.workSeconds, Math.max(15, Math.round(base.workSeconds * scale / 5) * 5)) : base.workSeconds;
  let restSeconds = base.rounds > 1 ? Math.max(base.restSeconds, calibration.minimumRestSeconds) : base.restSeconds;
  if (difficulty === "medium") {
    rounds = Math.max(rounds, Math.min(base.rounds, 2));
    if (base.repetitions != null) repetitions = Math.max(repetitions || 0, base.repetitions);
    if (base.practiceType !== "followAlong" && base.workSeconds != null) workSeconds = Math.max(workSeconds || 0, base.workSeconds);
    restSeconds = Math.max(base.restSeconds, 12);
  } else if (difficulty === "hard") {
    if (base.practiceType !== "followAlong") rounds = Math.max(3, base.rounds);
    if (base.repetitions != null) repetitions = Math.min(Math.max(base.repetitions + 4, 12), 20);
    if (base.practiceType !== "followAlong" && base.workSeconds != null) workSeconds = Math.min(Math.max(base.workSeconds + 20, 45), 90);
    restSeconds = base.practiceType === "followAlong" ? base.restSeconds : clamp(base.restSeconds, 8, 12);
  }
  const support = SUPPORTS[base.position];
  const setup = calibration.usesSupportedSetup && !base.setup.includes(support) ? `${base.setup} ${support}` : base.setup;
  const result = { ...base, rounds: Math.max(rounds, 1), repetitions, workSeconds, restSeconds, setup };
  const suffix = result.sides === "eachSide" ? " each side" : result.sides === "shownSide" ? " on the shown side" : "";
  const roundText = result.rounds > 1 ? `${result.rounds} rounds · ` : "";
  result.offersGuidedPractice = result.practiceType !== "followAlong";
  result.doseLine = result.practiceType === "followAlong" ? "Follow the coach once"
    : result.practiceType === "repetitions" ? `${roundText}${result.repetitions ?? 6} slow reps${suffix}` : `${roundText}${result.workSeconds ?? 30} sec${suffix}`;
  result.restLine = result.sides === "eachSide" && result.rounds > 1 ? `8 sec to change sides · ${result.restSeconds} sec rest between rounds`
    : result.sides === "eachSide" ? "8 sec to change sides" : result.rounds > 1 ? `${result.restSeconds} sec rest between rounds` : "No rush between movements";
  result.workSegmentSeconds = result.practiceType === "repetitions" ? Math.max((result.repetitions ?? 6) * result.secondsPerRep, 12) : Math.max(result.workSeconds ?? 30, 10);
  result.estimatedPracticeSeconds = result.workSegmentSeconds * (result.sides === "eachSide" ? 2 : 1) * result.rounds
    + (result.sides === "eachSide" ? 8 * result.rounds : 0) + Math.max(0, result.rounds - 1) * result.restSeconds;
  return result;
}

export function exercisePrescription(video, { goalId = "coreStrength", programDay = 1, difficulty = "easy", member = {}, focusId } = {}) {
  const title = (video?.title || video?.thumbnailName || "").toLowerCase();
  const tags = new Set((video?.tags || []).map((tag) => tag.toLowerCase()));
  const day = Math.max(programDay || 1, 1);
  const stage = day <= 14 ? "foundation" : day <= 56 ? "build" : "progress";
  const position = bodyPosition(title);
  const sides = sidePlan(title);
  const base = { practiceType: "repetitions", rounds: 1, repetitions: null, workSeconds: null, secondsPerRep: 4, restSeconds: 0, sides, position, setup: setupLine(title, position), goalCue: GOAL_CUES[goalId] || GOAL_CUES.coreStrength };
  const calibration = planCalibration(member, { goalId, focusId });
  const finish = (values) => applyCalibration({ ...base, ...values }, calibration, { programDay: day, difficulty });
  if (has(title, ["follow along", "full routine", "guided workout", "warm-up flow", "warm up flow", "cool-down flow", "cool down flow"])) {
    return finish({ practiceType: "followAlong", workSeconds: video?.durationSeconds > 0 ? video.durationSeconds : null, sides: "none" });
  }
  const breathing = tags.has("breathing") || has(title, ["breath", "diaphragm", "360 breathing"]);
  const stretch = !breathing && (["stretch", "relaxation", "yoga"].some((tag) => tags.has(tag)) || has(title, ["stretch", "pose", "release", "decompression", "mobility"]));
  const staticHold = has(title, ["hold", "plank", "wall sit", "balance", "warrior", "tree pose"]);
  const cardio = tags.has("cardio") || has(title, ["cardio", "jump", "high knees", "mountain climber"]);
  if (breathing) return finish({ practiceType: "timed", workSeconds: ["pelvicPain", "intimacy"].includes(goalId) ? 60 : stage === "foundation" ? 45 : 60, secondsPerRep: 5, restSeconds: 10, sides: "none" });
  if (stretch) return finish({ practiceType: "timed", rounds: stage === "progress" && goalId !== "pelvicPain" ? 2 : 1, workSeconds: ["pelvicPain", "intimacy"].includes(goalId) ? 45 : 30, secondsPerRep: 5, restSeconds: 12,
    sides: sides === "none" && has(title, ["hip", "leg", "hamstring", "piriformis", "psoas", "calf", "ankle", "wrist"]) ? "eachSide" : sides });
  if (staticHold || cardio) return finish({ practiceType: "timed", rounds: stage === "progress" && cardio ? 3 : 2,
    workSeconds: cardio ? stage === "foundation" ? 30 : stage === "build" ? 40 : 45 : stage === "foundation" ? 15 : stage === "build" ? 20 : 30, restSeconds: cardio ? 20 : 15 });
  const baseReps = ["pelvicPain", "intimacy", "postpartum", "pregnancyPrep", "prolapse", "diastasisRecti"].includes(goalId) ? 6 : goalId === "fitness" ? 10 : 8;
  const rounds = goalId === "pelvicPain" || stage === "foundation" && ["intimacy", "postpartum", "pregnancyPrep"].includes(goalId) ? 1
    : stage === "progress" && ["fitness", "coreStrength", "stability"].includes(goalId) ? 3 : 2;
  return finish({ repetitions: baseReps + (stage === "foundation" ? 0 : 2), rounds, secondsPerRep: video?.format?.toLowerCase() === "gif" ? 5 : 4, restSeconds: goalId === "fitness" ? 20 : 15 });
}

export function exerciseTransition(current, next, options = {}) {
  if (!current || !next) return { seconds: 3, instruction: "Get ready for the next exercise.", isPositionChange: false };
  const from = exercisePrescription(current, options);
  const to = exercisePrescription(next, options);
  const isPositionChange = from.position !== "unknown" && to.position !== "unknown" && from.position !== to.position;
  return isPositionChange ? { seconds: planCalibration(options.member, options).positionTransitionSeconds,
    instruction: `Move from ${POSITION_LABELS[from.position]} to ${POSITION_LABELS[to.position]}.`, isPositionChange: true }
    : { seconds: 3, instruction: to.setup, isPositionChange: false };
}

// Native ExerciseGuidanceProvider copy and branch order.
const EXERCISE_GUIDANCE = [
  {
    "purpose": null,
    "purposeKey": "breathingPurpose",
    "feel": "Let your lower ribs and belly widen. Your pelvic floor should soften, not push.",
    "breathe": "Breathe in quietly through your nose. Let the exhale leave slowly without forcing it.",
    "avoid": "Do not hold your breath, bear down, or pull your stomach in hard.",
    "easier": "Make the breath smaller and place one hand on your lower ribs to feel them move."
  },
  {
    "purpose": null,
    "purposeKey": "pelvicFloorPurpose",
    "feel": "A small lift around the openings, followed by a complete release. Your glutes should stay quiet.",
    "breathe": "Exhale as you gently lift. Inhale as you fully let go.",
    "avoid": "Do not squeeze your thighs, hold your breath, or keep the muscles tightened between reps.",
    "easier": "Use half the effort. A clear lift and full release matter more than a hard squeeze."
  },
  {
    "purpose": "Build hip and deep-core support without loading everything into your lower back.",
    "purposeKey": null,
    "feel": "Pressure through your heels and work in your glutes. Keep your ribs relaxed over your pelvis.",
    "breathe": "Exhale as your hips rise. Inhale as you lower with control.",
    "avoid": "Do not arch your back or push your stomach upward.",
    "easier": "Lift only halfway and pause as soon as you feel your lower back taking over."
  },
  {
    "purpose": "Strengthen the side hip that helps your pelvis stay steady during walking, lifting, and exercise.",
    "purposeKey": null,
    "feel": "The work should stay in the side of your hip, not the front of your thigh or your back.",
    "breathe": "Exhale as the leg moves. Inhale as it returns slowly.",
    "avoid": "Do not roll your pelvis backward to make the movement bigger.",
    "easier": "Use a smaller range and keep your top hip stacked directly over the bottom one."
  },
  {
    "purpose": null,
    "purposeKey": "corePurpose",
    "feel": "A steady wrap around your waist while you can still breathe and keep pressure away from the pelvic floor.",
    "breathe": "Exhale during the hardest part. Keep the next inhale moving into your ribs.",
    "avoid": "Do not hold your breath, dome through the midline, or push down into your pelvis.",
    "easier": "Shorten the lever, reduce the range, or place your knees down while keeping the same control."
  },
  {
    "purpose": "Teach your hips, core, and pelvic floor to manage pressure in movements you use every day.",
    "purposeKey": null,
    "feel": "Your feet stay grounded and your hips do the work. Your trunk should feel steady, not rigid.",
    "breathe": "Breathe in as you lower. Exhale through the effort as you rise.",
    "avoid": "Do not hold your breath or force through heaviness, leaking, pain, or pressure.",
    "easier": "Make the movement shallower or use a chair for support."
  },
  {
    "purpose": "Reduce unnecessary upper-body tension so breathing and trunk control feel easier.",
    "purposeKey": null,
    "feel": "A light stretch or gentle muscle work, never pinching or sharp pain.",
    "breathe": "Keep breathing normally and let your jaw stay soft.",
    "avoid": "Do not force the range or pull on your head.",
    "easier": "Make the movement smaller and keep your shoulders heavy."
  },
  {
    "purpose": null,
    "purposeKey": "relaxationPurpose",
    "feel": "A comfortable stretch with room to breathe. The sensation should ease as you stay there.",
    "breathe": "Let each inhale widen your ribs. Use the exhale to soften your jaw, belly, and pelvic floor.",
    "avoid": "Do not force deeper, bounce, or stay in sharp, burning, or increasing pain.",
    "easier": "Support yourself with a pillow, bend the knees, or reduce the range."
  },
  {
    "purpose": "Build whole-body capacity while practicing pressure control at a pace you can own.",
    "purposeKey": null,
    "feel": "Your breathing can get faster, but your movement should still feel controlled and coordinated.",
    "breathe": "Keep breathing throughout. Exhale through the hardest beat instead of bracing and holding.",
    "avoid": "Do not push through leaking, heaviness, pain, dizziness, or loss of control.",
    "easier": "Remove the jump, slow the tempo, or reduce the range until control returns."
  },
  {
    "purpose": null,
    "purposeKey": "generalPurpose",
    "feel": "Smooth, controlled work in the muscles shown by your coach, with no sharp pain or downward pressure.",
    "breathe": "Keep the breath moving. Exhale through the hardest part of the movement.",
    "avoid": "Do not rush, hold your breath, or force a range you cannot control.",
    "easier": "Use a smaller range and move more slowly while you learn the pattern."
  }
];
const GUIDANCE_PURPOSES = {
  "breathingPurpose": {
    "pelvicPain": "Help an overactive pelvic floor release and make comfortable movement easier.",
    "intimacy": "Help an overactive pelvic floor release and make comfortable movement easier.",
    "diastasisRecti": "Coordinate your diaphragm, deep core, and pelvic floor before adding more load.",
    "coreStrength": "Coordinate your diaphragm, deep core, and pelvic floor before adding more load.",
    "fitness": "Coordinate your diaphragm, deep core, and pelvic floor before adding more load.",
    "stability": "Coordinate your diaphragm, deep core, and pelvic floor before adding more load.",
    "default": "Build the breathing pattern your pelvic floor uses to respond to pressure."
  },
  "pelvicFloorPurpose": {
    "pelvicPain": "Practice control in both directions. A healthy pelvic floor must release as well as lift.",
    "intimacy": "Practice control in both directions. A healthy pelvic floor must release as well as lift.",
    "bladderLeaks": "Build a clear, timely lift that can support your bladder during coughs, movement, and urgency.",
    "prolapse": "Build coordinated lift and pressure control to support the pelvic organs during daily movement.",
    "prostateRecovery": "Keep the effort controlled and release fully between reps. Stop if pain or pressure increases.",
    "bowelControl": "Use a steady exhale and a clean lift without clenching your abdomen or holding your breath.",
    "default": "Improve pelvic-floor coordination so support turns on when needed and relaxes afterward."
  },
  "corePurpose": {
    "diastasisRecti": "Build tension through the abdominal wall while keeping doming and downward pressure low.",
    "bladderLeaks": "Build trunk support without sending extra pressure toward your bladder.",
    "postpartum": "Reconnect your deep core gradually while your body rebuilds capacity.",
    "default": "Build strength while your breathing, deep core, and pelvic floor manage pressure together."
  },
  "relaxationPurpose": {
    "pelvicPain": "Create a safe, gentle way for guarded pelvic muscles to reduce tension.",
    "intimacy": "Practice the release and mobility that can support comfort during intimacy.",
    "pregnancyPrep": "Make room for comfortable breathing and changing pressure through the pelvis.",
    "default": "Restore mobility and full muscle release between strengthening sessions."
  },
  "generalPurpose": {
    "bladderLeaks": "Build the strength and timing that support bladder control.",
    "pelvicPain": "Restore comfortable movement without teaching your body to guard harder.",
    "intimacy": "Build the control, circulation, and relaxation that support comfortable intimacy.",
    "postpartum": "Rebuild coordinated strength for daily postpartum movement.",
    "pregnancyPrep": "Build practical strength while managing changing pressure through pregnancy.",
    "diastasisRecti": "Build abdominal-wall strength with better pressure control.",
    "fitness": "Build pelvic-floor and core control that carries into training.",
    "stability": "Improve the hip and trunk control that keeps your pelvis steady.",
    "coreStrength": "Build a stronger core that works with your breath and pelvic floor.",
    "prolapse": "Build pelvic support and pressure control for less heaviness during daily life.",
    "prostateRecovery": "Rebuild pelvic-floor timing and bladder control after prostate treatment.",
    "bowelControl": "Build the pelvic-floor timing and endurance that support bowel control."
  }
};

export function exerciseGuidance(video, { goalId = "coreStrength" } = {}) {
  const title = (video?.title || video?.thumbnailName || "").toLowerCase();
  const tags = new Set((video?.tags || []).map((tag) => tag.toLowerCase()));
  const index = title.includes("breath") || tags.has("breathing") ? 0
    : has(title, ["kegel", "pelvic floor", "squeeze"]) ? 1
      : has(title, ["bridge", "hip thrust"]) ? 2
        : has(title, ["clamshell", "abduction", "fire hydrant"]) ? 3
          : has(title, ["plank", "dead bug", "bear"]) || tags.has("core") ? 4
            : has(title, ["squat", "lunge", "sit to stand"]) ? 5
              : title.includes("neck") || tags.has("posture") ? 6
                : ["stretch", "yoga", "relaxation"].some((tag) => tags.has(tag)) || title.includes("pose") ? 7
                  : tags.has("cardio") ? 8 : 9;
  const guidance = EXERCISE_GUIDANCE[index];
  const purposes = GUIDANCE_PURPOSES[guidance.purposeKey];
  return { ...guidance, purpose: purposes ? purposes[goalId] || purposes.default : guidance.purpose, firstCue: guidance.feel };
}
