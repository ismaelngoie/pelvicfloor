"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { formatCount, formatMoneyExact, formatPercent } from "@/lib/adminMetrics";
import { Card, ErrorState, SectionHeader, Segmented } from "./ui";
import TrialLifecycleFunnel from "./TrialLifecycleFunnel";

const DAY_MS = 86400000;
export const REVENUECAT_COVERAGE_START_MS = Date.UTC(2026, 7, 15);
export const ACQUISITION_RELAUNCH_DATE = "2026-08-15";
const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "sinceRelaunch", label: "Since Aug 15" },
  { value: "allTime", label: "All time" },
];
const ATTRIBUTION_FIELDS = [
  "mediaSource", "campaignId", "campaignName", "adGroupId", "adGroupName", "keyword",
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function twoYearsBefore(date) {
  const targetYear = date.getUTCFullYear() - 2;
  const month = date.getUTCMonth();
  const maximumDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, month, Math.min(date.getUTCDate(), maximumDay)));
}

export function acquisitionRange(preset, historyStartDate) {
  const today = utcToday();
  const endExclusive = new Date(today.getTime() + DAY_MS);
  const fallbackHistoryStart = iso(twoYearsBefore(today));
  const historyStart = /^\d{4}-\d{2}-\d{2}$/.test(historyStartDate || "")
    ? historyStartDate
    : fallbackHistoryStart;
  const startDate = preset === "today"
    ? iso(today)
    : preset === "allTime"
      ? historyStart
      : ACQUISITION_RELAUNCH_DATE;
  const start = new Date(`${startDate}T00:00:00Z`);
  return {
    start,
    endExclusive,
    startDate,
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

// Shared by the overview's rolling engagement window. Acquisition itself uses
// the explicit business presets above.
export function utcRange(days = 28) {
  const today = utcToday();
  const count = Math.max(1, Math.round(Number(days) || 1));
  const start = new Date(today.getTime() - (count - 1) * DAY_MS);
  const endExclusive = new Date(today.getTime() + DAY_MS);
  return {
    start,
    endExclusive,
    startDate: iso(start),
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  const value = finiteNumber(entry?.value);
  return entry?.available === true ? value : null;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedName(value) {
  return text(value)
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  if (originalTransactionId) return `${type}|${periodType}|original:${originalTransactionId}|time:${eventTime(event)}`;
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

function attributionKey(event) {
  const originalTransactionId = text(event.originalTransactionId);
  return originalTransactionId ? `subscription:${originalTransactionId}` : event._identity;
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
  const attributionBySubscription = new Map();
  for (const event of chronological) {
    const key = attributionKey(event);
    const known = { ...(attributionBySubscription.get(key) || {}) };
    for (const field of ATTRIBUTION_FIELDS) {
      const value = text(event[field]);
      if (value) known[field] = value;
    }
    attributionBySubscription.set(key, known);
  }
  return chronological.map((event) => {
    const known = attributionBySubscription.get(attributionKey(event)) || {};
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
  return text(event.originalTransactionId) || text(event.transactionId) || event._identity;
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
  const trialConversions = uniqueBy(
    events.filter((event) => event.type === "RENEWAL" && event.trialConversion === true),
    (event) => text(event.transactionId) || text(event.originalTransactionId) || event._identity
  );
  const paidMembers = uniqueBy(
    [...directPurchases, ...trialConversions].sort((left, right) => eventTime(left) - eventTime(right)),
    (event) => event._identity || text(event.originalTransactionId) || text(event.transactionId)
  );
  return { trialStarts, directPurchases, trialConversions, paidMembers };
}

function FunnelStep({ label, value, displayValue, detail, accent }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure mt-2 text-[36px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{displayValue ?? formatCount(value)}</p>
      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{detail}</p>
    </Card>
  );
}

function selectedCampaignOutcomes(ownerMetrics, preset) {
  const value = ownerMetrics?.acquisition?.presets?.[preset];
  return value && typeof value === "object" ? value : null;
}

export default function Acquisition({ user, telemetry, reloadToken, ownerMetrics, ownerMetricsError }) {
  const [preset, setPreset] = useState("sinceRelaunch");
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const historyStartDate = ownerMetrics?.acquisition?.historyRange?.startDate || "";
  const range = useMemo(() => acquisitionRange(preset, historyStartDate), [preset, historyStartDate]);

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
        setReport(null);
        setError(reason?.message || "Apple Ads did not load.");
        setState("error");
      });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const lifecycle = useMemo(() => {
    const events = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
    return prepareLifecycle(events, range);
  }, [telemetry?.lifecycle, range]);
  const fallback = useMemo(() => summarizeLifecycle(lifecycle), [lifecycle]);
  const selectedOutcomes = selectedCampaignOutcomes(ownerMetrics, preset);
  const historicalCampaignsAvailable = selectedOutcomes?.available === true;
  const outcomeScopeMatches = selectedOutcomes?.scope?.startDate === range.startDate
    && selectedOutcomes?.scope?.endDate === range.endDate;
  const telemetryAvailable = telemetry?.lifecycleAvailable === true;
  const appleTotals = report?.totals || {};
  const installs = finiteNumber(appleTotals.totalInstalls) || 0;
  const newDownloads = finiteNumber(appleTotals.newDownloads);
  const redownloads = finiteNumber(appleTotals.redownloads);
  const spend = finiteNumber(appleTotals.spend) || 0;
  const taps = finiteNumber(appleTotals.taps) || 0;
  const appleAvailable = state === "ready";
  const appleAppScopeVerified = report?.app?.filterApplied !== false;
  const outcomeTotals = selectedOutcomes?.totals || {};
  const trialStarts = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.trialStarts)
    : telemetryAvailable ? fallback.trialStarts.length : null;
  const firstPaid = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.firstPaid)
    : telemetryAvailable ? fallback.directPurchases.length + fallback.trialConversions.length : null;
  const directFirstPaid = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.directFirstPaid)
    : telemetryAvailable ? fallback.directPurchases.length : null;
  const convertedTrials = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.trialConversions)
    : telemetryAvailable ? fallback.trialConversions.length : null;
  const introductoryFirstPaid = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.introductoryFirstPaid)
    : null;
  const cohortStarts = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.cohortStarts) : null;
  const cohortConversions = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.cohortConversions) : null;
  const currentTrialRenewing = metricNumber(ownerMetrics, "trialsSetToRenew");
  const currentTrialCanceled = metricNumber(ownerMetrics, "trialsCanceled");
  const ownerCurrency = ownerMetrics?.scope?.currency || null;
  const appleCurrency = report?.currency || report?.totals?.currency || null;
  const costCoverageAligned = appleAvailable
    && appleAppScopeVerified
    && historicalCampaignsAvailable
    && outcomeScopeMatches
    && Boolean(ownerCurrency)
    && ownerCurrency === appleCurrency
    && trialStarts !== null
    && firstPaid !== null;
  const periodLabel = `${range.startDate} to ${range.endDate} UTC`;
  const isToday = preset === "today";
  const allTimeStart = ownerMetrics?.acquisition?.historyRange?.startDate || range.startDate;
  const sourceDetail = historicalCampaignsAvailable
    ? "RevenueCat receipt history, segmented by Apple Search Ads campaign"
    : telemetryAvailable
      ? "Recent RevenueCat webhook fallback; historical campaign charts are temporarily unavailable"
      : "RevenueCat campaign outcomes unavailable";
  const coverageNote = costCoverageAligned
    ? `Apple spend and RevenueCat campaign outcomes cover the same dates and currency. ${isToday ? "Today is still in progress and both services can revise recent numbers." : "No outcome is assigned to a campaign unless RevenueCat reports it."}`
    : ownerMetricsError || selectedOutcomes?.reason || "Cost per result is hidden until Apple and RevenueCat return matching dates and currency.";

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          eyebrow="Apple Ads"
          title="Acquisition economics"
          description={`Spend, installs, trials, and first payments for ${periodLabel}. First paid includes direct purchases from products with no free trial.`}
          action={<Segmented options={RANGE_OPTIONS} value={preset} onChange={setPreset} label="Apple Ads reporting period" />}
        />
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>
          <span className="rounded-full px-3 py-1.5" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>{sourceDetail}</span>
          {isToday ? <span className="rounded-full px-3 py-1.5" style={{ color: "var(--pv-warn)", background: "color-mix(in srgb, var(--pv-warn) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--pv-warn) 30%, var(--pv-border))" }}>Today is provisional</span> : null}
          {preset === "allTime" ? <span>All time means the latest 24 months available from Apple, beginning {allTimeStart}.</span> : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <FunnelStep label="Ad spend" value={spend} displayValue={appleAvailable ? formatMoneyExact(spend) : "N/A"} detail={appleAvailable ? periodLabel : state === "loading" ? "Loading from Apple" : "Apple reporting unavailable"} accent="var(--pv-rose)" />
          <FunnelStep label="Apple Ads installs" value={installs} displayValue={appleAvailable ? undefined : "N/A"} detail={appleAvailable ? `${formatCount(taps)} taps${newDownloads !== null ? `, ${formatCount(newDownloads)} new downloads` : ""}${redownloads ? `, ${formatCount(redownloads)} redownloads` : ""}` : "Apple reporting unavailable"} accent="var(--pv-violet)" />
          <FunnelStep label="Attributed trials" value={trialStarts} displayValue={trialStarts === null ? "N/A" : undefined} detail="Trial starts RevenueCat confirmed came from Apple Ads" accent="var(--pv-good)" />
          <FunnelStep label="First paid" value={firstPaid} displayValue={firstPaid === null ? "N/A" : undefined} detail="First successful payments, including direct purchases without a trial" accent="linear-gradient(90deg,var(--pv-rose),var(--pv-violet))" />
          <FunnelStep label="Cost per trial" displayValue={costCoverageAligned && trialStarts > 0 ? formatMoneyExact(spend / trialStarts) : "N/A"} detail="Selected-period spend divided by attributed trial starts" accent="var(--pv-warn)" />
          <FunnelStep label="Cost per first paid" displayValue={costCoverageAligned && firstPaid > 0 ? formatMoneyExact(spend / firstPaid) : "N/A"} detail="Selected-period spend divided by first successful payments" accent="linear-gradient(90deg,var(--pv-good),var(--pv-violet))" />
        </div>
      </section>

      <TrialLifecycleFunnel
        mode="acquisition"
        trialStarts={trialStarts}
        activeTrials={currentTrialRenewing}
        canceledTrials={currentTrialCanceled}
        convertedTrials={convertedTrials}
        cohortConversions={cohortConversions}
        cohortTrialStarts={cohortStarts}
        paidCustomers={firstPaid}
        directPaidCustomers={directFirstPaid}
        introductoryPaidCustomers={introductoryFirstPaid}
        adSpend={appleAvailable ? spend : null}
        costPerTrialStart={costCoverageAligned && trialStarts > 0 ? spend / trialStarts : null}
        costPerPayer={costCoverageAligned && firstPaid > 0 ? spend / firstPaid : null}
        coverageAligned={costCoverageAligned}
        currency={ownerCurrency || appleCurrency || "USD"}
        periodLabel={periodLabel}
        coverageNote={coverageNote}
        unavailableReason={ownerMetricsError || selectedOutcomes?.reason || "RevenueCat campaign metrics are unavailable for this period."}
      />

      {!historicalCampaignsAvailable ? (
        <Card className="p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Historical campaign outcomes are temporarily unavailable</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>The table is using RevenueCat webhook events received since Aug 15 as a fallback. Costs stay hidden because that fallback cannot reconstruct older campaign history.</p>
        </Card>
      ) : null}

      {appleAvailable && !appleAppScopeVerified ? (
        <Card className="p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Apple did not verify the app scope</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>Spend and installs are visible, but cost metrics stay hidden because this response did not include Apple app metadata. No cross-app total is presented as a verified cost.</p>
        </Card>
      ) : null}

      {state === "error" ? <Card className="p-4"><ErrorState title="Apple Ads reporting could not load" description={error} /></Card> : null}
      {state === "loading" ? (
        <div className="pv-skeleton h-72 w-full" />
      ) : (
        <CampaignTable
          campaigns={report?.campaigns || []}
          campaignOutcomes={selectedOutcomes?.campaigns || []}
          historicalCampaignsAvailable={historicalCampaignsAvailable}
          lifecycle={lifecycle}
          telemetryAvailable={telemetryAvailable}
          totalTrialStarts={trialStarts}
          totalFirstPaid={firstPaid}
          totalCohortStarts={cohortStarts}
          totalCohortConversions={cohortConversions}
          reportTotals={appleTotals}
          costCoverageAligned={costCoverageAligned}
          periodLabel={periodLabel}
        />
      )}
    </div>
  );
}

