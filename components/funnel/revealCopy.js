// The plan reveal, the Dr Reed bridge and the paywall, word for word from the
// iOS 3.1.8 PlanRevealViewController, DrReedBridgeViewController,
// SubscriptionViewController and ClinicalReviewerUI. Change the phone first.

import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "@/lib/pricing";
import { isMens } from "./appCopy";

// ---------------------------------------------------------------------------
// Dr Reed
// ---------------------------------------------------------------------------

/**
 * Dr Reed's 26 seconds between the reveal and the paywall, exactly as the
 * phone plays them. The clip says "Our app is about 83 cents a day", which is
 * $24.99 a month: keep lib/pricing.js at that price while this is on.
 */
export const SHOW_BRIDGE_VIDEO = true;

export const DR_REED = {
  headshot: "/dr-evelyn-reed.jpg",
  bridge: "/video/dr-reed/dr_reed_bridge.mp4",
  recovery: "/video/dr-reed/dr_reed_recovery.mp4",
  credentials: "/video/dr-reed/dr_reed_credentials.mp4",
  skip: "Skip",
  reviewedLine: "Clinically reviewed by Dr Evelyn Reed, PT",
  planReviewedLine: "Plan reviewed by Dr Evelyn Reed, PT",
  planReviewedStrong: "Dr Evelyn Reed, PT",
  sheet: {
    name: "Dr. Evelyn Reed",
    letters: "PT · DPT · WCS",
    role: "Pelvic Health Physical Therapist\nBoard-Certified Women's Health Clinical Specialist",
    quote: "“Every plan and every article in this app crosses my desk before it reaches you.”",
    facts: [
      ["graduationcap.fill", "Harvard Medical School graduate"],
      ["mappin.and.ellipse", "Practices in New York"],
      ["checkmark.seal.fill", "Reviewed the complete program and educational content"],
    ],
    done: "Done",
  },
};

// ---------------------------------------------------------------------------
// Plan reveal
// ---------------------------------------------------------------------------

export const REVEAL = {
  milestoneHeadline: "Your first 7 days",
  insightsHeadline: "Everything around your plan",
  calibration: { eyebrow: "YOUR PERSONAL PLAN", title: "How Coach Mia™ customized your plan" },
  evidence: { eyebrow: "WHAT THE EVIDENCE SHOWS" },
  why: { eyebrow: "WHY 5 MINUTES A DAY" },
  markers: ["Day 1", "Day 3", "Day 5", "Day 7"],
  progress: [0.08, 0.33, 0.67, 1.0],
  subtitleWithMeaning: (echo) =>
    `You said fixing this means **${echo}**. Coach Mia™ built your **5-minutes-a-day plan** to get you there, and it adapts as you improve.`,
  subtitleDefault: "Coach Mia™ used your answers to build your **5-minutes-a-day plan**, and it adapts as you improve.",
  coachContextTitle: "Coach Mia™ knows your plan context",
  coachContextDetail: (concern) =>
    `Coach Mia™ sees your goal, ${concern}, your program day and today's exercises before you ask a question.`,
  trackingDetail: "Your three private daily signals build a progress history you can use in your report.",
  audioFallback: { title: "Goal-safe guided audio", detail: "A short, spoken reset matched to your goal." },
  leakFamily: ["bladderLeaks", "prostateRecovery", "bowelControl", "fitness"],
};

export function revealCta(goalId) {
  switch (goalId) {
    case "intimacy": return "Start My Intimacy Plan";
    case "bladderLeaks": return "Start My Bladder Plan";
    case "postpartum": return "Start My Recovery Plan";
    case "pregnancyPrep": return "Start My Pregnancy Prep";
    case "diastasisRecti": return "Start Fixing Diastasis Recti";
    case "pelvicPain": return "Start My Pain Relief Plan";
    case "fitness": return "Start My Fitness Plan";
    case "coreStrength": return "Start My Core Plan";
    case "stability": return "Start My Stability Plan";
    case "prolapse": return "Start My Prolapse Plan";
    case "prostateRecovery": return "Start My Recovery Plan";
    case "bowelControl": return "Start My Bowel Control Plan";
    default: return "Start My Core Plan";
  }
}

