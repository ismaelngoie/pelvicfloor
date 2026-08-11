// Everything the admin dashboard counts, and nothing that talks to a network.
//
// Firestore cannot add things up for us at this shape of data, so /admin reads
// the whole users collection once and does the arithmetic here. Keeping it in a
// plain module means the numbers are the same every render, and they can be
// checked without a browser.
//
// Three rules this file follows everywhere:
//
//   1. A missing value is never guessed. It comes back as null and the screen
//      says, in words, why there is no number.
//   2. Nothing here ever returns NaN, "undefined" or "Invalid Date". Every
//      formatter has a fallback that a person can read.
//   3. Money and subscriber counts say where they came from and, just as
//      importantly, where they did not. This dashboard cannot see Stripe. It
//      counts the members it can see and says so, rather than printing a
//      confident total it has no way to know.

import { GOALS } from "./program";
import { DEFAULT_PRICE_AMOUNT } from "./pricing";

/**
 * The price the app charges, per year, as a number. Source: lib/pricing.js, the
 * same constant the paywall renders, so this can never drift from what she is
 * actually charged. The plan is a single annual charge, so a visible paying
 * member is worth this much a year, not a month: the tiles and the chart that
 * multiply by it are labelled as annual (ARR), never as MRR.
 */
export const ANNUAL_PRICE_USD = Number(DEFAULT_PRICE_AMOUNT);

/** How long a member counts as "active" without opening the app again. */
export const ACTIVE_WINDOW_DAYS = 7;

/** The program is 90 days long, on every goal. */
export const PROGRAM_LENGTH_DAYS = 90;

// ---------------------------------------------------------------------------
// Dates. Firestore hands back Timestamps, iOS wrote some fields as ISO strings,
// and the web writes Date objects. All three land here.
// ---------------------------------------------------------------------------

