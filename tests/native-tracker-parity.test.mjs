import assert from "node:assert/strict";
import test from "node:test";
import {
  MENOPAUSE_SYMPTOMS, WATER_DRINKS, cycleEntries, cycleObservation, cycleSummary,
  dayKey, deleteWaterEntry, logWater, menopausePattern, mensPattern, mensTrackerPlan,
  normalizeMenopause, normalizeMens, normalizeWater, saveDatedEntry, savePeriod,
  setWaterGoal, trackerStreak, vesselMilliliters, waterEntry, waterStreak,
} from "../lib/trackerModels.js";

test("water presets match native drink types and volumes, including irritants", () => {
  assert.deepEqual(WATER_DRINKS.map((drink) => [drink.id, drink.milliliters, drink.irritant]), [["glass", 250, false], ["bottle", 500, false], ["tea", 250, true], ["coffee", 150, true], ["wine", 150, true]]);
  let water = logWater({}, WATER_DRINKS[0], new Date(2026, 9, 18, 9));
  water = logWater(water, WATER_DRINKS[3], new Date(2026, 9, 18, 10));
  assert.equal(water.days["2026-10-18"], 400);
  assert.equal(water.entries["2026-10-18"].length, 2);
  assert.ok(water.entries["2026-10-18"].every((entry) => entry.at));
  const removeId = water.entries["2026-10-18"][0].id;
  water = deleteWaterEntry(water, "2026-10-18", removeId);
  assert.equal(water.days["2026-10-18"], 150);
  assert.equal(waterEntry(water.entries["2026-10-18"][0]).irritant, true);
});

test("water goal changes preserve earlier goals and an unfinished today keeps yesterday's streak", () => {
  let water = normalizeWater({ goalML: 1500, days: { "2026-10-16": 1600, "2026-10-17": 1700 } });
  water = setWaterGoal(water, 2500, new Date(2026, 9, 18));
  water = logWater(water, WATER_DRINKS[0], new Date(2026, 9, 18));
  assert.equal(water.dailyGoals["2026-10-16"], 1500);
  assert.equal(water.dailyGoals["2026-10-18"], 2500);
  assert.equal(waterStreak(water, new Date(2026, 9, 18)), 2);
  assert.equal(waterStreak(water, new Date(2026, 9, 19)), 0);
});

test("custom vessel entries snapshot their name and volume, independent of later edits", () => {
  assert.equal(vesselMilliliters(32, "fluidOunces"), 946);
  assert.equal(vesselMilliliters(1, "fluidOunces"), null);
  assert.equal(vesselMilliliters(4001, "milliliters"), null);
  const vessel = { id: "stanley", name: "Stanley", milliliters: 946 };
  const water = logWater({}, vessel, new Date(2026, 9, 18));
  vessel.name = "Renamed"; vessel.milliliters = 500;
  assert.equal(waterEntry(water.entries["2026-10-18"][0]).title, "Stanley");
  assert.equal(water.days["2026-10-18"], 946);
});

test("legacy water totals survive migration, and removal never resurrects them", () => {
  const water = normalizeWater({ days: { "2026-10-18": 475 } });
  assert.equal(water.days["2026-10-18"], 475);
  assert.equal(water.entries["2026-10-18"][0].at, null);
  const next = deleteWaterEntry(water, "2026-10-18", water.entries["2026-10-18"][0].id);
  assert.equal(normalizeWater(next).days["2026-10-18"], 0);
});

test("cycle estimates require two starts and use median recent valid intervals", () => {
  const entries = [{ kind: "periodStarted", date: "2026-07-01" }];
  assert.equal(cycleSummary(entries, new Date(2026, 6, 3)).prediction, null);
  entries.push({ kind: "periodStarted", date: "2026-07-29" }, { kind: "periodStarted", date: "2026-08-27" }, { kind: "periodStarted", date: "2026-10-11" });
  assert.equal(cycleSummary(entries, new Date(2026, 9, 18)).prediction.length, 29);
  assert.equal(cycleSummary([{ kind: "periodStarted", date: "2026-10-01" }, { kind: "periodStarted", date: "2026-10-19" }], new Date(2026, 9, 20)).prediction, null);
});

