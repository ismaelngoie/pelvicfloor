import {
  bearerToken,
  checkIdToken,
  firebaseProjectId,
  ipRateLimited,
  json,
  originAllowed,
  readJson,
} from "../../functions-lib/stripeSync.js";

// RevenueCat answers two different questions here:
//
//  1. The Subscription Status chart is the authoritative business headline.
//     It covers every historical customer in RevenueCat and, unlike customer
//     lists, correctly separates "Set to renew" from canceled-but-unexpired.
//  2. The subscriptions endpoint verifies individual Firestore profiles so
//     support can see which synced app users belong in Active Members.
//
// We never crawl the project's thousands of RevenueCat customers. The browser
// sends at most 30 Firestore document ids per request; 30 subscription reads +
// chart calls stay below Cloudflare's per-request subrequest ceiling.
const ADMIN_EMAIL = "ismael@ngoie.com";
const REVENUECAT_API = "https://api.revenuecat.com";
const CACHE_MS = 90 * 1000;
const MAX_CUSTOMERS = 30;
const RENEWING = new Set(["will_renew", "will_change_product", "has_already_renewed"]);
const APPLE_STORES = new Set(["app_store"]);

const reportCache = new Map();
let projectCache = null;

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json(403, { error: "This request did not come from pelvi.health." });
  if (ipRateLimited(request, { max: 40 })) return json(429, { error: "Wait a minute and try again." });

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
      error: "RevenueCat membership is ready, but its read-only v2 API key has not been added to Cloudflare yet.",
      missing: ["REVENUECAT_V2_API_KEY"],
    });
  }

  const body = await readJson(request, 32768);
  if (!body) return json(400, { error: "Send a valid membership request." });
  const customerIds = uniqueStrings(body.customerIds).slice(0, MAX_CUSTOMERS);
  const includeHeadline = body.includeHeadline === true;
  if (!customerIds.length && !includeHeadline) return json(400, { error: "No app member ids were supplied." });

  try {
    const configuredProjectId = first(env, ["REVENUECAT_PROJECT_ID"]);
    const projectId = configuredProjectId || (await discoverProjectId(apiKey, env.REVENUECAT_PROJECT_NAME));
    const cacheKey = `${projectId}:${includeHeadline ? "headline" : "rows"}:${customerIds.join("|")}`;
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < CACHE_MS) return json(200, { ...cached.value, cache: "hit" });

    const headlinePromise = includeHeadline ? fetchRenewingHeadline(apiKey, projectId) : Promise.resolve(null);
    const inspected = [];
    for (let index = 0; index < customerIds.length; index += 6) {
      const group = customerIds.slice(index, index + 6);
      const rows = await Promise.all(group.map(async (customerId) => {
        const subscriptions = await listAll(
          apiKey,
          `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}/subscriptions?environment=production&limit=100`,
          { allowNotFound: true }
        );
        return membershipFrom(customerId, subscriptions);
      }));
      inspected.push(...rows);
    }

    const headline = await headlinePromise;
    const active = inspected.filter((customer) => customer.isActivePremium);
    const value = {
      source: "RevenueCat API v2",
      definition: "Production App Store trial or paid subscription that gives access and is set to renew",
      fetchedAt: Date.now(),
      projectId,
      headline,
      customers: inspected,
      batchTotals: {
        profilesChecked: inspected.length,
        activePremium: active.length,
        paid: active.filter((customer) => customer.phase === "paid").length,
        trials: active.filter((customer) => customer.phase === "trial").length,
        canceledWithAccess: inspected.filter((customer) => customer.state === "canceled_with_access").length,
      },
    };
    reportCache.set(cacheKey, { savedAt: Date.now(), value });
    return json(200, { ...value, cache: "miss" });
  } catch (error) {
    console.error("RevenueCat membership report failed", { message: error?.message || "unknown", status: error?.status || null });
    if (error?.status === 401 || error?.status === 403) {
      return json(503, {
        error: "RevenueCat refused the API key. Use a v2 secret key with read access to projects, charts, customers, and subscriptions.",
      });
    }
    if (error?.code === "ambiguous_project") {
      return json(503, {
        error: "RevenueCat has more than one possible project. Add the exact RevenueCat project id as REVENUECAT_PROJECT_ID in Cloudflare.",
      });
    }
    if (error?.code === "invalid_chart") {
      return json(502, { error: "RevenueCat returned a Subscription Status chart that could not be read safely." });
    }
    return json(502, { error: "RevenueCat membership could not be reached. Try again shortly." });
  }
}

async function fetchRenewingHeadline(apiKey, projectId) {
  const base = `/v2/projects/${encodeURIComponent(projectId)}/charts/subscription_status`;
  const options = await revenueCatGet(apiKey, `${base}/options?realtime=true`);
  const selector = subscriptionMeasureSelector(options);
  const filters = JSON.stringify([{ name: "store", values: ["app_store"] }]);
  const fetchMeasure = (measure) => revenueCatGet(
    apiKey,
    `${base}?filters=${encodeURIComponent(filters)}&selectors=${encodeURIComponent(JSON.stringify({ [selector.name]: measure }))}`
  );
  const [paidChart, trialChart] = await Promise.all([
    fetchMeasure(selector.paid),
    fetchMeasure(selector.trials),
  ]);
  const paid = setToRenewValue(paidChart);
  const trials = setToRenewValue(trialChart);
  return {
    activePremium: paid + trials,
    paid,
    trials,
    lastComputedAt: epochIso(Math.max(Number(paidChart?.last_computed_at) || 0, Number(trialChart?.last_computed_at) || 0)),
  };
}

