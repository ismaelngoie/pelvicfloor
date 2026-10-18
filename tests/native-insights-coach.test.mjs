import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { recommendableArticles, groundingDigest, bestMatch } from "../lib/ai/insightLibrary.js";
import { insightSignals, personalizedArticles, goalArticles } from "../lib/ai/insightPersonalizer.js";
import { insightReadingMinutes, parseInsightBody } from "../lib/ai/insightReading.js";
import { coachAction, coachTool } from "../lib/ai/coachActions.js";
import { buildCareMemory } from "../lib/ai/coachMemory.js";
import { cachedArticle, rememberArticle, recentArticles, forgetArticle } from "../lib/ai/askedStore.js";
import { pendingCoachMessages, queuePostWorkout, acknowledgeCoachMessage, postWorkoutMessage } from "../lib/ai/proactiveCoach.js";
import { savedCoachAnswers, toggleCoachAnswer } from "../lib/ai/savedCoachAnswers.js";
import { RESOURCE_ARTICLES, TRUSTED_SOURCES } from "../components/member/resourceContent.js";

const { articles } = JSON.parse(readFileSync(new URL("../public/content/insights.json", import.meta.url)));
const memory = new Map();
globalThis.window = { localStorage: { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }, dispatchEvent: () => {} };

test("all 62 native articles have stable identities, covers and original clinical sources", () => {
  assert.equal(articles.length, 62);
  assert.equal(new Set(articles.map((article) => article.id)).size, 62);
  assert.equal(articles.filter((article) => article.goalArticle).length, 39);
  for (const article of articles) {
    assert.ok(article.body.length > 300, article.id);
    assert.ok(article.clinical.bodyPathways.length, article.id);
    assert.ok(article.clinical.sources.length, article.id);
    assert.ok(existsSync(new URL(`../public${article.imageURL}`, import.meta.url)), article.id);
    for (const source of article.clinical.sources) {
      assert.equal(new URL(source.url).protocol, "https:");
      assert.ok(source.organization && source.evidenceLabel);
    }
  }
  assert.equal(RESOURCE_ARTICLES.length, 5);
  assert.equal(TRUSTED_SOURCES.length, 20);
  assert.match(RESOURCE_ARTICLES[0].markdown, /suddenly cannot urinate/);
  assert.match(RESOURCE_ARTICLES[1].markdown, /Soreness is not proof/);
});

test("men's library, search matching and AI grounding exclude pregnancy and women's goal guides", () => {
  const mens = recommendableArticles(articles, "mensPelvicHealth");
  assert.ok(mens.some((article) => article.category === "For Men"));
  assert.ok(!mens.some((article) => article.category === "Pregnancy" || article.category === "Postpartum Recovery"));
  assert.ok(!mens.some((article) => article.clinical.bodyPathways.length === 1 && article.clinical.bodyPathways[0] === "womensPelvicHealth"));
  assert.ok(!recommendableArticles(articles).some((article) => article.category === "For Men"));
  assert.match(groundingDigest(articles, "mensPelvicHealth"), /erection/i);
  assert.ok(bestMatch(articles, "prostate recovery bladder control", "mensPelvicHealth"));
  for (const goalId of ["prostateRecovery", "bowelControl"]) assert.equal(insightSignals({ member: {}, goalId }).bodyPathway, "mensPelvicHealth");
});

test("every native goal has its authored guides and focus words influence their order", () => {
  for (const goalId of ["prolapse", "prostateRecovery", "bowelControl", "intimacy", "coreStrength", "diastasisRecti"]) {
    const bodyPathway = goalId === "prostateRecovery" || goalId === "bowelControl" ? "mensPelvicHealth" : "womensPelvicHealth";
    assert.equal(goalArticles(articles, { goalId, bodyPathway }).length, 3, goalId);
  }
  const intimacy = goalArticles(articles, { goalId: "intimacy", bodyPathway: "mensPelvicHealth", focusTitle: "lasting longer rising signal" });
  assert.equal(intimacy.length, 3);
  assert.match(intimacy[0].title, /Lasting Longer/);
});

test("recent symptom and phase signals rank explanatory recommendations without inventing symptoms", () => {
  const signals = insightSignals({ member: { pathway: "mensPelvicHealth" }, goalId: "bowelControl", programDay: 3, checkIns: [
    { date: "2026-10-18T09:00:00Z", painLevel: 7, leakLevel: "None", mood: "😔" },
    { date: "2026-10-17T09:00:00Z", painLevel: 5, leakLevel: "A Few", mood: "😔" },
    { date: "2025-01-01T00:00:00Z", painLevel: 10 },
  ], now: new Date("2026-10-18T14:00:00Z") });
  assert.equal(signals.recentPeakPain, 7);
  assert.equal(signals.recentLeaks, true);
  assert.equal(signals.recentLowMood, true);
  const picked = personalizedArticles(articles, signals);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked.map((entry) => entry.article.id)).size, 5);
  assert.ok(picked.some((entry) => /pain|release|leaks/i.test(entry.reason)));
  const pinned = personalizedArticles(articles, { goalId: "intimacy", bodyPathway: "womensPelvicHealth", programDay: 1 });
  assert.equal(pinned[0].article.id, "how-to-improve-intimacy-with-your-pelvic-floor");
});

