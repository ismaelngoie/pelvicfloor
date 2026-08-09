"use client";

// Exercises. All 533 of them, searchable.
//
// The count in the header, in the placeholder and on every filter chip comes
// from the catalog that shipped. Nothing here is a literal, so the day the
// library grows the copy grows with it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Flame, GraduationCap, Grid2x2, Loader2, Map, Play, RotateCcw,
  Search, SlidersHorizontal, X,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import {
  Card, ExerciseCard, ExerciseShelf, ExerciseThumb, FilterChip, PrimaryButton,
  SectionHeader, Sheet,
} from "./ui";
import { usePrefersReducedMotion } from "./VideoPlayer";
import {
  EMPTY_FILTERS, filterSelectionCount, filtersAreActive, loadLibrary,
  resolveIds, runFilters, toggleFilter,
} from "@/lib/library";
import { goalAccentCSS, pathwayTitle } from "@/lib/goalCopy";

export default function Exercises() {
  const {
    goalId, program, dayNumber, planLength, savedIds, toggleSaved, history,
  } = useMember();
  const { openPlayer } = usePlayer();

  const [library, setLibrary] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const topRef = useRef(null);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    loadLibrary(goalId)
      .then((next) => { if (!cancelled) setLibrary(next); })
      .catch(() => {
        if (!cancelled) setLoadError("We could not load your exercises. Check your connection and try again.");
      });
    return () => { cancelled = true; };
  }, [goalId]);

  // Pelvic Pilates is the gentlest starting point, so it opens first.
  useEffect(() => {
    if (!library?.categories?.length) return;
    const pilates = library.categories.findIndex((c) => c.title === "Pelvic Pilates");
    setCategoryIndex(pilates >= 0 ? pilates : 0);
  }, [library]);

  const index = library?.index || null;
  const active = filtersAreActive(filters);
  const results = useMemo(
    () => (index && active ? runFilters(index, filters, savedIds) : []),
    [index, active, filters, savedIds]
  );

  // Switching between browsing and results must not leave her in the middle of
  // a list she did not ask for.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [active, reduceMotion]);

  const play = useCallback(
    (item, list, title) => {
      const playlist = list?.length ? list : [item];
      const startIndex = Math.max(playlist.findIndex((v) => v.id === item.id), 0);
      openPlayer({ videos: playlist, startIndex, title: title || item.title });
    },
    [openPlayer]
  );

  const savedItems = useMemo(() => resolveIds(index, savedIds), [index, savedIds]);
  const recentItems = useMemo(
    () => resolveIds(index, history.recent).slice(0, 15),
    [index, history.recent]
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
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
      <span ref={topRef} aria-hidden="true" />

      <header className="px-1">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
          Exercises
        </h1>
        {index ? (
          <p className="mt-1 text-[15px] text-app-textSecondary">
            <span className="text-[17px] font-extrabold text-ios-pink">{index.totalCount}</span>{" "}
            exercises, filmed with your coaches.
          </p>
        ) : (
          <p className="mt-1 text-[15px] text-app-textSecondary">Getting your exercises ready.</p>
        )}
      </header>

      {/* Search */}
      <div className="mt-4">
        <label className="relative block">
          <span className="sr-only">
            {index ? `Search ${index.totalCount} exercises` : "Search exercises"}
          </span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-app-textSecondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder={index ? `Search ${index.totalCount} exercises` : "Search exercises"}
            className="h-12 w-full rounded-full border border-app-borderIdle bg-white pl-11 pr-11 text-[15px] text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, query: "" }))}
              aria-label="Clear the search"
              className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/5"
            >
              <X className="h-4 w-4 text-app-textSecondary" aria-hidden="true" />
            </button>
          )}
        </label>

        {searchFocused && !filters.query.trim() && index?.tagFacets?.length > 0 && (
          <div className="mt-3">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-app-textSecondary">
              Popular right now
            </p>
            <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {index.tagFacets.slice(0, 6).map((facet) => (
                <li key={facet.id}>
                  <FilterChip
                    label={facet.label}
                    count={facet.count}
                    on={false}
                    onClick={() => setFilters((f) => ({ ...f, query: facet.label }))}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quick filters */}
      {index && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-app-borderIdle bg-white px-3.5 text-[13px] font-semibold text-app-textPrimary"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {filterSelectionCount(filters) > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-ios-pink px-1 text-[11px] font-bold text-white">
                {filterSelectionCount(filters)}
              </span>
            )}
          </button>
          <FilterChip
            label="Saved"
            count={savedIds.length}
            on={filters.savedOnly}
            onClick={() => setFilters((f) => ({ ...f, savedOnly: !f.savedOnly }))}
            ariaLabel={`Saved, ${savedIds.length} exercises`}
          />
          {index.tagFacets.slice(0, 8).map((facet) => (
            <FilterChip
              key={facet.id}
              label={facet.label}
              count={facet.count}
              on={filters.tags.includes(facet.id)}
              onClick={() => setFilters((f) => toggleFilter(f, "tags", facet.id))}
            />
          ))}
          {active && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-9 shrink-0 whitespace-nowrap px-2 text-[13px] font-semibold text-ios-pink"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {!index && (
        <div className="grid place-items-center py-20">
          <Loader2
            className={`h-7 w-7 text-ios-pink ${reduceMotion ? "" : "animate-spin"}`}
            aria-hidden="true"
          />
          <span className="sr-only">Loading the exercise library</span>
        </div>
      )}

      {index && active && (
        <Results
          results={results}
          onPlay={(item) => play(item, results, "Search results")}
          onToggleSaved={toggleSaved}
          savedSet={savedSet}
          watchedSet={history.completed}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
      )}

      {index && !active && (
        <div className="mt-6 space-y-8">
          {/* Library spotlight: her plan, one tap away from the library. */}
          <Link
            href="/app"
            className="block rounded-[20px] p-4 text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/30"
            style={{ backgroundImage: goalAccentCSS(goalId) }}
          >
            <span className="flex items-center gap-2 text-[16px] font-bold">
              <Map className="h-[18px] w-[18px]" aria-hidden="true" />
              {program?.title || pathwayTitle(goalId)}
            </span>
            <span className="mt-1 block text-[12.5px] font-semibold text-white/90">
              {planLength ? `Day ${Math.min(dayNumber, planLength)} of ${planLength}` : "Your 90 day plan"}
            </span>
          </Link>

          <ExerciseShelf
            title="Jump back in"
            subtitle="The exercises you did most recently."
            items={recentItems}
            onPlay={(item, list) => play(item, list, "Jump back in")}
            onToggleSaved={toggleSaved}
            savedSet={savedSet}
            watchedSet={history.completed}
          />

          <ExerciseShelf
            title="Saved by you"
            subtitle="Your own shortlist, always here."
            items={savedItems}
            onPlay={(item, list) => play(item, list, "Saved by you")}
            onToggleSaved={toggleSaved}
            savedSet={savedSet}
            watchedSet={history.completed}
            onSeeAll={() => setFilters((f) => ({ ...f, savedOnly: true }))}
          />

          {library.featured && (
            <FeaturedCard
              shelf={library.featured}
              reduceMotion={reduceMotion}
              onPlay={() =>
                openPlayer({
                  videos: library.featured.items,
                  title: library.featured.title,
                  subtitle: `with ${library.featured.coach}`,
                })
              }
            />
          )}

          {library.collections.map((collection) => (
            <ExerciseShelf
              key={collection.id}
              title={collection.title}
              subtitle={collection.subtitle}
              items={collection.items}
              onPlay={(item, list) => play(item, list, collection.title)}
              onToggleSaved={toggleSaved}
              savedSet={savedSet}
              watchedSet={history.completed}
              onSeeAll={() => setFilters(collection.filters)}
            />
          ))}

          <PerfectYourForm
            modules={library.formModules}
            onPlay={(module) =>
              openPlayer({
                videos: module.items,
                title: module.title,
                subtitle: "Perfect Your Form",
              })
            }
          />

          <BrowseByCategory
            categories={library.categories}
            selected={categoryIndex}
            onSelect={setCategoryIndex}
            onPlay={play}
            onToggleSaved={toggleSaved}
            savedSet={savedSet}
            watchedSet={history.completed}
          />

          {library.shelves.map((shelf) => (
            <ExerciseShelf
              key={shelf.id}
              title={shelf.title}
              subtitle={`${shelf.benefit} With ${shelf.coach}.`}
              items={shelf.items}
              onPlay={(item, list) => play(item, list, shelf.title)}
              onToggleSaved={toggleSaved}
              savedSet={savedSet}
              watchedSet={history.completed}
            />
          ))}
        </div>
      )}

      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        index={index}
        filters={filters}
        setFilters={setFilters}
        savedCount={savedIds.length}
        resultCount={active ? results.length : index?.totalCount || 0}
      />
    </div>
  );
}

