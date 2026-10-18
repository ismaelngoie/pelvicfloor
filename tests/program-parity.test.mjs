import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadModule = async (name) => import(`data:text/javascript;base64,${Buffer.from(await readFile(path.join(root, "lib", name), "utf8")).toString("base64")}`);
const program = await loadModule("program.js");
const adaptation = await loadModule("planAdaptation.js");
const prescription = await loadModule("exercisePrescription.js");
const json = async (name) => JSON.parse(await readFile(path.join(root, "public/content", name), "utf8"));
const catalogFile = await json("video_catalog.json");
const master = await json("programs.json");
const catalog = { ...catalogFile, byId: new Map(catalogFile.videos.map((video) => [video.id, video])) };
const byGoal = new Map(master.programs.map((value) => [value.goal, value]));
const nativeContent = path.join(root, "../PelvicFloor/Pelvic Floor/Core/Content");

// This comparison is available in the desktop sibling checkout used for the
// native parity audit; the self-contained integrity check also runs in CI.
test("all shipped program and video bundles equal the native files byte for byte", { skip: !existsSync(nativeContent) }, async () => {
  const names = (await readdir(nativeContent)).filter((name) => name.startsWith("programs") && name.endsWith(".json") || name === "video_catalog.json");
  assert.equal(names.length, 14);
  for (const name of names) assert.deepEqual(await readFile(path.join(root, "public/content", name)), await readFile(path.join(nativeContent, name)), name);
});

test("all twelve native goals have a complete validated 90-day program", async () => {
  assert.equal(master.version, 3);
  assert.equal(catalog.version, 2);
  assert.equal(catalog.videos.length, 533);
  assert.equal(program.validateContentPair(catalog, master), null);
  for (const goal of program.PROGRAM_GOALS) {
    const bundle = await json(`programs_${goal}.json`);
    assert.equal(bundle.version, master.version);
    assert.deepEqual(bundle.programs, [byGoal.get(goal)]);
  }
  const incomplete = structuredClone(master);
  incomplete.programs.pop();
  assert.ok(program.validateContentPair(catalog, incomplete));
  const broken = structuredClone(master);
  broken.programs[0].weeks[0].days[0].videoIDs.push("missing-video");
  assert.ok(program.validateContentPair(catalog, broken));
  const duplicate = structuredClone(catalogFile);
  duplicate.videos.push(duplicate.videos[0]);
  assert.ok(program.validateContentPair(duplicate, master));
});

test("member goal grids match native pathways and public goals stay unchanged", () => {
  assert.deepEqual(program.selectableGoalsForPathway().map((goal) => goal.id), ["intimacy", "bladderLeaks", "postpartum", "diastasisRecti", "prolapse", "pelvicPain", "coreStrength", "fitness"]);
  assert.deepEqual(program.selectableGoalsForPathway("mensPelvicHealth").map((goal) => goal.id), ["bladderLeaks", "intimacy", "prostateRecovery", "pelvicPain", "bowelControl", "coreStrength"]);
  assert.equal(program.memberGoalById("intimacy", "mensPelvicHealth").title, "Erectile Dysfunction");
  assert.equal(program.memberGoalById("diastasisRecti").title, "Fix Diastasis Recti");
  assert.deepEqual(program.GOALS.map((goal) => [goal.id, goal.title]), [["intimacy", "Improve Intimacy"], ["bladderLeaks", "Stop Bladder Leaks"], ["postpartum", "Recover Postpartum"], ["coreStrength", "Build Core Strength"], ["pelvicPain", "Ease Pelvic Pain"], ["pregnancyPrep", "Prepare for Pregnancy"], ["diastasisRecti", "Heal Diastasis Recti"], ["fitness", "Support My Fitness"]]);
});

