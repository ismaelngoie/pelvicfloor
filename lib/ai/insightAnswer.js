"use client";

// "Ask anything about your pelvic floor", ported from
// "Pelvic Floor/Core/Insights/InsightAnswerService.swift".
//
// SAME BACKEND AS COACH MIA, DIFFERENT JOB. Same client, same `pelvi.miaModel`
// override, so one flag still swaps the model everywhere. What it does not
// share is the persona: Coach Mia talks, this writes. One short, structured,
// plain-English article and nothing else.
//
// THREE GUARDS, IN ORDER:
//   1. A local red-flag screen. Severe or sudden pain, bleeding, numbness,
//      fever or signs of infection never reach the network at all: they route
//      straight to "please see a clinician".
//   2. A local app-question screen. Billing, cancelling, streaks and account
//      questions hand off to Coach Mia, who has that context.
//   3. The model's own `route` field, which can still send an answer to either
//      outcome for anything the local screens miss.
//
// GROUNDING: the 21 recommendable hand-written articles are sent as a compact
// index (slug, shelf, title, summary) together with her goal and program week,
// so answers stay consistent with the library and point at a real article
// instead of inventing one. A slug that does not resolve is dropped.
//
// COST: replies are capped at 900 tokens, JSON-schema constrained, cached by
// normalised question in lib/ai/askedStore.js, and the caller allows one
// request at a time.

import { generativeModel, schemaBuilder } from "./client";
import {
  RED_FLAG_CATEGORIES, isAppQuestion, isRedFlag, CLINICIAN_OUTCOME, COACH_HANDOFF_OUTCOME,
} from "./safety";
import { articlesBySlugs, bestMatch, groundingDigest, slugOf } from "./insightLibrary";
import { clean } from "./text";

/**
 * Hard ceiling on a reply. An Insights answer is a two-minute read, not an
 * essay, and this is the single biggest lever on cost per question.
 */
const MAX_OUTPUT_TOKENS = 900;

/** Long enough for a real question, short enough to stay a question. */
export const MAX_QUESTION_LENGTH = 300;

/** Every ceiling below is a defence against a model that ignores its brief. */
const LIMIT = {
  title: 90,
  shortAnswer: 480,
  sectionHeading: 70,
  sectionBody: 900,
  sections: 4,
  step: 180,
  steps: 5,
  safetyNote: 240,
  related: 3,
};

export const DEFAULT_SAFETY_NOTE =
  "If this gets worse or does not settle, check in with a doctor or a pelvic health physiotherapist.";

// --- Prompt ----------------------------------------------------------------

/**
 * The article-writing brief. Deliberately free of anything personal: her goal
 * and program day go in the user turn, which keeps this string identical for
 * every member and every question.
 */
function systemInstruction(articles) {
  const redFlags = RED_FLAG_CATEGORIES.map((c) => `- ${c}`).join("\n");

  return `You write the Insights library for Pelvi Health, an app used by women, mostly between 35 and 65, who are working on their pelvic floor at home. Many of them find this subject embarrassing. Many of them have never had it explained properly. Your only job is to turn one question into one short, calm, well-structured article.

HOW YOU WRITE
- Plain English at about a sixth grade reading level. Short sentences. Common words.
- Warm and matter of fact. Never chirpy, never clinical, never condescending.
- Say "your pelvic floor", not "the pelvic floor musculature".
- If you must use a medical word, define it in the same sentence in five words or fewer.
- Never use an em dash or an en dash. Use a comma, a full stop, or rewrite the sentence.
- No emoji. No exclamation marks. No headings inside the body text, the sections already have headings.
- Do not greet her, do not introduce yourself, do not sign off, do not mention this app's coaching.
- Do not say who or what wrote the article.

WHAT YOU MAY NOT DO
- Never diagnose. Never say she has a condition, or that something "sounds like" a condition. Explain what can cause a symptom in general, never what is causing hers.
- Never name a medicine, a supplement, a dose, or a schedule for taking anything.
- Never tell her to stop, start or change any treatment she is on.
- Never promise a result or a timeline. Say "many women find", not "you will".
- Never estimate how serious something is.

ROUTING, DECIDED BEFORE YOU WRITE ANYTHING
Set "route" to exactly one of these.
- "clinician" if the question mentions or clearly describes any of these:
${redFlags}
Write no article in that case. Put a short, calm, two sentence explanation in "shortAnswer" telling her this needs a doctor or a pelvic health physiotherapist and that getting it looked at is the fastest way forward. Leave "sections" and "todaySteps" empty.
- "coach" if the question is about the app rather than her body: billing, price, refunds, cancelling, her streak, how the program works, logging in, or anything broken. Leave "sections" and "todaySteps" empty.
- "article" for everything else.

GROUNDING
You are given the app's existing article library below as "slug | shelf | title | summary". Stay consistent with it: same voice, same advice, no contradictions. If one of those articles already answers the question, still write your short answer, and put that article's slug first in "relatedSlugs" so she is sent to it. Only ever use slugs copied exactly from that list. If none fit, return an empty list.

SHAPE OF AN ARTICLE
- "title": a plain, specific title. Under 60 characters. Not a question, not clickbait.
- "shortAnswer": two or three sentences that answer the question on their own. This is the part most people will read, so put the real answer here, not a preamble.
- "sections": two to four sections. Each has a short heading of three to six words and a body of two to four short paragraphs separated by a blank line. Explain the why, not just the what.
- "todaySteps": two to four things she can genuinely do today, each one sentence, each starting with a verb. Specific and small. "Try ten slow squeezes while the kettle boils", not "do your exercises".
- "safetyNote": one gentle sentence about when to check with a doctor or a pelvic health physiotherapist for this specific topic. No alarm, no list.
- "topicTag": one or two lowercase words, e.g. "leaks", "pelvic pain", "postpartum".

EXISTING ARTICLE LIBRARY
${groundingDigest(articles)}`;
}

