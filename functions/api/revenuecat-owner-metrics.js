import {
  accessToken,
  bearerToken,
  checkIdToken,
  firebaseProjectId,
  ipRateLimited,
  json,
  originAllowed,
  parseServiceAccount,
  patchDocument,
  projectIdFrom,
  readJson,
  typedValue,
} from "../../functions-lib/stripeSync.js";

// Owner-only RevenueCat reporting for the Pelvi admin.
//
// Every number keeps its RevenueCat definition attached. In particular:
// - Revenue is gross customer spend before estimated tax/store commission.
// - "Set to cancel" is a current, still-active subscription/trial snapshot.
// - Trial Conversion uses RevenueCat's matched trial cohort; event-period first
//   payments remain a separate metric and are never divided by new-trial events.
// - Revenue is read from the same realtime metric that powers RevenueCat's
//   Overview, so the selected inclusive UTC dates reconcile exactly.
//
// RevenueCat's Charts & Metrics API is limited to 25 requests/minute. A fresh
// report plus its lightweight comparison uses at most 25 Charts & Metrics
// subrequests, responses are cached for five minutes, and identical in-flight
// requests are coalesced. A daily growth snapshot adds at most three Google subrequests
// (token, write, read), still safely below Cloudflare's worker subrequest cap.
const ADMIN_EMAIL = "ismael@ngoie.com";
const REVENUECAT_API = "https://api.revenuecat.com";
const CACHE_MS = 5 * 60 * 1000;
const UPSTREAM_COOLDOWN_MS = 60 * 1000;
const MAX_RANGE_DAYS = 3660;
const MAX_CACHE_ENTRIES = 24;
const GROWTH_COLLECTION = "adminOwnerDailyOverviewMetrics";
const MAX_GROWTH_POINTS = 3660;
const LIFETIME_REVENUE_START = "2020-01-01";
const ACQUISITION_RELAUNCH_START = "2026-08-15";
const CHART_OPTIONS_CACHE_MS = 10 * 60 * 1000;
const SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "BRL", "KRW", "CNY", "MXN", "INR", "IDR", "SGD", "PHP", "RUB",
]);

const reportCache = new Map();
const inFlightReports = new Map();
const chartOptionsCache = new Map();
let projectCache = null;
let lastFreshReportAt = 0;

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json(403, { error: "This request did not come from pelvi.health." });
  if (ipRateLimited(request, { max: 30 })) return json(429, { error: "Wait a minute and try again." });

  const caller = await checkIdToken(bearerToken(request), firebaseProjectId(env));
  if (!caller.ok || caller.emailVerified !== true || caller.email !== ADMIN_EMAIL) {
    return json(403, { error: "Sign in with the Pelvi owner account." });
  }

  const apiKey = first(env, [
    "REVENUECAT_V2_API_KEY",
    "REVENUECAT_SECRET_API_KEY",
    "REVENUECAT_V2_SECRET_KEY",
    "REVENUECAT_API_KEY",
  ]);
  if (!apiKey) {
    return json(503, {
      error: "RevenueCat owner metrics are ready, but the read-only v2 API key is missing from Cloudflare.",
      missing: ["REVENUECAT_V2_API_KEY"],
    });
  }

  const body = await readJson(request, 8192);
  if (!body) return json(400, { error: "Send a valid owner-metrics request." });
  const range = reportRange(body.startDate, body.endDate);
  if (!range.ok) return json(400, { error: range.error });

  const currency = String(body.currency || "USD").trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currency)) return json(400, { error: "Choose a supported reporting currency." });

  // Optional comparison window. It is built inside THIS request, after the
  // main report, so the dashboard's "vs previous period" never competes with
  // the main report for the one-fresh-report-per-minute slot below.
  let compareRange = null;
  if (body.compareStartDate && body.compareEndDate) {
    const parsed = reportRange(body.compareStartDate, body.compareEndDate);
    if (!parsed.ok) return json(400, { error: `Comparison range: ${parsed.error}` });
    compareRange = parsed;
  }

  try {
    const projectId = first(env, ["REVENUECAT_PROJECT_ID"])
      || (await discoverProjectId(apiKey, env.REVENUECAT_PROJECT_NAME));
    const cacheKey = `full:${projectId}:${range.startDate}:${range.endDate}:${currency}`;
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < CACHE_MS) {
      const previous = compareRange ? await comparisonReport({ apiKey, projectId, currency, range: compareRange, env }) : undefined;
      return json(200, { ...cached.value, ...(previous !== undefined ? { previous } : {}), cache: { status: "hit", maxAgeSeconds: CACHE_MS / 1000 } });
    }

    let pending = inFlightReports.get(cacheKey);
    if (!pending) {
      const waitMs = UPSTREAM_COOLDOWN_MS - (Date.now() - lastFreshReportAt);
      if (waitMs > 0) {
        return json(429, {
          error: "RevenueCat allows one full owner report per minute. Wait briefly before changing the date range again.",
          retryAfterSeconds: Math.ceil(waitMs / 1000),
        });
      }
      lastFreshReportAt = Date.now();
      pending = buildOwnerReport({ apiKey, projectId, currency, range, env });
      inFlightReports.set(cacheKey, pending);
    }

    let value;
    try {
      value = await pending;
    } finally {
      if (inFlightReports.get(cacheKey) === pending) inFlightReports.delete(cacheKey);
    }

    reportCache.set(cacheKey, { savedAt: Date.now(), value });
    pruneCache();
    const previous = compareRange ? await comparisonReport({ apiKey, projectId, currency, range: compareRange, env }) : undefined;
    return json(200, { ...value, ...(previous !== undefined ? { previous } : {}), cache: { status: "miss", maxAgeSeconds: CACHE_MS / 1000 } });
  } catch (error) {
    console.error("RevenueCat owner metrics failed", {
      message: error?.message || "unknown",
      status: error?.status || null,
    });
    if (error?.status === 401 || error?.status === 403) {
      return json(503, {
        error: "RevenueCat refused the API key. Use a v2 secret key with read access to projects, charts, and overview metrics.",
      });
    }
    if (error?.code === "ambiguous_project") {
      return json(503, {
        error: "RevenueCat has more than one possible project. Add the exact project id as REVENUECAT_PROJECT_ID in Cloudflare.",
      });
    }
    return json(502, { error: "RevenueCat owner metrics could not be reached. Try again shortly." });
  }
}

/**
 * The previous-period report for the dashboard's deltas. Served from the same
 * cache as a main report; when it has to be built, it rides on the main
 * report's cooldown slot rather than taking one of its own, and any failure
 * degrades to `null` — the main numbers never depend on it.
 */
async function comparisonReport({ apiKey, projectId, currency, range, env }) {
  const fullKey = `full:${projectId}:${range.startDate}:${range.endDate}:${currency}`;
  const comparisonKey = `comparison:${projectId}:${range.startDate}:${range.endDate}:${currency}`;
  const full = reportCache.get(fullKey);
  if (full && Date.now() - full.savedAt < CACHE_MS) return full.value;
  const cached = reportCache.get(comparisonKey);
  if (cached && Date.now() - cached.savedAt < CACHE_MS) return cached.value;
  let pending = inFlightReports.get(comparisonKey);
  if (!pending) {
    pending = buildComparisonReport({ apiKey, projectId, currency, range });
    inFlightReports.set(comparisonKey, pending);
  }
  try {
    const value = await pending;
    reportCache.set(comparisonKey, { savedAt: Date.now(), value });
    return value;
  } catch (error) {
    console.error("RevenueCat comparison report failed", { message: error?.message || "unknown" });
    return null;
  } finally {
    if (inFlightReports.get(comparisonKey) === pending) inFlightReports.delete(comparisonKey);
  }
}

