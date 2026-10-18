import assert from "node:assert/strict";
import test from "node:test";
import { archiveSnapshot, bodyTrackingEntries, weeklyReportText, reportAdherence } from "../lib/personalArchive.js";
import { dailyTrackingPlan, checkInAnswers, answersToCheckIn, trackingRows, trackingSeries, memberPathway, isEditableGoalCheckIn, canSaveDailyCheckIn } from "../lib/dailyTracking.js";

const now = new Date("2026-10-18T17:00:00");

test("native daily plans ask3 relevant questions with correct men's and prolapse scales", () => {
  const male = dailyTrackingPlan("intimacy", "mensPelvicHealth");
  assert.deepEqual(male.prompts.map((prompt) => prompt.title), ["Pelvic tension", "Erection support", "Lasting control"]);
  assert.deepEqual(male.prompts[0].choices.map((choice) => choice.value), [8, 4, 0]);
  assert.equal(dailyTrackingPlan("prolapse").prompts[0].title, "Heaviness or bulging");
  assert.equal(dailyTrackingPlan("prostateRecovery", "mensPelvicHealth").prompts[0].slot, "leak");
  const partial = answersToCheckIn({ confidence: 3 }, "intimacy");
  assert.deepEqual(partial, { goal: "intimacy", mood: "", leakLevel: null, painLevel: null, energyLevel: null, goalFeeling: 3 });
  assert.deepEqual(checkInAnswers(partial), { confidence: 3 });
});

test("focus replaces the matching storage slot and never adds unrelated questions", () => {
  const plan = dailyTrackingPlan("postpartum", "womensPelvicHealth", { title: "Leaks", tracking: { slot: "leak", title: "Leaks", question: "Any leaks?", choices: ["None", "A few", "Several"] } });
  assert.equal(plan.prompts.length, 3);
  assert.deepEqual(plan.prompts.map((prompt) => prompt.slot), ["discomfort", "leak", "confidence"]);
  assert.deepEqual(plan.prompts[1].choices.map((choice) => choice.value), [0, 1, 2]);
});

test("trends filter other goals, preserve unknown fields and label mixed legacy columns honestly", () => {
  const rows = [
    { id: "2026-10-17__intimacy", dateKey: "2026-10-17", goal: "intimacy", painLevel: 4, energyLevel: 3 },
    { id: "2026-10-16", dateKey: "2026-10-16", energyLevel: 2 },
    { id: "2026-10-18__bladderLeaks", dateKey: "2026-10-18", goal: "bladderLeaks", energyLevel: 5 },
  ];
  assert.equal(trackingRows(rows, "intimacy").length, 2);
  const series = trackingSeries(rows, dailyTrackingPlan("intimacy", "mensPelvicHealth"));
  assert.equal(series.find((entry) => entry.slot === "secondary").title, "Erection support + earlier energy check-ins");
  assert.equal(series.find((entry) => entry.slot === "secondary").higherIsBetter, true);
  assert.equal(series.find((entry) => entry.slot === "discomfort").higherIsBetter, false);
  assert.ok(!series.some((entry) => entry.slot === "leak"));
});

test("archive deduplicates cloud retries and avoids adding watched videos to routine minutes twice", () => {
  const completion = { id: "core_1", programID: "coreStrength", day: 1, completedAt: "2026-10-18T10:00:00", secondsWatched: 300 };
  const event = { id: "stable-video", goal: "coreStrength", date: "2026-10-18T09:59:00", videoID: "bridge", videoTitle: "Bridge", completed: true, secondsWatched: 300, programDay: 1 };
  const archive = archiveSnapshot({ member: { goal: "coreStrength" }, completions: [completion, completion], events: [event, event], now });
  assert.equal(archive.entries.filter((entry) => entry.kind === "workout").length, 1);
  assert.equal(archive.weeklyReports[0].workoutSessions, 1);
  assert.equal(archive.weeklyReports[0].workoutSeconds, 300);
  assert.match(weeklyReportText(archive.weeklyReports[0]), /Workout time: 5 min/);
});

