import assert from "node:assert/strict";
import test from "node:test";
import { __test as apple } from "../functions/api/app-analytics.js";
import { __test as revenueCat } from "../functions/api/revenuecat-owner-metrics.js";

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

test("RevenueCat campaign totals include direct first payments without trials", () => {
  const trials = chart(["New Trials"], [
    ["2026-08-15", 0, 0, 2],
    ["2026-08-16", 0, 1, 1],
  ]);
  const firstPaid = chart(
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
  const conversion = chart(["Trial Starts", "Conversions", "Pending"], [
    ["2026-08-15", 0, 0, 2],
    ["2026-08-15", 1, 0, 1],
    ["2026-08-15", 2, 0, 1],
  ]);
  const result = revenueCat.buildAcquisitionWindow({
    trialsChart: trials,
    firstPaidChart: firstPaid,
    conversionChart: conversion,
    range: { startDate: "2026-08-15", endDate: "2026-08-18" },
  });

  assert.equal(result.available, true);
  assert.equal(result.totals.trialStarts, 3);
  assert.equal(result.totals.firstPaid, 4);
  assert.equal(result.totals.productChanges, 1);
  assert.equal(result.totals.resubscriptions, 1);
  assert.equal(result.totals.directFirstPaid, 3);
  assert.equal(result.totals.trialConversions, 1);
  assert.equal(result.totals.trialToPaidRate, 0.5);
  const discover = result.campaigns.find((row) => row.campaignId === "123456");
  assert.equal(discover.firstPaid, 3);
  assert.equal(discover.allNewPaidSubscriptions, 5);
  assert.equal(discover.directFirstPaid, 2);
  assert.equal(discover.trialConversions, 1);
  assert.equal(discover.trialToPaidRate, 0.5);
  assert.equal(result.campaigns.find((row) => row.unidentified).firstPaid, 1);
});

test("RevenueCat selected dates exclude earlier campaign outcomes", () => {
  const result = revenueCat.buildAcquisitionWindow({
    trialsChart: chart(["New Trials"], [
      ["2026-08-14", 0, 0, 9],
      ["2026-08-15", 0, 0, 2],
    ]),
    firstPaidChart: chart(["Total Paid Subscriptions", "Direct Subscriptions", "Trial Conversions", "Intro Offers"], [
      ["2026-08-14", 0, 0, 8],
      ["2026-08-14", 1, 0, 8],
      ["2026-08-14", 2, 0, 0],
      ["2026-08-14", 3, 0, 0],
      ["2026-08-15", 0, 0, 1],
      ["2026-08-15", 1, 0, 1],
      ["2026-08-15", 2, 0, 0],
      ["2026-08-15", 3, 0, 0],
    ]),
    conversionChart: null,
    range: { startDate: "2026-08-15", endDate: "2026-08-18" },
  });
  assert.equal(result.totals.trialStarts, 2);
  assert.equal(result.totals.firstPaid, 1);
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
