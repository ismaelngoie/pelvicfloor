// The video paywall, word for word from the iOS 3.1.9 SubscriptionViewController.
//
// Everything on the money screen that depends on her goal lives here: the
// rotating benefit showcase (getFeatures), the button title (ctaTitle), the
// rotating member reviews (reviewsForCurrentGoal), the expandable "how will
// this app..." list (PaywallPlanValue.content) and the one line under the
// button (the goal promise, sharpened by her situation answer when she gave
// one). Keyed by the web goal id plus the pathway instead of the phone's
// legacy goal titles, otherwise identical. Change the phone first.

import { DEFAULT_PRICE_LABEL } from "@/lib/pricing";
import { anyGoalData, isMens, isTightening, memberPortrait } from "./appCopy";

/** Her focus is the web-only "Tighten Vaginal Canal" option under Improve Intimacy. */
const tighteningFor = (goalId, pathway, focusId) => goalId === "intimacy" && !isMens(pathway) && isTightening(focusId);

export const VIDEO_PAYWALL = {
  video: "/paywall_video.mp4",
  poster: "/paywall_poster.jpg",
  eyebrow: "YOUR PERSONALIZED PLAN INCLUDES",
  rating: { number: "4.9", caption: "App Store Rating" },
  library: { number: "500+", caption: "Coach Led Videos" },
  members: { count: 10200, lead: "Join ", strong: "10,200+ members", tail: " feeling strong." },
  reviewedLine: "Clinically reviewed by Dr Evelyn Reed, PT",
  legal: { restore: "Restore Purchase", terms: "Terms of Use", privacy: "Privacy Policy" },
  showcaseMs: 4000,
  reviewMs: 5000,
  fallbackCta: "Start My Personal Plan",
};

/** "Sarah, ready to" + the goal in her second person, or "Ready to" alone. */
export function headlineParts(name, goalId, pathway, focusId) {
  const phrase = tighteningFor(goalId, pathway, focusId)
    ? "tighten your vagina"
    : (anyGoalData(goalId, pathway)?.sentencePhrase || "").trim();
  const lead = name ? `${name}, ready to` : "Ready to";
  return phrase ? { lead, phrase, tail: "?" } : { lead, phrase: "start", tail: "?" };
}

// --- Benefit showcase (getFeatures) ------------------------------------------

const WOMENS_HEADLINE = {
  bladderLeaks: ["drop.fill", "Cough, laugh and run without leaking", "Daily coach led video to stop bladder leaks"],
  pelvicPain: ["bandage.fill", "Sit and move without pain", "Daily coach led video to ease pelvic pain"],
  intimacy: ["heart.circle.fill", "Feel more, worry less", "Daily coach led video to improve intimacy"],
  postpartum: ["figure.child", "Rebuild your core gently after birth", "Daily coach led video for postpartum recovery"],
  pregnancyPrep: ["leaf.fill", "Go into pregnancy strong and ready", "Daily coach led video for pregnancy prep"],
  fitness: ["trophy.fill", "More power in every workout", "Daily coach led video to support your fitness"],
  stability: ["figure.stand", "Stand taller, feel steadier", "Daily coach led video for stability and posture"],
  diastasisRecti: ["arrow.right.and.line.vertical.and.arrow.left", "Fix diastasis recti", "Daily coach led video for diastasis recti"],
  prolapse: ["arrow.up.heart.fill", "Less heaviness, more support", "Daily coach led video for prolapse support"],
  coreStrength: ["bolt.fill", "A deep core that holds you up", "Daily coach led video to build core strength"],
};

const TIGHTENING_HEADLINE = ["arrow.right.and.line.vertical.and.arrow.left", "Vaginal rejuvenation, no surgery", "Daily coach led video to rejuvenate and tighten"];

const MENS_HEADLINE = {
  bladderLeaks: ["drop.fill", "Move all day without leaks or drips", "Daily coach led video to stop leaks and drips"],
  intimacy: ["heart.circle.fill", "Stronger erections, more control", "Daily coach led video for erections and control"],
  prostateRecovery: ["cross.case.fill", "Regain bladder control after surgery", "Daily coach led video for prostate recovery"],
  bowelControl: ["checkmark.shield.fill", "Calmer urges, fewer accidents", "Daily coach led video for bowel control"],
};