test("midnight unlocking scopes progress to its goal and rejects invalid days", () => {
  const plan = byGoal.get("coreStrength");
  const today = new Date(2026, 9, 18, 20);
  const records = [
    { programID: "coreStrength", day: 1, completedAt: new Date(2026, 9, 18, 12) },
    { programID: "pelvicPain", day: 2, completedAt: new Date(2026, 9, 17, 12) },
    { programID: "coreStrength", day: 91, completedAt: today },
    { programID: "coreStrength", day: 1.5, completedAt: today },
    { programID: "coreStrength", day: -1, completedAt: today },
  ];
  const locked = program.programState(plan, records, today);
  assert.equal(locked.currentDayNumber, 2);
  assert.equal(locked.completedDayCount, 1);
  assert.equal(locked.currentDayUnlocked, false);
  assert.equal(locked.sessionDayNumber, 1);
  assert.equal(locked.bankableDayNumber, null);
  const unlocked = program.programState(plan, records, new Date(2026, 9, 19, 0, 1));
  assert.equal(unlocked.currentDayUnlocked, true);
  assert.equal(unlocked.bankableDayNumber, 2);
  const graduated = program.programState(plan, Array.from({ length: 90 }, (_, i) => ({ programID: "coreStrength", day: i + 1, completedAt: new Date(2026, 8, 1) })), today);
  assert.equal(graduated.currentDayNumber, 90);
  assert.equal(graduated.graduated, true);
  assert.equal(graduated.bankableDayNumber, null);
  assert.equal(program.programState({ weeks: [] }, [], today).graduated, false);
});

test("men intimacy copy covers the whole plan without changing exercises", () => {
  const original = byGoal.get("intimacy");
  const personalized = program.personalizeProgram(original, "mensPelvicHealth");
  assert.equal(personalized.title, "The 90-Day Erection and Control Plan");
  assert.equal(personalized.weeks[0].days[0].title, "Find the Muscles Without Gripping");
  assert.match(program.allDays(personalized)[89].intention, /ejaculation control/);
  assert.deepEqual(program.allDays(personalized).map((day) => day.videoIDs), program.allDays(original).map((day) => day.videoIDs));
  assert.equal(program.personalizeProgram(original, "womensPelvicHealth"), original);
});

test("all 29 curated intimacy variants resolve, and missing content retains the authored day", () => {
  let count = 0;
  for (const [focusId, days] of Object.entries(adaptation.INTIMACY_FIRST_WEEK)) {
    for (const [dayNumber, ids] of Object.entries(days)) {
      const authored = program.videosForDay(program.allDays(byGoal.get("intimacy"))[Number(dayNumber) - 1], catalog);
      const result = adaptation.focusAdapted(authored, { goalId: "intimacy", focusId, programDay: Number(dayNumber), catalog });
      assert.deepEqual(result.map((video) => video.id), ids);
      assert.equal(new Set(result.map((video) => video.id)).size, ids.length);
      const broken = { videos: [], byId: new Map() };
      assert.equal(adaptation.focusAdapted(authored, { goalId: "intimacy", focusId, programDay: Number(dayNumber), catalog: broken }), authored);
      count += 1;
    }
  }
  assert.equal(count, 29);
});

