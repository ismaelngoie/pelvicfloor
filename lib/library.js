"use client";

// The searchable, filterable index behind the Exercises tab.
//
// A direct port of "Pelvic Floor/Core/Library/ExerciseIndex.swift" so the two
// products count, bucket and rank the same 533 clips the same way. Nothing
// here hardcodes a total, a coach or a tag: every number the UI prints is
// derived from the catalog that shipped.

import { loadCatalog } from "./program";
import { libraryFocusTags, libraryGoalPhrase } from "./goalCopy";

// --- Length ----------------------------------------------------------------
// Two buckets a real person chooses between. A clip whose duration the catalog
// does not know (381 of 533) belongs to no bucket, so it never fakes a promise.

export const LENGTHS = [
  { id: "underOneMinute", label: "Under 1 minute" },
  { id: "oneToThree", label: "1 to 3 minutes" },
];

export function lengthBucket(seconds) {
  if (!(seconds > 0)) return null;
  if (seconds < 60) return "underOneMinute";
  if (seconds <= 180) return "oneToThree";
  return null;
}

// --- Style -----------------------------------------------------------------
// How hard a clip feels, derived from its tags. Gentle work is what a woman in
// pain or six weeks postpartum needs to find in one tap.

export const STYLES = [
  { id: "gentle", label: "Gentle", caption: "Calm, slow and low effort" },
  { id: "standard", label: "Standard", caption: "Steady everyday work" },
  { id: "strong", label: "Strong", caption: "Higher effort, more sweat" },
];

const GENTLE_TAGS = new Set(["relaxation", "breathing", "stretch", "mobility"]);
const STRONG_TAGS = new Set(["strength", "cardio", "glutes"]);

export function styleForTags(tags = []) {
  let gentle = 0;
  let strong = 0;
  for (const tag of tags) {
    if (GENTLE_TAGS.has(tag)) gentle += 1;
    if (STRONG_TAGS.has(tag)) strong += 1;
  }
  if (strong > gentle) return "strong";
  if (gentle > strong) return "gentle";
  return "standard";
}

// --- Tag vocabulary --------------------------------------------------------

const TAG_LABELS = {
  strength: "Strength", glutes: "Glutes", yoga: "Yoga", core: "Core",
  postpartum: "Postpartum", cardio: "Cardio", stretch: "Stretch", form: "Form",
  pilates: "Pilates", mobility: "Mobility", relaxation: "Relax",
  balance: "Balance", posture: "Posture", breathing: "Breathing",
};

export function tagLabel(tag) {
  return TAG_LABELS[tag] || (tag ? tag[0].toUpperCase() + tag.slice(1) : "");
}

// --- Item ------------------------------------------------------------------

export function durationLabel(seconds) {
  if (!(seconds > 0)) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function coachLabel(coach) {
  if (!coach) return null;
  return coach.startsWith("Coach") ? coach : `Coach ${coach}`;
}

function spokenDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  if (s === 0) return m === 1 ? "1 minute" : `${m} minutes`;
  return `${m} minute ${s} seconds`;
}

/** One sentence a screen reader says instead of five separate labels. */
export function itemDescription(item) {
  const parts = [item.title];
  const coach = coachLabel(item.coach);
  if (coach) parts.push(`with ${coach}`);
  if (item.durationSeconds > 0) parts.push(spokenDuration(item.durationSeconds));
  if (item.tags?.[0]) parts.push(tagLabel(item.tags[0]));
  return parts.join(", ");
}

// --- Text matching ---------------------------------------------------------