// --- Sections --------------------------------------------------------------

// A wide-open filter can match all 533. Draw a page at a time so the list stays
// responsive on a phone.
const PAGE_SIZE = 40;

function Results({ results, onPlay, onToggleSaved, savedSet, watchedSet, onClear }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => { setShown(PAGE_SIZE); }, [results]);

  if (!results.length) {
    return (
      <Card className="mt-6 text-center">
        <p className="text-[16px] font-bold text-app-textPrimary">No exercises match that.</p>
        <p className="mt-2 text-[14px] text-app-textSecondary">
          Try a shorter word, or clear your filters and browse instead.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 text-[14px] font-semibold text-ios-pink"
        >
          Clear all filters
        </button>
      </Card>
    );
  }

  return (
    <section className="mt-5" aria-label="Search results">
      <p className="px-1 text-[13px] font-semibold text-app-textSecondary" role="status">
        {results.length} {results.length === 1 ? "exercise" : "exercises"}
      </p>
      <ul className="mt-3 divide-y divide-black/[0.06]">
        {results.slice(0, shown).map((item) => (
          <li key={item.id} className="py-2.5">
            <ExerciseCard
              item={item}
              layout="row"
              onPlay={onPlay}
              onToggleSaved={onToggleSaved}
              saved={savedSet.has(item.id)}
              watched={watchedSet.has(item.id)}
            />
          </li>
        ))}
      </ul>

      {results.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
        >
          Show {Math.min(PAGE_SIZE, results.length - shown)} more
        </button>
      )}
    </section>
  );
}