async function buildOwnerReport({ apiKey, projectId, currency, range, env }) {
  const tracker = { attempted: 0, succeeded: 0 };
  const errors = [];

  const tasks = await Promise.all([
    capture("overview", () => loadOverviewMetrics(apiKey, projectId, currency, tracker), errors),
    capture("range_revenue", () => loadRangeRevenue(apiKey, projectId, currency, range, tracker), errors),
    capture("revenue", () => loadChart(apiKey, projectId, "revenue", {
      currency,
      range,
      tracker,
      selectorIntent: "gross_revenue",
      projectWide: true,
    }), errors),
    capture("subscription_status", () => loadSubscriptionStatus(apiKey, projectId, currency, tracker), errors),
    capture("trials_new", () => loadChart(apiKey, projectId, "trials_new", {
      range,
      tracker,
    }), errors),
    capture("trial_conversion_rate", () => loadChart(apiKey, projectId, "trial_conversion_rate", {
      range,
      tracker,
    }), errors),
    capture("refund_rate", () => loadChart(apiKey, projectId, "refund_rate", {
      range,
      tracker,
    }), errors),
    capture("actives_new", () => loadChart(apiKey, projectId, "actives_new", {
      range,
      tracker,
    }), errors),
  ]);

  const [overviewResult, rangeRevenueResult, revenueResult, statusResult, trialsResult, conversionsResult, refundsResult, firstPaidResult] = tasks;
  const overview = overviewResult || null;
  const revenue = revenueResult?.chart || null;
  const status = statusResult || null;
  const trials = trialsResult?.chart || null;
  const conversions = conversionsResult?.chart || null;
  const refundRate = refundsResult?.chart || null;
  const firstPaid = firstPaidResult?.chart || null;

  const overviewActiveSubscriptions = overviewMetric(overview, ["active_subscriptions"]);
  const overviewActiveTrials = overviewMetric(overview, ["active_trials"]);
  const overviewMrr = overviewMetric(overview, ["mrr"]);
  const overviewNewCustomers = overviewMetric(overview, ["new_customers", "customers_new"]);
  const overviewActiveCustomers = overviewMetric(overview, ["active_customers", "active_users", "customers_active"]);
  const activeSubscriptions = overviewActiveSubscriptions.available
    ? overviewActiveSubscriptions.value
    : status?.paid?.total;
  const activeTrials = overviewActiveTrials.available
    ? overviewActiveTrials.value
    : status?.trials?.total;
  const currentMrr = overviewMrr.available
    ? overviewMrr.value
    : monthlyFromAnnual(status?.arr?.total);
  const authoritativeRevenue = rangeRevenueValue(rangeRevenueResult);
  const chartRevenue = chartTotal(revenue, [/^revenue$/i, /gross revenue/i]);
  const revenueTotal = Number.isFinite(authoritativeRevenue) ? authoritativeRevenue : chartRevenue;
  const trialsStarted = chartTotal(trials, [/^new trials$/i, /^trial starts$/i]);
  const cohortTrialStarts = chartTotal(conversions, [/^trial starts$/i]);
  const trialConversions = chartTotal(conversions, [/^conversions$/i, /converted/i]);
  const trialExpirations = chartTotal(conversions, [/^expirations$/i, /expired/i]);
  const pendingTrials = chartTotal(conversions, [/^pending$/i]);
  const conversionRate = chartSummaryValue(conversions, [/trial conversion rate/i, /^conversion rate/i]);
  const refundTransactions = chartTotal(refundRate, [/^refunded transactions$/i]);
  const paidTransactions = chartTotal(refundRate, [/^transactions$/i]);
  const refundPercentage = chartSummaryValue(refundRate, [/^refund rate$/i]);
  const firstPaidTotal = chartTotal(firstPaid, [
    /^total paid subscriptions$/i,
    /^total new paid subscriptions$/i,
    /^new paid subscriptions$/i,
    /^new actives$/i,
    /^total$/i,
  ]);
  const directSubscriptions = chartTotal(firstPaid, [/^direct subscriptions$/i, /^direct$/i]);
  const paidTrialConversions = chartTotal(firstPaid, [/^trial conversions$/i]);
  const introOffers = chartTotal(firstPaid, [/^intro offers$/i, /introductory offers/i]);
  const productChanges = chartTotal(firstPaid, [/^product changes$/i]);
  const resubscriptions = chartTotal(firstPaid, [/^resubscriptions$/i]);
  const firstSuccessfulPayments = addAvailable(directSubscriptions, paidTrialConversions, introOffers);

  const trialCancelCurrent = status?.trials?.setToCancel ?? null;
  const paidCancelCurrent = status?.paid?.setToCancel ?? null;
  const activeCancelTotal = addAvailable(paidCancelCurrent, trialCancelCurrent);

  const metrics = {
    grossRevenue: valueMetric(revenueTotal, {
      source: Number.isFinite(authoritativeRevenue)
        ? "RevenueCat Revenue metric (API v2, realtime Charts v3)"
        : "RevenueCat Revenue chart (API v2)",
      unit: "currency",
      currency,
      definition: "Gross revenue across this RevenueCat project in the selected inclusive UTC date range, before taxes and store commission, with refunds deducted on the date RevenueCat processes them.",
      period: range,
    }),
    activeSubscriptions: valueMetric(activeSubscriptions, {
      source: overviewActiveSubscriptions.available
        ? "RevenueCat Overview metrics (API v2)"
        : "RevenueCat Subscription Status chart (API v2 fallback)",
      unit: "subscriptions",
      definition: "Current active paid subscriptions in RevenueCat, including subscriptions set to cancel or in a grace period while they still provide access. Trials are counted separately.",
      period: overviewActiveSubscriptions.period || "P0D",
      asOf: overviewActiveSubscriptions.lastUpdatedAt || status?.paid?.asOf || null,
    }),
    activeTrials: valueMetric(activeTrials, {
      source: overviewActiveTrials.available
        ? "RevenueCat Overview metrics (API v2)"
        : "RevenueCat Subscription Status chart (API v2 fallback)",
      unit: "trials",
      definition: "Current active trials in RevenueCat, including trials set to cancel or in a grace period while they still provide access.",
      period: overviewActiveTrials.period || "P0D",
      asOf: overviewActiveTrials.lastUpdatedAt || status?.trials?.asOf || null,
    }),
    activePremium: valueMetric(addAvailable(activeSubscriptions, activeTrials), {
      source: "RevenueCat Overview metrics (API v2)",
      unit: "subscriptions_and_trials",
      definition: "Current active paid subscriptions plus active trials. It represents subscription access, not only subscriptions set to renew.",
      paid: finiteOrNull(activeSubscriptions),
      trials: finiteOrNull(activeTrials),
      asOf: newestIso(overviewActiveSubscriptions.lastUpdatedAt, overviewActiveTrials.lastUpdatedAt, status?.paid?.asOf, status?.trials?.asOf),
    }),
    paidSetToRenew: valueMetric(status?.paid?.setToRenew, {
      source: "RevenueCat Subscription Status chart (API v2)",
      unit: "subscriptions",
      definition: "Current production App Store paid subscriptions that are active and set to renew.",
      asOf: status?.paid?.asOf || null,
    }),
    trialsSetToRenew: valueMetric(status?.trials?.setToRenew, {
      source: "RevenueCat Subscription Status chart (API v2)",
      unit: "trials",
      definition: "Current production App Store trials that are active and set to renew.",
      asOf: status?.trials?.asOf || null,
    }),
    trialsStarted: valueMetric(trialsStarted, {
      source: "RevenueCat New Trials chart (API v2)",
      unit: "trials",
      definition: "Trials whose trial start date falls inside the selected UTC date range.",
      period: range,
    }),
    trialsCanceled: valueMetric(trialCancelCurrent, {
      source: "RevenueCat Subscription Status chart (API v2)",
      unit: "trials",
      definition: "Current unexpired production App Store trials with auto-renew disabled (Set to cancel). This is a current snapshot, not a historical cancellation count for the selected range.",
      asOf: status?.trials?.asOf || null,
    }),
    trialsConvertedToPaid: valueMetric(paidTrialConversions, {
      source: "RevenueCat New Paid Subscriptions chart (API v2, actives_new)",
      unit: "trials",
      definition: "Trial subscriptions whose first successful paid renewal occurred inside the selected UTC date range, regardless of when the customer was first seen.",
      period: range,
    }),
    cohortTrialConversions: valueMetric(trialConversions, {
      source: "RevenueCat Trial Conversion Rate chart (API v2)",
      unit: "trials",
      definition: "Matched trials in RevenueCat's selected conversion cohort that later converted to paid; recent cohorts can still be pending and can change later.",
      period: range,
      cohortStarts: finiteOrNull(cohortTrialStarts),
    }),
    pendingTrialOutcomes: valueMetric(pendingTrials, {
      source: "RevenueCat Trial Conversion Rate chart (API v2)",
      unit: "trials",
      definition: "Trial starts in RevenueCat's selected conversion cohort that have not reached a final conversion or expiration outcome.",
      period: range,
    }),
    trialExpirations: valueMetric(trialExpirations, {
      source: "RevenueCat Trial Conversion Rate chart (API v2)",
      unit: "trials",
      definition: "Trial starts in RevenueCat's selected conversion cohort that expired without converting. This does not mean every expiration was an explicit user cancellation.",
      period: range,
    }),
    trialConversionRate: valueMetric(conversionRate, {
      source: "RevenueCat Trial Conversion Rate chart (API v2)",
      unit: "percent",
      definition: "Converted trials divided by trial starts in RevenueCat's matched conversion cohort; recent cohorts may still be pending.",
      period: range,
    }),
    activeCancellations: valueMetric(activeCancelTotal, {
      source: "RevenueCat Subscription Status chart (API v2)",
      unit: "subscriptions_and_trials",
      definition: "Current active production App Store paid subscriptions and trials that still provide access but are set to cancel.",
      paid: finiteOrNull(paidCancelCurrent),
      trials: finiteOrNull(trialCancelCurrent),
      asOf: newestIso(status?.paid?.asOf, status?.trials?.asOf),
    }),
    refundedTransactions: valueMetric(refundTransactions, {
      source: "RevenueCat Refund Rate chart (API v2)",
      unit: "transactions",
      definition: "Refunded transactions RevenueCat includes in its Refund Rate chart for the selected UTC date range.",
      period: range,
      paidTransactions: finiteOrNull(paidTransactions),
      refundRate: finiteOrNull(refundPercentage),
    }),
    refundedRevenue: unavailableMetric({
      source: "RevenueCat Charts API v2",
      unit: "currency",
      currency,
      definition: "Gross refund amount grouped by the date the refund was processed.",
      reason: "RevenueCat's Refunds chart is visible in the dashboard but is not yet exposed by the public Charts API v2. No amount is inferred from refund counts.",
      period: range,
    }),
    firstPaidCustomers: valueMetric(firstSuccessfulPayments, {
      source: "RevenueCat New Paid Subscriptions chart (API v2, actives_new)",
      unit: "new_paid_subscriptions",
      definition: "Subscriptions whose first successful payment occurred inside the selected UTC date range. This is the exact event-period first-payment measure for acquisition cost and can differ from unique people if one person starts more than one subscription.",
      period: range,
      direct: finiteOrNull(directSubscriptions),
      directSubscriptions: finiteOrNull(directSubscriptions),
      trialConversions: finiteOrNull(paidTrialConversions),
      introductoryOffers: finiteOrNull(introOffers),
      productChanges: finiteOrNull(productChanges),
      resubscriptions: finiteOrNull(resubscriptions),
      allNewPaidSubscriptions: finiteOrNull(firstPaidTotal),
    }),
    mrr: valueMetric(currentMrr, {
      source: overviewMrr.available
        ? "RevenueCat Overview metrics (API v2)"
        : "RevenueCat ARR chart divided by 12 (API v2 fallback)",
      unit: "currency_per_month",
      currency,
      definition: "Current gross monthly recurring revenue before estimated taxes and store commission.",
      setToRenew: monthlyFromAnnual(status?.arr?.setToRenew),
      setToCancel: monthlyFromAnnual(status?.arr?.setToCancel),
      billingIssue: monthlyFromAnnual(status?.arr?.billingIssue),
      breakdownSource: "RevenueCat ARR status breakdown divided by 12",
      period: overviewMrr.period || "P0D",
      asOf: overviewMrr.lastUpdatedAt || status?.arr?.asOf || null,
    }),
    arr: valueMetric(status?.arr?.total, {
      source: "RevenueCat Subscription Status chart (API v2)",
      unit: "currency_per_year",
      currency,
      definition: "Current gross annual recurring revenue before estimated taxes and store commission.",
      setToRenew: finiteOrNull(status?.arr?.setToRenew),
      setToCancel: finiteOrNull(status?.arr?.setToCancel),
      billingIssue: finiteOrNull(status?.arr?.billingIssue),
      asOf: status?.arr?.asOf || null,
    }),
    newCustomers: valueMetric(overviewNewCustomers.value, {
      source: "RevenueCat Overview metrics (API v2)",
      unit: "customers",
      definition: "Customers first seen by RevenueCat during the period shown by RevenueCat. This is not an install count or a paid-subscriber count.",
      period: overviewNewCustomers.period || "P28D",
      asOf: overviewNewCustomers.lastUpdatedAt || null,
    }),
    activeCustomers: valueMetric(overviewActiveCustomers.value, {
      source: "RevenueCat Overview metrics (API v2)",
      unit: "customers",
      definition: "Customers who communicated with RevenueCat during the period shown by RevenueCat. This is not the number of active subscriptions.",
      period: overviewActiveCustomers.period || "P28D",
      asOf: overviewActiveCustomers.lastUpdatedAt || null,
    }),
  };

  const acquisitionRange = acquisitionHistoryRange(range.endDate);
  const [adsTrialsResult, adsFirstPaidResult, adsConversionsResult, lifetimeRevenueResult] = await Promise.all([
    capture("apple_search_ads_trials", () => loadAppleSearchAdsChart({
      apiKey,
      projectId,
      loaded: trialsResult,
      range: acquisitionRange,
      tracker,
      segmentCampaign: true,
    }), errors),
    capture("apple_search_ads_first_paid", () => loadAppleSearchAdsChart({
      apiKey,
      projectId,
      loaded: firstPaidResult,
      range: acquisitionRange,
      tracker,
      segmentCampaign: true,
    }), errors),
    capture("apple_search_ads_trial_conversion", () => loadAppleSearchAdsChart({
      apiKey,
      projectId,
      loaded: conversionsResult,
      range: acquisitionRange,
      tracker,
      segmentCampaign: true,
    }), errors),
    capture("lifetime_revenue", () => loadLifetimeRevenueChart({
      apiKey,
      projectId,
      loaded: revenueResult,
      endDate: range.endDate,
      currency,
      tracker,
    }), errors),
  ]);
  const adsTrials = adsTrialsResult?.chart || null;
  const adsFirstPaid = adsFirstPaidResult?.chart || null;
  const adsConversions = adsConversionsResult?.chart || null;
  const lifetimeRevenue = lifetimeRevenueResult?.chart || null;
  const lifetimePeriod = { startDate: LIFETIME_REVENUE_START, endDate: range.endDate };
  const lifetimeRevenueTotal = chartTotal(lifetimeRevenue, [/^revenue$/i, /gross revenue/i]);
  const lifetimeTransactions = chartTotal(lifetimeRevenue, [/^transactions$/i]);
  const acquisition = buildAcquisitionPresets({
    trialsChart: adsTrials,
    firstPaidChart: adsFirstPaid,
    conversionChart: adsConversions,
    historyRange: acquisitionRange,
  });
  const selectedAcquisition = buildAcquisitionWindow({
    trialsChart: adsTrials,
    firstPaidChart: adsFirstPaid,
    conversionChart: adsConversions,
    range,
  });
  const adsTrialsStarted = selectedAcquisition.totals.trialStarts;
  const adsDirect = selectedAcquisition.totals.directFirstPaid;
  const adsTrialConversions = selectedAcquisition.totals.trialConversions;
  const adsIntroOffers = selectedAcquisition.totals.introductoryFirstPaid;
  const adsProductChanges = selectedAcquisition.totals.productChanges;
  const adsResubscriptions = selectedAcquisition.totals.resubscriptions;
  const adsFirstPaidTotal = selectedAcquisition.totals.firstPaid;
  metrics.appleAttributedTrialsStarted = valueMetric(adsTrialsStarted, {
    source: "RevenueCat New Trials chart (Apple Search Ads attribution filter)",
    unit: "trials",
    period: range,
    definition: "Trials started in the selected UTC date range and explicitly attributed by RevenueCat to Apple Search Ads.",
  });
  metrics.appleAttributedFirstPaidCustomers = valueMetric(adsFirstPaidTotal, {
    source: "RevenueCat New Paid Subscriptions chart (Apple Search Ads attribution filter)",
    unit: "new_paid_subscriptions",
    period: range,
    definition: "Subscriptions with their first successful payment in the selected UTC date range and explicit RevenueCat Apple Search Ads attribution.",
    direct: finiteOrNull(adsDirect),
    directSubscriptions: finiteOrNull(adsDirect),
    trialConversions: finiteOrNull(adsTrialConversions),
    introductoryOffers: finiteOrNull(adsIntroOffers),
    productChanges: finiteOrNull(adsProductChanges),
    resubscriptions: finiteOrNull(adsResubscriptions),
  });
  metrics.lifetimeGrossRevenue = valueMetric(lifetimeRevenueTotal, {
    source: "RevenueCat Revenue chart (API v2, monthly lifetime view)",
    unit: "currency",
    currency,
    period: lifetimePeriod,
    transactions: finiteOrNull(lifetimeTransactions),
    definition: "Gross production App Store revenue charged to customers from January 1, 2020 through the selected UTC end date, before estimated taxes and Apple commission, minus refunds RevenueCat attributes to transactions in that period.",
  });
  metrics.lifetimeTransactions = valueMetric(lifetimeTransactions, {
    source: "RevenueCat Revenue chart (API v2, monthly lifetime view)",
    unit: "transactions",
    period: lifetimePeriod,
    definition: "Production App Store transactions included alongside lifetime gross revenue for the same January 1, 2020 through selected-end-date UTC period.",
  });

  const growth = await persistAndReadGrowth({
    env,
    paid: activeSubscriptions,
    trials: activeTrials,
    mrr: currentMrr,
    arr: status?.arr?.total,
    currency,
  });

  const charts = {
    overview: overviewCoverage(overviewResult),
    rangeRevenue: rangeRevenueCoverage(rangeRevenueResult),
    revenue: chartCoverage(revenueResult),
    subscriptionStatus: statusResult?.coverage || chartCoverage(statusResult),
    newTrials: chartCoverage(trialsResult),
    trialConversionRate: chartCoverage(conversionsResult),
    refundRate: chartCoverage(refundsResult),
    newPaidSubscriptions: chartCoverage(firstPaidResult),
    appleSearchAdsTrials: chartCoverage(adsTrialsResult),
    appleSearchAdsNewPaidSubscriptions: chartCoverage(adsFirstPaidResult),
    appleSearchAdsTrialConversion: chartCoverage(adsConversionsResult),
    lifetimeRevenue: chartCoverage(lifetimeRevenueResult),
  };
  const availableChartCount = Object.values(charts).filter((entry) => entry?.available).length;
  if (!availableChartCount) {
    const authError = errors.find((entry) => entry.status === 401 || entry.status === 403);
    if (authError) {
      const error = new Error("RevenueCat refused the chart request.");
      error.status = authError.status;
      throw error;
    }
    throw new Error("No RevenueCat chart returned usable data.");
  }

  return {
    source: "RevenueCat API v2",
    fetchedAt: new Date().toISOString(),
    projectId,
    scope: {
      environment: "production",
      store: "app_store",
      currency,
      timezone: "UTC",
      startDate: range.startDate,
      endDate: range.endDate,
      overviewLastUpdatedAt: newestIso(
        overviewActiveSubscriptions.lastUpdatedAt,
        overviewActiveTrials.lastUpdatedAt,
        overviewMrr.lastUpdatedAt,
        overviewNewCustomers.lastUpdatedAt,
        overviewActiveCustomers.lastUpdatedAt,
      ),
      lifetimeRevenuePeriod: lifetimePeriod,
      includesPartialToday: range.endDate === utcDate(Date.now()),
      revenueDefinition: "gross_customer_price_before_estimated_tax_and_store_commission",
    },
    metrics,
    series: {
      grossRevenueDaily: chartSeries(revenue, [/^revenue$/i, /gross revenue/i]),
      lifetimeGrossRevenueMonthly: chartSeries(lifetimeRevenue, [/^revenue$/i, /gross revenue/i]),
      trialsStartedDaily: chartSeries(trials, [/^new trials$/i, /^trial starts$/i]),
      trialConversionsDaily: chartSeries(firstPaid, [/^trial conversions$/i]),
      trialCohortConversionsDaily: chartSeries(conversions, [/^conversions$/i, /converted/i]),
      pendingTrialOutcomesDaily: chartSeries(conversions, [/^pending$/i]),
      firstPaidCustomersDaily: newPaidSeries(firstPaid),
    },
    growth,
    attribution: {
      appleSearchAds: {
        source: "RevenueCat Charts API v2 filtered by Attribution Source = Apple Search Ads",
        definition: "Receipt outcomes RevenueCat explicitly attributed to Apple Search Ads. This is a confirmed-attribution subset of the all-App-Store totals and can exclude ad-driven outcomes when attribution data is unavailable.",
        trialsStarted: metrics.appleAttributedTrialsStarted,
        firstPaidCustomers: metrics.appleAttributedFirstPaidCustomers,
        available: finiteOrNull(adsTrialsStarted) !== null && finiteOrNull(adsFirstPaidTotal) !== null,
      },
    },
    acquisition,
    geography: {
      source: "RevenueCat Subscription Status chart segmented by country (API v2)",
      definition: "Country attached to current production App Store paid subscriptions and trials that are set to renew.",
      countries: status?.countries || [],
      available: Array.isArray(status?.countries),
      asOf: newestIso(status?.paid?.asOf, status?.trials?.asOf),
      ...(Array.isArray(status?.countries) ? {} : {
        reason: "RevenueCat did not advertise or return country segmentation; no locations were inferred.",
      }),
    },
    coverage: {
      complete: errors.length === 0 && Object.values(charts).every((entry) => entry?.available),
      allRequestedMetricsAvailable: Object.entries(metrics)
        .filter(([name]) => name !== "refundedRevenue")
        .every(([, entry]) => entry.available),
      growthAvailable: growth.available,
      requestsAttempted: tracker.attempted,
      requestsSucceeded: tracker.succeeded,
      charts,
      errors,
      limitations: [
        "RevenueCat realtime metrics contain production receipt data and may revise historical periods after a refund or receipt update.",
        "Trial Conversion Rate uses RevenueCat's matched trial cohort, not the calendar day on which payment occurred; use firstPaidCustomers for event-period acquisition cost.",
        "The current public API does not expose the newer Refunds-by-processing-date chart, so refunded gross amount is unavailable instead of estimated.",
        "The current public API does not expose the historical Trial Cancellation chart; trialsCanceled is the exact current Set to cancel snapshot, not a historical range total.",
        "Country is RevenueCat subscription geography, not a precise GPS location. No personal address or device location is returned.",
        "Apple Search Ads attribution is the confirmed RevenueCat-attributed subset; it must not replace the all-App-Store outcome totals when measuring the whole business.",
        "Active-subscription growth records at most one RevenueCat Overview snapshot on UTC days when the owner dashboard refreshes. Missed and historical days are not fabricated or backfilled.",
      ],
    },
  };
}

