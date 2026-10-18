// Bounded continuity from facts the member recorded. Never send free-form private notes.
import { dailyTrackingPlan, trackingLabel, memberPathway } from "../dailyTracking.js";
import { cycleEntries, cycleSummary, normalizeMenopause, normalizeMens, mensTrackerPlan } from "../trackerModels.js";
function asDate(value) { return value?.toDate?.() || new Date(value); }
export function buildCareMemory({ member, goalId, focus, checkIns = [], completions = [], audioRecords = [], now = new Date() }) {
  member = { ...member, pathway: memberPathway(member, goalId) };
  const memory = [];
  const cutoff = now.getTime() - 14 * 86400000;
  const recent = checkIns.filter((entry) => (!entry.goal || entry.goal === goalId) && asDate(entry.date).getTime() >= cutoff)
    .sort((a, b) => asDate(b.date) - asDate(a.date));
  const latest = recent[0];
  if (latest) {
    const plan = dailyTrackingPlan(goalId, member?.pathway, focus);
    const facts = plan.prompts.map((prompt) => { const value = trackingLabel(prompt, latest); return value == null ? null : `${prompt.title}: ${value}`; }).filter(Boolean);
    if (facts.length) memory.push(`Latest logged goal check-in: ${facts.join(", ")}.`);
  }
  const today = now.toDateString();
  const done = completions.some((entry) => asDate(entry.date || entry.completedAt).toDateString() === today);
  memory.push(done ? "The member completed their program session today." : "No completed program session is recorded for today.");
  const feedback = (member?.planPreferences?.feedbackRecords || []).filter((entry) => entry.goal === goalId && asDate(entry.date).getTime() >= cutoff).at(-1);
  if (feedback?.response) memory.push(`Most recent session feedback: ${feedback.response}.`);
  const audio = audioRecords.filter((entry) => entry.goal === goalId && entry.completedAt && asDate(entry.startedAt || entry.completedAt).getTime() >= cutoff);
  if (audio.length) memory.push(`Completed ${audio.length} guided audio sessions in the last 14 days.`);
  const womens = member?.trackers?.womens;
  if (member?.pathway !== "mensPelvicHealth" && womens?.mode === "cycle") {
    const summary = cycleSummary(cycleEntries(womens), now);
    if (summary.periodActive) memory.push(`The member logged a period beginning ${summary.latest} that is not marked ended. Do not infer fertility or ovulation.`);
  } else if (member?.pathway !== "mensPelvicHealth" && womens?.mode === "menopause") {
    const entry = normalizeMenopause(womens).filter((record) => !record.legacy).sort((a, b) => asDate(b.date) - asDate(a.date))[0];
    if (entry) {
      const symptoms = Array.isArray(entry.symptoms) ? entry.symptoms.join(", ") : "";
      memory.push(`Latest menopause check-in: ${symptoms || "no symptoms selected"}${entry.impact != null ? `, impact ${entry.impact}/5` : ""}${entry.sleepQuality != null ? `, sleep ${entry.sleepQuality}/5` : ""}.`);
    }
  } else if (member?.pathway === "mensPelvicHealth") {
    const entry = normalizeMens(member?.trackers?.mens || {}).filter((record) => record.goalRawValue === goalId && !record.legacy).sort((a, b) => asDate(b.date) - asDate(a.date))[0];
    if (entry) {
      const plan = mensTrackerPlan(goalId);
      const facts = plan.metrics.filter((metric) => entry.ratings[metric.id] != null).map((metric) => `${metric.title}: ${entry.ratings[metric.id]}/5`);
      if (facts.length) memory.push(`Latest men's pelvic health check-in: ${facts.join(", ")}.`);
    }
  }
  return memory.slice(0, 8);
}
