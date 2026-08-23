import assert from "node:assert/strict";
import test from "node:test";
import { __test as apple } from "../functions/api/app-analytics.js";
import { __test as revenueCat } from "../functions/api/revenuecat-owner-metrics.js";
import { __test as members } from "../functions/api/revenuecat-members.js";
import {
  acquisitionPaymentCounts,
  buildPaymentKeywordGroups,
  keywordsForCampaign,
  paymentCampaignSpendCoverage,
  sumCoveredDailySeries,
} from "../lib/adminAcquisitionAccuracy.js";
import { buildCoachReply, decodeCoachDocument, groupCoachConversations } from "../functions-lib/coachInbox.js";

function epoch(date) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function chart(measureNames, rows, segments = [
  { id: "campaign_123456", campaign_id: "123456", display_name: "PELVII_US_Discovery_MC" },
  { id: "unknown", display_name: "Unspecified" },
]) {
  return {
    measures: measureNames.map((display_name, id) => ({ id: String(id), display_name })),
    segments,
    values: rows.map(([date, measure, segment, value]) => ({
      cohort: epoch(date),
      measure,
      segment,
      value,
    })),
  };
}

test("Apple history is split into contiguous requests of at most 90 calendar dates", () => {
  const chunks = apple.reportChunks("2025-01-01", "2026-08-18", 90);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    const start = new Date(`${chunk.start}T00:00:00Z`);
    const end = new Date(`${chunk.end}T00:00:00Z`);
    assert.ok((end - start) / 86400000 + 1 <= 90);
  }
  for (let index = 1; index < chunks.length; index += 1) {
    const previousEnd = new Date(`${chunks[index - 1].end}T00:00:00Z`);
    const nextStart = new Date(`${chunks[index].start}T00:00:00Z`);
    assert.equal((nextStart - previousEnd) / 86400000, 1);
  }
});

test("Apple chunk reports merge one campaign without double-counting metadata", () => {
  const merged = apple.mergeCampaignReports([
    [{ id: "123", appId: "6642654729", name: "Discover", countries: ["US"], impressions: 10, taps: 3, installs: 2, newDownloads: 2, redownloads: 0, spend: 4, currency: "USD" }],
    [{ id: "123", appId: "6642654729", name: "Discover", countries: ["US"], impressions: 20, taps: 7, installs: 4, newDownloads: 3, redownloads: 1, spend: 6, currency: "USD" }],
  ]);
  assert.equal(merged.length, 1);
  assert.deepEqual(
    Object.fromEntries(["impressions", "taps", "installs", "newDownloads", "redownloads", "spend"].map((key) => [key, merged[0][key]])),
    { impressions: 30, taps: 10, installs: 6, newDownloads: 5, redownloads: 1, spend: 10 }
  );
});

test("RevenueCat campaign totals include every historical first charge", () => {
  const attributed = chart(
    ["Total Paid Subscriptions", "Direct Subscriptions", "Trial Conversions", "Intro Offers", "Product Changes", "Resubscriptions"],
    [
      ["2026-08-16", 0, 0, 5],
      ["2026-08-16", 1, 0, 2],
      ["2026-08-16", 2, 0, 1],
      ["2026-08-16", 3, 0, 0],
      ["2026-08-16", 4, 0, 1],
      ["2026-08-16", 5, 0, 1],
      ["2026-08-16", 0, 1, 1],
      ["2026-08-16", 1, 1, 1],
      ["2026-08-16", 2, 1, 0],
      ["2026-08-16", 3, 1, 0],
      ["2026-08-16", 4, 1, 0],
      ["2026-08-16", 5, 1, 0],
    ]
  );
  const storeWide = chart(
    ["Total Paid Subscriptions", "Direct Subscriptions", "Trial Conversions", "Intro Offers", "Product Changes", "Resubscriptions"],
    [
      ["2026-08-16", 0, 0, 8],
      ["2026-08-16", 1, 0, 4],
      ["2026-08-16", 2, 0, 1],
      ["2026-08-16", 3, 0, 1],
      ["2026-08-16", 4, 0, 1],
      ["2026-08-16", 5, 0, 1],
    ]
  );
  const result = revenueCat.buildAcquisitionWindow({
    attributedPaymentsChart: attributed,
    storeWidePaymentsChart: storeWide,
    range: { startDate: "2026-08-15", endDate: "2026-08-18" },
  });

  assert.equal(result.available, true);
  assert.equal(result.totals.payments, 6);
  assert.equal(result.totals.attributedPayments, 4);
  assert.equal(result.totals.unattributedPayments, 2);
  const discover = result.campaigns.find((row) => row.campaignId === "123456");
  assert.equal(discover.payments, 3);
  assert.equal(result.campaigns.find((row) => row.unidentified).payments, 1);
});