/** "your plan FOR more sensation…" / "your plan TO relax tight pelvic muscles". */
export function revealHeadlinePhrase(goalId, focus, memberSentencePhrase) {
  if (!focus) return { preposition: "to", outcome: memberSentencePhrase };
  if (goalId === "intimacy") {
    switch (focus.id) {
      case "intimacy.sensation": return { preposition: "for", outcome: "more sensation and stronger orgasms" };
      case "intimacy.comfort": return { preposition: "for", outcome: "less pain during sex and more comfortable intimacy" };
      case "intimacy.relaxation": return { preposition: "for", outcome: "releasing tightness and stopping pelvic clenching" };
      case "intimacy.dryness": return { preposition: "for", outcome: "more arousal and less dryness" };
      case "intimacy.confidence": return { preposition: "for", outcome: "more control and confidence during intimacy" };
      case "intimacy.postpartum": return { preposition: "for", outcome: "reconnecting after birth and hormonal changes" };
      default: break;
    }
  }
  return { preposition: "to", outcome: focus.title.toLowerCase() };
}

const INTIMACY_MILESTONES = {
  "intimacy.sensation": ["Feel release, rhythm and sensation working together", "More sensation and easier arousal", "Stronger orgasm training through rhythm and precise control", "Stronger orgasms and confident intimacy"],
  "intimacy.comfort": ["Release guarding before intimacy", "Less tension and easier penetration", "More comfort with controlled strength", "Comfortable, confident intimacy"],
  "intimacy.relaxation": ["Recognize and release hidden clenching", "A pelvic floor that relaxes on command", "Control without holding excess tension", "Comfortable intimacy without constant clenching"],
  "intimacy.dryness": ["Create more time for arousal and comfort", "Less guarding and better pelvic awareness", "More sensation with hormone-aware tracking", "More comfortable intimacy with less friction"],
  "intimacy.confidence": ["Feel the muscles you can control", "More connection, sensation and confidence", "Precise rhythm without over-squeezing", "Confident intimacy and stronger control"],
  "intimacy.postpartum": ["Reconnect breath, sensation and pelvic release", "More comfort and confidence after birth", "Stronger control without excess tension", "Comfortable intimacy and restored confidence"],
  default: ["Feel release and control working together", "More sensation and easier arousal", "Comfort with precise pelvic control", "Stronger orgasms and confident intimacy"],
};

const GOAL_MILESTONES = {
  bladderLeaks: ["Find the muscles that stop leaks and calm urgency", "Fewer leaks during coughing, sneezing and movement", "Control sudden urges before they control your day", "Dry, confident movement through everyday life"],
  postpartum: ["Reconnect breath, pelvic floor and deep core", "More support for lifting, feeding and carrying", "Stronger movement with less pressure and heaviness", "Confident strength for life after birth"],
  pregnancyPrep: ["Build pelvic awareness, breath and relaxation", "More comfortable hips and stronger support", "Confident pressure control for daily movement", "A strong, calm body prepared for pregnancy"],
  diastasisRecti: ["Control pressure and reduce visible doming", "A stronger deep-core connection in daily movement", "More control during lifting, carrying and exercise", "A firmer, stronger middle with confident movement"],
  pelvicPain: ["Release guarding and calm pelvic tension", "More comfortable sitting, walking and movement", "Strength without triggering another flare", "Comfortable daily movement and intimacy"],
  fitness: ["Brace and breathe without pelvic pressure", "Stronger lifts, runs and classes with better control", "More power without leaks or heaviness", "Confident, supported training at your level"],
  coreStrength: ["Feel and control your deep core", "Stronger bracing without holding your breath", "More control through lifting and full-body movement", "A stronger, firmer core that supports real life"],
  stability: ["Reconnect posture, hips and deep core", "Steadier balance and easier daily movement", "More endurance for walking, standing and lifting", "Strong posture and confident stability"],
  prolapse: ["Learn gentle lift without straining down", "Less pressure during standing and daily movement", "More support for lifting, walking and exercise", "Confident movement with lasting pelvic support"],
  prostateRecovery: ["Reconnect the muscles that support bladder control", "Fewer leaks and after-urination drips", "Better control during walking, lifting, and daily life", "Confident movement with lasting bladder control"],
  bowelControl: ["Coordinate release, pressure, and control", "Calmer urgency and easier emptying", "More control away from home and a bathroom", "Confident bowel control through daily life"],
};

