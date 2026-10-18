// Native InsightPersonalizer: goal, recent check-ins and program phase explain every recommendation.
import { recommendableArticles } from "./insightLibrary.js";
import { memberPathway } from "../dailyTracking.js";

const CATEGORIES = {
  pregnancyPrep: ["Pregnancy", "Core & Breathing"], postpartum: ["Postpartum Recovery", "Core & Breathing"],
  coreStrength: ["Core & Breathing", "How Your Body Works"], bladderLeaks: ["Fitness & Lifestyle", "How Your Body Works"],
  pelvicPain: ["Pain & Relaxation"], intimacy: ["Sex & Intimacy"], fitness: ["Fitness & Lifestyle", "How Your Body Works"],
  stability: ["Fitness & Lifestyle", "Core & Breathing"], diastasisRecti: ["Postpartum Recovery", "Core & Breathing"],
  prolapse: ["How Your Body Works", "Core & Breathing"], prostateRecovery: ["How Your Body Works", "Core & Breathing"],
  bowelControl: ["How Your Body Works", "Pain & Relaxation"],
};
const KEYWORDS = {
  pregnancyPrep: ["pregnan", "birth"], postpartum: ["postpartum", "recovery", "diastasis"],
  coreStrength: ["core", "kegel", "breath"], bladderLeaks: ["leak", "bladder", "urgen", "hydrat", "knack"],
  pelvicPain: ["pain", "relax", "tension", "release"], intimacy: ["sex", "intimacy", "orgasm", "pleasure"],
  fitness: ["run", "posture", "glute", "strength"], stability: ["posture", "glute", "stabil"],
  diastasisRecti: ["diastasis", "gap", "tummy", "core"], prolapse: ["prolapse", "pressure", "heaviness", "support"],
  prostateRecovery: ["prostate", "leak", "bladder", "drip", "control"], bowelControl: ["bowel", "urgency", "empty", "strain", "control"],
};
const matches = (article, needles) => needles.some((needle) => `${article.title} ${article.summary}`.toLowerCase().includes(needle));

export function insightSignals({ member, goalId, programDay, weekTheme, completions = [], checkIns = [], now = new Date() }) {
  const cutoff = now.getTime() - 14 * 86400000;
  const recent = checkIns.filter((entry) => {
    const date = entry.date?.toDate?.() || new Date(entry.date);
    return date.getTime() >= cutoff && date.getTime() <= now.getTime();
  }).slice(0, 14);
  const pain = recent.map((entry) => entry.painLevel).filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return {
    goalId, bodyPathway: memberPathway(member, goalId),
    programDay: Math.max(1, programDay || 1), weekTheme,
    hasStartedProgram: Boolean(completions.length || member?.programStartedAt),
    recentPeakPain: pain.length ? Math.max(...pain) : null,
    recentLeaks: recent.some((entry) => entry.leakLevel != null && !["none", "None", 0, "0"].includes(entry.leakLevel)),
    recentLowMood: recent.slice(0, 5).filter((entry) => ["sad", "Sad", "😔"].includes(entry.mood)).length >= 2,
  };
}

export function personalizedArticles(articles, signals, limit = 5) {
  const eligible = recommendableArticles(articles, signals.bodyPathway);
  const scores = new Map();
  const award = (article, points, reason) => {
    const current = scores.get(article.id) || { article, score: 0, weight: 0, reason };
    current.score += points;
    if (points > current.weight) { current.reason = reason; current.weight = points; }
    scores.set(article.id, current);
  };
  const mensIntimacy = signals.bodyPathway === "mensPelvicHealth" && signals.goalId === "intimacy";
  const categories = mensIntimacy ? ["For Men"] : CATEGORIES[signals.goalId] || CATEGORIES.coreStrength;
  const keywords = mensIntimacy ? ["erection", "erectile", "ejaculat", "last longer", "sexual", "pelvic tension"] : KEYWORDS[signals.goalId] || KEYWORDS.coreStrength;
  for (const article of eligible) {
    if (categories.includes(article.category)) award(article, 4, "Matches your goal");
    if (matches(article, keywords)) award(article, 3, "Matches your goal");
    if (signals.recentPeakPain >= 5) {
      if (article.category === "Pain & Relaxation") award(article, 8, "You logged more pain lately");
      if (matches(article, ["relax", "release", "tension", "stress", "reverse kegel"])) award(article, 7, "Gentle release, not more squeezing");
    }
    if (signals.recentLeaks && matches(article, KEYWORDS.bladderLeaks)) award(article, 7, "For the leaks you logged");
    if (signals.recentLowMood && matches(article, ["stress", "5-minute", "habit", "confiden"])) award(article, 5, "A kind place to start");
    const phaseCategory = signals.programDay < 15 ? "Core & Breathing" : signals.programDay < 43 ? "How Your Body Works" : "Fitness & Lifestyle";
    if (article.category === phaseCategory) award(article, 5, signals.programDay < 15 ? "Chosen for this stage of your plan" : signals.programDay < 43 ? "Good for where you are now" : "For making it stick");
    const themeWords = String(signals.weekTheme || "").toLowerCase().split(/[^\p{L}]+/u).filter((word) => word.length > 4);
    if (themeWords.length && matches(article, themeWords)) award(article, 6, `Goes with this week: ${signals.weekTheme}`);
  }
  if (!scores.size) for (const article of eligible.filter((item) => item.category === "Core & Breathing")) award(article, 1, "A good place to start");
  const ranked = [...scores.values()].sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
  if (signals.goalId === "intimacy") {
    const pinned = ranked.findIndex((entry) => entry.article.id === "how-to-improve-intimacy-with-your-pelvic-floor");
    if (pinned > 0) ranked.unshift(...ranked.splice(pinned, 1));
  }
  return ranked.slice(0, limit);
}

export function goalArticles(articles, { goalId, bodyPathway, focusTitle = "", focusPrompt = "" }) {
  const words = new Set(`${focusTitle} ${focusPrompt}`.toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3 && !["with", "from", "your", "more", "feel", "make", "help", "build", "improve", "manage", "reduce", "about", "today", "pelvic", "floor"].includes(word)));
  const score = (article) => [...words].filter((word) => `${article.title} ${article.summary}`.toLowerCase().includes(word)).length;
  return recommendableArticles(articles, bodyPathway)
    .filter((article) => article.goalArticle && article.clinical?.applicableGoals.includes(goalId))
    .map((article, index) => ({ article, index, score: score(article) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map((entry) => entry.article);
}
