// Paywall copy, ported from the iOS SubscriptionViewController.
//
// Source of truth: "Pelvic Floor/Scene/Onboarding/Controllers/SubscriptionViewController.swift".
// On iOS every one of these tables is keyed by the goal's DISPLAY TITLE
// ("Stop Bladder Leaks"). Here they are keyed by the goal ID from lib/program.js
// instead, because a display string is a terrible primary key and the two apps
// already agree on the IDs.
//
// This copy converts. Do not "improve" it. If a line changes here it has to
// change on iOS in the same release, or the two products promise different
// things to the same member.
//
// House rules: no em dashes, no en dashes, plain English.

/** The button label on the money screen. */
export function ctaLabel(goalId) {
  switch (goalId) {
    case "bladderLeaks":
      return "Start My Leak-Free Plan";
    case "pelvicPain":
      return "Start My Pain-Relief Plan";
    case "intimacy":
      return "Start My Intimacy Plan";
    case "postpartum":
      return "Start My Postpartum Plan";
    case "pregnancyPrep":
      return "Start My Pregnancy Prep";
    case "coreStrength":
      return "Start My Core Plan";
    case "fitness":
      return "Start My Fitness Plan";
    case "stability":
      return "Start My Stability Plan";
    case "diastasisRecti":
      return "Start My Gap-Healing Plan";
    default:
      return "Start My Personal Plan";
  }
}

/**
 * "Your Personalized Plan Includes:" showcase.
 *
 * Item 1 is the goal's own promise. Items 2 to 5 are the same for everyone, in
 * this order, and the last one is the guarantee restated as a feature.
 *
 * `icon` is a key into ICONS in components/funnel/Paywall.jsx, which maps it to
 * the closest lucide glyph for the SF Symbol iOS uses.
 */
export function showcaseItems(goalId) {
  const first = {
    bladderLeaks: { icon: "drop", text: "Cough, laugh and run without leaking" },
    pelvicPain: { icon: "bandage", text: "Sit and move without pain" },
    intimacy: { icon: "heart", text: "Feel more, worry less" },
    postpartum: { icon: "baby", text: "Rebuild your core gently after birth" },
    pregnancyPrep: { icon: "leaf", text: "Go into pregnancy strong and ready" },
    fitness: { icon: "trophy", text: "More power in every workout" },
    stability: { icon: "stand", text: "Stand taller, feel steadier" },
    diastasisRecti: { icon: "gap", text: "Close your tummy gap without surgery" },
  }[goalId] || { icon: "bolt", text: "A deep core that holds you up" };

  return [
    first,
    { icon: "timer", text: "5-minute plans made for you" },
    { icon: "videos", text: "500+ videos approved by physios" },
    { icon: "progress", text: "See your progress and your streak" },
    { icon: "shield", text: "90 days. Or you don't pay for them." },
  ];
}

// The five review avatars, cycled in the order iOS cycles them
// (Assets.xcassets/Subscription: review9, review1, review5, review4, review2).
const AVATARS = ["/review9.png", "/review1.png", "/review5.png", "/review4.png", "/review2.png"];