function userPrompt(question, signals) {
  const lines = [`Her goal in the app: ${signals.goalTitle}.`];
  if (signals.hasStartedProgram) {
    lines.push(`She is on day ${signals.programDay} of her 90 day program.`);
    if (signals.weekTheme) lines.push(`This week's theme is "${signals.weekTheme}".`);
  } else {
    lines.push("She has not started her 90 day program yet.");
  }
  lines.push(
    "Use this only to choose emphasis and examples. Never mention her day number, her goal name, or her progress in the article."
  );

  return `${lines.join(" ")}

Her question, exactly as she typed it:
${question}`;
}

// --- Schema ----------------------------------------------------------------

/**
 * A constrained response is what makes this an article instead of a chat reply.
 * It also means a truncated or chatty answer fails fast and cleanly rather than
 * rendering as half a page.
 */
async function responseSchema() {
  const Schema = await schemaBuilder();
  return Schema.object({
    properties: {
      route: Schema.enumString({
        enum: ["article", "clinician", "coach"],
        description: "Where this question should go.",
      }),
      title: Schema.string({ description: "Plain article title, under 60 characters." }),
      shortAnswer: Schema.string({
        description: "Two or three sentences that answer the question on their own.",
      }),
      sections: Schema.array({
        items: Schema.object({
          properties: {
            heading: Schema.string({ description: "Three to six words." }),
            body: Schema.string({
              description: "Two to four short paragraphs, separated by a blank line.",
            }),
          },
          propertyOrdering: ["heading", "body"],
        }),
        description: "Two to four sections. Empty for clinician or coach routes.",
        maxItems: 4,
      }),
      todaySteps: Schema.array({
        items: Schema.string({ description: "One sentence, starts with a verb." }),
        description: "Two to four things she can do today. Empty for clinician or coach routes.",
        maxItems: 4,
      }),
      safetyNote: Schema.string({
        description: "One gentle sentence about when to check with a clinician.",
      }),
      relatedSlugs: Schema.array({
        items: Schema.string({ description: "A slug copied exactly from the supplied library." }),
        description: "Up to three existing articles that go deeper.",
        maxItems: 3,
      }),
      topicTag: Schema.string({ description: "One or two lowercase words." }),
    },
    propertyOrdering: [
      "route", "title", "shortAnswer", "sections", "todaySteps",
      "safetyNote", "relatedSlugs", "topicTag",
    ],
  });
}

// --- Payload ---------------------------------------------------------------

/**
 * Tolerates the model wrapping its JSON in a fence, which schema-constrained
 * responses should never do but occasionally still do.
 */