function subscriptionMeasureSelector(options) {
  const selectors = options?.user_selectors && typeof options.user_selectors === "object" ? options.user_selectors : {};
  for (const [name, selector] of Object.entries(selectors)) {
    const choices = Array.isArray(selector?.options) ? selector.options : [];
    const paid = choices.find((choice) => choice?.id === "active_subscriptions")
      || choices.find((choice) => /paying|active subscriptions/i.test(String(choice?.display_name || "")));
    const trials = choices.find((choice) => choice?.id === "active_trials")
      || choices.find((choice) => /active trials|trials/i.test(String(choice?.display_name || "")));
    if (paid?.id && trials?.id) return { name, paid: paid.id, trials: trials.id };
  }
  const error = new Error("Subscription Status selectors were not recognized.");
  error.code = "invalid_chart";
  throw error;
}

function setToRenewValue(chart) {
  const values = Array.isArray(chart?.values) ? chart.values : [];
  const metadata = [chart?.measures, chart?.segments, chart?.periods].find(Array.isArray) || [];
  const metadataIndex = metadata.findIndex((item) => /set to renew/i.test(String(item?.display_name || item?.name || "")));
  const measure = metadataIndex >= 0 ? metadataIndex : 1;

  // The live Subscription Status response is an object list where `measure`
  // indexes the chart metadata. RevenueCat currently reports Set to renew as
  // measure 1; metadata wins whenever it is present so this remains resilient
  // if the project schema changes.
  const entry = values.find((value) => value && !Array.isArray(value) && Number(value.measure) === measure);
  const number = Number(entry?.value);
  if (Number.isFinite(number) && number >= 0) return Math.round(number);

  const error = new Error("Set to renew was missing from the chart.");
  error.code = "invalid_chart";
  throw error;
}

function membershipFrom(customerId, subscriptions) {
  const appStore = subscriptions.filter((subscription) =>
    subscription?.environment === "production" && APPLE_STORES.has(subscription?.store)
  );
  const accessible = appStore.filter((subscription) =>
    subscription?.gives_access === true && (subscription?.status === "trialing" || subscription?.status === "active")
  );
  const renewing = accessible.filter((subscription) => RENEWING.has(subscription?.auto_renewal_status));
  const chosen = newest(renewing) || newest(accessible) || newest(appStore);
  const isActivePremium = renewing.length > 0;
  const phase = isActivePremium && renewing.some((subscription) => subscription.status === "trialing")
    ? "trial"
    : isActivePremium ? "paid" : "inactive";
  const state = isActivePremium ? phase : accessible.length ? "canceled_with_access" : "inactive";
  const identityIds = new Set([customerId]);
  for (const subscription of appStore) {
    if (subscription?.customer_id) identityIds.add(subscription.customer_id);
    if (subscription?.original_customer_id) identityIds.add(subscription.original_customer_id);
  }
  return {
    id: customerId,
    identityIds: [...identityIds].filter(Boolean),
    isActivePremium,
    phase,
    state,
    subscription: chosen ? {
      id: String(chosen.id || ""),
      productId: String(chosen.product_id || ""),
      status: String(chosen.status || ""),
      autoRenewalStatus: String(chosen.auto_renewal_status || ""),
      startsAt: epochIso(chosen.starts_at),
      currentPeriodEndsAt: epochIso(chosen.current_period_ends_at),
      endsAt: epochIso(chosen.ends_at),
      store: String(chosen.store || ""),
      ownership: String(chosen.ownership || ""),
    } : null,
  };
}

function first(env, names) {
  for (const name of names) {
    const value = typeof env?.[name] === "string" ? env[name].trim() : "";
    if (value) return value;
  }
  return "";
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))];
}

async function discoverProjectId(apiKey, configuredName) {
  if (projectCache && Date.now() - projectCache.savedAt < 10 * 60 * 1000) return projectCache.id;
  const projects = await listAll(apiKey, "/v2/projects?limit=100");
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

async function listAll(apiKey, firstPath, { allowNotFound = false } = {}) {
  const items = [];
  let path = firstPath;
  let pages = 0;
  while (path && pages < 20) {
    const payload = await revenueCatGet(apiKey, path, { allowNotFound });
    if (payload === null) return [];
    if (Array.isArray(payload?.items)) items.push(...payload.items);
    path = safePath(payload?.next_page);
    pages += 1;
  }
  if (path) throw new Error("RevenueCat pagination exceeded the safety limit.");
  return items;
}

async function revenueCatGet(apiKey, path, { allowNotFound = false } = {}) {
  const safe = safePath(path);
  if (!safe) throw new Error("RevenueCat returned an invalid path.");
  const response = await fetch(`${REVENUECAT_API}${safe}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`RevenueCat request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function safePath(value) {
  return typeof value === "string" && value.startsWith("/v2/") ? value : null;
}

function newest(subscriptions) {
  return [...subscriptions].sort((a, b) => Number(b?.ends_at || b?.current_period_ends_at || 0) - Number(a?.ends_at || a?.current_period_ends_at || 0))[0] || null;
}

function epochIso(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  // Chart timestamps are seconds; customer/subscription timestamps are ms.
  const milliseconds = number < 1e11 ? number * 1000 : number;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