/** Four rows, Day 1 / 3 / 5 / 7. The leak family's last row echoes her frequency. */
export function milestones(goalId, focus, frequency) {
  let descriptions;
  if (goalId === "intimacy") {
    descriptions = INTIMACY_MILESTONES[focus?.id] || INTIMACY_MILESTONES.default;
  } else {
    descriptions = GOAL_MILESTONES[goalId] || GOAL_MILESTONES.coreStrength;
  }
  const rows = REVEAL.markers.map((marker, index) => ({
    marker,
    progress: REVEAL.progress[index],
    description: descriptions[index],
  }));
  if (REVEAL.leakFamily.includes(goalId) && frequency?.revealPhrase) {
    rows[3] = { ...rows[3], description: `From ${frequency.revealPhrase} down to hardly ever` };
  }
  return rows;
}

export function baseline(goalId, frequency) {
  if (REVEAL.leakFamily.includes(goalId) && frequency?.revealPhrase) {
    return { now: `NOW · ${frequency.revealPhrase}`, outcome: "DAY 7 · hardly ever" };
  }
  return { now: "NOW · your starting point", outcome: "DAY 7 · your result" };
}

export function whyFiveMinutes(pathway) {
  const mens = isMens(pathway);
  return {
    headline: mens ? "Five focused minutes build control fast." : "Five minutes a day is the real medicine.",
    body: mens
      ? "Research supports pelvic floor training for men's bladder, bowel, erection, ejaculation, and prostate-recovery goals. The pattern that wins in the research is short, focused, daily practice. Your plan builds technique, release, timing, and strength in five-minute sessions, so it fits real life and actually gets done."
      : "Across 31 randomized trials and more than 1,800 women, the Cochrane review found that women who trained their pelvic floor consistently were up to eight times more likely to report cure or improvement. The training in those trials was short daily practice, just like yours. Consistency wins, not long workouts. Five minutes a day is enough.",
    footnote: mens
      ? "Sources: NIDDK pelvic floor guidance · Myers and Smith systematic review · Reviewed by Dr Evelyn Reed, PT"
      : "Sources: Cochrane Review CD005654 · NICE guideline NG123 · Reviewed by Dr Evelyn Reed, PT",
  };
}

export function clinicalEvidence(goalId, pathway) {
  const mens = isMens(pathway);
  if (mens) {
    const title = "Your plan follows clinical guidance";
    switch (goalId) {
      case "intimacy":
        return { title, statistic: "10 clinical trials", detail: "Every erectile-dysfunction trial in a systematic review reported comparative improvement, and most premature-ejaculation trials improved. Your plan separates erection support from lasting-longer control.", source: "Source: Myers and Smith, Physiotherapy, 2019." };
      case "prostateRecovery":
        return { title, statistic: "Nearly 3x the odds", detail: "A 21-study review found better continence recovery with pelvic floor exercise after prostate surgery compared with no pelvic floor exercise.", source: "Source: 2022 systematic review and meta-analysis, PMID 35526757." };
      case "bladderLeaks":
        return { title, statistic: "Men benefit too", detail: "The NIDDK says pelvic floor training can help men leak less often, including dribbling after urination, and can support urge control.", source: "Source: National Institute of Diabetes and Digestive and Kidney Diseases." };
      case "bowelControl":
        return { title, statistic: "Bladder and bowel control", detail: "The NIDDK describes pelvic floor training as a treatment for bladder problems and a way to improve bowel control for both women and men.", source: "Source: National Institute of Diabetes and Digestive and Kidney Diseases." };
      default:
        return { title, statistic: "Built for your body", detail: "Your plan combines full release, controlled support, breathing, and progression. It changes with your feedback instead of asking you to squeeze harder every day.", source: "Reviewed by Dr Evelyn Reed, PT." };
    }
  }
  if (goalId === "bladderLeaks") {
    return {
      title: "Training changes the odds",
      rows: [
        { value: "56%", label: "reported cure with pelvic floor training", fill: 0.56, emphasized: true },
        { value: "6%", label: "reported cure without treatment", fill: 0.06, emphasized: false },
      ],
      source: "Four clinical trials, 165 women. Source: Cochrane Review CD005654.",
    };
  }
  return {
    title: "Your plan follows clinical guidance",
    statistic: "5 minutes a day",
    detail:
      goalId === "prolapse"
        ? "NICE recommends supervised pelvic floor training for symptomatic stage 1 or 2 prolapse. Short daily practice is the pattern that works."
        : "NICE recommends structured pelvic floor training as first-line care. Short daily practice is the pattern that works.",
    source: "Source: NICE guideline NG123. Reviewed by Dr Evelyn Reed, PT.",
  };
}

