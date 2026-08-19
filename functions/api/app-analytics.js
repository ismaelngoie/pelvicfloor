import {
  bearerToken,
  b64url,
  checkIdToken,
  encode,
  firebaseProjectId,
  ipRateLimited,
  json,
  originAllowed,
  readJson,
} from "../../functions-lib/stripeSync.js";

const ADMIN_EMAIL = "ismael@ngoie.com";
const APPLE_API = "https://api.searchads.apple.com/api/v5";
const PELVIC_FLOOR_ADAM_ID = "6642654729";
const APPLE_CHUNK_DAYS = 90;
const APPLE_HISTORY_DAYS = 732;

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json(403, { error: "This request did not come from pelvi.health." });
  if (ipRateLimited(request, { max: 40 })) return json(429, { error: "Wait a minute and try again." });

  const caller = await checkIdToken(bearerToken(request), firebaseProjectId(env));
  if (!caller.ok || caller.emailVerified !== true || caller.email !== ADMIN_EMAIL) {
    return json(403, { error: "Sign in with the Pelvi owner account." });
  }

  const missing = [
    "APPLE_ADS_CLIENT_ID",
    "APPLE_ADS_TEAM_ID",
    "APPLE_ADS_KEY_ID",
    "APPLE_ADS_PRIVATE_KEY",
    "APPLE_ADS_ORG_ID",
  ].filter((name) => !env[name]);
  if (missing.length) {
    return json(503, {
      error: "Apple Ads reporting is ready, but its read-only API credential has not been added to Cloudflare yet.",
      missing,
    });
  }

  const body = await readJson(request, 4096);
  if (!body) return json(400, { error: "Send a valid reporting date range." });
  const dates = reportDates(body.startDate, body.endDate);
  if (!dates.ok) return json(400, { error: dates.error });

  try {
    const access = await appleAccessToken(env);
    const chunks = reportChunks(dates.start, dates.end, APPLE_CHUNK_DAYS);
    const reports = await mapWithConcurrency(chunks, 3, (chunk) => fetchCampaignChunk({
      access,
      orgId: env.APPLE_ADS_ORG_ID,
      start: chunk.start,
      end: chunk.end,
    }));
    const mergedCampaigns = mergeCampaignReports(reports);
    const appIds = [...new Set(mergedCampaigns.map((campaign) => campaign.appId).filter(Boolean))];
    const appFilterApplied = appIds.length > 0;
    const campaigns = appFilterApplied
      ? mergedCampaigns.filter((campaign) => campaign.appId === PELVIC_FLOOR_ADAM_ID)
      : mergedCampaigns;
    const currencies = [...new Set(campaigns.map((row) => row.currency).filter(Boolean))];
    const currency = currencies.length === 1 ? currencies[0] : null;
    const totals = campaigns.reduce((sum, row) => ({
      impressions: sum.impressions + row.impressions,
      taps: sum.taps + row.taps,
      totalInstalls: sum.totalInstalls + row.installs,
      newDownloads: sum.newDownloads + row.newDownloads,
      redownloads: sum.redownloads + row.redownloads,
      spend: sum.spend + row.spend,
    }), { impressions: 0, taps: 0, totalInstalls: 0, newDownloads: 0, redownloads: 0, spend: 0 });
    totals.currency = currency;

    return json(200, {
      source: "Apple Ads Campaign Management API 5",
      fetchedAt: Date.now(),
      range: { startDate: dates.start, endDate: dates.end },
      app: {
        adamId: PELVIC_FLOOR_ADAM_ID,
        filterApplied: appFilterApplied,
        ...(appFilterApplied ? {} : { warning: "Apple did not return app metadata, so the report could not verify its app scope." }),
      },
      chunks: chunks.length,
      currency,
      totals,
      campaigns,
    });
  } catch (error) {
    console.error("Apple Ads analytics failed", { message: error?.message || "unknown" });
    return json(502, { error: "Apple Ads reporting could not be reached. Try again shortly." });
  }
}

