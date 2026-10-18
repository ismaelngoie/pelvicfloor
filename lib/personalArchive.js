import { dailyTrackingPlan, trackingLabel, trackingRows, trackingDate, memberPathway } from "./dailyTracking.js";
import { audioSessionById } from "./audioCatalog.js";
import { TRACKER_CATALOG } from "./trackerCatalogData.js";
import { cycleEntries, normalizeMenopause, normalizeMens, MENOPAUSE_SYMPTOMS } from "./trackerModels.js";

export function archiveDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function archiveDay(value) {
  const date = archiveDate(value); if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function archiveDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!safe) return "0 min"; if (safe < 60) return "<1 min";
  return safe % 60 ? `${Math.floor(safe / 60)}m ${safe % 60}s` : `${Math.floor(safe / 60)} min`;
}
const sum = (rows, field) => rows.reduce((total, row) => total + Math.max(0, Number(row[field]) || 0), 0);
function distinct(rows, identity) { return [...new Map(rows.map((row) => [identity(row), row])).values()]; }
export function bodyTrackingEntries(member = {}, goalId = member.goal) {
  member = { ...member, pathway: memberPathway(member, goalId) };
  const entries = [], womens = member.trackers?.womens || {}, mens = member.trackers?.mens || {};
  const ratingsText = (row, type) => {
    const metrics = TRACKER_CATALOG[type]?.[row.goal || row.goalRawValue || goalId]?.metrics || [];
    return Object.entries(row.ratings || {}).map(([key, value]) => `${metrics.find((metric) => metric.id === key)?.title || key}: ${value}/5`).join(" · ");
  };
  if (member.pathway !== "mensPelvicHealth") {
    for (const row of cycleEntries(womens)) entries.push({ id: `cycle-${row.id}`, date: row.date, kind: "cycle", title: row.kind === "periodStarted" ? "Period started" : row.kind === "periodEnded" ? "Period ended" : row.kind === "flow" ? "Period flow" : "Cycle and body context", detail: row.flowRawValue ? `Flow: ${row.flowRawValue}` : ratingsText(row, "cycle") || "Entry saved", goal: row.goal || row.goalRawValue });
    for (const row of normalizeMenopause(womens)) entries.push({ id: `menopause-${row.id}`, date: row.date, kind: "menopause", title: row.legacy ? "Earlier menopause tracker entry" : "Menopause check-in", detail: row.legacy ? "Earlier tracker entry" : [Array.isArray(row.symptoms) ? row.symptoms.map((id) => MENOPAUSE_SYMPTOMS.find((symptom) => symptom.id === id)?.title || id).join(", ") : "", row.impact != null ? `Impact: ${row.impact}/5` : null, row.sleepQuality != null ? `Sleep: ${row.sleepQuality}/5` : null].filter(Boolean).join(" · "), goal: null });
  } else {
    for (const row of normalizeMens(mens)) entries.push({ id: `mens-${row.id}`, date: row.date, kind: "mensHealth", title: row.legacy ? "Earlier men's pelvic health entry" : "Men's pelvic health check-in", detail: row.legacy ? "Earlier tracker entry" : ratingsText(row, "mens"), goal: row.goalRawValue === "legacy" ? null : row.goal || row.goalRawValue });
  }
  return distinct(entries.filter((entry) => archiveDate(entry.date)), (entry) => entry.id);
}

