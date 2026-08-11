"use client";

// Every email address the business has captured, in one list.
//
// TWO HALVES OF ONE PICTURE, AND NEITHER IS ENOUGH ON ITS OWN.
//
//   * STRIPE knows everybody who opened the checkout sheet and typed an
//     address, because /api/create-payment-intent creates the customer BEFORE
//     it takes a card. That includes every woman who got cold feet at the card
//     field, which is the list nobody could see until now. It does not know
//     about anybody who bought on the App Store, and it does not know about a
//     member who signed in without ever paying us through the web.
//
//   * FIRESTORE knows the members. It does not know who is paying, because the
//     Stripe webhook was retired and nothing mirrors a subscription back (see
//     lib/adminMetrics.js). A member record on its own cannot tell you whether
//     the woman it describes ever gave us money.
//
// So the two are merged here, keyed on the lowercased email address, which is
// the only join key that exists (the same key the privacy policy names in its
// "If you also use the iPhone app" section).
//
// NOTHING IN THIS FILE GUESSES. Where a status cannot be established the row
// says which half of the picture it came from and the screen prints that in
// words. The one number the owner will act on — the checkout-to-paid rate —
// is deliberately computed from STRIPE EVIDENCE ONLY, never from the merged
// verdict, so an App Store purchase can never be counted as a web checkout
// that converted and flatter the ad spend.

import { RANGES, isPayingEntitlement, rangeById, toDate } from "./adminMetrics";

/* -------------------------------------------------------------------------
   Reading Stripe. The only network call in this file.
   ------------------------------------------------------------------------- */

// Deliberately not in lib/adminData.js. That file is the one place /admin talks
// to FIRESTORE, through the Firebase SDK and under firestore.rules. This is a
// different backend behind a different gate: our own Worker, which verifies a
// Firebase ID token server-side and checks it against one address. Mixing them
// would blur which rule protects which read.

/**
 * The Stripe half of the list.
 *
 * @param {object} user A signed-in Firebase user. Its ID token is the only
 *   credential sent; the Stripe key never leaves the Worker.
 */
export async function fetchStripeAudience(user) {
  if (!user || typeof user.getIdToken !== "function") {
    throw new Error("Sign in again, then reopen this tab.");
  }
  const token = await user.getIdToken();

  const response = await fetch("/api/audience", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error || "Stripe did not answer. Press Count again in a minute."
    );
    error.status = response.status;
    throw error;
  }

  const pageSize = Number.isFinite(payload?.pageSize) ? payload.pageSize : 100;
  const maxPages = Number.isFinite(payload?.maxPages) ? payload.maxPages : 20;

  return {
    fetchedAt: toDate(payload?.fetchedAt) || new Date(),
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
    // Stripe customers carrying no address at all — created by hand in the
    // Stripe dashboard, usually. They cannot be an audience row, so they are
    // reported rather than silently dropped.
    withoutEmail: Number.isFinite(payload?.withoutEmail) ? payload.withoutEmail : 0,
    truncated: Boolean(payload?.truncated?.customers || payload?.truncated?.subscriptions),
    // How far one request can walk, so the warning on screen quotes the real
    // ceiling instead of a number typed into the component.
    ceiling: pageSize * maxPages,
  };
}

/* -------------------------------------------------------------------------
   The four things a captured address can be
   ------------------------------------------------------------------------- */

export const AUDIENCE_STATUSES = [
  {
    id: "paid",
    label: "Paid",
    tone: "good",
    // Shown under the filter so the word on the row is never ambiguous.
    meaning:
      "She has a live subscription right now — active, on a trial, or with a card Stripe is still retrying — or her member record shows an App Store purchase.",
  },
  {
    id: "lapsed",
    label: "Paid before",
    tone: "warn",
    meaning:
      "Money changed hands at some point and it has stopped: cancelled, or a card Stripe gave up on. She is a customer, not a stranger, so she is kept out of the did-not-pay export.",
  },
  {
    id: "abandoned",
    label: "Started checkout, never paid",
    tone: "crit",
    meaning:
      "She opened the checkout sheet and typed her address, so Stripe made a customer record, but no payment ever cleared. This is the win-back list.",
  },
  {
    id: "app",
    label: "App member",
    tone: "neutral",
    meaning:
      "She has a member record but no Stripe history at all. Almost always an iPhone member; the App Store takes those payments and this dashboard cannot see them unless her record shows the program has started.",
  },
];

