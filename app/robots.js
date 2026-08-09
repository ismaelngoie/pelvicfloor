// robots.JS, not robots.TXT.
//
// This file used to be named app/robots.txt while containing exactly the
// JavaScript below. Next treats app/robots.txt as a STATIC metadata file and
// copies it to the export byte for byte, so https://pelvi.health/robots.txt has
// been serving this function's source code as its own contents. Verified live:
// the response ends with `export default function robots() {`.
//
// What that cost, every day it shipped:
//   - No `Sitemap:` line. Nothing pointed a crawler at /sitemap.xml, and the
//     55 post blog is the whole SEO moat.
//   - No `Disallow:` lines. The rules below have never once applied.
// Google's parser skips lines it cannot read, so the file did not break
// crawling; it simply did nothing at all.
//
// With the .js extension Next runs it and writes real directives. `output:
// 'export'` needs the same force-static declaration app/sitemap.js carries, or
// the build refuses to prerender the route.
export const dynamic = "force-static";

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Two entries per route, and both are needed. `Disallow: /app/` alone
        // misses /app itself, because the static export serves the Today tab
        // with no trailing slash. A bare `Disallow: /app` is a PREFIX and would
        // also swallow /apple-touch-icon.png. `$` anchors the exact path.
        //
        // Every one of these pages also carries its own noindex, which is what
        // actually keeps it out of the index; this is the belt to those braces.
        disallow: [
          '/api/',
          '/app$',      // the member app: her plan, her diary, her check-ins
          '/app/',
          '/admin$',    // the owner dashboard
          '/admin/',
          '/welcome$',  // post-purchase only, and the one page with the App Store banner
          '/*?plan=',   // checkout and conversion URLs
        ],
      },
    ],
    sitemap: 'https://pelvi.health/sitemap.xml',
  };
}
