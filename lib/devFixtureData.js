"use client";

// The fixture data itself. Never imported statically: lib/devFixtures.js pulls
// it in with a dynamic import from inside a branch that is provably false in a
// production build, so webpack drops the import and never emits this chunk.
//
// Read lib/devFixtures.js first. Nothing here ever writes.

const DAY = 86400000;

function daysAgo(n) {
  return new Date(Date.now() - n * DAY);
}

/** A signed-in user object with only the fields the two providers read. */
export const fixtureUser = {
  uid: "fixture-uid",
  email: "ismael@ngoie.com",
  displayName: "Ismael Ngoie",
  getIdToken: async () => "fixture-token",
};

/** The member record the five tabs render from. */
export const fixtureMember = {
  id: "fixture-member",
  name: "Amara Ngoie",
  email: "amara@example.com",
  goal: "bladderLeaks",
  goalTitle: "Stop Bladder Leaks",
  platform: "ios",
  programDay: 23,
  programStartedAt: daysAgo(26).toISOString(),
  joinDate: daysAgo(31).toISOString(),
  streak: 6,
  bestStreak: 11,
  age: 34,
  heightInches: 65,
  weightLbs: 148,
  savedExerciseIDs: [],
  savedArticleIDs: [],
  isLinkedToApp: true,
};

/** 22 completed days, most of them in an unbroken recent run. */
export function fixtureCompletions() {
  const out = [];
  // A six day current streak, then a gap, then a longer earlier run. This shape
  // exercises both the streak card and the sessions-per-week chart.
  const offsets = [
    0, 1, 2, 3, 4, 5,
    8, 9, 10, 11, 12,
    15, 16, 17, 18, 19, 20,
    23, 24, 25, 26,
  ];
  offsets.forEach((offset, i) => {
    out.push({
      id: `completion-${i}`,
      programID: "bladderLeaks",
      day: offsets.length - i,
      secondsWatched: 280 + (i % 5) * 30,
      completedAt: daysAgo(offset),
    });
  });
  return out;
}

/**
 * Workout events, keyed to real catalog ids so the "Jump back in" shelf and the
 * watched ticks have something to resolve against. Ids that are not in the
 * catalog are simply dropped by resolveIds, so a stale id here is harmless.
 */
export function fixtureEvents(catalog) {
  const ids = catalog?.videos?.slice(0, 24).map((v) => v.id) || [];
  return ids.map((id, i) => ({
    id: `event-${i}`,
    videoID: id,
    secondsWatched: 45 + (i % 7) * 12,
    completed: i % 4 !== 3,
    date: daysAgo(Math.floor(i / 3)),
  }));
}

/* -------------------------------------------------------------------------
   /admin
   ------------------------------------------------------------------------- */

const FIRST_NAMES = [
  "Amara", "Priya", "Chloe", "Nadia", "Rosa", "Ingrid", "Mei", "Fatima",
  "Elena", "Aisha", "Bea", "Sofia", "Hana", "Leila", "Zara", "Noor",
  "Clara", "Yara", "Tessa", "Maya", "Iris", "Ada", "Nia", "Ruth",
];
const LAST_NAMES = [
  "Okafor", "Sharma", "Bennett", "Haddad", "Alvarez", "Lindqvist", "Chen",
  "Rahman", "Petrova", "Diallo", "Moreau", "Rossi", "Sato", "Karim",
];
const GOAL_IDS = [
  "bladderLeaks", "postpartum", "coreStrength", "intimacy", "pelvicPain",
  "pregnancyPrep", "diastasisRecti", "fitness", "stability",
];

/**
 * A believable member list. Deterministic, so two screenshots of the same
 * width are comparable: the pseudo-random generator is seeded, not Math.random.
 */