export function toDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      try {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    if (Number.isFinite(value.seconds)) {
      if (value.seconds <= 0) return null;
      const d = new Date(value.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // A zero or negative epoch is not a date somebody joined on, it is a field
    // that was never filled in. Reading it as 1 January 1970 puts a member on
    // the charts fifty years before the company existed, so treat it as no
    // date at all and let the screen say so.
    if (value <= 0) return null;
    // Firestore never stores millisecond numbers, but a hand-written record
    // might. Anything before 2001 is far more likely to be seconds.
    const ms = value < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function startOfDay(d) {
  const out = new Date(d.getTime());
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfWeek(d) {
  const out = startOfDay(d);
  // Weeks run Monday to Sunday, which is how people talk about "this week".
  const shift = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

export function startOfMonth(d) {
  const out = startOfDay(d);
  out.setDate(1);
  return out;
}

export function addDays(d, n) {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

export function daysBetween(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / 86400000);
}

// ---------------------------------------------------------------------------
// Formatters. Every one of these is safe to call with rubbish.
// ---------------------------------------------------------------------------

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatCount(n, fallback = "0") {
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n).toLocaleString("en-US");
}

/** 1284 -> "1,284" · 12900 -> "12.9K" · 4200000 -> "4.2M". For tiles. */
export function formatCompact(n, fallback = "0") {
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${trimZero(n / 1e6)}M`;
  if (abs >= 10000) return `${trimZero(n / 1000)}K`;
  return Math.round(n).toLocaleString("en-US");
}

function trimZero(n) {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function formatMoney(n, fallback = "$0") {
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${trimZero(n / 1e6)}M`;
  if (abs >= 10000) return `$${trimZero(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatMoneyExact(n, fallback = "$0.00") {
  if (!Number.isFinite(n)) return fallback;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatOneDecimal(n, fallback = "Not enough data") {
  if (!Number.isFinite(n)) return fallback;
  return (Math.round(n * 10) / 10).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatDate(value, fallback = "No date on record") {
  const d = toDate(value);
  if (!d) return fallback;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateTime(value, fallback = "No date on record") {
  const d = toDate(value);
  if (!d) return fallback;
  let hours = d.getHours();
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${hours}:${minutes}${suffix}`;
}

/** "Today" · "Yesterday" · "4 days ago" · "Mar 2, 2026". Never "Invalid Date". */
export function formatRelativeDay(value, now = new Date(), fallback = "Never") {
  const d = toDate(value);
  if (!d) return fallback;
  const diff = daysBetween(d, now);
  if (diff < 0) return formatDate(d);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff} days ago`;
  return formatDate(d);
}

export function formatPercent(part, whole, fallback = "Not enough data") {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return fallback;
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 1) return "under 1%";
  return `${Math.round(pct)}%`;
}

// ---------------------------------------------------------------------------
// One member, cleaned up.
// ---------------------------------------------------------------------------

const KNOWN_ENTITLEMENTS = ["active", "trial", "retrying", "free", "expired"];

/**
 * What the dashboard can honestly say about one member's subscription.
 *
 * There are exactly two signals a browser can read here, and neither of them
 * is Stripe:
 *
 *   1. `entitlementOverride`, the word somebody chose in /admin. It is the only
 *      subscription field this dashboard writes, and it wins over everything.
 *   2. An iPhone record whose program clock has started. The app only starts
 *      the 90 days on the screen that appears after a successful App Store
 *      purchase, so a `programStartedAt` on an iOS record means she bought.
 *
 * Everybody else comes back as "unknown", and that is a real answer rather
 * than a missing one. Stripe is asked about one member at a time, at sign-in,
 * by /api/entitlement, and there is no way to ask it about somebody else from
 * this page.
 *
 * The old `entitlement` object is deliberately NOT read. It was written by the
 * Stripe webhook, which has been retired, so any record still carrying one is
 * carrying a snapshot of how that subscription looked on the day the webhook
 * last ran. Believing it would print a member who cancelled months ago as
 * "Paying" for ever, and quietly add her to the revenue estimate. A stale
 * number that looks certain is worse here than an honest "not known".
 */
export function entitlementOf(raw) {
  const override = entitlementWord(raw?.entitlementOverride);
  if (override) return override;
  if (hasIosPurchaseSignal(raw)) return "ios";
  return "unknown";
}

/**
 * Where the answer above came from: "override", "ios", or "none".
 *
 * The tiles need this to say which part of the number they can stand behind.
 */
export function entitlementSourceOf(raw) {
  if (entitlementWord(raw?.entitlementOverride)) return "override";
  if (hasIosPurchaseSignal(raw)) return "ios";
  return "none";
}

/**
 * An iPhone record that has started the program, which only happens after a
 * purchase. Kept in step with lib/memberEntitlement.js, which lets exactly
 * these members into the app.
 *
 * The date is parsed rather than just checked for truthiness, so a field left
 * at 0 or at an empty string does not read as a sale.
 */
function hasIosPurchaseSignal(raw) {
  const platform = typeof raw?.platform === "string" ? raw.platform.trim().toLowerCase() : "";
  if (platform !== "ios") return false;
  return toDate(raw?.programStartedAt) !== null;
}

/**
 * Every spelling a human might have left in `entitlementOverride`, mapped onto
 * the states below. The dropdown in /admin only ever writes four of them, but
 * older records were edited by hand and a support tool may have written a
 * Stripe word, so those are accepted rather than thrown away.
 */
function entitlementWord(value) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!v) return "";
  if (KNOWN_ENTITLEMENTS.includes(v)) return v;
  if (v === "paid" || v === "paying" || v === "premium") return "active";
  if (v === "trialing") return "trial";
  // past_due is a card that was still being retried. Calling her "Lapsed"
  // described a member who was using the product every day as somebody who had
  // left, and dropped her out of the paying count and the revenue estimate at
  // the same time. She gets her own state instead of being rounded to a lie in
  // either direction.
  if (v === "past_due") return "retrying";
  if (
    v === "cancelled" || v === "canceled" || v === "lapsed" ||
    v === "unpaid" || v === "incomplete_expired"
  ) return "expired";
  return "";
}

export const ENTITLEMENT_LABELS = {
  active: "Paying",
  trial: "On a trial",
  retrying: "Card retrying",
  free: "Not paying",
  expired: "Lapsed",
  ios: "Bought on the iPhone",
  unknown: "Not known here",
};

/** One line explaining where each state came from, for anyone who asks. */
export const ENTITLEMENT_SOURCE_NOTES = {
  active: "You set this by hand.",
  trial: "You set this by hand.",
  retrying: "You set this by hand.",
  free: "You set this by hand.",
  expired: "You set this by hand.",
  ios: "She started the program on an iPhone, which only happens after an App Store purchase.",
  unknown: "This dashboard cannot see Stripe, so it does not know. Look her up in the Stripe dashboard.",
};

export const ENTITLEMENT_OPTIONS = [
  { value: "active", label: "Paying", hint: "Counts toward paying members and toward the revenue this dashboard can see." },
  { value: "trial", label: "On a trial", hint: "Counts toward paying members, not toward revenue." },
  { value: "free", label: "Not paying", hint: "Has an account but no subscription." },
  { value: "expired", label: "Lapsed", hint: "Was paying and has stopped." },
];

export function isPayingEntitlement(value) {
  // "retrying" counts. She still has access, the card was still being
  // collected, and treating her as gone understates both the paying count and
  // the revenue estimate.
  return value === "active" || value === "trial" || value === "retrying" || value === "ios";
}

/**
 * Who this dashboard can see money coming from.
 *
 * Deliberately NARROWER than isPayingEntitlement. A member on a trial has paid
 * nothing yet, and the dropdown in the member panel says so in as many words
 * ("Counts toward paying members, not toward revenue"). Multiplying her by
 * $24.99 anyway overstated the revenue tile and the revenue chart by the whole
 * trial cohort, which on this dashboard is the one number nobody can afford to
 * have flattering.
 *
 * Note what this can NOT see: every web member who paid through Stripe and was
 * never marked by hand. The tiles and the chart say so.
 */
export function isBilledEntitlement(value) {
  return value === "active" || value === "retrying" || value === "ios";
}

const GOAL_TITLE_BY_ID = (() => {
  const map = new Map(GOALS.map((g) => [g.id, g.title]));
  // Kept off the goal grid, but legacy members can still be on it.
  map.set("stability", "Boost Stability & Posture");
  return map;
})();

export function goalTitleFor(goalId, fallbackTitle) {
  if (goalId && GOAL_TITLE_BY_ID.has(goalId)) return GOAL_TITLE_BY_ID.get(goalId);
  if (typeof fallbackTitle === "string" && fallbackTitle.trim()) return fallbackTitle.trim();
  return "No goal set";
}

/** Every goal the admin can move a member onto, newest grid first. */
export const ASSIGNABLE_GOALS = GOALS.map((g) => ({ id: g.id, title: g.title }));

function cleanInt(value, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/**
 * Turn one raw Firestore document into the shape every screen reads.
 * Nothing downstream should ever touch a raw field again.
 */
export function normalizeMember(raw) {
  const id = raw?.id || "";
  const goalId = cleanString(raw?.goal);
  const lastActive = toDate(raw?.lastActiveAt);
  const lastWeb = toDate(raw?.lastWebActiveAt);
  const lastSeenAt =
    lastActive && lastWeb ? (lastActive > lastWeb ? lastActive : lastWeb) : lastActive || lastWeb;

  return {
    id,
    name: cleanString(raw?.name),
    email: cleanString(raw?.email).toLowerCase(),
    goalId,
    goalTitle: goalTitleFor(goalId, raw?.goalTitle),
    programDay: cleanInt(raw?.programDay, { min: 1, max: 400 }),
    programStartedAt: toDate(raw?.programStartedAt),
    streak: cleanInt(raw?.streak, { min: 0, max: 5000 }) ?? 0,
    bestStreak: cleanInt(raw?.bestStreak, { min: 0, max: 5000 }) ?? 0,
    joinedAt: toDate(raw?.joinDate),
    lastSeenAt,
    age: cleanInt(raw?.age, { min: 1, max: 120 }),
    weightLbs: cleanInt(raw?.weightLbs, { min: 30, max: 900 }),
    heightInches: cleanInt(raw?.heightInches, { min: 20, max: 100 }),
    platform: cleanString(raw?.platform) || "unknown",
    appVersion: cleanString(raw?.appVersion),
    entitlement: entitlementOf(raw),
    // Where that answer came from, so every screen can say whether it is a
    // decision a person made or a signal from the phone.
    entitlementSource: entitlementSourceOf(raw),
    // The override on its own, so the panel can show what a human decided
    // separately from the iPhone signal, and can clear it again without having
    // to work out which of the two produced the answer above.
    entitlementOverride: entitlementWord(raw?.entitlementOverride),
    entitlementUpdatedAt: toDate(raw?.entitlementUpdatedAt),
    raw,
  };
}

export function displayName(member) {
  if (member?.name) return member.name;
  if (member?.email) return member.email;
  return "No name yet";
}

/** A short, stable label for a member row, used in search and in the panel. */
export function memberInitials(member) {
  const source = member?.name || member?.email || "";
  const parts = source.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// The overview numbers.
// ---------------------------------------------------------------------------

/**
 * Everything the tiles show, plus the honesty flags they need.
 *
 * The subscription numbers here are all FLOORS, never totals. They count the
 * members this dashboard can see a subscription for, which is the ones marked
 * by hand in /admin plus the ones who bought on the iPhone. Anybody who paid
 * through Stripe on the website and was never marked by hand is in
 * `unknownSubscription`, not in `paying`.
 *
 * `hasSubscriptionData` is false when the dashboard can see nothing at all. In
 * that case the paying and revenue tiles say why instead of showing a zero that
 * looks like a fact.
 */
export function computeOverview(members, now = new Date()) {
  const total = members.length;
  const weekAgo = addDays(startOfDay(now), -ACTIVE_WINDOW_DAYS + 1);

  let newThisWeek = 0;
  let activeThisWeek = 0;
  let paying = 0;
  let billed = 0;
  let knownSubscription = 0;
  let payingFromPhone = 0;
  let payingByHand = 0;
  let dayTotal = 0;
  let dayCount = 0;
  let finished = 0;
  let withGoal = 0;

  for (const m of members) {
    if (m.joinedAt && m.joinedAt >= weekAgo) newThisWeek += 1;
    if (m.lastSeenAt && m.lastSeenAt >= weekAgo) activeThisWeek += 1;
    if (m.entitlement !== "unknown") knownSubscription += 1;
    if (isPayingEntitlement(m.entitlement)) {
      paying += 1;
      if (m.entitlementSource === "ios") payingFromPhone += 1;
      else payingByHand += 1;
    }
    if (isBilledEntitlement(m.entitlement)) billed += 1;
    if (Number.isFinite(m.programDay)) {
      dayTotal += Math.min(m.programDay, PROGRAM_LENGTH_DAYS);
      dayCount += 1;
      if (m.programDay >= PROGRAM_LENGTH_DAYS) finished += 1;
    }
    if (m.goalId) withGoal += 1;
  }

  const hasSubscriptionData = knownSubscription > 0;

  return {
    total,
    newThisWeek,
    activeThisWeek,
    paying: hasSubscriptionData ? paying : null,
    // People inside a free trial are in `paying` and out of `billed`. The tiles
    // say which is which, so the headline count can stay generous while the
    // money number stays true.
    billed: hasSubscriptionData ? billed : null,
    onTrial: hasSubscriptionData ? paying - billed : null,
    payingFromPhone,
    payingByHand,
    hasSubscriptionData,
    knownSubscription,
    // How many members this dashboard has no subscription answer for at all.
    // Every tile that talks about money quotes this, because it is the size of
    // what the number is missing.
    unknownSubscription: total - knownSubscription,
    // Null, not zero, when nothing is visible. A confident "$0" on a business
    // that is taking money would be the worst thing this screen could say.
    annualRevenue: billed > 0 ? billed * ANNUAL_PRICE_USD : null,
    averageDay: dayCount > 0 ? dayTotal / dayCount : null,
    dayCount,
    finished: dayCount > 0 ? finished : null,
    withGoal,
  };
}

// ---------------------------------------------------------------------------
// Time buckets, shared by every chart so they always line up.
// ---------------------------------------------------------------------------

export const RANGES = [
  { id: "30d", label: "30 days", longLabel: "the last 30 days", days: 30, grain: "day" },
  { id: "90d", label: "90 days", longLabel: "the last 90 days", days: 90, grain: "week" },
  { id: "12m", label: "12 months", longLabel: "the last 12 months", days: 365, grain: "month" },
  { id: "all", label: "All time", longLabel: "the whole history", days: null, grain: "month" },
];

export function rangeById(id) {
  return RANGES.find((r) => r.id === id) || RANGES[0];
}

function floorToGrain(date, grain) {
  if (grain === "day") return startOfDay(date);
  if (grain === "week") return startOfWeek(date);
  return startOfMonth(date);
}

function nextBucketStart(date, grain) {
  if (grain === "day") return addDays(date, 1);
  if (grain === "week") return addDays(date, 7);
  const out = new Date(date.getTime());
  out.setMonth(out.getMonth() + 1);
  return out;
}

function previousBucketStart(date, grain) {
  if (grain === "day") return addDays(date, -1);
  if (grain === "week") return addDays(date, -7);
  const out = new Date(date.getTime());
  out.setMonth(out.getMonth() - 1);
  return out;
}

function bucketLabel(date, grain) {
  if (grain === "day") return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  if (grain === "week") return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return `${MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

function bucketLongLabel(date, grain) {
  if (grain === "day") {
    return `${MONTHS_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  if (grain === "week") {
    return `the week of ${MONTHS_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

const MAX_BUCKETS = 72;

/**
 * The x-axis every time chart shares.
 * Returns [] when there is genuinely nothing to plot, so callers can show an
 * empty state instead of an empty grid.
 */
export function buildBuckets(members, rangeId, now = new Date()) {
  const range = rangeById(rangeId);
  const grain = range.grain;

  let start;
  if (range.days) {
    start = floorToGrain(addDays(startOfDay(now), -(range.days - 1)), grain);
  } else {
    let earliest = null;
    for (const m of members) {
      const candidate = m.joinedAt || m.lastSeenAt;
      if (candidate && (!earliest || candidate < earliest)) earliest = candidate;
    }
    if (!earliest) return [];
    start = floorToGrain(earliest, grain);
  }

  const end = floorToGrain(now, grain);

  // More history than the cap allows has to be trimmed from the OLD end, not
  // the new one. One member record carrying a broken date is enough to trigger
  // this: a joinDate of 0 reads as January 1970, and filling the 72 buckets
  // forward from there used to plot 1970 to 1975 and leave every real member
  // off the chart. So when the range runs long, walk back from today instead.
  let span = 0;
  for (let c = start; c <= end && span <= MAX_BUCKETS; c = nextBucketStart(c, grain)) span += 1;
  if (span > MAX_BUCKETS) {
    let c = end;
    for (let i = 1; i < MAX_BUCKETS; i += 1) c = previousBucketStart(c, grain);
    start = c;
  }

  const buckets = [];
  let cursor = start;
  while (cursor <= end && buckets.length < MAX_BUCKETS) {
    const next = nextBucketStart(cursor, grain);
    buckets.push({
      key: cursor.toISOString(),
      start: cursor,
      end: next,
      label: bucketLabel(cursor, grain),
      longLabel: bucketLongLabel(cursor, grain),
    });
    cursor = next;
  }

  return buckets;
}

function countByBucket(buckets, dates) {
  const counts = new Array(buckets.length).fill(0);
  if (buckets.length === 0) return counts;
  const first = buckets[0].start;
  const last = buckets[buckets.length - 1].end;
  for (const d of dates) {
    if (!d || d < first || d >= last) continue;
    // Linear scan is fine: buckets are capped at 72 and members are read once.
    for (let i = buckets.length - 1; i >= 0; i -= 1) {
      if (d >= buckets[i].start) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}

/** How many people joined in each period. */
export function signupSeries(members, buckets) {
  return countByBucket(buckets, members.map((m) => m.joinedAt));
}

/** How many members were last seen in each period. */
export function lastSeenSeries(members, buckets) {
  return countByBucket(buckets, members.map((m) => m.lastSeenAt));
}

/**
 * Annual revenue the dashboard can see, at the end of each period.
 *
 * Every member it can see money from who had joined by then, times the annual
 * price. The plan is a single yearly charge, so this is annualised (ARR), not
 * MRR. It is a floor, not a total: web members who paid through Stripe and were
 * never marked by hand are missing from every point on the line. The chart says
 * so out loud.
 */
export function revenueSeries(members, buckets) {
  const payingJoins = members
    .filter((m) => isBilledEntitlement(m.entitlement) && m.joinedAt)
    .map((m) => m.joinedAt);
  return buckets.map((b) => {
    let count = 0;
    for (const d of payingJoins) if (d < b.end) count += 1;
    return count * ANNUAL_PRICE_USD;
  });
}

// ---------------------------------------------------------------------------
// Distributions.
// ---------------------------------------------------------------------------

export const PROGRAM_STAGES = [
  { id: "1-7", label: "Day 1 to 7", note: "The first week", min: 1, max: 7 },
  { id: "8-30", label: "Day 8 to 30", note: "Past the first week", min: 8, max: 30 },
  { id: "31-60", label: "Day 31 to 60", note: "Halfway through", min: 31, max: 60 },
  { id: "61-89", label: "Day 61 to 89", note: "The home stretch", min: 61, max: 89 },
  { id: "90", label: "Day 90, finished", note: "Reached the end", min: 90, max: Infinity },
];

/** Where members are in their 90 days, plus how many have no day recorded. */
export function programStageBreakdown(members) {
  const counts = PROGRAM_STAGES.map((stage) => ({ ...stage, value: 0 }));
  let unknown = 0;
  for (const m of members) {
    if (!Number.isFinite(m.programDay)) {
      unknown += 1;
      continue;
    }
    const stage = counts.find((s) => m.programDay >= s.min && m.programDay <= s.max);
    if (stage) stage.value += 1;
    else unknown += 1;
  }
  return { stages: counts, unknown };
}

/** Goals, most popular first, with members who never picked one at the end. */
export function goalBreakdown(members) {
  const byGoal = new Map();
  let noGoal = 0;
  for (const m of members) {
    if (!m.goalId) {
      noGoal += 1;
      continue;
    }
    const title = goalTitleFor(m.goalId, m.goalTitle);
    byGoal.set(title, (byGoal.get(title) || 0) + 1);
  }
  const rows = [...byGoal.entries()]
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (noGoal > 0) rows.push({ id: "__none", label: "No goal set", value: noGoal });
  return rows;
}

// ---------------------------------------------------------------------------
// The members table.
// ---------------------------------------------------------------------------

export const SORT_COLUMNS = [
  { id: "name", label: "Member", numeric: false },
  { id: "goalTitle", label: "Goal", numeric: false },
  { id: "programDay", label: "Day", numeric: true },
  { id: "streak", label: "Streak", numeric: true },
  { id: "lastSeenAt", label: "Last seen", numeric: true },
  { id: "joinedAt", label: "Joined", numeric: true },
  { id: "entitlement", label: "Subscription", numeric: false },
];

export function searchMembers(members, term) {
  const needle = (term || "").trim().toLowerCase();
  if (!needle) return members;
  return members.filter((m) => {
    return (
      m.name.toLowerCase().includes(needle) ||
      m.email.includes(needle) ||
      m.id.toLowerCase().includes(needle) ||
      m.goalTitle.toLowerCase().includes(needle)
    );
  });
}

const ENTITLEMENT_ORDER = {
  active: 0, ios: 1, trial: 2, retrying: 3, free: 4, expired: 5, unknown: 6,
};

export function sortMembers(members, columnId, direction) {
  const dir = direction === "asc" ? 1 : -1;
  const sorted = [...members];
  sorted.sort((a, b) => {
    let av;
    let bv;
    if (columnId === "name") {
      av = displayName(a).toLowerCase();
      bv = displayName(b).toLowerCase();
    } else if (columnId === "entitlement") {
      av = ENTITLEMENT_ORDER[a.entitlement] ?? 9;
      bv = ENTITLEMENT_ORDER[b.entitlement] ?? 9;
    } else if (columnId === "lastSeenAt" || columnId === "joinedAt") {
      av = a[columnId] ? a[columnId].getTime() : -Infinity;
      bv = b[columnId] ? b[columnId].getTime() : -Infinity;
    } else if (columnId === "programDay") {
      av = Number.isFinite(a.programDay) ? a.programDay : -Infinity;
      bv = Number.isFinite(b.programDay) ? b.programDay : -Infinity;
    } else if (columnId === "streak") {
      av = a.streak;
      bv = b.streak;
    } else {
      av = String(a[columnId] ?? "").toLowerCase();
      bv = String(b[columnId] ?? "").toLowerCase();
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return displayName(a).localeCompare(displayName(b));
  });
  return sorted;
}