/** AudioSessionCatalog.dashboardSession: the card the Today screen opens first. */
export function dashboardSession(goalId, pathway) {
  const mens = isMens(pathway);
  const s = (title, seconds, subtitle) => ({ title, seconds, subtitle });
  switch (goalId) {
    case "intimacy":
      return mens
        ? s("Last Longer Control Practice", 42, "Practice slowing down, releasing tension, and choosing when to continue.")
        : s("Relax Before Intimacy", 42, "Release pelvic tension for more comfortable intimacy.");
    case "bladderLeaks": return s("Ride Out an Urge", 38, "Calm sudden urgency and reach the bathroom without rushing.");
    case "postpartum": return s("Two-Minute Recovery Reset", 32, "Reduce pressure and reconnect your healing core gently.");
    case "diastasisRecti": return s("Pressure & Doming Check", 38, "Control abdominal pressure to reduce doming during movement.");
    case "pregnancyPrep": return s("Breathing & Pressure Reset", 42, "Coordinate breath and pressure for stronger pregnancy movement.");
    case "pelvicPain": return s("Calm a Pain Flare", 42, "Lower pelvic guarding and make the flare more manageable.");
    case "coreStrength":
    case "stability": return s("Find Your Deep Core", 42, "Build deep support without sucking in or gripping.");
    case "fitness": return s("Brace Before Lifting", 40, "Lift stronger with breath and support instead of bearing down.");
    case "prolapse": return s("Ease Pelvic Heaviness", 42, "Reduce unnecessary pressure when heaviness builds during the day.");
    case "prostateRecovery": return s("Recovery Control Practice", 42, "Reconnect a gentle lift and full release after prostate treatment.");
    case "bowelControl": return s("Bowel Urge Reset", 38, "Settle the first wave and move toward the bathroom with more control.");
    default: return null;
  }
}