function normalize(text) {
  // Strip combining marks so "Chloé" and "chloe" are the same word.
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function tokens(text) {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Prefix match in both directions, so "kegel" finds "Kegels". */
function loosePrefixMatch(needle, candidate) {
  if (candidate.startsWith(needle)) return true;
  return needle.length >= 4 && needle.startsWith(candidate) && candidate.length >= 3;
}

/** True when one typo separates the two words. Only used on the retry pass. */
function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (a.length === b.length) { i += 1; j += 1; }
    else if (a.length > b.length) { i += 1; }
    else { j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// --- Index -----------------------------------------------------------------

function facet(id, label, count) {
  return { id, label, count };
}

/**
 * Build the index once, from the catalog already in memory. Every query after
 * that is a pass over arrays, so typing stays instant on a phone.
 */
export function buildIndex(catalog) {
  const videos = catalog?.videos || [];
  const entries = [];
  const tagCounts = new Map();
  const coachCounts = new Map();
  const lengthCounts = new Map();
  const styleCounts = new Map();

  for (const video of videos) {
    const seconds = Number(video.durationSeconds) || 0;
    const tags = video.tags || [];
    const item = {
      id: video.id,
      title: video.title,
      url: video.url,
      coach: video.coach || "",
      tags,
      format: video.format,
      durationSeconds: seconds,
      length: lengthBucket(seconds),
      style: styleForTags(tags),
    };

    const other = tokens(item.coach);
    for (const tag of tags) {
      other.push(...tokens(tag), ...tokens(tagLabel(tag)));
    }
    other.push(item.style);

    entries.push({
      item,
      titleTokens: tokens(item.title),
      otherTokens: other,
      normalizedTitle: normalize(item.title),
    });

    for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    if (item.coach) coachCounts.set(item.coach, (coachCounts.get(item.coach) || 0) + 1);
    if (item.length) lengthCounts.set(item.length, (lengthCounts.get(item.length) || 0) + 1);
    styleCounts.set(item.style, (styleCounts.get(item.style) || 0) + 1);
  }

  entries.sort((a, b) => a.item.title.localeCompare(b.item.title, "en"));

  const items = entries.map((e) => e.item);
  const byId = new Map(items.map((i) => [i.id, i]));

  const tagFacets = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => facet(tag, tagLabel(tag), count));

  const coachFacets = [...coachCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([coach, count]) => facet(coach, coachLabel(coach), count));

  const lengthFacets = LENGTHS
    .map((l) => facet(l.id, l.label, lengthCounts.get(l.id) || 0))
    .filter((f) => f.count > 0);

  const styleFacets = STYLES
    .map((s) => facet(s.id, s.label, styleCounts.get(s.id) || 0))
    .filter((f) => f.count > 0);

  return {
    entries,
    items,
    byId,
    totalCount: items.length,
    tagFacets,
    coachFacets,
    lengthFacets,
    styleFacets,
  };
}

export const EMPTY_FILTERS = {
  query: "",
  tags: [],
  coaches: [],
  lengths: [],
  styles: [],
  savedOnly: false,
};

export function filterSelectionCount(filters) {
  return (
    filters.tags.length +
    filters.coaches.length +
    filters.lengths.length +
    filters.styles.length +
    (filters.savedOnly ? 1 : 0)
  );
}

export function filtersAreActive(filters) {
  return filters.query.trim().length > 0 || filterSelectionCount(filters) > 0;
}

/** Toggle a value in one of the array facets, returning a new filters object. */
export function toggleFilter(filters, key, value) {
  const current = filters[key] || [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { ...filters, [key]: next };
}

/**
 * Run the filters. Text is matched against titles first, then coach names,
 * tags and style words; a query that finds nothing gets one fuzzy retry so a
 * single typo does not read as "we do not have that exercise".
 */
export function runFilters(index, filters, savedIds = []) {
  if (!index) return [];
  const saved = new Set(savedIds);
  let pool = index.entries;

  if (filters.savedOnly) pool = pool.filter((e) => saved.has(e.item.id));
  if (filters.tags.length) {
    const wanted = new Set(filters.tags);
    pool = pool.filter((e) => e.item.tags.some((t) => wanted.has(t)));
  }
  if (filters.coaches.length) {
    const wanted = new Set(filters.coaches);
    pool = pool.filter((e) => wanted.has(e.item.coach));
  }
  if (filters.lengths.length) {
    const wanted = new Set(filters.lengths);
    pool = pool.filter((e) => e.item.length && wanted.has(e.item.length));
  }
  if (filters.styles.length) {
    const wanted = new Set(filters.styles);
    pool = pool.filter((e) => wanted.has(e.item.style));
  }

  const query = filters.query.trim();
  if (!query) return pool.map((e) => e.item);

  const needles = tokens(query);
  if (!needles.length) return pool.map((e) => e.item);
  const phrase = normalize(query);

  const score = (entry, fuzzy) => {
    let total = 0;
    for (const needle of needles) {
      let best = 0;
      for (const t of entry.titleTokens) {
        if (t === needle) { best = Math.max(best, 6); continue; }
        if (loosePrefixMatch(needle, t)) { best = Math.max(best, 4); continue; }
        if (fuzzy && needle.length >= 4 && withinOneEdit(needle, t)) best = Math.max(best, 2);
      }
      if (best === 0) {
        for (const t of entry.otherTokens) {
          if (t === needle) { best = Math.max(best, 3); continue; }
          if (loosePrefixMatch(needle, t)) { best = Math.max(best, 2); continue; }
          if (fuzzy && needle.length >= 4 && withinOneEdit(needle, t)) best = Math.max(best, 1);
        }
      }
      if (best === 0) return 0;
      total += best;
    }
    if (entry.normalizedTitle.startsWith(phrase)) total += 5;
    else if (entry.normalizedTitle.includes(phrase)) total += 2;
    return total;
  };

  const rank = (fuzzy) =>
    pool
      .map((entry) => ({ entry, s: score(entry, fuzzy) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.entry.item.title.localeCompare(b.entry.item.title, "en"))
      .map((r) => r.entry.item);

  const hits = rank(false);
  return hits.length ? hits : rank(true);
}

// --- Collections -----------------------------------------------------------

const ROW_LIMIT = 12;

function itemsWithAnyTag(index, tags, limit) {
  const wanted = new Set(tags);
  const out = [];
  for (const item of index.items) {
    if (item.tags.some((t) => wanted.has(t))) {
      out.push(item);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * The curated rows above the shelves. First one is hers: it is built from the
 * tags that serve her goal, so the library opens on what she came for.
 */
export function buildCollections(index, goalId) {
  if (!index || !index.items.length) return [];
  const built = [];

  const goalTags = libraryFocusTags(goalId);
  const goalItems = itemsWithAnyTag(index, goalTags, ROW_LIMIT);
  if (goalItems.length) {
    built.push({
      id: `goal-${goalId}`,
      title: `Because your goal is ${libraryGoalPhrase(goalId)}`,
      subtitle: "Handpicked for what you are working on.",
      items: goalItems,
      filters: { ...EMPTY_FILTERS, tags: goalTags },
    });
  }

  const shortItems = index.items.filter((i) => i.length === "underOneMinute").slice(0, ROW_LIMIT);
  if (shortItems.length) {
    built.push({
      id: "short-on-time",
      title: "Short on time",
      subtitle: "Every one takes less than a minute.",
      items: shortItems,
      filters: { ...EMPTY_FILTERS, lengths: ["underOneMinute"] },
    });
  }

  const calmTags = ["relaxation", "breathing", "stretch"];
  const calmItems = itemsWithAnyTag(index, calmTags, ROW_LIMIT);
  if (calmItems.length) {
    built.push({
      id: "gentle-and-calm",
      title: "Gentle and calm",
      subtitle: "Slow, soft moves for tired days.",
      items: calmItems,
      filters: { ...EMPTY_FILTERS, tags: calmTags },
    });
  }

  const strengthItems = itemsWithAnyTag(index, ["strength"], ROW_LIMIT);
  if (strengthItems.length) {
    built.push({
      id: "build-strength",
      title: "Build strength",
      subtitle: "Steady work that adds up week by week.",
      items: strengthItems,
      filters: { ...EMPTY_FILTERS, tags: ["strength"] },
    });
  }

  return built;
}

// --- Shelves, categories and the form course -------------------------------
//
// These three lists are the iOS app's own, exported from OptionModel.swift and
// PerfectYourForm.swift into public/content. They are ordered playlists, not
// something to re-derive from folder names.

let shelvesCache = null;
let formCache = null;

export async function loadShelves() {
  if (shelvesCache) return shelvesCache;
  const res = await fetch("/content/library_shelves.json");
  if (!res.ok) throw new Error("Could not load the exercise shelves.");
  shelvesCache = await res.json();
  return shelvesCache;
}

export async function loadFormModules() {
  if (formCache) return formCache;
  const res = await fetch("/content/form_modules.json");
  if (!res.ok) throw new Error("Could not load the form lessons.");
  formCache = await res.json();
  return formCache;
}

/** Resolve a list of catalog ids into items, dropping anything unknown. */
export function resolveIds(index, ids) {
  if (!index || !ids) return [];
  return ids.map((id) => index.byId.get(id)).filter(Boolean);
}

/** The "why" under each shelf title, verbatim from ExerciseView.swift. */
export function shelfBenefit(title) {
  switch (title) {
    case "Confidence Core": return "For leakproof power and an active life.";
    case "Intimacy & Sensation": return "More feeling, and a deeper connection.";
    case "Leakproof Control": return "For total control and leak-free confidence.";
    case "Prenatal & Postpartum": return "Safe, supportive exercises for every stage of motherhood.";
    case "Pelvic Pain Release": return "Release tension, build support, and live comfortably.";
    case "Lift & Sculpt": return "Sculpt a strong, toned core you can see and feel.";
    case "Fluid Body": return "Release tension and find freedom in your movement.";
    case "Pelvic Yoga": return "Reconnect with your body and find your flow.";
    case "Restore & Flow": return "Gentle healing for pregnancy and after birth.";
    case "Everyday Strength": return "Build strength for everyday life.";
    default: return "Expert-led workouts for your unique goals.";
  }
}

export async function loadLibrary(goalId) {
  const catalog = await loadCatalog();
  const index = buildIndex(catalog);
  const [shelvesDoc, formDoc] = await Promise.all([loadShelves(), loadFormModules()]);

  const shelves = (shelvesDoc.shelves || [])
    .map((s) => ({ ...s, items: resolveIds(index, s.videoIDs), benefit: shelfBenefit(s.title) }))
    .filter((s) => s.items.length);

  const categories = (shelvesDoc.categories || [])
    .map((c) => ({ ...c, items: resolveIds(index, c.videoIDs) }))
    .filter((c) => c.items.length);

  const formModules = (formDoc.modules || [])
    .map((m) => ({ ...m, items: resolveIds(index, m.videos.map((v) => v.videoId)) }))
    .filter((m) => m.items.length);

  return {
    index,
    collections: buildCollections(index, goalId),
    featured: shelves[0] || null,
    shelves: shelves.slice(1),
    categories,
    formModules,
  };
}