test("RevenueCat selected dates keep older direct-payment campaign history available", () => {
  const payments = chart(["Total Paid Subscriptions", "Direct Subscriptions", "Trial Conversions", "Intro Offers"], [
    ["2026-08-14", 0, 0, 8],
    ["2026-08-14", 1, 0, 8],
    ["2026-08-14", 2, 0, 0],
    ["2026-08-14", 3, 0, 0],
    ["2026-08-15", 0, 0, 1],
    ["2026-08-15", 1, 0, 1],
    ["2026-08-15", 2, 0, 0],
    ["2026-08-15", 3, 0, 0],
  ]);
  const result = revenueCat.buildAcquisitionWindow({
    attributedPaymentsChart: payments,
    storeWidePaymentsChart: payments,
    range: { startDate: "2026-08-15", endDate: "2026-08-18" },
  });
  assert.equal(result.totals.payments, 1);
  assert.equal(result.totals.attributedPayments, 1);

  const allTime = revenueCat.buildAcquisitionWindow({
    attributedPaymentsChart: payments,
    storeWidePaymentsChart: payments,
    range: { startDate: "2026-08-14", endDate: "2026-08-18" },
  });
  assert.equal(allTime.totals.payments, 9);
  assert.equal(allTime.totals.attributedPayments, 9);
});

test("RevenueCat first-payment total excludes subscription movements", () => {
  const payments = chart(["Total Paid Subscriptions", "Direct Subscriptions", "Trial Conversions", "Intro Offers", "Product Changes", "Resubscriptions"], [
    ["2026-08-14", 0, 0, 13],
    ["2026-08-14", 1, 0, 9],
    ["2026-08-14", 2, 0, 1],
    ["2026-08-14", 3, 0, 1],
    ["2026-08-14", 4, 0, 1],
    ["2026-08-14", 5, 0, 1],
  ]);
  assert.equal(revenueCat.firstPaymentTotalInRange(payments, { startDate: "2026-08-14", endDate: "2026-08-14" }), 11);
  assert.equal(revenueCat.firstPaymentTotalInRange(payments, { startDate: "2026-08-15", endDate: "2026-08-16" }), 0);
});

test("RevenueCat live option names resolve the campaign and exact app scope", () => {
  const options = {
    segments: [{ id: "attribution_campaign", display_name: "Attribution campaign" }],
    filters: [
      { id: "store", display_name: "Store", options: [{ id: "app_store", display_name: "App Store" }] },
      { id: "app_id", display_name: "App", options: [{ id: "appec71ecec7b", display_name: "Pelvic Floor & Core Coach (App Store)" }] },
    ],
  };
  assert.equal(revenueCat.appleSearchAdsCampaignSegment(options), "attribution_campaign");
  assert.deepEqual(revenueCat.appStoreFilter(options), [
    { name: "store", values: ["app_store"] },
    { name: "app_id", values: ["appec71ecec7b"] },
  ]);
});

test("RevenueCat Overview metrics preserve the dashboard values, periods, and update time", () => {
  const payload = {
    object: "overview_metrics",
    metrics: [
      { id: "active_subscriptions", name: "Active Subscriptions", value: 35, period: "P0D", last_updated_at: 1787288640000 },
      { id: "mrr", name: "MRR", value: 764.52, period: "P0D", last_updated_at: 1787288640000 },
      { id: "new_customers", name: "New Customers", value: 235, period: "P28D", last_updated_at: 1787288640000 },
      { id: "customers_active", name: "Active Customers", value: 389, period: "P28D", last_updated_at: 1787288640000 },
    ],
  };

  assert.equal(revenueCat.overviewMetric(payload, ["active_subscriptions"]).value, 35);
  assert.equal(revenueCat.overviewMetric(payload, ["mrr"]).value, 764.52);
  assert.equal(revenueCat.overviewMetric(payload, ["new_customers"]).period, "P28D");
  assert.equal(revenueCat.overviewMetric(payload, ["active_customers", "customers_active"]).value, 389);
  assert.equal(revenueCat.overviewMetric(payload, ["active_subscriptions"]).lastUpdatedAt, "2026-08-21T05:04:00.000Z");
});