function campaignRowsFromApple(campaigns) {
  return campaigns.map((campaign, index) => {
    const id = text(String(campaign.id || campaign.campaignId || ""));
    const name = text(campaign.name || campaign.campaignName) || "Unnamed campaign";
    return {
      ...campaign,
      id,
      name,
      normalizedName: normalizedName(name),
      rowKey: `apple:${id || normalizedName(name) || index}:${index}`,
      appleMetricsAvailable: true,
    };
  });
}

function emptyOutcome() {
  return {
    trialStarts: 0,
    firstPaid: 0,
    directFirstPaid: 0,
    trialConversions: 0,
    introductoryFirstPaid: 0,
    cohortStarts: 0,
    cohortConversions: 0,
    pendingTrialOutcomes: 0,
    trialToPaidRate: null,
  };
}

function authoritativeRows(campaigns, outcomes) {
  const appleRows = campaignRowsFromApple(campaigns);
  const used = new Set();
  const findOutcome = (campaign) => {
    let match = outcomes.findIndex((outcome, index) => !used.has(index)
      && campaign.id && text(String(outcome.campaignId || "")) === campaign.id);
    if (match < 0 && campaign.normalizedName) {
      const candidates = outcomes
        .map((outcome, index) => ({ outcome, index }))
        .filter(({ outcome, index }) => !used.has(index)
          && normalizedName(outcome.campaignName) === campaign.normalizedName);
      if (candidates.length === 1) match = candidates[0].index;
    }
    if (match >= 0) used.add(match);
    return match >= 0 ? outcomes[match] : null;
  };
  const rows = appleRows.map((campaign) => ({
    ...campaign,
    ...emptyOutcome(),
    ...(findOutcome(campaign) || {}),
    name: campaign.name,
    id: campaign.id,
    normalizedName: campaign.normalizedName,
    rowKey: campaign.rowKey,
    appleMetricsAvailable: true,
  }));
  outcomes.forEach((outcome, index) => {
    if (used.has(index)) return;
    const id = text(String(outcome.campaignId || ""));
    const name = outcome.unidentified
      ? "Campaign not identified"
      : text(outcome.campaignName) || (id ? `Campaign ${id}` : "Campaign not identified");
    rows.push({
      ...emptyOutcome(),
      ...outcome,
      id,
      name,
      normalizedName: normalizedName(name),
      rowKey: `revenuecat:${id || normalizedName(name) || index}:${index}`,
      status: outcome.unidentified ? "No confirmed campaign reported" : "RevenueCat attributed outcome",
      appleMetricsAvailable: false,
      spend: null,
      taps: null,
      installs: null,
    });
  });
  return rows;
}