export function durationLabel(seconds) {
  const total = Math.round(seconds || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Paywall
// ---------------------------------------------------------------------------

export const PAYWALL = {
  differenceEyebrow: "WHY YOUR PLAN IS DIFFERENT",
  exerciseEyebrow: "YOUR DAY 1 · 5 MIN",
  exerciseSubtitle: "4 coach-led exercises selected for you",
  guarantee: "7-day improvement guarantee or full refund",
  subtext: "Your first 5-minute session is ready",
  stars: "★★★★★",
  legal: { restore: "Restore", privacy: "Privacy", terms: "Terms" },
  priceLabel: DEFAULT_PRICE_LABEL,
  pricePeriod: DEFAULT_PRICE_PERIOD,
  pricePeriodShort: DEFAULT_PRICE_PERIOD === "year" ? "yr" : "mo",
  dayOne: {
    minutes: "5 MIN",
    eyebrow: "YOUR DAY 1 IS READY",
    body: "4 coach-led exercises, chosen from your answers. It starts the moment you join.",
    dismiss: "Not yet",
  },
  recovery: {
    title: "Still thinking about it? That's okay.",
    body: "Your plan stays ready for you. If you do not feel a difference in 7 days, you get every cent back. No questions, no hoops.",
    cta: "7-day improvement guarantee or full refund",
    dismiss: "Not Now",
  },
};

/** "Start My Intimacy Plan for $24.99/mo" */
export function pricedCta(ctaTitle) {
  return `${ctaTitle} for ${PAYWALL.priceLabel}/${PAYWALL.pricePeriodShort}`;
}

export function paywallHeadline(name, outcome) {
  return name ? `${name}, your plan for ${outcome} is ready` : `Your plan for ${outcome} is ready`;
}

export function paywallBaseCopy(goalId, pathway) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "intimacy":
      return mens
        ? { outcome: "better erections and lasting longer", context: "Built around erection support, finishing too soon, tension, and the concerns you selected.", strategyTitle: "Release first. Control next.", strategyBody: "Coach Mia starts with release and timing, then builds strength and control for intimacy.", imageName: "pelvicPain3", dayOneTitle: "Build Control Without Tension", milestones: [["DAY 1", "Better release"], ["DAY 3", "More control"], ["DAY 7", "More confidence"]], quote: "Finally, I can last.\nWe enjoy sex again.", reviewerName: "James, 47 · Lasting longer", ctaTitle: "Start My Control Plan" }
        : { outcome: "better intimacy", context: "Built around when it affects you, how often, and what you already tried.", strategyTitle: "Release first. Strength later.", strategyBody: "Coach Mia starts with relaxation and control so your body can feel safe before stronger work.", imageName: "pelvicPain3", dayOneTitle: "Relax Before Intimacy", milestones: [["DAY 1", "Easier release"], ["DAY 3", "More comfort"], ["DAY 7", "Confident intimacy"]], quote: "Orgasms came without fear.\nI enjoy sex again.", reviewerName: "Sarah, 44 · Intimacy confidence", ctaTitle: "Start My Intimacy Plan" };
    case "bladderLeaks":
      return mens
        ? { outcome: "fewer leaks", context: "Built around when your leaks happen, how often, and what you already tried.", strategyTitle: "Control first. Strength second.", strategyBody: "Coach Mia starts with timing and pressure control before stronger reps.", imageName: "coachLauraCover1", dayOneTitle: "Move Without Worrying", milestones: [["DAY 1", "Better timing"], ["DAY 3", "Fewer leaks"], ["DAY 7", "Full confidence"]], quote: "A whole day dry, no pads.\nI almost cried.", reviewerName: "Tom, 58 · Bladder control", ctaTitle: "Start My Fewer-Leaks Plan" }
        : { outcome: "fewer leaks", context: "Built around when your leaks happen, how often, and what you already tried.", strategyTitle: "Control first. Strength second.", strategyBody: "Coach Mia starts with timing and pressure control before stronger reps.", imageName: "coachLauraCover1", dayOneTitle: "Run Without Worrying", milestones: [["DAY 1", "Better timing"], ["DAY 3", "Fewer leaks"], ["DAY 7", "Run with confidence"]], quote: "Jumped on the trampoline with\nmy kids. First time in years.", reviewerName: "Rachel, 38 · Bladder leaks", ctaTitle: "Start My Fewer-Leaks Plan" };
    case "pelvicPain":
      return { outcome: "less pelvic pain", context: "Built around the moments your pain shows up, how often it happens, and what you already tried.", strategyTitle: "Release first. Rebuild gently.", strategyBody: "Coach Mia starts by calming tension, then builds control without setting off another flare.", imageName: "pelvicPain1", dayOneTitle: "Calm Pelvic Tension", milestones: [["DAY 1", "Quieter tension"], ["DAY 3", "Easier movement"], ["DAY 7", "More comfortable days"]], quote: "A whole movie, zero pain.\nI cried in the car after.", reviewerName: "Lena, 39 · Pelvic pain", ctaTitle: "Start My Pain-Relief Plan" };
    case "postpartum":
      return { outcome: "a stronger recovery", context: "Built around what feels hardest after birth, how often you notice it, and the support you already tried.", strategyTitle: "Reconnect first. Build steadily.", strategyBody: "Coach Mia starts with gentle connection before adding the strength your daily life needs.", imageName: "prenatal1", dayOneTitle: "Reconnect After Birth", milestones: [["DAY 1", "Feel connected"], ["DAY 3", "Move with support"], ["DAY 7", "Trust your body"]], quote: "I lifted my baby, no fear.\nI got my body back.", reviewerName: "Michelle, 34 · Postpartum recovery", ctaTitle: "Start My Postpartum Plan" };
    case "pregnancyPrep":
      return { outcome: "pregnancy-ready strength", context: "Built around where your body is now, what you notice most, and the support you want before pregnancy.", strategyTitle: "Prepare gently. Build support.", strategyBody: "Coach Mia starts with control and release before building strength for the load ahead.", imageName: "prenatal1", dayOneTitle: "Build Your Pregnancy Base", milestones: [["DAY 1", "Better control"], ["DAY 3", "More support"], ["DAY 7", "Ready with confidence"]], quote: "I'm not scared of birth\nanymore. I feel ready.", reviewerName: "Emma, 31 · Pregnancy prep", ctaTitle: "Start My Pregnancy Prep" };
    case "diastasisRecti":
      return { outcome: "a stronger, flatter middle", context: "Built around when you see doming, how often it appears, and the exercises you already tried.", strategyTitle: "Control pressure. Rebuild connection.", strategyBody: "Coach Mia starts with deep-core control, then adds strength that supports your gap without pushing out.", imageName: "pelvicPain3", dayOneTitle: "Reconnect Your Deep Core", milestones: [["DAY 1", "Less doming"], ["DAY 3", "A steadier middle"], ["DAY 7", "Move with confidence"]], quote: "The doming is gone.\nMy belly is flat again.", reviewerName: "Dana, 36 · Diastasis recti", ctaTitle: "Start Fixing Diastasis Recti" };
    case "coreStrength":
      return { outcome: "a stronger core", context: "Built around where your core lets you down, how often you feel it, and what you already tried.", strategyTitle: "Connect first. Build strength.", strategyBody: "Coach Mia starts by helping you feel your deep core, then adds strength you can use every day.", imageName: "pelvicPain3", dayOneTitle: "Find Your Deep Core", milestones: [["DAY 1", "Feel your core"], ["DAY 3", "Move with support"], ["DAY 7", "Lasting strength"]], quote: "My back pain is gone.\nI feel strong inside again.", reviewerName: "Olivia, 47 · Core strength", ctaTitle: "Start My Core Plan" };
    case "fitness":
      return { outcome: "stronger workouts", context: "Built around where symptoms show up in training, how often they hold you back, and what you already tried.", strategyTitle: "Control first. Add power.", strategyBody: "Coach Mia starts with pressure control, then builds support for running and lifting.", imageName: "coachLauraCover1", dayOneTitle: "Move With More Control", milestones: [["DAY 1", "Better timing"], ["DAY 3", "Stronger training"], ["DAY 7", "Perform with confidence"]], quote: "I finished a 5K smiling.\nNo leaks. I felt free.", reviewerName: "Nina, 35 · Runner", ctaTitle: "Start My Fitness Plan" };
    case "stability":
      return { outcome: "better stability", context: "Built around when you feel least steady, how often it affects you, and what you already tried.", strategyTitle: "Connect first. Stand stronger.", strategyBody: "Coach Mia starts with deep support and control, then adds strength to keep you steady.", imageName: "pelvicPain1", dayOneTitle: "Find Your Stable Base", milestones: [["DAY 1", "Feel steadier"], ["DAY 3", "Stronger posture"], ["DAY 7", "Move with confidence"]], quote: "I trust my legs again.\nThe fear is finally gone.", reviewerName: "Ruth, 58 · Stability", ctaTitle: "Start My Stability Plan" };
    case "prolapse":
      return { outcome: "less pelvic heaviness", context: "Built around when heaviness or bulging appears, how often you notice it, and what you already tried.", strategyTitle: "Manage pressure. Build support.", strategyBody: "Coach Mia starts with breath and pelvic support, then adds strength for lifting and longer days.", imageName: "pelvicPain1", dayOneTitle: "Feel Supported From the Start", milestones: [["DAY 1", "Better pressure control"], ["DAY 3", "Less heaviness"], ["DAY 7", "Move with confidence"]], quote: "The heaviness is gone.\nI cried with relief.", reviewerName: "Susan, 49 · Prolapse support", ctaTitle: "Start My Pelvic Support Plan" };
    case "prostateRecovery":
      return { outcome: "better control after prostate treatment", context: "Built around your recovery stage, leaks or drips, and the support you already tried.", strategyTitle: "Coordinate first. Rebuild control.", strategyBody: "Coach Mia starts with clear technique and recovery pacing, then builds stronger control.", imageName: "pelvicPain3", dayOneTitle: "Reconnect After Prostate Treatment", milestones: [["DAY 1", "Find the right muscles"], ["DAY 3", "Fewer drips"], ["DAY 7", "More daily control"]], quote: "The drips stopped on my\nmorning walk. I almost cried.", reviewerName: "David, 66 · Prostate recovery", ctaTitle: "Start My Recovery Plan" };
    case "bowelControl":
      return { outcome: "better bowel control", context: "Built around when urgency or accidents happen, how often you notice them, and what you already tried.", strategyTitle: "Calm urgency. Build control.", strategyBody: "Coach Mia starts with breathing and timing, then builds control for daily confidence.", imageName: "pelvicPain3", dayOneTitle: "Find Calm, Clear Control", milestones: [["DAY 1", "Better coordination"], ["DAY 3", "Calmer urgency"], ["DAY 7", "More confidence"]], quote: "No more bathroom fear.\nI have my life back.", reviewerName: "Paul, 54 · Bowel control", ctaTitle: "Start My Bowel Control Plan" };
    default:
      return paywallBaseCopy("coreStrength", pathway);
  }
}