test("periods remain ongoing until a recorded end and calendar ranges do not duplicate starts", () => {
  let entries = savePeriod([], "2026-10-01", null);
  assert.equal(cycleSummary(entries, new Date(2026, 9, 15)).periodActive, true);
  entries = savePeriod(entries, "2026-10-01", "2026-10-05");
  assert.equal(entries.filter((entry) => entry.kind === "periodStarted").length, 1);
  const summary = cycleSummary(entries, new Date(2026, 9, 15));
  assert.equal(summary.periodActive, false);
  assert.equal(summary.periodDays, 5);
  assert.equal(summary.cycleDay, 15);
  assert.equal(cycleEntries({ periods: [{ start: "2026-10-01", end: "2026-10-05" }] }).length, 2);
});

test("cycle observations require substantial personal data and do not invent a weak pattern", () => {
  const entries = ["2026-08-01", "2026-09-01", "2026-10-01"].map((date) => ({ kind: "periodStarted", date }));
  const before = ["2026-08-28", "2026-08-29", "2026-09-28", "2026-09-29"].map((id) => ({ id, painLevel: 5 }));
  const other = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"].map((id) => ({ id, painLevel: 1 }));
  assert.equal(cycleObservation(entries.slice(0, 2), [...before, ...other]), null);
  assert.match(cycleObservation(entries, [...before, ...other]), /discomfort has usually been higher/);
  assert.equal(cycleObservation(entries, [...before, ...other].map((entry) => ({ ...entry, painLevel: 3 }))), null);
});

test("men's plans preserve exact native focus-specific metrics and directions", () => {
  const bladder = mensTrackerPlan("bladderLeaks");
  assert.deepEqual(bladder.metrics.map((metric) => metric.id), ["leaks", "after_dribble", "urgency", "confidence"]);
  assert.deepEqual(mensTrackerPlan("intimacy", "maleSexual.ejaculationControl").metrics.map((metric) => metric.id), ["sexual_control", "slow_down", "pelvic_tension", "confidence"]);
  assert.deepEqual(mensTrackerPlan("bowelControl").metrics.map((metric) => metric.id), ["bowel_urgency", "bowel_leaks", "straining", "confidence"]);
  assert.equal(bladder.metrics[0].higherIsBetter, false);
  assert.equal(bladder.metrics[3].higherIsBetter, true);
});

test("dating an edit replaces its identity and that goal's destination day only", () => {
  const entries = [{ id: "old", date: "2026-10-17", goalRawValue: "intimacy" }, { id: "target", date: "2026-10-18", goalRawValue: "intimacy" }, { id: "other", date: "2026-10-18", goalRawValue: "bladderLeaks" }];
  const result = saveDatedEntry(entries, { ...entries[0], date: "2026-10-18" }, true);
  assert.equal(result.length, 2);
  assert.ok(result.some((entry) => entry.id === "other"));
  assert.ok(!result.some((entry) => entry.id === "target"));
});

test("menopause has all eight native symptoms and personal patterns need three check-ins", () => {
  assert.equal(MENOPAUSE_SYMPTOMS.length, 8);
  assert.ok(MENOPAUSE_SYMPTOMS.some(([id]) => id === "nightSweats"));
  const entries = ["2026-10-16", "2026-10-17", "2026-10-18"].map((date) => ({ date, symptoms: ["nightSweats"] }));
  assert.match(menopausePattern(entries, new Date(2026, 9, 18)), /Night sweats appears most often/);
  assert.match(menopausePattern(entries.slice(0, 1)), /1 of 3/);
  assert.equal(trackerStreak(entries.map((entry) => entry.date), new Date(2026, 9, 19)), 3);
});

test("earlier three-choice logs retain their original answers without invented five-point ratings", () => {
  const mens = normalizeMens({ days: { "2026-10-18": { support: "Strong", tension: "Some" } } });
  assert.equal(mens[0].goalRawValue, "legacy");
  assert.deepEqual(mens[0].ratings, {});
  assert.match(mens[0].note, /Strong/);
  const menopause = normalizeMenopause({ menopause: { "2026-10-18": { hotFlashes: "Many" } } });
  assert.equal(menopause[0].impact, null);
  assert.match(menopause[0].note, /Many/);
});

test("men's strongest signal respects whether higher or lower is favorable", () => {
  const plan = mensTrackerPlan("bladderLeaks");
  const entries = [1, 2, 3].map(() => ({ ratings: { leaks: 1, after_dribble: 5, urgency: 5, confidence: 2 } }));
  assert.match(mensPattern(entries, plan), /^Leaks is your strongest recent signal/);
});
