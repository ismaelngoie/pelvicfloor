import { notFound } from "next/navigation";
import ArticleShell from "@/components/blog/ArticleShell";
import { ARTICLES } from "@/content/articles";
import { POSTS, POSTS_BY_SLUG, postHref } from "@/lib/blog/posts";
import { resolveSources } from "@/lib/blog/sources";
import { REVIEWER } from "@/components/blog/ReviewStatus";

const SITE = "https://pelvi.health";

// Static export needs the full list up front. Only slugs in lib/blog/posts.js
// are generated here; the 53 older posts are static HTML that Cloudflare serves
// straight out of public/blog and this route never sees them.
export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

// Next 15 hands `params` over as a promise. Reading it synchronously still
// works in 15.1 but logs a deprecation on every prerendered page, and there are
// eight of them.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = POSTS_BY_SLUG[slug];
  if (!post) return {};
  const url = `${SITE}${postHref(post.slug)}`;
  return {
    title: post.title,
    description: post.description,
    // No trailing slash. These export as blog/<slug>.html, which Cloudflare
    // Pages serves at the bare path and redirects the slashed form to. The
    // canonical has to name the URL that answers 200, not the one that hops.
    alternates: { canonical: postHref(post.slug) },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: "Pelvi Health",
      publishedTime: post.published,
      modifiedTime: post.updated,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

/**
 * The structured data.
 *
 * Deliberate choices, each of which is easy to get wrong in a way that costs
 * more than it earns:
 *
 *  - @type is both Article and MedicalWebPage. MedicalWebPage earns no rich
 *    result at all (it is not in Google's search gallery), but it is the only
 *    vocabulary that can say who reviewed a health page and when, which is the
 *    thing an assistant wants before it cites a commercial site on a YMYL
 *    question.
 *  - There is no `reviewedBy` and no `lastReviewed` until REVIEWER is a real
 *    person. Claiming a clinical review that did not happen is the one SEO
 *    shortcut on this site that is also a regulatory problem. See the note at
 *    the top of components/blog/ReviewStatus.jsx.
 *  - author is the Organization, because that is who actually wrote it.
 *  - isAccessibleForFree is the boolean true, not the string "True" the legacy
 *    posts emit. The articles genuinely are free; the subscription is a separate
 *    product and is described by its own Offer on the marketing pages.
 *  - `citation` carries the real sources. It is the cheapest honest signal on
 *    the page and almost nobody in this category emits it.
 */
function buildJsonLd(post) {
  const url = `${SITE}${postHref(post.slug)}`;
  const sources = resolveSources(post.sources);

  const article = {
    "@type": ["Article", "MedicalWebPage"],
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.description,
    inLanguage: "en-US",
    datePublished: post.published,
    dateModified: post.updated,
    isAccessibleForFree: true,
    articleSection: post.category,
    image: [`${SITE}/og-image.png`],
    author: {
      "@type": "Organization",
      name: "Pelvi Health",
      url: SITE,
    },
    publisher: {
      "@type": "Organization",
      name: "Pelvi Health",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
    medicalAudience: { "@type": "MedicalAudience", audienceType: "Patient" },
    specialty: "PhysicalTherapy",
    citation: sources.map((source) => ({
      "@type": "CreativeWork",
      name: source.label,
      url: source.url,
      ...(source.publisher
        ? { publisher: { "@type": "Organization", name: source.publisher } }
        : {}),
    })),
  };

  if (REVIEWER) {
    article.reviewedBy = {
      "@type": "Person",
      name: REVIEWER.name,
      honorificSuffix: REVIEWER.credentials,
      url: `${SITE}${REVIEWER.url}`,
      ...(REVIEWER.sameAs ? { sameAs: REVIEWER.sameAs } : {}),
    };
    article.lastReviewed = post.updated;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      article,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
      {
        // FAQ rich results stopped rendering in Google Search in May 2026, so
        // this earns nothing in blue links. It stays because FAQPage is still
        // valid schema, it costs nothing, and it is the block AI answers lift
        // most readily. Just do not go looking for it in Search Console.
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const post = POSTS_BY_SLUG[slug];
  const entry = ARTICLES[slug];
  if (!post || !entry) notFound();

  const { Body, headings } = entry;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)) }}
      />
      <ArticleShell post={post} headings={headings}>
        <Body />
      </ArticleShell>
    </>
  );
}
