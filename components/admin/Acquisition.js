"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { formatCount, formatMoneyExact, formatPercent } from "@/lib/adminMetrics";
import { Card, ErrorState, SectionHeader } from "./ui";
import TrialLifecycleFunnel from "./TrialLifecycleFunnel";

const DAY_MS = 86400000;
export const REVENUECAT_COVERAGE_START_MS = Date.UTC(2026, 7, 15);
const ATTRIBUTION_FIELDS = [
  "mediaSource",
  "campaignId",
  "campaignName",
  "adGroupId",
  "adGroupName",
  "keyword",
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

export function utcRange(days) {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endExclusive = new Date(todayUtc + DAY_MS);
  const start = new Date(endExclusive.getTime() - days * DAY_MS);
  return {
    start,
    endExclusive,
    startDate: iso(start),
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function metricEntry(report, ...keys) {
  for (const key of keys) {
    const entry = report?.metrics?.[key];
    if (entry && typeof entry === "object") return entry;
  }
  return null;
}

function metricNumber(report, ...keys) {
  const entry = metricEntry(report, ...keys);
  const value = Number(entry?.value);
  return entry?.available === true && Number.isFinite(value) ? value : null;
}

function eventTime(event) {
  const value = event?.occurredAt instanceof Date
    ? event.occurredAt.getTime()
    : new Date(event?.occurredAt || 0).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function buildIdentityResolver(events) {
  const parents = new Map();

  const add = (value) => {
    const id = text(value);
    if (id && !parents.has(id)) parents.set(id, id);
    return id;
  };

  const find = (value) => {
    const id = add(value);
    if (!id) return "";
    const parent = parents.get(id);
    if (parent === id) return id;
    const root = find(parent);
    parents.set(id, root);
    return root;
  };

  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (!leftRoot || !rightRoot || leftRoot === rightRoot) return;
    const [root, child] = [leftRoot, rightRoot].sort();
    parents.set(child, root);
  };

  for (const event of events) {
    const appUserId = add(event.appUserId);
    const originalAppUserId = add(event.originalAppUserId);
    if (appUserId && originalAppUserId) union(appUserId, originalAppUserId);
  }

  return (event) => {
    const userId = text(event.appUserId) || text(event.originalAppUserId);
    if (userId) return `user:${find(userId)}`;
    const originalTransactionId = text(event.originalTransactionId);
    if (originalTransactionId) return `original-transaction:${originalTransactionId}`;
    const transactionId = text(event.transactionId);
    if (transactionId) return `transaction:${transactionId}`;
    return `event:${text(event.id) || eventTime(event)}`;
  };
}

function dedupeKey(event) {
  const type = text(event.type);
  const periodType = text(event.periodType);
  const transactionId = text(event.transactionId);
  if (transactionId) return `${type}|${periodType}|transaction:${transactionId}`;
  const originalTransactionId = text(event.originalTransactionId);
  if (originalTransactionId) {
    return `${type}|${periodType}|original:${originalTransactionId}|time:${eventTime(event)}`;
  }
  const id = text(event.id);
  if (id) return `event:${id}`;
  return `${event._identity}|${type}|${periodType}|${eventTime(event)}`;
}

function mergeDuplicateEvent(current, incoming) {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "occurredAt" && Number.isFinite(eventTime(current))) continue;
    if (key === "trialConversion") {
      merged[key] = current[key] === true || value === true;
      continue;
    }
    if (value instanceof Date) {
      if (Number.isFinite(value.getTime())) merged[key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.trim()) merged[key] = value;
      continue;
    }
    if (value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

export function prepareLifecycle(events, range) {
  const sorted = [...events].sort((left, right) => eventTime(left) - eventTime(right));
  const identityFor = buildIdentityResolver(sorted);
  const deduped = new Map();

  for (const event of sorted) {
    const identified = { ...event, _identity: identityFor(event) };
    const key = dedupeKey(identified);
    const current = deduped.get(key);
    deduped.set(key, current ? mergeDuplicateEvent(current, identified) : identified);
  }

  const chronological = [...deduped.values()].sort((left, right) => eventTime(left) - eventTime(right));
  const attributionByIdentity = new Map();
  for (const event of chronological) {
    const known = { ...(attributionByIdentity.get(event._identity) || {}) };
    for (const field of ATTRIBUTION_FIELDS) {
      const value = text(event[field]);
      if (value) known[field] = value;
    }
    attributionByIdentity.set(event._identity, known);
  }

  return chronological.map((event) => {
    const known = attributionByIdentity.get(event._identity) || {};
    const merged = { ...event };
    for (const field of ATTRIBUTION_FIELDS) {
      if (!text(merged[field]) && text(known[field])) merged[field] = known[field];
    }
    return merged;
  }).filter((event) => {
    if (event.environment && event.environment !== "PRODUCTION") return false;
    const source = text(event.mediaSource).toLowerCase().replace(/[\s-]+/g, "_");
    const attributedToAppleAds = source === "apple_search_ads" || source === "apple_ads"
      || Boolean(text(event.campaignId) || text(event.campaignName));
    const occurredAt = eventTime(event);
    return attributedToAppleAds
      && occurredAt >= range.start.getTime()
      && occurredAt < range.endExclusive.getTime();
  });
}

function uniqueBy(events, keyFor) {
  const unique = new Map();
  for (const event of events) {
    const key = keyFor(event);
    if (!unique.has(key)) unique.set(key, event);
  }
  return [...unique.values()];
}

function trialStartKey(event) {
  return text(event.originalTransactionId)
    || text(event.transactionId)
    || event._identity;
}

export function summarizeLifecycle(events) {
  const trialStarts = uniqueBy(
    events.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType === "TRIAL"),
    trialStartKey
  );
  const directPurchases = uniqueBy(
    events.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType !== "TRIAL"),
    (event) => text(event.transactionId) || text(event.originalTransactionId) || event._identity
  );

  const trialsByOriginalTransaction = new Map();
  const trialsByIdentity = new Map();
  for (const trial of trialStarts) {
    const originalTransactionId = text(trial.originalTransactionId);
    if (originalTransactionId && !trialsByOriginalTransaction.has(originalTransactionId)) {
      trialsByOriginalTransaction.set(originalTransactionId, trial);
    }
    if (!trialsByIdentity.has(trial._identity)) trialsByIdentity.set(trial._identity, trial);
  }

  const convertedCohorts = new Map();
  for (const event of events) {
    if (event.type !== "RENEWAL" || event.trialConversion !== true) continue;
    const originalTransactionId = text(event.originalTransactionId);
    const trial = (originalTransactionId && trialsByOriginalTransaction.get(originalTransactionId))
      || trialsByIdentity.get(event._identity);
    if (!trial || eventTime(event) < eventTime(trial)) continue;
    const cohortKey = trialStartKey(trial);
    if (!convertedCohorts.has(cohortKey)) convertedCohorts.set(cohortKey, event);
  }
  const trialConversions = [...convertedCohorts.values()];
  const paidMembers = uniqueBy(
    [...directPurchases, ...trialConversions].sort((left, right) => eventTime(left) - eventTime(right)),
    (event) => event._identity || text(event.originalTransactionId) || text(event.transactionId)
  );

  return { trialStarts, directPurchases, trialConversions, paidMembers };
}

function normalizedName(value) {
  return text(value).toLocaleLowerCase();
}

function campaignMatchesEvent(campaignId, campaignName, event) {
  const eventCampaignId = text(event.campaignId);
  if (eventCampaignId) return Boolean(campaignId) && eventCampaignId === campaignId;
  return Boolean(campaignName)
    && normalizedName(event.campaignName) === normalizedName(campaignName);
}

function FunnelStep({ label, value, displayValue, denominator, detail, accent }) {
  const hasDenominator = denominator !== null && denominator !== undefined;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure mt-2 text-[40px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{displayValue ?? formatCount(value)}</p>
      <p className="mt-3 text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{hasDenominator ? formatPercent(value, denominator) : detail}</p>
      {hasDenominator && detail ? <p className="mt-1 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{detail}</p> : null}
    </Card>
  );
}

export default function Acquisition({ user, telemetry, reloadToken, ownerMetrics, ownerMetricsError }) {
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    return utcRange(28);
  }, [reloadToken]);

  useEffect(() => {
    let active = true;
    setState("loading");
    setError("");
    fetchAppleAdsReport(user, range.startDate, range.endDate)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setState("ready");
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason?.message || "Apple Ads did not load.");
        setState("error");
      });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const lifecycle = useMemo(() => {
    const events = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
    return prepareLifecycle(events, range);
  }, [telemetry?.lifecycle, range]);

  const telemetryAvailable = telemetry?.lifecycleAvailable === true;
  const sourceLifecycle = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
  const appleTotals = report?.totals || {};
  const installs = Number(appleTotals.totalInstalls) || 0;
  const spend = Number(appleTotals.spend) || 0;
  const taps = Number(appleTotals.taps) || 0;
  const appleAvailable = state === "ready";
  const revenueCatCoverageComplete = range.start.getTime() >= REVENUECAT_COVERAGE_START_MS;
  const allTrialStarts = metricNumber(ownerMetrics, "trialsStarted");
  const currentTrialRenewing = metricNumber(ownerMetrics, "trialsSetToRenew");
  const currentTrialCanceled = metricNumber(ownerMetrics, "trialsCanceled");
  const cohortConversionMetric = metricEntry(ownerMetrics, "cohortTrialConversions");
  const cohortConversions = metricNumber(ownerMetrics, "cohortTrialConversions");
  const cohortTrialStarts = Number.isFinite(Number(cohortConversionMetric?.cohortStarts))
    ? Number(cohortConversionMetric.cohortStarts)
    : null;
  const firstPaidMetric = metricEntry(ownerMetrics, "firstPaidCustomers", "newPaidCustomers");
  const rawEventPeriodTrialConversions = firstPaidMetric?.trialConversions;
  const eventPeriodTrialConversions = rawEventPeriodTrialConversions === null || rawEventPeriodTrialConversions === undefined
    ? null
    : Number(rawEventPeriodTrialConversions);
  const convertedTrials = Number.isFinite(eventPeriodTrialConversions)
    ? eventPeriodTrialConversions
    : metricNumber(ownerMetrics, "trialsConvertedToPaid");
  const firstPaidCustomers = metricNumber(ownerMetrics, "firstPaidCustomers", "newPaidCustomers");
  const attributedTrials = metricNumber(ownerMetrics, "appleAttributedTrialsStarted", "appleAdsTrialsStarted");
  const attributedPaid = metricNumber(ownerMetrics, "appleAttributedFirstPaidCustomers", "appleAdsFirstPaidCustomers");
  const ownerScopeMatches = ownerMetrics?.scope?.startDate === range.startDate
    && ownerMetrics?.scope?.endDate === range.endDate;
  const ownerCurrency = ownerMetrics?.scope?.currency || null;
  const appleCurrency = report?.currency || report?.totals?.currency || null;
  const costCoverageAligned = appleAvailable
    && ownerScopeMatches
    && Boolean(ownerCurrency)
    && ownerCurrency === appleCurrency
    && Number.isFinite(allTrialStarts)
    && Number.isFinite(firstPaidCustomers);
  const attributionParts = [];
  if (Number.isFinite(attributedTrials) && Number.isFinite(allTrialStarts)) {
    attributionParts.push(`${formatCount(attributedTrials)} of ${formatCount(allTrialStarts)} trials carry confirmed Apple Search Ads attribution`);
  }
  if (Number.isFinite(attributedPaid) && Number.isFinite(firstPaidCustomers)) {
    attributionParts.push(`${formatCount(attributedPaid)} of ${formatCount(firstPaidCustomers)} first-paid subscriptions are confirmed by RevenueCat attribution`);
  }
  const coverageNote = costCoverageAligned
    ? `Apple spend and all production App Store outcomes use ${range.startDate} through ${range.endDate} UTC. ${attributionParts.length ? `${attributionParts.join("; ")}.` : "RevenueCat attribution detail is unavailable."} Pelvi currently uses Apple Ads as its paid acquisition channel, while unattributed App Store outcomes remain visibly distinct from confirmed attribution.`
    : ownerMetricsError || (appleAvailable && ownerScopeMatches && ownerCurrency !== appleCurrency
      ? "Apple and RevenueCat did not return the same reporting currency, so cost per result is hidden rather than mislabeled."
      : "Apple Ads and RevenueCat must both return the same date window and currency before cost per result is shown.");

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader eyebrow="Apple Ads · last 28 UTC days" title="Acquisition economics" description="Apple supplies spend, taps, and installs. RevenueCat supplies every App Store trial start and first-paid subscription for the same dates. Confirmed campaign attribution is shown separately from all business outcomes." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FunnelStep label="Ad spend" value={spend} displayValue={appleAvailable ? formatMoneyExact(spend) : "—"} detail={appleAvailable ? `${range.startDate} to ${range.endDate}` : state === "loading" ? "Loading from Apple" : "Apple reporting unavailable"} accent="var(--pv-rose)" />
          <FunnelStep label="Apple Ads installs" value={installs} displayValue={appleAvailable ? undefined : "—"} detail={appleAvailable ? `${formatCount(taps)} taps` : "Apple reporting unavailable"} accent="var(--pv-violet)" />
          <FunnelStep label="Cost per install" value={installs} displayValue={appleAvailable && installs > 0 ? formatMoneyExact(spend / installs) : "—"} detail="Apple spend divided by reported installs" accent="var(--pv-good)" />
          <FunnelStep label="Tap to install" value={installs} displayValue={appleAvailable && taps > 0 ? formatPercent(installs, taps) : "—"} detail="Apple-reported installs divided by taps" accent="linear-gradient(90deg,var(--pv-rose),var(--pv-good))" />
        </div>
      </section>

      <TrialLifecycleFunnel
        trialStarts={allTrialStarts}
        activeTrials={currentTrialRenewing}
        canceledTrials={currentTrialCanceled}
        convertedTrials={convertedTrials}
        cohortConversions={cohortConversions}
        cohortTrialStarts={cohortTrialStarts}
        paidCustomers={firstPaidCustomers}
        adSpend={appleAvailable ? spend : null}
        costPerTrialStart={costCoverageAligned && allTrialStarts > 0 ? spend / allTrialStarts : null}
        costPerPayer={costCoverageAligned && firstPaidCustomers > 0 ? spend / firstPaidCustomers : null}
        coverageAligned={costCoverageAligned}
        currency={ownerCurrency || appleCurrency || "USD"}
        periodLabel={`${range.startDate} to ${range.endDate} · UTC`}
        coverageNote={coverageNote}
        unavailableReason={ownerMetricsError || "RevenueCat owner metrics are unavailable for this period."}
      />

      {!telemetryAvailable ? (
        <Card className="p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Campaign-level lifecycle telemetry is unavailable</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>The all-App-Store totals above still come directly from RevenueCat. Only the campaign-by-campaign trial and paid columns below are unavailable.</p>
        </Card>
      ) : sourceLifecycle.length === 0 ? (
        <Card className="p-5">
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Campaign history starts Aug 15</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>RevenueCat’s full totals above include receipt history. The campaign table only knows events delivered after the webhook was connected, so it can be lower for now.</p>
        </Card>
      ) : lifecycle.length === 0 ? (
        <Card className="p-5">
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>No matched Apple Ads lifecycle events in this period</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>RevenueCat loaded successfully and no matched events were observed within its available coverage. Webhook history begins Aug 15, 2026, so this is not yet a complete 28-day conversion zero.</p>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card className="p-4"><ErrorState title="Apple Ads reporting is not connected yet" description={error} /></Card>
      ) : state === "loading" ? (
        <div className="pv-skeleton h-72 w-full" />
      ) : (
        <CampaignTable campaigns={report?.campaigns || []} lifecycle={lifecycle} telemetryAvailable={telemetryAvailable} revenueCatCoverageComplete={revenueCatCoverageComplete} />
      )}
    </div>
  );
}