function audioText(goalId, mens) {
  switch (goalId) {
    case "intimacy":
      return mens
        ? "Guided audio for erection support and lasting control, works offline"
        : "Guided audio for relaxation, sensation and stronger orgasms, works offline";
    case "bladderLeaks": return "Guided audio for urges and bladder control, works offline";
    case "postpartum": return "Guided audio for gentle postpartum recovery, works offline";
    case "diastasisRecti": return "Guided audio for doming and pressure control, works offline";
    case "pregnancyPrep": return "Guided audio for release and pregnancy-ready control, works offline";
    case "pelvicPain": return "Guided audio to calm flares and release tension, works offline";
    case "coreStrength": return "Guided audio to find and strengthen your deep core, works offline";
    case "fitness": return "Guided audio for stronger, leak-free workouts, works offline";
    case "prolapse": return "Guided audio for heaviness and pelvic support, works offline";
    case "prostateRecovery": return "Guided audio for bladder control after prostate surgery, works offline";
    case "bowelControl": return "Guided audio for urgency and bowel control, works offline";
    default: return null; // stability
  }
}

export function showcaseFeatures(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  const tightening = tighteningFor(goalId, pathway, focusId);
  const [icon, headline, dailyVideo] =
    (tightening && TIGHTENING_HEADLINE) || (mens && MENS_HEADLINE[goalId]) || WOMENS_HEADLINE[goalId] || WOMENS_HEADLINE.coreStrength;
  const features = [
    { icon: "play.rectangle.on.rectangle.fill", text: dailyVideo },
    { icon, text: headline },
    { icon: "message.fill", text: "Ask Coach Mia questions in real time" },
  ];
  // The cycle tracker is a women's pathway feature.
  if (!mens) features.push({ icon: "calendar.badge.clock", text: "Track your cycle and predict your next period" });
  const audio = tightening ? "Guided audio for squeeze, hold and release, works offline" : audioText(goalId, mens);
  if (audio) features.push({ icon: "waveform.circle.fill", text: audio });
  features.push(
    { icon: "play.rectangle.on.rectangle.fill", text: "500+ customized exercise videos" },
    { icon: "chart.line.uptrend.xyaxis", text: "Private progress, streaks and doctor report" }
  );
  return features;
}

// --- Button title (ctaTitle) ---------------------------------------------------

export function ctaTitle(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "bladderLeaks": return mens ? "Start My Fewer-Leaks Plan" : "Start My Leak-Free Plan";
    case "pelvicPain": return "Start My Pain-Relief Plan";
    case "intimacy":
      if (mens) return "Start My Control Plan";
      return isTightening(focusId) ? "Start My Vaginal Tightening Plan" : "Start My Intimacy Plan";
    case "postpartum": return "Start My Postpartum Plan";
    case "pregnancyPrep": return "Start My Pregnancy Prep";
    case "coreStrength": return "Start My Core Plan";
    case "fitness": return "Start My Fitness Plan";
    case "stability": return "Start My Stability Plan";
    case "diastasisRecti": return "Start Fixing Diastasis Recti";
    case "prolapse": return "Start My Pelvic Support Plan";
    case "prostateRecovery": return "Start My Recovery Plan";
    case "bowelControl": return "Start My Bowel Control Plan";
    default: return VIDEO_PAYWALL.fallbackCta;
  }
}

// --- Member reviews (reviewsForCurrentGoal) ------------------------------------

const PICS = ["/review9.png", "/review1.png", "/review5.png", "/review4.png", "/review2.png"];

function pack(names, lines) {
  const count = Math.min(PICS.length, names.length, lines.length);
  return Array.from({ length: count }, (_, i) => ({ image: PICS[i], name: names[i], text: lines[i] }));
}

/** Men's and prolapse reviews carry member portraits, so no woman's photo sits beside a man's words. */
function members(entries) {
  return entries.map(([name, text]) => ({ image: memberPortrait(name), name, text }));
}