const REVIEWS = {
  bladderLeaks: [
    ["Emily D.", "Week 1 I laughed and stayed dry"],
    ["Dana A.", "Pads live in a drawer now"],
    ["Hannah L.", "I jogged today and stayed dry"],
    ["Priya S.", "Bathroom maps deleted I feel free"],
    ["Zoe M.", "My bladder finally listens to me"],
  ],
  pelvicPain: [
    ["Laura P.", "Meetings passed without that deep ache"],
    ["Ana R.", "I enjoyed intimacy without flinching"],
    ["Katie B.", "Gentle moves gave real relief"],
    ["Mia K.", "I woke up calm not burning"],
    ["Jen C.", "I lifted my toddler without bracing"],
  ],
  postpartum: [
    ["Sarah W.", "Week 2 stronger steadier with baby"],
    ["Michelle T.", "My core feels connected again"],
    ["Chloe N.", "From leaks to laughter with my baby"],
    ["Olivia G.", "Recovery finally makes sense"],
    ["Jess P.", "Five minutes I actually keep"],
  ],
  pregnancyPrep: [
    ["Kara D.", "Breath is calm belly supported"],
    ["Ivy S.", "Hips opened and sleep returned"],
    ["Bella R.", "Week 2 my core feels ready"],
    ["Nora P.", "Movements finally feel safe"],
    ["June K.", "I feel ready for our baby"],
  ],
  coreStrength: [
    ["Allison J.", "Plank feels steady and strong"],
    ["Keira N.", "Every rep feels truly connected"],
    ["Lena M.", "Back stays calm in heavy lifts"],
    ["Chloe F.", "Posture stacks tall all day"],
    ["Alex P.", "Week 2 I feel powerful"],
  ],
  fitness: [
    ["Sam P.", "Runs feel springy and sure"],
    ["Helena R.", "Deadlifts steady no pinch"],
    ["Jules M.", "Balance finally clicked in yoga"],
    ["Tess K.", "Core fired my pace improved"],
    ["Ana L.", "Recovery better workouts stick"],
  ],
  stability: [
    ["Camille D.", "Shoulders dropped I grew taller"],
    ["Erin S.", "Neck stayed easy all day"],
    ["Mina J.", "Stairs felt steady and safe"],
    ["Paige R.", "Desk hours no longer punish"],
    ["Ruth N.", "Week 1 standing feels organized"],
  ],
  intimacy: [
    ["Maya S.", "More sensation and less worry"],
    ["Dani R.", "Bedroom confidence is back"],
    ["Lina H.", "Stronger connection with my partner"],
    ["Brooke E.", "I actually look forward to intimacy"],
    ["Kim W.", "Orgasms came without fear"],
  ],
  // iOS has no diastasis review pack and falls through to the default set.
  default: [
    ["Olivia G.", "This finally felt made for me"],
    ["Emily D.", "Small wins in days I smiled"],
    ["Sarah W.", "Five minutes gave real change"],
    ["Emily J.", "Pain eased and I breathed"],
    ["Dana A.", "Confidence returned I feel in control"],
  ],
};

/** The rotating review card, five deep, one per goal pack. */
export function reviewsForGoal(goalId) {
  const pack = REVIEWS[goalId] || REVIEWS.default;
  return pack.map(([name, quote], i) => ({
    name,
    quote,
    avatar: AVATARS[i % AVATARS.length],
  }));
}

/**
 * The paywall headline. Two lines on iOS, two lines here.
 * With no name it drops the comma rather than saying "there, ready to".
 */
export function headlineLead(name, sentencePhrase) {
  const clean = (name || "").trim();
  return clean
    ? `${clean}, ready to ${sentencePhrase}?`
    : `Ready to ${sentencePhrase}?`;
}

export const HEADLINE_TAIL = "100% Money-Back Guarantee.";

export const SHOWCASE_TITLE = "Your Personalized Plan Includes:";

export const MEMBERS_LINE_LEAD = "Join ";
export const MEMBERS_LINE_STRONG = "10,200+ women";
export const MEMBERS_LINE_TAIL = " feeling strong.";
export const MEMBERS_COUNT_FROM = 9800;
export const MEMBERS_COUNT_TO = 10200;

/**
 * FAQ item 1.
 *
 * WEB CHANGE, on purpose. iOS answers "Open Settings, tap Billing, then tap
 * Refund." That is the in-app path and it does not exist on the web, where the
 * subscription is a Stripe subscription. Promising a button that is not there
 * is the fastest way to turn a refund into a chargeback, so the web answer
 * describes the path that is actually real.
 */
export const REFUND_FAQ_QUESTION = "How do I get my money back?";
export const REFUND_FAQ_ANSWER =
  "Open the You tab, tap Manage or cancel, and that is it. Or email contact@pelvi.health and we do it for you. No forms, no questions.";

/**
 * Sub-CTA #1, the seven day line.
 *
 * WEB CHANGE, on purpose. iOS promises a named OUTCOME by day 7 ("Fewer leaks
 * when you cough laugh or run by Nov 3. If not, one tap full refund."). Seven
 * days is not long enough for a pelvic floor outcome, and on the web the refund
 * is ours to honour rather than Apple's, so we sell the same certainty with a
 * remorse promise instead of an outcome promise. Day 90 is where the outcome
 * promise lives, and it is still here, one line below.
 */
export function firstSubCTA(priceLabel) {
  return `Cancel in the first 7 days for any reason and pay nothing. We refund the full ${priceLabel}.`;
}

export const CONNECTION_FAILED_SUB_CTA =
  "Please check your internet connection and try again.";

export const CONNECTION_FAILED_CTA = "Try Again";
