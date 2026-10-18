// The 90-day program, and the rules that decide what she can do today.
//
// This is a direct port of the iOS ProgramEngine so the two never disagree
// about which day is unlocked. If you change a threshold here, change it in
// "Pelvic Floor/Core/Program/ProgramEngine.swift" too.
//
//   videoCompletionThreshold  0.8  a video counts as done at 80% watched
//   dayCompletionThreshold    0.6  a day counts as done at 60% of its videos
//   unlock rule                    the next day unlocks at midnight, never sooner
//
// `programState` below is the only place a day number is worked out. Nothing
// else in the app may compute one; read the block comment above it before
// touching any screen that prints "Day N".

export const VIDEO_COMPLETION_THRESHOLD = 0.8;
export const DAY_COMPLETION_THRESHOLD = 0.6;

// The eight goals a member can pick, matching GoalID.selectable on iOS.
// `stability` exists for members who chose it before the swap, but new members
// are offered `diastasisRecti` in its place.
//
// ORDER IS BY REVEALED DEMAND, NOT CATEGORY LOGIC. Intimacy is the most-clicked
// goal and used to sit sixth, in row three, below the fold: the single most
// wanted tile was one a visitor had to scroll to find. It now holds the
// top-left cell, the F-pattern hotspot, with bladder leaks (the biggest search
// market) beside it. GoalID.selectable in the iOS repo mirrors this order;
// change both together or the two products disagree about their own front door.
export const GOALS = [
  { id: "intimacy",       title: "Improve Intimacy",      emoji: "❤️", from: "#FFF0F5", to: "#FCE0ED" },
  { id: "bladderLeaks",   title: "Stop Bladder Leaks",    emoji: "🚽", from: "#EDF5FF", to: "#D9EDFC" },
  { id: "postpartum",     title: "Recover Postpartum",    emoji: "👩‍⚕️", from: "#F2FAF2", to: "#E0F2E3" },
  { id: "coreStrength",   title: "Build Core Strength",   emoji: "🏋️", from: "#F2F2FA", to: "#E3E6F7" },
  { id: "pelvicPain",     title: "Ease Pelvic Pain",      emoji: "💊", from: "#FFF7ED", to: "#FCEBD9" },
  { id: "pregnancyPrep",  title: "Prepare for Pregnancy", emoji: "🤰", from: "#F7F2FF", to: "#EBE0FC" },
  { id: "diastasisRecti", title: "Heal Diastasis Recti",  emoji: "🧘‍♀️", from: "#F0F7FA", to: "#DEF0F5" },
  { id: "fitness",        title: "Support My Fitness",    emoji: "🧘", from: "#F2F2FA", to: "#E3E6F7" },
];

// Member-only goal catalog. GOALS above also renders the existing public
// landing page, whose copy/order is intentionally preserved.
export const MEMBER_GOALS = [
  ...GOALS.map((goal) => goal.id === "diastasisRecti" ? { ...goal, title: "Fix Diastasis Recti" } : goal),
  { id: "prolapse", title: "Support Pelvic Prolapse", emoji: "🌿", from: "#F2FAF2", to: "#E0F2E3" },
  { id: "prostateRecovery", title: "Recover After Prostate Surgery", emoji: "✚", from: "#EDF5FF", to: "#D9EDFC" },
  { id: "bowelControl", title: "Improve Bowel Control", emoji: "◉", from: "#FFF7ED", to: "#FCEBD9" },
  { id: "stability", title: "Boost Stability & Posture", emoji: "🧘", from: "#F2F2FA", to: "#E3E6F7" },
];

export const PROGRAM_GOALS = new Set(MEMBER_GOALS.map((goal) => goal.id));

export function selectableGoalsForPathway(pathway = "womensPelvicHealth") {
  const ids = pathway === "mensPelvicHealth"
    ? ["bladderLeaks", "intimacy", "prostateRecovery", "pelvicPain", "bowelControl", "coreStrength"]
    : ["intimacy", "bladderLeaks", "postpartum", "diastasisRecti", "prolapse", "pelvicPain", "coreStrength", "fitness"];
  return ids.map((id) => memberGoalById(id, pathway));
}

export function goalById(id) {
  return GOALS.find((g) => g.id === id) || MEMBER_GOALS.find((g) => g.id === id) || GOALS.find((g) => g.id === "coreStrength");
}