test("focus ordering is stable, preserves authored videos, and works beyond week one", () => {
  const day = program.allDays(byGoal.get("bladderLeaks"))[30];
  const videos = program.videosForDay(day, catalog);
  const reordered = adaptation.adaptPlaylist(videos, { goalId: "bladderLeaks", focusId: "bladder.urgency", programDay: 31, catalog });
  assert.deepEqual(new Set(reordered.map((video) => video.id)), new Set(videos.map((video) => video.id)));
  const scores = reordered.map((video) => adaptation.adaptationScore(video, "bladder.urgency"));
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test("feedback changes challenge, expires after seven whole days, and audio worse softens the next start", () => {
  const videos = program.videosForDay(program.allDays(byGoal.get("coreStrength"))[4], catalog);
  const now = new Date(2026, 9, 18, 20);
  const pain = { response: "pain", date: new Date(2026, 9, 18, 12) };
  const softened = adaptation.adaptPlaylist(videos, { goalId: "coreStrength", catalog, feedback: pain, now });
  assert.notEqual(softened[0].id, videos[0].id);
  assert.ok(adaptation.replacementScore(softened[0], "pain") >= 20);
  assert.deepEqual(adaptation.adaptPlaylist(videos, { goalId: "coreStrength", catalog, feedback: { ...pain, date: new Date(2026, 9, 10, 12) }, now }), videos);
  assert.deepEqual(adaptation.adaptPlaylist(videos, { goalId: "coreStrength", catalog, audioOutcome: "worse", now }), softened);
  const hard = adaptation.adaptPlaylist(videos, { goalId: "coreStrength", catalog, difficulty: "hard", now });
  assert.ok(hard.some((video) => !videos.some((original) => original.id === video.id)));
  assert.equal(adaptation.difficultyAfterFeedback("pain", "hard"), "easy");
  assert.equal(adaptation.difficultyAfterFeedback("tooEasy", "easy"), "hard");
  assert.equal(adaptation.difficultyAfterFeedback("couldNotFeel", "easy", true), "medium");
  assert.ok(adaptation.adaptedProgramVideos(videos, { goalId: "coreStrength", catalog, feedback: { response: "couldNotFeel", date: now }, now })[0].id.startsWith("perfect-your-form-"));
});

test("replacement goal filters exclude impact for pregnancy, pelvic pain and prolapse", () => {
  const candidates = { videos: [
    { id: "jump", title: "Power Jumping Jack", url: "https://example.com/jump", tags: ["strength", "core", "cardio"], durationSeconds: 60 },
    { id: "headstand", title: "Inverted Headstand", url: "https://example.com/headstand", tags: ["strength", "core"], durationSeconds: 60 },
    { id: "safe", title: "Supported Squat", url: "https://example.com/squat", tags: ["strength", "core"], durationSeconds: 60 },
    { id: "invalid", title: "Advanced Plank", url: "http://example.com/plank", tags: ["strength", "core"], durationSeconds: 60 },
  ] };
  assert.equal(adaptation.bestReplacements(candidates, { goalId: "pregnancyPrep", response: "tooEasy", count: 4 }).some((video) => ["jump", "headstand", "invalid"].includes(video.id)), false);
  assert.equal(adaptation.bestReplacements(candidates, { goalId: "prolapse", response: "tooEasy", count: 4 }).some((video) => video.id === "jump"), false);
});

test("continuation rotates exact source days 61 through 90 in native phases", () => {
  const completedAt = new Date(2026, 8, 1, 10);
  const completions = [{ programID: "coreStrength", day: 90, completedAt }];
  for (let offset = 0; offset < 60; offset += 1) {
    const now = new Date(completedAt);
    now.setDate(now.getDate() + offset);
    const result = adaptation.continuationState(completions, "coreStrength", now);
    assert.equal(result.cycleDay, offset % 30 + 1);
    assert.equal(result.sourceDayNumber, 61 + offset % 30);
    assert.equal(result.phase.week, Math.min(5, Math.floor((offset % 30) / 7) + 1));
  }
});

test("prescriptions preserve native doses, side changes, difficulty and calibrated recovery", () => {
  const squat = { title: "Standing Squat", tags: ["strength"], format: "mp4" };
  const easy = prescription.exercisePrescription(squat, { goalId: "coreStrength", programDay: 1 });
  assert.equal(easy.doseLine, "2 rounds · 8 slow reps");
  assert.equal(easy.restSeconds, 15);
  const hard = prescription.exercisePrescription(squat, { goalId: "coreStrength", programDay: 1, difficulty: "hard" });
  assert.equal(hard.rounds, 3);
  assert.equal(hard.repetitions, 12);
  assert.equal(hard.restSeconds, 12);
  const sensitive = prescription.exercisePrescription({ title: "Seated Diaphragmatic Breathing", tags: ["breathing"] }, { goalId: "pelvicPain", focusId: "pain.tightness" });
  assert.equal(sensitive.workSeconds, 45);
  assert.match(sensitive.setup, /feet fully supported/);
  const senior = { age: 78, healthConditions: [{ title: "Recent surgery" }], heightInches: 64, weightLbs: 215 };
  const calibrated = prescription.planCalibration(senior, { goalId: "coreStrength" });
  assert.equal(calibrated.startingDoseScale, 0.7);
  assert.equal(calibrated.minimumRestSeconds, 24);
  assert.ok(calibrated.bmi > 35);
  const early = prescription.exercisePrescription(squat, { goalId: "coreStrength", programDay: 1, member: senior });
  assert.equal(early.rounds, 1);
  assert.equal(early.repetitions, 6);
  const late = prescription.exercisePrescription(squat, { goalId: "coreStrength", programDay: 90, member: senior });
  assert.equal(late.rounds, 3);
  assert.equal(late.repetitions, 9);
  const sides = prescription.exercisePrescription({ title: "Single Leg Bridge", tags: ["strength"] }, { goalId: "coreStrength" });
  assert.equal(sides.sides, "eachSide");
  assert.match(sides.restLine, /8 sec to change sides/);
  assert.equal(sides.estimatedPracticeSeconds, sides.workSegmentSeconds * sides.rounds * 2 + 8 * sides.rounds + (sides.rounds - 1) * sides.restSeconds);
  const transition = prescription.exerciseTransition(squat, { title: "Supine Bridge" }, { member: senior, goalId: "coreStrength" });
  assert.equal(transition.seconds, 18);
  assert.equal(transition.isPositionChange, true);
});

test("feedback merge deduplicates and caps history while preserving newest difficulty", () => {
  const base = adaptation.emptyPlanPreferences();
  const merged = adaptation.mergePlanPreferences({ ...base, difficultyByGoal: { coreStrength: "hard" }, modifiedAt: "2026-10-18", feedbackRecords: [{ id: "shared", goal: "coreStrength", response: "pain", date: "2026-10-18" }] },
    { ...base, difficultyByGoal: { coreStrength: "easy", pelvicPain: "easy" }, modifiedAt: "2026-10-17", feedbackRecords: [{ id: "shared", goal: "coreStrength", response: "pain", date: "2026-10-18" }] });
  assert.equal(merged.difficultyByGoal.coreStrength, "hard");
  assert.equal(merged.difficultyByGoal.pelvicPain, "easy");
  assert.equal(merged.feedbackRecords.length, 1);
});

const ledger = await loadModule("playbackLedger.js");

test("playback ledger records full demo and guided work once, without early day credit", () => {
  const state = ledger.createPlaybackLedger(1);
  for (let i = 0; i < 80; i += 1) ledger.addPlaybackDelta(state, 0, 1);
  ledger.markExerciseComplete(state, 0);
  assert.equal(ledger.playbackSummary(state).qualifies, true);
  assert.equal(state.finalized, false);
  assert.equal(state.entries.get(0).recorded, false);
  for (let i = 0; i < 20; i += 1) ledger.addPlaybackDelta(state, 0, 1);
  ledger.resolveExercisePractice(state, 0, 95);
  assert.deepEqual(ledger.takePlaybackEvent(state, 0), { completed: true, secondsWatched: 195 });
  assert.equal(ledger.takePlaybackEvent(state, 0), null);
  assert.equal(ledger.playbackSummary(state).seconds, 195);
  assert.equal(state.entries.get(0).practiceResolved, true);
});

test("rejected day save stays retryable; successful session finalization is idempotent", async () => {
  const state = ledger.createPlaybackLedger(5);
  for (let i = 0; i < 3; i += 1) { ledger.addPlaybackDelta(state, i, 1); ledger.markExerciseComplete(state, i); }
  let dayWrites = 0;
  let summaries = 0;
  const rejected = await ledger.finalizePlaybackSession(state, { day: 4, onDayComplete: async () => { dayWrites += 1; return false; }, onSessionComplete: async () => { summaries += 1; } });
  assert.equal(rejected.saveFailed, true);
  assert.equal(state.dayCredited, false);
  assert.equal(state.finalized, false);
  assert.equal(summaries, 0);
  const saved = await ledger.finalizePlaybackSession(state, { day: 4, onDayComplete: async () => { dayWrites += 1; return true; }, onSessionComplete: async () => { summaries += 1; } });
  assert.equal(saved.credited, true);
  assert.equal(state.finalized, true);
  await ledger.finalizePlaybackSession(state, { day: 4, onDayComplete: async () => { dayWrites += 1; return true; }, onSessionComplete: async () => { summaries += 1; } });
  assert.equal(dayWrites, 2);
  assert.equal(summaries, 1);
});

test("unqualified or simultaneous finish cannot duplicate or invent completion", async () => {
  const state = ledger.createPlaybackLedger(5);
  ledger.markExerciseComplete(state, 4);
  let writes = 0;
  const incomplete = await ledger.finalizePlaybackSession(state, { day: 1, onDayComplete: async () => { writes += 1; return true; } });
  assert.equal(incomplete.qualifies, false);
  assert.equal(writes, 0);
  ledger.markExerciseComplete(state, 0); ledger.markExerciseComplete(state, 1);
  let release;
  const first = ledger.finalizePlaybackSession(state, { day: 1, onDayComplete: () => { writes += 1; return new Promise((resolve) => { release = resolve; }); } });
  const duplicate = await ledger.finalizePlaybackSession(state, { day: 1, onDayComplete: async () => { writes += 1; return true; } });
  assert.equal(duplicate.pending, true);
  assert.equal(writes, 1);
  release(true);
  assert.equal((await first).credited, true);
});

test("seeking and pause do not create watch time; skipped practice adds zero seconds", () => {
  const state = ledger.createPlaybackLedger(1);
  ledger.addPlaybackDelta(state, 0, 0.8);
  ledger.addPlaybackDelta(state, 0, 50);
  ledger.addPlaybackDelta(state, 0, -3);
  ledger.addPlaybackDelta(state, 0, 1, false);
  ledger.resolveExercisePractice(state, 0, 0);
  assert.equal(ledger.playbackSummary(state).seconds, 0.8);
  assert.equal(state.entries.get(0).practiceResolved, true);
  const event = ledger.takePlaybackEvent(state, 0);
  assert.equal(event.secondsWatched, 0.8);
  ledger.retryPlaybackEvent(state, 0);
  assert.deepEqual(ledger.takePlaybackEvent(state, 0), event);
});

test("practice segment time equals native estimated dose and side change is eight seconds", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    const plan = prescription.exercisePrescription({ title: "Single Leg Bridge", tags: ["strength"] }, { goalId: "coreStrength", programDay: 41, difficulty });
    const segments = ledger.practiceSegments(plan);
    assert.equal(segments.reduce((total, value) => total + value.seconds, 0), plan.estimatedPracticeSeconds);
    assert.ok(segments.filter((value) => value.stage === "sideChange").every((value) => value.seconds === 8));
  }
  const follow = prescription.exercisePrescription({ title: "Full Routine", tags: ["strength"], durationSeconds: 180 }, { goalId: "fitness" });
  assert.equal(follow.offersGuidedPractice, false);
  assert.equal(follow.doseLine, "Follow the coach once");
});