test("audio Kegels count separately; incomplete audio never appears as a completed session", () => {
  const archive = archiveSnapshot({ member: { goal: "coreStrength" }, events: [{ id: "kegels", date: "2026-10-18T12:00:00", videoID: "audio-kegels.easy", completed: true, secondsWatched: 90 }], audioRecords: [{ id: "unfinished", goal: "coreStrength", sessionID: "core_find_deep", startedAt: "2026-10-18T10:00:00", completedAt: null }], now });
  assert.equal(archive.weeklyReports[0].workoutSessions, 1);
  assert.equal(archive.weeklyReports[0].audioSessions, 0);
  assert.equal(archive.weeklyReports[0].workoutSeconds, 90);
});

test("archive uses native tracker entries once, scopes men's goals, and omits private notes from summaries", () => {
  const member = { goal: "prostateRecovery", pathway: "mensPelvicHealth", trackers: { mens: { entries: [{ id: "a", date: "2026-10-18", goalRawValue: "prostateRecovery", ratings: { leaks: 2 }, note: "private secret" }, { id: "b", date: "2026-10-18", goalRawValue: "intimacy", ratings: { confidence: 3 } }] } } };
  const archive = archiveSnapshot({ member, now });
  assert.equal(archive.weeklyReports[0].bodyTrackingCount, 1);
  assert.ok(!JSON.stringify(archive).includes("private secret"));
  const cycle = bodyTrackingEntries({ pathway: "womensPelvicHealth", trackers: { womens: { periods: [{ start: "2026-10-01" }], cycleEntries: [{ id: "native-start", date: "2026-10-01", kind: "periodStarted" }] } } });
  assert.equal(cycle.length, 1);
});

test("empty history stays empty and future or very old events do not manufacture activity", () => {
  const archive = archiveSnapshot({ events: [{ id: "future", date: "2030-01-01", completed: true }, { id: "old", date: "2020-01-01", completed: true }], now });
  assert.equal(archive.days.length, 0);
  assert.equal(archive.weeklyReports.length, 26);
  assert.equal(archive.weeklyReports[0].workoutSessions, 0);
});

test("legacy men's goals infer the same pathway as the provider and include men's tracker records", () => {
  for (const goal of ["prostateRecovery", "bowelControl"]) {
    assert.equal(memberPathway({ goal }), "mensPelvicHealth");
    const archive = archiveSnapshot({ member: { goal, trackers: { mens: { entries: [{ id: goal, goalRawValue: goal, date: "2026-10-18", ratings: { control: 3 } }] } } }, now });
    assert.equal(archive.entries[0].kind, "mensHealth");
    assert.equal(archive.weeklyReports[0].bodyTrackingCount, 1);
  }
});

test("a native-keyed partial check-in with a zero answer counts once before noon", () => {
  const early = { id: "2026-10-18__prostateRecovery", goal: "prostateRecovery", leakLevel: "None", mood: "", dateKey: "2026-10-18" };
  const later = { ...early, date: "2026-10-18T08:00:00", leakLevel: "A Few" };
  const rows = trackingRows([early, later], "prostateRecovery");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].leakLevel, "A Few");
  const archive = archiveSnapshot({ member: { goal: "prostateRecovery" }, checkIns: [early], now: new Date("2026-10-18T09:00:00") });
  assert.equal(archive.weeklyReports[0].checkInCount, 1);
  assert.match(archive.entries[0].detail, /Leaks or drips: None/);
  assert.deepEqual(checkInAnswers({ painLevel: "", goalFeeling: null, leakLevel: "None" }), { leak: 0 });
});

test("report adherence uses inclusive calendar days and the native minimum denominator", () => {
  assert.equal(reportAdherence(3, new Date("2026-10-12T00:00:00"), new Date("2026-10-18T23:59:00"), 5), 60);
  assert.equal(reportAdherence(0, new Date("2026-10-18T00:00:00"), new Date("2026-10-18T18:00:00"), 5), 0);
  assert.equal(reportAdherence(1, new Date("2026-10-18T00:00:00"), new Date("2026-10-18T18:00:00"), 5), 100);
  assert.equal(reportAdherence(2, new Date("2026-10-17T12:00:00"), new Date("2026-10-18T23:00:00"), 5), 100);
});