export function fixtureMembers(count = 148) {
  let seed = 20260809;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const joinedDaysAgo = Math.floor(random() * 150);
    const seenDaysAgo = Math.floor(random() * Math.min(joinedDaysAgo + 1, 40));
    const started = random() > 0.22;
    rows.push({
      id: `fixture-${i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      goal: GOAL_IDS[Math.floor(random() * GOAL_IDS.length)],
      platform: "ios",
      programDay: started ? 1 + Math.floor(random() * 90) : null,
      programStartedAt: started ? daysAgo(joinedDaysAgo - 1).toISOString() : null,
      joinDate: daysAgo(joinedDaysAgo).toISOString(),
      lastActiveAt: daysAgo(seenDaysAgo).toISOString(),
      streak: Math.floor(random() * 14),
      bestStreak: Math.floor(random() * 30),
      age: 24 + Math.floor(random() * 30),
    });
  }
  return rows;
}

// Apple Ads report shaped exactly like functions/api/app-analytics.js returns it.
export function fixtureAppleReport(range) {
  return {
    source: "fixture", currency: "USD", range,
    app: { filterApplied: true },
    totals: { impressions: 18200, taps: 612, totalInstalls: 112, newDownloads: 98, redownloads: 14, spend: 1274.4, currency: "USD" },
    campaigns: [
      { id: "1", name: "US | Competitor | Exact", status: "ENABLED", impressions: 9100, taps: 340, installs: 68, newDownloads: 60, redownloads: 8, spend: 702.1, currency: "USD" },
      { id: "2", name: "US | Category | Exact", status: "ENABLED", impressions: 6200, taps: 190, installs: 31, newDownloads: 27, redownloads: 4, spend: 401.3, currency: "USD" },
      { id: "3", name: "US | Discovery | Search Match", status: "ENABLED", impressions: 2900, taps: 82, installs: 13, newDownloads: 11, redownloads: 2, spend: 171, currency: "USD" },
    ],
  };
}

// Remote program content shaped like content/catalog_v1 and content/programs_v1.
export function fixtureProgramContent() {
  const names = ["Seated Diaphragmatic Breathing", "Supine Abdominal Bracing", "Pelvic Tilts", "Prone Glute Squeeze", "Heel Slides", "Donkey Kicks (left)", "Donkey Kicks (right)", "Bird Dog", "Dead Bug", "Glute Bridge", "Clamshell", "Side-Lying Leg Lift", "Cat Cow", "Child's Pose", "Happy Baby", "Wall Sit", "Squat to Chair", "Standing March", "Calf Raises", "Hip Hinge", "Scapula CARs", "Seated Neck Rotation", "Pigeon Pose", "Reverse Kegel Breath", "Knack Practice", "Quick Flicks", "Long Holds", "Transverse Activation", "Standing Pelvic Clock", "Farmer Carry"];
  const coaches = ["Laura", "Maya", "Elena", "Sophie"];
  const videos = names.map((title, i) => ({ id: `fixture-${i + 1}`, title, coach: coaches[i % coaches.length], url: `https://example.com/video/${i + 1}.mp4`, durationSeconds: 40 + (i % 6) * 25, tags: ["core", "pelvic floor", i % 2 ? "gentle" : "strength"] }));
  const goals = ["pregnancyPrep", "postpartum", "coreStrength", "bladderLeaks", "pelvicPain", "intimacy", "fitness", "stability", "diastasisRecti"];
  const programs = goals.map((goal, g) => ({
    goal, title: `The 90-Day ${goal} plan`, subtitle: "Fixture",
    weeks: Array.from({ length: 13 }, (_, w) => ({ week: w + 1, theme: `Week ${w + 1}`, themeSubtitle: "", days: Array.from({ length: 7 }, (_, d) => {
      const day = w * 7 + d + 1;
      if (day > 90) return null;
      const n = 4 + ((day + g) % 3);
      return { day, title: `Day ${day}: ${names[(day + g) % names.length]}`, intention: "Connect breath, deep core and pelvic movement before loading.", icon: "sparkles", videoIDs: Array.from({ length: n }, (_, k) => `fixture-${((day * 3 + k * 7 + g) % names.length) + 1}`) };
    }).filter(Boolean) })),
  }));
  return { catalog: { version: 3, videos }, programs: { version: 7, programs } };
}