export const AUDIENCE_STATUS_LABELS = Object.fromEntries(
  AUDIENCE_STATUSES.map((s) => [s.id, s.label])
);

const AUDIENCE_STATUS_TONES = Object.fromEntries(
  AUDIENCE_STATUSES.map((s) => [s.id, s.tone])
);

export function audienceTone(status) {
  return AUDIENCE_STATUS_TONES[status] || "neutral";
}

/* -------------------------------------------------------------------------
   The merge
   ------------------------------------------------------------------------- */

/**
 * One row per human being, keyed on her lowercased address.
 *
 * @param {Array} stripeRows  Straight from /api/audience.
 * @param {Array} members     Normalised Firestore members, already loaded by
 *                            lib/adminData.js under the Firestore rules.
 */
export function mergeAudience(stripeRows = [], members = []) {
  const byEmail = new Map();

  for (const row of stripeRows) {
    const email = normalize(row?.email);
    if (!email) continue;
    const createdAt = toDate(row?.createdAt);
    const existing = byEmail.get(email);

    // One address can sit on more than one Stripe customer — a support refund,
    // a card retried under a new record. Keep the earliest sighting and the
    // strongest payment evidence, or the same woman reads as two people, one of
    // whom "never paid".
    if (existing) {
      existing.firstSeenAt = earliest(existing.firstSeenAt, createdAt);
      if (evidenceRank(row?.paidState) > evidenceRank(existing.stripeEvidence)) {
        existing.stripeEvidence = paidState(row?.paidState);
        existing.subscriptionStatus = cleanString(row?.subscriptionStatus);
      }
      if (!existing.name) existing.name = cleanString(row?.name);
      continue;
    }

    byEmail.set(email, {
      email,
      name: cleanString(row?.name),
      firstSeenAt: createdAt,
      // What Stripe alone can prove. Never overwritten by a member record.
      stripeEvidence: paidState(row?.paidState),
      subscriptionStatus: cleanString(row?.subscriptionStatus),
      inStripe: true,
      inFirestore: false,
      memberId: "",
      memberEntitlement: "",
    });
  }

  for (const member of members) {
    const email = normalize(member?.email);
    // A member with no address on record cannot be in an audience and cannot be
    // joined to anything. She is still a member; she is just not a row here.
    if (!email) continue;

    const existing = byEmail.get(email);
    if (existing) {
      existing.inFirestore = true;
      existing.memberId = member.id || existing.memberId;
      existing.name = existing.name || cleanString(member.name);
      existing.memberEntitlement = member.entitlement || "";
      existing.firstSeenAt = earliest(existing.firstSeenAt, member.joinedAt);
      continue;
    }

    byEmail.set(email, {
      email,
      name: cleanString(member.name),
      firstSeenAt: member.joinedAt || null,
      stripeEvidence: "none", // not "never": Stripe has never heard of her
      subscriptionStatus: "",
      inStripe: false,
      inFirestore: true,
      memberId: member.id || "",
      memberEntitlement: member.entitlement || "",
    });
  }

  const rows = [];
  for (const row of byEmail.values()) {
    rows.push({
      ...row,
      status: statusOf(row),
      source: row.inStripe && row.inFirestore ? "both" : row.inStripe ? "stripe" : "app",
    });
  }

  // Newest first: the addresses captured this week are the ones an ad campaign
  // is being judged on. Rows with no date sink rather than float, because an
  // undated row at the top reads as today's.
  rows.sort((a, b) => time(b.firstSeenAt) - time(a.firstSeenAt));
  return rows;
}

/**
 * Which of the four words describes this row.
 *
 * Order matters, and this is the order:
 *
 *   1. A live Stripe subscription is the strongest thing we know.
 *   2. Failing that, a member record that shows an App Store purchase (or one
 *      the owner marked by hand in the Members tab) also means she is paying —
 *      just not to us through Stripe. Calling her "never paid" and dropping her
 *      into a win-back discount would be the worst error this screen can make.
 *   3. Then evidence that money once changed hands and stopped.
 *   4. A member record with nothing else attached is an app member, not an
 *      abandoned checkout. She is not a stranger who walked away.
 *   5. Only what is left — a Stripe customer with no payment, no member record
 *      — is an abandoned checkout.
 */