const lowercaseFirst = (value) => (value ? value.charAt(0).toLowerCase() + value.slice(1) : value);

function triedDetail(tried) {
  switch (tried?.id) {
    case "kegels": return "after Kegels did not help";
    case "pads": return "after pads only managed the symptom";
    case "pt": return "with physical therapy already tried";
    case "clinic": return "with clinical help already tried";
    case "rehab": return "building on your hospital exercises";
    case "videos": return "after videos or other apps did not progress with you";
    case "meds": return "after medication alone was not enough";
    case "bladder_training": return "after bladder training alone stalled";
    case "fluids": return "after cutting back drinks did not fix it";
    case "relax": return "after relaxing alone did not hold";
    case "techniques": return "after start-stop tricks fell short";
    case "lube": return "after lubricant only eased the surface";
    case "stretch": return "after stretching missed the floor";
    case "pilates": return "after Pilates skipped the floor";
    case "core":
    case "gym": return "after ab workouts did not reach it";
    case "trainer": return "after training without a pelvic focus";
    case "training": return "after pushing through did not fix it";
    case "binder": return "after a binder only held it from outside";
    case "pessary": return "working alongside your pessary";
    case "avoiding": return "after avoiding activity did not heal it";
    case "waiting": return "after waiting did not bring it back";
    case "fiber": return "after diet changes alone fell short";
    case "retraining": return "after routine changes alone fell short";
    case "reading": return "after reading without a daily plan";
    case "nothing":
    case "unsure":
    case undefined:
    case null: return null;
    default: return `after trying ${lowercaseFirst(tried.title)}`;
  }
}

