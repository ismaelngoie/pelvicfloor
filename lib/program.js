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
export const GOALS = [
  { id: "pregnancyPrep",  title: "Prepare for Pregnancy", emoji: "🤰", from: "#F7F2FF", to: "#EBE0FC" },
  { id: "postpartum",     title: "Recover Postpartum",    emoji: "👩‍⚕️", from: "#F2FAF2", to: "#E0F2E3" },
  { id: "coreStrength",   title: "Build Core Strength",   emoji: "🏋️", from: "#F2F2FA", to: "#E3E6F7" },
  { id: "bladderLeaks",   title: "Stop Bladder Leaks",    emoji: "🚽", from: "#EDF5FF", to: "#D9EDFC" },
  { id: "pelvicPain",     title: "Ease Pelvic Pain",      emoji: "💊", from: "#FFF7ED", to: "#FCEBD9" },
  { id: "intimacy",       title: "Improve Intimacy",      emoji: "❤️", from: "#FFF0F5", to: "#FCE0ED" },
  { id: "fitness",        title: "Support My Fitness",    emoji: "🧘", from: "#F2F2FA", to: "#E3E6F7" },
  { id: "diastasisRecti", title: "Heal Diastasis Recti",  emoji: "🧘‍♀️", from: "#F0F7FA", to: "#DEF0F5" },
];

export function goalById(id) {
  return GOALS.find((g) => g.id === id) || GOALS.find((g) => g.id === "coreStrength");
}

/**
 * Second-person phrasing, for sentences like "your path to improve intimacy".
 * The card titles are first person ("Support My Fitness") because that is what
 * makes them worth tapping, but dropping that into a sentence about *her* reads
 * as "your path to support my fitness".
 */
export function goalSentencePhrase(id) {
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
  const res = await fetch("/content/video_catalog.json");
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
  const res = await fetch(`/content/programs_${key}.json`);
  if (!res.ok) throw new Error(`Could not load the ${key} program.`);
  const json = await res.json();
  const program = (json.programs || [])[0] || null;
  programCache.set(key, program);
  return program;
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
  const done = completedDaySet(completions);

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
      const finishedAt = completionDateFor(completions, current - 1);
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
