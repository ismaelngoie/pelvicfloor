// The vocabulary an article is written in.
//
// Every export here is a server component on purpose. The whole point of this
// section is that a crawler and a language model can read the words without
// running any JavaScript, so nothing in this file may become interactive. The
// FAQ uses <details>, the table of contents uses anchors, and the callouts are
// divs. If a future block needs state, put "use client" on that block alone and
// leave the rest of the article server-rendered.
//
// Two house rules from the wider codebase apply to everything written with
// these components:
//   1. No em dashes and no en dashes in anything a member reads.
//   2. Copy is subjective where an outcome is uncertain. "Most women notice"
//      is honest. "You will stop leaking" is a promise we cannot keep and the
//      guarantee does not make.

import Link from "next/link";
import { SOURCES } from "@/lib/blog/sources";
import { POSTS_BY_SLUG, postHref } from "@/lib/blog/posts";
import { LEGACY_POSTS, legacyHref } from "@/lib/blog/legacyPosts";

const LEGACY_SLUGS = new Set(LEGACY_POSTS.map((post) => post.slug));

/**
 * Heading ids are what the on-this-page nav and the AI-retrieval anchor links
 * point at, so they are derived from the text rather than hand-written. Two
 * headings with the same words in one article would collide; none do, and the
 * fix if one ever does is to change the heading, not to add a counter.
 */
export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function H2({ children, id }) {
  const anchor = id || slugifyHeading(children);
  return (
    <h2
      id={anchor}
      className="scroll-mt-24 mt-12 mb-3 text-[22px] sm:text-[26px] font-bold leading-snug tracking-[-0.01em] text-app-textPrimary"
    >
      {children}
    </h2>
  );
}

export function H3({ children, id }) {
  const anchor = id || slugifyHeading(children);
  return (
    <h3
      id={anchor}
      className="scroll-mt-24 mt-8 mb-2 text-[17px] sm:text-[19px] font-semibold leading-snug text-app-textPrimary"
    >
      {children}
    </h3>
  );
}

export function P({ children }) {
  return (
    <p className="mt-4 text-[17px] leading-[1.65] text-app-textPrimary/90">
      {children}
    </p>
  );
}

/** The first paragraph. Larger, and the passage most likely to be quoted back. */
export function Lede({ children }) {
  return (
    <p className="mt-5 text-[19px] leading-[1.6] font-medium text-app-textPrimary">
      {children}
    </p>
  );
}

export function UL({ children }) {
  return (
    <ul className="mt-4 space-y-2 text-[17px] leading-[1.6] text-app-textPrimary/90">
      {children}
    </ul>
  );
}

export function OL({ children }) {
  return (
    <ol className="mt-4 space-y-3 text-[17px] leading-[1.6] text-app-textPrimary/90 [counter-reset:step]">
      {children}
    </ol>
  );
}

export function LI({ children }) {
  return (
    <li className="relative pl-6 before:absolute before:left-1 before:top-[0.6em] before:h-[6px] before:w-[6px] before:rounded-full before:bg-app-primary">
      {children}
    </li>
  );
}

export function NumLI({ children }) {
  return (
    <li className="relative pl-9 [counter-increment:step] before:absolute before:left-0 before:top-0 before:flex before:h-6 before:w-6 before:items-center before:justify-center before:rounded-full before:bg-app-primary/10 before:text-[13px] before:font-bold before:text-app-primaryInk before:content-[counter(step)]">
      {children}
    </li>
  );
}

export function Strong({ children }) {
  return <strong className="font-semibold text-app-textPrimary">{children}</strong>;
}

/**
 * An inline citation. Renders the publisher's name as the link text, because
 * "NICE" tells a reader what she is about to open and "[3]" does not.
 */
export function Cite({ id, children }) {
  const source = SOURCES[id];
  if (!source) return children || null;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener nofollow"
      title={source.label}
      className="font-medium text-app-primaryInk underline decoration-app-primary/40 underline-offset-2 hover:decoration-app-primary"
    >
      {children || source.publisher}
    </a>
  );
}

const LINK_CLASS =
  "font-medium text-app-primaryInk underline decoration-app-primary/40 underline-offset-2 hover:decoration-app-primary";

/**
 * An internal link to another article, on either side of the split.
 *
 * This is not a thin wrapper around next/link, and it cannot be. The two
 * generations of post live at different URL shapes and only one of them is a
 * route:
 *
 *   new     /blog/<slug>     an app route, exported as blog/<slug>.html
 *   legacy  /blog/<slug>/    static HTML the router has never heard of
 *
 * Pointing next/link at a legacy slug compiles, renders and looks correct. Then
 * a reader taps it, the client router tries to resolve a route that does not
 * exist, and she lands on the 404 shell. A hard reload of the same URL works
 * fine, which is exactly why that bug survives manual testing.
 *
 * So legacy slugs get a plain anchor and the trailing slash their canonical
 * already declares, and an href matching neither list throws during the build
 * rather than shipping a dead link inside a health article.
 */
