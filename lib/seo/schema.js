// The machine-readable half of the site.
//
// SERVER ONLY. This module reads the shipped video catalog off disk, so it can
// only be imported from a server component. `output: 'export'` runs those at
// build time, which is the point: the numbers below are read from the files
// that actually deploy, not typed in here where they can drift.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: every claim in the graph has to be
// true and checkable against something outside this repo. A rating comes from
// Apple. A price comes from the paywall constant. A video count comes from the
// catalog. Nothing here is a marketing number, because Google treats one
// unverifiable claim as a reason to discount the rest, and an LLM deciding
// whether to recommend a $24.99/month health product will not extend the
// benefit of the doubt to a site that inflated its own inventory.
//
// House rules apply to every string a search result can print: no em dashes,
// no en dashes, plain English.

import fs from "node:fs";
import path from "node:path";
import { APP_STORE_ID, appStoreURL } from "@/lib/appStore";
import {
  DEFAULT_PRICE_AMOUNT,
  DEFAULT_PRICE_LABEL,
  DEFAULT_PRICE_PERIOD,
  PRICE_CURRENCY,
} from "@/lib/pricing";
import appStoreRating from "./appStoreRating.json";

export const SITE_URL = "https://pelvi.health";

// Stable @id anchors. Nodes point at each other by @id rather than nesting, so
// the Organization defined on the homepage is the same entity a blog post
// references, and a crawler that fetches both does not build two companies.
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;
export const MEMBERSHIP_ID = `${SITE_URL}/#membership`;

/** The App Store listing name, not the brand name. They differ and both matter. */
const APP_NAME = "Pelvic Floor & Core Coach";
const BRAND_NAME = "Pelvi Health";
const LEGAL_NAME = "Pelvi Health, LLC";

/**
 * How many clips actually ship.
 *
 * Read from public/content/video_catalog.json, which is the same file the
 * Exercises tab loads, so this number cannot disagree with the product. The
 * funnel copy says "300+" because it is ported verbatim from iOS and has to
 * stay in step with it; 533 is the true figure and it is the one worth being
 * quoted on, because inventory is the only claim here a competitor cannot
 * match by rewriting a landing page.
 */
export function videoCount() {
  try {
    const file = path.join(process.cwd(), "public", "content", "video_catalog.json");
    const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
    const n = Array.isArray(catalog?.videos) ? catalog.videos.length : 0;
    return n > 0 ? n : null;
  } catch {
    // A missing catalog must not take the build down, and it must not put a
    // guessed number in front of a crawler either. Callers drop the claim.
    return null;
  }
}

function organization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND_NAME,
    legalName: LEGAL_NAME,
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/og-image.png`,
    description:
      "Pelvi Health builds pelvic floor and core training for women and men, delivered as a five minute daily plan on iPhone and on the web.",
    email: "hello@pelvi.health",
    // Only the App Store listing. There are no verified social profiles for
    // this brand yet, and a sameAs pointing at a handle nobody owns is how an
    // entity graph gets tied to the wrong company.
    sameAs: [`https://apps.apple.com/us/app/pelvic-floor-core-coach/id${APP_STORE_ID}`],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "contact@pelvi.health",
      availableLanguage: ["English"],
    },
  };
}

