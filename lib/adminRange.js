// Global date range for the owner dashboard. All ranges are UTC calendar
// days, inclusive on both ends, which is exactly what the RevenueCat and
// Apple Ads endpoints expect.

import { REPORTING_START_LABEL, reportingStartMs } from "./adminReporting.js";

export const DAY_MS = 86400000;

export const RANGE_PRESETS = [
  { id: "today", label: "Today", days: 1 },
  { id: "sinceRelaunch", label: `Since ${REPORTING_START_LABEL}`, days: null },
  { id: "7d", label: "7d", days: 7 },
  { id: "28d", label: "28d", days: 28 },
  { id: "90d", label: "90d", days: 90 },
];

export function utcTodayMs() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function rangeForPreset(id, today = utcTodayMs()) {
  const preset = RANGE_PRESETS.find((p) => p.id === id) || RANGE_PRESETS[1];
  const end = Number(today);
  if (end < reportingStartMs()) {
    const startDate = isoDay(reportingStartMs());
    return { preset: preset.id, startDate, endDate: startDate, days: 1, pending: true };
  }
  const requestedStart = preset.id === "sinceRelaunch"
    ? reportingStartMs()
    : end - ((preset.days || 1) - 1) * DAY_MS;
  const start = Math.max(requestedStart, reportingStartMs());
  const days = Math.round((end - start) / DAY_MS) + 1;
  return { preset: preset.id, startDate: isoDay(start), endDate: isoDay(end), days };
}

export function customRange(startDate, endDate, today = utcTodayMs()) {
  const requestedStart = Date.parse(`${startDate}T00:00:00Z`);
  const e = Date.parse(`${endDate}T00:00:00Z`);
  const currentDay = Number(today);
  const latestAllowed = Math.max(currentDay, reportingStartMs());
  if (!Number.isFinite(requestedStart) || !Number.isFinite(e) || e < reportingStartMs() || e > latestAllowed) return null;
  const s = Math.max(requestedStart, reportingStartMs());
  if (e < s) return null;
  const range = { preset: "custom", startDate: isoDay(s), endDate, days: Math.round((e - s) / DAY_MS) + 1 };
  return currentDay < reportingStartMs() ? { ...range, pending: true } : range;
}

/** The same number of days, ending the day before this range starts. */
export function previousRange(range) {
  const s = Date.parse(`${range.startDate}T00:00:00Z`);
  if (!Number.isFinite(s) || s <= reportingStartMs()) return null;
  const end = s - DAY_MS;
  const start = Math.max(reportingStartMs(), end - (range.days - 1) * DAY_MS);
  return { preset: "previous", startDate: isoDay(start), endDate: isoDay(end), days: Math.round((end - start) / DAY_MS) + 1 };
}

export function rangeLabel(range) {
  if (!range) return "";
  if (range.preset === "today") return "Today";
  return `${shortUtc(range.startDate)} – ${shortUtc(range.endDate)}`;
}

export function shortUtc(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Sum of a daily series inside a range. */
export function sumSeries(series, range) {
  if (!Array.isArray(series)) return null;
  let total = 0;
  let any = false;
  for (const p of series) {
    if (!p?.date) continue;
    if (range && (p.date < range.startDate || p.date > range.endDate)) continue;
    if (Number.isFinite(p.value)) { total += p.value; any = true; }
  }
  return any ? total : null;
}

/** Fill a daily series so every day in the range has a point (zero when absent). */
export function fillDaily(series, range) {
  const byDate = new Map((Array.isArray(series) ? series : []).map((p) => [p.date, p.value]));
  const out = [];
  const s = Date.parse(`${range.startDate}T00:00:00Z`);
  for (let i = 0; i < range.days; i += 1) {
    const date = isoDay(s + i * DAY_MS);
    const v = byDate.get(date);
    out.push({ date, value: Number.isFinite(v) ? v : 0 });
  }
  return out;
}
