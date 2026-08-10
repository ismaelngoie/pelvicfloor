// Refreshes lib/seo/appStoreRating.json from Apple's public lookup endpoint.
//
// Run it before any deploy that touches the homepage:
//   node scripts/refresh-app-store-rating.mjs
//
// WHY THIS IS A SCRIPT AND NOT A BUILD STEP. The rating is the one number in
// the homepage graph that changes without anybody editing this repo, and
// Google treats an aggregateRating that does not match the source as a reason
// to distrust every other claim on the page. Fetching it at build time would
// solve that, but `next build` already fails whenever fonts.gstatic.com is
// slow, and adding a second network dependency to the critical path of a
// production deploy buys accuracy with uptime. A committed snapshot plus this
// script keeps the number true, keeps the build offline-safe, and leaves a
// dated `fetchedAt` in the file so staleness is visible in a diff.
//
// The rating Apple reports is collected FROM App Store users, not authored by
// us. That is what makes it eligible at all: Google's review-snippet policy
// rules out a rating a business writes about itself.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const APP_ID = "6642654729";
const LOOKUP = `https://itunes.apple.com/lookup?id=${APP_ID}&country=us`;

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, "..", "lib", "seo", "appStoreRating.json");

const res = await fetch(LOOKUP);
if (!res.ok) {
  console.error(`Apple lookup failed: HTTP ${res.status}`);
  process.exit(1);
}

const body = await res.json();
const app = body?.results?.[0];
if (!app) {
  console.error("Apple lookup returned no result. Is the app still published?");
  process.exit(1);
}

const ratingValue = app.averageUserRating;
const ratingCount = app.userRatingCount;

// A rating with no ratings behind it is not a rating. Apple returns 0/0 for a
// brand new app, and shipping that would put "0 out of 5" in every search
// result, so refuse to write it and leave the previous snapshot in place.
if (!(ratingCount > 0) || !(ratingValue > 0)) {
  console.error(
    `Refusing to write: Apple reports ${ratingCount} ratings. Snapshot left unchanged.`
  );
  process.exit(1);
}

const previous = JSON.parse(await readFile(target, "utf8"));

const next = {
  ...previous,
  // One decimal place. Apple hands back 4.56098, which is precision the number
  // does not have and which reads as fake when a search result prints it.
  ratingValue: Math.round(ratingValue * 10) / 10,
  ratingCount,
  fetchedAt: new Date().toISOString().slice(0, 10),
};

await writeFile(target, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `appStoreRating.json: ${next.ratingValue} from ${next.ratingCount} ratings (${next.fetchedAt})`
);
