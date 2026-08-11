// The shell both legal pages sit in.
//
// Why a shell rather than two standalone pages: /privacy-policy and /terms are
// the two URLs Google Ads and Meta actually open before they approve an
// account, and the two a member opens when she is deciding whether to trust us
// with her card. They have to look like the same company wrote them on the
// same day. One shell is the only way that stays true after the third edit.
//
// This is a SERVER component on purpose. Nothing here is interactive, so
// shipping it as a client component would send React for a page of text.
//
// Layout note, and it is not optional: app/layout.js locks <body> and makes
// <main> the only scroll container. A page inside it must use `min-h-full`.
// `min-h-screen` measures the viewport, not the container, so it produces a
// page that is taller than the box it scrolls in and clips its own last line.
// The Cora policy already learned this; see app/cora/privacy-policy/page.js.
//
// House style, non-negotiable and it applies to every word on these pages: no
// em dashes and no en dashes anywhere a member can read.

import Link from "next/link";

// The typography is written out as arbitrary variants rather than `prose`
// because @tailwindcss/typography is NOT installed in this repo. The Cora page
// carries `prose prose-gray prose-lg` classes that do nothing at all; only its
// [&_h2] selectors are really styling it. Do not copy the `prose` classes over.
const BODY = [
  "text-[16px] leading-[1.65] text-app-textSecondary",
  "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-6 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:leading-[1.25] [&_h2]:tracking-[-0.01em] [&_h2]:text-app-textPrimary",
  "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-app-textPrimary",
  "[&_p]:mt-4",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
  "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
  "[&_strong]:font-semibold [&_strong]:text-app-textPrimary",
  "[&_a]:text-app-primaryInk [&_a]:underline [&_a]:underline-offset-2",
].join(" ");

/**
 * A short, plain summary at the top of the page.
 *
 * It is a summary and nothing more. Nothing lives in here that is not also
 * said in full below, so a member who reads only this box has not been told a
 * different story from the one the sections tell.
 */
export function Summary({ children }) {
  return (
    <div className="mt-10 rounded-[18px] border border-app-primary/20 bg-app-primary/[0.06] px-5 py-5 text-[15px] leading-[1.6] text-app-textPrimary sm:px-6">
      {children}
    </div>
  );
}

/** A quieter box, for a fact that needs to stand out without shouting. */
export function Callout({ children }) {
  return (
    <div className="mt-6 rounded-[18px] border border-app-borderIdle bg-app-surface px-5 py-5 text-[15px] leading-[1.6] text-app-textPrimary sm:px-6">
      {children}
    </div>
  );
}

/**
 * The contents list.
 *
 * Two audiences, and both of them are skimming: an ad reviewer looking for one
 * specific disclosure, and a member looking for the delete button. Neither
 * should have to scroll a long page to find out whether the thing they came
 * for is on it.
 */
export function Contents({ items }) {
  return (
    <nav aria-label="On this page" className="mt-10 rounded-[18px] border border-app-borderIdle bg-app-background px-5 py-5 sm:px-6">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-app-textSecondary">
        On this page
      </p>
      <ol className="mt-3 grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex gap-2">
            <span aria-hidden="true" className="tabular-nums text-app-textSecondary">
              {index + 1}.
            </span>
            <a href={`#${item.id}`} className="text-app-primaryInk underline underline-offset-2">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function LegalPage({ title, subtitle, updated, children }) {
  return (
    <div className="relative min-h-full bg-app-background">
      <div className="relative mx-auto max-w-[46rem] px-6 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] pt-14 pb-16 sm:pt-20">
        <header>
          {/* The only way back out of this page, and it was a 17px tall box at
              320px: under the 24px floor WCAG 2.5.8 sets, never mind the 44px a
              thumb wants. `-my-3` hands the added height straight back, so the
              wordmark sits exactly where it did and the h1 below it does not
              move. */}
          <Link
            href="/"
            className="-my-3 inline-flex min-h-[44px] items-center text-[14px] font-medium text-app-textSecondary hover:text-app-textPrimary"
          >
            Pelvi Health
          </Link>
          <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-app-textPrimary sm:text-[42px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-[17px] leading-[1.5] text-app-textSecondary">{subtitle}</p>
          ) : null}
          <p className="mt-4 text-[14px] text-app-textSecondary">Last updated: {updated}</p>
        </header>

        <div className={BODY}>{children}</div>

        <footer className="mt-16 border-t border-app-borderIdle pt-8 text-[14px] text-app-textSecondary">
          {/* Five 21px rows became five 44px rows. No negative margin here and
              none in the blog footer either: this nav wraps, and a negative
              vertical margin on a wrapping row makes the hit areas of two lines
              overlap, which is a worse bug than the one being fixed. The gap-y
              goes instead, because a 44px box already puts 23px of clear space
              between one line of text and the next. */}
          <nav className="flex flex-wrap gap-x-6">
            <Link href="/" className="inline-flex min-h-[44px] items-center hover:text-app-textPrimary">
              Home
            </Link>
            <Link href="/privacy-policy" className="inline-flex min-h-[44px] items-center hover:text-app-textPrimary">
              Privacy Policy
            </Link>
            <Link href="/terms" className="inline-flex min-h-[44px] items-center hover:text-app-textPrimary">
              Terms
            </Link>
            <a href="/blog" className="inline-flex min-h-[44px] items-center hover:text-app-textPrimary">
              Blog
            </a>
            <a href="mailto:contact@pelvi.health" className="inline-flex min-h-[44px] items-center hover:text-app-textPrimary">
              contact@pelvi.health
            </a>
          </nav>
          {/* No year. It would be frozen at build time by the static export,
              so it is wrong the moment January arrives. Same reason the
              landing page footer drops it. */}
          <p className="mt-5">&copy; Pelvi Health, LLC</p>
        </footer>
      </div>
    </div>
  );
}
