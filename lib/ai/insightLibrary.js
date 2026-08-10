"use client";

// The article index, ported from "Pelvic Floor/Core/Insights/InsightIndex.swift".
//
// It exists so a generated answer can point at an article that ACTUALLY EXISTS.
// The model is given a compact digest of the real library and told to copy
// slugs out of it; anything it invents fails to resolve here and silently
// disappears rather than rendering a row that goes nowhere.
//
// The slugs are the ids already in public/content/insights.json, which were
// exported from the iOS library and are the same launch-stable slugs the phone
// derives from each title. Both platforms therefore name the same article the
// same way.

let articlesPromise = null;

/** The 23 hand-written articles, fetched once per page load. */
export function loadInsightArticles() {
  if (!articlesPromise) {
    articlesPromise = fetch("/content/insights.json")
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((json) => (Array.isArray(json.articles) ? json.articles : []));
    articlesPromise.catch(() => {
      articlesPromise = null;
    });
  }
  return articlesPromise;
}

/**
 * Deterministic id from a title, matching InsightMarkdown.slug(from:).
 * Only used as a fallback: every article in the JSON already carries its slug
 * as `id`.
 */
export function slugify(title) {
  let out = "";
  let lastWasDash = true; // trims leading dashes
  for (const character of String(title || "").toLowerCase()) {
    if (/[a-z0-9]/.test(character)) {
      out += character;
      lastWasDash = false;
    } else if (!lastWasDash) {
      out += "-";
      lastWasDash = true;
    }
  }
  while (out.endsWith("-")) out = out.slice(0, -1);
  return out || "article";
}

export function slugOf(article) {
  return article?.id || slugify(article?.title);
}

/**
 * Articles the tab is willing to surface. The app is women-focused and the
 * "For Men" shelf is hidden, so those two never appear in recommendations,
 * related rows or AI grounding either. 23 articles, 21 recommendable.
 */
export function recommendableArticles(articles) {
  return (articles || []).filter((a) => a.category !== "For Men");
}

/**
 * The compact catalogue the answer service sends as context. One line per
 * article: slug, shelf, title, summary. Roughly 4k characters for all 21,
 * which is cheap and keeps answers on-voice.
 */
export function groundingDigest(articles) {
  return recommendableArticles(articles)
    .map((a) => `${slugOf(a)} | ${a.category} | ${a.title} | ${a.summary}`)
    .join("\n");
}

export function articleBySlug(articles, slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return null;
  return (articles || []).find((a) => slugOf(a).toLowerCase() === key) || null;
}

/** Resolve a list of slugs to real articles, dropping misses and repeats. */
export function articlesBySlugs(articles, slugs) {
  const seen = new Set();
  const out = [];
  for (const slug of slugs || []) {
    const article = articleBySlug(articles, slug);
    if (!article) continue;
    const id = slugOf(article);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(article);
  }
  return out;
}

// --- Keyword matching ------------------------------------------------------

/** Words too common in this library to say anything about relatedness. */
const STOP_WORDS = new Set([
  "the", "and", "for", "your", "you", "with", "that", "this", "how", "why",
  "what", "when", "are", "can", "not", "but", "its", "it's", "from", "into",
  "pelvic", "floor", "muscles", "muscle", "body", "help", "helps", "more",
  "about", "than", "then", "they", "them", "have", "has", "will", "just",
  "a", "an", "of", "to", "in", "is", "it", "on", "or", "at", "be", "do",
]);

function words(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function keywords(article) {
  return new Set(words(`${article.title} ${article.summary}`));
}

/**
 * Best existing article for a free-text question, when one obviously fits.
 * Used as the safety net if the model does not nominate one itself.
 */
export function bestMatch(articles, question) {
  const asked = new Set(words(question));
  if (asked.size < 2) return null;
  let best = null;
  for (const candidate of recommendableArticles(articles)) {
    let overlap = 0;
    for (const word of keywords(candidate)) if (asked.has(word)) overlap += 1;
    if (overlap < 2) continue;
    if (!best || overlap > best.overlap) best = { article: candidate, overlap };
  }
  return best?.article || null;
}
