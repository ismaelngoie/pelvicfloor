import { TRACKER_CATALOG } from "./trackerCatalogData.js";

export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function parseDay(key) { const [y, m, d] = String(key).split("-").map(Number); return new Date(y, m - 1, d); }
export function asDate(value) { return value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value); }
export function daysBetween(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
export function recentDays(count, now = new Date()) { return Array.from({ length: count }, (_, index) => { const date = new Date(now); date.setDate(date.getDate() - (count - index - 1)); return dayKey(date); }); }
export const newTrackerId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tracker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
export function trackerStreak(keys, now = new Date()) {
  const known = new Set(keys); const cursor = parseDay(dayKey(now)); let count = 0;
  if (!known.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (known.has(dayKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

export const WATER_DRINKS = [
  { id: "glass", title: "Glass", milliliters: 250, irritant: false },
  { id: "bottle", title: "Bottle", milliliters: 500, irritant: false },
  { id: "tea", title: "Tea", milliliters: 250, irritant: true },
  { id: "coffee", title: "Coffee", milliliters: 150, irritant: true },
  { id: "wine", title: "Wine", milliliters: 150, irritant: true },
];
export function waterEntry(entry) {
  const preset = WATER_DRINKS.find((drink) => drink.id === entry.type);
  return { ...entry, title: preset?.title || entry.customName || "Earlier fluid total", milliliters: preset?.milliliters || Math.max(0, Number(entry.customMilliliters) || 0), irritant: preset?.irritant || false };
}
export function normalizeWater(raw = {}) {
  const goalML = Math.min(5000, Math.max(500, Number(raw.goalML) || 2000));
  const entries = raw.entries ? Object.fromEntries(Object.entries(raw.entries).map(([key, values]) => [key, [...values]])) : {};
  const dailyGoals = { ...(raw.dailyGoals || {}) };
  for (const [key, value] of Object.entries(raw.days || {})) {
    if (!entries[key] && Number(value) > 0) entries[key] = [{ id: `legacy-water-${key}`, type: "custom", at: null, customName: "Earlier fluid total", customMilliliters: Number(value), legacy: true }];
    if (dailyGoals[key] == null) dailyGoals[key] = goalML;
  }
  const days = Object.fromEntries(Object.entries(entries).map(([key, values]) => [key, values.reduce((sum, entry) => sum + waterEntry(entry).milliliters, 0)]));
  return { ...raw, version: 2, goalML, entries, days, dailyGoals, customVessels: raw.customVessels || [] };
}
export function logWater(raw, drink, now = new Date()) {
  const water = normalizeWater(raw); const key = dayKey(now);
  const preset = WATER_DRINKS.find((item) => item.id === drink.id);
  const entry = { id: newTrackerId(), type: preset ? preset.id : "custom", at: now.toISOString(), ...(preset ? {} : { customName: drink.name, customMilliliters: drink.milliliters }) };
  return normalizeWater({ ...water, entries: { ...water.entries, [key]: [...(water.entries[key] || []), entry] }, dailyGoals: { ...water.dailyGoals, [key]: water.dailyGoals[key] ?? water.goalML } });
}
export function deleteWaterEntry(raw, key, id) {
  const water = normalizeWater(raw);
  return normalizeWater({ ...water, entries: { ...water.entries, [key]: (water.entries[key] || []).filter((entry) => entry.id !== id) } });
}
export function setWaterGoal(raw, goal, now = new Date()) {
  const water = normalizeWater(raw);
  const goalML = Math.min(5000, Math.max(500, Number(goal) || 2000));
  // A new goal never rewrites the goals attached to earlier logged days.
  return { ...water, goalML, dailyGoals: { ...water.dailyGoals, [dayKey(now)]: goalML } };
}
export function waterStreak(raw, now = new Date()) {
  const water = normalizeWater(raw);
  return trackerStreak(Object.keys(water.days).filter((key) => water.days[key] >= (water.dailyGoals[key] || water.goalML)), now);
}
export function vesselMilliliters(amount, unit = "milliliters") {
  const number = Number(amount); const range = unit === "fluidOunces" ? [2, 135] : [50, 4000];
  if (!Number.isFinite(number) || number < range[0] || number > range[1]) return null;
  return Math.round(unit === "fluidOunces" ? number * 29.5735 : number);
}

export function cycleEntries(womens = {}) {
  if (Array.isArray(womens.cycleEntries)) return womens.cycleEntries;
  return (womens.periods || []).flatMap((period) => [
    { id: `legacy-start-${period.start}`, kind: "periodStarted", date: period.start, goalRawValue: null },
    ...(period.end ? [{ id: `legacy-end-${period.start}`, kind: "periodEnded", date: period.end, goalRawValue: null }] : []),
  ]);
}
export function cycleSummary(entries, now = new Date()) {
  const today = dayKey(now);
  const starts = [...new Set(entries.filter((entry) => entry.kind === "periodStarted" && entry.date <= today).map((entry) => entry.date))].sort();
  const latest = starts.at(-1);
  if (!latest) return { cycleDay: null, periodActive: false, prediction: null, periodDays: 0 };
  const ends = entries.filter((entry) => entry.kind === "periodEnded" && entry.date <= today).map((entry) => entry.date).sort();
  const periodActive = !ends.length || ends.at(-1) < latest;
  const dayDifference = daysBetween(parseDay(latest), now);
  const cycleDay = dayDifference >= 0 && dayDifference <= 60 ? dayDifference + 1 : null;
  const end = ends.find((key) => key >= latest);
  const periodDays = periodActive ? cycleDay : end && daysBetween(parseDay(latest), parseDay(end)) <= 14 ? daysBetween(parseDay(latest), parseDay(end)) + 1 : 0;
  const intervals = starts.slice(1).map((key, index) => daysBetween(parseDay(starts[index]), parseDay(key))).filter((length) => length >= 21 && length <= 45).slice(-6).sort((a, b) => a - b);
  let prediction = null;
  if (starts.length >= 2 && intervals.length) {
    const middle = Math.floor(intervals.length / 2);
    const length = intervals.length % 2 ? intervals[middle] : Math.floor((intervals[middle - 1] + intervals[middle]) / 2);
    const next = parseDay(latest); next.setDate(next.getDate() + length);
    prediction = { length, nextDate: dayKey(next), daysUntil: daysBetween(now, next), cyclesUsed: intervals.length };
  }
  return { latest, cycleDay, periodActive, periodDays, prediction };
}
export function savePeriod(entries, start, end) {
  const result = entries.filter((entry) => !(entry.kind === "periodEnded" && entry.periodStart === start));
  if (!result.some((entry) => entry.kind === "periodStarted" && entry.date === start)) result.push({ id: newTrackerId(), kind: "periodStarted", date: start, goalRawValue: null });
  if (end && !result.some((entry) => entry.kind === "periodEnded" && entry.date === end)) result.push({ id: newTrackerId(), kind: "periodEnded", date: end < start ? start : end, periodStart: start, goalRawValue: null });
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
export function cycleTrainingContext(summary) {
  if (summary.periodActive) return ["Gentle days count double", "Release work and breathing sessions are a kind way to keep your week alive. Comfort always comes first. Shorter and softer still counts."];
  if (!summary.cycleDay) return ["Two cycles of notes", "Log your periods and quick daily check-ins for two cycles, and Coach Mia™ starts showing how your cycle and your symptoms move together."];
  if (summary.prediction?.daysUntil >= 0 && summary.prediction.daysUntil <= 5) return ["The days before a period", "Many members notice urgency, heaviness, or tension flare in the days before a period. Your In-the-Moment tools are one tap from Today."];
  if (summary.cycleDay <= 9) return ["A natural reset point", "A fresh cycle is a clean page. Members who anchor their five weekly sessions in these first days tend to keep the whole week."];
  return ["Steady middle days", "This is where consistent technique quietly compounds. Your plan is built for exactly this stretch. Keep the sessions honest, not rushed."];
}
export function cycleObservation(entries, checkIns) {
  const starts = entries.filter((entry) => entry.kind === "periodStarted").map((entry) => entry.date).sort();
  if (starts.length < 3 || checkIns.length < 12) return null;
  for (const [field, title] of [["painLevel", "discomfort"], ["energyLevel", "energy"], ["goalFeeling", "confidence"]]) {
    const before = []; const other = [];
    for (const record of checkIns) {
      const value = Number(record[field]); if (record[field] == null || !Number.isFinite(value)) continue;
      const key = record.id && /^\d{4}-\d{2}-\d{2}$/.test(record.id) ? record.id : dayKey(asDate(record.date));
      const next = starts.find((start) => start >= key);
      const gap = next ? daysBetween(parseDay(key), parseDay(next)) : 99;
      (gap >= 1 && gap <= 5 ? before : other).push(value);
    }
    if (before.length < 3 || other.length < 6) continue;
    const difference = before.reduce((a, b) => a + b, 0) / before.length - other.reduce((a, b) => a + b, 0) / other.length;
    if (Math.abs(difference) >= 0.75) return `In your daily check-ins, Coach Mia™ noticed that ${title} has usually been ${difference > 0 ? "higher" : "lower"} in the five days before your period.`;
  }
  return null;
}

export const mensTrackerPlan = (goal, focus) => goal === "intimacy" && TRACKER_CATALOG.mensFocus[focus] || TRACKER_CATALOG.mens[goal] || TRACKER_CATALOG.mens.coreStrength;
export const cycleTrackerPlan = (goal) => TRACKER_CATALOG.cycle[goal] || TRACKER_CATALOG.cycle.coreStrength;
export const MENOPAUSE_SYMPTOMS = [
  ["hotFlashes", "Hot flashes"], ["nightSweats", "Night sweats"], ["sleep", "Sleep changes"], ["mood", "Mood changes"],
  ["focus", "Focus or memory"], ["dryness", "Dryness or discomfort"], ["bladder", "Bladder changes"], ["jointAches", "Joint or muscle aches"],
];
export function normalizeMens(mens = {}) {
  if (Array.isArray(mens.entries)) return mens.entries;
  return Object.entries(mens.days || {}).map(([date, values]) => ({ id: `legacy-mens-${date}`, date, goalRawValue: values.goalRawValue || "legacy", ratings: {}, note: Object.entries(values).filter(([key]) => key !== "at").map(([key, value]) => `${key}: ${value}`).join(" · "), legacy: true }));
}
export function normalizeMenopause(womens = {}) {
  if (Array.isArray(womens.menopauseEntries)) return womens.menopauseEntries;
  return Object.entries(womens.menopause || {}).map(([date, values]) => ({ id: `legacy-menopause-${date}`, date, symptoms: [], impact: null, sleepQuality: null, note: Object.entries(values).filter(([key]) => key !== "at").map(([key, value]) => `${key}: ${value}`).join(" · "), legacy: true }));
}
export function saveDatedEntry(entries, entry, goalScoped = false) {
  return [entry, ...entries.filter((old) => old.id !== entry.id && !(old.date === entry.date && (!goalScoped || old.goalRawValue === entry.goalRawValue)))].sort((a, b) => b.date.localeCompare(a.date));
}
export function mensPattern(entries, plan) {
  if (entries.length < 3) return `Log 3 days to start seeing your pattern. You have ${entries.length} of 3.`;
  const scores = plan.metrics.flatMap((metric) => { const values = entries.slice(0, 14).map((entry) => entry.ratings[metric.id]).filter((value) => value != null); if (!values.length) return []; const average = values.reduce((a, b) => a + b, 0) / values.length; return [{ metric, score: metric.higherIsBetter ? average : 6 - average }]; }).sort((a, b) => b.score - a.score);
  return scores.length ? `${scores[0].metric.title} is your strongest recent signal. Keep logging to see how it changes with your daily plan.` : "Keep checking in to make changes easier to see.";
}
export function menopausePattern(entries, now = new Date()) {
  if (entries.length < 3) return `Log 3 days to begin seeing your most common symptom. You have ${entries.length} of 3.`;
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 13);
  const counts = {};
  for (const entry of entries.filter((record) => record.date >= dayKey(cutoff))) for (const symptom of entry.symptoms || []) counts[symptom] = (counts[symptom] || 0) + 1;
  const winner = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const title = MENOPAUSE_SYMPTOMS.find(([id]) => id === winner)?.[1];
  return title ? `${title} appears most often in your last 14 days. Keep logging to see whether it changes with sleep, stress or your daily plan.` : "Your recent check-ins show several low-symptom days. Keep logging so changes are easier to spot.";
}