test("player request keeps replay prescription stage and daily context separate from bankability", () => {
  const video = catalog.videos[0];
  const replay = ledger.normalizePlaybackRequest({ videos: [video], prescriptionDay: 1, playbackContext: "replay", dayContext: null });
  assert.equal(replay.prescriptionDay, 1);
  assert.equal(replay.playbackContext, "replay");
  assert.equal(replay.dayContext, null);
  assert.equal(ledger.normalizePlaybackRequest({ videos: [video] }).playbackContext, "library");
  assert.equal(ledger.normalizePlaybackRequest({ videos: [video], dayContext: { day: 24 } }).prescriptionDay, 24);
  assert.equal(ledger.allowsPlaybackShortcut({ tagName: "DIV" }), true);
  assert.equal(ledger.allowsPlaybackShortcut({ tagName: "DIV", practice: {} }), false);
  assert.equal(ledger.allowsPlaybackShortcut({ tagName: "DIV", transition: {} }), false);
  assert.equal(ledger.allowsPlaybackShortcut({ tagName: "BUTTON" }), false);
});

test("Coach Mode guidance uses native exercise branches and goal-specific purpose", () => {
  const breathing = prescription.exerciseGuidance({ title: "Seated Breathing", tags: ["breathing"] }, { goalId: "pelvicPain" });
  assert.equal(breathing.purpose, "Help an overactive pelvic floor release and make comfortable movement easier.");
  assert.match(breathing.avoid, /bear down/);
  const bridge = prescription.exerciseGuidance({ title: "Glute Bridge", tags: ["core"] }, { goalId: "bladderLeaks" });
  assert.match(bridge.feel, /heels/);
  assert.equal(bridge.firstCue, bridge.feel);
  const core = prescription.exerciseGuidance({ title: "Dead Bug", tags: ["core"] }, { goalId: "diastasisRecti" });
  assert.match(core.purpose, /abdominal wall/);
});

