// Microsoft Clarity for the hand-written pages that the Next app never runs on.
//
// WHO LOADS THIS
//
//   The 53 legacy articles in public/blog/<slug>/index.html and
//   public/contact.html. Each of them carries exactly one line, in <head>:
//
//     <script type="module" src="/clarity-static.js"></script>
//
//   That line is the whole integration. It carries no project id, no snippet
//   and no route name, so it is identical in all 54 files and there is nothing
//   in it that can rot. Everything it does is decided here and in
//   clarity-gate.js, both of which are one file each, deployed with the site.
//
// WHY NOT JUST PASTE MICROSOFT'S SNIPPET INTO THE 54 FILES
//
//   Because the snippet has no gate. /app and /admin carry member names, email
//   addresses, billing state, symptom check-ins and Coach Mia transcripts, and
//   pelvic health is data concerning health, which is special category data
//   under GDPR Article 9. The tag on this site is deny-by-default for that
//   reason. 54 pasted copies would be 54 tags that record whatever document
//   they find themselves in, and the next person to copy a page as a template
//   would carry one somewhere it must never go. This file asks the same gate
//   the Next app asks, from the same source, so pasting the line above into a
//   page that is not on the allowlist injects nothing at all.
//
// WHAT IT DOES NOT DO
//
//   No custom tags beyond the one below, no events, no upgrades, no identify.
//   Those belong to the funnel and are in lib/analytics.js. These pages are
//   read, not walked: what is wanted here is pageviews, scroll depth, rage
//   clicks and whether anyone reaches the "Start My Plan" button.
//
//   It is also only layer 1 of the three in app/Clarity.jsx. Layers 2 and 3
//   exist to stop a CLIENT-SIDE route change from carrying a live recorder out
//   of a public route and into a private one. These pages have no client-side
//   router: every link is an <a>, so every crossing is a fresh document and a
//   fresh decision. There is nothing here for those layers to do.
//
// type="module" rather than defer, for two reasons: the import below needs it,
// and a module script is deferred anyway, so it never blocks the first paint of
// an article. A browser too old for modules ignores the line and is not
// recorded, which is the safe direction to fail in.

import { CLARITY_PROJECT_ID, isTrackedPath } from "/clarity-gate.js";

// The gate, asked exactly as app/Clarity.jsx asks it. Deny by default: if this
// document is not on the allowlist, or its URL carries anything sensitive,
// nothing below runs and no tag is ever added to the page.
if (isTrackedPath(window.location.pathname, window.location.search)) {
  // Idempotent. A module URL is only evaluated once per document, so this
  // guards against the line being paired with a stray hand-pasted snippet
  // rather than against itself.
  if (!window.__pelviClarityInjected) {
    window.__pelviClarityInjected = true;

    // Clarity's own snippet, kept recognisable so it can be diffed against the
    // one Microsoft hands out, and identical to the copy in app/Clarity.jsx.
    // window.clarity is a queue until the real implementation replaces it,
    // which is what makes the call below safe before the CDN answers.
    window.clarity =
      window.clarity ||
      function clarityQueue() {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    // An ad blocker will refuse this request. That is fine and expected: the
    // queue above absorbs the call below and nothing on the page notices.
    script.onerror = () => {};
    document.head.appendChild(script);

    // The one tag these pages set. Not personal data, and not about the reader:
    // it says which build of the site drew the page, so a session list can be
    // split into "the hand-written articles" and "the app router" without
    // matching URLs by hand. It is also the fastest way to confirm from the
    // Clarity dashboard that this file is live on the articles.
    try {
      window.clarity("set", "surface", "static_html");
    } catch {
      // Analytics must never be able to break a page. Nothing to do with this.
    }
  }
}
