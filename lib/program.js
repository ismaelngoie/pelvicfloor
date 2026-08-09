// The 90-day program, and the rules that decide what she can do today.
//
// This is a direct port of the iOS ProgramEngine so the two never disagree
// about which day is unlocked. If you change a threshold here, change it in
// "Pelvic Floor/Core/Program/ProgramEngine.swift" too.
//
//   videoCompletionThreshold  0.8  a video counts as done at 80% watched
//   dayCompletionThreshold    0.6  a day counts as done at 60% of its videos
//   unlock rule                    the next day unlocks at midnight, never sooner

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

/**
 * Which day is she on?
 *
 * The lowest day she has not finished, exactly as
 * ProgramEngine.recomputeDerivedState computes it:
 *
 *     currentDayNumber = (1...totalDays).first { !completedDays.contains($0) }
 *
 * The calendar does not move this number. Finishing days does. Keeping it
 * identical to the phone matters because both devices print it as
 * "Day N of 90" and both write it to `programDay` on the same document.
 */
export function currentDayNumber(completions) {
  const done = completedDaySet(completions);
  let day = 1;
  while (done.has(day)) day += 1;
  return day;
}

/**
 * The midnight rule, a port of ProgramEngine.isCurrentDayUnlocked: the day she
 * is on is playable unless the day before it was finished today. One program day
 * per calendar day, which is what stops someone bingeing 90 days in an
 * afternoon and calling it a program.
 */
export function isCurrentDayUnlocked(completions) {
  const day = currentDayNumber(completions);
  if (day <= 1) return true;
  const done = completedDaySet(completions);
  // Catch-up path: an incomplete previous day means this IS the previous day.
  if (!done.has(day - 1)) return true;
  const finishedAt = completionDateFor(completions, day - 1);
  return finishedAt ? !isSameCalendarDay(finishedAt, new Date()) : true;
}

export function isDayUnlocked(day, completions) {
  const n = Number(day);
  if (!Number.isFinite(n) || n < 1) return false;
  const current = currentDayNumber(completions);
  if (n < current) return true;
  if (n > current) return false;
  return isCurrentDayUnlocked(completions);
}

export function isGraduated(program, completions) {
  if (!hasDays(program)) return false;
  return currentDayNumber(completions) > totalDays(program);
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