async function fetchCampaignChunk({ access, orgId, start, end }) {
  const response = await fetch(`${APPLE_API}/reports/campaigns`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "X-AP-Context": `orgId=${orgId}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startTime: start,
      endTime: end,
      selector: {
        orderBy: [{ field: "campaignId", sortOrder: "ASCENDING" }],
        pagination: { offset: 0, limit: 1000 },
      },
      timeZone: "UTC",
      returnRecordsWithNoMetrics: true,
      returnRowTotals: true,
      returnGrandTotals: true,
    }),
  });
  if (!response.ok) {
    console.error("Apple Ads report chunk failed", { status: response.status, start, end });
    const error = new Error("Apple Ads did not return the campaign report.");
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  const report = payload?.data?.reportingDataResponse || payload?.data || payload?.reportingDataResponse || payload;
  const rows = Array.isArray(report?.row) ? report.row : Array.isArray(report?.rows) ? report.rows : [];
  return rows.map(normalizeCampaign);
}

function normalizeCampaign(row) {
  const metadata = row?.metadata || row?.campaign || {};
  const metrics = row?.total || row?.grandTotals?.total || lastGranularity(row?.granularity) || {};
  return {
    id: String(metadata.campaignId ?? row?.campaignId ?? ""),
    appId: String(metadata?.app?.adamId ?? metadata.adamId ?? row?.adamId ?? ""),
    name: metadata.campaignName || row?.campaignName || "Unnamed campaign",
    status: metadata.campaignStatus || metadata.status || "",
    countries: metadata.countriesOrRegions || [],
    impressions: number(metrics.impressions),
    taps: number(metrics.taps),
    installs: number(metrics.totalInstalls),
    newDownloads: number(metrics.totalNewDownloads),
    redownloads: number(metrics.totalRedownloads),
    spend: money(metrics.localSpend),
    currency: moneyCurrency(metrics.localSpend),
    avgCpt: money(metrics.avgCPT),
    avgCpi: money(metrics.totalAvgCPI),
  };
}

function mergeCampaignReports(reports) {
  const merged = new Map();
  for (const report of reports) {
    for (const campaign of report) {
      const key = campaign.id || `${campaign.appId}:${campaign.name}`;
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { ...campaign, countries: [...new Set(campaign.countries || [])] });
        continue;
      }
      merged.set(key, {
        ...current,
        appId: campaign.appId || current.appId,
        name: campaign.name || current.name,
        status: campaign.status || current.status,
        countries: [...new Set([...(current.countries || []), ...(campaign.countries || [])])],
        impressions: current.impressions + campaign.impressions,
        taps: current.taps + campaign.taps,
        installs: current.installs + campaign.installs,
        newDownloads: current.newDownloads + campaign.newDownloads,
        redownloads: current.redownloads + campaign.redownloads,
        spend: current.spend + campaign.spend,
        currency: campaign.currency || current.currency,
      });
    }
  }
  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function lastGranularity(value) {
  if (!Array.isArray(value) || !value.length) return {};
  return value.reduce((total, row) => ({
    impressions: number(total.impressions) + number(row.impressions),
    taps: number(total.taps) + number(row.taps),
    totalInstalls: number(total.totalInstalls) + number(row.totalInstalls),
    totalNewDownloads: number(total.totalNewDownloads) + number(row.totalNewDownloads),
    totalRedownloads: number(total.totalRedownloads) + number(row.totalRedownloads),
    localSpend: {
      amount: money(total.localSpend) + money(row.localSpend),
      currency: moneyCurrency(row.localSpend) || moneyCurrency(total.localSpend),
    },
  }), {});
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return number(value?.amount ?? value);
}

function moneyCurrency(value) {
  const currency = typeof value?.currency === "string" ? value.currency.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function reportDates(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "")) {
    return { ok: false, error: "Choose a valid reporting date range." };
  }
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = (endDate - startDate) / 86400000;
  if (!Number.isFinite(days) || days < 0 || days > APPLE_HISTORY_DAYS) {
    return { ok: false, error: "Apple Ads history can cover up to the latest 24 months." };
  }
  if (endDate > new Date(`${utcDate(Date.now())}T00:00:00Z`)) {
    return { ok: false, error: "The reporting end date cannot be in the future." };
  }
  return { ok: true, start, end };
}

function reportChunks(start, end, maximumDays) {
  const chunks = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (cursor <= final) {
    // Apple limits one report to 90 calendar dates. Subtract one because both
    // startTime and endTime are inclusive.
    const chunkEnd = new Date(Math.min(final.getTime(), cursor.getTime() + (maximumDays - 1) * 86400000));
    chunks.push({ start: utcDate(cursor.getTime()), end: utcDate(chunkEnd.getTime()) });
    cursor = new Date(chunkEnd.getTime() + 86400000);
  }
  return chunks;
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function utcDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

let cachedAppleToken = null;

async function appleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAppleToken && cachedAppleToken.expiresAt - 60 > now) return cachedAppleToken.value;

  const clientSecret = await appleClientSecret(env, now);
  const response = await fetch("https://appleid.apple.com/auth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.APPLE_ADS_CLIENT_ID,
      client_secret: clientSecret,
      scope: "searchadsorg",
    }).toString(),
  });
  if (!response.ok) throw new Error(`Apple OAuth failed: ${response.status}`);
  const body = await response.json();
  if (!body.access_token) throw new Error("Apple OAuth returned no access token.");
  cachedAppleToken = { value: body.access_token, expiresAt: now + (Number(body.expires_in) || 3600) };
  return cachedAppleToken.value;
}

async function appleClientSecret(env, now) {
  const header = { alg: "ES256", kid: env.APPLE_ADS_KEY_ID, typ: "JWT" };
  const claims = {
    iss: env.APPLE_ADS_TEAM_ID,
    iat: now,
    exp: now + 300,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_ADS_CLIENT_ID,
  };
  const unsigned = `${b64url(encode(JSON.stringify(header)))}.${b64url(encode(JSON.stringify(claims)))}`;
  const key = await importAppleKey(env.APPLE_ADS_PRIVATE_KEY);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encode(unsigned));
  return `${unsigned}.${b64url(new Uint8Array(signature))}`;
}

async function importAppleKey(pem) {
  const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  const base64 = normalized.replace(/-----BEGIN [A-Z ]+-----/, "").replace(/-----END [A-Z ]+-----/, "").replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return crypto.subtle.importKey("pkcs8", bytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

export const __test = {
  mergeCampaignReports,
  reportChunks,
  reportDates,
};
