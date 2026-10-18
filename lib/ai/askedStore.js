"use client";

// The answer cache, ported from
// "Pelvic Floor/Core/Insights/AskedArticleStore.swift".
//
// The phone keeps generated articles in SwiftData, keyed by a NORMALISED form
// of the question, so asking the same thing twice is free and instant. The web
// keeps them in localStorage on the same key, for the same reason: a member who
// asks "why do I leak when I sneeze" on Monday and again on Friday should not
// cost a second request, and should not wait three seconds for an answer we
// already wrote.
//
// This is device-local on purpose, exactly as it is on the phone. Nothing here
// is data anyone else needs, and it must never block on the network.

const KEY = "pelvi.askedArticles.v1";

/** The phone prunes too. A browser holding 40 answers is about 120 KB. */
const MAX_ENTRIES = 60;

/** Lowercase, punctuation to spaces: the cache key. */
export function normaliseQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ");
}

function readAll(scope = "") {
  try {
    const raw = window.localStorage.getItem(scope ? `${KEY}.${encodeURIComponent(scope)}` : KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((a) => a && a.questionKey) : [];
  } catch {
    // Corrupt or unavailable storage is the same as an empty cache.
    return [];
  }
}

function writeAll(entries, scope = "") {
  try {
    window.localStorage.setItem(scope ? `${KEY}.${encodeURIComponent(scope)}` : KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Full or disabled storage costs a cache hit, never an answer.
  }
}

/** A previous answer to the same question, or null. */
export function cachedArticle(question, scope = "") {
  const key = normaliseQuestion(question);
  if (!key) return null;
  const found = readAll(scope).find((entry) => entry.questionKey === key);
  return found ? found.article : null;
}

/** Store an answer, newest first, replacing any answer to the same question. */
export function rememberArticle(article, scope = "") {
  const key = normaliseQuestion(article?.question);
  if (!key) return;
  const entries = readAll(scope).filter((entry) => entry.questionKey !== key);
  entries.unshift({ questionKey: key, savedAt: Date.now(), article });
  writeAll(entries, scope);
}

/** The "Your questions" shelf: her recent answers, newest first. */
export function recentArticles(limit = 6, scope = "") {
  return readAll(scope)
    .slice(0, limit)
    .map((entry) => entry.article)
    .filter(Boolean);
}

export function forgetArticle(id, scope = "") {
  if (!id) return;
  writeAll(readAll(scope).filter((entry) => entry.article?.id !== id), scope);
}
