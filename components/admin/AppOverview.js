"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { Card, ErrorState, SectionHeader } from "./ui";
import { formatCount, formatMoneyExact, formatPercent, formatRelativeDay, startOfDay } from "@/lib/adminMetrics";
import { utcRange } from "./Acquisition";
import OwnerRevenue from "./OwnerRevenue";
import OwnerGrowth from "./OwnerGrowth";
import PremiumMemberMap from "./PremiumMemberMap";

function ownerValue(report, key) {
  const metric = report?.metrics?.[key];
  const value = Number(metric?.value);
  return metric?.available === true && Number.isFinite(value) ? value : null;
}

function ownerMoney(value, currency = "USD") {
  return Number.isFinite(value) ? formatMoneyExact(value, currency) : null;
}

function Metric({ label, value, note, tone = "default" }) {
  const color = tone === "good" ? "var(--pv-good)" : tone === "warn" ? "var(--pv-warn)" : "var(--pv-ink)";
  return (
    <Card className="pv-rise relative overflow-hidden p-5">
      <span
        className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full opacity-30 blur-2xl"
        style={{ background: tone === "good" ? "var(--pv-good)" : "var(--pv-violet)" }}
        aria-hidden="true"
      />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure relative mt-2 text-[38px] font-semibold leading-none" style={{ color }}>{value}</p>
      <p className="relative mt-3 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{note}</p>
    </Card>
  );
}

function Signal({ title, value, note, width, color }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{title}</p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{note}</p>
        </div>
        <p className="pv-tabular text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--pv-surface-2)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(width > 0 ? 2 : 0, Math.min(100, width || 0))}%`, background: color }} />
      </div>
    </div>
  );
}

function LastSeenChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.value));
  return (
    <div className="mt-7">
      <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="How many synced active premium profiles last opened the iPhone app on each of the last 14 days">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <span className="pv-tabular text-center text-[10px] font-semibold" style={{ color: bucket.value ? "var(--pv-ink-2)" : "transparent" }}>
              {bucket.value}
            </span>
            <div className="flex h-32 items-end overflow-hidden rounded-md" style={{ background: "var(--pv-surface-2)" }}>
              <div
                className="w-full rounded-md"
                style={{
                  height: `${bucket.value ? Math.max(8, (bucket.value / max) * 100) : 0}%`,
                  background: "linear-gradient(180deg,var(--pv-rose),var(--pv-violet))",
                }}
              />
            </div>
            <span className="truncate text-center text-[9px] uppercase" style={{ color: "var(--pv-ink-3)" }}>{bucket.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
        Each synced profile appears once, on its latest iPhone app launch stored in Firebase. RevenueCat verifies membership; this is not a fabricated historical daily-active chart.
      </p>
    </div>
  );
}