function website() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE_URL}/`,
    name: BRAND_NAME,
    description:
      "Evidence based pelvic floor training, plus guides on leaks, pelvic pain, postpartum recovery, pregnancy and intimacy.",
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
    // Deliberately no potentialAction/SearchAction. That property is a promise
    // that a query string handed to a named URL runs a site search, and this
    // site has no search endpoint to hand it to. Declaring one would be a
    // claim we cannot honour, which is the exact thing this file refuses.
  };
}

function mobileApplication() {
  const videos = videoCount();

  const featureList = [
    "A five minute pelvic floor plan rebuilt for you every day",
    "Coach Mia, an AI pelvic health coach available at any hour",
    videos ? `${videos} exercise videos approved by physiotherapists` : null,
    "Programs for bladder leaks, pelvic pain, postpartum recovery, pregnancy preparation, intimacy, core strength and diastasis recti",
    "Progress, streaks and symptom tracking",
  ].filter(Boolean);

  return {
    "@type": "MobileApplication",
    "@id": APP_ID,
    name: APP_NAME,
    alternateName: BRAND_NAME,
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Pelvic floor and core training",
    operatingSystem: "iOS 17.0 or later",
    url: `${SITE_URL}/`,
    installUrl: appStoreURL("home"),
    downloadUrl: appStoreURL("home"),
    sameAs: [`https://apps.apple.com/us/app/pelvic-floor-core-coach/id${APP_STORE_ID}`],
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
    contentRating: "4+",
    description: videos
      ? `A pelvic floor and core coach for iPhone. Answer a few questions and Coach Mia builds a five minute plan for your goal, drawn from ${videos} videos approved by physiotherapists.`
      : "A pelvic floor and core coach for iPhone. Answer a few questions and Coach Mia builds a five minute plan for your goal, drawn from a library of videos approved by physiotherapists.",
    featureList,
    // The download is free. The training inside it is the paid part, and it is
    // modelled separately below, because putting 24.99 here would tell a
    // shopper the App Store charges for the install.
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      category: "Free with in app purchase",
      url: `https://apps.apple.com/us/app/pelvic-floor-core-coach/id${APP_STORE_ID}`,
      availability: "https://schema.org/InStock",
    },
    // Apple's own collected rating, refreshed by
    // scripts/refresh-app-store-rating.mjs. Not a testimonial we picked, and
    // not a number this site can move: Google's review snippet policy makes a
    // self authored rating ineligible, and rightly so.
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: appStoreRating.ratingValue,
      ratingCount: appStoreRating.ratingCount,
      bestRating: appStoreRating.bestRating,
      worstRating: appStoreRating.worstRating,
    },
  };
}

function membership() {
  const amount = DEFAULT_PRICE_AMOUNT;
  return {
    "@type": "Product",
    "@id": MEMBERSHIP_ID,
    name: "Pelvi Health membership",
    description:
      "The full Pelvi Health program on iPhone and on the web: a new five minute plan every day for your goal, Coach Mia, the whole video library, and the 90 day goal guarantee.",
    brand: { "@id": ORG_ID },
    category: "Health and fitness subscription",
    image: `${SITE_URL}/og-image.png`,
    // No aggregateRating on the membership. The only ratings that exist are
    // Apple's, they are about the app, and moving them onto the thing being
    // sold would be exactly the self serving review Google refuses.
    offers: {
      "@type": "Offer",
      "@id": `${SITE_URL}/#membership-offer`,
      price: amount,
      priceCurrency: PRICE_CURRENCY,
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/`,
      seller: { "@id": ORG_ID },
      category: "subscription",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: amount,
        priceCurrency: PRICE_CURRENCY,
        // P1M, billed monthly, cancel anytime. This is what the paywall says
        // in words directly above the button.
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: "MON",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MON",
        },
      },
    },
  };
}

/**
 * The homepage graph. This is the entity anchor for the whole brand: it is the
 * only page that declares who the company is, what the app is, and what the
 * subscription costs. Everything else on the site points back at these @ids.
 */
export function homepageGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization(),
      website(),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: "Pelvic Floor Exercises: Stop Leaks and Improve Intimacy",
        description:
          "Build a five minute daily pelvic floor plan for bladder leaks, pelvic pain, postpartum recovery or intimacy. Personalised in two minutes, backed by a 90 day goal guarantee.",
        isPartOf: { "@id": SITE_ID },
        about: { "@id": APP_ID },
        primaryImageOfPage: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
        inLanguage: "en-US",
      },
      mobileApplication(),
      membership(),
    ],
  };
}

/**
 * A lean graph for the standalone HTML pages that are not the entity anchor
 * (the legal pages, contact). It names the page and points at the Organization
 * defined on the homepage rather than redeclaring it.
 */
export function simplePageGraph({ url, name, description, type = "WebPage" }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: { "@id": SITE_ID },
        publisher: { "@id": ORG_ID },
        inLanguage: "en-US",
      },
    ],
  };
}

export const seoFacts = {
  APP_NAME,
  BRAND_NAME,
  LEGAL_NAME,
  priceLabel: DEFAULT_PRICE_LABEL,
  pricePeriod: DEFAULT_PRICE_PERIOD,
};