const DEFAULT_REVIEWS = pack(
  ["Olivia G.", "Emily D.", "Sarah W.", "Emily J.", "Dana A."],
  ["This finally felt made for me", "Small wins in days I smiled", "Five minutes gave real change", "Pain eased and I breathed", "Confidence returned I feel in control"]
);

export function reviewsFor(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  if (tighteningFor(goalId, pathway, focusId)) {
    return pack(
      ["Maya S.", "Dani R.", "Lina H.", "Brooke E.", "Kim W."],
      ["Can't believe how good it feels now haha", "By day 5 I could feel the difference", "My husband noticed before I said anything", "Two kids later and I feel like me again", "Rejuvenated is honestly the only word for it"]
    );
  }
  if (mens) {
    switch (goalId) {
      case "intimacy":
        return members([
          ["James, 47", "Finally, I can last. We enjoy sex again."],
          ["Chris, 49", "The stress is gone, and we enjoy each other again."],
          ["Tom, 58", "Stronger and more in control than I was at 40."],
          ["Mark, 61", "I stopped worrying and started enjoying it."],
          ["David, 66", "Five minutes a day and it came back."],
        ]);
      case "bladderLeaks":
        return members([
          ["Tom, 58", "A whole day dry, no pads. I almost cried."],
          ["Mark, 61", "I coached the whole game, no worries."],
          ["David, 66", "The drips stopped on my morning walk."],
          ["Paul, 54", "I laugh with my grandkids without checking."],
          ["Bill, 67", "Eighteen holes with zero worry."],
        ]);
      case "prostateRecovery":
        return members([
          ["David, 66", "The drips stopped on my morning walk. I almost cried."],
          ["Bill, 67", "Eighteen holes with zero worry. I did not think I would get this back."],
          ["Tom, 58", "Control came back faster than the surgeon expected."],
          ["Mark, 61", "Dry through the night again."],
          ["Ron, 58", "A road trip, totally relaxed."],
        ]);
      case "pelvicPain":
        return members([
          ["Chris, 49", "Sitting through a full workday without that ache."],
          ["Paul, 54", "The tension let go and the pain went with it."],
          ["James, 47", "I stopped bracing every time I stood up."],
          ["Ron, 58", "Calm mornings instead of burning ones."],
          ["Tom, 58", "Gentle release did what pushing never could."],
        ]);
      case "bowelControl":
        return members([
          ["Paul, 54", "No more bathroom fear. I have my life back."],
          ["Ron, 58", "A whole road trip, totally relaxed. The fear is finally gone."],
          ["Bill, 67", "I plan my day around my life, not a bathroom."],
          ["Mark, 61", "Urges settle instead of running me."],
          ["David, 66", "Confidence away from home again."],
        ]);
      case "coreStrength":
        return members([
          ["James, 47", "My back stays calm in heavy lifts."],
          ["Chris, 49", "Every rep feels connected now."],
          ["Tom, 58", "Posture stacks tall all day."],
          ["Paul, 54", "Week 2 and I feel powerful."],
          ["Mark, 61", "Strong from the inside out."],
        ]);
      default:
        return DEFAULT_REVIEWS;
    }
  }
  switch (goalId) {
    case "bladderLeaks":
      return pack(
        ["Emily D.", "Dana A.", "Hannah L.", "Priya S.", "Zoe M."],
        ["Week 1 I laughed and stayed dry", "Pads live in a drawer now", "I jogged today and stayed dry", "Bathroom maps deleted I feel free", "My bladder finally listens to me"]
      );
    case "pelvicPain":
      return pack(
        ["Laura P.", "Ana R.", "Katie B.", "Mia K.", "Jen C."],
        ["Meetings passed without that deep ache", "I enjoyed intimacy without flinching", "Gentle moves gave real relief", "I woke up calm not burning", "I lifted my toddler without bracing"]
      );
    case "postpartum":
      return pack(
        ["Sarah W.", "Michelle T.", "Chloe N.", "Olivia G.", "Jess P."],
        ["Week 2 stronger steadier with baby", "My core feels connected again", "From leaks to laughter with my baby", "Recovery finally makes sense", "Five minutes I actually keep"]
      );
    case "pregnancyPrep":
      return pack(
        ["Kara D.", "Ivy S.", "Bella R.", "Nora P.", "June K."],
        ["Breath is calm belly supported", "Hips opened and sleep returned", "Week 2 my core feels ready", "Movements finally feel safe", "I feel ready for our baby"]
      );
    case "coreStrength":
      return pack(
        ["Allison J.", "Keira N.", "Lena M.", "Chloe F.", "Alex P."],
        ["Plank feels steady and strong", "Every rep feels truly connected", "Back stays calm in heavy lifts", "Posture stacks tall all day", "Week 2 I feel powerful"]
      );
    case "fitness":
      return pack(
        ["Sam P.", "Helena R.", "Jules M.", "Tess K.", "Ana L."],
        ["Runs feel springy and sure", "Deadlifts steady no pinch", "Balance finally clicked in yoga", "Core fired my pace improved", "Recovery better workouts stick"]
      );
    case "stability":
      return pack(
        ["Camille D.", "Erin S.", "Mina J.", "Paige R.", "Ruth N."],
        ["Shoulders dropped I grew taller", "Neck stayed easy all day", "Stairs felt steady and safe", "Desk hours no longer punish", "Week 1 standing feels organized"]
      );
    case "intimacy":
      return pack(
        ["Maya S.", "Dani R.", "Lina H.", "Brooke E.", "Kim W."],
        ["More sensation and less worry", "Bedroom confidence is back", "Stronger connection with my partner", "I actually look forward to intimacy", "Orgasms came without fear"]
      );
    case "diastasisRecti":
      return pack(
        ["Rachel M.", "Tara B.", "Nina C.", "Grace L.", "Amy S."],
        ["My middle feels connected again", "I lift without my belly doming", "The gap finally feels supported", "Everyday movement feels strong again", "I understand how to use my deep core"]
      );
    case "prolapse":
      return members([
        ["Karen, 52", "The heaviness is gone. I cooked all day and felt light."],
        ["Susan, 49", "I stand and walk without that dragging feeling."],
        ["Ruth, 58", "Lifting the groceries stopped scaring me."],
        ["Jo, 50", "By evening I still feel supported."],
        ["Dee, 44", "Less pressure every week. I trust my body again."],
      ]);
    default:
      return DEFAULT_REVIEWS;
  }
}