function fallbackRows(campaigns, lifecycle, telemetryAvailable) {
  const rows = campaignRowsFromApple(campaigns);
  const eventsByCampaign = rows.map(() => []);
  const unmatched = [];
  const indexById = new Map();
  const indexesByName = new Map();
  rows.forEach((row, index) => {
    if (row.id && !indexById.has(row.id)) indexById.set(row.id, index);
    if (!row.normalizedName) return;
    const indexes = indexesByName.get(row.normalizedName) || [];
    indexes.push(index);
    indexesByName.set(row.normalizedName, indexes);
  });
  lifecycle.forEach((event) => {
    const campaignId = text(event.campaignId);
    let index = campaignId ? indexById.get(campaignId) : undefined;
    if (index === undefined && !campaignId) {
      const matches = indexesByName.get(normalizedName(event.campaignName)) || [];
      if (matches.length === 1) index = matches[0];
    }
    if (index === undefined) unmatched.push(event);
    else eventsByCampaign[index].push(event);
  });
  const mapped = rows.map((row, index) => {
    const summary = summarizeLifecycle(eventsByCampaign[index]);
    return {
      ...row,
      trialStarts: telemetryAvailable ? summary.trialStarts.length : null,
      firstPaid: telemetryAvailable ? summary.directPurchases.length + summary.trialConversions.length : null,
      directFirstPaid: telemetryAvailable ? summary.directPurchases.length : null,
      trialConversions: telemetryAvailable ? summary.trialConversions.length : null,
      introductoryFirstPaid: null,
      cohortStarts: null,
      cohortConversions: null,
      pendingTrialOutcomes: null,
      trialToPaidRate: null,
    };
  });
  if (telemetryAvailable && unmatched.length) {
    const summary = summarizeLifecycle(unmatched);
    mapped.push({
      ...emptyOutcome(),
      id: "",
      name: "Campaign not identified",
      normalizedName: "campaign not identified",
      rowKey: "webhook:unidentified",
      status: "No confirmed campaign reported",
      unidentified: true,
      appleMetricsAvailable: false,
      spend: null,
      taps: null,
      installs: null,
      trialStarts: summary.trialStarts.length,
      firstPaid: summary.directPurchases.length + summary.trialConversions.length,
      directFirstPaid: summary.directPurchases.length,
      trialConversions: summary.trialConversions.length,
      trialToPaidRate: null,
    });
  }
  return mapped;
}