function CampaignTable({ campaigns, lifecycle, telemetryAvailable, revenueCatCoverageComplete }) {
  const rows = campaigns.map((campaign) => {
    const id = text(String(campaign.id || campaign.campaignId || ""));
    const name = campaign.name || campaign.campaignName || "Unnamed campaign";
    const events = lifecycle.filter((event) => campaignMatchesEvent(id, name, event));
    const metrics = summarizeLifecycle(events);
    return {
      ...campaign,
      id,
      name,
      trials: metrics.trialStarts.length,
      paid: metrics.paidMembers.length,
    };
  });

  return (
    <section>
      <SectionHeader eyebrow="Campaign truth" title="Every campaign in one table" description={!telemetryAvailable ? "Spend and installs come from Apple. Trial and paid cells show unavailable because RevenueCat telemetry could not be read." : revenueCatCoverageComplete ? "Spend and installs come from Apple. Trials and paid conversions come from RevenueCat, never from an estimate." : "Apple spend and installs cover 28 days. RevenueCat trial and paid counts begin Aug 15, 2026, so cost per paid stays blank until both sources cover the same window."} />
      <Card flat className="overflow-hidden" style={{ background: "var(--pv-surface-solid)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead><tr style={{ borderBottom: "1px solid var(--pv-border)" }}>
              {['Campaign','Spend','Taps','Installs','Trials','Paid','Cost / paid'].map((label) => <th key={label} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--pv-ink-3)" }}>{label}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row) => {
                const spend = Number(row.spend) || 0;
                return <tr key={row.id || row.name} style={{ borderBottom: "1px solid var(--pv-border)" }}>
                  <td className="px-4 py-4"><p className="font-semibold" style={{ color: "var(--pv-ink)" }}>{row.name}</p><p className="mt-1 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{row.status || ""}</p></td>
                  <td className="pv-tabular px-4 py-4">{formatMoneyExact(spend)}</td>
                  <td className="pv-tabular px-4 py-4">{formatCount(Number(row.taps) || 0)}</td>
                  <td className="pv-tabular px-4 py-4">{formatCount(Number(row.installs) || 0)}</td>
                  <td className="pv-tabular px-4 py-4">{telemetryAvailable ? formatCount(row.trials) : "—"}</td>
                  <td className="pv-tabular px-4 py-4 font-semibold">{telemetryAvailable ? formatCount(row.paid) : "—"}</td>
                  <td className="pv-tabular px-4 py-4">{telemetryAvailable && revenueCatCoverageComplete && row.paid ? formatMoneyExact(spend / row.paid) : "—"}</td>
                </tr>;
              })}
              {!rows.length ? <tr><td colSpan="7" className="px-5 py-12 text-center" style={{ color: "var(--pv-ink-2)" }}>No Apple Ads campaign rows were returned for this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