export function memberGoalById(id, pathway) {
  const goal = MEMBER_GOALS.find((item) => item.id === id) || MEMBER_GOALS.find((item) => item.id === "coreStrength");
  const mensTitles = {
    bladderLeaks: "Stop Leaks and Drips", intimacy: "Erectile Dysfunction",
    prostateRecovery: "Recover After Prostate Surgery", pelvicPain: "Ease Pelvic Pain and Tension",
    bowelControl: "Improve Bowel Control", coreStrength: "Strengthen Pelvic Floor and Core",
  };
  return pathway === "mensPelvicHealth" && mensTitles[goal.id] ? { ...goal, title: mensTitles[goal.id] } : goal;
}

/**
 * Second-person phrasing, for sentences like "your path to improve intimacy".
 * The card titles are first person ("Support My Fitness") because that is what
 * makes them worth tapping, but dropping that into a sentence about *her* reads
 * as "your path to support my fitness".
 */
export function goalSentencePhrase(id, focusId) {
  // The web-only "Tighten Vaginal Canal" focus under intimacy says its own word.
  if (id === "intimacy" && focusId === "intimacy.tightening") return "vaginal rejuvenation";
  const map = {
    pregnancyPrep: "prepare for pregnancy",
    postpartum: "recover postpartum",
    coreStrength: "build core strength",
    bladderLeaks: "stop bladder leaks",
    pelvicPain: "ease pelvic pain",
    intimacy: "improve intimacy",
    fitness: "support your fitness",
    stability: "boost stability and posture",
    diastasisRecti: "heal diastasis recti",
  };
  return map[id] || "build core strength";
}

// ---------------------------------------------------------------------------
// Content loading. The JSON is large (812 KB all told) so it is fetched on
// demand and cached, never bundled into the first paint.
// ---------------------------------------------------------------------------

const programCache = new Map();
let catalogCache = null;

export async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch("/content/video_catalog.json?v=native3-catalog2");
  if (!res.ok) throw new Error("Could not load the exercise catalog.");
  const json = await res.json();
  const byId = new Map();
  for (const v of json.videos || []) byId.set(v.id, v);
  catalogCache = { version: json.version, videos: json.videos || [], byId };
  return catalogCache;
}

export async function loadProgram(goalId) {
  const key = goalId || "coreStrength";
  if (programCache.has(key)) return programCache.get(key);
  const res = await fetch(`/content/programs_${key}.json?v=native3-catalog2`);
  if (!res.ok) throw new Error(`Could not load the ${key} program.`);
  const json = await res.json();
  const program = (json.programs || [])[0] || null;
  programCache.set(key, program);
  return program;
}

/** Native ProgramContentValidator: reject incomplete or mismatched remote pairs. */
export function validateContentPair(catalog, programs) {
  if (!(catalog?.version >= 0) || !Array.isArray(catalog.videos) || !catalog.videos.length) return "Invalid catalog";
  const ids = new Set();
  for (const video of catalog.videos) {
    if (typeof video?.id !== "string" || !video.id || video.id.trim() !== video.id || ids.has(video.id)) return "Invalid or repeated video ID";
    try { const url = new URL(video.url); if (url.protocol !== "https:" || !url.hostname) return "Invalid video URL"; }
    catch { return "Invalid video URL"; }
    ids.add(video.id);
  }
  if (!(programs?.version >= 0) || !Array.isArray(programs.programs) || programs.programs.length !== PROGRAM_GOALS.size) return "Incomplete program library";
  const goals = new Set(programs.programs.map((program) => program.goal));
  if (goals.size !== PROGRAM_GOALS.size || [...PROGRAM_GOALS].some((goal) => !goals.has(goal))) return "Invalid program goals";
  for (const program of programs.programs) {
    if (!Array.isArray(program.weeks)) return "Invalid program weeks";
    if (new Set(program.weeks.map((week) => week.week)).size !== program.weeks.length) return "Repeated week";
    const days = allDays(program);
    if (days.length !== 90 || new Set(days.map((day) => day.day)).size !== 90
      || days.some((day) => !Number.isInteger(day.day) || day.day < 1 || day.day > 90)) return "Invalid program day range";
    for (const day of days) {
      if (day.week !== Math.floor((day.day - 1) / 7) + 1 || !day.videoIDs?.length
        || new Set(day.videoIDs).size !== day.videoIDs.length) return "Invalid program day";
      if (day.videoIDs.some((id) => !ids.has(id))) return "Missing program video";
    }
  }
  return null;
}