// Previous-period deltas only need four range charts plus the authoritative
// range-revenue metric. Keeping this path small
// leaves the main Overview reconciliation inside RevenueCat's 25 request/minute
// Charts & Metrics limit, even on the first uncached dashboard load.
async function buildComparisonReport({ apiKey, projectId, currency, range }) {
  const tracker = { attempted: 0, succeeded: 0 };
  const errors = [];
  const [rangeRevenueResult, revenueResult, trialsResult, conversionsResult, firstPaidResult] = await Promise.all([
    capture("range_revenue", () => loadRangeRevenue(apiKey, projectId, currency, range, tracker), errors),
    capture("revenue", () => loadChart(apiKey, projectId, "revenue", {
      currency,
      range,
      tracker,
      selectorIntent: "gross_revenue",
      projectWide: true,
    }), errors),
    capture("trials_new", () => loadChart(apiKey, projectId, "trials_new", { range, tracker }), errors),
    capture("trial_conversion_rate", () => loadChart(apiKey, projectId, "trial_conversion_rate", { range, tracker }), errors),
    capture("actives_new", () => loadChart(apiKey, projectId, "actives_new", { range, tracker }), errors),
  ]);
  const revenue = revenueResult?.chart || null;
  const trials = trialsResult?.chart || null;
  const conversions = conversionsResult?.chart || null;
  const firstPaid = firstPaidResult?.chart || null;
  const paidTrialConversions = chartTotal(firstPaid, [/^trial conversions$/i]);
  const directSubscriptions = chartTotal(firstPaid, [/^direct subscriptions$/i, /^direct$/i]);
  const introOffers = chartTotal(firstPaid, [/^intro offers$/i, /introductory offers/i]);
  const authoritativeRevenue = rangeRevenueValue(rangeRevenueResult);
  const chartRevenue = chartTotal(revenue, [/^revenue$/i, /gross revenue/i]);

  return {
    source: "RevenueCat API v2 comparison",
    fetchedAt: new Date().toISOString(),
    projectId,
    scope: {
      environment: "production",
      store: "app_store",
      currency,
      timezone: "UTC",
      startDate: range.startDate,
      endDate: range.endDate,
    },
    metrics: {
      grossRevenue: valueMetric(Number.isFinite(authoritativeRevenue) ? authoritativeRevenue : chartRevenue, {
        source: Number.isFinite(authoritativeRevenue)
          ? "RevenueCat Revenue metric (API v2, realtime Charts v3)"
          : "RevenueCat Revenue chart (API v2)",
        unit: "currency",
        currency,
        period: range,
        definition: "Gross RevenueCat revenue in the comparison UTC date range.",
      }),
      trialsStarted: valueMetric(chartTotal(trials, [/^new trials$/i, /^trial starts$/i]), {
        source: "RevenueCat New Trials chart (API v2)",
        unit: "trials",
        period: range,
        definition: "Trials started in the comparison UTC date range.",
      }),
      trialsConvertedToPaid: valueMetric(paidTrialConversions, {
        source: "RevenueCat New Paid Subscriptions chart (API v2)",
        unit: "trials",
        period: range,
        definition: "Trial subscriptions whose first payment occurred in the comparison UTC date range.",
      }),
      firstPaidCustomers: valueMetric(addAvailable(directSubscriptions, paidTrialConversions, introOffers), {
        source: "RevenueCat New Paid Subscriptions chart (API v2)",
        unit: "new_paid_subscriptions",
        period: range,
        definition: "Subscriptions with their first successful payment in the comparison UTC date range.",
      }),
      trialConversionRate: valueMetric(chartSummaryValue(conversions, [/trial conversion rate/i, /^conversion rate/i]), {
        source: "RevenueCat Trial Conversion Rate chart (API v2)",
        unit: "percent",
        period: range,
        definition: "RevenueCat matched-cohort trial conversion rate for the comparison range.",
      }),
    },
    series: {
      grossRevenueDaily: chartSeries(revenue, [/^revenue$/i, /gross revenue/i]),
    },
    coverage: {
      complete: errors.length === 0,
      requestsAttempted: tracker.attempted,
      requestsSucceeded: tracker.succeeded,
      errors,
    },
  };
}

