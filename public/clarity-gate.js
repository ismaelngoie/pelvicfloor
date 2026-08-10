// The Microsoft Clarity route gate. THE ONE COPY OF THE RULES.
//
// This file used to be the "Route gate" section of lib/analytics.js. It was
// lifted out unchanged, for one reason: the 53 hand-written articles in
// public/blog and public/contact.html are plain HTML served straight off the
// CDN. Nothing in the Next bundle runs on them, so they had no Clarity tag at
// all, and the blog is where the ad money lands.
//
// The obvious fix, pasting Clarity's snippet into 54 files, would have put an
// UNGATED tag on the site: 54 copies with no path check, no query check and no
// way to change any of it without touching 54 files again. This file is the
// alternative. There is exactly one copy of the rules and it has exactly two
// readers:
//
//   lib/analytics.js        re-exports it, so app/Clarity.jsx and the whole
//                           Next app are gated by these very lines
//   public/clarity-static.js  the loader the 54 static pages reference
//
// WHY IT LIVES IN public/ RATHER THAN lib/
//
//   Because a static page can only load a URL. Files under lib/ are compiled
//   into content-hashed chunks and are not addressable; files under public/ are
//   copied verbatim into out/ and are served at their own path. Putting the
//   rules here is what lets both readers share them instead of forking. The
//   import in lib/analytics.js is an ordinary relative import: webpack does not
//   treat public/ specially, so the app bundle gets these bytes inlined and the
//   browser gets them again at /clarity-gate.js. Two copies over the wire, one
//   copy in source, which is the half that matters.
//
// PLAIN, SIDE-EFFECT-FREE ESM ON PURPOSE
//
//   No imports, no framework, no "use client", and nothing here touches
//   window or document. It has to stay that way. It is evaluated during the
//   static export (where there is no document) and it is imported by the
//   loader before the loader has decided whether this page may be recorded at
//   all. A side effect in this file would be a tag that loads before the gate
//   has answered.
//
// Read the header of lib/analytics.js for what Clarity is allowed to see and
// why, and the header of app/Clarity.jsx for the three layers that keep a
// client-side navigation from carrying a live recorder into the member area.

export const CLARITY_PROJECT_ID = "vaulq5g8w8";

// Deny by default. A path has to be named here to be recorded.
//
// The static export means one URL can be reached more than one way: Cloudflare
// Pages serves out/index.html at both "/" and "/index.html", and out/app.html
// is reachable at "/app" AND at "/app.html". normalisePath folds those together
// so the gate cannot be walked around by typing the file name.

const ALLOWED_EXACT = new Set([
  "/", // landing page, the whole funnel, the plan reveal and the paywall
  "/welcome", // post-purchase confirmation
  "/blog",
  "/privacy-policy",
  "/terms",
  "/cora/contact",
  "/cora/privacy-policy",
  // Hand-written HTML in public/, not an app router route. It is reachable as
  // "/contact" and as "/contact.html"; normalisePath folds the second onto the
  // first, so one line covers both.
  "/contact",
  // Redirected to /terms by public/_redirects. A 301 is a fresh document, so
  // this line is only reached if that rule is ever dropped.
  "/terms-of-use",
]);

const ALLOWED_PREFIXES = ["/blog/"];

// Redundant against deny-by-default, and kept anyway. It is the line somebody
// will read when they are about to widen ALLOWED_PREFIXES to "/".
const BLOCKED_PREFIXES = ["/app", "/admin"];

// Query parameters that must never reach a replay. Clarity records the page URL
// with the pageview, before any effect in the page can rewrite it, so the only
// safe answer is not to record that document at all.
//
// The match below is a substring test on "<name>=", which is deliberately loose
// in the safe direction: "client_secret" also catches the two Stripe spellings
// above it, and "token" catches "id_token" and "access_token". A parameter that
// is nearly one of these is refused rather than argued about.
const SENSITIVE_PARAMS = [
  "payment_intent",
  "payment_intent_client_secret",
  "setup_intent",
  "setup_intent_client_secret",
  // Any client secret, whoever minted it, under whatever parameter name.
  "client_secret",
  "email",
  "token",
];

/** "/App.HTML" and "/app/" and "/app" are all "/app". */
export function normalisePath(pathname) {
  let path = String(pathname || "/").split("?")[0].split("#")[0].toLowerCase();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.endsWith(".html")) path = path.slice(0, -5);
  if (path.endsWith("/index")) path = path.slice(0, -6) || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/**
 * May Clarity run on this document?
 *
 * @param {string} pathname  window.location.pathname, or the router's pathname
 * @param {string} [search]  window.location.search, including the "?"
 */
export function isTrackedPath(pathname, search = "") {
  const path = normalisePath(pathname);

  for (const prefix of BLOCKED_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }

  const query = String(search || "").toLowerCase();
  if (query) {
    for (const param of SENSITIVE_PARAMS) {
      if (query.includes(`${param}=`)) return false;
    }
  }

  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