function AcquisitionPulse({ user, ownerMetrics, reloadToken, onOpen }) {
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const range = useMemo(() => utcRange(28), [reloadToken]);

  useEffect(() => {
    if (!user || typeof user.getIdToken !== "function") {
      setState("unavailable");
      return undefined;
    }
    let active = true;
    setState("loading");
    fetchAppleAdsReport(user, range.startDate, range.endDate)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("unavailable");
      });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const appleReady = state === "ready";
  const installs = Number(report?.totals?.totalInstalls) || 0;
  const spend = Number(report?.totals?.spend) || 0;
  const trialsStarted = ownerValue(ownerMetrics, "trialsStarted");
  const firstPaid = ownerValue(ownerMetrics, "firstPaidCustomers");
  const appleCurrency = report?.currency || report?.totals?.currency || null;
  const revenueCurrency = ownerMetrics?.scope?.currency || null;
  const costReady = appleReady && Boolean(appleCurrency) && appleCurrency === revenueCurrency;

  return (
    <section>
      <SectionHeader
        eyebrow="Acquisition pulse"
        title="Apple Ads at a glance"
        description="Apple spend, installs, and RevenueCat App Store outcomes use the same 28-day UTC window. Cost is calculated from real totals, never estimated from onboarding profiles."
        action={onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="min-h-[40px] rounded-full px-4 text-[13px] font-semibold"
            style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)", color: "var(--pv-ink)" }}
          >
            Open Apple Ads
          </button>
        ) : null}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Apple Ads installs · 28d" value={appleReady ? formatCount(installs) : "—"} note={appleReady ? `${formatMoneyExact(spend)} total spend` : state === "loading" ? "Loading Apple’s report" : "Apple reporting is unavailable"} />
        <Metric label="Cost per install · 28d" value={appleReady && installs > 0 ? formatMoneyExact(spend / installs) : "—"} note="Apple spend divided by Apple-reported installs" />
        <Metric label="All App Store trials · 28d" value={Number.isFinite(trialsStarted) ? formatCount(trialsStarted) : "—"} note={!Number.isFinite(trialsStarted) ? "RevenueCat reporting is unavailable" : !costReady ? "Cost appears when Apple and RevenueCat return the same currency" : trialsStarted > 0 ? `${formatMoneyExact(spend / trialsStarted)} per trial start` : "No trial starts in this period"} tone="good" />
        <Metric label="First-paid subscriptions · 28d" value={Number.isFinite(firstPaid) ? formatCount(firstPaid) : "—"} note={!Number.isFinite(firstPaid) ? "RevenueCat reporting is unavailable" : !costReady ? "Cost appears when Apple and RevenueCat return the same currency" : firstPaid > 0 ? `${formatMoneyExact(spend / firstPaid)} per first-paid subscription` : "No first payments in this period"} tone="good" />
      </div>
    </section>
  );
}

