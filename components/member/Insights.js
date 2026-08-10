"use client";

// Insights. The library of 23 articles the app ships, plus the charts that
// answer "is this actually working".
//
// The articles are the iOS app's own, exported verbatim from
// InsightData.swift into public/content/insights.json. Do not rewrite them here.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Bookmark, Info, Loader2, Play, Search, Sparkles, X,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { Card, SectionHeader } from "./ui";
import { usePrefersReducedMotion } from "./VideoPlayer";
import ProgressCharts from "./ProgressCharts";
import { libraryGoalPhrase } from "@/lib/goalCopy";

// The two categories iOS keeps out of the browse rows. Their articles are
// still reachable by search, so nothing in the library is unreachable.
const HIDDEN_CATEGORIES = new Set(["For You", "For Men"]);

const GOAL_CATEGORIES = {
  bladderLeaks: ["Core & Breathing", "How Your Body Works", "Fitness & Lifestyle"],
  pelvicPain: ["Pain & Relaxation", "Core & Breathing"],
  postpartum: ["Postpartum Recovery", "Core & Breathing"],
  pregnancyPrep: ["Pregnancy", "Core & Breathing"],
  intimacy: ["Sex & Intimacy", "Pain & Relaxation"],
  diastasisRecti: ["Postpartum Recovery", "Core & Breathing"],
  coreStrength: ["Core & Breathing", "Fitness & Lifestyle", "How Your Body Works"],
  fitness: ["Fitness & Lifestyle", "Core & Breathing"],
  stability: ["Fitness & Lifestyle", "How Your Body Works"],
};

