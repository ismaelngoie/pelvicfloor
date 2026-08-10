"use client";

// The local-QA switch for the signed-in surfaces.
//
// /app and /admin are both behind a Google sign-in, so neither can be opened on
// a laptop without the owner's account and a live Firestore. That made the
// responsive work unverifiable, which is how a desktop layout ships broken.
// This lets `next dev` stand both gates down and render them against invented
// data. Use ?fixtures=1 on any /app or /admin URL.
//
// Two things keep it out of production, and they are different guarantees:
//
//   1. THE BYPASS. `FIXTURES_ON` is built from `process.env.NODE_ENV`, which
//      Next replaces with the literal "production" in a production bundle. The
//      whole expression folds to `false` before minification, so every branch
//      guarded by it is deleted. There is no environment variable, query string
//      or cookie that can switch it back on in production. That is the point.
//
//   2. THE DATA. It lives in devFixtureData.js, and the only way in is an
//      `import("@/lib/devFixtureData")` written INSIDE an `if (FIXTURES_ON)`
//      block at the point of use. With the condition folded to false the whole
//      block goes, the dynamic import goes with it, and webpack emits no chunk
//      at all — so the invented member records are not merely unreachable in
//      production, they are not among the deployed files.
//
//      Every guard is written `process.env.NODE_ENV !== "production" &&
//      FIXTURES_ON`, and the duplication is load-bearing. Two shapes were tried
//      and both shipped the data:
//
//        * a `loadFixtures()` helper exported from here — the exported function
//          is a live binding, so its body and its `import()` survive;
//        * `if (FIXTURES_ON)` on its own — FIXTURES_ON is an imported binding,
//          not a literal, and webpack will not fold it across the module edge.
//
//      Only `process.env.NODE_ENV`, written at the call site, becomes a literal
//      there and takes the block with it. Verify after any change to this file
//      with `npm run build && grep -r Okafor out/`, which must find nothing.
//
// Nothing in either file ever writes.

export const FIXTURES_ON =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("fixtures");
