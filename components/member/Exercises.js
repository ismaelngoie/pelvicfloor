"use client";

// Exercises. All 533 of them, searchable.
//
// The count in the header, in the placeholder and on every filter chip comes
// from the catalog that shipped. Nothing here is a literal, so the day the
// library grows the copy grows with it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Flame, GraduationCap, Grid2x2, Loader2, Map as MapIcon, Play, RotateCcw,
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
    goalId, dayNumber, planLength, savedIds, toggleSaved, history,
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
  //
  // Only when it actually SWITCHES. This used to fire on mount as well, which
  // meant every arrival on this tab was yanked back to the header — including
  // the arrival where the shell had just restored where she was reading, so
  // Exercises was the one tab that never remembered its place.
  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current === active) return;
    wasActive.current = active;
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
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4 tab:max-w-none tab:px-6 lg:px-8 lg:pt-6 2xl:max-w-[1600px]">
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

      {/* From 1024 the facets get a rail of their own and the results get the
          rest. Below that this whole block is a plain column and the facets
          stay in the bottom sheet, which is the right place for them under a
          thumb. */}
      <div className="xl:flex xl:items-start xl:gap-8">
        <FilterRail
          index={index}
          filters={filters}
          setFilters={setFilters}
          savedCount={savedIds.length}
        />

        <div className="min-w-0 flex-1">
      {/* Search */}
      <div className="mt-4 lg:mt-0">
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

      {/* Quick filters. The whole row belongs to every width below the rail: at
          xl every one of these is already visible and checkable in the rail,
          and a second copy of the same controls above the grid is how a filter
          UI starts disagreeing with itself. This breakpoint and the rail's have
          to stay in step, or a laptop gets neither. */}
      {index && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar xl:hidden">
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

      <AppliedChips index={index} filters={filters} setFilters={setFilters} />

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
              <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              {/* LibrarySpotlight.swift prints style.pathwayTitle here too, not
                  the plan's name inside the JSON. Keep the two in step. */}
              {pathwayTitle(goalId)}
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
        </div>
      </div>

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
// responsive on a phone. 48 divides cleanly by every column count the grid
// uses (2, 3, 4 and 6), so a page never ends on a ragged half-row.
const PAGE_SIZE = 48;

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
      {/* A list under the thumb, a grid on anything wider. The card itself
          switches shape at the same breakpoint, so this is one set of nodes and
          not two lists with a `hidden` on each.

          The counts are picked so a card stays roughly 220-260px wide at every
          width, not so the columns keep multiplying. That is why xl holds at
          three: the filter rail arrives at xl and takes 264px with it, so the
          grid gets no wider than it was at lg. Chasing the viewport instead
          would put four 168px cards there, and a still frame that small tells
          you nothing about which movement it is. */}
      <ul className="mt-3 divide-y divide-black/[0.06] tab:grid tab:grid-cols-2 tab:gap-x-5 tab:gap-y-6 tab:divide-y-0 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
        {results.slice(0, shown).map((item) => (
          <li key={item.id} className="pv-defer-paint py-2.5 tab:py-0">
            <ExerciseCard
              item={item}
              layout="responsive"
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
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary tab:mx-auto tab:w-auto tab:px-8"
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
        {/* The ratio is right on a phone and absurd on a laptop: at 900px wide
            it is a 500px tall slab that pushes every shelf below the fold.
            Capping the height lets it stay a banner instead of a billboard. */}
        <ExerciseThumb item={first} className="aspect-[1/0.56] w-full tab:max-h-[300px]" eager />
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

/**
 * The facets, as a rail, from 1024px up.
 *
 * Same FacetGroup component the bottom sheet uses, so the two can never drift
 * apart and say different things about what is selected. It sticks while the
 * grid scrolls, and scrolls internally when the facet list is taller than the
 * viewport, which it is on a laptop with every group open.
 */
function FilterRail({ index, filters, setFilters, savedCount }) {
  if (!index) return null;

  return (
    <aside
      aria-label="Filters"
      // 1280, not 1024. The member app already spends 248px on its own
      // navigation, and adding a 264px rail at 1024 left 430px for the grid:
      // three columns of 140px, every title clipped mid-word. A rail that
      // starves the thing it is filtering is worse than a button.
      className="hidden xl:sticky xl:top-0 xl:block xl:max-h-[calc(100svh-2rem)] xl:w-[264px] xl:shrink-0 xl:self-start xl:overflow-y-auto xl:pb-8 xl:pt-1"
    >
      {/* No count and no "clear all" here on purpose. Both already sit directly
          above the grid, where somebody looking at results is looking, and two
          of each on one screen is how a filter UI starts contradicting itself. */}
      <h2 className="pb-4 text-[15px] font-bold text-app-textPrimary">Filters</h2>

      <div className="space-y-6">
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
      </div>
    </aside>
  );
}

/**
 * Everything currently narrowing the results, above the grid, each one
 * removable on its own.
 *
 * Baymard's finding is that people look for a filter where they applied it, so
 * this does NOT replace the rail's checked state: both are on screen at once,
 * showing the same selection. Chips alone is the half-implementation that
 * measurably confuses people.
 *
 * It only exists from xl, because below that there is no rail to disagree with
 * and the quick-filter row already carries the same job under her thumb.
 */
function AppliedChips({ index, filters, setFilters }) {
  const applied = useMemo(() => {
    if (!index) return [];
    const label = (facets, id) => facets.find((f) => f.id === id)?.label || id;
    const out = [];
    if (filters.query.trim()) {
      out.push({
        key: "query",
        text: `"${filters.query.trim()}"`,
        clear: (f) => ({ ...f, query: "" }),
      });
    }
    if (filters.savedOnly) {
      out.push({ key: "saved", text: "Saved", clear: (f) => ({ ...f, savedOnly: false }) });
    }
    const groups = [
      ["tags", index.tagFacets],
      ["styles", index.styleFacets],
      ["lengths", index.lengthFacets],
      ["coaches", index.coachFacets],
    ];
    for (const [key, facets] of groups) {
      for (const id of filters[key]) {
        out.push({
          key: `${key}-${id}`,
          text: label(facets, id),
          clear: (f) => toggleFilter(f, key, id),
        });
      }
    }
    return out;
  }, [index, filters]);

  if (applied.length === 0) return null;

  return (
    <div className="hidden xl:mt-4 xl:block">
      <ul className="flex flex-wrap items-center gap-2">
        {applied.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={() => setFilters(chip.clear)}
              aria-label={`Remove the ${chip.text} filter`}
              className="flex h-9 items-center gap-1.5 rounded-full border border-ios-pink bg-ios-pink/[0.08] pl-3.5 pr-2.5 text-[13px] font-semibold text-app-textPrimary"
            >
              {chip.text}
              <X className="h-3.5 w-3.5 text-ios-pink" aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="h-9 px-2 text-[13px] font-semibold text-ios-pink"
          >
            Clear all
          </button>
        </li>
      </ul>
    </div>
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
