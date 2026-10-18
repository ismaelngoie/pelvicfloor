import { NATIVE_DAILY_TRACKING } from "./nativeDailyTrackingData.js";

export const TRACKING_FIELDS = { leak: "leakLevel", discomfort: "painLevel", secondary: "energyLevel", confidence: "goalFeeling" };
export function memberPathway(member, goalId = member?.goal) {
  return member?.pathway === "mensPelvicHealth" || ["prostateRecovery", "bowelControl"].includes(goalId)
    ? "mensPelvicHealth" : "womensPelvicHealth";
}
export function dailyTrackingPlan(goalId, pathway = "womensPelvicHealth", focus = null) {
  pathway = memberPathway({ pathway }, goalId);
  const source = NATIVE_DAILY_TRACKING[pathway] || NATIVE_DAILY_TRACKING.womensPelvicHealth;
  const base = source[goalId] || source.coreStrength;
  const prompts = base.prompts.map((prompt) => ({ ...prompt, choices: prompt.choices.map((choice) => ({ ...choice })) }));
  if (!focus?.tracking) return { ...base, prompts };
  const tracking = focus.tracking;
  const numbers = tracking.slot === "leak" ? [0, 1, 2] : tracking.slot === "discomfort" ? [8, 4, 0] : [1, 3, 5];
  const focused = { ...tracking, choices: tracking.choices.map((choice, index) => typeof choice === "string" ? { title: choice, value: numbers[index] } : choice) };
  const index = prompts.findIndex((prompt) => prompt.slot === tracking.slot);
  const replacement = index >= 0 ? index : prompts.findIndex((prompt) => prompt.slot === "secondary");
  if (replacement >= 0) prompts[replacement] = focused;
  return { ...base, subtitle: `Focused on ${focus.title.toLowerCase()}.`, prompts };
}

export function checkInAnswers(record) {
  const answers = {};
  for (const [slot, field] of Object.entries(TRACKING_FIELDS)) {
    let value = record?.[field];
    if (value == null || value === "" || typeof value === "boolean") continue;
    if (slot === "leak") value = typeof value === "number" ? value : ({ None: 0, "A Few": 1, "A few": 1, Several: 2 }[value]);
    if (Number.isFinite(Number(value))) answers[slot] = Number(value);
  }
  return answers;
}
export function answersToCheckIn(answers, goal) {
  return { goal, mood: "", leakLevel: answers.leak == null ? null : ["None", "A Few", "Several"][answers.leak],
    painLevel: answers.discomfort ?? null, energyLevel: answers.secondary ?? null, goalFeeling: answers.confidence ?? null };
}
export function isEditableGoalCheckIn(record, goal) {
  return Boolean(record && record.goal === goal && !record.mood && Object.keys(checkInAnswers(record)).length);
}
export function canSaveDailyCheckIn({ answers, loading = false, loadFailed = false, saving = false }) {
  return !loading && !loadFailed && !saving && Object.keys(answers || {}).length > 0;
}
export function trackingLabel(prompt, record) {
  const value = checkInAnswers(record)[prompt.slot];
  if (value == null) return null;
  return prompt.choices.find((choice) => choice.value === value)?.title || String(value);
}
export function trackingDate(record) {
  if (record?.date) {
    const value = record.date?.toDate?.() || (typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? new Date(`${record.date}T00:00:00`) : new Date(record.date));
    if (!Number.isNaN(value.getTime())) return value;
  }
  const key = record?.dateKey || String(record?.id || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return new Date(`${key}T00:00:00`);
  if (!record?.completedAt) return null;
  const date = new Date(record.completedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function trackingRows(records = [], goalId) {
  const byDay = new Map();
  const score = (record) => Object.keys(checkInAnswers(record)).length + (record.mood ? 1 : 0);
  for (const record of records) {
    if (record.goal && record.goal !== goalId) continue;
    const date = trackingDate(record);
    if (!date) continue;
    const key = `${record.goal || "legacy"}:${date.toDateString()}`;
    const previous = byDay.get(key);
    if (!previous || score(record) > score(previous) || (score(record) === score(previous) && trackingDate(record) > trackingDate(previous))) byDay.set(key, record);
  }
  return [...byDay.values()].sort((a, b) => trackingDate(a) - trackingDate(b));
}
export function trackingSeries(records, plan) {
  const rows = trackingRows(records, plan.goal);
  const definitions = [
    ["leak", "Leaks", "Leaks", 2, false], ["discomfort", "Discomfort", "Earlier pain check-ins", 8, false],
    ["secondary", "Daily measure", "Earlier energy check-ins", 5, true], ["confidence", "Confidence", "Earlier goal-feeling check-ins", 5, true],
  ];
  return definitions.map(([slot, fallback, legacy, maximum, higherIsBetter]) => {
    const prompt = plan.prompts.find((item) => item.slot === slot);
    const data = rows.flatMap((record) => { const value = checkInAnswers(record)[slot]; return value == null ? [] : [{ date: trackingDate(record), value, legacy: !record.goal }]; });
    const currentTitle = prompt?.title || fallback;
    const hasLegacy = data.some((point) => point.legacy), hasCurrent = data.some((point) => !point.legacy);
    const legacyTitle = slot === "secondary" && currentTitle === "Energy" ? "Energy" : legacy;
    const title = hasLegacy ? hasCurrent && currentTitle !== legacyTitle ? `${currentTitle} + ${legacyTitle.toLowerCase()}` : legacyTitle : currentTitle;
    return { slot, title, data, maximum: slot === "discomfort" && data.some((point) => point.value > 8) ? 10 : maximum, higherIsBetter,
      valueLabels: slot === "leak" ? ["None", "A few", "Several"] : null };
  }).filter((series) => series.data.length);
}
