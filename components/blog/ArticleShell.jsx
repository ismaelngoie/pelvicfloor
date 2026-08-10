// Everything around the prose: breadcrumb, headline, contents, and the four
// blocks that close every article.
//
// The order is deliberate and it is the order a worried reader needs, not the
// order that converts best. Short answer first, because most people leave after
// the first screen and they should leave with the answer. The product pitch
// sits after the body and before the questions, so it never interrupts the part
// she came for.
//
// Reading width is capped near 68 characters. The root layout hands us a
// max-w-6xl card on desktop, which is a fine app frame and a terrible measure
// for body text.

import Link from "next/link";
import { AppCTA, FAQ, KeyTakeaways, SourceList, slugifyHeading } from "./prose";
import { Byline, ReviewStatus } from "./ReviewStatus";
import { resolveSources } from "@/lib/blog/sources";
import { POSTS_BY_SLUG, postHref } from "@/lib/blog/posts";
import { LEGACY_POSTS, legacyHref } from "@/lib/blog/legacyPosts";

const LEGACY_BY_SLUG = Object.fromEntries(
  LEGACY_POSTS.map((post) => [post.slug, post])
);

/**
 * A related slug can point at either generation of post. New posts are served
 * without a trailing slash and legacy ones with it, so the link has to be built
 * from whichever list the slug is in rather than from a template.
 */
export function resolveRelated(slug) {
  const fresh = POSTS_BY_SLUG[slug];
  if (fresh) {
    return {
      slug,
      title: fresh.title,
      description: fresh.description,
      href: postHref(slug),
      external: false,
    };
  }
  const legacy = LEGACY_BY_SLUG[slug];
  if (legacy) {
    return {
      slug,
      title: legacy.title,
      description: legacy.description,
      href: legacyHref(slug),
      external: true,
    };
  }
  // Returning null here would drop the card silently, and a "Read next" list
  // that quietly shrinks from three to two is the kind of typo that lives for a
  // year. Fail the build instead.
  throw new Error(
    `Related slug "${slug}" is neither a post in lib/blog/posts.js nor a folder in public/blog.`
  );
}

// The two crumbs were 16px tall boxes at 320px: under the 24px floor WCAG 2.5.8
// sets, and a long way under the 44px a thumb wants. `min-h-[44px]` with
// `-my-3` gives the full 44px of hit area while the line of text sits exactly
// where it always did, because the negative margin cancels the added height in
// the row. The two crumbs are horizontal siblings, so a taller box cannot
// shadow anything above or below them.
const CRUMB = "inline-flex min-h-[44px] items-center -my-3 hover:text-app-textPrimary";

function Breadcrumb({ title }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-app-textSecondary">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        <li>
          <Link href="/" className={CRUMB}>
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/blog" className={CRUMB}>
            Articles
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-app-textPrimary/70 line-clamp-1">{title}</li>
      </ol>
    </nav>
  );
}

function Contents({ headings }) {
  if (!headings?.length) return null;
  return (
    <details className="mt-8 rounded-card border border-app-borderIdle bg-app-surface">
      <summary className="cursor-pointer list-none p-4 text-[15px] font-semibold text-app-textPrimary">
        On this page
        <span aria-hidden="true" className="ml-2 text-app-textSecondary">
          ({headings.length})
        </span>
      </summary>
      <ul className="space-y-2 px-4 pb-4 text-[15px] leading-[1.5]">
        {headings.map((heading) => (
          <li key={heading}>
            <a
              href={`#${slugifyHeading(heading)}`}
              className="text-app-primaryInk underline decoration-app-primary/30 underline-offset-2"
            >
              {heading}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Related({ slugs }) {
  const items = slugs.map(resolveRelated);
  if (!items.length) return null;
  return (
    <section aria-labelledby="related" className="mt-14">
      <h2 id="related" className="scroll-mt-24 text-[22px] font-bold text-app-textPrimary">
        Read next
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.slug}>
            {/* Legacy posts are static HTML outside the router, so they need a
                plain anchor. next/link would try to client-navigate to a route
                that does not exist and land on the 404 shell. */}
            {item.external ? (
              <a
                href={item.href}
                className="block rounded-card border border-app-borderIdle bg-app-surface p-4 transition-colors hover:border-app-primary/40"
              >
                <span className="block text-[16px] font-semibold leading-snug text-app-textPrimary">
                  {item.title}
                </span>
                <span className="mt-1 block text-[14px] leading-[1.5] text-app-textSecondary">
                  {item.description}
                </span>
              </a>
            ) : (
              <Link
                href={item.href}
                className="block rounded-card border border-app-borderIdle bg-app-surface p-4 transition-colors hover:border-app-primary/40"
              >
                <span className="block text-[16px] font-semibold leading-snug text-app-textPrimary">
                  {item.title}
                </span>
                <span className="mt-1 block text-[14px] leading-[1.5] text-app-textSecondary">
                  {item.description}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ArticleShell({ post, headings, children }) {
  const sources = resolveSources(post.sources);

  return (
    <article className="mx-auto w-full max-w-[42rem] px-5 pb-4 pt-6">
      <Breadcrumb title={post.title} />

      <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.08em] text-app-primaryInk">
        {post.category}
      </p>
      <h1 className="mt-2 text-[30px] sm:text-[38px] font-bold leading-[1.15] tracking-[-0.02em] text-app-textPrimary">
        {post.title}
      </h1>
      <Byline updated={post.updated} readingMinutes={post.readingMinutes} />

      <KeyTakeaways items={post.keyTakeaways} />
      <Contents headings={headings} />

      <div className="mt-2">{children}</div>

      <AppCTA line={post.ctaLine} />
      <FAQ items={post.faq} />
      <SourceList sources={sources} />
      <ReviewStatus updated={post.updated} />
      <Related slugs={post.related} />
    </article>
  );
}
