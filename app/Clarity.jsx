"use client";

// The Microsoft Clarity tag, and the gate that decides whether it is allowed to
// exist on this document at all.
//
// It used to be an unconditional <Script> in app/layout.js, which meant it also
// ran on /app and /admin: member names, email addresses, billing state, symptom
// check-ins and Coach Mia transcripts, all of it into session replay. Pelvic
// health is data concerning health and therefore special category data under
// GDPR Article 9. The full reasoning is in the header of lib/analytics.js.
//
// THREE LAYERS, AND WHY THERE ARE THREE
//
//   1. The tag is injected from JavaScript, after a deny-by-default check of
//      the path AND the query string. Nothing is added to the document on a
//      private route, so there is nothing to disable. A route that nobody has
//      added to the allowlist in lib/analytics.js is private.
//
//   2. Crossing from public to private is a full page load, not a client-side
//      route change. There is exactly one such crossing in the product, the
//      "Continue on the web" button on /welcome, and it is a plain <a> rather
//      than a next/link for this reason. See the comment there.
//
//   3. If a soft navigation into a private route ever happens anyway, because
//      somebody adds a <Link href="/app"> in six months, the effect below stops
//      the recorder and then reloads the document, which throws away the tag
//      and everything it had buffered. This is a backstop, not the mechanism.
//      It has to be, because by the time a React effect runs, the new route's
//      DOM is already committed: layer 2 is what keeps that DOM from ever being
//      built in a document the recorder is living in.
//
// Written as a manual injection rather than a conditional next/script because
// next/script only chooses whether to ADD a tag. Once clarity.ms is in the
// document it stays and it keeps recording, so a conditional <Script> would
// have looked like a gate while being none.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { CLARITY_PROJECT_ID, isTrackedPath, stopClarity } from "@/lib/analytics";

// Module scope, so it is per document rather than per mount. A hard navigation
// gives a fresh module and therefore a fresh decision, which is exactly the
// behaviour layers 2 and 3 depend on.
let injected = false;
let bailedOut = false;

function injectTag() {
  // Clarity's own snippet, kept recognisable on purpose so it can be diffed
  // against the one Microsoft hands out. The first line is what makes every
  // call in lib/analytics.js safe before the CDN answers: window.clarity is a
  // queue until the real implementation replaces it.
  window.clarity =
    window.clarity ||
    function clarityQueue() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
  // An ad blocker will refuse this request. That is fine and expected: the
  // queue above absorbs every call and nothing on the page notices.
  script.onerror = () => {};
  document.head.appendChild(script);
}

export default function Clarity() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // window.location.search rather than useSearchParams(). useSearchParams in
    // a statically exported route forces the whole subtree into a client-side
    // bailout and needs its own Suspense boundary; this reads the same value
    // after mount with none of that. The gate is a client-side decision either
    // way, because nothing is injected during prerender.
    const allowed = isTrackedPath(pathname || window.location.pathname, window.location.search);

    if (allowed) {
      if (!injected) {
        injected = true;
        injectTag();
      }
      return;
    }

    // Private route. On a fresh document nothing was ever injected and there is
    // nothing to do, which is the normal path for /app and /admin.
    if (!injected) return;

    // Layer 3. We are here because a client-side route change carried a live
    // recorder into a private area.
    stopClarity();
    if (bailedOut) return;
    bailedOut = true;
    // Replace, not assign, so the back button does not bounce her between the
    // two states. The reload cannot loop: the new document injects nothing on
    // this path, so this branch is unreachable in it.
    window.location.replace(window.location.href);
  }, [pathname]);

  return null;
}