export function archiveSnapshot({ member = {}, goalId = member.goal || "coreStrength", events = [], completions = [], checkIns = [], audioRecords = [], ritualRecords = [], answers = [], outcomeChecks = [], diaryEntries = [], focus, retainedDays = 730, now = new Date() }) {
  member = { ...member, pathway: memberPathway(member, goalId) };
  const cutoff = Number.isFinite(retainedDays) ? new Date(now) : new Date(0);
  if (Number.isFinite(retainedDays)) cutoff.setDate(cutoff.getDate() - retainedDays);
  cutoff.setHours(0, 0, 0, 0);
  const inHistory = (value) => { const date = archiveDate(value); return date && date >= cutoff && date <= now; };
  const entries = [], coveredDates = new Set();
  const completed = distinct(completions.filter((row) => inHistory(row.completedAt || row.date)), (row) => `${row.programID || row.goal || goalId}:${row.day}`);
  const watches = distinct(events.filter((row) => row.completed && !row.sessionCompleted && inHistory(row.date)), (row) => row.eventID || row.id || `${archiveDay(row.date)}:${row.videoID}:${row.secondsWatched}:${row.programDay}:${row.goal}`);
  const sessions = distinct(events.filter((row) => row.sessionCompleted && ["program", "replay", "continuation"].includes(row.playbackContext) && inHistory(row.date)), (row) => row.eventID || row.id || `${row.date}:${row.playbackContext}:${row.programDay}:${row.goal}`);
  const byDate = new Map(), sessionsByDate = new Map();
  for (const row of completed) { const key = archiveDay(row.completedAt || row.date); const list = byDate.get(key) || []; list.push(row); byDate.set(key, list); }
  for (const row of sessions) { const key = archiveDay(row.date); const list = sessionsByDate.get(key) || []; list.push(row); sessionsByDate.set(key, list); }
  for (const date of new Set([...byDate.keys(), ...sessionsByDate.keys()])) {
    coveredDates.add(date);
    const rows = byDate.get(date) || [], dailySessions = sessionsByDate.get(date) || [];
    // A program session and its banked day are the same completed routine.
    // Replays and continuation sessions are additional recorded routines.
    const unmatchedDays = rows.filter((row) => !dailySessions.some((event) => event.playbackContext === "program" && Number(event.programDay) === Number(row.day) && (!event.goal || event.goal === (row.programID || row.goal || goalId))));
    const count = dailySessions.length + unmatchedDays.length;
    const matched = watches.filter((row) => archiveDay(row.date) === date && !String(row.videoID || "").startsWith("audio-kegels."));
    const sessionSeconds = dailySessions.reduce((total, event) => total + Math.max(0, Number(event.sessionSecondsWatched ?? event.secondsWatched) || 0), 0);
    const seconds = Math.max(sessionSeconds + sum(unmatchedDays, "secondsWatched"), sum(matched, "secondsWatched"));
    const latestDate = [...rows.map((row) => row.completedAt || row.date), ...dailySessions.map((row) => row.date)].sort((a, b) => archiveDate(a) - archiveDate(b)).at(-1);
    const goalSet = new Set([...rows.map((row) => row.programID || row.goal || goalId), ...dailySessions.map((row) => row.goal || goalId)]);
    const onlySession = dailySessions.length === 1 && count === 1 ? dailySessions[0] : null;
    const title = count !== 1 ? `${count} workouts completed` : onlySession?.playbackContext === "replay" ? `Replay${onlySession.programDay ? ` of Day ${onlySession.programDay}` : ""} completed` : onlySession?.playbackContext === "continuation" ? "Continuation session completed" : `Program Day ${rows[0]?.day || onlySession?.programDay} completed`;
    entries.push({ id: `workout-${date}`, date: latestDate, kind: "workout", title, detail: archiveDuration(seconds), goal: goalSet.size === 1 ? [...goalSet][0] : null, durationSeconds: seconds, sessionCount: count });
  }
  for (const row of watches) {
    const kegel = String(row.videoID || "").startsWith("audio-kegels.");
    if (!kegel && coveredDates.has(archiveDay(row.date))) continue;
    entries.push({ id: `event-${row.eventID || row.id || `${row.videoID}:${row.date}`}`, date: row.date, kind: "workout", title: row.videoTitle || (kegel ? "Audio Kegel set completed" : "Exercise completed"), detail: `${archiveDuration(row.secondsWatched)} · Completed exercise`, goal: row.goal || row.programID, durationSeconds: Math.max(0, Number(row.secondsWatched) || 0), sessionCount: kegel ? 1 : 0 });
  }
  for (const row of audioRecords.filter((record) => record.completedAt && inHistory(record.completedAt))) {
    const session = audioSessionById(row.sessionID), seconds = session?.beats.reduce((total, beat) => total + beat.duration, 0) || 0;
    entries.push({ id: `audio-${row.id}`, date: row.completedAt, kind: "audio", title: session?.title || "Guided audio completed", detail: `${seconds ? archiveDuration(seconds) : "Completed audio"}${row.outcome ? ` · After: ${row.outcome}` : ""}`, goal: row.goal, durationSeconds: seconds, sessionID: row.sessionID, outcome: row.outcome });
  }
  const plan = dailyTrackingPlan(goalId, member.pathway, focus);
  for (const row of trackingRows(checkIns, goalId).filter((record) => inHistory(trackingDate(record)))) entries.push({ id: `checkin-${row.goal || "legacy"}-${archiveDay(trackingDate(row))}`, date: trackingDate(row), kind: "checkIn", title: row.goal ? "Daily tracking" : "Earlier daily check-in", detail: row.goal ? plan.prompts.map((prompt) => { const value = trackingLabel(prompt, row); return value == null ? null : `${prompt.title}: ${value}`; }).filter(Boolean).join(" · ") : "Earlier answers saved", goal: row.goal || null });
  entries.push(...bodyTrackingEntries(member, goalId).filter((entry) => inHistory(entry.date)));
  for (const row of ritualRecords.filter((record) => inHistory(record.date))) entries.push({ id: `ritual-${row.id}`, date: row.date, kind: "ritual", title: ({ beforeIntimacy: "Before-intimacy ritual", afterIntimacy: "After-intimacy check-in", soloConnection: "Solo connection ritual", partnerConnection: "Partner connection ritual", morning: "Morning reset", evening: "Evening release" })[row.moment] || "Private ritual", detail: Object.keys(row.ratings || {}).length ? "Follow-up saved" : row.bodyState != null ? "Body check saved" : "Private moment completed", goal: row.goal });
  for (const row of outcomeChecks.filter((record) => inHistory(record.date))) entries.push({ id: `outcome-${row.checkID || row.id}`, date: row.date, kind: "outcome", title: "Progress Check", detail: [row.iciqTotal != null ? `ICIQ-UI SF: ${row.iciqTotal}` : null, row.pfdiTotal != null ? `PFDI-20: ${Math.round(row.pfdiTotal)}` : null].filter(Boolean).join(" · ") || "Questionnaire saved", goal: row.goal });
  entries.sort((a, b) => archiveDate(b.date) - archiveDate(a.date) || a.id.localeCompare(b.id));
  const days = [...new Set(entries.map((entry) => archiveDay(entry.date)))].map((date) => ({ date, entries: entries.filter((entry) => archiveDay(entry.date) === date) }));
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  const currentWeek = new Date(now); currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()); currentWeek.setHours(0, 0, 0, 0);
  const weeklyReports = Array.from({ length: 26 }, (_, offset) => {
    const start = new Date(currentWeek); start.setDate(start.getDate() - offset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const rows = entries.filter((entry) => { const date = archiveDate(entry.date); return date >= start && date < end; });
    const workout = rows.filter((entry) => entry.kind === "workout"), audio = rows.filter((entry) => entry.kind === "audio");
    const goalRows = trackingRows(checkIns, goalId).filter((row) => { const date = trackingDate(row); return row.goal === goalId && date >= start && date < end; });
    const promptTrends = plan.prompts.flatMap((prompt) => { const values = goalRows.map((row) => trackingLabel(prompt, row)).filter((value) => value != null); return values.length ? [{ title: prompt.title, count: values.length, first: values[0], latest: values.at(-1) }] : []; });
    const audioRatings = new Map();
    for (const row of audio.filter((entry) => entry.goal === goalId && entry.outcome)) { const item = audioRatings.get(row.sessionID) || { title: row.title, better: 0, total: 0 }; item.total += 1; item.better += row.outcome === "better" ? 1 : 0; audioRatings.set(row.sessionID, item); }
    const mostHelpful = [...audioRatings.values()].filter((item) => item.better > 0).sort((a, b) => b.better - a.better || b.total - a.total)[0] || null;
    return { id: archiveDay(start), start, end: new Date(Math.min(now.getTime(), end.getTime() - 1)), isCurrent: offset === 0, workoutSessions: sum(workout, "sessionCount"), workoutSeconds: sum(workout, "durationSeconds"), audioSessions: audio.length, audioSeconds: sum(audio, "durationSeconds"), checkInCount: goalRows.length, bodyTrackingCount: rows.filter((entry) => ["cycle", "menopause", "mensHealth"].includes(entry.kind) && (!entry.goal || entry.goal === goalId)).length, ritualCount: rows.filter((entry) => entry.kind === "ritual" && entry.goal === goalId).length, savedAnswerCount: answers.filter((answer) => { const date = archiveDate(answer.savedAt); return date && date >= start && date < end && (!answer.goal || answer.goal === goalId); }).length, promptTrends, mostHelpful };
  });
  return { entries, days, months, weeklyReports, diaryEntryCount: diaryEntries.filter((entry) => inHistory(entry.timestamp)).length };
}