function FeaturedCard({ shelf, onPlay, reduceMotion }) {
  const first = shelf.items[0];
  return (
    <section aria-labelledby="featured-workout">
      <button
        type="button"
        onClick={onPlay}
        className="relative block w-full overflow-hidden rounded-3xl text-left shadow-[0_6px_12px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/20"
        aria-label={`Play the featured workout, ${shelf.title} with ${shelf.coach}, ${shelf.items.length} exercises`}
      >
        <ExerciseThumb item={first} className="aspect-[1/0.56] w-full" eager />
        <span className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/90" />

        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          Featured
        </span>

        {/* Sits in the upper half so it never lands on the title below. */}
        <span className="absolute inset-x-0 top-0 grid h-1/2 place-items-center">
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-black/40 backdrop-blur-[2px]">
            {!reduceMotion && (
              <span className="absolute inset-0 animate-ping rounded-full bg-white/25" aria-hidden="true" />
            )}
            <Play className="relative h-7 w-7 translate-x-[2px] fill-white text-white" aria-hidden="true" />
          </span>
        </span>

        <span className="absolute inset-x-0 bottom-0 block p-4 text-white">
          <span id="featured-workout" className="block text-[21px] font-bold leading-tight">
            {shelf.title}
          </span>
          <span className="mt-1 block text-[14px] text-white/90">{shelf.benefit}</span>
          <span className="mt-2 block text-[14px] font-semibold">
            with {shelf.coach} · {shelf.items.length} exercises
          </span>
        </span>
      </button>
    </section>
  );
}

