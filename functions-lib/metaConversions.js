import {
  accessToken, parseServiceAccount, patchDocument, projectIdFrom, typedValue,
} from "./stripeSync.js";
import { createMarketingConsentRegistry, validConsentId } from "./marketingConsentRegistry.js";
import { automaticMeasurementEligible } from "./marketingPolicy.js";

export const META_CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const META_SOURCE_URL = "https://pelvi.health/";
const GRAPH_VERSION = "v26.0";
const clean = (value, max) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
const optedOut = (value) => value === true || value === 1 || value === "1" || value === "yes";
const idOf = (value) => typeof value === "string" ? value : value?.id || "";
const validConsentTime = (value, now) => Number.isFinite(value) && value > 0 && value <= now + 300000 && now - value <= META_CONSENT_MAX_AGE_MS;
const validFbp = (value) => /^fb\.\d\.\d{10,16}\.\d{1,80}$/.test(value);
const validFbc = (value) => /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_-]{1,200}$/.test(value);
function validIp(value) {
  if (/^[0-9a-f:]+$/i.test(value) && value.includes(":")) return value.length <= 45;
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Persist only permitted measurement, keeping automatic defaults distinct from
 * a visitor's explicit choice. The legacy meta_consent flag is an enable bit. */
export function buildMetaAttribution(marketing, request, { now = Date.now() } = {}) {
  if (marketing?.v !== 1 || !validConsentId(marketing.consentId) || marketing.advertising !== true || !validConsentTime(marketing.decidedAt, now)
    || request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1"
    || [marketing.gpc, marketing.globalPrivacyControl, marketing.doNotTrack, marketing.dnt].some(optedOut)
    || (marketing.basis !== undefined && !["automatic", "explicit"].includes(marketing.basis))
    || (marketing.basis === "automatic" && !automaticMeasurementEligible(request))) return {};
  const metadata = { meta_consent: "1", meta_consent_id: marketing.consentId.toLowerCase(), meta_consent_at: String(marketing.decidedAt) };
  if (marketing.basis) metadata.meta_basis = marketing.basis;
  if (marketing.matching === true && marketing.basis !== "automatic") metadata.meta_email_match = "1";
  const fbp = clean(marketing.fbp, 255), fbc = clean(marketing.fbc, 255);
  if (validFbp(fbp)) metadata.meta_fbp = fbp;
  if (validFbc(fbc)) metadata.meta_fbc = fbc;
  const ip = clean(request.headers.get("CF-Connecting-IP"), 45);
  const userAgent = clean(request.headers.get("User-Agent"), 400);
  if (validIp(ip)) metadata.meta_client_ip = ip;
  if (userAgent) metadata.meta_user_agent = userAgent;
  return metadata;
}

export async function metaPurchaseEventId(invoiceId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(invoiceId));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `pelvi_purchase_${hex}`;
}

export function metaTrackingState(env, { hasLedger = false } = {}) {
  if (env.META_TRACKING_ENABLED !== "true") return "disabled";
  if (!/^\d{5,30}$/.test(String(env.META_DATASET_ID || "")) || !env.META_CONVERSIONS_ACCESS_TOKEN
    || (!hasLedger && !env.FIREBASE_SERVICE_ACCOUNT)) return "not_configured";
  return "enabled";
}

