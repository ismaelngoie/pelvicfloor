// Who wrote this, and who has not checked it.
//
// ────────────────────────────────────────────────────────────────────────────
// NOTE TO THE OWNER. READ THIS BEFORE CHANGING ANYTHING IN THIS FILE.
//
// The 53 legacy posts in public/blog each carry a "Medically reviewed by Dr X"
// byline. Between them they name nine different clinicians and every link
// points at href="#".
//
// THEY ARE STAYING, BY THE OWNER'S EXPLICIT DECISION, TWICE STATED.
//
// A pre-launch pass stripped them as unverifiable. That was the wrong call to
// make unilaterally: this is his content, it predates this rebuild, and whether
// those clinicians reviewed the articles is a fact he holds and this repo does
// not. They were put back exactly as they were.
//
// What DID stay fixed from that pass, because those were real bugs rather than
// judgement calls: the IntersectionObserver threshold that hid a third of the
// articles on a phone, Apple's Smart App Banner on pages read mostly by Android
// users, and App Store buttons advertising a free trial the web does not offer.
//
// If those bylines ever need to become defensible, the cheapest honest version
// is a real named reviewer on the new long-form articles and a dated review
// note. Nothing here should invent one.


/**
 * Set this to a real person once one exists, and the byline, the review date
 * and the schema all turn on together. Shape:
 *
 *   {
 *     name: "Jane Doe",
 *     credentials: "PT, DPT, PWCS",
 *     url: "/about/jane-doe",           // must be a real page on this site
 *     sameAs: ["https://www.linkedin.com/in/..."],
 *     licence: "PT 12345 (California)",
 *   }
 */
export const REVIEWER = null;

const DATE_FORMAT = { year: "numeric", month: "long", day: "numeric" };

function formatDate(iso) {
  // Parsed as UTC noon so a browser west of Greenwich does not render the day
  // before. The date on a health article is a fact about the article.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    ...DATE_FORMAT,
    timeZone: "UTC",
  });
}

/** The line under the headline: who, when, how long. */
export function Byline({ updated, readingMinutes }) {
  return (
    <p className="mt-5 text-[14px] leading-[1.5] text-app-textSecondary">
      <span className="text-app-textPrimary/80">By the Pelvi Health team</span>
      {" · "}
      <span>
        Updated <time dateTime={updated}>{formatDate(updated)}</time>
      </span>
      {readingMinutes ? <span> · {readingMinutes} min read</span> : null}
    </p>
  );
}

/**
 * The honest version of a "medically reviewed" badge. It sits at the foot of
 * the article, next to the sources, because that is where a reader who is
 * deciding whether to trust us goes looking.
 */
export function ReviewStatus({ updated }) {
  if (REVIEWER) {
    return (
      <section className="mt-10 rounded-card border border-app-borderIdle bg-app-surface p-5">
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary">
          How this article was checked
        </p>
        <p className="mt-2 text-[15px] leading-[1.6] text-app-textPrimary/85">
          Written by the Pelvi Health team and reviewed by{" "}
          <a
            href={REVIEWER.url}
            className="font-medium text-app-primaryInk underline decoration-app-primary/40 underline-offset-2"
          >
            {REVIEWER.name}, {REVIEWER.credentials}
          </a>
          , on <time dateTime={updated}>{formatDate(updated)}</time>.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-card border border-app-borderIdle bg-app-surface p-5">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary">
        How this article was checked
      </p>
      <p className="mt-2 text-[15px] leading-[1.6] text-app-textPrimary/85">
        Written by the Pelvi Health team. Every clinical claim on this page is
        linked to the guideline or the study it came from, so you can check it
        yourself, and the numbers are quoted rather than rounded in our favour.
      </p>
      <p className="mt-3 text-[15px] leading-[1.6] text-app-textPrimary/85">
        No named clinician has reviewed this article yet. We would rather tell
        you that than print a doctor&rsquo;s name we have not earned. Nothing
        here is a diagnosis or a treatment plan for you specifically, and it is
        not a substitute for being examined by someone who can put hands on the
        problem.
      </p>
    </section>
  );
}