/**
 * Read the same Firestore overrides as iOS. A valid catalog/program pair is
 * applied together; an unavailable or invalid override keeps bundled content.
 * Called only by the signed-in member provider, never by the public funnel.
 */
export async function refreshNativeContent() {
  const [catalog, response] = await Promise.all([loadCatalog(), fetch("/content/programs.json?v=native3-catalog2")]);
  if (!response.ok) return null;
  const bundledPrograms = await response.json();
  let active = { catalog: { version: catalog.version, videos: catalog.videos }, programs: bundledPrograms };
  let savedAt = Date.now();
  if (validateContentPair(active.catalog, active.programs)) return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem("pelvi.validatedContentPair.v1") || "null");
    if (cached && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000
      && cached.catalog?.version >= active.catalog.version && cached.programs?.version >= active.programs.version
      && !validateContentPair(cached.catalog, cached.programs)) { active = cached; savedAt = cached.savedAt; }
  } catch { /* Bundled content remains the fallback. */ }
  try {
    const [{ db }, { doc, getDoc }] = await Promise.all([import("./firebase"), import("firebase/firestore")]);
    const documents = await Promise.allSettled([getDoc(doc(db(), "content", "catalog_v1")), getDoc(doc(db(), "content", "programs_v1"))]);
    const decode = (result) => {
      try { return result.status === "fulfilled" && result.value.exists() ? JSON.parse(result.value.data()?.json || "null") : null; }
      catch { return null; }
    };
    const remoteCatalog = decode(documents[0]);
    const remotePrograms = decode(documents[1]);
    const nextCatalog = remoteCatalog?.version > active.catalog.version ? remoteCatalog : active.catalog;
    const nextPrograms = remotePrograms?.version > active.programs.version ? remotePrograms : active.programs;
    const candidates = [
      { catalog: nextCatalog, programs: nextPrograms },
      { catalog: nextCatalog, programs: active.programs },
      { catalog: active.catalog, programs: nextPrograms },
    ];
    const next = candidates.find((pair) => !validateContentPair(pair.catalog, pair.programs)) || active;
    if (next.catalog.version > active.catalog.version || next.programs.version > active.programs.version) savedAt = Date.now();
    active = next;
  } catch { /* Offline or denied reads never replace known-good content. */ }
  try { window.localStorage.setItem("pelvi.validatedContentPair.v1", JSON.stringify({ ...active, savedAt })); }
  catch { /* The in-memory validated pair is still usable. */ }
  const byId = new Map(active.catalog.videos.map((video) => [video.id, video]));
  catalogCache = { ...active.catalog, byId };
  for (const program of active.programs.programs) programCache.set(program.goal, program);
  return { catalog: catalogCache, programs: active.programs };
}

/** Flatten the 13 weeks into a plain list of days, in order. */
export function allDays(program) {
  if (!program?.weeks) return [];
  return program.weeks.flatMap((w) =>
    (w.days || []).map((d) => ({ ...d, week: w.week, theme: w.theme, themeSubtitle: w.themeSubtitle }))
  );
}

export function totalDays(program) {
  return allDays(program).length;
}

/** A program with no days would otherwise read as "already finished". */
export function hasDays(program) {
  return totalDays(program) > 0;
}

/** Resolve a day's videoIDs into real catalog entries, dropping any miss. */
export function videosForDay(day, catalog) {
  if (!day?.videoIDs || !catalog) return [];
  return day.videoIDs.map((id) => catalog.byId.get(id)).filter(Boolean);
}

function completedDaySet(completions) {
  return new Set(
    (completions || []).map((c) => Number(c.day)).filter((n) => Number.isFinite(n))
  );
}