function metricCell(value, available = true, emphasized = false) {
  return <span className={`pv-tabular${emphasized ? " font-semibold" : ""}`}>{available && finiteNumber(value) !== null ? formatCount(value) : "N/A"}</span>;
}

function firstPaidDetail(row) {
  const pieces = [];
  if (finiteNumber(row.trialConversions) > 0) pieces.push(`${formatCount(row.trialConversions)} after trial`);
  const noTrial = (finiteNumber(row.directFirstPaid) || 0) + (finiteNumber(row.introductoryFirstPaid) || 0);
  if (noTrial > 0) pieces.push(`${formatCount(noTrial)} without free trial`);
  return pieces.join(" · ");
}

function CampaignTable({
  campaigns,
  campaignOutcomes,
  historicalCampaignsAvailable,
  lifecycle,
  telemetryAvailable,
  totalTrialStarts,
  totalFirstPaid,
  totalCohortStarts,
  totalCohortConversions,
  reportTotals,
  costCoverageAligned,
  periodLabel,
}) {
  const rows = historicalCampaignsAvailable
    ? authoritativeRows(campaigns, campaignOutcomes)
    : fallbackRows(campaigns, lifecycle, telemetryAvailable);
  const totalSpend = finiteNumber(reportTotals?.spend);
  const totalTaps = finiteNumber(reportTotals?.taps);
  const totalInstalls = finiteNumber(reportTotals?.totalInstalls);
  const displayTotalSpend = totalSpend ?? rows.reduce((sum, row) => sum + (finiteNumber(row.spend) || 0), 0);
  const displayTotalTaps = totalTaps ?? rows.reduce((sum, row) => sum + (finiteNumber(row.taps) || 0), 0);
  const displayTotalInstalls = totalInstalls ?? rows.reduce((sum, row) => sum + (finiteNumber(row.installs) || 0), 0);
  const trialTotalAvailable = finiteNumber(totalTrialStarts) !== null;
  const firstPaidTotalAvailable = finiteNumber(totalFirstPaid) !== null;
  const cohortRate = finiteNumber(totalCohortStarts) > 0 && finiteNumber(totalCohortConversions) !== null
    ? totalCohortConversions / totalCohortStarts
    : null;

  return (
    <section>
      <SectionHeader
        eyebrow="Campaign truth"
        title="Every campaign in one table"
        description={historicalCampaignsAvailable
          ? `RevenueCat receipt history supplies trial and first-paid outcomes by campaign for ${periodLabel}. Direct purchases are included, and missing attribution is never guessed.`
          : "Apple supplies spend and installs. Campaign outcomes are limited to the recent RevenueCat webhook fallback until historical campaign charts return."}
      />
      <Card flat className="overflow-hidden" style={{ background: "var(--pv-surface-solid)" }}>
        <div className="overflow-x-auto" tabIndex="0" aria-label="Apple Ads campaign performance table">
          <table className="w-full min-w-[1180px] text-left text-[13px]">
            <caption className="sr-only">Apple Ads spend, installs, attributed trials, cohort conversion, first payments, and costs by campaign</caption>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--pv-border)" }}>
                {["Campaign", "Spend", "Taps", "Installs", "Trials", "Cost / trial", "Trial to paid", "First paid", "Cost / first paid"].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--pv-ink-3)" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const spend = finiteNumber(row.spend);
                const trials = finiteNumber(row.trialStarts);
                const paid = finiteNumber(row.firstPaid);
                const rate = finiteNumber(row.trialToPaidRate);
                const outcomeAvailable = historicalCampaignsAvailable || telemetryAvailable;
                const breakdown = firstPaidDetail(row);
                return (
                  <tr key={row.rowKey} style={{ borderBottom: "1px solid var(--pv-border)", background: row.unidentified ? "color-mix(in srgb, var(--pv-warn) 6%, transparent)" : undefined }}>
                    <th scope="row" className="px-4 py-4 text-left">
                      <p className="font-semibold" style={{ color: "var(--pv-ink)" }}>{row.name}</p>
                      <p className="mt-1 text-[11px] font-normal" style={{ color: row.unidentified ? "var(--pv-warn)" : "var(--pv-ink-3)" }}>{row.status || ""}</p>
                    </th>
                    <td className="px-4 py-4">{row.appleMetricsAvailable && spend !== null ? formatMoneyExact(spend) : "N/A"}</td>
                    <td className="px-4 py-4">{metricCell(row.taps, row.appleMetricsAvailable)}</td>
                    <td className="px-4 py-4">{metricCell(row.installs, row.appleMetricsAvailable)}</td>
                    <td className="px-4 py-4">{metricCell(trials, outcomeAvailable)}</td>
                    <td className="pv-tabular px-4 py-4">{costCoverageAligned && row.appleMetricsAvailable && spend !== null && trials > 0 ? formatMoneyExact(spend / trials) : "N/A"}</td>
                    <td className="pv-tabular px-4 py-4">{rate !== null ? formatPercent(rate, 1) : "N/A"}</td>
                    <td className="px-4 py-4">
                      {metricCell(paid, outcomeAvailable, true)}
                      {breakdown ? <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>{breakdown}</p> : null}
                    </td>
                    <td className="pv-tabular px-4 py-4">{costCoverageAligned && row.appleMetricsAvailable && spend !== null && paid > 0 ? formatMoneyExact(spend / paid) : "N/A"}</td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan="9" className="px-5 py-12 text-center" style={{ color: "var(--pv-ink-2)" }}>No Apple Ads campaigns or RevenueCat campaign outcomes were returned for this period.</td></tr> : null}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid var(--pv-border)", background: "color-mix(in srgb, var(--pv-violet) 7%, var(--pv-surface-solid))" }}>
                <th scope="row" className="px-4 py-4 text-left">
                  <p className="font-semibold" style={{ color: "var(--pv-ink)" }}>Total</p>
                  <p className="mt-1 text-[11px] font-normal uppercase tracking-[0.08em]" style={{ color: "var(--pv-ink-3)" }}>Apple Ads plus RevenueCat</p>
                </th>
                <td className="pv-tabular px-4 py-4 font-semibold">{formatMoneyExact(displayTotalSpend)}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{formatCount(displayTotalTaps)}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{formatCount(displayTotalInstalls)}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{trialTotalAvailable ? formatCount(totalTrialStarts) : "N/A"}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{costCoverageAligned && totalTrialStarts > 0 ? formatMoneyExact(displayTotalSpend / totalTrialStarts) : "N/A"}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{cohortRate !== null ? formatPercent(cohortRate, 1) : "N/A"}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{firstPaidTotalAvailable ? formatCount(totalFirstPaid) : "N/A"}</td>
                <td className="pv-tabular px-4 py-4 font-semibold">{costCoverageAligned && totalFirstPaid > 0 ? formatMoneyExact(displayTotalSpend / totalFirstPaid) : "N/A"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>Trial to paid is RevenueCat’s matched cohort conversion, not first payments divided by trial starts in the same dates. Recent trials can remain pending. First paid counts the first successful payment whether the customer used a free trial or paid immediately.</p>
    </section>
  );
}