export default function Insights() {
  const { goalId, member, patchMember, catalog } = useMember();
  const reduceMotion = usePrefersReducedMotion();

  const [articles, setArticles] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  const savedIds = useMemo(
    () => (Array.isArray(member?.savedArticleIDs) ? member.savedArticleIDs : []),
    [member?.savedArticleIDs]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/content/insights.json")
      .then((res) => { if (!res.ok) throw new Error("bad response"); return res.json(); })
      .then((json) => { if (!cancelled) setArticles(json.articles || []); })
      .catch(() => {
        if (!cancelled) setLoadError("We could not load your articles. Check your connection and try again.");
      });
    return () => { cancelled = true; };
  }, []);

  const toggleSavedArticle = useCallback(
    async (id) => {
      const next = savedIds.includes(id) ? savedIds.filter((s) => s !== id) : [id, ...savedIds];
      await patchMember({ savedArticleIDs: next });
    },
    [savedIds, patchMember]
  );

  const byId = useMemo(
    () => new Map((articles || []).map((a) => [a.id, a])),
    [articles]
  );

  const forYou = useMemo(() => {
    if (!articles) return [];
    const wanted = GOAL_CATEGORIES[goalId] || GOAL_CATEGORIES.coreStrength;
    const picked = [];
    for (const category of wanted) {
      for (const article of articles) {
        if (article.category === category && !picked.includes(article)) picked.push(article);
        if (picked.length >= 5) break;
      }
      if (picked.length >= 5) break;
    }
    return picked;
  }, [articles, goalId]);

  const categories = useMemo(() => {
    if (!articles) return [];
    const map = new Map();
    for (const article of articles) {
      if (HIDDEN_CATEGORIES.has(article.category)) continue;
      if (!map.has(article.category)) map.set(article.category, []);
      map.get(article.category).push(article);
    }
    return [...map.entries()].map(([title, items]) => ({ title, items }));
  }, [articles]);

  const searchResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean || !articles) return null;
    return articles.filter((a) =>
      `${a.title} ${a.summary} ${a.category} ${a.body}`.toLowerCase().includes(clean)
    );
  }, [query, articles]);

  const savedArticles = useMemo(
    () => savedIds.map((id) => byId.get(id)).filter(Boolean),
    [savedIds, byId]
  );

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        <Card role="alert">
          <p className="text-[15px] font-semibold text-app-textPrimary">{loadError}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4 lg:max-w-5xl lg:px-8 lg:pt-6">
      <header className="px-1">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
          Insights
        </h1>
        <p className="mt-1 text-[15px] text-app-textSecondary">
          Trusted answers, written for you.
        </p>
      </header>

      <ProgressCharts />

      {/* The search box is a control, not prose: past about 40rem a full-width
          pill just puts the clear button a long way from the caret. */}
      <label className="relative mt-8 block lg:max-w-xl">
        <span className="sr-only">Search the articles</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-app-textSecondary"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the articles"
          className="h-12 w-full rounded-full border border-app-borderIdle bg-white pl-11 pr-11 text-[15px] text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear the search"
            className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/5"
          >
            <X className="h-4 w-4 text-app-textSecondary" aria-hidden="true" />
          </button>
        )}
      </label>

      {!articles && (
        <div className="grid place-items-center py-20">
          <Loader2
            className={`h-7 w-7 text-ios-pink ${reduceMotion ? "" : "animate-spin"}`}
            aria-hidden="true"
          />
          <span className="sr-only">Loading the articles</span>
        </div>
      )}

      {searchResults && (
        <section className="mt-6" aria-label="Search results">
          <p role="status" className="px-1 text-[13px] font-semibold text-app-textSecondary">
            {searchResults.length} {searchResults.length === 1 ? "article" : "articles"}
          </p>
          <ul className="mt-3 grid gap-3 tab:grid-cols-2 xl:grid-cols-3">
            {searchResults.map((article) => (
              <li key={article.id}>
                <ArticleRow article={article} onOpen={() => setOpen(article)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {articles && !searchResults && (
        <div className="mt-8 space-y-8">
          <section aria-labelledby="for-you">
            <SectionHeader
              id="for-you"
              title="For you"
              subtitle={`Picked because your goal is ${libraryGoalPhrase(goalId)}.`}
            />
            <ul className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
              {forYou.map((article) => (
                <li key={article.id}>
                  <ArticleTile
                    article={article}
                    reason={`Because your goal is ${libraryGoalPhrase(goalId)}`}
                    onOpen={() => setOpen(article)}
                  />
                </li>
              ))}
            </ul>
          </section>

          {savedArticles.length > 0 && (
            <section aria-labelledby="saved-for-later">
              <SectionHeader id="saved-for-later" title="Saved for later" />
              <ul className="mt-3 grid gap-3 tab:grid-cols-2 xl:grid-cols-3">
                {savedArticles.map((article) => (
                  <li key={article.id}>
                    <ArticleRow article={article} onOpen={() => setOpen(article)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {categories.map((category) => (
            <section key={category.title} aria-labelledby={`cat-${slug(category.title)}`}>
              <SectionHeader id={`cat-${slug(category.title)}`} title={category.title} />
              <ul className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
                {category.items.map((article) => (
                  <li key={article.id}>
                    <ArticleTile article={article} onOpen={() => setOpen(article)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {open && (
        <ArticleReader
          article={open}
          saved={savedIds.includes(open.id)}
          onToggleSaved={() => toggleSavedArticle(open.id)}
          onClose={() => setOpen(null)}
          catalog={catalog}
        />
      )}
    </div>
  );
}

// --- Pieces ----------------------------------------------------------------

function slug(text) {
  return text.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function ArticleTile({ article, reason, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-[248px] shrink-0 flex-col rounded-[18px] border border-app-borderIdle bg-white p-4 text-left"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-ios-pink">
        {article.category}
      </span>
      <span className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-app-textPrimary">
        {article.title}
      </span>
      <span className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-app-textSecondary">
        {article.summary}
      </span>
      {reason && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] font-semibold text-app-positive">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {reason}
        </span>
      )}
    </button>
  );
}

function ArticleRow({ article, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-[18px] border border-app-borderIdle bg-white p-4 text-left"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-ios-pink">
        {article.category}
      </span>
      <span className="mt-1 block text-[15px] font-bold leading-snug text-app-textPrimary">
        {article.title}
      </span>
      <span className="mt-1 block text-[12.5px] leading-snug text-app-textSecondary">
        {article.summary}
      </span>
    </button>
  );
}

function ArticleReader({ article, saved, onToggleSaved, onClose, catalog }) {
  const { openPlayer } = usePlayer();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const videos = useMemo(
    () =>
      (article.videos || [])
        .map((v) => (v.videoId ? catalog?.byId?.get(v.videoId) : null))
        .filter(Boolean),
    [article.videos, catalog]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
      className="fixed inset-0 z-40 overflow-y-auto bg-app-background"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/[0.06] bg-app-background/95 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the article"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5"
        >
          <ArrowLeft className="h-5 w-5 text-app-textPrimary" aria-hidden="true" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-app-textSecondary">
          {article.category}
        </p>
        <button
          type="button"
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save for later"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5"
        >
          <Bookmark
            className={`h-5 w-5 ${saved ? "fill-ios-pink text-ios-pink" : "text-app-textPrimary"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <article className="mx-auto w-full max-w-2xl px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5">
        <h1 className="text-[27px] font-bold leading-[1.15] tracking-[-0.4px] text-app-textPrimary">
          {article.title}
        </h1>
        <p className="mt-2 text-[15.5px] leading-snug text-app-textSecondary">{article.summary}</p>

        <div className="mt-6">{renderBody(article.body)}</div>

        {article.takeaways?.length > 0 && (
          <section className="mt-8 rounded-[18px] border border-app-borderIdle bg-white p-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
              Key takeaways
            </h2>
            <ul className="mt-3 space-y-3">
              {article.takeaways.map((takeaway) => (
                <li key={takeaway.text} className="flex gap-3">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ios-pink"
                    aria-hidden="true"
                  />
                  <span className="text-[14.5px] leading-snug text-app-textPrimary">
                    {takeaway.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {article.didYouKnow && (
          <section className="mt-4 flex gap-3 rounded-[18px] bg-app-primary/[0.07] p-4 ring-1 ring-inset ring-app-primary/20">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-app-primary" aria-hidden="true" />
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-app-primary">
                Did you know
              </h2>
              <p className="mt-1 text-[14.5px] leading-snug text-app-textPrimary">
                {article.didYouKnow}
              </p>
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[17px] font-bold text-app-textPrimary">Try it now</h2>
            <ul className="mt-3 space-y-2">
              {videos.map((video, i) => (
                <li key={video.id}>
                  <button
                    type="button"
                    onClick={() =>
                      openPlayer({ videos, startIndex: i, title: article.title, subtitle: "From this article" })
                    }
                    className="flex w-full items-center gap-3 rounded-[16px] border border-app-borderIdle bg-white p-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ios-pink">
                      <Play className="h-4 w-4 translate-x-[1px] fill-white text-white" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-app-textPrimary">
                      {video.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}

/**
 * The articles are written in a small subset of markdown: `###` headings,
 * `**bold**`, `*` bullets, `1.` steps, and a `[VIDEO]` marker where the app
 * inlines a clip. Anything not in that list is a paragraph.
 */
function renderBody(body) {
  const blocks = String(body || "").split(/\n{2,}/);
  const out = [];

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    if (!trimmed || trimmed === "[VIDEO]") return;

    if (trimmed.startsWith("### ")) {
      out.push(
        <h2 key={index} className="mt-7 text-[19px] font-bold leading-snug text-app-textPrimary first:mt-0">
          {trimmed.slice(4)}
        </h2>
      );
      return;
    }

    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.every((l) => /^\*\s+/.test(l)) && lines.length > 0) {
      out.push(
        <ul key={index} className="mt-3 space-y-2 pl-1">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-app-textSecondary" aria-hidden="true" />
              <span className="text-[15.5px] leading-relaxed text-app-textPrimary">
                {inline(line.replace(/^\*\s+/, ""))}
              </span>
            </li>
          ))}
        </ul>
      );
      return;
    }

    if (lines.every((l) => /^\d+\.\s+/.test(l)) && lines.length > 0) {
      out.push(
        <ol key={index} className="mt-3 space-y-2 pl-1">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 text-[15px] font-bold text-ios-pink">{i + 1}.</span>
              <span className="text-[15.5px] leading-relaxed text-app-textPrimary">
                {inline(line.replace(/^\d+\.\s+/, ""))}
              </span>
            </li>
          ))}
        </ol>
      );
      return;
    }

    out.push(
      <p key={index} className="mt-3 text-[15.5px] leading-relaxed text-app-textPrimary">
        {inline(trimmed.replace(/\n/g, " "))}
      </p>
    );
  });

  return out;
}

function inline(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
}