// The collection is server-only under Firestore's existing deny-by-default
// rules. It contains delivery receipts, not emails, payment secrets or profiles.
export async function createFirestoreMetaLedger(env, fetcher = fetch) {
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = projectIdFrom(env, account);
  const token = await accessToken(account);
  const collection = "metaConversionReceipts";
  return {
    async has(eventId) {
      const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${collection}/${encodeURIComponent(eventId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) return false;
      if (!response.ok) throw new Error("meta_ledger_unavailable");
      const record = await response.json();
      return record.fields?.sent?.booleanValue === true;
    },
    async markSent(eventId, details) {
      const fields = { sent: typedValue(true), sentAt: typedValue(details.sentAt), value: typedValue(details.value), currency: typedValue(details.currency) };
      await patchDocument({ projectId, token, path: `${collection}/${eventId}`, fields, updateMask: Object.keys(fields) });
    },
  };
}

function majorAmount(amount, currency) {
  // Stripe treats ISK and UGX as two-decimal currencies for API amounts even
  // though their display format uses whole currency units.
  const special = ["ISK", "UGX"].includes(currency);
  const digits = special ? 2 : new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return amount / (10 ** digits);
}

/** Every settled membership charge has a unique invoice event, subject to the
 * current server-side consent decision, including later withdrawals. */
export async function reportMetaInvoicePurchase({ stripe, invoiceId, env, ledger, registry, fetcher = fetch, now = Date.now(), emailMatchingAllowed = true }) {
  const state = metaTrackingState(env, { hasLedger: Boolean(ledger) });
  if (state !== "enabled") return { sent: false, status: state };
  if (!/^in_[A-Za-z0-9]+$/.test(invoiceId || "")) return { sent: false, status: "ignored" };
  const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["payment_intent.latest_charge", "subscription", "customer"] });
  if (invoice.id !== invoiceId || invoice.livemode !== true || invoice.status !== "paid" || invoice.paid !== true
    || !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason) || !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid <= 0
    || !/^[a-z]{3}$/i.test(invoice.currency || "") || !idOf(invoice.subscription)) return { sent: false, status: "ignored" };

  const paymentId = idOf(invoice.payment_intent);
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentId)) return { sent: false, status: "ignored" };
  const payment = typeof invoice.payment_intent === "object" ? invoice.payment_intent : await stripe.paymentIntents.retrieve(paymentId);
  if (payment?.status !== "succeeded" || payment.livemode !== true || idOf(payment.invoice) !== invoice.id
    || (idOf(payment.customer) && idOf(payment.customer) !== idOf(invoice.customer))) return { sent: false, status: "ignored" };
  const charge = typeof payment.latest_charge === "object" ? payment.latest_charge
    : payment.latest_charge ? await stripe.charges.retrieve(payment.latest_charge) : null;
  if (!charge || charge.refunded === true || Number(charge.amount_refunded) > 0) return { sent: false, status: "ignored" };
  const subscription = typeof invoice.subscription === "object" ? invoice.subscription : await stripe.subscriptions.retrieve(invoice.subscription);
  const metadata = subscription?.metadata || {};
  const consentAt = Number(metadata.meta_consent_at);
  if (metadata.source !== "web" || metadata.meta_consent !== "1"
    || (metadata.meta_basis !== undefined && !["automatic", "explicit"].includes(metadata.meta_basis))
    || !validConsentId(metadata.meta_consent_id) || !Number.isFinite(consentAt) || consentAt <= 0 || consentAt > now + 300000) return { sent: false, status: "no_consent" };
  const consentStore = registry || await createMarketingConsentRegistry(env);
  const currentConsent = await consentStore.get(metadata.meta_consent_id);
  if (!currentConsent || currentConsent.decidedAt < consentAt) return { sent: false, status: "pending_consent" };
  if (currentConsent.advertising !== true
    || !validConsentTime(currentConsent.decidedAt, now)) return { sent: false, status: "no_consent" };

  const paidAt = Number(invoice.status_transitions?.paid_at);
  if (!Number.isFinite(paidAt) || paidAt <= 0 || paidAt * 1000 > now + 300000 || now - paidAt * 1000 > 7 * 86400000) {
    return { sent: false, status: "expired" };
  }
  const eventId = await metaPurchaseEventId(invoice.id);
  const currency = invoice.currency.toUpperCase();
  const value = majorAmount(invoice.amount_paid, currency);
  const receipt = { eventId, value, currency };
  const store = ledger || await createFirestoreMetaLedger(env);
  if (await store.has(eventId)) return { sent: true, status: "duplicate", ...receipt };

  const userData = {};
  if (validFbp(metadata.meta_fbp || "")) userData.fbp = metadata.meta_fbp;
  if (validFbc(metadata.meta_fbc || "")) userData.fbc = metadata.meta_fbc;
  if (validIp(metadata.meta_client_ip || "")) userData.client_ip_address = metadata.meta_client_ip;
  const userAgent = clean(metadata.meta_user_agent, 400);
  if (userAgent) userData.client_user_agent = userAgent;
  if (emailMatchingAllowed && metadata.meta_basis !== "automatic" && currentConsent.basis !== "automatic"
    && currentConsent.matching === true && env.META_EMAIL_MATCHING_ENABLED === "true" && metadata.meta_email_match === "1") {
    const customer = typeof invoice.customer === "object" ? invoice.customer : await stripe.customers.retrieve(invoice.customer);
    const email = clean(customer?.email, 254).toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
      userData.em = [Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")];
    }
  }
  if (!Object.keys(userData).length) return { sent: false, status: "no_matching_data" };
  const event = {
    event_name: "Purchase", event_time: Math.floor(paidAt), event_id: eventId,
    action_source: "website", event_source_url: META_SOURCE_URL,
    user_data: userData, custom_data: { value, currency },
  };
  const apiVersion = /^v\d+\.\d+$/.test(env.META_GRAPH_API_VERSION || "") ? env.META_GRAPH_API_VERSION : GRAPH_VERSION;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(`https://graph.facebook.com/${apiVersion}/${env.META_DATASET_ID}/events`, {
      method: "POST", headers: { Authorization: `Bearer ${env.META_CONVERSIONS_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }), signal: controller.signal,
    });
    const answer = await response.json().catch(() => null);
    if (!response.ok || answer?.error || Number(answer?.events_received) !== 1) throw new Error("meta_delivery_failed");
    // Mark only after Meta acknowledges receipt. Concurrent delivery shares the
    // same event ID at Meta; this durable record also covers later replays.
    await store.markSent(eventId, { sentAt: new Date(now).toISOString(), value, currency });
    return { sent: true, status: "sent", ...receipt };
  } finally { clearTimeout(timeout); }
}