async function loadOverviewMetrics(apiKey, projectId, currency, tracker) {
  const params = new URLSearchParams({ currency });
  return revenueCatGet(
    apiKey,
    `/v2/projects/${encodeURIComponent(projectId)}/metrics/overview?${params}`,
    tracker,
  );
}

async function loadRangeRevenue(apiKey, projectId, currency, range, tracker) {
  const params = new URLSearchParams({
    start_date: range.startDate,
    end_date: range.endDate,
    currency,
    revenue_type: "revenue",
  });
  return revenueCatGet(
    apiKey,
    `/v2/projects/${encodeURIComponent(projectId)}/metrics/revenue?${params}`,
    tracker,
  );
}

async function loadSubscriptionStatus(apiKey, projectId, currency, tracker) {
  const chartName = "subscription_status";
  const options = await revenueCatGet(apiKey, chartPath(projectId, chartName, "/options?realtime=true"), tracker);
  const filter = appStoreFilter(options);
  const measureSelector = subscriptionMeasureSelector(options);
  const countrySegment = optionId(options?.segments, [/^country$/i]);
  const gross = selectorFor(options, [/^revenue$/i, /gross revenue/i], new Set([measureSelector.name]));

  const fetchStatus = async (kind, { segmentCountry = false } = {}) => {
    const selected = { [measureSelector.name]: measureSelector.values[kind] };
    if (gross) selected[gross.name] = gross.value;
    const params = new URLSearchParams({
      realtime: "true",
      filters: JSON.stringify(filter),
      selectors: JSON.stringify(selected),
      currency,
    });
    if (segmentCountry && countrySegment) {
      params.set("segment", countrySegment);
      params.set("limit_num_segments", "250");
    }
    return revenueCatGet(apiKey, chartPath(projectId, chartName, `?${params}`), tracker);
  };

  const [paidChart, trialChart, arrChart] = await Promise.all([
    fetchStatus("paid", { segmentCountry: true }),
    fetchStatus("trials", { segmentCountry: true }),
    fetchStatus("arr"),
  ]);

  const paid = statusBreakdown(paidChart);
  const trials = statusBreakdown(trialChart);
  const arr = statusBreakdown(arrChart);
  const countries = countrySegment
    ? mergeCountries(countryRows(paidChart), countryRows(trialChart))
    : null;

  return {
    paid,
    trials,
    arr,
    countries,
    coverage: {
      available: [paid, trials, arr].every((entry) => entry?.available),
      source: "subscription_status",
      lastComputedAt: newestIso(paid.asOf, trials.asOf, arr.asOf),
      incompletePeriods: 0,
      countrySegmentation: countrySegment ? "available" : "unsupported",
    },
  };
}