export default function AppOverview({ members, allPeople, membership, membershipError, ownerMetrics, ownerMetricsError, telemetry, now, user, reloadToken, onOpenAcquisition, onRetry }) {
  const stats = useMemo(() => {
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const activeIds = new Set();
    for (const member of members) {
      activeIds.add(member.id);
      for (const id of member.revenueCat?.identityIds || []) activeIds.add(id);
    }
    const onlyActive = (rows) => rows.filter((row) => row.memberId && activeIds.has(row.memberId));
    const completions = onlyActive(telemetry.completions || []);
    const events = onlyActive(telemetry.events || []);
    const commands = onlyActive(telemetry.commands || []);
    const started = members.filter((member) => Number.isFinite(member.programDay) && member.programDay > 0);
    const retained = members.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 8);
    const finished = members.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 90);
    const monthCompletions = completions.filter((row) => row.completedAt && row.completedAt >= monthAgo);
    const activeCompleters = new Set(monthCompletions.map((row) => row.memberId));
    const videoFailures = events.filter((event) => event.date && event.date >= new Date(now.getTime() - 7 * 86400000) && (/fail|error/i.test(event.type) || Boolean(event.error)));
    const pending = commands.filter((command) => command.status === "pending");
    const rejected = commands.filter((command) => command.status === "rejected");
    const goalCounts = new Map();
    for (const member of members) goalCounts.set(member.goalTitle, (goalCounts.get(member.goalTitle) || 0) + 1);
    const goals = [...goalCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    const today = startOfDay(now);
    const buckets = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today.getTime() - (13 - index) * 86400000);
      return {
        key: date.toISOString().slice(0, 10),
        label: index === 13 ? "Today" : date.toLocaleDateString("en-US", { weekday: "narrow" }),
        value: 0,
      };
    });
    for (const member of members) {
      if (!member.lastSeenAt) continue;
      const key = startOfDay(member.lastSeenAt).toISOString().slice(0, 10);
      const bucket = buckets.find((row) => row.key === key);
      if (bucket) bucket.value += 1;
    }

    const mostRecent = [...members].sort((a, b) => (b.lastSeenAt?.getTime() || 0) - (a.lastSeenAt?.getTime() || 0))[0];
    return { started, retained, finished, monthCompletions, activeCompleters, videoFailures, pending, rejected, goals, buckets, mostRecent };
  }, [members, telemetry, now]);

  if (membershipError) {
    return (
      <Card className="p-5">
        <ErrorState
          title="Live RevenueCat membership did not load"
          description={`${membershipError} The dashboard will not call all ${formatCount(allPeople.length)} Firebase profiles premium just to fill the screen.`}
          onRetry={onRetry}
        />
      </Card>
    );
  }

  const totals = membership?.totals || {};
  const activeTotal = Number.isFinite(totals.activePremium) ? totals.activePremium : members.length;
  const paid = Number.isFinite(totals.paid) ? totals.paid : members.filter((member) => member.premiumPhase === "paid").length;
  const trials = Number.isFinite(totals.trials) ? totals.trials : members.filter((member) => member.premiumPhase === "trial").length;
  const today = startOfDay(now);
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const openedToday = members.filter((member) => member.lastSeenAt && member.lastSeenAt >= today).length;
  const opened7Days = members.filter((member) => member.lastSeenAt && member.lastSeenAt >= sevenDaysAgo).length;
  const canceled = Number.isFinite(totals.canceledWithAccess) ? totals.canceledWithAccess : 0;
  const syncedActive = Number.isFinite(totals.syncedActivePremium) ? totals.syncedActivePremium : members.length;
  const goalMax = Math.max(1, ...stats.goals.map((row) => row.value));
  const currency = ownerMetrics?.scope?.currency || "USD";
  const grossRevenue = ownerValue(ownerMetrics, "grossRevenue");
  const lifetimeGrossRevenue = ownerValue(ownerMetrics, "lifetimeGrossRevenue");
  const lifetimeTransactions = ownerValue(ownerMetrics, "lifetimeTransactions");
  const paidRenewing = ownerValue(ownerMetrics, "paidSetToRenew");
  const trialRenewing = ownerValue(ownerMetrics, "trialsSetToRenew");
  const grossMrr = ownerValue(ownerMetrics, "mrr");
  const grossArr = ownerValue(ownerMetrics, "arr");
  const cancellations = ownerValue(ownerMetrics, "activeCancellations");
  const refunds = ownerValue(ownerMetrics, "refundedTransactions");
  const refundDetails = ownerMetrics?.metrics?.refundedTransactions || {};
  const countries = (Array.isArray(ownerMetrics?.geography?.countries) ? ownerMetrics.geography.countries : []).map((country) => ({
    countryCode: country.code,
    country: country.name,
    count: country.activePremium,
    paid: country.paid,
    trials: country.trials,
  }));
  const growthPoints = Array.isArray(ownerMetrics?.growth?.points)
    ? ownerMetrics.growth.points
    : Array.isArray(ownerMetrics?.snapshots)
      ? ownerMetrics.snapshots
      : [];
  const revenueKpis = [
    {
      label: "Revenue · selected 28d",
      value: ownerMoney(grossRevenue, currency),
      note: ownerMetrics?.scope?.startDate && ownerMetrics?.scope?.endDate
        ? `${ownerMetrics.scope.startDate} to ${ownerMetrics.scope.endDate} · gross customer revenue`
        : "Gross customer revenue across the selected UTC dates",
      tone: "rose",
    },
    {
      label: "Paid and renewing",
      value: Number.isFinite(paidRenewing) ? formatCount(paidRenewing) : null,
      note: "Active App Store paid subscriptions set to renew",
      tone: "good",
    },
    {
      label: "Trials set to renew",
      value: Number.isFinite(trialRenewing) ? formatCount(trialRenewing) : null,
      note: "Current trials that still have renewal turned on",
      tone: "neutral",
    },
    {
      label: "Gross MRR",
      value: ownerMoney(grossMrr, currency),
      note: "Current monthly recurring run rate before Apple commission",
      tone: "rose",
    },
    {
      label: "Gross ARR",
      value: ownerMoney(grossArr, currency),
      note: "Current annual recurring run rate, not cash already collected",
      tone: "rose",
    },
    {
      label: "Set to cancel",
      value: Number.isFinite(cancellations) ? formatCount(cancellations) : null,
      note: "Still has access now, but renewal is switched off",
      tone: "warn",
    },
    {
      label: "Refunded transactions",
      value: Number.isFinite(refunds) ? formatCount(refunds) : null,
      note: Number.isFinite(Number(refundDetails.paidTransactions))
        ? `${formatCount(refundDetails.paidTransactions)} paid transactions in this RevenueCat cohort`
        : "RevenueCat refund count for this period",
      tone: refunds > 0 ? "warn" : "good",
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          eyebrow="Pelvi command center"
          title="The whole business, in one place"
          description="Live App Store subscription truth, gross customer revenue, premium growth, and acquisition efficiency. No onboarding-only profiles are counted as customers."
        />
        {ownerMetricsError ? (
          <Card className="mb-5 p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
            <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Business metrics are temporarily unavailable</p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{ownerMetricsError} Membership and app operations below are still live.</p>
          </Card>
        ) : null}
      </section>

      <OwnerRevenue
        grossRevenue={Number.isFinite(lifetimeGrossRevenue) ? lifetimeGrossRevenue : grossRevenue}
        currency={currency}
        periodLabel={Number.isFinite(lifetimeGrossRevenue)
          ? `All App Store history since Jan 1, 2020${Number.isFinite(lifetimeTransactions) ? ` · ${formatCount(lifetimeTransactions)} transactions` : ""}`
          : ownerMetrics?.scope?.startDate && ownerMetrics?.scope?.endDate
            ? `${ownerMetrics.scope.startDate} to ${ownerMetrics.scope.endDate} · UTC`
            : "Last 28 UTC days"}
        activePaid={paidRenewing}
        activeTrials={trialRenewing}
        annualRunRate={grossArr}
        fetchedAt={ownerMetrics?.fetchedAt ? new Date(ownerMetrics.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null}
        sourceLabel="RevenueCat live"
        unavailableReason={ownerMetricsError || "RevenueCat has not returned gross App Store revenue yet."}
        kpis={revenueKpis}
      />

      <section>
        <SectionHeader
          eyebrow="Live business pulse"
          title="The members who count right now"
          description={`Verified against RevenueCat ${membership?.fetchedAt ? `at ${new Date(membership.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "now"}. Trials and paid subscriptions count; canceled and expired subscriptions do not.`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active premium" value={formatCount(activeTotal)} note={`${formatCount(paid)} paid · ${formatCount(trials)} in a free trial. ${formatCount(syncedActive)} have current app profiles.`} tone="good" />
          <Metric label="Seen today · synced" value={formatCount(openedToday)} note={`${formatPercent(openedToday, syncedActive, "No synced active profiles")} of RevenueCat-verified profiles contacted the app today.`} tone="good" />
          <Metric label="Seen · 7d synced" value={formatCount(opened7Days)} note={`${formatPercent(opened7Days, syncedActive, "No synced active profiles")} of RevenueCat-verified profiles seen in the last 7 days.`} />
          <Metric label="Workout days · 30d" value={formatCount(stats.monthCompletions.length)} note={`${formatCount(stats.activeCompleters.size)} active premium members completed at least one program day.`} />
        </div>
      </section>

      <OwnerGrowth
        points={growthPoints}
        title="Renewing premium growth"
        description="A strict RevenueCat snapshot on each UTC day this dashboard refreshes: paid subscriptions and trials still set to renew. Tracking starts now; missed days and earlier history are never invented."
        unitLabel="renewing premium members"
        unavailableReason={ownerMetrics?.growth?.reason || ownerMetricsError || "The first verified daily premium snapshot has not been stored yet."}
        sourceLabel="RevenueCat snapshots"
      />

      <PremiumMemberMap
        locations={countries}
        activePremiumTotal={activeTotal}
        title="Where renewing premium members are"
        description="Country-level subscription geography from RevenueCat for paid members and trials set to renew. These are real aggregate countries, not GPS or invented city pins."
        unavailableReason={ownerMetrics?.geography?.reason || ownerMetricsError || "RevenueCat did not return country segmentation for current renewing members."}
      />

      <AcquisitionPulse user={user} ownerMetrics={ownerMetrics} reloadToken={reloadToken} onOpen={onOpenAcquisition} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6">
          <SectionHeader eyebrow="Premium engagement" title="When synced members last opened the app" description="A current-use signal from Firebase profiles, restricted to members RevenueCat verifies as active and renewing." />
          <LastSeenChart buckets={stats.buckets} />
        </Card>
        <Card className="p-6">
          <SectionHeader eyebrow="Membership truth" title="What is inside the headline" description="No onboarding profiles are included in the premium number." />
          <div className="mt-7 space-y-6">
            <Signal title="Paid and renewing" value={formatCount(paid)} note="Production App Store paid periods" width={(paid / Math.max(1, activeTotal)) * 100} color="var(--pv-good)" />
            <Signal title="Trial and renewing" value={formatCount(trials)} note="Production App Store trial periods" width={(trials / Math.max(1, activeTotal)) * 100} color="var(--pv-violet)" />
            <Signal title="Canceled, access not expired" value={formatCount(canceled)} note="Among synced profiles; excluded here" width={(canceled / Math.max(1, syncedActive + canceled)) * 100} color="var(--pv-warn)" />
          </div>
          <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--pv-border)" }}>
            <p className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>All iPhone profiles</p>
            <p className="pv-tabular mt-1 text-[24px] font-semibold" style={{ color: "var(--pv-ink)" }}>{formatCount(allPeople.length)}</p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>Onboarding-only and lapsed people live behind the All people switch.</p>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <SectionHeader eyebrow="Program health" title="The 90-day journey" description="Activation and consistency among active premium members only." />
          <div className="mt-7 space-y-6">
            <Signal title="Started a program" value={formatCount(stats.started.length)} note="Has a program day on the phone" width={(stats.started.length / Math.max(1, syncedActive)) * 100} color="linear-gradient(90deg,var(--pv-rose),var(--pv-violet))" />
            <Signal title="Made it past the first week" value={formatCount(stats.retained.length)} note="Reached day 8 or later" width={(stats.retained.length / Math.max(1, syncedActive)) * 100} color="var(--pv-violet)" />
            <Signal title="Completed all 90 days" value={formatCount(stats.finished.length)} note="Reached the end of the program" width={(stats.finished.length / Math.max(1, syncedActive)) * 100} color="var(--pv-good)" />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader eyebrow="Goals" title="What active members came to fix" description="The current premium population, grouped by the goal selected in the app." />
          <div className="mt-7 space-y-4">
            {stats.goals.length ? stats.goals.map((goal) => (
              <Signal key={goal.label} title={goal.label} value={formatCount(goal.value)} note={`${formatPercent(goal.value, syncedActive)} of synced active profiles`} width={(goal.value / goalMax) * 100} color="linear-gradient(90deg,var(--pv-rose),var(--pv-violet))" />
            )) : <p className="text-[13px]" style={{ color: "var(--pv-ink-2)" }}>No active member has a goal profile yet.</p>}
          </div>
        </Card>
      </section>

      <section>
        <Card className="p-6">
          <SectionHeader eyebrow="Operations" title="Needs attention" description="Only issues attached to active premium members." />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusRow label="Commands waiting for a phone" value={stats.pending.length} tone={stats.pending.length ? "warn" : "good"} />
            <StatusRow label="Commands rejected by a phone" value={stats.rejected.length} tone={stats.rejected.length ? "crit" : "good"} />
            <StatusRow label="Playback failures · 7d" value={stats.videoFailures.length} tone={stats.videoFailures.length ? "warn" : "good"} />
          </div>
          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--pv-border)" }}>
            <p className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>Most recent premium app activity</p>
            <p className="mt-1 text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>{formatRelativeDay(stats.mostRecent?.lastSeenAt, now)}</p>
            <p className="mt-1 truncate text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{stats.mostRecent?.email || stats.mostRecent?.id || "No active member activity yet"}</p>
          </div>
        </Card>
      </section>
    </div>
  );
}

function StatusRow({ label, value, tone }) {
  const colors = { good: "var(--pv-good)", warn: "var(--pv-warn)", crit: "var(--pv-crit)" };
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: "var(--pv-surface-2)" }}>
      <span className="text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{label}</span>
      <span className="pv-tabular text-[16px] font-semibold" style={{ color: colors[tone] }}>{formatCount(value)}</span>
    </div>
  );
}
