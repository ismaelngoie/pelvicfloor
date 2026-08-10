// Who wrote this, and who has not checked it.
//
// ────────────────────────────────────────────────────────────────────────────
// NOTE TO THE OWNER. READ THIS BEFORE CHANGING ANYTHING IN THIS FILE.
//
// All 53 posts in public/blog USED TO carry a "Medically reviewed by Dr. X"
// byline. Between them they named NINE different clinicians, and all 53 links
// pointed at href="#":
//
//   32  Dr. Evelyn Reed, DPT, WCS          2  Dr. Marcus Thorne, PT, DPT
//    6  Dr. Eleanor Vance, PT, DPT, WCS    2  Dr. Isabella Rossi, PT, DPT, PRPC
//    5  Dr. Chloe Sterling, PT, DPT        2  Dr. Anya Desai, RDN, LDN
//    2  Dr. Samuel Chen, DPT, OCS          1  Dr. Marcus Hale, PT, DPT
//                                          1  Dr. Laura Keyser, PT, DPT
//
// Nobody on this project can point at a contract, a licence number or a review
// date for any of them, and none of the names resolves to a findable, licensed
// pelvic health clinician. Nine reviewers with no destination is not an
// oversight in one file; it is the signature of names that were generated.
//
// The new articles deliberately do NOT carry a reviewer byline, because putting
// a clinician's name on a page she has not read is not an SEO shortcut, it is a
// fabricated clinical credential on a page that sells a health subscription.
// That is an FTC and state-licensing exposure, and it is the one problem on this
// site that no amount of structured data survives.
//
// What to do instead, in order of value:
//
//   1. Contract one real, licensed pelvic health physiotherapist. Pay her to
//      actually read these eight articles. This is worth more for ranking than
//      every other item on the SEO backlog combined: Google's 2026 systems check
//      a schema-claimed author against Wikidata, LinkedIn and professional
//      registries, and a name that fails that check is an active negative signal
//      on YMYL content, not a neutral one.
//   2. Give her an entity home: /about/<her-name> with her licence number and
//      state or HCPC number, her practice, her LinkedIn, and a photo.
//   3. Then, and only then, set REVIEWER below to a real object. The byline, the
//      per-article review date and the MedicalWebPage `reviewedBy` block all
//      switch on together from that one constant, here and in
//      app/blog/[slug]/page.js.
//   4. DONE, at the pre-launch gate. The unverifiable byline was stripped out
//      of all 53 legacy posts in public/blog. "Last updated: <date>" stayed,
//      because that part was true; the reviewer clause and its href="#" link
//      are gone, and none of those files ever carried a `reviewedBy` in their
//      JSON-LD, so there was nothing to clean up there. The whole site now
//      makes one claim about clinical review, and that claim is none.
//      Put the byline back only together with step 3.
//
// Note also that the credential string on the legacy posts is out of date
// regardless of who wrote it: APTA Pelvic Health retired "WCS" in favour of
// "PWCS". If a real reviewer signs these, use the current letters.
// ────────────────────────────────────────────────────────────────────────────

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