function naturalList(values) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

/** SubscriptionViewController.tailoredContext, or null when she skipped everything. */
export function tailoredContext({ situation, frequency, tried }) {
  const details = [];
  if (situation) details.push(lowercaseFirst(situation.title));
  if (frequency?.revealPhrase) details.push(frequency.revealPhrase);
  const triedText = triedDetail(tried);
  if (triedText) details.push(triedText);
  if (details.length === 0) return null;
  return `Built around ${naturalList(details)}.`;
}

export function dayOneTitle(goalId, situationId, fallback) {
  const key = `${goalId}:${situationId || ""}`;
  const table = {
    "intimacy:erection": "Support Stronger Erections",
    "intimacy:early": "Build Lasting Control",
    "intimacy:tension": "Release Pelvic Tension",
    "intimacy:confidence": "Build Confident Control",
    "intimacy:sensation": "Awaken Sensation Gently",
    "intimacy:orgasm": "Release Before Pleasure",
    "intimacy:dryness": "Comfort Before Intimacy",
    "bladderLeaks:stress": "Cough and Laugh With Control",
    "bladderLeaks:urge": "Ride Out an Urge",
    "bladderLeaks:night": "Calm Nighttime Urges",
    "pelvicPain:sitting": "Sit With Less Tension",
    "pelvicPain:intimacy": "Release Before Intimacy",
    "fitness:running": "Run With More Control",
    "fitness:lifting": "Lift Without Strain",
  };
  return table[key] || fallback;
}

