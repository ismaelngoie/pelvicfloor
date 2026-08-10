"use client";

// The Overview tab: seven numbers, then five charts.
//
// Every tile says what it counts and over what window, in the same plain
// English the app uses with members. If a number cannot honestly be worked out
// from the data we hold, the tile says why instead of showing a zero.
//
// The two subscription tiles are the careful ones. This dashboard reads member
// records out of Firestore and nothing else, and a member record does not say
// who is paying through Stripe. So those two tiles count what they can see,
// name what they cannot, and send the owner to Stripe for the real figure.

import { useMemo, useState } from "react";
import {
  ACTIVE_WINDOW_DAYS,
  MONTHLY_PRICE_USD,
  PROGRAM_LENGTH_DAYS,
  RANGES,
  buildBuckets,
  computeOverview,
  formatCount,
  formatMoney,
  formatMoneyExact,
  formatOneDecimal,
  formatPercent,
  goalBreakdown,
  lastSeenSeries,
  programStageBreakdown,
  rangeById,
  revenueSeries,
  signupSeries,
} from "@/lib/adminMetrics";
import { BarListChart, TimeSeriesChart, UnavailableChart } from "./charts";
import { Card, EmptyState, SectionHeader, Segmented, TileSkeleton, ChartSkeleton } from "./ui";

/* -------------------------------------------------------------------------
   Tiles
   ------------------------------------------------------------------------- */

