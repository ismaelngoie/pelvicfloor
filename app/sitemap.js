export const dynamic = "force-static";

import { blogSitemapEntries } from "@/lib/blog/posts";
import { LEGACY_POSTS, legacyHref } from "@/lib/blog/legacyPosts";

const SITE = "https://pelvi.health";

// The sitemap describes what is actually served, at the exact URL that serves
// it. Three things changed here and each one was costing something real.
//
// 1. TRAILING SLASHES. Every entry used to be emitted without one, so every
//    single URL in the file 308-redirected, and the canonical tag on the far
//    side named a URL the sitemap had just contradicted. It is not one shape
//    for the whole site either: the app router exports blog/<slug>.html, which
//    answers at /blog/<slug> bare, while the 53 legacy posts are directories of
//    index.html and answer at /blog/<slug>/. Both are correct, per post, and
//    lib/blog/posts.js and lib/blog/legacyPosts.js each own their own href
//    helper so this file never has to guess.
//
//    The site root is the one exemption. It is listed here as
//    https://pelvi.health/ while the page's own canonical tag reads
//    https://pelvi.health, because Next's metadata layer strips the trailing
//    slash and there is no configuration that keeps it without changing the
//    shape of every other route. That difference is not a redirect and not a
//    duplicate: RFC 3986 makes an empty path and "/" the same URL, and every
//    crawler normalises them together. Do not "fix" one to match the other.
//
// 2. LASTMOD. It used to be `new Date()`, meaning the build clock, which said
//    every page changed on every deploy while the pages themselves declared
//    dateModified 2025-08-15. Google only trusts lastmod when it can verify it
//    against the page, and a contradicted lastmod does not just get ignored
//    once, it teaches the crawler to ignore the honest ones later. So: blog
//    entries carry the date the article itself declares, and pages whose real
//    modification date this repo does not know carry NO lastmod at all. An
//    absent lastmod costs nothing. A wrong one costs the next true one.
//
// 3. CHANGEFREQ AND PRIORITY. Both gone. Google's own sitemap documentation
//    says it ignores them, and they were the only thing in the file implying
//    the homepage mattered nine times more than a post that ranks.
//
// Deliberately absent: /app and /admin (noindex, behind a gate), /welcome
// (post-purchase only, and the one page carrying the App Store banner),
// /cora/* (a different product's support pages, which exist for Apple review
// and have no business ranking on this domain), and /stop-bladder-leaks (the
// paid ad landing page, meta noindex: listing it would ask Google to index a
// page whose own tag says the opposite, and it must not compete with "/" in
// organic search).

export default function sitemap() {
  // No lastModified on these. The legal pages and the funnel change when
  // someone edits them, and a static export has no honest record of when that
  // was: file mtime is the CI clone time, which is just the build clock
  // wearing a different hat.
  const pages = [
    { url: `${SITE}/` },
    { url: `${SITE}/blog` },
    { url: `${SITE}/contact.html` },
    // The two legal pages are app router routes now, so they answer at the
    // extensionless URL. Listing /terms-of-use.html here would put a 301 in the
    // file, which is the same mistake the trailing slashes used to make.
    { url: `${SITE}/terms` },
    { url: `${SITE}/privacy-policy` },
  ];

  // New articles: the date the article says it was updated.
  const posts = blogSitemapEntries(SITE);

  // Legacy articles: published date. These have not been edited since they were
  // exported by the old Astro build, so published IS their last modification.
  // The day one of them is rewritten, it should move into lib/blog/posts.js and
  // pick up a real `updated` instead of being patched here.
  const legacy = LEGACY_POSTS.map((post) => ({
    url: `${SITE}${legacyHref(post.slug)}`,
    lastModified: post.published,
  }));

  return [...pages, ...posts, ...legacy];
}