test("RevenueCat ARR fallback preserves the MRR status breakdown", () => {
  assert.equal(revenueCat.monthlyFromAnnual(720), 60);
  assert.equal(revenueCat.monthlyFromAnnual("120"), 10);
  assert.equal(revenueCat.monthlyFromAnnual(null), null);
});

test("RevenueCat range revenue accepts only the authoritative gross revenue metric", () => {
  assert.equal(revenueCat.rangeRevenueValue({
    object: "revenue_metric",
    start_date: "2026-07-25",
    end_date: "2026-08-21",
    currency: "USD",
    value: 746.22,
    revenue_type: "revenue",
  }), 746.22);
  assert.equal(revenueCat.rangeRevenueValue({ value: 600, revenue_type: "proceeds" }), null);
});

test("RevenueCat customer access includes canceled trials and grace periods until expiry", () => {
  const canceledTrial = members.membershipFrom("trial_customer", [{
    id: "sub_trial",
    environment: "production",
    store: "app_store",
    status: "trialing",
    gives_access: true,
    auto_renewal_status: "will_not_renew",
    current_period_ends_at: Date.parse("2026-08-28T00:00:00Z"),
  }]);
  assert.equal(canceledTrial.isActivePremium, true);
  assert.equal(canceledTrial.isRenewing, false);
  assert.equal(canceledTrial.phase, "trial");
  assert.equal(canceledTrial.state, "canceled_with_access");

  const gracePaid = members.membershipFrom("grace_customer", [{
    id: "sub_paid",
    environment: "production",
    store: "app_store",
    status: "in_grace_period",
    gives_access: true,
    auto_renewal_status: "will_renew",
    current_period_ends_at: Date.parse("2026-08-23T00:00:00Z"),
  }]);
  assert.equal(gracePaid.isActivePremium, true);
  assert.equal(gracePaid.isRenewing, true);
  assert.equal(gracePaid.phase, "paid");
  assert.equal(gracePaid.state, "paid");
});

test("Acquisition reconciles store-wide and attributed payments without lowering CPA", () => {
  assert.deepEqual(acquisitionPaymentCounts({
    totalPayments: 8,
    attributedPayments: 4,
  }), {
    totalPayments: 8,
    attributedPayments: 4,
    unattributedPayments: 4,
  });
  assert.deepEqual(acquisitionPaymentCounts({
    totalPayments: null,
    attributedPayments: null,
  }), {
    totalPayments: null,
    attributedPayments: null,
    unattributedPayments: null,
  });
});

test("Acquisition hides blended cost when Apple omits a paid historical campaign", () => {
  const partial = paymentCampaignSpendCoverage([
    { id: "1", name: "Current campaign" },
  ], [
    { campaignId: "1", campaignName: "Current campaign", payments: 2 },
    { campaignId: "2", campaignName: "Deleted historical campaign", payments: 5 },
    { unidentified: true, campaignName: "Campaign not identified", payments: 1 },
    { campaignId: "3", campaignName: "No paid outcome", payments: 0 },
  ]);
  assert.equal(partial.complete, false);
  assert.equal(partial.matchedPayments, 2);
  assert.equal(partial.unmatchedPayments, 6);
  assert.deepEqual(partial.unmatchedCampaigns.map((row) => row.payments), [5, 1]);

  assert.equal(paymentCampaignSpendCoverage([
    { id: "1", name: "Current campaign" },
  ], [
    { campaignId: "1", campaignName: "Current campaign", payments: 2 },
    { campaignId: "2", campaignName: "Old campaign", payments: 0 },
  ]).complete, true);
});

