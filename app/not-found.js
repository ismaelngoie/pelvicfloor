import Link from "next/link";

// The 404, which until now was Next's stock one: black Helvetica on white,
// "404 | This page could not be found", and no way back to the site.
//
// It is not a rare screen here. There are 53 legacy blog URLs with trailing
// slashes, a handful of 301s in public/_redirects, the old /dashboard and
// /terms-of-use paths, and an App Store listing and 53 article footers that
// point at URLs this rebuild moved. Anyone who lands slightly wrong currently
// hits a dead end with no header, no footer and no link, which on a site about
// to spend money on ads is a paid click thrown away.
//
// Two doors and no more: the funnel, which is the only thing on this domain
// that takes money, and the blog, which is where somebody who arrived from a
// search result actually wanted to be.
//
// This file is exported to out/404.html, which is what Cloudflare Pages serves
// for any unmatched path. It renders inside the root layout, so it inherits the
// scroll container, the safe-area padding and the font. Clarity does not run on
// it: the gate in lib/analytics.js is deny-by-default and no 404 path is in the
// allowlist.

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-5 pb-16 pt-16 text-center tab:pt-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon.png"
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 rounded-[16px] shadow-sm"
      />

      <p className="mt-7 text-[13px] font-bold uppercase tracking-[0.1em] text-app-primaryInk">
        Page not found
      </p>

      <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.4px] text-app-textPrimary">
        We cannot find that page.
      </h1>

      <p className="mt-3 text-[16px] leading-relaxed text-app-textSecondary">
        The link may be old, or it may have a typo in it. Your plan and your
        account are safe. Pick up from one of these.
      </p>

      <div className="mt-8 flex w-full flex-col gap-2.5">
        <Link
          href="/"
          className="flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-[0_6px_16px_rgba(230,84,115,0.35)] transition-transform active:scale-[0.98]"
        >
          Start my 5-min journey
        </Link>
        <Link
          href="/blog"
          className="flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-app-primaryInk"
        >
          Read the pelvic health articles
        </Link>
      </div>

      <p className="mt-8 text-[13px] leading-relaxed text-app-textSecondary">
        Already a member?{" "}
        {/* A plain anchor, not next/link, for the same reason as the one on
            /welcome: /app must arrive as a fresh document so the Clarity gate
            in app/Clarity.jsx is re-evaluated on a page the recorder was never
            injected into. See the note in app/welcome/WelcomeClient.jsx. */}
        <a
          href="/app"
          className="font-semibold text-app-primaryInk underline underline-offset-2"
        >
          Open your plan
        </a>
        .
      </p>

      <p className="mt-2 text-[13px] leading-relaxed text-app-textSecondary">
        Stuck?{" "}
        <a
          href="mailto:contact@pelvi.health"
          className="font-semibold text-app-primaryInk underline underline-offset-2"
        >
          contact@pelvi.health
        </a>
      </p>
    </div>
  );
}
