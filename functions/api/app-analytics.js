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
    const response = await fetch(`${APPLE_API}/reports/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "X-AP-Context": `orgId=${env.APPLE_ADS_ORG_ID}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startTime: dates.start,
        endTime: dates.end,
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
      console.error("Apple Ads report failed", { status: response.status });
      return json(502, { error: "Apple Ads did not return the campaign report. Check the read-only API user and organization id." });
    }

    const payload = await response.json();
    const report = payload?.data?.reportingDataResponse || payload?.data || payload?.reportingDataResponse || payload;
    const rows = Array.isArray(report?.row) ? report.row : Array.isArray(report?.rows) ? report.rows : [];
    const campaigns = rows.map(normalizeCampaign);
    const totals = campaigns.reduce((sum, row) => ({
      impressions: sum.impressions + row.impressions,
      taps: sum.taps + row.taps,
      totalInstalls: sum.totalInstalls + row.installs,
      spend: sum.spend + row.spend,
    }), { impressions: 0, taps: 0, totalInstalls: 0, spend: 0 });

    return json(200, {
      source: "Apple Ads Campaign Management API 5",
      fetchedAt: Date.now(),
      range: { startDate: dates.start, endDate: dates.end },
      totals,
      campaigns,
    });
  } catch (error) {
    console.error("Apple Ads analytics failed", { message: error?.message || "unknown" });
    return json(502, { error: "Apple Ads reporting could not be reached. Try again shortly." });
  }
}

function normalizeCampaign(row) {
  const metadata = row?.metadata || row?.campaign || {};
  const metrics = row?.total || row?.grandTotals?.total || lastGranularity(row?.granularity) || {};
  return {
    id: String(metadata.campaignId ?? row?.campaignId ?? ""),
    name: metadata.campaignName || row?.campaignName || "Unnamed campaign",
    status: metadata.campaignStatus || metadata.status || "",
    countries: metadata.countriesOrRegions || [],
    impressions: number(metrics.impressions),
    taps: number(metrics.taps),
    installs: number(metrics.totalInstalls),
    newDownloads: number(metrics.totalNewDownloads),
    redownloads: number(metrics.totalRedownloads),
    spend: money(metrics.localSpend),
    avgCpt: money(metrics.avgCPT),
    avgCpi: money(metrics.totalAvgCPI),
  };
}

function lastGranularity(value) {
  if (!Array.isArray(value) || !value.length) return {};
  return value.reduce((total, row) => ({
    impressions: number(total.impressions) + number(row.impressions),
    taps: number(total.taps) + number(row.taps),
    totalInstalls: number(total.totalInstalls) + number(row.totalInstalls),
    totalNewDownloads: number(total.totalNewDownloads) + number(row.totalNewDownloads),
    totalRedownloads: number(total.totalRedownloads) + number(row.totalRedownloads),
    localSpend: { amount: money(total.localSpend) + money(row.localSpend) },
  }), {});
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return number(value?.amount ?? value);
}

function reportDates(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "")) {
    return { ok: false, error: "Choose a valid reporting date range." };
  }
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = (endDate - startDate) / 86400000;
  if (!Number.isFinite(days) || days < 0 || days > 90) return { ok: false, error: "Apple Ads reports can cover up to 90 days at a time." };
  return { ok: true, start, end };
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