// --- "How will this app..." (PaywallPlanValue.content) -------------------------

export function planValue(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  let title;
  let audio;
  let tracking;
  let quickHelp = "Ask Coach Mia questions in real time";
  if (tighteningFor(goalId, pathway, focusId)) {
    title = "How will this app rejuvenate your vaginal canal?";
    audio = "Offline guided audio for squeeze, hold and release";
    tracking = "Track tone, sensation and confidence";
  } else switch (goalId) {
    case "bladderLeaks":
      title = mens ? "How will this app stop your leaks and drips?" : "How will this app stop your bladder leaks?";
      audio = "Offline guided audio for urges and bladder control";
      tracking = "Track leaks, urges and bladder progress";
      quickHelp = "Instant Urge Rescue when you need it";
      break;
    case "pelvicPain":
      title = "How will this app ease your pelvic pain?";
      audio = "Offline guided audio for pain flares and tension";
      tracking = "Track pain, comfort and what brings relief";
      break;
    case "intimacy":
      title = mens ? "How will this app improve erections and control?" : "How will this app improve your intimacy?";
      audio = mens ? "Offline guided audio for erection support and lasting control" : "Offline guided audio for stronger orgasms and comfort";
      tracking = mens ? "Track control, confidence and progress" : "Track comfort, sensation and confidence";
      break;
    case "postpartum":
      title = "How will this app support postpartum recovery?";
      audio = "Offline guided audio for gentle recovery";
      tracking = "Track comfort, heaviness and strength returning";
      break;
    case "pregnancyPrep":
      title = "How will this app prepare you for pregnancy?";
      audio = "Offline guided audio for release and control";
      tracking = "Track strength, energy and readiness";
      break;
    case "diastasisRecti":
      title = "How will this app fix diastasis recti?";
      audio = "Offline guided audio for pressure control";
      tracking = "Track doming, pressure and core control";
      break;
    case "fitness":
      title = "How will this app support your fitness?";
      audio = "Offline guided audio for stronger workouts";
      tracking = "Track strength, energy and recovery";
      break;
    case "stability":
      title = "How will this app improve your stability and posture?";
      audio = null;
      tracking = "Track balance, comfort and strength";
      break;
    case "prolapse":
      title = "How will this app support your prolapse?";
      audio = "Offline guided audio for heaviness and pelvic support";
      tracking = "Track heaviness, pressure and daily confidence";
      break;
    case "prostateRecovery":
      title = "How will this app rebuild control after prostate surgery?";
      audio = "Offline guided audio for bladder control after surgery";
      tracking = "Track leaks, drips and recovery confidence";
      break;
    case "bowelControl":
      title = "How will this app improve your bowel control?";
      audio = "Offline guided audio for urgency and bowel control";
      tracking = "Track urgency, control and confidence";
      break;
    default:
      title = "How will this app build your core strength?";
      audio = "Offline guided audio for deep-core connection";
      tracking = "Track strength, control and consistency";
  }
  const features = [
    { icon: "play.rectangle.on.rectangle.fill", title: "5-minute daily coach-led video" },
    { icon: "square.grid.2x2.fill", title: "500+ customized exercise videos" },
    { icon: "message.fill", title: quickHelp },
  ];
  if (audio) features.push({ icon: "waveform.circle.fill", title: audio });
  if (!mens) features.push({ icon: "calendar.badge.clock", title: "Track your cycle and predict your next period" });
  features.push({ icon: "chart.line.uptrend.xyaxis", title: tracking }, { icon: "doc.text.fill", title: "Doctor-ready progress report" });
  return { title, features };
}