/** When a given day was finished, the most recent record wins. */
function completionDateFor(completions, day) {
  let latest = null;
  for (const c of completions || []) {
    if (Number(c.day) !== Number(day)) continue;
    const d = toDate(c.completedAt);
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

// ===========================================================================
// THE DAY NUMBER. One definition, one function, no second opinion.
// ===========================================================================
//
// CANONICAL VALUE: `currentDayNumber`, and nothing else.
//
// Why: a member with an iPhone and a laptop must never read two different day
// numbers for the same evening, so the phone decides and the browser follows.
// On iOS this is ProgramEngine.recomputeDerivedState:
//
//     currentDayNumber = (1...max(totalDays, 1))
//         .first { !completedDays.contains($0) } ?? program.totalDays
//
// Three properties of that line are load-bearing, and each one was wrong here
// before:
//
//   1. It is the LOWEST DAY SHE HAS NOT FINISHED, not the last one she did.
//      The calendar never moves it; finishing a day does. So the evening she
//      finishes day 21 the phone is already on day 22, and every surface on the
//      phone says 22 that night: the ring, the card title, the pathway header
//      and "Day 22 opens tomorrow."
//   2. It NEVER EXCEEDS `totalDays`. The `?? program.totalDays` fallback means
//      a member who has finished all 90 sits at 90, not 91. The web used to
//      return 91, which is how a graduate ended up being offered, and banking,
//      a "day 91" that does not exist in any program file.
//   3. It is capped at `totalDays`, so `currentDayNumber > totalDays` can never
//      be the graduation test. Graduation is a COUNT: iOS uses
//      `completedDays.count >= totalDays`, and so does `graduated` below.
//
// THE SECOND CONCEPT, named so it can never be mistaken for the first:
// `replayDayNumber` is a day she has ALREADY FINISHED that the ring is offering
// again, and it is `null` unless that is genuinely what is on offer. It exists
// because the browser keeps something pressable in two moments where the phone
// does not need to (the phone's ring opens the full-screen pathway instead):
// between finishing a day and midnight, and after graduating. Any surface that
// prints it must say the word "Replay". Any surface printing her POSITION in
// the plan prints `currentDayNumber`.
//
// `sessionDayNumber` is only "which day's videos to load" (`replayDayNumber ??
// currentDayNumber`). It is a content lookup, never a label.

/**
 * Everything the phone's engine derives from `program` + `completedDays`, in
 * one place, so no screen has to work any of it out for itself. Mirrors
 * ProgramEngine.recomputeDerivedState plus `isCurrentDayUnlocked`,
 * `highestUnlockedDay`, `isGraduated` and `daysCompletedCount`.
 *
 * @param {object|null} program     the loaded program, or null before it lands
 * @param {Array}       completions her day-completion records
 * @param {Date}        now         injectable so the midnight rule is testable
 */
export function programState(program, completions, now = new Date()) {
  const total = totalDays(program);
  const validCompletions = (completions || []).filter((record) =>
    total > 0 && (!record.programID || !program?.goal || record.programID === program.goal)
    && Number.isInteger(Number(record.day)) && Number(record.day) >= 1
    && Number(record.day) <= total);
  const done = completedDaySet(validCompletions);

  // Count only days the plan actually contains. iOS cannot produce an
  // out-of-range record (completeDay is only ever called with the capped
  // current day), but the web shipped a bug that banked day 91 and up, and
  // those records must not push a graduate to "91 of 90 days complete".
  let completedDayCount = 0;
  if (total > 0) {
    for (let d = 1; d <= total; d += 1) if (done.has(d)) completedDayCount += 1;
  } else {
    completedDayCount = done.size;
  }

  // The lowest unfinished day, capped at the length of the plan.
  let lowestUnfinished = 1;
  while (done.has(lowestUnfinished)) lowestUnfinished += 1;
  const current = total > 0 ? Math.min(lowestUnfinished, total) : lowestUnfinished;

  // Graduation is a count, exactly as on iOS. `hasDays` guards a program that
  // decoded with no weeks: "0 of 0 days done" would otherwise tell a member on
  // day 1 that she had finished all 90.
  const graduated = total > 0 && completedDayCount >= total;

  // The midnight rule (ProgramEngine.isCurrentDayUnlocked): the day she is on
  // is playable unless the day before it was finished today. One program day
  // per calendar day, which is what stops someone bingeing 90 days in an
  // afternoon and calling it a program.
  let currentDayUnlocked = true;
  if (current > 1) {
    if (done.has(current - 1)) {
      // Catch-up path: an incomplete previous day means this IS the previous day.
      const finishedAt = completionDateFor(validCompletions, current - 1);
      currentDayUnlocked = finishedAt ? !isSameCalendarDay(finishedAt, now) : true;
    }
  }

  // A graduate has no next day left to unlock, so the ring is always a replay
  // for her. `currentDayUnlocked` is deliberately NOT forced false here: the
  // pathway reads it, and forcing it would re-lock her own day 90 row. On the
  // phone a graduate is always unlocked anyway, because day 89 cannot have been
  // finished today if day 90 is already done.
  const replayDayNumber = graduated
    ? total // her last day, offered again under the daily-mix label
    : currentDayUnlocked
      ? null
      : current - 1; // the day she finished today, held until midnight

  return {
    totalDays: total,
    completedDayCount,

    /** CANONICAL. The day she is on. Every "Day N of 90" on screen is this. */
    currentDayNumber: current,

    /** Whether the day she is on can be played right now. */
    currentDayUnlocked,

    /** Highest day the pathway renders as tappable (ProgramEngine.highestUnlockedDay). */
    highestUnlockedDay: currentDayUnlocked ? current : Math.max(1, current - 1),

    graduated,

    /** A FINISHED day the ring is offering again, or null. Label it "Replay". */
    replayDayNumber,

    /** Which day's videos to load. A content lookup, never a label. */
    sessionDayNumber: replayDayNumber ?? current,

    /**
     * The day a finished session is allowed to bank, or null. Null on every
     * replay and for every graduate, which is the web's port of the
     * `guard !completedDays.contains(day)` at the top of iOS `completeDay`.
     */
    bankableDayNumber: replayDayNumber == null && !graduated ? current : null,
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameCalendarDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "yyyy-MM-dd" in the member's own calendar, the key iOS uses for a day. */
export function dateKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Native ProgramCopyPersonalizer; the authored movement sequence stays intact.
const MENS_WEEK_COPY = {
  "1": [
    "Erection and Control Foundation",
    "Learn release, blood-flow support, timing, and control in the right order."
  ],
  "2": [
    "Find the Right Muscles",
    "Build a clear lift and a complete release without gripping all day."
  ],
  "3": [
    "Build Erection Support",
    "Add early strength and coordination that support erectile function."
  ],
  "4": [
    "Release Pelvic Tension",
    "Free the hips and pelvic floor so tension does not work against control."
  ],
  "5": [
    "Timing and Control",
    "Link breath, pelvic support, and release into one repeatable pattern."
  ],
  "6": [
    "Strength for Better Erections",
    "Build the pelvic-floor and deep-core strength behind erection support."
  ],
  "7": [
    "Last Longer Without Gripping",
    "Train stamina while keeping the pelvic floor responsive instead of clenched."
  ],
  "8": [
    "Sexual Confidence",
    "Use stronger holds and cleaner release without constantly checking performance."
  ],
  "9": [
    "Deep Pelvic Control",
    "Build precise control over when the pelvic floor lifts and when it lets go."
  ],
  "10": [
    "Control During Sex",
    "Make breath, release, timing, and support easier to use when they matter."
  ],
  "11": [
    "Strength That Lasts",
    "Build repeatable stamina for erections, ejaculation control, and confidence."
  ],
  "12": [
    "Master Release and Control",
    "Use a full release as deliberately as a contraction."
  ],
  "13": [
    "Erection and Control Mastery",
    "Bring strength, release, timing, and confidence together."
  ]
};
const MENS_FIRST_WEEK_TITLES = {
  "1": "Find the Muscles Without Gripping",
  "2": "Breathe for Better Blood Flow",
  "3": "Lift and Release With Control",
  "4": "Release Pelvic Tension",
  "5": "Train What Matters Most",
  "6": "Prepare for Better Erections and Control",
  "7": "Check Your Erection and Control Progress"
};
const MENS_TITLE_REPLACEMENTS = {
  "Blood Flow Basics": "Blood Flow and Pelvic Support",
  "Deep Release Night": "Release Pelvic Tension",
  "Inner Power Hour": "Build Erection Support",
  "Breath & Wave": "Breathe, Lift, and Release",
  "The Position Project": "Move With Better Control",
  "The Foundation of Feeling": "Erection Support Foundation",
  "Glow Flow": "Blood Flow Practice",
  "The Intensity Builder": "Build Stronger Erection Support",
  "The Slow Pulse": "Slow Control Practice",
  "Open Hips, Open Options": "Open Hips, Better Control",
  "Stay & Play": "Build Lasting Control",
  "Soft Power Flow": "Control Without Gripping",
  "Melt the Guard": "Release the Guarding",
  "Strong & Sensitive": "Strong and Responsive",
  "Rhythm Studies": "Timing Practice",
  "Deep Openers": "Release for Better Control",
  "The Slow Strong": "Slow Strength and Control",
  "Circulation Ritual": "Erection Support and Blood Flow",
  "Hips Unlocked": "Release for Easier Control",
  "Power Under Pleasure": "Power Behind Better Erections",
  "Contract, Release, Repeat": "Lift, Release, Repeat",
  "Flexible Freedom": "Move Without Pelvic Gripping",
  "Lasting Power": "Last Longer With Control",
  "Wake Up Sensation": "Wake Up Pelvic Control",
  "Tone for Sensation": "Train Erection Support",
  "Wave Training": "Ejaculation Control Practice",
  "Wide Horizons": "Open Hips, Responsive Pelvic Floor",
  "Stamina, Softly": "Stamina Without Gripping",
  "The Morning Bloom": "Morning Blood Flow Practice",
  "Room to Feel": "Room to Release",
  "The Deep Lift": "Deep Erection Support",
  "In Sync": "Breath and Pelvic Control in Sync",
  "Range of Motion, Range of Joy": "Range of Motion, Better Control"
};
const MENS_SPECIAL_INTENTIONS = {
  "5": "Coach Mia™ adjusts today’s session to what matters most to you: erection support, lasting longer, pelvic tension, or sexual confidence. Stronger work is added only after you can lift and fully release without gripping.",
  "7": "Repeat the movements that made your lift, release, and breathing feel clearest. Your check-in helps Coach Mia™ keep the next phase focused on erection support, ejaculation control, tension, or confidence.",
  "90": "Ninety days of showing up for your body. You have trained the strength, release, timing, and stamina that support better erections and ejaculation control. Use this final session to notice what changed and carry that control forward."
};
const MENS_INTENTION_REPLACEMENTS = [
  [
    "clearer sensation during intimacy",
    "better erection support and control during sex"
  ],
  [
    "more sensation without forcing",
    "better blood-flow support without forcing"
  ],
  [
    "comfortable options during intimacy",
    "easier movement and less pelvic gripping during sex"
  ],
  [
    "comfortable, present, and aware of sensation",
    "released, in control, and ready to respond"
  ],
  [
    "parts of your body built for pleasure",
    "pelvic muscles involved in erection support and ejaculation control"
  ],
  [
    "A stronger pelvic floor means more feeling",
    "A responsive pelvic floor can support better erections and control"
  ],
  [
    "muscular power behind more intense climaxes",
    "muscular support behind better erections and ejaculation control"
  ],
  [
    "strength in the exact muscles of pleasure",
    "strength in the muscles that support erections and control"
  ],
  [
    "Comfort first, because pleasure follows comfort",
    "Release first, because control works better without gripping"
  ],
  [
    "leaving you soft, present, and tingling",
    "supporting blood flow and easier pelvic control"
  ],
  [
    "turns up the volume on sensation",
    "supports erection quality and ejaculation control"
  ],
  [
    "raw material of sensation",
    "useful support for erectile function"
  ],
  [
    "movement today reconnects you to",
    "movement today improves awareness of"
  ],
  [
    "That rhythm is intimacy itself",
    "That rhythm is the control you use during sex"
  ],
  [
    "more energy for everything and everyone you love",
    "more stamina without gripping or tiring early"
  ],
  [
    "movement never costs you comfort",
    "movement does not add pelvic tension"
  ],
  [
    "so your body can amplify what it feels",
    "to support erections and ejaculation control"
  ],
  [
    "strength, softness, and total confidence together",
    "strength, release, control, and sexual confidence together"
  ],
  [
    "more open, and more in command of sensation",
    "more responsive, and more in command of pelvic control"
  ]
];

export function personalizeProgram(program, pathway) {
  if (!program || pathway !== "mensPelvicHealth" || program.goal !== "intimacy") return program;
  return {
    ...program,
    title: "The 90-Day Erection and Control Plan",
    subtitle: "Build better erection support, ejaculation control, and sexual confidence one day at a time.",
    weeks: program.weeks.map((week) => ({
      ...week,
      theme: MENS_WEEK_COPY[week.week]?.[0] || week.theme,
      themeSubtitle: MENS_WEEK_COPY[week.week]?.[1] || week.themeSubtitle,
      days: week.days.map((day) => ({
        ...day,
        title: MENS_FIRST_WEEK_TITLES[day.day] || MENS_TITLE_REPLACEMENTS[day.title] || day.title,
        intention: MENS_SPECIAL_INTENTIONS[day.day] || MENS_INTENTION_REPLACEMENTS.reduce((text, [from, to]) => text.replaceAll(from, to), day.intention),
      })),
    })),
  };
}
