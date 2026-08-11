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
  "pregnancyPrep", "diastasisRecti", "fitness",
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
    const roll = random();

    rows.push({
      id: `fixture-${i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      goal: GOAL_IDS[Math.floor(random() * GOAL_IDS.length)],
      platform: roll > 0.55 ? "ios" : "web",
      programDay: started ? 1 + Math.floor(random() * 90) : null,
      programStartedAt: started ? daysAgo(joinedDaysAgo - 1).toISOString() : null,
      joinDate: daysAgo(joinedDaysAgo).toISOString(),
      lastActiveAt: daysAgo(seenDaysAgo).toISOString(),
      streak: Math.floor(random() * 14),
      bestStreak: Math.floor(random() * 30),
      age: 24 + Math.floor(random() * 30),
      // A quarter of the list is marked by hand, which is what makes the
      // "paying members it can see" tile show a number rather than its
      // not-known-here copy.
      entitlementOverride: roll > 0.76 ? "active" : roll > 0.72 ? "trial" : null,
      entitlementUpdatedAt: roll > 0.72 ? daysAgo(Math.floor(random() * 20)).toISOString() : null,
    });
  }
  return rows;
}

/**
 * The Stripe half of the Audience tab, in the shape /api/audience answers.
 *
 * Deliberately lopsided, because the real thing is: most people who open a
 * checkout sheet do not pay, and the screen has to be readable when the
 * did-not-pay column is four times the paid one. Some rows share an address
 * with fixtureMembers() so the merge, the "Checkout and member record" source
 * and the App Store precedence rule all have something to chew on.
 */
export function fixtureStripeAudience() {
  let seed = 20260811;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const members = fixtureMembers();
  const rows = [];

  // 40 addresses that also have a member record, so the join has work to do.
  for (let i = 0; i < 40; i += 1) {
    const member = members[Math.floor(random() * members.length)];
    const roll = random();
    rows.push({
      id: `cus_fixture_m${i}`,
      email: member.email,
      name: member.name,
      createdAt: Date.now() - Math.floor(random() * 150) * DAY,
      paidState: roll > 0.45 ? "paid" : roll > 0.3 ? "lapsed" : "never",
      subscriptionStatus: roll > 0.45 ? "active" : roll > 0.3 ? "canceled" : "incomplete",
    });
  }

  // 190 who only ever reached the checkout. This is the list that did not
  // exist anywhere before this tab.
  for (let i = 0; i < 190; i += 1) {
    const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const roll = random();
    const paid = roll > 0.88;
    const lapsed = !paid && roll > 0.82;
    rows.push({
      id: `cus_fixture_c${i}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`,
      // A real Stripe customer often has no name: the checkout sheet only asks
      // for an address, so the "No name given" branch has to be exercised.
      name: roll > 0.55 ? `${first} ${last}` : "",
      createdAt: Date.now() - Math.floor(random() * 150) * DAY,
      paidState: paid ? "paid" : lapsed ? "lapsed" : "never",
      subscriptionStatus: paid ? "active" : lapsed ? "canceled" : "incomplete",
    });
  }

  return {
    fetchedAt: new Date(),
    rows,
    withoutEmail: 2,
    truncated: false,
    ceiling: 2000,
  };
}