function statusOf(row) {
  if (row.stripeEvidence === "paid") return "paid";
  if (isPayingEntitlement(row.memberEntitlement)) return "paid";
  if (row.stripeEvidence === "lapsed") return "lapsed";
  if (row.memberEntitlement === "expired") return "lapsed";
  if (row.inFirestore) return "app";
  return "abandoned";
}

/* -------------------------------------------------------------------------
   The window
   ------------------------------------------------------------------------- */

export { RANGES as AUDIENCE_RANGES, rangeById as audienceRangeById };

/**
 * Rows first seen inside the chosen window.
 *
 * "First seen" is the earliest of the Stripe customer's creation date and the
 * member record's join date. A row with neither cannot be placed in time, so it
 * only appears under All time — and `undated` says how many those are, because
 * a filter that silently eats rows is how a total stops adding up.
 */
export function withinRange(rows, rangeId, now = new Date()) {
  const range = rangeById(rangeId);
  if (!range.days) return { rows, undated: 0, range };

  const cutoff = now.getTime() - range.days * 86400000;
  const kept = [];
  let undated = 0;
  for (const row of rows) {
    if (!row.firstSeenAt) {
      undated += 1;
      continue;
    }
    if (row.firstSeenAt.getTime() >= cutoff) kept.push(row);
  }
  return { rows: kept, undated, range };
}

/* -------------------------------------------------------------------------
   The numbers
   ------------------------------------------------------------------------- */

/**
 * Everything the tiles show, counted once.
 *
 * THE CONVERSION RATE IS THE CAREFUL ONE. Its denominator is people who
 * actually reached OUR checkout sheet and typed an address — that is exactly
 * the set of Stripe customer records, and nothing else. Its numerator is those
 * of them Stripe can prove paid at some point, now or in the past.
 *
 * App members are excluded from both halves on purpose. They never touched the
 * web checkout, so putting them in the denominator would make the ads look
 * worse than they are, and putting them in the numerator would make them look
 * better. Either way the owner would be spending money against a wrong number.
 */
export function audienceCounts(rows) {
  let paid = 0;
  let lapsed = 0;
  let abandoned = 0;
  let app = 0;

  let startedCheckout = 0; // has a Stripe customer record
  let everPaidInStripe = 0; // and Stripe can prove a payment
  let payingNow = 0;

  for (const row of rows) {
    if (row.status === "paid") paid += 1;
    else if (row.status === "lapsed") lapsed += 1;
    else if (row.status === "abandoned") abandoned += 1;
    else app += 1;

    if (row.inStripe) {
      startedCheckout += 1;
      if (row.stripeEvidence === "paid") {
        everPaidInStripe += 1;
        payingNow += 1;
      } else if (row.stripeEvidence === "lapsed") {
        everPaidInStripe += 1;
      }
    }
  }

  return {
    total: rows.length,
    paid,
    lapsed,
    abandoned,
    app,
    startedCheckout,
    everPaidInStripe,
    payingNow,
    // null, not 0, when there is nothing to divide by. The tile prints a
    // sentence instead of a confident "0%".
    conversion: startedCheckout > 0 ? everPaidInStripe / startedCheckout : null,
  };
}

/* -------------------------------------------------------------------------
   The exports
   ------------------------------------------------------------------------- */

/**
 * The segments the owner can download, and who is in each.
 *
 * `abandoned` is the only one that needed a decision: somebody who paid a year
 * ago and cancelled is NOT in the did-not-pay list. She has her own segment, so
 * a "first month free" offer never lands in a former customer's inbox.
 */
export const AUDIENCE_SEGMENTS = [
  {
    id: "all",
    label: "Everyone",
    note: "Every address captured, whatever happened next. Use this as the seed for a lookalike or similar audience.",
    includes: () => true,
  },
  {
    id: "paid",
    label: "Paid only",
    note: "Live subscribers and App Store members. Upload as an EXCLUSION so ads stop chasing people who already bought, and as the seed for your best lookalike.",
    includes: (row) => row.status === "paid",
  },
  {
    id: "abandoned",
    label: "Did not pay",
    note: "Opened the checkout, typed an address, never paid. The win-back list — a discount or a reminder goes here.",
    includes: (row) => row.status === "abandoned",
  },
  {
    id: "lapsed",
    label: "Paid before",
    note: "Cancelled, or a card that failed for good. They liked it once. Different message from the list above, so a different file.",
    includes: (row) => row.status === "lapsed",
  },
];