test("an initial or failed check-in read blocks partial writes until saved answers are available", () => {
  const answers = { confidence: 3 };
  assert.equal(canSaveDailyCheckIn({ answers, loading: true }), false);
  assert.equal(canSaveDailyCheckIn({ answers, loadFailed: true }), false);
  assert.equal(canSaveDailyCheckIn({ answers, saving: true }), false);
  assert.equal(canSaveDailyCheckIn({ answers: {} }), false);
  assert.equal(canSaveDailyCheckIn({ answers: { discomfort: 0 } }), true);
  assert.equal(canSaveDailyCheckIn({ answers: { ...answers, discomfort: 4, secondary: 3 }, loading: false }), true);
});

test("legacy mood and goal-less values stay historical instead of becoming current clinical answers", () => {
  const legacy = { id: "2026-10-18", dateKey: "2026-10-18", mood: "😊", energyLevel: 3, painLevel: 4 };
  assert.equal(isEditableGoalCheckIn(legacy, "intimacy"), false);
  assert.equal(isEditableGoalCheckIn({ ...legacy, goal: "intimacy" }, "intimacy"), false);
  assert.equal(isEditableGoalCheckIn({ ...legacy, goal: "bladderLeaks", mood: "" }, "intimacy"), false);
  assert.equal(isEditableGoalCheckIn({ goal: "intimacy", mood: "", goalFeeling: 3 }, "intimacy"), true);
  assert.equal(isEditableGoalCheckIn({ goal: "intimacy", mood: "" }, "intimacy"), false);
  const history = trackingSeries([legacy], dailyTrackingPlan("intimacy", "mensPelvicHealth"));
  assert.equal(history.find((entry) => entry.slot === "secondary").title, "Earlier energy check-ins");
  assert.equal(history[0].data.length, 1);
});

test("replay and continuation aggregate sessions count with their recorded seconds", () => {
  for (const playbackContext of ["replay", "continuation"]) {
    const event = { id: `aggregate-${playbackContext}`, date: "2026-10-18T12:00:00", eventType: "session_completed", sessionCompleted: true, completed: true, playbackContext, secondsWatched: 0, sessionSecondsWatched: 300, programDay: 7, goal: "coreStrength" };
    const archive = archiveSnapshot({ member: { goal: "coreStrength" }, events: [event, event], now });
    assert.equal(archive.weeklyReports[0].workoutSessions, 1, playbackContext);
    assert.equal(archive.weeklyReports[0].workoutSeconds, 300, playbackContext);
    assert.match(archive.entries[0].title, playbackContext === "replay" ? /Replay/ : /Continuation/);
  }
});

test("program aggregate, banked completion and watched clips describe one routine; replay adds one more", () => {
  const session = { id: "program-session", date: "2026-10-18T10:00:00", sessionCompleted: true, completed: true, playbackContext: "program", sessionSecondsWatched: 300, secondsWatched: 0, goal: "coreStrength", programDay: 1 };
  const completion = { id: "banked-day", completedAt: "2026-10-18T10:00:00", programID: "coreStrength", day: 1, secondsWatched: 300 };
  const video = { id: "watched-clip", date: "2026-10-18T09:59:00", videoID: "bridge", completed: true, secondsWatched: 300, programDay: 1, goal: "coreStrength" };
  const one = archiveSnapshot({ member: { goal: "coreStrength" }, events: [session, video], completions: [completion], now });
  assert.equal(one.weeklyReports[0].workoutSessions, 1);
  assert.equal(one.weeklyReports[0].workoutSeconds, 300);
  const two = archiveSnapshot({ member: { goal: "coreStrength" }, events: [session, video, { ...session, id: "replay-session", date: "2026-10-18T12:00:00", playbackContext: "replay" }, { ...video, id: "replay-clip", date: "2026-10-18T11:59:00" }], completions: [completion], now });
  assert.equal(two.weeklyReports[0].workoutSessions, 2);
  assert.equal(two.weeklyReports[0].workoutSeconds, 600);
});