test("Acquisition totals use only authoritative daily chart dates covered by RevenueCat", () => {
  const series = [
    { date: "2026-08-14", value: 7 },
    { date: "2026-08-15", value: 2 },
    { date: "2026-08-16", value: 1 },
    { date: "2026-08-17", value: 0 },
  ];
  const scope = { startDate: "2026-08-14", endDate: "2026-08-17" };
  assert.equal(sumCoveredDailySeries(series, scope, { startDate: "2024-01-01", endDate: "2026-08-17" }, { notBefore: "2026-08-15" }), 3);
  assert.equal(sumCoveredDailySeries(series, scope, { startDate: "2026-08-13", endDate: "2026-08-17" }), null);
  assert.equal(sumCoveredDailySeries(series, scope, { startDate: "2026-08-17", endDate: "2026-08-17" }), 0);
});

test("Keyword attribution keeps exact payment terms on the correct campaign", () => {
  const groups = buildPaymentKeywordGroups([
    { campaignId: "42", campaignName: "Category Exact", keyword: "pelvic floor exercises" },
    { campaignId: "42", campaignName: "Category Exact", keyword: "pelvic floor exercises" },
    { campaignId: "42", campaignName: "Category Exact", keyword: "kegel app" },
    { campaignId: "99", campaignName: "Discovery", keyword: "" },
  ]);
  const exact = keywordsForCampaign(groups, { id: "42", name: "Category Exact" });
  assert.deepEqual(exact.keywords, [
    { keyword: "pelvic floor exercises", payments: 2 },
    { keyword: "kegel app", payments: 1 },
  ]);
  assert.equal(exact.unreported, 0);
  assert.equal(keywordsForCampaign(groups, { id: "99", name: "Discovery" }).unreported, 1);
});

test("Coach inbox puts unanswered member questions first and keeps the full thread", () => {
  const rows = [
    { id: "a", memberId: "member-a", role: "mia", source: "ai", text: "Earlier answer", date: "2026-08-20T10:00:00.000Z" },
    { id: "b", memberId: "member-a", role: "user", source: "", text: "First question", date: "2026-08-21T10:00:00.000Z" },
    { id: "c", memberId: "member-a", role: "user", source: "", text: "Follow-up", date: "2026-08-21T10:01:00.000Z" },
    { id: "d", memberId: "member-b", role: "user", source: "", text: "Answered question", date: "2026-08-21T11:00:00.000Z" },
    { id: "e", memberId: "member-b", role: "mia", source: "admin", text: "Owner answer", date: "2026-08-21T11:01:00.000Z" },
  ];
  const result = groupCoachConversations(rows);
  assert.equal(result.summary.needsReply, 1);
  assert.equal(result.summary.unansweredMessages, 2);
  assert.equal(result.conversations[0].memberId, "member-a");
  assert.equal(result.conversations[0].needsReply, true);
  assert.equal(result.conversations[0].unansweredCount, 2);
  assert.deepEqual(result.conversations[0].messages.map((row) => row.id), ["a", "b", "c"]);
  assert.equal(result.conversations[1].needsReply, false);
});

test("Coach inbox decodes Firestore timestamps and preserves admin reply source", () => {
  const row = decodeCoachDocument({
    name: "projects/p/databases/(default)/documents/users/member-1/chat/mia_reply-1",
    updateTime: "2026-08-21T14:01:00.000Z",
    fields: {
      role: { stringValue: "mia" },
      source: { stringValue: "admin" },
      text: { stringValue: "A personal answer" },
      date: { timestampValue: "2026-08-21T14:00:00.000Z" },
    },
  });
  assert.deepEqual(row, {
    id: "mia_reply-1",
    memberId: "member-1",
    role: "mia",
    source: "admin",
    text: "A personal answer",
    date: "2026-08-21T14:00:00.000Z",
  });
});

test("Coach inbox can create the first message for any valid member", () => {
  const prepared = buildCoachReply({
    memberId: "member-with-no-chat",
    text: "  A first private reply.  ",
    requestId: "request_12345678",
  }, "2026-08-21T18:00:00.000Z");

  assert.equal(prepared.path, "users/member-with-no-chat/chat/mia_request_12345678");
  assert.deepEqual(prepared.message, {
    id: "mia_request_12345678",
    memberId: "member-with-no-chat",
    role: "mia",
    source: "admin",
    text: "A first private reply.",
    date: "2026-08-21T18:00:00.000Z",
  });
  assert.deepEqual(prepared.fields, {
    role: { stringValue: "mia" },
    source: { stringValue: "admin" },
    text: { stringValue: "A first private reply." },
    date: { timestampValue: "2026-08-21T18:00:00.000Z" },
  });
});