export function segmentById(id) {
  return AUDIENCE_SEGMENTS.find((s) => s.id === id) || AUDIENCE_SEGMENTS[0];
}

export function rowsForSegment(rows, id) {
  const segment = segmentById(id);
  return rows.filter(segment.includes);
}

/**
 * A CSV both ad platforms accept with no mapping step.
 *
 * ONE COLUMN, HEADED `Email`. That is not laziness, it is the format:
 *
 *   * Google Ads Customer Match reads a header row and matches `Email`. Extra
 *     columns it does not recognise make the upload fail validation, and name
 *     columns change the matching rules (Google then wants first name, last
 *     name, country and zip TOGETHER, or it ignores them).
 *   * Meta Custom Audiences maps columns by hand anyway, and a single-column
 *     file maps in one click with nothing to get wrong.
 *
 * No byte order mark. Excel likes one; Google Ads does not, because the header
 * then reads as "﻿Email" and matches nothing. CRLF line endings, per
 * RFC 4180.
 *
 * The addresses are sent in the clear because both platforms hash them in the
 * browser before upload. Nothing here should ever pre-hash: a double hash
 * matches nobody.
 */
export function audienceCsv(rows) {
  const lines = ["Email"];
  for (const row of rows) {
    if (row.email) lines.push(csvCell(row.email));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * The same people with everything we know, for the owner's own records and for
 * a spreadsheet. NOT for uploading to an ad platform — the extra columns are
 * exactly what makes Customer Match reject a file.
 *
 * THERE IS NO GOAL COLUMN. The goal she picked is health data, /api/audience
 * deliberately does not return it, and a file that pairs an address with a
 * pelvic health condition is the one artefact this feature must never produce.
 * See the comment in functions/api/audience.js.
 */
export function audienceDetailCsv(rows) {
  const header = ["Email", "Name", "Status", "Where from", "First seen", "Stripe subscription"];
  const lines = [header.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.email,
        row.name,
        AUDIENCE_STATUS_LABELS[row.status] || row.status,
        sourceLabel(row.source),
        row.firstSeenAt ? isoDay(row.firstSeenAt) : "",
        row.subscriptionStatus,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function sourceLabel(source) {
  if (source === "both") return "Checkout and member record";
  if (source === "stripe") return "Checkout";
  return "Member record";
}

/** `pelvi-audience-did-not-pay-2026-08-11.csv` */
export function audienceFilename(segmentId, now = new Date()) {
  const slug = segmentById(segmentId).label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `pelvi-audience-${slug}-${isoDay(now)}.csv`;
}

/** `pelvi-audience-detail-2026-08-11.csv` */
export function audienceDetailFilename(now = new Date()) {
  return `pelvi-audience-detail-${isoDay(now)}.csv`;
}

/**
 * Hand the browser a file. No endpoint and no upload: the rows are already in
 * memory, so the CSV is built here and handed straight to a download. The
 * addresses never leave the owner's laptop on the way out.
 */
export function downloadCsv(filename, contents) {
  if (typeof document === "undefined") return;
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs the URL to outlive the click by a beat.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* -------------------------------------------------------------------------
   Search
   ------------------------------------------------------------------------- */

export function searchAudience(rows, term) {
  const needle = (term || "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) =>
      row.email.includes(needle) ||
      row.name.toLowerCase().includes(needle) ||
      (AUDIENCE_STATUS_LABELS[row.status] || "").toLowerCase().includes(needle)
  );
}

/* -------------------------------------------------------------------------
   Small things
   ------------------------------------------------------------------------- */

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function paidState(value) {
  return value === "paid" || value === "lapsed" ? value : "never";
}

function evidenceRank(state) {
  if (state === "paid") return 2;
  if (state === "lapsed") return 1;
  return 0;
}

function earliest(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a < b ? a : b;
}

function time(date) {
  return date ? date.getTime() : -Infinity;
}

function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * RFC 4180. An address cannot contain a comma or a quote, but a NAME can, and a
 * name with a comma in it silently shifts every column after it.
 */
function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