export function Xref({ href, children }) {
  const match = /^\/blog\/([^/#?]+)\/?$/.exec(href);
  if (!match) {
    return (
      <Link href={href} className={LINK_CLASS}>
        {children}
      </Link>
    );
  }

  const slug = match[1];
  if (POSTS_BY_SLUG[slug]) {
    return (
      <Link href={postHref(slug)} className={LINK_CLASS}>
        {children}
      </Link>
    );
  }
  if (LEGACY_SLUGS.has(slug)) {
    return (
      <a href={legacyHref(slug)} className={LINK_CLASS}>
        {children}
      </a>
    );
  }

  throw new Error(
    `Xref points at /blog/${slug}, which is neither a post in lib/blog/posts.js nor a folder in public/blog. Fix the slug or add the post.`
  );
}

/**
 * The three or four sentences a reader keeps if she keeps nothing else, and the
 * passage most likely to be lifted whole into an AI answer. Kept short for that
 * reason: a 300-word summary summarises nothing.
 */
export function KeyTakeaways({ items }) {
  return (
    <section
      aria-labelledby="key-takeaways"
      className="mt-8 rounded-card border border-app-borderIdle bg-app-surface p-5"
    >
      <h2
        id="key-takeaways"
        className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary"
      >
        The short answer
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="relative pl-6 text-[16px] leading-[1.55] text-app-textPrimary before:absolute before:left-0 before:top-[0.55em] before:h-[7px] before:w-[7px] before:rounded-full before:bg-app-primary"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

const CALLOUT_STYLES = {
  note: "border-app-borderIdle bg-app-surface",
  safety: "border-app-primary/25 bg-[#FFF5F7]",
  positive: "border-app-positive/25 bg-[#F1FAF4]",
};

export function Callout({ title, tone = "note", children }) {
  return (
    <aside
      className={`mt-6 rounded-card border p-5 ${CALLOUT_STYLES[tone] || CALLOUT_STYLES.note}`}
    >
      {title ? (
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary">
          {title}
        </p>
      ) : null}
      <div className="[&>p:first-child]:mt-2 [&>p]:text-[16px]">{children}</div>
    </aside>
  );
}

/**
 * The block every article on this site is required to carry.
 *
 * It is not a disclaimer and it is not there for us. The single most useful
 * thing a pelvic health article can do for a woman who is in pain or bleeding
 * is tell her plainly that an article is the wrong tool and who the right one
 * is. It sits high enough in the page to be seen without scrolling to the end.
 */
export function SeeSomeone({ title = "See a clinician if any of this is you", items, children }) {
  return (
    <section
      aria-labelledby="see-someone"
      className="mt-10 rounded-card border-2 border-app-primary/30 bg-[#FFF5F7] p-5"
    >
      <h2
        id="see-someone"
        className="text-[17px] font-bold leading-snug text-app-primaryInk"
      >
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={typeof item === "string" ? item : item.key}
            className="relative pl-6 text-[16px] leading-[1.55] text-app-textPrimary before:absolute before:left-0 before:top-[0.5em] before:h-[7px] before:w-[7px] before:rotate-45 before:bg-app-primary"
          >
            {item}
          </li>
        ))}
      </ul>
      {children ? (
        <div className="[&>p]:mt-3 [&>p]:text-[15px] [&>p]:leading-[1.55] [&>p]:text-app-textPrimary/85">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** A number worth remembering, pulled out of the prose so it can be scanned. */
export function Figure({ value, label, sourceId }) {
  const source = sourceId ? SOURCES[sourceId] : null;
  return (
    <div className="mt-6 rounded-card border border-app-borderIdle bg-app-surface p-5">
      <p className="text-[30px] font-bold leading-none tracking-[-0.02em] text-app-primaryInk">
        {value}
      </p>
      <p className="mt-2 text-[15px] leading-[1.5] text-app-textPrimary/85">{label}</p>
      {source ? (
        <p className="mt-2 text-[13px] leading-[1.45] text-app-textSecondary">
          Source:{" "}
          <a
            href={source.url}
            target="_blank"
            rel="noopener nofollow"
            className="underline decoration-app-textSecondary/40 underline-offset-2"
          >
            {source.label}
            {source.year ? `, ${source.year}` : ""}
          </a>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Tables are the one block that breaks on a 375px screen, and 375px is 98% of
 * the traffic.
 *
 * The first version set a min-width and let the wrapper scroll sideways. It
 * measured fine (the page itself never scrolled horizontally) and it was still
 * wrong: on a phone the third column was simply off the edge, with no fade, no
 * arrow, and on iOS no visible scrollbar until you already happen to be
 * scrolling. A reader looking at the ICIQ table saw the questions and never saw
 * the scores, which is the entire point of that table.
 *
 * So below `sm` each row becomes its own stacked card and every value is
 * labelled by the column it came from, via ::before and data-label. The label
 * text is a CSS pseudo-element, so it exists once in the CSS and not twice in
 * the DOM: the markup a crawler reads is still one clean <table> with real <th>
 * headers. Those headers are visually hidden rather than display:none on
 * mobile, so a screen reader still meets them.
 *
 * At `sm` and up it is an ordinary table again. `overflow-x-auto` stays as a
 * backstop for a future table with genuinely unbreakable content.
 */
export function Table({ head, rows, caption }) {
  return (
    <figure className="mt-6">
      <div className="overflow-x-auto rounded-card border border-app-borderIdle bg-app-surface">
        <table className="w-full border-collapse text-left text-[15px]">
          <thead className="sr-only sm:not-sr-only">
            <tr className="sm:border-b sm:border-app-borderIdle sm:bg-[#FBFAFB]">
              {head.map((cell) => (
                <th
                  key={cell}
                  scope="col"
                  className="px-4 py-3 font-semibold text-app-textPrimary"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {rows.map((row, rowIndex) => (
              <tr
                key={row[0] + rowIndex}
                className="block border-b border-app-borderIdle/70 last:border-0 sm:table-row sm:align-top"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    data-label={head[cellIndex]}
                    className={`block px-4 pb-3 leading-[1.5] first:pt-3 sm:table-cell sm:py-3 sm:before:hidden
                      before:mb-0.5 before:block before:text-[12px] before:font-bold before:uppercase before:tracking-[0.06em] before:text-app-textSecondary before:content-[attr(data-label)]
                      ${
                        cellIndex === 0
                          ? "font-medium text-app-textPrimary"
                          : "text-app-textPrimary/85"
                      }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className="mt-2 text-[13px] leading-[1.5] text-app-textSecondary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The one place an article is allowed to sell.
 *
 * It links to "/", which is the onboarding funnel, and it says what the product
 * is rather than what it will do for her. The outcome claims live in the
 * guarantee copy, which is legally load-bearing, and they are not repeated here
 * where they would be unconditioned.
 */
export function AppCTA({ line }) {
  return (
    <aside className="mt-10 overflow-hidden rounded-card border border-app-borderIdle bg-app-surface">
      <div className="p-5">
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary">
          From the people who wrote this
        </p>
        <p className="mt-2 text-[17px] font-semibold leading-snug text-app-textPrimary">
          Pelvi builds you a 90-day plan and then walks you through it, five
          minutes at a time.
        </p>
        <p className="mt-2 text-[15px] leading-[1.55] text-app-textPrimary/85">
          {line ||
            "Nine goals, a 90-day program behind each one, and 533 filmed exercises so you can see the movement instead of reading it. Answer eight questions and you will see the plan before you pay for anything."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex w-full items-center justify-center rounded-pill bg-cta-gradient px-6 py-3.5 text-[16px] font-semibold text-white"
        >
          Build my plan
        </Link>
      </div>
    </aside>
  );
}

/**
 * FAQPage markup is emitted separately in the route. This is the visible half.
 * <details> so it costs no JavaScript and stays readable with scripts off, and
 * the answers are in the HTML either way, which is the part that gets cited.
 */
export function FAQ({ items }) {
  return (
    <section aria-labelledby="faq" className="mt-14">
      <h2 id="faq" className="scroll-mt-24 text-[22px] sm:text-[26px] font-bold text-app-textPrimary">
        Questions people ask next
      </h2>
      <div className="mt-4 divide-y divide-app-borderIdle overflow-hidden rounded-card border border-app-borderIdle bg-app-surface">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 text-[16px] font-semibold text-app-textPrimary">
              <span>{item.q}</span>
              <span
                aria-hidden="true"
                className="mt-1 shrink-0 text-app-primary transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-4 pb-4 text-[16px] leading-[1.6] text-app-textPrimary/85">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function SourceList({ sources }) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby="sources" className="mt-14">
      <h2 id="sources" className="scroll-mt-24 text-[22px] font-bold text-app-textPrimary">
        Sources
      </h2>
      <ol className="mt-4 space-y-4">
        {sources.map((source) => (
          <li key={source.id} className="text-[15px] leading-[1.55]">
            <a
              href={source.url}
              target="_blank"
              rel="noopener nofollow"
              className="font-medium text-app-primaryInk underline decoration-app-primary/40 underline-offset-2"
            >
              {source.label}
              {source.year ? `. ${source.year}.` : "."}
            </a>
            <span className="mt-1 block text-app-textSecondary">{source.note}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
