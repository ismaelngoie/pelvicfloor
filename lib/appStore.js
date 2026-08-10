// App Store attribution: one place, so every install link on the site is
// tracked and none of them drift.
//
// HOW THIS REPORTS. Apple groups installs by the campaign token (ct) that came
// in on the link, and shows them under App Store Connect > Analytics >
// Acquisition > Campaigns. Two things to expect the first time:
//   1. nothing appears for about 24 hours
//   2. a campaign stays hidden until at least 5 distinct Apple IDs have
//      installed from it, which is Apple protecting user privacy, not a bug
//
// The provider token is constant for the account. The campaign token is the
// only part that changes per surface, and Apple caps it at 30 characters and
// treats it as CASE SENSITIVE. Keep the ct on the meta tag and on the href
// identical or the two will report as separate campaigns.

export const APP_STORE_ID = "6642654729";

/**
 * ONE SWITCH FOR THE WHOLE WEB-TO-APP HANDOFF, AND IT IS OFF. HERE IS WHY.
 *
 * A woman who pays $24.99 on pelvi.health and then installs the iPhone app
 * TODAY does not get her plan. She gets the app's own onboarding funnel and its
 * own paywall, asking her for $24.99 again. Verified against the frozen iOS
 * repo, not assumed:
 *
 *   - "Pelvic Floor/AppDelegate/SceneDelegate.swift" decideInitialRoute() is
 *     the only launch gate, and it routes home solely on the RevenueCat
 *     entitlement "Pelvic Floor Subscriptions" being active.
 *   - There is no sign-in anywhere in the app. Identity is a silent anonymous
 *     Firebase auth and the Firestore document key is the RevenueCat app user
 *     id. `Purchases.shared.logIn(...)` is never called, so that id is the
 *     device's anonymous one and nothing can map her email onto it.
 *   - "Restore Purchase" (Help.swift, SubscriptionViewController.swift) calls
 *     Purchases.shared.restorePurchases(), which asks the App Store about that
 *     Apple ID's receipt. A Stripe subscription is not in that receipt, so it
 *     answers "Nothing to Restore".
 *
 * WHY THAT TAKES THE SMART APP BANNER DOWN TOO, and not just our own sheet.
 * Ask who the banner can actually move. It renders on /welcome and inside the
 * member app, so everybody who sees it has already paid, and they are one of
 * two people. If she subscribed in the App Store she already has the app
 * installed, so the banner moves her nowhere. If she subscribed on the web the
 * banner moves her to a second paywall. The only group it can move is the group
 * it hurts, and once ads are running that group is nearly all of them.
 *
 * FLIP THIS TO true WHEN, AND ONLY WHEN, the app can unlock from a web
 * purchase. That needs an app release and the app repo is frozen, so it cannot
 * be fixed from this side. The smallest version that works: the app signs her
 * in with Google or Apple, matching the web — the email link is not a door on
 * either any more, see the header of lib/identity.js — then calls
 * Purchases.shared.logIn with a
 * stable id for that member, and the server grants the RevenueCat entitlement
 * for a live Stripe subscription. It has to be a sign-in and not a redemption
 * code, because App Review guideline 3.1.1 forbids the code. Everything on this
 * side is already built and waiting: the sheet, the campaign tokens, the
 * dismissal memory and the banner tags all come back with this one edit.
 */
export const APP_HANDOFF_READY = false;

/** Constant for the account. Owner supplied this on 2026-08-09. */
export const PROVIDER_TOKEN = "119970255";

/**
 * Campaign tokens, one per surface.
 *
 * `pelvi.health` is the campaign the owner has already created, so it is the
 * default and the only one guaranteed to be live today. The per-surface tokens
 * below are what you actually want long term, because they answer "did she
 * install after paying, or off the blog?" — create each one in App Store
 * Connect > Analytics > Acquisition > Campaigns, then flip USE_PER_SURFACE_CT
 * to true. Until then every link reports as one campaign, which is still
 * correct, just less detailed.
 */
export const USE_PER_SURFACE_CT = false;

const DEFAULT_CT = "pelvi.health";

const SURFACE_CT = {
  success: "web success", // shown right after she pays
  home: "web home",       // marketing pages
  login: "web login",     // returning member
  member: "web member",   // inside the member app
  blog: "web blog",
};

export function campaignToken(surface = "home") {
  if (!USE_PER_SURFACE_CT) return DEFAULT_CT;
  return SURFACE_CT[surface] || DEFAULT_CT;
}