const accountEpoch = await loadModule("accountEpoch.js");

test("account epoch drops delayed profile/history from an earlier signed-in account", async () => {
  const guard = accountEpoch.createAccountEpoch();
  guard.switchUser("account-a");
  guard.bindMember("member-a");
  const oldAuth = guard.captureAuth("account-a");
  const oldMember = guard.captureMember("member-a");
  let releaseProfile;
  let releaseHistory;
  let currentProfile = { id: "member-a", name: "A" };
  let currentHistory = ["a-history"];
  const pendingProfile = new Promise((resolve) => { releaseProfile = resolve; }).then((profile) => {
    if (guard.isCurrentAuth(oldAuth)) { guard.bindMember(profile.id); currentProfile = profile; }
  });
  const pendingHistory = new Promise((resolve) => { releaseHistory = resolve; }).then((history) => {
    if (guard.isCurrentMember(oldMember)) currentHistory = history;
  });
  guard.switchUser("account-b");
  currentProfile = null; currentHistory = [];
  guard.bindMember("member-b");
  currentProfile = { id: "member-b", name: "B" }; currentHistory = ["b-history"];
  releaseProfile({ id: "member-a", name: "Old A result" });
  releaseHistory(["old-a-history"]);
  await Promise.all([pendingProfile, pendingHistory]);
  assert.deepEqual(currentProfile, { id: "member-b", name: "B" });
  assert.deepEqual(currentHistory, ["b-history"]);
});