function Tile({ label, value, explanation, footnote, hero = false, delay = 0, unavailableReason, className = "" }) {
  return (
    <Card
      // `hero` is a bigger figure and nothing else. It used to span two columns
      // as well, which made the four-tile row add up to five cells: a clean 2x2
      // at tablet width became two rows and a hole, and the four-across row at
      // desktop became three items. The size of the number carries the emphasis
      // on its own.
      className={`pv-rise flex flex-col p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--pv-ink-3)" }}
      >
        {label}
      </p>

      {unavailableReason ? (
        <p className="mt-3 text-sm font-semibold leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          {unavailableReason}
        </p>
      ) : (
        <p
          className={`pv-figure mt-2 font-semibold ${hero ? "text-[52px] leading-[1.02]" : "text-[34px] leading-[1.1]"}`}
          style={{ color: "var(--pv-ink)" }}
        >
          {value}
        </p>
      )}

      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
        {explanation}
      </p>

      {/* Deliberately NOT pushed to the bottom with mt-auto. Tiles in a row
          stretch to the tallest one, and pinning the footnote to the floor put
          the slack in the middle of the short tiles, where it read as a hole.
          Left in place, the same slack falls under the last line and reads as
          padding. */}
      {footnote ? (
        <p className="pt-3 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
          {footnote}
        </p>
      ) : null}
    </Card>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      {/* Same two rows the real thing uses, so the page does not jump when the
          numbers land. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   The tab
   ------------------------------------------------------------------------- */

export default function Overview({ members, now }) {
  const [rangeId, setRangeId] = useState("90d");

  const stats = useMemo(() => computeOverview(members, now), [members, now]);
  const buckets = useMemo(() => buildBuckets(members, rangeId, now), [members, rangeId, now]);
  const range = rangeById(rangeId);

  const signups = useMemo(() => signupSeries(members, buckets), [members, buckets]);
  const lastSeen = useMemo(() => lastSeenSeries(members, buckets), [members, buckets]);
  const revenue = useMemo(() => revenueSeries(members, buckets), [members, buckets]);
  const stages = useMemo(() => programStageBreakdown(members), [members]);
  const goals = useMemo(() => goalBreakdown(members), [members]);

  if (members.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          title="No members yet"
          description="Nobody has a record in Firestore yet. The moment somebody finishes onboarding on the phone or signs in on the web, she shows up here."
        />
      </Card>
    );
  }

  const stageColors = [
    "var(--pv-step-1)",
    "var(--pv-step-2)",
    "var(--pv-step-3)",
    "var(--pv-step-4)",
    "var(--pv-step-5)",
  ];

  // The one sentence both subscription tiles fall back to when there is
  // genuinely nothing to count. It has to explain the gap without sounding like
  // a bug, because it is not one: nobody has told this database who is paying.
  const noSubscriptionReason =
    "This dashboard cannot see Stripe. It reads member records, and a member record does not say who is subscribed on the website. It fills in as iPhone members start their program, and as you mark people by hand on the Members tab. For the real subscriber count and the real revenue, open your Stripe dashboard.";

  // Said under every subscription number, so the size of the blind spot is
  // always next to the number it is missing from.
  const blindSpotNote =
    stats.unknownSubscription > 0
      ? `${formatCount(stats.unknownSubscription)} of ${formatCount(stats.total)} members have no subscription state here at all, so the real figure is higher. Stripe has it.`
      : "Every member has a subscription state here. Stripe is still the place to check the money itself.";

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------------- */}
      <section>
        <SectionHeader
          eyebrow="Right now"
          title="The numbers"
          description="Counted from every member record, at the moment this page was loaded. Press Count again for a fresh set."
        />

        {/* Row one: the four numbers worth having above the fold. Everything
            with a paragraph of caveats attached is in the row below, because
            mixing a one-line tile and a six-line tile in the same row stretches
            the short one into a mostly-empty box. */}
        {/* Four across only from 1280. At 1024 the sidebar has already taken
            240px, and splitting what is left four ways gave tiles 176px wide
            whose explanation ran three words to a line. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            hero
            delay={0}
            label="Members"
            value={formatCount(stats.total)}
            explanation="Everyone with a record, from the iPhone app and the website together."
            footnote={
              stats.withGoal < stats.total
                ? `${formatCount(stats.total - stats.withGoal)} of them have not picked a goal yet.`
                : "Every one of them has picked a goal."
            }
          />

          <Tile
            delay={40}
            label="New this week"
            value={formatCount(stats.newThisWeek)}
            explanation={`People who joined in the last ${ACTIVE_WINDOW_DAYS} days.`}
            footnote={`That is ${formatPercent(stats.newThisWeek, stats.total, "not enough members to work out a share")} of all members.`}
          />

          <Tile
            delay={80}
            label="Active in the last 7 days"
            value={formatCount(stats.activeThisWeek)}
            explanation={`People who opened Pelvi in the last ${ACTIVE_WINDOW_DAYS} days.`}
            footnote={`That is ${formatPercent(stats.activeThisWeek, stats.total, "not enough members to work out a share")} of all members.`}
          />

          <Tile
            delay={120}
            label="Average day reached"
            value={formatOneDecimal(stats.averageDay)}
            unavailableReason={stats.averageDay === null ? "Nobody has started yet" : null}
            explanation={`How far through the ${PROGRAM_LENGTH_DAYS} days the average member has got.`}
            footnote={
              stats.averageDay === null
                ? "No member record has a program day on it yet."
                : `Worked out from the ${formatCount(stats.dayCount)} members who have a day recorded.`
            }
          />
        </div>

        {/* Row two: the three that need explaining. The two subscription tiles
            hide the figure entirely when there is nothing visible, rather than
            showing a zero. A 52px "0" reads as a fact however carefully the
            small print underneath is worded, and on a business that is taking
            money it would be the wrong fact. */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Tile
            delay={160}
            label={`Finished all ${PROGRAM_LENGTH_DAYS} days`}
            value={formatCount(stats.finished)}
            unavailableReason={stats.finished === null ? "Nobody has started yet" : null}
            explanation={`Members who reached day ${PROGRAM_LENGTH_DAYS}, the end of the program.`}
            footnote={
              stats.finished === null
                ? "No member record has a program day on it yet."
                : `That is ${formatPercent(stats.finished, stats.dayCount, "not enough members to work out a share")} of the members who have started.`
            }
          />

          <Tile
            delay={200}
            label="Paying members it can see"
            value={formatCount(stats.paying)}
            unavailableReason={stats.paying > 0 ? null : "Not known here"}
            explanation={
              stats.paying > 0
                ? "A floor, not a total. It counts the members who bought on the iPhone and the members you marked by hand, and nobody else."
                : noSubscriptionReason
            }
            footnote={
              stats.paying > 0
                ? `${formatCount(stats.payingFromPhone)} bought on the iPhone and ${formatCount(stats.payingByHand)} you marked by hand. Of all of them, ${formatCount(stats.onTrial)} are inside a free trial and are left out of the revenue number. ${blindSpotNote}`
                : null
            }
          />

          <Tile
            delay={240}
            label="Monthly revenue it can see"
            value={formatMoney(stats.monthlyRevenue)}
            unavailableReason={stats.monthlyRevenue === null ? "Not known here" : null}
            explanation={
              stats.monthlyRevenue !== null
                ? `The ${formatCount(stats.billed)} member${stats.billed === 1 ? "" : "s"} this dashboard can see money from, times the ${formatMoneyExact(MONTHLY_PRICE_USD)} monthly price. It is the least you are earning, not the total.`
                : stats.hasSubscriptionData
                ? "This dashboard cannot see anybody being charged right now. That is not the same as nobody paying: it cannot see Stripe, and everyone who subscribed on the website is invisible to it. Open your Stripe dashboard for the real figure."
                : noSubscriptionReason
            }
            footnote={
              stats.monthlyRevenue !== null
                ? `Counted from what this dashboard can see, which is iPhone purchases and the people you marked by hand. Web subscriptions, cancellations, refunds and failed payments are all missing, it cannot tell whether an iPhone subscription is still live, and Apple keeps a share of the iPhone ones before the money reaches you. ${blindSpotNote}`
                : null
            }
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        <SectionHeader
          eyebrow="Over time"
          title="How it is going"
          description="One time range for every chart below, so they always line up."
          action={
            <Segmented
              label="Time range for every chart"
              value={rangeId}
              onChange={setRangeId}
              options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
            />
          }
        />

        {/* One column on a phone, two from 1024, and a 12-column grid from
            1280 so the trend a person actually reads gets more room than the
            breakdown sitting next to it. Below xl no child carries a span, so
            they fall back to one cell each in the two-column grid. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
          <TimeSeriesChart
            delay={0}
            className="xl:col-span-7"
            title="Signups over time"
            subtitle={`How many people joined in each period, across ${range.longLabel}.`}
            buckets={buckets}
            values={signups}
            mode="column"
            color="var(--pv-series-1)"
            valueNoun="signups"
            emptyTitle="No signups in this window"
            emptyDescription="Try a longer time range, or wait for the first member to join."
          />

          <TimeSeriesChart
            delay={60}
            className="xl:col-span-5"
            title="Active members over time"
            subtitle={`Each member counts once, in the period she last opened Pelvi, across ${range.longLabel}.`}
            buckets={buckets}
            values={lastSeen}
            mode="column"
            color="var(--pv-series-2)"
            valueNoun="members"
            note="Bars near the right are the members still coming back. Bars on the left are people who have not been seen since. We only store the last time each member was seen, so a member cannot appear in two periods at once."
            emptyTitle="Nobody was seen in this window"
            emptyDescription="Try a longer time range."
          />

          {/* Gated on the money being visible, not merely on some subscription
              state existing. With nobody visibly paying, this chart would draw
              a flat line along zero, and a zero drawn that confidently is the
              one thing this dashboard must never say about revenue. */}
          {stats.monthlyRevenue !== null ? (
            <TimeSeriesChart
              delay={120}
              className="xl:col-span-7"
              title="Revenue this dashboard can see, over time"
              subtitle={`What it can see at the end of each period, across ${range.longLabel}. The real line is higher.`}
              buckets={buckets}
              values={revenue}
              mode="area"
              color="var(--pv-series-3)"
              valueNoun="dollars a month"
              formatValue={formatMoney}
              formatAxis={formatMoney}
              note={`Every member it can see money from who had joined by then, times the ${formatMoneyExact(MONTHLY_PRICE_USD)} monthly price. That means iPhone purchases and the people you marked by hand. Subscriptions taken on the website through Stripe are not in this line at any point, and neither are cancellations or refunds. Apple keeps a share of the iPhone purchases as well. Your Stripe dashboard has the real chart.`}
              emptyTitle="Nothing visible in this window"
              emptyDescription="Try a longer time range, or check Stripe."
            />
          ) : (
            <UnavailableChart
              delay={120}
              className="xl:col-span-7"
              title="Revenue this dashboard can see, over time"
              subtitle="Monthly revenue, period by period."
              reason={noSubscriptionReason}
            />
          )}

          <BarListChart
            delay={180}
            className="xl:col-span-5"
            title={`Where members are in their ${PROGRAM_LENGTH_DAYS} days`}
            subtitle="Every member sorted into the stretch of the program she has reached."
            rows={stages.stages.map((s) => ({ id: s.id, label: `${s.label}  ·  ${s.note}`, value: s.value }))}
            colors={stageColors}
            note={
              stages.unknown > 0
                ? `${formatCount(stages.unknown)} member${stages.unknown === 1 ? "" : "s"} are not shown here because no program day has been recorded for them yet. That happens before somebody starts day 1.`
                : "Every member has a program day recorded."
            }
            emptyTitle="No program days recorded yet"
            emptyDescription="This fills in as soon as members start their first day."
          />

          <BarListChart
            delay={240}
            className="lg:col-span-2 xl:col-span-12"
            title="Goal breakdown"
            subtitle="Which goal members chose when they signed up, most popular first."
            rows={goals}
            colors="var(--pv-series-1)"
            note="A member can change her goal later, so this is where everyone stands today, not what they picked on day one."
            emptyTitle="No goals chosen yet"
            emptyDescription="This fills in as members finish onboarding."
          />
        </div>
      </section>
    </div>
  );
}
