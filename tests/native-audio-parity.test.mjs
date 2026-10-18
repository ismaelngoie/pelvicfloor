import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AUDIO_SESSIONS, audioJourneyDay, audioScript, audioSessionsFor, dashboardAudioSession } from "../lib/audioCatalog.js";
import { URGE_MODES, KEGEL_SETS } from "../components/member/sessionScripts.js";
import { beginAudioListen, completeAudioListen, readAudioJourney, recommendAudio, toggleAudioFavorite, isAudioFavorite, latestAudioOutcome, audioWhatHelped } from "../lib/audioJourney.js";

test("every native audio session has its own script, transcript and real recording", () => {
  assert.equal(AUDIO_SESSIONS.length, 54);
  assert.equal(new Set(AUDIO_SESSIONS.map((session) => session.id)).size, 54);
  for (const session of AUDIO_SESSIONS) {
    const script = audioScript(session);
    assert.ok(script.totalDuration > 0);
    assert.equal(script.steps.length, session.beats.length);
    assert.equal(script.stepOffsets.at(-1) + script.steps.at(-1).duration, script.totalDuration);
    const asset = fileURLToPath(new URL(`../public/audio/${session.continuousTrackID}.mp3`, import.meta.url));
    assert.ok(existsSync(asset), session.id);
    assert.ok(readFileSync(asset).length > 1000, session.id);
  }
});

test("goal and pathway isolation prevents a generic strengthening set replacing pain or intimacy support", () => {
  assert.equal(audioSessionsFor("intimacy", "womensPelvicHealth").length, 8);
  assert.equal(audioSessionsFor("intimacy", "mensPelvicHealth").length, 4);
  assert.equal(audioSessionsFor("intimacy", "womensPelvicHealth", "intimacy.comfort")[0].id, "intimacy_relax_before");
  assert.equal(audioSessionsFor("intimacy", "mensPelvicHealth", "maleSexual.erectionQuality")[0].id, "mens_erection_support");
  assert.equal(dashboardAudioSession("pelvicPain").id, "pain_flare");
  assert.equal(dashboardAudioSession("postpartum").id, "postpartum_recovery_reset");
  const stability = audioSessionsFor("stability");
  assert.equal(stability.length, 4);
  assert.ok(stability.every((session) => session.goal === "stability" && session.id.startsWith("stability_")));
});

test("the native rescue scripts stay exactly sixty seconds and all exercise cues have recordings", () => {
  assert.deepEqual(URGE_MODES.map((mode) => mode.script.totalDuration), [60, 60]);
  assert.deepEqual(KEGEL_SETS.map((set) => [set.id, set.script.repTotal, set.script.totalDuration]), [["quickSet", 12, 125], ["gentle", 10, 99], ["standard", 10, 129], ["strong", 10, 189]]);
  for (const { script } of [...URGE_MODES, ...KEGEL_SETS]) {
    for (const step of script.steps) {
      for (const cue of step.cues) {
        assert.ok(cue.at < step.duration, `${script.id}: ${cue.text}`);
        assert.ok(existsSync(fileURLToPath(new URL(`../public/audio/${cue.clipID}.mp3`, import.meta.url))), cue.clipID);
      }
    }
  }
  // Native short sets teach the lift first and alternate release language.
  const quick = KEGEL_SETS[0].script;
  assert.equal(quick.steps[2].cues[0].clipID, "lift_up_and_in");
  assert.equal(quick.steps[3].cues[0].clipID, "release");
});

test("audio recommendations continue unfinished listens and react to real outcomes", () => {
  const sessions = audioSessionsFor("pelvicPain");
  const empty = { records: [], favorites: {} };
  assert.equal(recommendAudio(sessions, empty, 2).id, sessions[1].id);
  const record = { id: "1", sessionID: sessions[0].id, goal: "pelvicPain", startedAt: new Date().toISOString(), completedAt: null };
  assert.equal(recommendAudio(sessions, { ...empty, records: [record] }, 4).id, sessions[0].id);
  const better = { ...record, completedAt: new Date().toISOString(), outcome: "better" };
  assert.equal(recommendAudio(sessions, { ...empty, records: [better] }, 4).id, sessions[0].id);
  assert.equal(recommendAudio(sessions, { ...empty, records: [{ ...better, outcome: "worse" }] }, 1).id, sessions[1].id);
});

test("history preserves an interrupted listen and keeps different members separate", () => {
  const session = audioSessionsFor("pelvicPain")[0];
  const one = `member_${Math.random()}`; const other = `member_${Math.random()}`;
  const id = beginAudioListen(one, session, 2);
  assert.equal(readAudioJourney(one).records[0].completedAt, null);
  assert.equal(readAudioJourney(other).records.length, 0);
  completeAudioListen(one, id);
  assert.ok(readAudioJourney(one).records[0].completedAt);
  assert.equal(readAudioJourney(one).records[0].outcome, null);
  completeAudioListen(one, id, "worse");
  assert.equal(latestAudioOutcome(one, "pelvicPain"), "worse");
  toggleAudioFavorite(one, session.id);
  assert.equal(isAudioFavorite(readAudioJourney(one), session.id), true);
  assert.equal(isAudioFavorite(readAudioJourney(other), session.id), false);
});

test("what-helped observations require at least two completed outcome records", () => {
  const sessions = audioSessionsFor("pelvicPain");
  const record = { sessionID: sessions[0].id, goal: "pelvicPain", completedAt: new Date().toISOString(), outcome: "better" };
  assert.equal(audioWhatHelped({ records: [record] }, "pelvicPain", sessions), null);
  assert.match(audioWhatHelped({ records: [record, record] }, "pelvicPain", sessions), /2 of 2 completed listens/);
});

test("audio recommendations keep advancing after graduation instead of pinning to day ninety", () => {
  assert.equal(audioJourneyDay(24, false, [], new Date(2026, 9, 18)), 24);
  const completions = [{ day: 90, completedAt: new Date(2026, 9, 15, 23).toISOString() }];
  assert.equal(audioJourneyDay(90, true, completions, new Date(2026, 9, 18, 1)), 94);
});
