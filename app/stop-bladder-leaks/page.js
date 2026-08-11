import LeakLandingClient from "./LeakLandingClient";

// The paid landing page for the bladder-leak keyword cluster: "pelvic floor
// exercises for incontinence", "bladder leakage exercises", "stop bladder
// leaks". This is the Final URL those ad groups point at. One page for the
// whole intent THEME, never one per keyword: close variants and smart bidding
// operate at theme level, and per-keyword pages fragment the traffic below
// testable volume.
//
// WHY THIS PAGE EXISTS AT ALL, instead of pointing the ads at "/": message
// match. The ad promises leaks, so the first headline she reads talks about
// leaks, not about pelvic health in general. Dedicated, message-matched pages
// convert decisively better than generic ones AND score a better landing page
// experience in Google's Quality Score, which makes every click cheaper.
//
// THE H1 IS NOT "Fix your pelvic floor incontinence", on purpose. "Fix" plus a
// named medical condition is a disease-treatment claim under the FTC's Health
// Products Compliance Guidance, which requires clinical-trial substantiation
// and carries five-figure per-violation exposure. The strong verb is aimed at
// the symptom instead ("stop bladder leaks", the goal title that already ships
// on the goal card), and the boldness is carried by the money-back guarantee,
// which is a commercial promise we control, not a medical one.
//
// ROBOTS: noindex, follow. This is a paid variant of the homepage's offer and
// must not compete with it in organic search, but it MUST stay crawlable:
// Google Ads' landing page quality assessment fetches the URL, and a
// robots.txt block would tank the very Quality Score this page exists to earn.
// So: no robots.txt entry, no sitemap entry (app/sitemap.js lists routes by
// hand), meta noindex here, and an X-Robots-Tag on the RSC .txt sibling in
// public/_headers, which a meta tag cannot cover.

export const metadata = {
  title: "Stop Bladder Leaks",
  description:
    "A personalized pelvic floor exercise plan built to stop bladder leaks. 5 minutes a day, 500+ videos approved by physios, and a 90-day money-back guarantee.",
  robots: { index: false, follow: true },
};

export default function StopBladderLeaksPage() {
  return <LeakLandingClient />;
}