function PerfectYourForm({ modules, onPlay }) {
  if (!modules?.length) return null;
  const total = modules.reduce((sum, m) => sum + m.items.length, 0);
  return (
    <section aria-labelledby="perfect-your-form">
      <SectionHeader
        id="perfect-your-form"
        title="Perfect Your Form"
        subtitle={`${total} short lessons. Learn the move, then use it with confidence.`}
      />
      <ul className="mt-3 space-y-3">
        {modules.map((module) => (
          <li key={module.id}>
            <button
              type="button"
              onClick={() => onPlay(module)}
              className="flex w-full items-center gap-3 rounded-[18px] border border-app-borderIdle bg-white p-3 text-left"
              aria-label={`Play ${module.title}, ${module.items.length} lessons. ${module.purpose}`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-app-primary/10">
                <GraduationCap className="h-5 w-5 text-app-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-app-textPrimary">
                  {module.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-app-textSecondary">
                  {module.purpose}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-app-textSecondary">
                {module.items.length}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BrowseByCategory({
  categories, selected, onSelect, onPlay, onToggleSaved, savedSet, watchedSet,
}) {
  if (!categories?.length) return null;
  const total = categories.reduce((sum, c) => sum + c.items.length, 0);
  const current = categories[selected] || categories[0];

  return (
    <section aria-labelledby="browse-by-category">
      <SectionHeader
        id="browse-by-category"
        title="Browse by category"
        subtitle={`${total} exercises across ${numberWord(categories.length)} styles.`}
      />
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist">
        {categories.map((category, i) => (
          <li key={category.id} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => onSelect(i)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
                i === selected
                  ? "border-ios-pink bg-ios-pink text-white"
                  : "border-app-borderIdle bg-white text-app-textPrimary"
              }`}
            >
              <Grid2x2 className="h-3.5 w-3.5" aria-hidden="true" />
              {category.title}
              <span className={i === selected ? "text-white/75" : "text-app-textSecondary"}>
                {category.items.length}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <ul className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
        {current.items.map((item) => (
          <li key={item.id}>
            <ExerciseCard
              item={item}
              onPlay={() => onPlay(item, current.items, current.title)}
              onToggleSaved={onToggleSaved}
              saved={savedSet.has(item.id)}
              watched={watchedSet.has(item.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilterSheet({ open, onClose, index, filters, setFilters, savedCount, resultCount }) {
  if (!index) return null;
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <div className="space-y-6 pb-4">
        <FacetGroup
          legend="Saved"
          options={[{ id: "saved", label: "Only what I saved", count: savedCount }]}
          isOn={() => filters.savedOnly}
          onToggle={() => setFilters((f) => ({ ...f, savedOnly: !f.savedOnly }))}
        />
        <FacetGroup
          legend="Focus"
          options={index.tagFacets}
          isOn={(id) => filters.tags.includes(id)}
          onToggle={(id) => setFilters((f) => toggleFilter(f, "tags", id))}
        />
        <FacetGroup
          legend="Effort"
          options={index.styleFacets}
          isOn={(id) => filters.styles.includes(id)}
          onToggle={(id) => setFilters((f) => toggleFilter(f, "styles", id))}
        />
        <FacetGroup
          legend="Length"
          options={index.lengthFacets}
          isOn={(id) => filters.lengths.includes(id)}
          onToggle={(id) => setFilters((f) => toggleFilter(f, "lengths", id))}
        />
        <FacetGroup
          legend="Coach"
          options={index.coachFacets}
          isOn={(id) => filters.coaches.includes(id)}
          onToggle={(id) => setFilters((f) => toggleFilter(f, "coaches", id))}
        />

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-black/[0.06] bg-app-background px-5 pb-2 pt-3">
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
          <PrimaryButton className="flex-[1.6]" onClick={onClose}>
            Show {resultCount}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  );
}

function FacetGroup({ legend, options, isOn, onToggle }) {
  if (!options?.length) return null;
  return (
    <fieldset>
      <legend className="text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
        {legend}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            count={option.count}
            on={isOn(option.id)}
            onClick={() => onToggle(option.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function numberWord(n) {
  return ["zero", "one", "two", "three", "four", "five", "six"][n] || String(n);
}