// --- The line under the button ---------------------------------------------------

/** "Sep 14": the phone's "MMM d" seven days out. */
export function byDateString(from = new Date()) {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function goalPromise(goalId, pathway, byDate) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "intimacy":
      return mens ? `Better control and more confidence by ${byDate}.` : `Feel more sensation and easier orgasms by ${byDate}.`;
    case "bladderLeaks": return `Fewer leaks when you cough laugh or run by ${byDate}.`;
    case "pelvicPain": return `Less pelvic tension and easier sitting by ${byDate}.`;
    case "postpartum": return `A steadier core and easier carries by ${byDate}.`;
    case "pregnancyPrep": return `Calmer breath and better pelvic control by ${byDate}.`;
    case "coreStrength": return `Stronger core and better posture by ${byDate}.`;
    case "fitness": return `More stable lifts and less strain by ${byDate}.`;
    case "stability": return `Stand taller and feel steadier by ${byDate}.`;
    case "diastasisRecti": return `A flatter, stronger middle by ${byDate}.`;
    case "prolapse": return `Better support and easier movement by ${byDate}.`;
    case "prostateRecovery": return `Better bladder control during recovery by ${byDate}.`;
    case "bowelControl": return `Better urgency control and confidence by ${byDate}.`;
    default: return `Feel real progress by ${byDate}.`;
  }
}

/**
 * Her situation answer sharpens the promise when it can (SymptomProfileStore
 * .paywallPromise, carried in the catalog with a BYDATE slot); the goal
 * promise is the fallback. The web-only tightening focus outranks both: she
 * tapped "Tighten Vaginal Canal", so the line under the button says exactly
 * that. Then the 2025 wording: the price and the promise that it comes back
 * with one tap. The button itself never carries the price.
 */
export function ctaSubtext(goalId, pathway, situationId, focusId = null, from = new Date()) {
  const byDate = byDateString(from);
  const fromSituation = anyGoalData(goalId, pathway)?.paywallPromise?.[situationId];
  const promise = tighteningFor(goalId, pathway, focusId)
    ? `Get a tighter vagina by ${byDate}.`
    : fromSituation ? fromSituation.replace(/BYDATE/g, byDate) : goalPromise(goalId, pathway, byDate);
  return `${promise} If not, one tap full ${DEFAULT_PRICE_LABEL} refund.`;
}