test("old authorized write may finish on server without patching a new current member", async () => {
  const guard = accountEpoch.createAccountEpoch();
  guard.switchUser("a"); guard.bindMember("member-a");
  const scope = guard.captureMember("member-a");
  let release;
  let serverWriteFinished = false;
  let profile = { id: "member-a", difficulty: "easy" };
  const save = new Promise((resolve) => { release = resolve; }).then(() => {
    serverWriteFinished = true;
    if (guard.isCurrentMember(scope) && profile.id === scope.memberId) profile = { ...profile, difficulty: "hard" };
  });
  guard.switchUser(null); guard.switchUser("b"); guard.bindMember("member-b");
  profile = { id: "member-b", difficulty: "easy" };
  release(); await save;
  assert.equal(serverWriteFinished, true);
  assert.deepEqual(profile, { id: "member-b", difficulty: "easy" });
});

test("signing back into the same UID never revives an old epoch or another member binding", () => {
  const guard = accountEpoch.createAccountEpoch();
  guard.switchUser("a"); guard.bindMember("member-a");
  const first = guard.captureMember("member-a");
  assert.equal(guard.isCurrentMember(first), true);
  guard.switchUser(null); guard.switchUser("a"); guard.bindMember("member-a");
  assert.equal(guard.isCurrentMember(first), false);
  const second = guard.captureMember("member-a");
  guard.bindMember("linked-ios-record-a");
  assert.equal(guard.isCurrentMember(second), false);
  assert.equal(guard.isCurrentMember(guard.captureMember("linked-ios-record-a")), true);
  assert.equal(guard.isCurrentMember(guard.captureMember("member-a")), false);
});