async function loadChart(apiKey, projectId, chartName, {
  currency,
  range,
  tracker,
  selectorIntent,
  projectWide = false,
}) {
  const options = await loadChartOptions(apiKey, projectId, chartName, tracker);
  const filter = projectWide ? [] : appStoreFilter(options);
  const resolution = dayResolution(options);
  const selectors = {};
  if (selectorIntent === "gross_revenue") {
    const gross = selectorFor(options, [/^revenue$/i, /gross revenue/i]);
    if (!gross) throw schemaError(chartName, "RevenueCat did not advertise a gross-revenue selector.");
    selectors[gross.name] = gross.value;
  }

  const params = new URLSearchParams({
    realtime: "true",
    start_date: range.startDate,
    end_date: range.endDate,
    resolution,
    filters: JSON.stringify(filter),
  });
  if (currency) params.set("currency", currency);
  if (Object.keys(selectors).length) params.set("selectors", JSON.stringify(selectors));

  const chart = await revenueCatGet(apiKey, chartPath(projectId, chartName, `?${params}`), tracker);
  if (!Array.isArray(chart?.values) || !Array.isArray(chart?.measures)) {
    throw schemaError(chartName, "RevenueCat returned a chart shape that could not be read safely.");
  }
  return { chart, options, chartName };
}

async function loadChartOptions(apiKey, projectId, chartName, tracker) {
  const key = `${projectId}:${chartName}`;
  const cached = chartOptionsCache.get(key);
  if (cached && Date.now() - cached.savedAt < CHART_OPTIONS_CACHE_MS) return cached.value;
  const value = await revenueCatGet(apiKey, chartPath(projectId, chartName, "/options?realtime=true"), tracker);
  chartOptionsCache.set(key, { savedAt: Date.now(), value });
  return value;
}

async function loadAppleSearchAdsChart({ apiKey, projectId, loaded, range, tracker, segmentCampaign = false }) {
  const chartName = loaded?.chartName;
  const options = loaded?.options;
  if (!chartName || !options) {
    throw schemaError("apple_search_ads", "The base RevenueCat chart was unavailable, so its attribution filter could not be inspected.");
  }
  const filters = [...appStoreFilter(options), appleSearchAdsAttributionFilter(options)];
  const params = new URLSearchParams({
    realtime: "true",
    start_date: range.startDate,
    end_date: range.endDate,
    resolution: dayResolution(options),
    filters: JSON.stringify(filters),
  });
  if (segmentCampaign) {
    params.set("segment", appleSearchAdsCampaignSegment(options));
    params.set("limit_num_segments", "250");
  }
  const chart = await revenueCatGet(apiKey, chartPath(projectId, chartName, `?${params}`), tracker);
  if (!Array.isArray(chart?.values) || !Array.isArray(chart?.measures)) {
    throw schemaError(chartName, "RevenueCat returned an attributed chart shape that could not be read safely.");
  }
  return { chart, options, chartName: `${chartName}:apple_search_ads${segmentCampaign ? ":campaign" : ""}` };
}

async function loadLifetimeRevenueChart({ apiKey, projectId, loaded, endDate, currency, tracker }) {
  const options = loaded?.options;
  if (!options) {
    throw schemaError("lifetime_revenue", "The base Revenue chart was unavailable, so its gross-revenue options could not be reused.");
  }
  if (endDate < LIFETIME_REVENUE_START) {
    throw schemaError("lifetime_revenue", "The requested end date is earlier than the lifetime reporting start date.");
  }
  const gross = selectorFor(options, [/^revenue$/i, /gross revenue/i]);
  if (!gross) {
    throw schemaError("lifetime_revenue", "RevenueCat did not advertise the gross-revenue selector for lifetime reporting.");
  }
  const params = new URLSearchParams({
    realtime: "true",
    start_date: LIFETIME_REVENUE_START,
    end_date: endDate,
    resolution: monthResolution(options),
    filters: JSON.stringify(appStoreFilter(options)),
    selectors: JSON.stringify({ [gross.name]: gross.value }),
    currency,
  });
  const chart = await revenueCatGet(apiKey, chartPath(projectId, "revenue", `?${params}`), tracker);
  if (!Array.isArray(chart?.values) || !Array.isArray(chart?.measures)) {
    throw schemaError("lifetime_revenue", "RevenueCat returned a lifetime Revenue chart shape that could not be read safely.");
  }
  return {
    chart,
    options,
    chartName: "revenue:lifetime",
    resolution: "month",
  };
}

function appleSearchAdsAttributionFilter(options) {
  const filters = Array.isArray(options?.filters) ? options.filters : [];
  const source = filters.find((filter) => matchesPatterns([
    filter?.display_name,
    filter?.name,
    filter?.id,
  ], [/^attribution source$/i, /^attribution_source$/i, /attribution.*source/i]));
  const choices = selectorChoices(source);
  const apple = choices.find((choice) => matchesPatterns([
    choice?.display_name,
    choice?.name,
    choice?.id,
    choice?.value,
  ], [/^apple search ads$/i, /^apple_search_ads$/i, /^searchads$/i]));
  const filterId = source?.id || source?.name;
  // Current RevenueCat options normally advertise this value. Some projects
  // omit dynamic attribution values from /options even though the documented
  // attribution_source filter accepts the canonical display value.
  const value = apple?.id ?? apple?.value ?? (source ? "Apple Search Ads" : null);
  if (!filterId || value === null || value === undefined || value === "") {
    throw schemaError("apple_search_ads", "RevenueCat did not advertise an Apple Search Ads attribution filter.");
  }
  return { name: String(filterId), values: [String(value)] };
}

function appleSearchAdsCampaignSegment(options) {
  const segments = Array.isArray(options?.segments) ? options.segments : [];
  const exact = segments.find((segment) => matchesPatterns([
    segment?.display_name,
    segment?.name,
    segment?.id,
  ], [
    /^apple search ads campaign$/i,
    /^apple_search_ads_campaign$/i,
    /^search ads campaign$/i,
    /^attribution campaign$/i,
    /^attribution_campaign$/i,
  ]));
  const semantic = exact || segments.find((segment) => matchesPatterns([
    segment?.display_name,
    segment?.name,
    segment?.id,
  ], [/apple.*(?:search )?ads.*campaign/i, /attribution.*campaign/i]));
  const id = semantic?.id ?? semantic?.name;
  if (id === null || id === undefined || id === "") {
    throw schemaError("apple_search_ads_campaign", "RevenueCat did not advertise Apple Search Ads Campaign segmentation.");
  }
  return String(id);
}

async function persistAndReadGrowth({ env, paid, trials, mrr, arr, currency }) {
  const source = "Daily RevenueCat Overview snapshot stored in Cloud Firestore";
  if (!env?.FIREBASE_SERVICE_ACCOUNT) {
    return {
      available: false,
      source,
      points: [],
      reason: "FIREBASE_SERVICE_ACCOUNT is not configured, so no daily growth history can be stored or read.",
    };
  }

  const paidValue = finiteOrNull(paid);
  const trialValue = finiteOrNull(trials);
  const activePremium = addAvailable(paidValue, trialValue);
  if (!Number.isFinite(activePremium)) {
    return {
      available: false,
      source,
      points: [],
      reason: "RevenueCat did not return both active subscription and active trial counts, so an incomplete daily snapshot was not stored.",
    };
  }

  const date = utcDate(Date.now());
  const fetchedAt = new Date().toISOString();
  try {
    const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const firebaseProject = projectIdFrom(env, account);
    const token = await accessToken(account);
    const snapshot = {
      date,
      activePremium,
      paid: paidValue,
      trials: trialValue,
      mrr: finiteOrNull(mrr),
      arr: finiteOrNull(arr),
      currency,
      fetchedAt,
      source: "RevenueCat Overview metrics (API v2)",
    };
    const fields = Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, typedValue(value)]));
    await patchDocument({
      projectId: firebaseProject,
      token,
      path: `${GROWTH_COLLECTION}/${date}`,
      fields,
      updateMask: Object.keys(fields),
    });
    const points = await readGrowthSnapshots({ projectId: firebaseProject, token });
    return {
      available: true,
      source,
      definition: "One exact UTC snapshot per day of active paid subscriptions and active trials from RevenueCat Overview. The same day's document is refreshed; prior days are never fabricated.",
      collection: GROWTH_COLLECTION,
      snapshotDate: date,
      points,
    };
  } catch (error) {
    console.error("RevenueCat daily owner growth snapshot failed", {
      message: error?.message || "unknown",
    });
    return {
      available: false,
      source,
      points: [],
      reason: "The Firebase growth snapshot could not be stored or read. RevenueCat metrics remain available.",
    };
  }
}