export function reportAdherence(sessions, start, end, sessionsPerWeek) {
  const calendarDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const spanDays = Math.max(1, Math.round((calendarDay(end) - calendarDay(start)) / 86400000) + 1);
  const denominator = Math.max(1, spanDays / 7 * sessionsPerWeek);
  return Math.max(0, Math.min(100, Math.round(Math.max(0, sessions) / denominator * 100)));
}

export function weeklyReportText(report, goalTitle = "Pelvic health") {
  const date = (value) => value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return ["My Weekly Progress", `${date(report.start)} to ${date(report.end)}`, `Goal: ${goalTitle}`, "", `Completed movement sessions: ${report.workoutSessions}`, `Workout time: ${archiveDuration(report.workoutSeconds)}`, `Completed guided audios: ${report.audioSessions}`, `Completed audio time: ${archiveDuration(report.audioSeconds)}`, `Daily check-ins: ${report.checkInCount}`, `Body tracking entries: ${report.bodyTrackingCount}`, `Private rituals: ${report.ritualCount}`, `Saved Coach answers: ${report.savedAnswerCount}`, "", ...report.promptTrends.map((trend) => `${trend.title}: ${trend.count} answers · ${trend.first} → ${trend.latest}`), report.mostHelpful ? `What helped: ${report.mostHelpful.title} felt better after ${report.mostHelpful.better} of ${report.mostHelpful.total} completed listens.` : "", "", "This summary includes only activity recorded in the app."].filter((line) => line !== null).join("\n");
}