/**
 * True only for a real provider token: 5 to 10 digits, nothing else.
 *
 * If PROVIDER_TOKEN is ever put back to a placeholder, both builders below drop
 * the attribution parameters entirely rather than sending Apple a literal
 * "PROVIDER_TOKEN". A link that looks tagged and reports nothing is worse than
 * an untagged one, because you stop looking for the bug.
 */
export function hasProviderToken() {
  return typeof PROVIDER_TOKEN === "string" && /^[0-9]{5,10}$/.test(PROVIDER_TOKEN);
}

/**
 * The App Store link. This is the reliable attribution path — more reliable
 * than the Smart App Banner, whose affiliate-data handling Apple has never
 * documented and which several developers report does not attribute at all.
 */
export function appStoreURL(surface = "home") {
  const base = `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}`;
  if (!hasProviderToken()) return base;
  const ct = encodeURIComponent(campaignToken(surface));
  return `${base}?pt=${PROVIDER_TOKEN}&ct=${ct}&mt=8`;
}

/**
 * The Smart App Banner content string.
 *
 * Safari on iOS only. It does NOT render inside the in-app browsers that most
 * ad traffic arrives in (Meta, TikTok, Instagram all use a WKWebView), which is
 * why the HTML install card carries the real weight and this is a bonus.
 *
 * Pass an appArgument once Universal Links ship on the app side, so tapping
 * through opens her program rather than the app's front door.
 */
export function smartBannerContent(surface = "home", appArgument) {
  const parts = [`app-id=${APP_STORE_ID}`];
  // Apple splits this string on commas, so an app-argument containing one has
  // to arrive already percent-encoded.
  if (appArgument) parts.push(`app-argument=${appArgument.replace(/,/g, "%2C")}`);
  if (hasProviderToken()) {
    parts.push(`affiliate-data=pt=${PROVIDER_TOKEN}&ct=${campaignToken(surface)}&mt=8`);
  }
  return parts.join(", ");
}

/**
 * The `metadata.other` fragment that puts the Smart App Banner on a page, or an
 * empty object while APP_HANDOFF_READY is false.
 *
 * A function rather than a constant so a page reads as "this surface wants the
 * banner" and the one decision about whether any surface gets it stays in this
 * file. Spread it, do not assign a key to it:
 *
 *     other: { ...smartBannerMeta("member") }
 *
 * This module carries no "use client", so a page's metadata export (a server
 * component) can read it. That is the same reason lib/pricing.js exists.
 */
export function smartBannerMeta(surface = "home", appArgument) {
  if (!APP_HANDOFF_READY) return {};
  return { "apple-itunes-app": smartBannerContent(surface, appArgument) };
}

/**
 * True for iPhone and iPad, including iPadOS pretending to be a Mac.
 *
 * NEVER DETECT THIS BY SCREEN WIDTH. A 375px viewport is a phone, not an
 * iPhone, and a media query is the most common way a site ends up offering an
 * App Store link to an Android user who cannot use it. This is a user-agent
 * check and it is the only one on the site.
 *
 * All iOS browsers count, not just Safari. Chrome, Firefox and Edge on iOS are
 * WebKit underneath and install from the same App Store, and so do the
 * Instagram, Facebook and TikTok in-app browsers, which is where most paid
 * traffic actually lands.
 *
 * THE IPADOS CLAUSE IS THE DELICATE ONE. Since iPadOS 13 an iPad reports itself
 * as "Macintosh; Intel Mac OS X" with navigator.platform "MacIntel", so the
 * only thing separating it from a real Mac is the touch-point count: a Mac
 * reports 0, an iPad reports 5. That test on its own is not enough, because
 * platform is a legacy field that other environments also report as MacIntel
 * while emulating touch. A Pixel 8 in Chrome's device emulation on a Mac reads
 * platform "MacIntel" with maxTouchPoints 5 and passes the old check, which is
 * exactly the Android false positive this must not have. So anything whose user
 * agent names another operating system is rejected first, and what is left has
 * to look like a Mac AND report touch.
 */
export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad/.test(ua)) return true;
  if (/Android|Windows NT|CrOS|Windows Phone/i.test(ua)) return false;
  const macLike = /Macintosh/.test(ua) || navigator.platform === "MacIntel";
  return macLike && (navigator.maxTouchPoints || 0) > 1;
}