test("only the newest profile load may bind a member for the same signed-in UID", () => {
  const guard = accountEpoch.createAccountEpoch();
  guard.switchUser("a");
  const older = guard.beginProfileLoad("a");
  const newer = guard.beginProfileLoad("a");
  assert.equal(guard.isCurrentProfile(older), false);
  assert.equal(guard.isCurrentProfile(newer), true);
  const staleOtherUser = guard.beginProfileLoad("b");
  assert.equal(guard.isCurrentProfile(staleOtherUser), false);
  assert.equal(guard.isCurrentProfile(newer), true);
});

test("old player requests and callbacks are hidden/rejected on auth or member boundary", () => {
  const ownerA = accountEpoch.memberIdentity("a", "member-a");
  const ownerB = accountEpoch.memberIdentity("b", "member-b");
  let currentOwner = ownerA;
  let writes = 0;
  const oldRequest = { ownerIdentity: ownerA };
  const oldCallback = () => { if (accountEpoch.ownsMemberIdentity(oldRequest.ownerIdentity, currentOwner)) writes += 1; };
  oldCallback(); assert.equal(writes, 1);
  currentOwner = ownerB;
  assert.equal(accountEpoch.ownsMemberIdentity(oldRequest.ownerIdentity, currentOwner), false);
  oldCallback(); assert.equal(writes, 1);
  currentOwner = accountEpoch.memberIdentity("a", "new-linked-member-a");
  oldCallback(); assert.equal(writes, 1);
  currentOwner = null;
  oldCallback(); assert.equal(writes, 1);
  assert.equal(accountEpoch.memberIdentity("a", null), null);
});

test("continuation/replay completion save can fail then succeed without losing earned work", async () => {
  for (const context of ["continuation", "replay"]) {
    const state = ledger.createPlaybackLedger(2);
    ledger.resolveExercisePractice(state, 0, 48);
    ledger.resolveExercisePractice(state, 1, 52);
    let summaries = 0;
    const failed = await ledger.finalizePlaybackSession(state, {
      requireSessionRecord: true,
      onSessionComplete: async () => { summaries += 1; return false; },
    });
    assert.equal(failed.saveFailed, true, context);
    assert.equal(state.finalized, false, context);
    assert.equal(ledger.playbackSummary(state).seconds, 100, context);
    const saved = await ledger.finalizePlaybackSession(state, {
      requireSessionRecord: true,
      onSessionComplete: async () => { summaries += 1; return true; },
    });
    assert.equal(saved.success, true, context);
    assert.equal(state.finalized, true, context);
    await ledger.finalizePlaybackSession(state, {
      requireSessionRecord: true,
      onSessionComplete: async () => { summaries += 1; return true; },
    });
    assert.equal(summaries, 2, context);
  }
});

test("a banked program day remains complete if its optional summary event fails", async () => {
  const state = ledger.createPlaybackLedger(1);
  ledger.resolveExercisePractice(state, 0, 60);
  const saved = await ledger.finalizePlaybackSession(state, {
    day: 12,
    onDayComplete: async () => true,
    onSessionComplete: async () => { throw new Error("offline"); },
  });
  assert.equal(saved.credited, true);
  assert.equal(saved.success, true);
  assert.equal(state.finalized, true);
});