function decodePayload(text) {
  const trimmed = String(text || "").trim();
  const candidates = [trimmed];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/** Never leave a member looking at an untitled page. */
function fallbackTitle(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed) return "Your question";
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function buildArticle(payload, question, relatedSlugs) {
  const sections = (payload.sections || [])
    .map((raw) => ({
      heading: clean(raw?.heading, LIMIT.sectionHeading),
      body: clean(raw?.body, LIMIT.sectionBody),
    }))
    .filter((s) => s.heading && s.body)
    .slice(0, LIMIT.sections);

  const todaySteps = (payload.todaySteps || [])
    .map((step) => clean(step, LIMIT.step))
    .filter(Boolean)
    .slice(0, LIMIT.steps);

  const title = clean(payload.title, LIMIT.title);
  const note = clean(payload.safetyNote, LIMIT.safetyNote);

  return {
    id: `ask_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    question,
    title: title || fallbackTitle(question),
    shortAnswer: clean(payload.shortAnswer, LIMIT.shortAnswer),
    sections,
    todaySteps,
    safetyNote: note || DEFAULT_SAFETY_NOTE,
    relatedSlugs: relatedSlugs.slice(0, LIMIT.related),
    topicTag: clean(payload.topicTag, 24).toLowerCase(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Only slugs that resolve to a real article survive, so a hallucinated one
 * silently disappears instead of rendering a dead row. When the model nominates
 * nothing, the local keyword match gets one chance to point at the library.
 */
function resolveRelated(payload, question, articles) {
  const resolved = articlesBySlugs(articles, payload.relatedSlugs || []).map(slugOf);
  if (resolved.length) return resolved;
  const fallback = bestMatch(articles, question);
  return fallback ? [slugOf(fallback)] : [];
}

// --- Public entry point ----------------------------------------------------

/**
 * Turn one question into an article, a clinician outcome, or a hand-off.
 *
 * Callers must serialise this: one request in flight at a time.
 *
 * @param {object} params
 * @param {string} params.question
 * @param {object} params.signals  { goalTitle, programDay, weekTheme, hasStartedProgram }
 * @param {Array}  params.articles the loaded insights.json library
 * @returns {Promise<{kind: "article"|"clinician"|"coach", question: string, article?: object, outcome?: object}>}
 */
export async function answerQuestion({ question: rawQuestion, signals, articles }) {
  const question = String(rawQuestion || "").trim();
  if (!question) throw new Error("empty-question");

  // Guard 1: red flags never touch the network.
  if (isRedFlag(question)) {
    return { kind: "clinician", question, outcome: { ...CLINICIAN_OUTCOME, question } };
  }

  // Guard 2: app questions belong to Coach Mia.
  if (isAppQuestion(question)) {
    return { kind: "coach", question, outcome: { ...COACH_HANDOFF_OUTCOME, question } };
  }

  const model = await generativeModel({
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: await responseSchema(),
    },
    systemInstruction: systemInstruction(articles),
  });

  const result = await model.generateContent(userPrompt(question, signals));
  let text = "";
  try {
    text = result?.response?.text?.() || "";
  } catch {
    // A blocked or candidate-less response. Treated as empty, which the caller
    // turns into one calm sentence and a retry.
    text = "";
  }
  if (!text.trim()) throw new Error("empty-response");

  const payload = decodePayload(text);
  if (!payload) throw new Error("malformed-response");

  // Falls back to an article rather than failing: a missing route on an
  // otherwise good answer should not cost the member her question.
  const route = String(payload.route || "").toLowerCase();

  if (route === "clinician") {
    const body = clean(payload.shortAnswer, LIMIT.shortAnswer);
    return {
      kind: "clinician",
      question,
      outcome: { ...CLINICIAN_OUTCOME, question, body: body || CLINICIAN_OUTCOME.body },
    };
  }
  if (route === "coach") {
    return { kind: "coach", question, outcome: { ...COACH_HANDOFF_OUTCOME, question } };
  }

  return {
    kind: "article",
    question,
    article: buildArticle(payload, question, resolveRelated(payload, question, articles)),
  };
}

/**
 * Starter questions, in her words, tuned to her goal. Ported from
 * InsightAskModel.suggestions(for:). These do two jobs: they show what the box
 * is for, and they give a member who is embarrassed a way in that she does not
 * have to type.
 */
export function askSuggestions(goalId) {
  switch (goalId) {
    case "bladderLeaks":
      return [
        "Why do I leak when I sneeze?",
        "How long before leaks get better?",
        "Does drinking less water help?",
      ];
    case "pelvicPain":
      return [
        "Why do kegels make me feel worse?",
        "How do I relax my pelvic floor?",
        "Why does sitting hurt more some days?",
      ];
    case "intimacy":
      return [
        "Can this help sex feel better?",
        "Why does sex feel uncomfortable now?",
        "How do these muscles affect orgasm?",
      ];
    case "postpartum":
      return [
        "When is it safe to start again after birth?",
        "Why does my tummy still feel soft?",
        "Is it normal to leak after a baby?",
      ];
    case "pregnancyPrep":
      return [
        "Are kegels safe in pregnancy?",
        "How do I prepare for birth?",
        "Which exercises should I skip now?",
      ];
    case "diastasisRecti":
      return [
        "What is the gap in my tummy muscles?",
        "Which exercises make the gap worse?",
        "Can the gap close on its own?",
      ];
    default:
      return [
        "Am I doing kegels the right way?",
        "How many should I do in a day?",
        "Can I do this while walking?",
      ];
  }
}
