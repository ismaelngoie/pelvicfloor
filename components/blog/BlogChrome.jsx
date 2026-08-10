// The header and footer every /blog page wears.
//
// The root layout owns the scroll container: <body> is fixed and only <main>
// scrolls, because the funnel is a phone-shaped app shell. That is fine for an
// article as long as nothing in here is sticky or fixed. A sticky header inside
// an already-fixed frame is how you lose 60px of a 375px screen on every scroll,
// and phones are 98% of the traffic.
//
// The logo links to "/" and so does the read CTA, because "/" is the funnel and
// the funnel is the only thing on this domain that takes money. There is no
// App Store link here on purpose: the legacy posts send every reader straight
// out to the App Store, which spends an organic visit on a listing page instead
// of on the eight-question funnel we control.

import Link from "next/link";

export function BlogHeader() {
  return (
    <header className="border-b border-app-borderIdle bg-app-surface/70">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-[7px]"
          />
          <span className="text-[16px] font-bold tracking-[-0.01em] text-app-textPrimary">
            Pelvi Health
          </span>
        </Link>
        <Link
          href="/blog"
          className="text-[14px] font-semibold text-app-primaryInk"
        >
          All articles
        </Link>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-app-borderIdle bg-app-surface/70">
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <p className="text-[13px] leading-[1.6] text-app-textSecondary">
          <strong className="font-semibold text-app-textPrimary/80">
            Medical disclaimer.
          </strong>{" "}
          Pelvi Health publishes general education about pelvic health. It is not
          medical advice, it is not a diagnosis, and no article here can know
          what is happening in your body. If something hurts, if something is
          bleeding, or if a symptom is new and you do not know why, see a doctor
          or a pelvic health physiotherapist.
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          <Link href="/blog" className="text-app-textPrimary/80">
            Articles
          </Link>
          <Link href="/" className="text-app-textPrimary/80">
            Build my plan
          </Link>
          <a href="/contact.html" className="text-app-textPrimary/80">
            Contact
          </a>
          {/* Link, not <a>: both are app router pages now. The 53 legacy posts
              in public/blog still use plain anchors and have been repointed at
              the same two URLs. */}
          <Link href="/privacy-policy" className="text-app-textPrimary/80">
            Privacy
          </Link>
          <Link href="/terms" className="text-app-textPrimary/80">
            Terms
          </Link>
        </nav>
        <p className="mt-6 text-[13px] text-app-textSecondary">
          &copy; {new Date().getFullYear()} Pelvi Health
        </p>
      </div>
    </footer>
  );
}