async function readGrowthSnapshots({ projectId, token }) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: GROWTH_COLLECTION }],
        orderBy: [{ field: { fieldPath: "date" }, direction: "DESCENDING" }],
        limit: MAX_GROWTH_POINTS,
      },
    }),
  });
  if (!response.ok) throw new Error(`Firestore growth query failed: ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Firestore growth query returned an unreadable response.");
  return rows
    .map((row) => growthPoint(row?.document?.fields))
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function growthPoint(fields) {
  if (!fields || typeof fields !== "object") return null;
  const date = firestoreValue(fields.date);
  const activePremium = firestoreValue(fields.activePremium);
  const paid = firestoreValue(fields.paid);
  const trials = firestoreValue(fields.trials);
  if (!validDate(date) || ![activePremium, paid, trials].every(Number.isFinite)) return null;
  return {
    date,
    activePremium,
    paid,
    trials,
    mrr: finiteOrNull(firestoreValue(fields.mrr)),
    arr: finiteOrNull(firestoreValue(fields.arr)),
    currency: stringOrNullValue(firestoreValue(fields.currency)),
    fetchedAt: stringOrNullValue(firestoreValue(fields.fetchedAt)),
  };
}

function firestoreValue(value) {
  if (!value || typeof value !== "object" || "nullValue" in value) return null;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  return null;
}

function stringOrNullValue(value) {
  return typeof value === "string" && value ? value : null;
}

function statusBreakdown(chart) {
  const total = statusValue(chart, [/^total\b/i, /\btotal\b/i]);
  const setToRenew = statusValue(chart, [/set to renew/i]);
  const setToCancel = statusValue(chart, [/set to cancel/i, /set to cancelled/i]);
  const billingIssue = statusValue(chart, [/billing issue/i, /billing recovery/i]);
  const hasAny = [total, setToRenew, setToCancel, billingIssue].some(Number.isFinite);
  return {
    available: hasAny,
    total: finiteOrNull(total),
    setToRenew: finiteOrNull(setToRenew),
    setToCancel: finiteOrNull(setToCancel),
    billingIssue: finiteOrNull(billingIssue),
    asOf: epochIso(chart?.last_computed_at) || epochIso(chart?.end_date) || new Date().toISOString(),
  };
}

function statusValue(chart, patterns) {
  const measure = measureIndex(chart, patterns);
  if (measure < 0) return null;
  const rows = Array.isArray(chart?.values) ? chart.values : [];
  const values = rows
    .filter((row) => row && !Array.isArray(row) && Number(row.measure) === measure)
    .map((row) => finiteOrNull(row.value))
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function countryRows(chart) {
  const setToRenew = measureIndex(chart, [/set to renew/i]);
  if (setToRenew < 0 || !Array.isArray(chart?.segments)) return null;
  const totals = new Map();
  for (const row of chart.values || []) {
    if (!row || Array.isArray(row) || Number(row.measure) !== setToRenew) continue;
    const value = finiteOrNull(row.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    const metadata = segmentMetadata(chart.segments, row.segment);
    const code = String(metadata?.id ?? metadata?.value ?? metadata?.display_name ?? row.segment ?? "unknown");
    const name = String(metadata?.display_name || metadata?.name || code);
    const previous = totals.get(code) || { code, name, value: 0 };
    previous.value += value;
    totals.set(code, previous);
  }
  return [...totals.values()];
}

function mergeCountries(paidRows, trialRows) {
  if (!Array.isArray(paidRows) || !Array.isArray(trialRows)) return null;
  const countries = new Map();
  const add = (rows, key) => {
    for (const row of rows) {
      const current = countries.get(row.code) || {
        code: row.code,
        name: row.name,
        paid: 0,
        trials: 0,
        activePremium: 0,
      };
      current[key] += row.value;
      current.activePremium += row.value;
      countries.set(row.code, current);
    }
  };
  add(paidRows, "paid");
  add(trialRows, "trials");
  return [...countries.values()]
    .filter((entry) => entry.activePremium > 0)
    .sort((a, b) => b.activePremium - a.activePremium || a.name.localeCompare(b.name));
}

function chartTotal(chart, patterns) {
  if (!chart) return null;
  const summaryValue = chartSummaryValue(chart, patterns);
  if (summaryValue !== null) return summaryValue;

  const measure = measureIndex(chart, patterns);
  if (measure < 0) return null;
  const values = (chart.values || [])
    .filter((row) => row && !Array.isArray(row) && Number(row.measure) === measure)
    .map((row) => finiteOrNull(row.value))
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function buildAcquisitionPresets({ trialsChart, firstPaidChart, conversionChart, historyRange }) {
  const sinceStart = historyRange.startDate > ACQUISITION_RELAUNCH_START
    ? historyRange.startDate
    : ACQUISITION_RELAUNCH_START;
  const ranges = {
    today: { startDate: historyRange.endDate, endDate: historyRange.endDate },
    sinceRelaunch: { startDate: sinceStart, endDate: historyRange.endDate },
    allTime: { startDate: historyRange.startDate, endDate: historyRange.endDate },
  };
  const presets = Object.fromEntries(Object.entries(ranges).map(([key, selectedRange]) => [
    key,
    buildAcquisitionWindow({
      trialsChart,
      firstPaidChart,
      conversionChart,
      range: selectedRange,
    }),
  ]));
  return {
    available: Object.values(presets).some((preset) => preset.available),
    source: "RevenueCat Charts API v2 filtered by Apple Search Ads and segmented by Apple Search Ads Campaign",
    definition: "Campaign outcomes come from RevenueCat receipt history. First paid includes direct subscriptions without a trial, paid introductory offers, and trial conversions. Missing attribution is never assigned to a campaign.",
    defaultPreset: "sinceRelaunch",
    historyRange,
    presets,
  };
}

function buildAcquisitionWindow({ trialsChart, firstPaidChart, conversionChart, range }) {
  const trialStarts = segmentedMeasureTotals(trialsChart, [/^new trials$/i, /^trial starts$/i], range);
  const firstPaid = segmentedMeasureTotals(firstPaidChart, [
    /^total paid subscriptions$/i,
    /^total new paid subscriptions$/i,
    /^new paid subscriptions$/i,
    /^new actives$/i,
    /^total$/i,
  ], range);
  const directFirstPaid = segmentedMeasureTotals(firstPaidChart, [/^direct subscriptions$/i, /^direct$/i], range);
  const trialConversions = segmentedMeasureTotals(firstPaidChart, [/^trial conversions$/i], range);
  const introductoryFirstPaid = segmentedMeasureTotals(firstPaidChart, [/^intro offers$/i, /introductory offers/i], range);
  const productChanges = segmentedMeasureTotals(firstPaidChart, [/^product changes$/i], range);
  const resubscriptions = segmentedMeasureTotals(firstPaidChart, [/^resubscriptions$/i], range);
  const cohortStarts = segmentedMeasureTotals(conversionChart, [/^trial starts$/i], range);
  const cohortConversions = segmentedMeasureTotals(conversionChart, [/^conversions$/i, /converted/i], range);
  const pendingTrialOutcomes = segmentedMeasureTotals(conversionChart, [/^pending$/i], range);

  const rows = [];
  applySegmentMetric(rows, trialStarts, "trialStarts");
  applySegmentMetric(rows, firstPaid, "firstPaid");
  applySegmentMetric(rows, directFirstPaid, "directFirstPaid");
  applySegmentMetric(rows, trialConversions, "trialConversions");
  applySegmentMetric(rows, introductoryFirstPaid, "introductoryFirstPaid");
  applySegmentMetric(rows, productChanges, "productChanges");
  applySegmentMetric(rows, resubscriptions, "resubscriptions");
  applySegmentMetric(rows, cohortStarts, "cohortStarts");
  applySegmentMetric(rows, cohortConversions, "cohortConversions");
  applySegmentMetric(rows, pendingTrialOutcomes, "pendingTrialOutcomes");

  const trialStartsAvailable = trialStarts !== null;
  const firstPaidComponentsAvailable = [directFirstPaid, trialConversions, introductoryFirstPaid]
    .every((value) => value !== null);
  const firstPaidCanSubtractMovements = firstPaid !== null && productChanges !== null && resubscriptions !== null;
  const firstPaidAvailable = firstPaidComponentsAvailable || firstPaidCanSubtractMovements;
  const conversionAvailable = cohortStarts !== null && cohortConversions !== null;

  const campaigns = rows.map((row) => {
    const totalFirstPaid = firstPaidComponentsAvailable
      ? metricOrZero(row.directFirstPaid) + metricOrZero(row.trialConversions) + metricOrZero(row.introductoryFirstPaid)
      : Math.max(0, metricOrZero(row.firstPaid) - metricOrZero(row.productChanges) - metricOrZero(row.resubscriptions));
    const starts = trialStartsAvailable ? metricOrZero(row.trialStarts) : null;
    const matchedStarts = conversionAvailable ? metricOrZero(row.cohortStarts) : null;
    const matchedConversions = conversionAvailable ? metricOrZero(row.cohortConversions) : null;
    return {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      unidentified: row.unidentified,
      trialStarts: starts,
      firstPaid: firstPaidAvailable ? totalFirstPaid : null,
      allNewPaidSubscriptions: firstPaid !== null ? metricOrZero(row.firstPaid) : null,
      directFirstPaid: directFirstPaid !== null ? metricOrZero(row.directFirstPaid) : null,
      trialConversions: trialConversions !== null ? metricOrZero(row.trialConversions) : null,
      introductoryFirstPaid: introductoryFirstPaid !== null ? metricOrZero(row.introductoryFirstPaid) : null,
      productChanges: productChanges !== null ? metricOrZero(row.productChanges) : null,
      resubscriptions: resubscriptions !== null ? metricOrZero(row.resubscriptions) : null,
      cohortStarts: matchedStarts,
      cohortConversions: matchedConversions,
      pendingTrialOutcomes: pendingTrialOutcomes !== null ? metricOrZero(row.pendingTrialOutcomes) : null,
      trialToPaidRate: matchedStarts > 0 ? matchedConversions / matchedStarts : null,
    };
  }).sort((left, right) => (
    Number(left.unidentified) - Number(right.unidentified)
    || metricOrZero(right.firstPaid) - metricOrZero(left.firstPaid)
    || metricOrZero(right.trialStarts) - metricOrZero(left.trialStarts)
    || left.campaignName.localeCompare(right.campaignName)
  ));

  const total = (field, available) => available
    ? campaigns.reduce((sum, campaign) => sum + metricOrZero(campaign[field]), 0)
    : null;
  const totalCohortStarts = total("cohortStarts", conversionAvailable);
  const totalCohortConversions = total("cohortConversions", conversionAvailable);
  return {
    available: trialStartsAvailable && firstPaidAvailable,
    scope: {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: "UTC",
      store: "app_store",
      attributionSource: "Apple Search Ads",
      includesPartialToday: range.endDate === utcDate(Date.now()),
    },
    totals: {
      trialStarts: total("trialStarts", trialStartsAvailable),
      firstPaid: total("firstPaid", firstPaidAvailable),
      directFirstPaid: total("directFirstPaid", directFirstPaid !== null),
      trialConversions: total("trialConversions", trialConversions !== null),
      introductoryFirstPaid: total("introductoryFirstPaid", introductoryFirstPaid !== null),
      productChanges: total("productChanges", productChanges !== null),
      resubscriptions: total("resubscriptions", resubscriptions !== null),
      cohortStarts: totalCohortStarts,
      cohortConversions: totalCohortConversions,
      pendingTrialOutcomes: total("pendingTrialOutcomes", pendingTrialOutcomes !== null),
      trialToPaidRate: totalCohortStarts > 0 ? totalCohortConversions / totalCohortStarts : null,
    },
    campaigns,
    ...(trialStartsAvailable && firstPaidAvailable ? {} : {
      reason: "RevenueCat did not return both campaign-segmented trial starts and first-paid subscriptions. No missing value was treated as zero.",
    }),
  };
}

function segmentedMeasureTotals(chart, patterns, range) {
  if (!chart) return null;
  const measure = measureIndex(chart, patterns);
  if (measure < 0) return null;
  const totals = new Map();
  for (const row of chart.values || []) {
    if (!row || Array.isArray(row) || Number(row.measure) !== measure) continue;
    const date = chartRowDate(row);
    if (!date || date < range.startDate || date > range.endDate) continue;
    const value = finiteOrNull(row.value);
    if (value === null) continue;
    const segment = campaignSegmentInfo(chart, row.segment);
    if (!segment || segment.aggregate) continue;
    const current = totals.get(segment.key) || { segment, value: 0 };
    current.value += value;
    totals.set(segment.key, current);
  }
  return totals;
}

function chartRowDate(row) {
  const raw = row?.cohort ?? row?.timestamp ?? row?.date;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return epochDate(raw);
}

function campaignSegmentInfo(chart, segmentValue) {
  const rawMetadata = segmentMetadata(Array.isArray(chart?.segments) ? chart.segments : [], segmentValue);
  const metadata = rawMetadata && typeof rawMetadata === "object"
    ? rawMetadata
    : { display_name: rawMetadata === null || rawMetadata === undefined ? "" : String(rawMetadata) };
  const candidates = [
    metadata?.campaign_id,
    metadata?.campaignId,
    metadata?.value,
    metadata?.id,
  ].filter((value) => value !== null && value !== undefined && value !== "").map(String);
  const campaignId = candidates.find((value) => /^\d{5,}$/.test(value.trim()))
    || candidates.map((value) => value.match(/(?:^|\D)(\d{5,})(?:\D|$)/)?.[1]).find(Boolean)
    || "";
  const display = String(
    metadata?.display_name
    || metadata?.name
    || metadata?.label
    || metadata?.value
    || metadata?.id
    || ""
  ).trim();
  const normalized = normalizeCampaignName(display);
  const aggregate = /^(all|total|all campaigns)$/.test(normalized);
  const unidentified = !normalized
    || /^(unknown|unattributed|none|not set|no campaign|organic|unspecified)$/.test(normalized)
    || /campaign (?:not )?(?:available|identified)/.test(normalized);
  const campaignName = unidentified
    ? "Campaign not identified"
    : display || (campaignId ? `Campaign ${campaignId}` : "Campaign not identified");
  return {
    key: campaignId ? `id:${campaignId}` : unidentified ? "unidentified" : `name:${normalizeCampaignName(campaignName)}`,
    campaignId,
    campaignName,
    normalizedName: normalizeCampaignName(campaignName),
    unidentified,
    aggregate,
  };
}

function applySegmentMetric(rows, values, field) {
  if (values === null) return;
  for (const { segment, value } of values.values()) {
    let row = rows.find((candidate) => (
      (segment.campaignId && candidate.campaignId === segment.campaignId)
      || (!segment.unidentified && segment.normalizedName && candidate.normalizedName === segment.normalizedName)
      || (segment.unidentified && candidate.unidentified)
    ));
    if (!row) {
      row = {
        campaignId: segment.campaignId,
        campaignName: segment.campaignName,
        normalizedName: segment.normalizedName,
        unidentified: segment.unidentified,
      };
      rows.push(row);
    } else {
      if (!row.campaignId && segment.campaignId) row.campaignId = segment.campaignId;
      if ((!row.campaignName || row.unidentified) && !segment.unidentified) row.campaignName = segment.campaignName;
    }
    row[field] = metricOrZero(row[field]) + value;
  }
}

function normalizeCampaignName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function metricOrZero(value) {
  const number = finiteOrNull(value);
  return number === null ? 0 : number;
}

function chartSummaryValue(chart, patterns) {
  const summary = chart?.summary?.total;
  if (!summary || typeof summary !== "object") return null;
  const key = Object.keys(summary).find((name) => patterns.some((pattern) => pattern.test(name)));
  if (!key) return null;
  return finiteOrNull(summary[key]);
}

function chartSeries(chart, patterns) {
  if (!chart) return [];
  const measure = measureIndex(chart, patterns);
  if (measure < 0) return [];
  return (chart.values || [])
    .filter((row) => row && !Array.isArray(row) && Number(row.measure) === measure && finiteOrNull(row.value) !== null)
    .map((row) => ({
      date: epochDate(row.cohort ?? row.timestamp ?? row.date),
      value: finiteOrNull(row.value),
      incomplete: row.incomplete === true,
    }))
    .filter((row) => row.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function newPaidSeries(chart) {
  if (!chart) return [];

  const measures = [
    measureIndex(chart, [/^direct subscriptions$/i, /^direct$/i]),
    measureIndex(chart, [/^trial conversions$/i]),
    measureIndex(chart, [/^intro offers$/i, /introductory offers/i]),
  ];
  if (measures.some((index) => index < 0)) {
    return chartSeries(chart, [
      /^total paid subscriptions$/i,
      /^total new paid subscriptions$/i,
      /^new paid subscriptions$/i,
      /^new actives$/i,
      /^total$/i,
    ]);
  }

  const byDate = new Map();
  for (const row of chart.values || []) {
    if (!row || Array.isArray(row) || !measures.includes(Number(row.measure))) continue;
    const date = epochDate(row.cohort ?? row.timestamp ?? row.date);
    const value = finiteOrNull(row.value);
    if (!date || value === null) continue;
    const current = byDate.get(date) || { date, value: 0, incomplete: false, measures: new Set() };
    current.value += value;
    current.incomplete ||= row.incomplete === true;
    current.measures.add(Number(row.measure));
    byDate.set(date, current);
  }
  return [...byDate.values()]
    .filter((point) => point.measures.size === measures.length)
    .map(({ date, value, incomplete }) => ({ date, value, incomplete }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function measureIndex(chart, patterns) {
  const measures = Array.isArray(chart?.measures) ? chart.measures : [];
  return measures.findIndex((measure) => matchesPatterns([
    measure?.display_name,
    measure?.name,
    measure?.id,
  ], patterns));
}

function segmentMetadata(segments, value) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < segments.length) return segments[numeric];
  return segments.find((segment) => String(segment?.id ?? segment?.value ?? "") === String(value)) || null;
}

function subscriptionMeasureSelector(options) {
  const selectors = options?.user_selectors && typeof options.user_selectors === "object" ? options.user_selectors : {};
  for (const [name, selector] of Object.entries(selectors)) {
    const choices = selectorChoices(selector);
    const values = {
      paid: choiceId(choices, [/^active subscriptions$/i, /^paid subscriptions$/i], ["active_subscriptions"]),
      trials: choiceId(choices, [/^active trials$/i], ["active_trials"]),
      mrr: choiceId(choices, [/^mrr$/i, /monthly recurring revenue/i], ["mrr"]),
      arr: choiceId(choices, [/^arr$/i, /annual recurring revenue/i], ["arr"]),
    };
    if (Object.values(values).every(Boolean)) return { name, values };
  }
  throw schemaError("subscription_status", "RevenueCat did not advertise paid, trial, MRR, and ARR selectors.");
}

function selectorFor(options, patterns, excludedNames = new Set()) {
  const selectors = options?.user_selectors && typeof options.user_selectors === "object" ? options.user_selectors : {};
  for (const [name, selector] of Object.entries(selectors)) {
    if (excludedNames.has(name)) continue;
    const choices = selectorChoices(selector);
    const selected = choices.find((choice) => matchesPatterns([choice?.display_name, choice?.id], patterns));
    if (selected?.id) return { name, value: selected.id };
  }
  return null;
}

function selectorChoices(selector) {
  const direct = [
    ...(Array.isArray(selector?.options) ? selector.options : []),
    ...(Array.isArray(selector?.values) ? selector.values : []),
    ...(Array.isArray(selector?.items) ? selector.items : []),
  ];
  const grouped = (Array.isArray(selector?.groups) ? selector.groups : [])
    .flatMap((group) => [
      ...(Array.isArray(group?.options) ? group.options : []),
      ...(Array.isArray(group?.values) ? group.values : []),
    ]);
  return [...direct, ...grouped].map((choice) => (
    typeof choice === "string" ? { id: choice, display_name: choice } : choice
  ));
}

function choiceId(choices, patterns, exactIds = []) {
  const exact = choices.find((choice) => exactIds.includes(String(choice?.id || "")));
  if (exact?.id) return exact.id;
  const semantic = choices.find((choice) => matchesPatterns([choice?.display_name, choice?.id], patterns));
  return semantic?.id || null;
}

function appStoreFilter(options) {
  const filters = Array.isArray(options?.filters) ? options.filters : [];
  const store = filters.find((filter) => /^store$/i.test(String(filter?.id || filter?.name || filter?.display_name || "")));
  const choices = selectorChoices(store);
  const appStore = choices.find((choice) => choice?.id === "app_store")
    || choices.find((choice) => /^app store$/i.test(String(choice?.display_name || "")));
  if (!store?.id || !appStore?.id) throw schemaError("filters", "RevenueCat did not advertise an App Store filter.");
  const selected = [{ name: store.id, values: [appStore.id] }];
  const app = filters.find((filter) => /^(app|app id|app_id)$/i.test(String(filter?.id || filter?.name || filter?.display_name || "")));
  const appChoices = selectorChoices(app);
  const pelvicFloorApp = appChoices.find((choice) => choice?.id === "appec71ecec7b")
    || appChoices.find((choice) => /pelvic floor.*core coach/i.test(String(choice?.display_name || "")))
    || (appChoices.length === 1 ? appChoices[0] : null);
  if (app?.id && pelvicFloorApp?.id) selected.push({ name: app.id, values: [pelvicFloorApp.id] });
  return selected;
}

function dayResolution(options) {
  return namedResolution(options, [/^day$/i, /^daily$/i], "daily");
}

function monthResolution(options) {
  return namedResolution(options, [/^month$/i, /^monthly$/i], "monthly");
}

function namedResolution(options, patterns, label) {
  const resolutions = Array.isArray(options?.resolutions) ? options.resolutions : [];
  const resolution = resolutions.find((option) => matchesPatterns([
    option?.display_name,
    option?.name,
    option?.id,
  ], patterns));
  if (!resolution?.id && resolution?.id !== 0) {
    throw schemaError("resolution", `RevenueCat did not advertise ${label} chart resolution.`);
  }
  return String(resolution.id);
}

function optionId(options, patterns) {
  const item = (Array.isArray(options) ? options : [])
    .find((option) => matchesPatterns([option?.display_name, option?.id], patterns));
  return item?.id ? String(item.id) : null;
}

function matchesPatterns(values, patterns) {
  const text = values.filter(Boolean).map(String);
  return text.some((value) => patterns.some((pattern) => pattern.test(value)));
}

function overviewMetric(payload, candidateIds) {
  const candidates = new Set(candidateIds.map(normalizeMetricId));
  const entry = (Array.isArray(payload?.metrics) ? payload.metrics : []).find((metric) =>
    candidates.has(normalizeMetricId(metric?.id))
      || candidates.has(normalizeMetricId(metric?.name))
  );
  const value = finiteOrNull(entry?.value);
  return {
    available: value !== null,
    value,
    id: typeof entry?.id === "string" ? entry.id : null,
    name: typeof entry?.name === "string" ? entry.name : null,
    unit: typeof entry?.unit === "string" ? entry.unit : null,
    period: typeof entry?.period === "string" ? entry.period : null,
    lastUpdatedAt: overviewUpdatedAt(entry),
  };
}

function normalizeMetricId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function overviewUpdatedAt(entry) {
  const direct = typeof entry?.last_updated_at_iso8601 === "string"
    ? entry.last_updated_at_iso8601.trim()
    : "";
  if (direct) {
    const parsed = new Date(direct);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return epochIso(entry?.last_updated_at);
}

function rangeRevenueValue(payload) {
  if (!payload || payload?.revenue_type !== "revenue") return null;
  return finiteOrNull(payload.value);
}

function overviewCoverage(payload) {
  const metrics = Array.isArray(payload?.metrics) ? payload.metrics : [];
  return {
    available: metrics.length > 0,
    source: "metrics/overview",
    metricCount: metrics.length,
    lastComputedAt: newestIso(...metrics.map(overviewUpdatedAt)),
  };
}

function rangeRevenueCoverage(payload) {
  const value = rangeRevenueValue(payload);
  return {
    available: value !== null,
    source: "metrics/revenue",
    startDate: validDate(payload?.start_date) ? payload.start_date : null,
    endDate: validDate(payload?.end_date) ? payload.end_date : null,
    revenueType: payload?.revenue_type || null,
  };
}

function valueMetric(value, details) {
  const normalized = finiteOrNull(value);
  const available = normalized !== null;
  return {
    available,
    value: normalized,
    ...details,
    ...(available ? {} : { reason: "RevenueCat did not return this measure; no zero was assumed." }),
  };
}

function unavailableMetric(details) {
  return { available: false, value: null, ...details };
}

function chartCoverage(result) {
  const chart = result?.chart || null;
  if (!chart) return { available: false };
  return {
    available: true,
    source: result.chartName || chart.category || "RevenueCat chart",
    ...(result.resolution ? { resolution: result.resolution } : {}),
    startDate: epochDate(chart.start_date),
    endDate: epochDate(chart.end_date),
    lastComputedAt: epochIso(chart.last_computed_at),
    incompletePeriods: (chart.values || []).filter((row) => row?.incomplete === true).length,
  };
}

async function capture(source, task, errors) {
  try {
    return await task();
  } catch (error) {
    const entry = {
      source,
      status: Number(error?.status) || null,
      kind: error?.code || "upstream_error",
      message: safeErrorMessage(error, source),
    };
    errors.push(entry);
    console.error("RevenueCat owner metric source failed", entry);
    return null;
  }
}

function safeErrorMessage(error, source) {
  if (error?.status === 400 || error?.status === 404) return `${source} is not supported by this RevenueCat API key/project.`;
  if (error?.status === 401 || error?.status === 403) return `${source} was denied by RevenueCat API permissions.`;
  if (error?.status === 429) return `${source} was temporarily rate limited by RevenueCat.`;
  if (error?.code === "invalid_chart") return error.message;
  return `${source} was temporarily unavailable.`;
}

async function discoverProjectId(apiKey, configuredName) {
  if (projectCache && Date.now() - projectCache.savedAt < 10 * 60 * 1000) return projectCache.id;
  const tracker = { attempted: 0, succeeded: 0 };
  const payload = await revenueCatGet(apiKey, "/v2/projects?limit=100", tracker);
  const projects = Array.isArray(payload?.items) ? payload.items : [];
  let chosen = projects.length === 1 ? projects[0] : null;
  const wanted = typeof configuredName === "string" ? configuredName.trim().toLowerCase() : "";
  if (!chosen && wanted) {
    const exact = projects.filter((project) => String(project?.name || "").trim().toLowerCase() === wanted);
    if (exact.length === 1) chosen = exact[0];
  }
  if (!chosen) {
    const pelvi = projects.filter((project) => /pelvi|pelvic floor/i.test(String(project?.name || "")));
    if (pelvi.length === 1) chosen = pelvi[0];
  }
  if (!chosen?.id) {
    const error = new Error("RevenueCat project is ambiguous.");
    error.code = "ambiguous_project";
    throw error;
  }
  projectCache = { id: chosen.id, savedAt: Date.now() };
  return chosen.id;
}

async function revenueCatGet(apiKey, path, tracker) {
  const safe = safePath(path);
  if (!safe) throw new Error("RevenueCat returned an invalid path.");
  tracker.attempted += 1;
  const response = await fetch(`${REVENUECAT_API}${safe}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) {
    const error = new Error(`RevenueCat request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  tracker.succeeded += 1;
  return response.json();
}

function chartPath(projectId, chartName, suffix = "") {
  return `/v2/projects/${encodeURIComponent(projectId)}/charts/${encodeURIComponent(chartName)}${suffix}`;
}

function safePath(value) {
  return typeof value === "string" && value.startsWith("/v2/") ? value : null;
}

function acquisitionHistoryRange(endDate) {
  const end = new Date(`${endDate}T00:00:00Z`);
  const targetYear = end.getUTCFullYear() - 2;
  const month = end.getUTCMonth();
  const maximumDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  const start = new Date(Date.UTC(targetYear, month, Math.min(end.getUTCDate(), maximumDay)));
  return {
    startDate: utcDate(start.getTime()),
    endDate,
    days: Math.round((end - start) / 86400000) + 1,
  };
}

function reportRange(start, end) {
  if (!validDate(start) || !validDate(end)) return { ok: false, error: "Choose a valid UTC reporting date range." };
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = (endDate - startDate) / 86400000;
  if (!Number.isFinite(days) || days < 0) return { ok: false, error: "The reporting end date must be on or after the start date." };
  if (days > MAX_RANGE_DAYS) return { ok: false, error: "RevenueCat reports can cover up to ten years at a time." };
  if (endDate > new Date(`${utcDate(Date.now())}T00:00:00Z`)) return { ok: false, error: "The reporting end date cannot be in the future." };
  return { ok: true, startDate: start, endDate: end, days: Math.round(days) + 1 };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && utcDate(date.getTime()) === value;
}

function first(env, names) {
  for (const name of names) {
    const value = typeof env?.[name] === "string" ? env[name].trim() : "";
    if (value) return value;
  }
  return "";
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function monthlyFromAnnual(value) {
  const annual = finiteOrNull(value);
  return annual === null ? null : annual / 12;
}

function addAvailable(...values) {
  const numbers = values.map(finiteOrNull).filter(Number.isFinite);
  return numbers.length === values.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

function schemaError(source, message) {
  const error = new Error(`${source}: ${message}`);
  error.code = "invalid_chart";
  return error;
}

function pruneCache() {
  if (reportCache.size <= MAX_CACHE_ENTRIES) return;
  const oldest = [...reportCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  for (const [key] of oldest.slice(0, reportCache.size - MAX_CACHE_ENTRIES)) reportCache.delete(key);
}

function utcDate(milliseconds) {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function epochDate(value) {
  const iso = epochIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function epochIso(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const milliseconds = number < 1e11 ? number * 1000 : number;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function newestIso(...values) {
  return values.filter(Boolean).sort().at(-1) || null;
}

export const __test = {
  acquisitionHistoryRange,
  appleSearchAdsCampaignSegment,
  appStoreFilter,
  buildAcquisitionPresets,
  buildAcquisitionWindow,
  campaignSegmentInfo,
  monthlyFromAnnual,
  overviewMetric,
  rangeRevenueValue,
};
