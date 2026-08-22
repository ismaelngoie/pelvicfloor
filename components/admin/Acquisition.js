"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { formatCount } from "@/lib/adminMetrics";
import { acquisitionOutcomeCounts, buildTrialKeywordGroups, keywordsForCampaign } from "@/lib/adminAcquisitionAccuracy";
import { Card, CardHead, KpiTile, PageHead, Ribbon, RowsSkeleton, Segmented, Unavailable, money, count, ratio } from "./ui";

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

export function prepareLifecycle(events, range, { attributedOnly = true } = {}) {
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
    return (!attributedOnly || attributedToAppleAds)
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
    const request = process.env.NODE_ENV !== "production" && FIXTURES_ON
      ? import("@/lib/devFixtureData").then((f) => f.fixtureAppleReport({ startDate: range.startDate, endDate: range.endDate, days: 1 }))
      : fetchAppleAdsReport(user, range.startDate, range.endDate);
    request
      .then((value) => { if (!active) return; setReport(value); setState("ready"); })
      .catch((reason) => { if (!active) return; setReport(null); setError(reason?.message || "Apple Ads did not load."); setState("error"); });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const lifecycleEvents = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
  const lifecycle = useMemo(() => prepareLifecycle(lifecycleEvents, range), [lifecycleEvents, range]);
  const allLifecycle = useMemo(() => prepareLifecycle(lifecycleEvents, range, { attributedOnly: false }), [lifecycleEvents, range]);
  const fallback = useMemo(() => summarizeLifecycle(lifecycle), [lifecycle]);
  const allFallback = useMemo(() => summarizeLifecycle(allLifecycle), [allLifecycle]);
  const selectedOutcomes = selectedCampaignOutcomes(ownerMetrics, preset);
  const historicalCampaignsAvailable = selectedOutcomes?.available === true;
  const outcomeScopeMatches = selectedOutcomes?.scope?.startDate === range.startDate && selectedOutcomes?.scope?.endDate === range.endDate;
  const telemetryAvailable = telemetry?.lifecycleAvailable === true;
  const appleTotals = report?.totals || {};
  const installs = finiteNumber(appleTotals.totalInstalls) || 0;
  const newDownloads = finiteNumber(appleTotals.newDownloads);
  const redownloads = finiteNumber(appleTotals.redownloads);
  const spend = finiteNumber(appleTotals.spend) || 0;
  const taps = finiteNumber(appleTotals.taps) || 0;
  const impressions = finiteNumber(appleTotals.impressions) || 0;
  const appleAvailable = state === "ready";
  const appleAppScopeVerified = report?.app?.filterApplied !== false;
  const outcomeTotals = selectedOutcomes?.totals || {};
  const attributedTrialStarts = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.trialStarts) : telemetryAvailable ? fallback.trialStarts.length : null;
  const attributedFirstPaid = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.firstPaid) : telemetryAvailable ? fallback.directPurchases.length + fallback.trialConversions.length : null;
  const storeWideCoverageComplete = range.start.getTime() >= REVENUECAT_COVERAGE_START_MS;
  const outcomeCounts = acquisitionOutcomeCounts({
    totalTrialStarts: telemetryAvailable && storeWideCoverageComplete ? allFallback.trialStarts.length : null,
    attributedTrialStarts,
    totalFirstPaid: telemetryAvailable && storeWideCoverageComplete ? allFallback.directPurchases.length + allFallback.trialConversions.length : null,
    attributedFirstPaid,
  });
  const trialStarts = outcomeCounts.totalTrialStarts;
  const firstPaid = outcomeCounts.totalFirstPaid;
  const directFirstPaid = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.directFirstPaid) : telemetryAvailable ? fallback.directPurchases.length : null;
  const convertedTrials = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.trialConversions) : telemetryAvailable ? fallback.trialConversions.length : null;
  const cohortStarts = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.cohortStarts) : null;
  const cohortConversions = historicalCampaignsAvailable ? finiteNumber(outcomeTotals.cohortConversions) : null;
  const ownerCurrency = ownerMetrics?.scope?.currency || null;
  const appleCurrency = report?.currency || report?.totals?.currency || null;
  const costCoverageAligned = appleAvailable && appleAppScopeVerified && historicalCampaignsAvailable && outcomeScopeMatches && Boolean(ownerCurrency) && ownerCurrency === appleCurrency && attributedTrialStarts !== null && attributedFirstPaid !== null;
  const periodLabel = `${range.startDate} → ${range.endDate} UTC`;
  const isToday = preset === "today";
  const currency = ownerCurrency || appleCurrency || "USD";
  const cpt = costCoverageAligned && attributedTrialStarts > 0 ? spend / attributedTrialStarts : null;
  const cpa = costCoverageAligned && attributedFirstPaid > 0 ? spend / attributedFirstPaid : null;
  const cpi = appleAvailable && installs > 0 ? spend / installs : null;
  const sourceDetail = historicalCampaignsAvailable ? "RevenueCat receipt history segmented by Apple Search Ads campaign, reconciled with every webhook trial since August 15" : telemetryAvailable ? "Recent RevenueCat webhook fallback; historical campaign charts temporarily unavailable" : "RevenueCat campaign outcomes unavailable";
  const attributionCaption = Number.isFinite(trialStarts) && Number.isFinite(attributedTrialStarts)
    ? `${count(attributedTrialStarts)} Apple-attributed · ${count(outcomeCounts.unattributedTrialStarts)} organic, pending or unavailable`
    : storeWideCoverageComplete
      ? "Store-wide trial total unavailable"
      : "Store-wide webhook history begins Aug 15";
  const coverageNote = costCoverageAligned
    ? `Apple spend and RevenueCat campaign outcomes cover the same dates and currency. ${isToday ? "Today is still in progress and both services can revise recent numbers." : "No outcome is assigned to a campaign unless RevenueCat reports it."}`
    : ownerMetricsError || selectedOutcomes?.reason || "Cost per result is hidden until Apple and RevenueCat return matching dates and currency.";

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead
        title="Acquisition"
        description={`Apple Ads spend turning into installs, trials and first payments · ${periodLabel}`}
        right={<Segmented options={RANGE_OPTIONS} value={preset} onChange={setPreset} label="Apple Ads reporting period" />}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="pv-pill" data-tone={historicalCampaignsAvailable ? "good" : "warn"} title={sourceDetail}>{historicalCampaignsAvailable ? "Campaign outcomes: RevenueCat" : telemetryAvailable ? "Fallback: webhook events" : "Outcomes unavailable"}</span>
        {isToday ? <span className="pv-pill" data-tone="warn">Today is provisional</span> : null}
        {state === "error" ? <Unavailable reason={`Apple reporting unavailable · ${error}`} onRetry={() => setPreset((p) => p)} retryLabel="" /> : null}
        {appleAvailable && !appleAppScopeVerified ? <Unavailable reason="Apple did not verify the app scope; cost per result is hidden." /> : null}
        {!historicalCampaignsAvailable && appleAvailable ? <Unavailable reason={selectedOutcomes?.reason || ownerMetricsError || "RevenueCat campaign outcomes unavailable for this period — costs stay hidden."} /> : null}
      </div>

      <Card>
        <CardHead label="Spend → members" info={{ body: "Spend, taps and installs come from Apple. Total trial starts and first payments come from every production RevenueCat webhook since August 15. Cost per result uses only the subset RevenueCat explicitly attributes to Apple Search Ads, so organic or pending outcomes never make ads look cheaper.", source: "Apple Ads API · RevenueCat Charts + webhooks" }} right={<span className="pv-pill" data-tone={costCoverageAligned ? "good" : "warn"}>{costCoverageAligned ? "Dates & currency aligned" : "Cost per result hidden"}</span>} />
        <Ribbon stages={[
          { key: "spend", label: "Spend", value: appleAvailable ? money(spend, currency, { exact: true }) : null, flow: appleAvailable ? spend : null, color: "var(--pv-amber)", caption: appleAvailable ? `${count(impressions)} impressions` : state === "loading" ? "Loading from Apple" : "Apple unavailable", edge: appleAvailable && impressions > 0 ? `${ratio(taps, impressions, 1)} TTR` : null },
          { key: "taps", label: "Taps", value: appleAvailable ? count(taps) : null, flow: appleAvailable ? taps : null, color: "var(--pv-violet)", edge: appleAvailable ? ratio(installs, taps) : null },
          { key: "installs", label: "Installs", value: appleAvailable ? count(installs) : null, flow: appleAvailable ? installs : null, color: "var(--pv-violet)", caption: appleAvailable && newDownloads !== null ? `${count(newDownloads)} new · ${count(redownloads || 0)} re-downloads${cpi !== null ? ` · ${money(cpi, currency, { exact: true })} CPI` : ""}` : null, edge: Number.isFinite(attributedTrialStarts) ? `${count(attributedTrialStarts)} attributed` : null },
          { key: "trials", label: "All trial starts", value: count(trialStarts), flow: trialStarts, color: "var(--pv-accent)", caption: attributionCaption, edge: ratio(firstPaid, trialStarts) ? `${ratio(firstPaid, trialStarts)} to paid` : null },
          { key: "paid", label: "All first paid", value: count(firstPaid), flow: firstPaid, color: "var(--pv-good)", caption: cpa !== null ? `${money(cpa, currency, { exact: true })} per Apple-attributed payment` : directFirstPaid ? `${count(directFirstPaid)} Apple-attributed without trial` : "cost hidden" },
        ]} />
        <div className="pv-faint" style={{ padding: "10px 16px", fontSize: 12, borderTop: "1px solid var(--pv-border)" }}>{coverageNote}</div>
      </Card>

      <div className="pv-kpis">
        <KpiTile label="Cost per install" value={cpi !== null ? money(cpi, currency, { exact: true }) : null} sub={appleAvailable ? `${money(spend, currency)} ÷ ${count(installs)} installs` : "Apple unavailable"} stripe="var(--pv-violet)" />
        <KpiTile label="Cost per attributed trial" value={cpt !== null ? money(cpt, currency, { exact: true }) : null} sub={cpt === null ? costCoverageAligned ? "No Apple-attributed trial yet" : "needs matching dates & currency" : `${count(attributedTrialStarts)} Apple-attributed of ${count(trialStarts)} total`} stripe="var(--pv-accent)" />
        <KpiTile label="Cost per attributed first paid" value={cpa !== null ? money(cpa, currency, { exact: true }) : null} sub={cpa === null ? costCoverageAligned ? "No Apple-attributed first payment yet" : "needs matching dates & currency" : `${count(attributedFirstPaid)} Apple-attributed of ${count(firstPaid)} total`} stripe="var(--pv-good)" />
        <KpiTile label="Trial attribution" value={Number.isFinite(attributedTrialStarts) && Number.isFinite(trialStarts) ? `${count(attributedTrialStarts)} / ${count(trialStarts)}` : null} sub="Apple-attributed / all starts" stripe="var(--pv-violet)" />
        <KpiTile label="Trial → paid · cohort" value={Number.isFinite(cohortConversions) && cohortStarts > 0 ? ratio(cohortConversions, cohortStarts, 1) : null} sub={Number.isFinite(cohortStarts) ? `${count(cohortConversions)} of ${count(cohortStarts)} matched trials` : "RevenueCat cohort unavailable"} stripe="var(--pv-teal)" />
        <KpiTile label="Converted after trial" value={count(convertedTrials)} sub="first payment after a free trial" />
        <KpiTile label="Paid without trial" value={count(directFirstPaid)} sub="direct purchases" />
      </div>

      {state === "loading" ? <Card pad><RowsSkeleton rows={5} /></Card> : (
        <CampaignTable
          campaigns={report?.campaigns || []}
          campaignOutcomes={selectedOutcomes?.campaigns || []}
          historicalCampaignsAvailable={historicalCampaignsAvailable}
          lifecycle={lifecycle}
          telemetryAvailable={telemetryAvailable}
          totalTrialStarts={trialStarts}
          attributedTrialStarts={attributedTrialStarts}
          unattributedTrialStarts={outcomeCounts.unattributedTrialStarts}
          totalFirstPaid={firstPaid}
          attributedFirstPaid={attributedFirstPaid}
          unattributedFirstPaid={outcomeCounts.unattributedFirstPaid}
          reportTotals={appleTotals}
          costCoverageAligned={costCoverageAligned}
          currency={currency}
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

function firstPaidDetail(row) {
  const pieces = [];
  if (finiteNumber(row.trialConversions) > 0) pieces.push(`${formatCount(row.trialConversions)} after trial`);
  const noTrial = (finiteNumber(row.directFirstPaid) || 0) + (finiteNumber(row.introductoryFirstPaid) || 0);
  if (noTrial > 0) pieces.push(`${formatCount(noTrial)} without free trial`);
  return pieces.join(" · ");
}

function CampaignTable({ campaigns, campaignOutcomes, historicalCampaignsAvailable, lifecycle, telemetryAvailable, totalTrialStarts, attributedTrialStarts, unattributedTrialStarts, totalFirstPaid, attributedFirstPaid, unattributedFirstPaid, reportTotals, costCoverageAligned, currency, periodLabel }) {
  const [sort, setSort] = useState({ key: "spend", dir: "desc" });
  const keywordGroups = useMemo(() => buildTrialKeywordGroups(summarizeLifecycle(lifecycle).trialStarts), [lifecycle]);
  const rows = useMemo(() => {
    const attributedRows = historicalCampaignsAvailable ? authoritativeRows(campaigns, campaignOutcomes) : fallbackRows(campaigns, lifecycle, telemetryAvailable);
    const built = attributedRows.map((row) => ({ ...row, keywordGroup: keywordsForCampaign(keywordGroups, row) }));
    if (Number.isFinite(unattributedTrialStarts) && unattributedTrialStarts > 0) {
      built.push({
        ...emptyOutcome(),
        id: "",
        name: "Not Apple-attributed",
        normalizedName: "not apple attributed",
        rowKey: "store-wide:unattributed",
        status: "Organic, pending, or attribution unavailable",
        sourceKind: "store-wide",
        appleMetricsAvailable: false,
        spend: null,
        taps: null,
        installs: null,
        trialStarts: unattributedTrialStarts,
        firstPaid: Number.isFinite(unattributedFirstPaid) ? unattributedFirstPaid : null,
        directFirstPaid: null,
        trialConversions: null,
        trialToPaidRate: null,
        keywordGroup: null,
      });
    }
    const val = (r) => { const v = r[sort.key]; return finiteNumber(v) ?? (sort.key === "name" ? r.name : -Infinity); };
    return [...built].sort((a, b) => {
      const av = val(a); const bv = val(b);
      if (typeof av === "string" || typeof bv === "string") return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [campaigns, campaignOutcomes, historicalCampaignsAvailable, lifecycle, telemetryAvailable, keywordGroups, unattributedTrialStarts, unattributedFirstPaid, sort]);
  const spendTotal = finiteNumber(reportTotals.spend) || 0;
  const tapsTotal = finiteNumber(reportTotals.taps) || 0;
  const installsTotal = finiteNumber(reportTotals.totalInstalls) || 0;
  const maxSpend = Math.max(1, ...rows.map((r) => finiteNumber(r.spend) || 0));
  const th = (key, label, cls = "") => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}>{label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}</button>
    </th>
  );
  const cell = (v, fmt = count) => (finiteNumber(v) !== null ? fmt(v) : <span className="pv-faint">—</span>);
  return (
    <Card>
      <CardHead label="Every campaign and trial" info={{ body: "Apple supplies spend, taps and installs. RevenueCat supplies campaign-attributed outcomes. The final unassigned row reconciles the table to every store-wide trial start without guessing which ad caused it. Keywords appear only when Apple attribution reported the exact term.", source: periodLabel }} right={<span className="pv-faint" style={{ fontSize: 12 }}>{rows.length} row{rows.length === 1 ? "" : "s"}</span>} />
      <div className="pv-table-wrap">
        <table className="pv-table">
          <thead>
            <tr>{th("name", "Campaign")}<th>Keyword that started a trial</th><th>Status</th>{th("spend", "Spend", "num")}{th("taps", "Taps", "num")}{th("installs", "Installs", "num")}{th("trialStarts", "Trials", "num")}<th className="num">CPT · attributed</th>{th("firstPaid", "First paid", "num")}<th className="num">CPA · attributed</th><th className="num">Trial → paid</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan="11" style={{ textAlign: "center", color: "var(--pv-ink-3)", height: 80 }}>No Apple Ads campaigns or RevenueCat campaign outcomes were returned for this period.</td></tr> : null}
            {rows.map((row) => {
              const s = finiteNumber(row.spend); const t = finiteNumber(row.trialStarts); const p = finiteNumber(row.firstPaid);
              const cpt = costCoverageAligned && s !== null && t > 0 ? s / t : null;
              const cpa = costCoverageAligned && s !== null && p > 0 ? s / p : null;
              return (
                <tr key={row.rowKey} style={{ cursor: "default" }}>
                  <td className="ink" style={{ maxWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.name}>{row.name}</div>
                        {row.status && !row.appleMetricsAvailable ? <div className="pv-faint" style={{ fontSize: 11 }}>{row.status}</div> : null}
                      </div>
                    </div>
                    {s !== null ? <div className="pv-bar" style={{ height: 3, marginTop: 4, maxWidth: 160 }}><i style={{ width: `${(s / maxSpend) * 100}%`, background: "var(--pv-amber)" }} /></div> : null}
                  </td>
                  <td style={{ minWidth: 180 }}><KeywordCell group={row.keywordGroup} hasTrials={t > 0} /></td>
                  <td>{row.appleMetricsAvailable ? <span className="pv-pill" data-tone={/ENABLED|RUNNING/i.test(row.status || "") ? "good" : "neutral"}>{(row.status || "—").toLowerCase()}</span> : row.sourceKind === "store-wide" ? <span className="pv-pill" data-tone="neutral">Store-wide</span> : <span className="pv-pill" data-tone="violet">RevenueCat</span>}</td>
                  <td className="num">{cell(s, (v) => money(v, currency, { exact: true }))}</td>
                  <td className="num">{cell(row.taps)}</td>
                  <td className="num">{cell(row.installs)}</td>
                  <td className="num ink">{cell(t)}</td>
                  <td className="num">{cpt !== null ? money(cpt, currency, { exact: true }) : <span className="pv-faint">—</span>}</td>
                  <td className="num ink" title={p > 0 ? firstPaidDetail(row) : undefined}>{cell(p)}</td>
                  <td className="num">{cpa !== null ? money(cpa, currency, { exact: true }) : <span className="pv-faint">—</span>}</td>
                  <td className="num">{ratio(p, t) ?? <span className="pv-faint">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td><td /><td />
              <td className="num">{money(spendTotal, currency, { exact: true })}</td>
              <td className="num">{count(tapsTotal)}</td>
              <td className="num">{count(installsTotal)}</td>
              <td className="num">{cell(totalTrialStarts)}</td>
              <td className="num">{costCoverageAligned && attributedTrialStarts > 0 ? money(spendTotal / attributedTrialStarts, currency, { exact: true }) : "—"}</td>
              <td className="num">{cell(totalFirstPaid)}</td>
              <td className="num">{costCoverageAligned && attributedFirstPaid > 0 ? money(spendTotal / attributedFirstPaid, currency, { exact: true }) : "—"}</td>
              <td className="num">{ratio(totalFirstPaid, totalTrialStarts) ?? "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function KeywordCell({ group, hasTrials }) {
  if (!hasTrials) return <span className="pv-faint">—</span>;
  if (!group) return <span className="pv-faint" title="Organic, Search Match, attribution pending, or unavailable">Not reported</span>;
  const pieces = group.keywords.map(({ keyword, trials }) => ({ key: keyword, text: trials > 1 ? `${keyword} · ${trials}` : keyword }));
  if (group.unreported > 0) pieces.push({ key: "unreported", text: group.unreported > 1 ? `Not reported · ${group.unreported}` : "Not reported" });
  if (!pieces.length) return <span className="pv-faint">Not reported</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {pieces.map((piece) => <span key={piece.key} className="pv-pill" data-tone={piece.key === "unreported" ? "neutral" : "accent"}>{piece.text}</span>)}
    </div>
  );
}
