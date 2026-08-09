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

/** True for iPhone and iPad, including iPadOS pretending to be a Mac. */
export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOS;
}