test("reader preserves native headings, mixed lists, videos and action locations", () => {
  const blocks = parseInsightBody("#### A heading\n\nA paragraph\ncontinued.\n\n- One\n* Two\n\n1. First\n2. Second\n\n[VIDEO]\n\n[ACTION:INTIMACY_BOOST]\n\n---");
  assert.deepEqual(blocks.map((block) => block.type), ["heading", "paragraph", "bullets", "numbered", "video", "action", "divider"]);
  assert.deepEqual(blocks[2].items, ["One", "Two"]);
  assert.equal(insightReadingMinutes(Array(181).fill("word").join(" ")), 2);
  assert.equal(insightReadingMinutes("[VIDEO]\n\n[ACTION:INTIMACY_BOOST]"), 1);
});

test("explicit chat actions distinguish commands, questions, negations and exact quantities", () => {
  assert.deepEqual(coachAction("Make my workout gentler"), { type: "difficulty", value: "easy" });
  assert.equal(coachAction("How do I make my workout harder?"), null);
  assert.equal(coachAction("Do not log my period"), null);
  assert.deepEqual(coachAction("Log my period ended"), { type: "period", ended: true });
  assert.deepEqual(coachAction("Add a bottle of water"), { type: "water", value: 500, drink: "bottle" });
  assert.equal(coachAction("Log two glasses of water").type, "open");
  assert.deepEqual(coachAction("Mark today complete"), { type: "complete" });
  assert.equal(coachTool("Show my cycle tracker", "mensPelvicHealth"), null);
  assert.equal(coachTool("Open guided audio").href, "/app?tool=audio");
});

test("care memory contains only logged facts and leaves private notes out", () => {
  const result = buildCareMemory({ member: { pathway: "womensPelvicHealth", privateNotes: "private secret", trackers: { womens: { mode: "cycle", periods: [{ start: "2026-10-17", end: null, note: "private secret" }] } } }, goalId: "pelvicPain", checkIns: [{ goal: "pelvicPain", date: "2026-10-18", painLevel: 4, note: "private secret" }], audioRecords: [{ goal: "pelvicPain", startedAt: "2026-10-18", completedAt: "2026-10-18" }], now: new Date("2026-10-18T14:00:00Z") });
  assert.match(result.join(" "), /Pain or discomfort: Moderate/);
  assert.match(result.join(" "), /Completed 1 guided audio/);
  assert.ok(!result.join(" ").includes("private secret"));
  assert.match(result.join(" "), /Do not infer fertility/);
});

test("asked answers and saved chat answers are member-scoped and survive repeat reads", () => {
  memory.clear();
  rememberArticle({ id: "answer", question: "Why do I leak?", shortAnswer: "answer" }, "member-a:mens");
  assert.equal(cachedArticle("WHY do I leak!", "member-a:mens").id, "answer");
  assert.equal(cachedArticle("Why do I leak?", "member-b:mens"), null);
  assert.equal(recentArticles(6, "member-a:mens").length, 1);
  forgetArticle("answer", "member-a:mens");
  assert.equal(recentArticles(6, "member-a:mens").length, 0);
  toggleCoachAnswer("member-a", { id: "message", text: "A helpful answer", date: new Date() }, "coreStrength");
  assert.equal(savedCoachAnswers("member-a").length, 1);
  assert.equal(savedCoachAnswers("member-b").length, 0);
  toggleCoachAnswer("member-a", { id: "message" }, "coreStrength");
  assert.equal(savedCoachAnswers("member-a").length, 0);
});

test("proactive milestones and men's goal copy queue once and acknowledge stable message ids", () => {
  memory.clear();
  assert.match(postWorkoutMessage({ goalId: "bowelControl", programDay: 30 }), /Day 30!/);
  assert.match(postWorkoutMessage({ goalId: "intimacy", pathway: "mensPelvicHealth", programDay: 2, workoutTitle: "Control", random: () => 0 }), /pelvic control/);
  const context = { memberId: "member-a", goalId: "prolapse", programDay: 3, workoutTitle: "Lift" };
  queuePostWorkout(context); queuePostWorkout(context);
  assert.equal(pendingCoachMessages("member-a").length, 1);
  assert.equal(pendingCoachMessages("member-b").length, 0);
  acknowledgeCoachMessage("member-a", pendingCoachMessages("member-a")[0].id);
  assert.equal(pendingCoachMessages("member-a").length, 0);
});