export function paywallImage(goalId, pathway, fallbackName) {
  const name = isMens(pathway) ? (goalId === "coreStrength" ? "insights_men2" : "insights_men") : fallbackName;
  return `/paywall/${name}.jpg`;
}

export function paywallStrategySymbol(goalId, goalSymbol) {
  return goalId === "intimacy" ? "heart.circle.fill" : goalSymbol;
}

// ---------------------------------------------------------------------------
// The three daily signals (GoalDailyTrackingPlan.current): the goal's own
// three prompts, with her focus's prompt taking over the matching slot.
// ---------------------------------------------------------------------------

const GOAL_SIGNALS = {
  bladderLeaks: [["leak", "Leaks"], ["secondary", "Urge control"], ["confidence", "Confidence"]],
  postpartum: [["discomfort", "Recovery comfort"], ["secondary", "Energy"], ["confidence", "Core connection"]],
  pregnancyPrep: [["discomfort", "Body comfort"], ["secondary", "Energy"], ["confidence", "Body readiness"]],
  diastasisRecti: [["discomfort", "Doming or pressure"], ["secondary", "Core connection"], ["confidence", "Movement confidence"]],
  pelvicPain: [["discomfort", "Pain or discomfort"], ["secondary", "Muscle ease"], ["confidence", "Movement confidence"]],
  coreStrength: [["discomfort", "Exercise comfort"], ["secondary", "Core connection"], ["confidence", "Control"]],
  fitness: [["discomfort", "Pressure or heaviness"], ["secondary", "Energy"], ["confidence", "Movement confidence"]],
  prolapse: [["discomfort", "Heaviness or bulging"], ["secondary", "Pelvic support"], ["confidence", "Movement confidence"]],
  prostateRecovery: [["leak", "Leaks or drips"], ["secondary", "Bladder control"], ["confidence", "Recovery confidence"]],
  bowelControl: [["leak", "Leaks or staining"], ["secondary", "Urgency control"], ["confidence", "Confidence"]],
  stability: [["discomfort", "Movement comfort"], ["secondary", "Steadiness"], ["confidence", "Movement confidence"]],
};

export function trackingSignals(goalId, pathway, focus) {
  let prompts;
  if (goalId === "intimacy") {
    prompts = isMens(pathway)
      ? [["discomfort", "Pelvic tension"], ["secondary", "Erection support"], ["confidence", "Lasting control"]]
      : [["discomfort", "Comfort"], ["secondary", "Sensation"], ["confidence", "Confidence"]];
  } else {
    prompts = GOAL_SIGNALS[goalId] || GOAL_SIGNALS.coreStrength;
  }
  const slot = focus?.tracking?.slot;
  const titles = prompts.map(([s, title]) => (slot && s === slot && focus.tracking.title ? focus.tracking.title : title));
  return titles;
}
