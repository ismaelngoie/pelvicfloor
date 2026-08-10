"use client";

// Insights. The library of 23 articles the app ships, the charts that answer
// "is this actually working", and the box that answers a question nobody has
// written an article about yet.
//
// The articles are the iOS app's own, exported verbatim from
// InsightData.swift into public/content/insights.json. Do not rewrite them here.
//
// "Ask anything about your pelvic floor" is the phone's own generator, ported:
//   lib/ai/insightAnswer.js  the brief, the schema, the clamping, the routing
//   lib/ai/safety.js         the two local screens that run before the network
//   lib/ai/insightLibrary.js the grounding index, so a suggested article exists
//   lib/ai/askedStore.js     the cache, so one question is never billed twice
//
// One question in flight at a time, capped at 900 output tokens, and a repeat
// question is answered from this browser with no request at all.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, Bookmark, ClipboardList, Info, Loader2, MessageCircle,
  Play, Quote, RefreshCw, Search, Sparkles, X,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { Card, SectionHeader } from "./ui";
import { usePrefersReducedMotion } from "./VideoPlayer";
import ProgressCharts from "./ProgressCharts";
import { libraryGoalPhrase } from "@/lib/goalCopy";
import { articlesBySlugs, loadInsightArticles } from "@/lib/ai/insightLibrary";
import { answerQuestion, askSuggestions, MAX_QUESTION_LENGTH } from "@/lib/ai/insightAnswer";
import { cachedArticle, forgetArticle, recentArticles, rememberArticle } from "@/lib/ai/askedStore";

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
  const {
    goalId, goal, member, patchMember, catalog, currentDayNumber, headlineDay,
    currentDay, completions,
  } = useMember();
  const reduceMotion = usePrefersReducedMotion();

  const [articles, setArticles] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [asking, setAsking] = useState(null); // null | { article } | {}
  const [asked, setAsked] = useState([]);

  const savedIds = useMemo(
    () => (Array.isArray(member?.savedArticleIDs) ? member.savedArticleIDs : []),
    [member?.savedArticleIDs]
  );

  useEffect(() => {
    let cancelled = false;
    loadInsightArticles()
      .then((list) => { if (!cancelled) setArticles(list); })
      .catch(() => {
        if (!cancelled) setLoadError("We could not load your articles. Check your connection and try again.");
      });
    return () => { cancelled = true; };
  }, []);

  // Her own answers, kept in this browser exactly as the phone keeps them on
  // the device. Read after mount so the server-rendered markup and the first
  // client render agree.
  const refreshAsked = useCallback(() => setAsked(recentArticles(6)), []);
  useEffect(() => { refreshAsked(); }, [refreshAsked]);

  /** What the generator is told about her. Ported from InsightSignals.current(). */
  const signals = useMemo(() => ({
    goalTitle: goal?.title || "a stronger pelvic floor",
    // InsightPersonalizer sends `max(1, engine.currentDayNumber)`, so the
    // article she is offered is picked for the day she is on, not the one the
    // Today ring happens to be replaying.
    programDay: Math.max(1, currentDayNumber || 1),
    weekTheme: headlineDay?.theme || currentDay?.theme || null,
    hasStartedProgram: Boolean(completions?.length) || Boolean(member?.programStartedAt),
  }), [goal?.title, currentDayNumber, headlineDay?.theme, currentDay?.theme, completions?.length, member?.programStartedAt]);

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

      {/* The ask box sits above everything else on purpose. It is the answer to
          the question she actually came here with, and it is the one thing on
          this tab that is written for her rather than for everyone. */}
      <AskBar onOpen={() => setAsking({})} />

      {asked.length > 0 && (
        <section className="mt-6" aria-labelledby="your-questions">
          <SectionHeader id="your-questions" title="Your questions" />
          <ul className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
            {asked.map((article) => (
              <li key={article.id}>
                <AskedQuestionCard article={article} onOpen={() => setAsking({ article })} />
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {asking && (
        <AskSheet
          goalId={goalId}
          signals={signals}
          articles={articles || []}
          initialArticle={asking.article || null}
          onClose={() => { setAsking(null); refreshAsked(); }}
          onOpenArticle={(article) => { setAsking(null); refreshAsked(); setOpen(article); }}
        />
      )}
    </div>
  );
}

// --- Ask anything ----------------------------------------------------------

/** The invitation. One tap, and it says what it is for in her words. */
function AskBar({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-5 flex w-full items-center gap-3 rounded-[20px] border border-app-primary/25 bg-white p-4 text-left shadow-[0_5px_14px_rgba(0,0,0,0.04)] lg:max-w-xl"
    >
      <Sparkles className="h-5 w-5 shrink-0 text-app-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-app-textPrimary">
          Ask anything about your pelvic floor
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-app-textSecondary">
          Ask in your own words. You will get a short, clear article back.
        </span>
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cta-gradient">
        <ArrowUpRight className="h-4 w-4 text-white" aria-hidden="true" />
      </span>
    </button>
  );
}

/** One entry in the "Your questions" shelf. */
function AskedQuestionCard({ article, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-[248px] shrink-0 flex-col rounded-[18px] border border-app-borderIdle bg-white p-4 text-left"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ios-pink">
        <Quote className="h-3 w-3" aria-hidden="true" />
        You asked
      </span>
      <span className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug text-app-textPrimary">
        {article.question}
      </span>
      <span className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-app-textSecondary">
        {article.shortAnswer}
      </span>
    </button>
  );
}

/**
 * The sheet: compose, work, answer. A small state machine, and the only place
 * that is allowed to call the generator.
 *
 * There is no transcript here, because the output is an article and articles do
 * not have turns.
 */
function AskSheet({ goalId, signals, articles, initialArticle, onClose, onOpenArticle }) {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState(initialArticle ? "answered" : "composing");
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState(initialArticle?.question || "");
  const [answer, setAnswer] = useState(
    initialArticle ? { kind: "article", question: initialArticle.question, article: initialArticle } : null
  );

  const inputRef = useRef(null);
  // One request at a time, and only the newest one may land.
  const runRef = useRef(0);
  const workingRef = useRef(false);

  // The tab can hand this sheet an empty library, because the ask box is
  // tappable before insights.json has landed. Grounding on an empty index is
  // how an answer starts recommending articles that do not exist, so the
  // library is fetched here too. loadInsightArticles is memoised, so on the
  // normal path this costs nothing.
  const [library, setLibrary] = useState(articles);
  useEffect(() => {
    if (articles.length) { setLibrary(articles); return undefined; }
    let cancelled = false;
    loadInsightArticles().then((list) => { if (!cancelled) setLibrary(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [articles]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !workingRef.current) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (phase === "composing") inputRef.current?.focus();
  }, [phase]);

  const run = useCallback(
    async (rawQuestion) => {
      const question = rawQuestion.trim();
      if (!question || workingRef.current) return;

      const runId = runRef.current + 1;
      runRef.current = runId;
      workingRef.current = true;
      setAsked(question);
      setPhase("working");

      // A repeat question costs nothing.
      const cached = cachedArticle(question);
      if (cached) {
        workingRef.current = false;
        setAnswer({ kind: "article", question, article: cached });
        setPhase("answered");
        return;
      }

      try {
        const grounding = library.length ? library : await loadInsightArticles().catch(() => []);
        const result = await answerQuestion({ question, signals, articles: grounding });
        if (runRef.current !== runId) return;
        if (result.kind === "article") rememberArticle(result.article);
        setAnswer(result);
        setPhase("answered");
      } catch {
        if (runRef.current !== runId) return;
        setPhase("failed");
      } finally {
        if (runRef.current === runId) workingRef.current = false;
      }
    },
    [signals, library]
  );

  const startOver = useCallback(() => {
    runRef.current += 1;
    workingRef.current = false;
    setDraft("");
    setAsked("");
    setAnswer(null);
    setPhase("composing");
  }, []);

  const remaining = MAX_QUESTION_LENGTH - draft.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask anything about your pelvic floor"
      className="fixed inset-0 z-40 overflow-y-auto bg-app-background"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/[0.06] bg-app-background/95 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur">
        <p className="min-w-0 flex-1 pl-1 text-[15px] font-bold text-app-textPrimary">Ask</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5"
        >
          <X className="h-5 w-5 text-app-textPrimary" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5">
        {phase === "composing" && (
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
              What would you like to know?
            </h1>
            <p className="mt-2 text-[14.5px] leading-snug text-app-textSecondary">
              Ask in your own words. You will get a short, clear article back, written for you.
            </p>

            <form
              className="mt-5"
              onSubmit={(e) => { e.preventDefault(); run(draft); }}
            >
              <label className="block">
                <span className="sr-only">Your question</span>
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={draft}
                  maxLength={MAX_QUESTION_LENGTH}
                  onChange={(e) => setDraft(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(draft); }
                  }}
                  placeholder="For example, why do I leak when I laugh?"
                  className="w-full resize-none rounded-[18px] border border-app-borderIdle bg-white p-4 text-[15.5px] leading-snug text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
                />
              </label>
              {remaining < 60 && (
                <p className="mt-1.5 text-right text-[11.5px] text-app-textSecondary">
                  {remaining} characters left
                </p>
              )}
              {draft.trim() && (
                <button
                  type="submit"
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[15px] font-bold text-white"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Write my answer
                </button>
              )}
            </form>

            <ul className="mt-7 space-y-2.5">
              {askSuggestions(goalId).map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => run(suggestion)}
                    className="flex w-full items-center gap-3 rounded-[16px] border border-app-borderIdle bg-white p-4 text-left"
                  >
                    <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-app-textPrimary">
                      {suggestion}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-app-primary" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-[12px] leading-snug text-app-textSecondary">
              Pelvi cannot diagnose anything, and it will never suggest medicine. For anything
              painful, sudden or new, please see a doctor or a pelvic health physiotherapist.
            </p>
          </div>
        )}

        {phase === "working" && (
          <div className="grid place-items-center py-16 text-center" role="status">
            <span className="grid h-24 w-24 place-items-center rounded-full bg-app-primary/10">
              <Sparkles
                className={`h-8 w-8 text-app-primary ${reduceMotion ? "" : "animate-pulse"}`}
                aria-hidden="true"
              />
            </span>
            <h1 className="mt-5 text-[19px] font-bold text-app-textPrimary">Writing your answer</h1>
            <p className="mt-2 max-w-xs text-[14px] leading-snug text-app-textSecondary">{asked}</p>
            <p className="mt-3 text-[12.5px] text-app-textSecondary">This takes a few seconds.</p>
          </div>
        )}

        {phase === "failed" && (
          <div className="grid place-items-center py-16 text-center" role="alert">
            <h1 className="text-[19px] font-bold text-app-textPrimary">That did not come through</h1>
            <p className="mt-2 max-w-sm text-[14.5px] leading-snug text-app-textSecondary">
              Your question is still here. It is usually the connection, so trying again normally
              works.
            </p>
            {asked && <p className="mt-3 max-w-xs text-[13px] text-app-textSecondary">{asked}</p>}
            <button
              type="button"
              onClick={() => run(asked)}
              className="mt-6 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-cta-gradient text-[15px] font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={startOver}
              className="mt-3 text-[14px] font-semibold text-app-textSecondary underline underline-offset-2"
            >
              Change my question
            </button>
          </div>
        )}

        {phase === "answered" && answer?.kind === "article" && (
          <AskedArticleView
            article={answer.article}
            articles={library}
            onAskAnother={startOver}
            onOpenArticle={onOpenArticle}
            onRemove={() => { forgetArticle(answer.article.id); startOver(); }}
          />
        )}

        {phase === "answered" && answer?.kind === "clinician" && (
          <ClinicianView outcome={answer.outcome} onAskAnother={startOver} />
        )}

        {phase === "answered" && answer?.kind === "coach" && (
          <CoachHandoffView
            outcome={answer.outcome}
            onAskAnother={startOver}
            onOpenCoach={() => {
              onClose();
              router.push(`/app/coach?ask=${encodeURIComponent(answer.question)}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** The generated article. Same bones as the hand-written 23. */
function AskedArticleView({ article, articles, onAskAnother, onOpenArticle, onRemove }) {
  const related = useMemo(
    () => articlesBySlugs(articles, article.relatedSlugs || []),
    [articles, article.relatedSlugs]
  );

  return (
    <article>
      <p className="flex items-start gap-2 text-[13px] font-medium leading-snug text-app-textSecondary">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-primary" aria-hidden="true" />
        <span>You asked: {article.question}</span>
      </p>

      <h1 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.4px] text-app-textPrimary">
        {article.title}
      </h1>

      {article.shortAnswer && (
        <section className="mt-5 rounded-[18px] bg-app-primary/[0.07] p-4 ring-1 ring-inset ring-app-primary/20">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-app-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            The short answer
          </h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-app-textPrimary">
            {article.shortAnswer}
          </p>
        </section>
      )}

      {article.sections?.map((section) => (
        <section key={section.heading} className="mt-7">
          <h2 className="text-[19px] font-bold leading-snug text-app-textPrimary">
            {section.heading}
          </h2>
          {section.body.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i} className="mt-3 text-[15.5px] leading-relaxed text-app-textPrimary">
              {inline(paragraph.replace(/\n/g, " "))}
            </p>
          ))}
        </section>
      ))}

      {article.todaySteps?.length > 0 && (
        <section className="mt-8 rounded-[18px] border border-app-borderIdle bg-white p-4">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
            What you can do today
          </h2>
          <ul className="mt-3 space-y-3">
            {article.todaySteps.map((step) => (
              <li key={step} className="flex gap-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ios-pink" aria-hidden="true" />
                <span className="text-[14.5px] leading-snug text-app-textPrimary">{step}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {article.safetyNote && (
        <p className="mt-4 rounded-[16px] bg-black/[0.035] p-4 text-[13px] leading-snug text-app-textSecondary">
          {article.safetyNote}
        </p>
      )}

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-bold text-app-textPrimary">Keep reading</h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenArticle(item)}
                  className="block w-full rounded-[16px] border border-app-borderIdle bg-white p-4 text-left"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ios-pink">
                    {item.category}
                  </span>
                  <span className="mt-1 block text-[15px] font-bold leading-snug text-app-textPrimary">
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={onAskAnother}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[15px] font-bold text-white"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Ask another question
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="mt-3 w-full text-center text-[13.5px] font-semibold text-app-textSecondary underline underline-offset-2"
      >
        Remove this answer
      </button>
    </article>
  );
}

/** Shown when the question describes something that needs a person, not a page. */
function ClinicianView({ outcome, onAskAnother }) {
  return (
    <div>
      <p className="flex items-start gap-2 text-[13px] font-medium leading-snug text-app-textSecondary">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-textSecondary" aria-hidden="true" />
        <span>You asked: {outcome.question}</span>
      </p>

      <h1 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.4px] text-app-textPrimary">
        {outcome.headline}
      </h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-app-textPrimary">{outcome.body}</p>

      <section className="mt-6 rounded-[18px] border border-app-borderIdle bg-white p-4">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Worth taking with you
        </h2>
        <ul className="mt-3 space-y-3">
          {outcome.whatToBring.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ios-pink" aria-hidden="true" />
              <span className="text-[14.5px] leading-snug text-app-textPrimary">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-4 text-[13px] leading-snug text-app-textSecondary">
        Pelvi does not diagnose, so it will not guess at what this is. A doctor or a pelvic health
        physiotherapist can tell you properly, and then everything you do next is safe.
      </p>

      <button
        type="button"
        onClick={onAskAnother}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[15px] font-bold text-white"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Ask something else
      </button>
    </div>
  );
}

/** Shown when the question is about the app: billing, streaks, how it works. */
function CoachHandoffView({ outcome, onAskAnother, onOpenCoach }) {
  return (
    <div className="grid place-items-center py-8 text-center">
      <span className="grid h-[84px] w-[84px] place-items-center overflow-hidden rounded-full bg-app-primary/10 ring-2 ring-app-primary/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coachMiaAvatar.png" alt="" className="h-full w-full object-cover" />
      </span>
      <h1 className="mt-5 text-[20px] font-bold leading-snug text-app-textPrimary">
        {outcome.headline}
      </h1>
      <p className="mt-2 max-w-sm text-[14.5px] leading-snug text-app-textSecondary">
        {outcome.body}
      </p>
      <button
        type="button"
        onClick={onOpenCoach}
        className="mt-6 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-cta-gradient text-[15px] font-bold text-white"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Open Coach Mia
      </button>
      <button
        type="button"
        onClick={onAskAnother}
        className="mt-3 text-[14px] font-semibold text-app-textSecondary underline underline-offset-2"
      >
        Ask something else
      </button>
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

/**
 * Article bodies are written in a small slice of markdown: `**bold**` and
 * `*emphasis*`. The phone parses both, so printing the asterisks here would make the
 * same paragraph look broken on one device and fine on the other.
 *
 * Read line by line, and an opening asterisk followed by a space is left
 * alone, because that is a bullet: "* Cow Pose" is a list item, not the start
 * of an italic run that swallows the rest of her plan.
 */
function inline(text) {
  const nodes = [];

  String(text ?? "").split("\n").forEach((line, index) => {
    if (index > 0) nodes.push({ text: "\n" });
    let rest = line;
    // A bound, not a belief: a pathological string cannot spin here.
    for (let guard = 0; rest && guard < 200; guard += 1) {
      const bold = rest.match(/\*\*([^*]+)\*\*/);
      const emphasis = rest.match(/\*([^*\s][^*]*?)\*/);
      const useBold = bold && (!emphasis || bold.index <= emphasis.index);
      const found = useBold ? bold : emphasis;
      if (!found) break;
      if (found.index > 0) nodes.push({ text: rest.slice(0, found.index) });
      nodes.push({ text: found[1], strong: useBold, em: !useBold });
      rest = rest.slice(found.index + found[0].length);
    }
    if (rest) nodes.push({ text: rest });
  });

  return nodes.map((node, i) => {
    if (node.strong) return <strong key={i}>{node.text}</strong>;
    if (node.em) return <em key={i}>{node.text}</em>;
    return <span key={i}>{node.text}</span>;
  });
}
