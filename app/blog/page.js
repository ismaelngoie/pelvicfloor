import Link from "next/link";
import { POSTS, postHref } from "@/lib/blog/posts";
import { LEGACY_POSTS, legacyHref } from "@/lib/blog/legacyPosts";

const SITE = "https://pelvi.health";

// This route replaces the old public/blog/index.html, which was a black
// particle-canvas page from the previous Astro build that shared no colour, no
// font and no navigation with the site it sat on, and whose only call to action
// sent an organic reader out to the App Store.
//
// It exports as out/blog.html, so it answers 200 at /blog and Cloudflare Pages
// redirects /blog/ to it. Old inbound links to the slashed form still resolve,
// one hop. The sitemap already listed /blog without the slash, so that entry
// stops being a redirect and starts being a page.
export const metadata = {
  title: "Pelvic Health Articles",
  description:
    "Evidence-based guides to pelvic floor training, bladder control, postpartum recovery, pain and menopause. Every clinical claim linked to the guideline it came from.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Pelvic Health Articles | Pelvi Health",
    description:
      "Evidence-based guides to pelvic floor training, bladder control, postpartum recovery, pain and menopause.",
    url: `${SITE}/blog`,
    siteName: "Pelvi Health",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Pelvi Health" }],
  },
};

// Order matters twice over: this is the reading order for a human scanning the
// index, and it is the crawl order for anything that follows the first links it
// finds. Newest and most useful first, then the back catalogue by theme.
const CATEGORY_ORDER = [
  "Pelvic Floor Exercises",
  "Leakproof Control",
  "Postpartum Recovery",
  "Pregnancy Journey",
  "Pain & Relaxation",
  "Sexual Wellness",
  "Core & Breathing",
  "Anatomy & Science",
  "For Men",
  "Fitness & Lifestyle",
];

function PostCard({ href, title, description, category, external }) {
  const inner = (
    <>
      <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-app-primaryInk">
        {category}
      </span>
      <span className="mt-1.5 block text-[18px] font-semibold leading-snug text-app-textPrimary">
        {title}
      </span>
      <span className="mt-1.5 block text-[15px] leading-[1.5] text-app-textSecondary">
        {description}
      </span>
    </>
  );
  const className =
    "block rounded-card border border-app-borderIdle bg-app-surface p-5 transition-colors hover:border-app-primary/40";

  // The legacy posts are static HTML that the router does not know about.
  return external ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/blog#collection`,
        name: "Pelvic Health Articles",
        url: `${SITE}/blog`,
        description: metadata.description,
        inLanguage: "en-US",
        isPartOf: { "@type": "WebSite", "@id": `${SITE}#website` },
        // Only the new articles are listed here. The 53 legacy posts still
        // carry an unverifiable "medically reviewed by" byline in their own
        // markup, and vouching for them from a machine-readable list on the
        // section's entity page is not something to do before they are fixed.
        mainEntity: {
          "@type": "ItemList",
          itemListElement: POSTS.map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE}${postHref(post.slug)}`,
            name: post.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE}/blog#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE}/blog` },
        ],
      },
    ],
  };
}

export default function BlogIndex() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    posts: LEGACY_POSTS.filter((post) => post.category === category),
  })).filter((group) => group.posts.length);

  const listed = new Set(grouped.flatMap((g) => g.posts.map((p) => p.slug)));
  const ungrouped = LEGACY_POSTS.filter((post) => !listed.has(post.slug));

  return (
    <div className="mx-auto w-full max-w-[42rem] px-5 pb-4 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <h1 className="text-[32px] sm:text-[40px] font-bold leading-[1.1] tracking-[-0.02em] text-app-textPrimary">
        Pelvic health, explained properly
      </h1>
      <p className="mt-4 text-[17px] leading-[1.6] text-app-textPrimary/85">
        Guides to pelvic floor training, bladder control, postpartum recovery,
        pain and menopause. Every clinical claim on the newest articles is linked
        to the guideline or the study it came from, so you can check it rather
        than take our word for it.
      </p>
      <p className="mt-3 text-[15px] leading-[1.6] text-app-textSecondary">
        None of it is a diagnosis. If a symptom is new, painful or getting worse,
        start with{" "}
        <Link
          href={postHref("pelvic-floor-red-flags")}
          className="font-medium text-app-primaryInk underline decoration-app-primary/40 underline-offset-2"
        >
          the red flags
        </Link>
        .
      </p>

      <section aria-labelledby="latest" className="mt-10">
        <h2
          id="latest"
          className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary"
        >
          Latest, and fully sourced
        </h2>
        <ul className="mt-4 space-y-3">
          {POSTS.map((post) => (
            <li key={post.slug}>
              <PostCard
                href={postHref(post.slug)}
                title={post.title}
                description={post.description}
                category={post.category}
              />
            </li>
          ))}
        </ul>
      </section>

      {grouped.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`cat-${group.category.replace(/\W+/g, "-")}`}
          className="mt-12"
        >
          <h2
            id={`cat-${group.category.replace(/\W+/g, "-")}`}
            className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary"
          >
            {group.category}
          </h2>
          <ul className="mt-4 space-y-3">
            {group.posts.map((post) => (
              <li key={post.slug}>
                <PostCard
                  href={legacyHref(post.slug)}
                  title={post.title}
                  description={post.description}
                  category={post.category}
                  external
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {ungrouped.length ? (
        <section aria-labelledby="cat-more" className="mt-12">
          <h2
            id="cat-more"
            className="text-[13px] font-bold uppercase tracking-[0.08em] text-app-textSecondary"
          >
            More
          </h2>
          <ul className="mt-4 space-y-3">
            {ungrouped.map((post) => (
              <li key={post.slug}>
                <PostCard
                  href={legacyHref(post.slug)}
                  title={post.title}
                  description={post.description}
                  category={post.category || "Pelvic Health"}
                  external
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
