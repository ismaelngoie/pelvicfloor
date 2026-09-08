// Every word the iOS 3.1.8 onboarding says, ported screen by screen.
//
// appCatalog.json is generated straight from the app's Swift catalogs
// (GoalID, SymptomProfile, GoalFocus, PrevalenceCatalog) by compiling them, so
// the questions, options, focus lists and paywall promises cannot drift. The
// tables in this file are the screen copy that lives in the view controllers:
// WelcomeViewController, BodyPathwayViewController, SelectGoalViewController,
// GoalFocusViewController, SymptomIntakeView, HowPelvicHelpViewController,
// PersonalIntakeViewController and the health / personalizing halves of
// PlanRevealViewController. Change the phone first, then this file.
//
// ONE WEB-ONLY EXCEPTION: the "Tighten Vaginal Canal" focus (TIGHTENING_FOCUS
// below) was added to appCatalog.json by hand on September 8, 2026 as the
// first option under Improve Intimacy on the women's pathway. The phone does
// not have it yet. It exists because that is the word the women who buy the
// pelvic floor exerciser use, and every screen that echoes her focus says it.

import CATALOG from "./appCatalog.json";

export const PATHWAY_WOMEN = "womensPelvicHealth";
export const PATHWAY_MEN = "mensPelvicHealth";
export const isMens = (pathway) => pathway === PATHWAY_MEN;

/** The web-only "Tighten Vaginal Canal" focus, first under Improve Intimacy. */
export const TIGHTENING_FOCUS = "intimacy.tightening";
export const isTightening = (focusId) => focusId === TIGHTENING_FOCUS;

/** "improve intimacy", or "tighten your vaginal canal" once she picked that focus. */
export function focusSentencePhrase(goalId, focusId, fallback) {
  return goalId === "intimacy" && isTightening(focusId) ? "tighten your vaginal canal" : fallback;
}

export function pathwayData(pathway) {
  return CATALOG.pathways[pathway] || null;
}

export function goalOrder(pathway) {
  return pathwayData(pathway)?.goalOrder || [];
}

export function goalData(pathway, goalId) {
  return pathwayData(pathway)?.goals?.[goalId] || null;
}

/** The same goal record whatever the pathway, for screens that only need titles. */
export function anyGoalData(goalId, pathway) {
  return goalData(pathway, goalId) || goalData(PATHWAY_WOMEN, goalId) || goalData(PATHWAY_MEN, goalId);
}

export const MEANING_QUESTION = CATALOG.meaningQuestion;
export const TRIED_QUESTION = CATALOG.triedQuestion;
export const MEANING_OPTIONS = CATALOG.meaningOptions;

export function situationData(pathway, goalId, id) {
  return goalData(pathway, goalId)?.situations.find((s) => s.id === id) || null;
}
export function frequencyData(pathway, goalId, id) {
  return goalData(pathway, goalId)?.frequencies.find((s) => s.id === id) || null;
}
export function triedData(pathway, goalId, id) {
  return goalData(pathway, goalId)?.tried.find((s) => s.id === id) || null;
}
export function impactsData(pathway, goalId, ids) {
  const catalog = goalData(pathway, goalId)?.impacts || [];
  return (ids || []).map((id) => catalog.find((i) => i.id === id)).filter(Boolean);
}
export function meaningData(id) {
  return MEANING_OPTIONS.find((m) => m.id === id) || null;
}
export function focusData(pathway, goalId, id) {
  return goalData(pathway, goalId)?.focus.find((f) => f.id === id) || null;
}

/** SymptomProfileStore.impactReceiptPhrase: "closeness and enjoyment". */
export function impactReceiptPhrase(pathway, goalId, ids) {
  const titles = impactsData(pathway, goalId, ids)
    .filter((i) => i.id !== "other")
    .slice(0, 2)
    .map((i) => i.title.toLowerCase());
  if (titles.length === 0) return null;
  return titles.length === 2 ? `${titles[0]} and ${titles[1]}` : titles[0];
}

/** SymptomProfileStore.revealSentence, markdown bold and all. */
export function revealSentence(pathway, goalId, situationId, frequencyId) {
  const situation = situationData(pathway, goalId, situationId);
  if (!situation || !situation.planEmphasis) return null;
  const frequencyPhrase = frequencyData(pathway, goalId, frequencyId)?.revealPhrase || "";
  const clause = frequencyPhrase ? `, ${frequencyPhrase}` : "";
  return `Because this affects you mainly **${situation.revealPhrase}**${clause}, Coach Mia™ built your plan around ${situation.planEmphasis}.`;
}

// ---------------------------------------------------------------------------
// Welcome (WelcomeViewController)
// ---------------------------------------------------------------------------

export const WELCOME = {
  headline: { before: "A stronger\npelvic floor, in\n", italic: "five minutes", after: " a day." },
  headlineA11y: "A stronger pelvic floor, in five minutes a day.",
  subtitle: "Fewer leaks, easier recovery, better intimacy.",
  benefits: [
    { icon: "figure.run.circle.fill", text: "A new 5-minute plan, just for you, every day." },
    { icon: "play.rectangle.on.rectangle.fill", text: "500+ videos, all approved by physios." },
    { icon: "doc.text.fill", text: "Progress report for your doctor or PT." },
    { icon: "bubble.left.and.bubble.right.fill", text: "Chat with your Physio Coach, Mia™, 24/7." },
  ],
  cta: "Start My 5-Min Journey",
  memberCountFrom: 9000,
  memberCountTo: 9800,
  memberCountLine: (n) => `Join ${new Intl.NumberFormat("en-US").format(n)}+ members finding confidence.`,
  reviewer: "Clinically reviewed by Dr Evelyn Reed, PT",
  reviews: [
    { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
    { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
    { text: "More sensation, less worry, more us.", author: "Jess, 35" },
    { text: "Pain-free sitting. Sleep through the night. Life feels possible again.", author: "Olivia, 41" },
    { text: "From wobbly to steady, lifting my baby feels safe again.", author: "Mia, 33" },
    { text: "Bathroom maps? Deleted. I go where I want.", author: "Priya, 37" },
    { text: "The plan finally made my body make sense.", author: "Leah, 44" },
    { text: "Five minutes I actually do, and it changes everything.", author: "Paige, 28" },
    { text: "Jumped on the trampoline with my kids, first time in years.", author: "Tanya, 42" },
    { text: "I almost quit at week three. By day 90 I honestly didn't recognise my old self.", author: "Marianne, 54" },
  ],
};

// ---------------------------------------------------------------------------
// Body pathway (BodyPathwayViewController)
// ---------------------------------------------------------------------------

export const PATHWAY_SCREEN = {
  title: "Which plan should we build for you?",
  subtitle: "We ask so your questions, exercises, and tracking fit your body.",
  cta: "Continue",
  options: [
    { id: PATHWAY_WOMEN, symbol: "figure.dress.line.vertical.figure" },
    { id: PATHWAY_MEN, symbol: "figure.stand" },
  ].map((o) => ({ ...o, title: pathwayData(o.id).title, detail: pathwayData(o.id).detail })),
};

// ---------------------------------------------------------------------------
// Goal (SelectGoalViewController)
// ---------------------------------------------------------------------------

export const GOAL_SCREEN = {
  title: "What would you like to work on?",
  subtitle: "Pick the one that matters most. Coach Mia™ builds your plan around it, and you can change it later.",
  cta: "Set My Goal",
};

export function goalAcknowledgement(goalId, pathway) {
  switch (goalId) {
    case "bladderLeaks":
      return "You are in the right place. Leaks are common and treatable with the right training.";
    case "intimacy":
      return isMens(pathway)
        ? "You are in the right place. Improve erections and last longer with a plan built around control, release, and support."
        : "You are in the right place. Comfort, relaxation, and control can all be trained.";
    case "postpartum":
      return "You are in the right place. Recovery can be rebuilt one steady step at a time.";
    case "diastasisRecti":
      return "You are in the right place. Deep-core control can improve how your middle handles pressure.";
    case "prolapse":
      return "You are in the right place. The right support and pressure training can help symptoms.";
    case "pelvicPain":
      return "You are in the right place. Your plan starts with release, comfort, and control.";
    case "coreStrength":
      return "You are in the right place. We will build the deep support behind everyday strength.";
    case "fitness":
      return "You are in the right place. Your plan will connect pelvic support to real movement.";
    case "pregnancyPrep":
      return "You are in the right place. We will build support, breathing, and confidence.";
    case "stability":
      return "You are in the right place. Steadiness can be trained from the inside out.";
    case "prostateRecovery":
      return "You are in the right place. Your plan will rebuild control after prostate surgery step by step.";
    case "bowelControl":
      return "You are in the right place. Bowel control can improve with better timing, support, and daily habits.";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Focus (GoalFocusViewController)
// ---------------------------------------------------------------------------

export const FOCUS_SCREEN = {
  title: "What do you want to change first?",
  subtitle: (memberSentencePhrase) =>
    `Coach Mia™ will shape your complete plan to ${memberSentencePhrase} around what you choose.`,
  cta: "Personalize My Plan",
};

export function focusReaction(focusId) {
  const lead = "That gives us a clear target.";
  switch (focusId) {
    case TIGHTENING_FOCUS:
      return `${lead} Your plan will train the squeeze, the lift and the hold that make your vaginal canal tighter.`;
    case "bladder.urgency":
      return `${lead} Your plan will train calm, control, and the pause before you move.`;
    case "bladder.nighttime":
      return `${lead} Your plan will work on calmer urges and fewer disrupted nights.`;
    case "bladder.stressLeaks":
    case "bladder.confidence":
    case "bladder.frequency":
      return `${lead} Timing and pressure control will lead your plan.`;
    case "intimacy.comfort":
    case "intimacy.relaxation":
    case "pain.intimacy":
      return `${lead} We will start with release and comfort, not more squeezing.`;
    case "intimacy.sensation":
    case "intimacy.confidence":
    case "intimacy.dryness":
    case "intimacy.postpartum":
      return `${lead} Your plan will balance release, feeling, and control.`;
    case "prolapse.pressure":
    case "prolapse.heaviness":
      return `${lead} We will start with pressure relief, then build lasting support.`;
    case "prolapse.support":
    case "prolapse.dailyMovement":
    case "prolapse.exercise":
      return `${lead} Breath, support, and daily movement will progress together.`;
    case "diastasis.doming":
    case "diastasis.pressure":
    case "diastasis.connection":
    case "diastasis.dailyMovement":
    case "diastasis.return":
      return `${lead} Your plan will build deep-core control before adding harder movement.`;
    case "postpartum.reconnect":
    case "postpartum.core":
    case "postpartum.leaks":
    case "postpartum.pressure":
    case "postpartum.return":
      return `${lead} Your recovery will start where your body is today.`;
    case "pain.flares":
    case "pain.tightness":
    case "pain.sitting":
    case "pain.movement":
      return `${lead} Comfort and release come before strength.`;
    case "maleSexual.erectionQuality":
      return `${lead} Your plan will build erection support through timing, release, and steady pelvic control.`;
    case "maleSexual.ejaculationControl":
      return `${lead} Your plan will train the release and control that help you last longer.`;
    case "maleSexual.pelvicTension":
      return `${lead} Your plan will release tension before adding stronger work.`;
    case "maleSexual.confidence":
      return `${lead} Your plan will build repeatable control so confidence can follow.`;
    default:
      return `${lead} Every session will be shaped around this first priority.`;
  }
}

// ---------------------------------------------------------------------------
// Calibration (SymptomIntakeView): five questions, prevalence after the second
// ---------------------------------------------------------------------------

export const CALIBRATION_STEPS = [
  { key: "situation", cta: "This Is Me", subtitle: "One tap. Coach Mia™ builds your plan's emphasis around it." },
  { key: "frequency", cta: "Set My Baseline", subtitle: "Your honest baseline. Day 7 measures against it." },
  { key: "tried", cta: "Build On This", subtitle: "So your plan starts where the last approach stopped." },
  { key: "impacts", cta: "I Want These Back", subtitle: "Pick all that are true. Your plan works to give them back." },
  { key: "meaning", cta: "Use My Answers", subtitle: "One tap. Your plan keeps this in front of you." },
];

export const CALIBRATION_SKIP = "Prefer not to say";

export function calibrationQuestion(pathway, goalId, step) {
  const goal = goalData(pathway, goalId);
  switch (step) {
    case 0: return goal?.situationQuestion || "";
    case 1: return goal?.frequencyQuestion || "";
    case 2: return TRIED_QUESTION;
    case 3: return goal?.impactQuestion || "";
    default: return MEANING_QUESTION;
  }
}

export const PREVALENCE_SCREEN = {
  eyebrow: "BEFORE WE GO ON",
  studies: "WHAT THE STUDIES SHOW",
};

// ---------------------------------------------------------------------------
// Method (NormalizationInterstitialView)
// ---------------------------------------------------------------------------

export const METHOD_SCREEN = {
  eyebrow: "A METHOD BUILT AROUND YOUR ANSWERS",
  clinical: "Clinical method: neuromuscular retraining. Your answers set the order, effort, and your daily 5 minutes.",
  cta: "See How My Plan Works",
};

export function methodTitle(triedId) {
  switch (triedId) {
    case "kegels": return "Our app goes beyond basic Kegels.";
    case "videos": return "Our app is different from random videos.";
    case "pt":
    case "clinic":
    case "rehab": return "Our app turns therapy into daily progress.";
    case "pads": return "Our app trains control before leaks happen.";
    case "meds": return "Our app trains what medication cannot.";
    case "core":
    case "gym": return "Our app fixes what crunches could not.";
    case "pilates":
    case "trainer":
    case "training":
    case "stretch": return "Our app adds the layer workouts skip.";
    case "relax":
    case "techniques": return "Our app makes the release automatic.";
    case "pessary":
    case "binder": return "Our app builds support from the inside.";
    case "bladder_training":
    case "retraining":
    case "fiber":
    case "fluids": return "Our app trains the muscle, not just the routine.";
    case "waiting":
    case "avoiding": return "Our app rebuilds what waiting cannot.";
    default: return "Our app builds the right plan from day one.";
  }
}

export function methodContent(goalId, pathway, situationId, focusId) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "bladderLeaks":
      return {
        subtitle: mens
          ? "Your plan targets bladder leaks, sudden urges, and drips after urinating with precise timing and control."
          : "Your plan trains the exact response needed for coughing, sneezing, running, and sudden urges.",
        phases: ["Timing", "Control", "Endurance"],
        symbol: "drop.fill",
      };
    case "intimacy":
      if (mens) {
        switch (situationId) {
          case "erection":
            return { subtitle: "Your plan trains the muscles that support erection firmness, blood flow, and control.", phases: ["Erections", "Control", "Stamina"], symbol: "heart.circle.fill" };
          case "early":
            return { subtitle: "Your plan trains release and ejaculation control to help you last longer.", phases: ["Release", "Control", "Last longer"], symbol: "heart.circle.fill" };
          case "tension":
            return { subtitle: "Your plan releases pelvic tension that can interfere with erections, ejaculation, and comfort.", phases: ["Release", "Erections", "Comfort"], symbol: "heart.circle.fill" };
          default:
            return { subtitle: "Your plan targets erections, ejaculation control, and stamina with the right mix of release and strength.", phases: ["Erections", "Control", "Confidence"], symbol: "heart.circle.fill" };
        }
      }
      if (isTightening(focusId)) {
        return { subtitle: "Your plan trains the squeeze, lift and hold that tighten your vaginal canal, then adds endurance so it lasts.", phases: ["Squeeze", "Hold", "Tighter"], symbol: "arrow.right.and.line.vertical.and.arrow.left" };
      }
      switch (situationId) {
        case "entry":
        case "deep":
          return { subtitle: "Your plan starts with release for comfortable penetration, then builds control and strength.", phases: ["Release", "Comfort", "Control"], symbol: "heart.fill" };
        case "sensation":
          return { subtitle: "Your plan combines blood flow, awareness, and strength to improve sensation during sex.", phases: ["Blood flow", "Feeling", "Strength"], symbol: "heart.fill" };
        case "orgasm":
          return { subtitle: "Your plan trains the muscle timing and strength behind easier, stronger orgasms.", phases: ["Timing", "Control", "Orgasm"], symbol: "heart.fill" };
        case "dryness":
          return { subtitle: "Your plan combines release, blood flow, and comfortable movement to support arousal and reduce irritation.", phases: ["Release", "Blood flow", "Comfort"], symbol: "heart.fill" };
        default:
          return { subtitle: "Your plan trains comfort, feeling, orgasm control, and confidence in the order your body needs.", phases: ["Comfort", "Feeling", "Control"], symbol: "heart.fill" };
      }
    case "prostateRecovery":
      return { subtitle: "Your plan rebuilds bladder control after prostate surgery with paced daily progression for leaks and drips.", phases: ["Control", "Fewer leaks", "Confidence"], symbol: "cross.case.fill" };
    case "bowelControl":
      return { subtitle: "Your plan trains closure, endurance, and full release for fewer bowel leaks and easier emptying.", phases: ["Closure", "Endurance", "Release"], symbol: "circle.hexagongrid.fill" };
    case "pelvicPain":
      return { subtitle: "Your plan releases guarding and pelvic pain first, then adds support without triggering another flare.", phases: ["Release", "Relief", "Support"], symbol: "bolt.slash.fill" };
    case "prolapse":
      return { subtitle: "Your plan trains lift and pressure control to reduce heaviness and support standing, lifting, and exercise.", phases: ["Pressure", "Lift", "Endurance"], symbol: "arrow.up.heart.fill" };
    case "postpartum":
      return { subtitle: "Your plan rebuilds support after birth for leaks, heaviness, core weakness, and a confident return to movement.", phases: ["Reconnect", "Support", "Strength"], symbol: "figure.and.child.holdinghands" };
    case "pregnancyPrep":
      return { subtitle: "Your plan builds support now and teaches the pelvic floor to release when your body needs it.", phases: ["Breath", "Support", "Release"], symbol: "sun.max.fill" };
    case "diastasisRecti":
      return { subtitle: "Your plan controls pressure and rebuilds the deep core to reduce doming and strengthen your middle.", phases: ["Pressure", "Deep core", "Progression"], symbol: "arrow.right.and.line.vertical.and.arrow.left" };
    case "fitness":
      return { subtitle: "Your plan connects pelvic support to running, lifting, and impact so strength carries into every workout.", phases: ["Breath", "Support", "Power"], symbol: "figure.run" };
    default:
      return { subtitle: "Your plan connects the deep core and pelvic floor so posture, balance, and everyday strength improve together.", phases: ["Breath", "Deep core", "Strength"], symbol: "bolt.fill" };
  }
}

// ---------------------------------------------------------------------------
// Constellation (HowPelvicHelpViewController)
// ---------------------------------------------------------------------------

export const CONSTELLATION_SCREEN = {
  headlineLead: "Here's how we'll",
  proof: "Your answers set the method, progression, and pace. Clinically reviewed by Dr Evelyn Reed, PT.",
  cta: "Continue My Assessment",
};

export function constellationBase(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "pregnancyPrep":
      return { subtitle: "We build a strong base now, so pregnancy feels better and recovery comes easier.", icon: "figure.child", nodes: [["leaf.fill", "Gentle prep for birth"], ["bolt.heart.fill", "A ready pelvic floor"], ["figure.strengthtraining.traditional", "A core built for birth"], ["figure.stand", "Support for your bump"], ["figure.walk", "Easier back and hips"], ["sparkles", "Calm body, calm mind"]] };
    case "postpartum":
      return { subtitle: "We rebuild your core gently and safely, at the pace your body is ready for.", icon: "heart.fill", nodes: [["heart.fill", "A restored pelvic floor"], ["link", "Core joined up again"], ["shield.lefthalf.filled", "Gentle, safe steps"], ["figure.stand", "Lift baby with ease"], ["figure.walk", "A back that feels held"], ["bandage.fill", "Kind to C-section scars"]] };
    case "coreStrength":
      return { subtitle: "We build deep strength you can feel, so you stand taller and move with more power.", icon: "bolt.fill", nodes: [["bolt.fill", "A stronger deep core"], ["figure.strengthtraining.traditional", "Lift without worry"], ["figure.run", "Run tall, run free"], ["figure.stand", "Posture that holds"], ["shield.lefthalf.filled", "Fewer aches and strains"], ["lungs.fill", "Breathe from your core"]] };
    case "bladderLeaks":
      return {
        subtitle: mens
          ? "We train timing, pressure control, and the muscles that prevent leaks and after-urination drips."
          : "We train the muscles that hold you in, so a cough or a laugh stops being a worry.",
        icon: "shield.lefthalf.filled",
        nodes: [["drop.fill", mens ? "Fewer leaks and drips" : "Sneeze without worry"], ["figure.run", mens ? "Move without worry" : "Run and jump freely"], ["bed.double.fill", "Drier nights"], ["timer", "Fewer sudden urges"], ["figure.strengthtraining.traditional", "Workouts without leaks"], ["checkmark.circle.fill", "Leave the pads behind"]],
      };
    case "prolapse":
      return { subtitle: "We reduce downward pressure first, then build support that lasts through real life.", icon: "arrow.up.heart.fill", nodes: [["arrow.up.heart.fill", "Better pelvic support"], ["scalemass.fill", "Less heaviness"], ["figure.walk", "More comfort on your feet"], ["dumbbell.fill", "Lift with less pressure"], ["lungs.fill", "Breathe through effort"], ["shield.fill", "Move with confidence"]] };
    case "pelvicPain":
      return { subtitle: "We release the tight muscles first, then add the gentle strength that keeps the relief.", icon: "bandage.fill", nodes: [["figure.seated.side", "Sit without pain"], ["figure.walk", "Move more comfortably"], ["bed.double.fill", "Sleep through the night"], ["leaf.fill", "Gentle relief each day"], ["heart.fill", "Enjoy intimacy again"], ["bolt.slash.fill", "Let deep tension go"]] };
    case "intimacy":
      if (!mens && isTightening(focusId)) {
        return {
          subtitle: "We train the muscles that grip your vaginal canal, so you feel tighter, stronger and more.",
          icon: "arrow.right.and.line.vertical.and.arrow.left",
          nodes: [["arrow.right.and.line.vertical.and.arrow.left", "A tighter vaginal canal"], ["bolt.heart.fill", "A stronger grip"], ["sparkles", "More feeling for both of you"], ["heart.fill", "Stronger orgasms"], ["face.smiling", "Confidence comes back"], ["person.2.fill", "Feel close again"]],
        };
      }
      return {
        subtitle: mens
          ? "We combine pelvic release, strength, timing, and control to support erections, stamina, and confidence."
          : "We work on comfort, feeling and confidence, at your pace and in private.",
        icon: "heart.circle.fill",
        nodes: [["heart.circle.fill", mens ? "Better erection support" : "More feeling"], ["heart.fill", mens ? "More control and stamina" : "Stronger orgasms"], ["sparkles", "Comfort, not tension"], ["face.smiling", "Confidence comes back"], ["person.2.fill", "Feel close again"], ["bolt.heart.fill", "A stronger pelvic floor"]],
      };
    case "prostateRecovery":
      return { subtitle: "We rebuild bladder control and pelvic confidence with recovery-aware daily training.", icon: "cross.case.fill", nodes: [["drop.fill", "Fewer leaks and drips"], ["checkmark.shield.fill", "Better bladder control"], ["figure.walk", "Move with confidence"], ["lungs.fill", "Breathe without straining"], ["timer", "Short daily sessions"], ["chart.line.uptrend.xyaxis", "Track recovery progress"]] };
    case "bowelControl":
      return { subtitle: "We train coordination, control, and release so urgency and bathroom worry stop running your day.", icon: "checkmark.shield.fill", nodes: [["timer", "Calmer urgency"], ["checkmark.shield.fill", "Better bowel control"], ["wind", "Easier pelvic release"], ["figure.walk", "Confidence away from home"], ["lungs.fill", "Less straining"], ["chart.line.uptrend.xyaxis", "Progress you can track"]] };
    case "fitness":
      return { subtitle: "We build the core strength underneath everything else you train.", icon: "trophy.fill", nodes: [["figure.walk", "Stronger every day"], ["figure.strengthtraining.traditional", "Safe, guided sessions"], ["figure.run", "Cardio, core, control"], ["chart.line.uptrend.xyaxis", "Progress you can feel"], ["timer", "5 minutes a day"], ["figure.stand", "Move with confidence"]] };
    case "stability":
      return { subtitle: "We steady your middle, so standing, walking and stairs all feel easier.", icon: "figure.stand", nodes: [["figure.stand", "A steady, balanced core"], ["arrow.up.and.down.circle", "Steady on your feet"], ["figure.walk", "Walk tall, no wobble"], ["shield.lefthalf.filled", "A back that feels held"], ["figure.strengthtraining.traditional", "Stronger hips and knees"], ["arrow.left.and.right", "Steady side to side"]] };
    case "diastasisRecti":
      return { subtitle: "Rebuild the deep-core control behind less doming, better pressure management and stronger everyday movement.", icon: "arrow.right.and.line.vertical.and.arrow.left", nodes: [["arrow.right.and.line.vertical.and.arrow.left", "Less doming under pressure"], ["link", "Deep core working together"], ["shield.lefthalf.filled", "Better pressure control"], ["figure.stand", "A more supported middle"], ["figure.walk", "Lift and carry with control"], ["checkmark.circle.fill", "Strength for everyday movement"]] };
    default:
      return { subtitle: "", icon: "sparkles", nodes: [] };
  }
}

const FOCUS_OUTCOME_LABELS = {
  [TIGHTENING_FOCUS]: "A tighter vaginal canal",
  "intimacy.sensation": "More feeling and stronger orgasms",
  "intimacy.comfort": "Comfortable intimacy",
  "intimacy.relaxation": "Muscles that let go",
  "intimacy.dryness": "More comfort with dryness",
  "intimacy.confidence": "Confidence and connection",
  "intimacy.postpartum": "Comfort after birth",
  "bladder.stressLeaks": "Cough and move without leaks",
  "bladder.urgency": "Calmer sudden urges",
  "bladder.frequency": "Fewer bathroom trips",
  "bladder.nighttime": "Fewer wake-ups",
  "bladder.confidence": "Confidence away from bathrooms",
  "bladder.afterDribble": "Fewer drips after urinating",
  "prolapse.pressure": "Less pelvic pressure",
  "prolapse.heaviness": "Less heaviness by evening",
  "prolapse.support": "Better pelvic support",
  "prolapse.dailyMovement": "Move through the day confidently",
  "prolapse.exercise": "Exercise with less pressure",
  "postpartum.reconnect": "Feel your pelvic floor again",
  "postpartum.core": "Reconnect your deep core",
  "postpartum.leaks": "Fewer postpartum leaks",
  "postpartum.pressure": "Less pressure and heaviness",
  "postpartum.return": "Return to exercise confidently",
  "diastasis.doming": "Less visible doming",
  "diastasis.connection": "Feel your deep core working",
  "diastasis.pressure": "Better pressure control",
  "diastasis.dailyMovement": "Easier daily movement",
  "diastasis.return": "Return to harder exercise",
  "pregnancy.relaxation": "Pelvic muscles that relax",
  "pregnancy.support": "Support for pregnancy",
  "pregnancy.breathing": "Breathe through effort",
  "pregnancy.comfort": "Comfort as your body changes",
  "pregnancy.movement": "Confidence while moving",
  "pain.flares": "Calmer pain flares",
  "pain.tightness": "Release tight muscles",
  "pain.sitting": "Sit more comfortably",
  "pain.intimacy": "Comfortable intimacy",
  "pain.movement": "Move with less fear",
  "core.connection": "Feel your deep core working",
  "core.bracing": "Brace and keep breathing",
  "core.backSupport": "More support for your back",
  "core.posture": "Better posture and control",
  "core.endurance": "Core strength that lasts",
  "fitness.leaks": "Exercise without leaks",
  "fitness.lifting": "Lift with pressure control",
  "fitness.impact": "Run and jump with control",
  "fitness.coreControl": "A steadier core in workouts",
  "fitness.confidence": "Confidence in workouts",
  "stability.hips": "Steadier hips",
  "stability.balance": "Better balance",
  "stability.posture": "Posture that holds",
  "stability.walking": "Steadier walking",
  "maleSexual.erectionQuality": "Better erection support",
  "maleSexual.ejaculationControl": "Last longer with more control",
  "maleSexual.pelvicTension": "Less tension during intimacy",
  "maleSexual.confidence": "More sexual confidence",
  "prostate.continence": "Better bladder control",
  "prostate.drips": "Fewer leaks and drips",
  "prostate.urgency": "Calmer sudden urges",
  "prostate.confidence": "More recovery confidence",
  "bowel.urgency": "Calmer bowel urgency",
  "bowel.accidents": "Fewer bowel accidents",
  "bowel.emptying": "Easier bowel emptying",
  "bowel.confidence": "Confidence away from bathrooms",
};

/** "Relax tight pelvic muscles" -> "relax tight pelvic muscles", "my" -> "your". */
export function secondPersonPhrase(text) {
  return String(text || "")
    .replace(/ my /gi, " your ")
    .replace(/^My /i, "Your ")
    .toLowerCase();
}

export function cleanAnswer(text) {
  return String(text || "")
    .replace(/ my /gi, " your ")
    .replace(/^My /i, "Your ")
    .replace(/ , /g, ", ")
    .replace(/^I'm just /i, "")
    .trim();
}

export function focusOutcomeLabel(focus) {
  if (!focus) return "";
  return FOCUS_OUTCOME_LABELS[focus.id] || cleanAnswer(focus.title.replace(/ my /gi, " your "));
}

const OUTCOME_TOPICS = [
  ["comfort", ["comfort", "irritation"]],
  ["sensation", ["sensation", "feeling", "feel more"]],
  ["orgasm", ["orgasm"]],
  ["release", ["relax", "tension", "let go"]],
  ["leaks", ["leak", "sneeze", "cough"]],
  ["urges", ["urge"]],
  ["bathroom", ["bathroom", "pads"]],
  ["night", ["night", "wake"]],
  ["core", ["core"]],
  ["pressure", ["pressure", "heaviness"]],
  ["doming", ["doming", "middle"]],
  ["posture", ["posture", "stand tall"]],
  ["balance", ["balance", "steady", "steadier"]],
  ["lifting", ["lift", "carry"]],
  ["impact", ["run", "jump", "sport"]],
  ["pain", ["pain", "flare", "ache", "strain"]],
  ["confidence", ["confidence", "confident"]],
  ["pregnancy", ["pregnancy", "birth"]],
  ["support", ["support", "held"]],
];

function outcomeTopics(text) {
  const lower = String(text || "").toLowerCase();
  const topics = new Set();
  for (const [topic, keys] of OUTCOME_TOPICS) {
    if (keys.some((k) => lower.includes(k))) topics.add(topic);
  }
  return topics;
}

const normalized = (text) => String(text || "").trim().toLowerCase();

/** "We will start with …": the focus title lowercased, except where that reads badly. */
const FOCUS_START_PHRASE = { [TIGHTENING_FOCUS]: "tightening your vaginal canal" };

function triedNode(tried) {
  switch (tried?.id) {
    case "kegels": return ["arrow.up.and.down.circle", "Train squeeze and release"];
    case "pads": return ["shield.fill", "Build control beyond pads"];
    case "pt": return ["cross.case.fill", "Build on your PT work"];
    case "videos": return ["play.rectangle.fill", "One connected plan"];
    case "nothing": return ["figure.walk", "Start at your level"];
    default: return null;
  }
}

/** HowPelvicHelpViewController.personalizedNodes, six rings at most. */
export function constellationNodes({ base, focus, situation, impacts, tried }) {
  const nodes = [];
  const deferred = [];
  const containsExact = (candidate) => {
    const key = normalized(candidate[1]);
    return nodes.some((n) => normalized(n[1]) === key) || deferred.some((n) => normalized(n[1]) === key);
  };
  const add = (candidate, preferringNewTopic) => {
    if (!candidate || containsExact(candidate)) return;
    const topics = outcomeTopics(candidate[1]);
    const repeatsTopic =
      topics.size > 0 &&
      nodes.some((n) => [...outcomeTopics(n[1])].some((t) => topics.has(t)));
    if (preferringNewTopic && repeatsTopic) deferred.push(candidate);
    else nodes.push(candidate);
  };
  if (situation?.constellationOutcome) add(["scope", situation.constellationOutcome], false);
  for (const impact of (impacts || []).slice(0, 2)) {
    if (impact.tile) add([impact.symbol, impact.tile], true);
  }
  if (focus) add([focus.symbol, focusOutcomeLabel(focus)], true);
  if (tried) add(triedNode(tried), false);
  for (const node of base) add(node, true);
  for (const candidate of deferred) {
    if (nodes.length >= 6) break;
    const key = normalized(candidate[1]);
    if (!nodes.some((n) => normalized(n[1]) === key)) nodes.push(candidate);
  }
  return nodes.slice(0, 6);
}

/** HowPelvicHelpViewController.personalizationSummary. */
export function constellationSummary({ fallback, focus, situation, frequency, tried }) {
  if (!focus && !situation && !frequency && !tried) return fallback;
  let first = "You told us";
  if (situation) first += ` this shows up most with ${cleanAnswer(situation.title).toLowerCase()}`;
  else first += " what matters most right now";
  if (frequency?.revealPhrase) first += `, ${frequency.revealPhrase}`;
  first += ".";
  const second = focus ? `We will start with ${FOCUS_START_PHRASE[focus.id] || secondPersonPhrase(focus.title)}.` : fallback;
  let third = "";
  switch (tried?.id) {
    case "kegels": third = "And because Kegels alone did not fix it, your plan adds release, timing and progression."; break;
    case "videos": third = "And because random videos did not fix it, every session here builds on the last."; break;
    case "pt":
    case "clinic":
    case "rehab": third = "Your therapy gives us a strong base to build on."; break;
    case "pads": third = "We train control before the leak, not just cleanup after."; break;
    case "meds": third = "And medication calms symptoms; your plan trains the muscle underneath."; break;
    case "nothing": third = "We start at a clear first step."; break;
    default: third = "";
  }
  return [first, second, third].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Coach Mia intake (PersonalIntakeViewController)
// ---------------------------------------------------------------------------

const MIA_WOMEN_FALLBACK = {
  goalAcknowledgement: "I've got you, {name}. We'll build a plan around the symptoms and goals you selected.",
  ageJustification: "At {age}, I can set a starting pace that feels useful now and progresses safely.",
  heightJustification: "Got it. Your height helps me set your stance, range, and exercise setup clearly.",
};
const MIA_MEN_FALLBACK = {
  goalAcknowledgement: "I've got you, {name}. We'll build a men's pelvic-health plan around the symptoms and goals you selected.",
  ageJustification: "At {age}, I can set a starting pace that builds control without adding unnecessary tension.",
  heightJustification: "Got it. Your height helps me set your stance, range, and exercise setup clearly.",
};
const MIA_WOMEN = {
  pregnancyPrep: {
    goalAcknowledgement: "Beautiful choice, {name}. We'll get your pelvic floor and core ready, so you feel supported the whole way through.",
    ageJustification: "At {age}, we work on calm breathing and steady strength, so your body feels ready and held.",
    heightJustification: "Got it. Your height tells me how to set up each move, so it feels natural from day one.",
  },
  postpartum: {
    goalAcknowledgement: "I've got you, {name}. We'll rebuild your core gently and bring your confidence back with it.",
    ageJustification: "At {age}, I go for connection before intensity, so healing feels steady and real.",
    heightJustification: "Noted. Your height helps me set up lifting and carrying, so your body feels supported.",
  },
  coreStrength: {
    goalAcknowledgement: "Love it, {name}. We'll build a deep, steady core that holds you up in everything you do.",
    ageJustification: "At {age}, we wake the right muscles up first, then build slowly, so strength comes without strain.",
    heightJustification: "Great. Your height helps me set your angles and depth, so your form stays clean.",
  },
  bladderLeaks: {
    goalAcknowledgement: "On it, {name}. We'll train control, so a sneeze, a laugh or a run stops owning your day.",
    ageJustification: "At {age}, we mix long holds with quick squeezes, so the control is there when real life needs it.",
    heightJustification: "Noted. Your height guides your set up, so the breathing cues land right.",
  },
  pelvicPain: {
    goalAcknowledgement: "I'm with you, {name}. We'll let go of what is tight and build up what supports you, gently.",
    ageJustification: "At {age}, we start with calming work and add strength slowly, so the relief lasts past the session.",
    heightJustification: "Got it. Your height helps me set your angles, so sitting, standing and walking feel softer.",
  },
  intimacy: {
    goalAcknowledgement: "Let's make this feel good again, {name}. We'll build comfort, confidence and feeling, at your pace.",
    ageJustification: "At {age}, I balance letting go with squeezing, which supports arousal and more reliable orgasms.",
    heightJustification: "Noted. I'll suggest positions that keep you comfortable, so tension never cuts things short.",
  },
  prolapse: {
    goalAcknowledgement: "I've got you, {name}. We'll reduce pressure first, then build support that lasts through your day.",
    ageJustification: "At {age}, I can set a safer starting pace for pressure control, support, and daily movement.",
    heightJustification: "Got it. Your height helps me set your stance and range so each movement feels supported.",
  },
  fitness: {
    goalAcknowledgement: "Nice, {name}. We'll turn your core into the quiet engine behind every workout.",
    ageJustification: "At {age}, we pair steadiness with power, so lifts and cardio feel solid every time.",
    heightJustification: "Great. Your height lets me tune your stance and range, so reps feel clean and strong.",
  },
  stability: {
    goalAcknowledgement: "Excellent, {name}. We'll stack you tall and steady, so your body feels sorted again.",
    ageJustification: "At {age}, we train the deep core to hold you up all day, not just during a workout.",
    heightJustification: "Noted. Your height guides your stance and reach, so good posture clicks quickly.",
  },
  diastasisRecti: {
    goalAcknowledgement: "I'm so glad you're here, {name}. We'll rebuild coordination across your deep core so your middle feels supported in everyday life.",
    ageJustification: "At {age}, I set a precise starting level for pressure control, then build strength as your coordination improves.",
    heightJustification: "Noted. Your height helps me cue your posture and range so each rep trains the right deep-core pattern.",
  },
};
const MIA_TIGHTENING = {
  goalAcknowledgement: "Let's get you tighter, {name}. We'll train the squeeze, the lift and the hold that make your vaginal canal stronger and tighter.",
  ageJustification: "At {age}, I balance strong squeezes with full release, so the muscles get tighter without holding tension.",
  heightJustification: "Noted. Your height helps me set your positions, so every squeeze reaches the right muscles.",
};
const MIA_MEN = {
  intimacy: {
    goalAcknowledgement: "Good, {name}. We'll improve erection support and help you last longer with a plan built around control, release, and steady strength.",
    ageJustification: "At {age}, I can set a starting level that builds control without creating more tension.",
    heightJustification: "Got it. Your height helps me set your stance and range so each rep feels controlled.",
  },
  bladderLeaks: {
    goalAcknowledgement: "I've got you, {name}. We'll work on leaks, sudden urges, and after-urination drips with timing you can use in real life.",
    ageJustification: "At {age}, I can balance quick control, longer holds, and full release for the symptoms you chose.",
    heightJustification: "Noted. Your height helps me set your stance and breathing position so the cues feel natural.",
  },
  prostateRecovery: {
    goalAcknowledgement: "I've got you, {name}. We'll rebuild bladder control after prostate surgery one steady step at a time.",
    ageJustification: "At {age}, I can choose a recovery pace that progresses control without rushing fatigue.",
    heightJustification: "Got it. Your height helps me set your seated and standing practice positions clearly.",
  },
  pelvicPain: {
    goalAcknowledgement: "I'm with you, {name}. We'll release pelvic tension first, then build the support that helps you move with less worry.",
    ageJustification: "At {age}, I can set a calmer starting pace and progress only when your body is ready.",
    heightJustification: "Got it. Your height helps me set your angles so sitting, standing, and movement feel easier.",
  },
  bowelControl: {
    goalAcknowledgement: "I've got you, {name}. We'll train bowel control, easier emptying, and better timing without asking you to strain harder.",
    ageJustification: "At {age}, I can set the right mix of support, release, and daily control practice.",
    heightJustification: "Noted. Your height helps me set your seated posture and breathing position clearly.",
  },
  coreStrength: {
    goalAcknowledgement: "Good choice, {name}. We'll build the pelvic floor and deep core together so strength carries into everyday movement.",
    ageJustification: "At {age}, I can set a starting level that feels useful now and gets harder as your control improves.",
    heightJustification: "Great. Your height helps me set your stance and range so each rep stays clean.",
  },
};

export function miaCopy(goalId, pathway, focusId) {
  if (isMens(pathway)) return MIA_MEN[goalId] || MIA_MEN_FALLBACK;
  if (goalId === "intimacy" && isTightening(focusId)) return MIA_TIGHTENING;
  return MIA_WOMEN[goalId] || MIA_WOMEN_FALLBACK;
}

export function priorAttemptLine(triedId) {
  switch (triedId) {
    case "kegels": return "You told me Kegels on their own did not work.";
    case "videos": return "You told me random videos or other apps did not work.";
    case "pt": return "You told me you have already tried physical therapy.";
    case "pads": return "You told me pads or liners only managed the symptom.";
    default: return "You told me this is your first structured pelvic-floor plan.";
  }
}

/**
 * What Coach Mia says before each field. `situationTitle` is the calibration
 * answer, lowercased, or null when she skipped it.
 */
export function miaQuestion({ step, goalId, pathway, focusId, name, age, situationTitle, triedId }) {
  const copy = miaCopy(goalId, pathway, focusId);
  const safeName = name?.trim() ? name.trim() : "there";
  switch (step) {
    case "name": {
      const context = situationTitle
        ? `You said this affects you most with ${situationTitle}.`
        : "I have the answers you just shared.";
      return `${context} What should I call you?`;
    }
    case "age": {
      const echo = situationTitle ? ` You said this affects you most with ${situationTitle}.` : "";
      return (
        copy.goalAcknowledgement.replace("{name}", safeName) +
        echo +
        ` ${priorAttemptLine(triedId)} Your age helps me set recovery time, pacing, and how quickly your five-minute sessions progress. How old are you?`
      );
    }
    case "height":
      return (
        copy.ageJustification.replace("{age}", String(age)) +
        " Your height helps me set stance, range, and exercise setup. How tall are you?"
      );
    case "weight":
      return (
        copy.heightJustification +
        " Your weight helps me choose supported positions and the right starting effort. It stays private in your Pelvi profile. How much do you weigh?"
      );
    default:
      return "";
  }
}

export const INTAKE_SCREEN = {
  namePlaceholder: "Your first name",
  next: "Next",
  buildProfile: "Build My Profile",
  weightCaption: "Sets the pressure your plan works against · private, never shared",
  units: { weight: ["lbs", "kg"], height: ["feet", "cm"] },
  profile: {
    eyebrow: "YOUR 5-MINUTE CLINICAL PROFILE",
    title: (name) => (name ? `${name}, your plan is calibrated.` : "Your plan is calibrated."),
    metrics: [["AGE", "pace"], ["HEIGHT", "range"], ["WEIGHT", "effort"]],
    howTitle: "How these values change your exercises",
    howBody: "Age sets recovery and pacing. Height sets stance and range. Weight helps choose supported positions and starting effort. Your goal and past attempts decide whether release, timing, control, or strength comes first.",
    labels: ["POSITION", "EFFORT", "REST", "PROGRESSION"],
    cta: "Continue My Assessment",
  },
  story: {
    eyebrow: "FROM A MEMBER LIKE YOU",
    stars: "★★★★★",
    cta: "Continue",
  },
};

/** IntakeMedicalProfile.context: "Built around …". */
export function profileContext({ situationTitle, frequencyTitle, tried, memberSentencePhrase }) {
  const situationText = situationTitle || memberSentencePhrase;
  const frequencyText = frequencyTitle ? `, happening ${frequencyTitle}` : "";
  let triedText = "";
  if (tried?.id === "nothing") triedText = ", with no previous structured plan";
  else if (tried) triedText = `, after ${tried.title.toLowerCase()}`;
  return `Built around ${situationText}${frequencyText}${triedText}.`;
}

export function memberStory(goalId, pathway, focusId) {
  const mens = isMens(pathway);
  if (!mens && goalId === "intimacy" && isTightening(focusId)) {
    return { quote: "Three weeks in and I feel so much tighter. My husband noticed before I said a word.", name: "Jenna, 41 · Vaginal tightening" };
  }
  switch (goalId) {
    case "bladderLeaks":
      return mens
        ? { quote: "I coached the whole game, no worries. I can't believe I got this back at 61.", name: "Mark, 61 · Bladder control" }
        : { quote: "I laughed so hard I cried, and nothing leaked. I never thought I'd feel this free.", name: "Amy, 43 · Bladder leaks" };
    case "intimacy":
      return mens
        ? { quote: "Finally I can last. The stress is gone, and we enjoy each other again.", name: "Chris, 49 · Lasting longer" }
        : { quote: "Wow. I can't believe the sensation came back. My husband and I feel like us again.", name: "Jenna, 41 · Intimacy comfort" };
    case "postpartum":
      return { quote: "I chased my toddler and laughed the whole way. I finally feel like me again.", name: "Maya, 32 · Postpartum recovery" };
    case "pregnancyPrep":
      return { quote: "I can't believe how strong I feel carrying this baby. No fear, just joy.", name: "Sofia, 30 · Pregnancy prep" };
    case "diastasisRecti":
      return { quote: "My jeans buttoned and I cried right there in the closet. Happy tears.", name: "Erin, 35 · Diastasis recti" };
    case "prolapse":
      return { quote: "The heaviness is gone. I cooked all day and felt light. I could cry with relief.", name: "Karen, 52 · Prolapse support" };
    case "pelvicPain":
      return { quote: "A whole movie with zero pain. I squeezed my husband's hand and teared up.", name: "Dee, 44 · Pelvic pain" };
    case "coreStrength":
    case "stability":
      return { quote: "I carried all the groceries in one trip and laughed. I feel strong again.", name: "Jo, 50 · Core strength" };
    case "fitness":
      return { quote: "New deadlift PR and zero fear. I trust my body again and it feels amazing.", name: "Kate, 33 · Fitness" };
    case "prostateRecovery":
      return { quote: "Eighteen holes with zero worry. I honestly didn't think I'd get this back.", name: "Bill, 67 · Prostate recovery" };
    case "bowelControl":
      return { quote: "A whole road trip, totally relaxed. The fear is finally gone. I feel free.", name: "Ron, 58 · Bowel control" };
    default:
      return { quote: "I carried all the groceries in one trip and laughed. I feel strong again.", name: "Jo, 50 · Core strength" };
  }
}

/** MemberFaceLibrary.portrait: "Rachel, 38 · Bladder leaks" -> /members/member_rachel.jpg */
export function memberPortrait(reviewerName) {
  const first = String(reviewerName || "").split(",")[0].trim().toLowerCase();
  return first ? `/members/member_${first}.jpg` : null;
}

// ---------------------------------------------------------------------------
// Health check-in (PlanRevealViewController, phase one)
// ---------------------------------------------------------------------------

export const HEALTH_SCREEN = {
  none: "None of these",
  activityTitle: "How active are you most days?",
  activityReason: "This sets your starting effort, rest time, and when Coach Mia increases difficulty.",
  activitySaved: "✓ Saved. Your sessions include clear pacing and an easier option when you need it.",
};

export const ACTIVITY_LEVELS = [
  { id: "Sedentary", title: "Sedentary (mostly sitting)", calibration: "mostly sitting", phrase: "mostly sitting" },
  { id: "Moderate", title: "Lightly Active (daily walks)", calibration: "lightly active", phrase: "lightly active" },
  { id: "Active", title: "Very Active (regular workouts)", calibration: "very active", phrase: "very active" },
];

export function activityLevel(id) {
  return ACTIVITY_LEVELS.find((a) => a.id === id) || null;
}

export function healthCopy(goalId, focusTitle, focusId) {
  const headline = "Anything I should know before we start?";
  const tightening = goalId === "intimacy" && isTightening(focusId);
  const focusSentence = tightening
    ? " Your focus is a tighter vaginal canal."
    : focusTitle ? ` Your focus is ${focusTitle.toLowerCase()}.` : "";
  const lead = "Select everything that applies. Coach Mia™ uses it to choose";
  if (tightening) {
    return { headline, subtitle: `${lead} your squeeze strength, hold time and release work.${focusSentence}`, cta: "Build My Vaginal Tightening Plan" };
  }
  switch (goalId) {
    case "bladderLeaks":
      return { headline, subtitle: `${lead} your pressure, pacing and exercise positions.${focusSentence}`, cta: "Build My Leak-Free Plan" };
    case "pelvicPain":
      return { headline, subtitle: `${lead} your release work, supported positions and pacing.${focusSentence}`, cta: "Build My Pain-Relief Plan" };
    case "intimacy":
      return { headline, subtitle: `${lead} when your plan releases, lengthens or builds precise control.${focusSentence}`, cta: "Build My Intimacy Plan" };
    case "postpartum":
      return { headline, subtitle: `${lead} your recovery pace, support and pressure limits.${focusSentence}`, cta: "Build My Postpartum Plan" };
    case "pregnancyPrep":
      return { headline, subtitle: `${lead} your breathing, pelvic release and core-support work.${focusSentence}`, cta: "Build My Prep Plan" };
    case "coreStrength":
      return { headline, subtitle: `${lead} your bracing, pressure limits and starting positions.${focusSentence}`, cta: "Build My Core Plan" };
    case "fitness":
      return { headline, subtitle: `${lead} your impact, lifting and recovery progression.${focusSentence}`, cta: "Build My Fitness Plan" };
    case "stability":
      return { headline, subtitle: `${lead} your support, balance and position changes.${focusSentence}`, cta: "Build My Stability Plan" };
    case "diastasisRecti":
      return { headline, subtitle: `${lead} your pressure limits, setup and core progression.${focusSentence}`, cta: "Build My Diastasis Recti Plan" };
    case "prolapse":
      return { headline, subtitle: `${lead} your support, pressure limits and exercise positions.${focusSentence}`, cta: "Build My Prolapse Plan" };
    case "prostateRecovery":
      return { headline, subtitle: `${lead} recovery-safe pacing, rest and bladder-control progression.${focusSentence}`, cta: "Build My Recovery Plan" };
    case "bowelControl":
      return { headline, subtitle: `${lead} urgency control, pelvic release and bowel-support progression.${focusSentence}`, cta: "Build My Bowel Control Plan" };
    default:
      return { headline, subtitle: `${lead} your bracing, pressure limits and starting positions.${focusSentence}`, cta: "Build My Core Plan" };
  }
}

export function healthHelper(selected, goalId, pathway, focusId) {
  const mens = isMens(pathway);
  if (!mens && goalId === "intimacy" && isTightening(focusId)) {
    return selected
      ? "✓ Noted. Your squeeze, hold and release will match your answers."
      : "✓ Great. Squeeze, lift and hold from day one.";
  }
  if (selected) {
    switch (goalId) {
      case "bladderLeaks": return "✓ Got it. We'll work on holding off urges and staying dry.";
      case "pelvicPain": return "✓ Noted. We'll protect the sore spots and let tension go first.";
      case "intimacy": return mens ? "✓ Noted. Release, erection support and control will match your answers." : "✓ Noted. Comfort and feeling come first.";
      case "postpartum": return "✓ Noted. Gentle steps, safe after birth.";
      case "pregnancyPrep": return "✓ Noted. Breathing, circulation and a strong base.";
      case "coreStrength": return "✓ Noted. We'll build up safely, with no risky strain.";
      case "fitness": return "✓ Noted. I'll match how hard you already train.";
      case "stability": return "✓ Noted. Deep core and posture, together.";
      case "diastasisRecti": return "✓ Noted. Every move will train pressure and midline control.";
      case "prolapse": return "✓ Noted. We will build support without increasing downward pressure.";
      case "prostateRecovery": return "✓ Noted. Recovery stage, leakage and urgency will shape your pacing.";
      case "bowelControl": return "✓ Noted. Urgency, emptying and control will shape your plan.";
      default: return "";
    }
  }
  switch (goalId) {
    case "bladderLeaks": return "✓ Great. We'll start with the basics of leak control.";
    case "pelvicPain": return "✓ Great. Gentle release and support from day one.";
    case "intimacy": return mens ? "✓ Great. Release, support and control from the start." : "✓ Great. Comfort, feeling and confidence from the start.";
    case "postpartum": return "✓ Great. Foundation work, safe and steady.";
    case "pregnancyPrep": return "✓ Great. Building a strong, calm base for you.";
    case "coreStrength": return "✓ Great. Clean form and a deep core that wakes up.";
    case "fitness": return "✓ Great. We'll slot right into your routine.";
    case "stability": return "✓ Great. Posture and deep core, from day one.";
    case "diastasisRecti": return "✓ Great. Breath and deep-core control from day one.";
    case "prolapse": return "✓ Great. We will begin with gentle lift and pressure control.";
    case "prostateRecovery": return "✓ Great. We will begin with clear technique and recovery-aware pacing.";
    case "bowelControl": return "✓ Great. We will begin with breathing, release and control.";
    default: return "";
  }
}

const H = (title, symbol) => ({ title, symbol });

function healthOptionsRaw(goalId, pathway) {
  const mens = isMens(pathway);
  switch (goalId) {
    case "intimacy":
      return mens
        ? [H("Tight or overactive pelvic floor", "wind"), H("Erection or arousal changes", "heart.text.square.fill"), H("Finishing sooner than I want", "timer"), H("Pelvic pain or chronic tension", "bolt.heart.fill"), H("Prostate surgery or treatment", "cross.case.fill"), H("Urinary urgency or dribbling", "drop.fill"), H("Pelvic or abdominal surgery", "bandage.fill"), H("Clinician restrictions", "stethoscope")]
        : [H("Tight or overactive pelvic floor", "wind"), H("Pain with penetration", "bolt.heart.fill"), H("Dryness or hormonal changes", "drop.triangle.fill"), H("Endometriosis or pelvic pain", "cross.case.fill"), H("Postpartum or C-section recovery", "figure.and.child.holdinghands"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Pelvic surgery or clinician restrictions", "stethoscope"), H("Recurring bladder irritation", "waveform.path.ecg")];
    case "bladderLeaks":
      return mens
        ? [H("Leaks with coughing, lifting or exercise", "figure.run"), H("Drips after urinating", "drop.fill"), H("Sudden urgency or overactive bladder", "timer"), H("Frequent bathroom trips", "clock.fill"), H("Waking at night to urinate", "moon.fill"), H("Prostate enlargement, surgery or treatment", "cross.case.fill"), H("A neurologic condition affecting my bladder", "waveform.path.ecg"), H("Clinician restrictions", "stethoscope")]
        : [H("Leaks with coughing, lifting or exercise", "figure.run"), H("Sudden urgency or overactive bladder", "timer"), H("Frequent bathroom trips", "clock.fill"), H("Waking at night to urinate", "moon.fill"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Pregnancy or postpartum changes", "figure.and.child.holdinghands"), H("Pelvic surgery or clinician restrictions", "stethoscope"), H("A neurologic condition affecting my bladder", "waveform.path.ecg")];
    case "postpartum":
      return [H("C-section recovery", "cross.case.fill"), H("Perineal tear or episiotomy", "bandage.fill"), H("Pelvic heaviness or prolapse", "arrow.down.heart.fill"), H("Bladder or bowel leaks", "drop.fill"), H("Pelvic pain or painful intimacy", "bolt.heart.fill"), H("Diastasis or abdominal doming", "waveform.path"), H("Birth was less than 12 weeks ago", "calendar.badge.clock"), H("Clinician restrictions", "stethoscope")];
    case "diastasisRecti":
      return [H("Visible doming or coning", "waveform.path"), H("Postpartum or C-section recovery", "figure.and.child.holdinghands"), H("A diagnosed hernia", "cross.case.fill"), H("Back or pelvic pain", "bolt.heart.fill"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Leaks or pressure during movement", "figure.walk"), H("Abdominal or pelvic surgery", "bandage.fill"), H("Clinician restrictions", "stethoscope")];
    case "pregnancyPrep":
      return [H("Previous pregnancy or birth recovery", "figure.and.child.holdinghands"), H("Pelvic pain or painful intimacy", "bolt.heart.fill"), H("Bladder leaks or urgency", "drop.fill"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Endometriosis or pelvic pain", "cross.case.fill"), H("Pelvic or abdominal surgery", "bandage.fill"), H("Fertility treatment", "heart.text.square.fill"), H("Clinician restrictions", "stethoscope")];
    case "pelvicPain":
      return mens
        ? [H("Tight or overactive pelvic floor", "wind"), H("Pain in the pelvis, groin or perineum", "bolt.heart.fill"), H("Pain with erections or ejaculation", "heart.text.square.fill"), H("Bladder pain or irritation", "drop.triangle.fill"), H("Bowel pain or difficulty emptying", "circle.hexagongrid.fill"), H("Prostate surgery or treatment", "cross.case.fill"), H("Pelvic or abdominal surgery", "bandage.fill"), H("Clinician restrictions", "stethoscope")]
        : [H("Tight or overactive pelvic floor", "wind"), H("Pain with intimacy or penetration", "bolt.heart.fill"), H("Endometriosis", "cross.case.fill"), H("Bladder pain or irritation", "drop.triangle.fill"), H("Vulvodynia or vulvar pain", "heart.text.square.fill"), H("Postpartum or scar pain", "bandage.fill"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Pelvic surgery or clinician restrictions", "stethoscope")];
    case "prolapse":
      return [H("Pressure or a bulging feeling", "arrow.down.heart.fill"), H("Heaviness after standing", "figure.stand"), H("Symptoms during lifting or exercise", "figure.strengthtraining.traditional"), H("Bladder or bowel changes", "drop.fill"), H("Pregnancy or postpartum changes", "figure.and.child.holdinghands"), H("Previous pelvic surgery", "bandage.fill"), H("A pessary or current pelvic therapy", "cross.case.fill"), H("Clinician restrictions", "stethoscope")];
    case "prostateRecovery":
      return [H("Radical prostatectomy", "cross.case.fill"), H("Radiation or other prostate treatment", "waveform.path.ecg"), H("Leaks during movement", "figure.walk"), H("Drips after urinating", "drop.fill"), H("Sudden urgency", "timer"), H("Pelvic pain or tightness", "bolt.heart.fill"), H("Erection or arousal changes", "heart.text.square.fill"), H("Clinician restrictions", "stethoscope")];
    case "bowelControl":
      return [H("Sudden bowel urgency", "timer"), H("Bowel leakage or staining", "drop.fill"), H("Difficulty emptying", "arrow.down.circle.fill"), H("Straining or holding my breath", "lungs.fill"), H("Pelvic pain or tightness", "bolt.heart.fill"), H("Previous pelvic or bowel surgery", "bandage.fill"), H("A neurologic condition affecting bowel control", "waveform.path.ecg"), H("Clinician restrictions", "stethoscope")];
    case "coreStrength":
    case "stability":
      return mens
        ? [H("Back or pelvic pain", "bolt.heart.fill"), H("Leaks or pressure during movement", "figure.walk"), H("Pelvic floor weakness", "arrow.up.heart.fill"), H("Abdominal or pelvic surgery", "bandage.fill"), H("Prostate surgery or treatment", "cross.case.fill"), H("Balance or mobility limitations", "figure.walk"), H("Clinician restrictions", "stethoscope")]
        : [H("Diastasis or abdominal doming", "waveform.path"), H("Prolapse or pelvic heaviness", "arrow.down.heart.fill"), H("Back or pelvic pain", "bolt.heart.fill"), H("Pregnancy or postpartum changes", "figure.and.child.holdinghands"), H("Abdominal or pelvic surgery", "bandage.fill"), H("Balance or mobility limitations", "figure.walk"), H("Clinician restrictions", "stethoscope")];
    case "fitness":
      return [H("Leaks during impact or lifting", "figure.run"), H("Pelvic heaviness or prolapse", "arrow.down.heart.fill"), H("Diastasis or abdominal doming", "waveform.path"), H("Back or pelvic pain", "bolt.heart.fill"), H("Pregnancy or postpartum changes", "figure.and.child.holdinghands"), H("Previous pelvic or abdominal surgery", "bandage.fill"), H("Balance or mobility limitations", "figure.walk"), H("Clinician restrictions", "stethoscope")];
    default:
      return [];
  }
}

const FOCUS_PREFERRED_CONDITION = {
  "intimacy.comfort": "Pain with penetration",
  "intimacy.relaxation": "Tight or overactive pelvic floor",
  "intimacy.dryness": "Dryness or hormonal changes",
  "intimacy.postpartum": "Postpartum or C-section recovery",
  "maleSexual.erectionQuality": "Erection or arousal changes",
  "maleSexual.ejaculationControl": "Finishing sooner than I want",
  "maleSexual.pelvicTension": "Pelvic pain or chronic tension",
  "maleSexual.confidence": "Erection or arousal changes",
  "bladder.stressLeaks": "Leaks with coughing, lifting or exercise",
  "bladder.urgency": "Sudden urgency or overactive bladder",
  "bladder.frequency": "Frequent bathroom trips",
  "bladder.nighttime": "Waking at night to urinate",
  "bladder.afterDribble": "Drips after urinating",
  "postpartum.leaks": "Bladder or bowel leaks",
  "postpartum.pressure": "Pelvic heaviness or prolapse",
  "diastasis.doming": "Visible doming or coning",
  "diastasis.pressure": "Leaks or pressure during movement",
  "pain.tightness": "Tight or overactive pelvic floor",
  "pain.intimacy": "Pain with intimacy or penetration",
  "prolapse.pressure": "Pressure or a bulging feeling",
  "prolapse.heaviness": "Heaviness after standing",
  "prolapse.support": "A pessary or current pelvic therapy",
  "prolapse.dailyMovement": "Symptoms during lifting or exercise",
  "prolapse.exercise": "Symptoms during lifting or exercise",
  "fitness.leaks": "Leaks during impact or lifting",
  "fitness.impact": "Pelvic heaviness or prolapse",
  "core.backSupport": "Back or pelvic pain",
  "prostate.continence": "Leaks during movement",
  "prostate.drips": "Drips after urinating",
  "prostate.urgency": "Sudden urgency",
  "prostate.confidence": "Leaks during movement",
  "bowel.urgency": "Sudden bowel urgency",
  "bowel.accidents": "Bowel leakage or staining",
  "bowel.emptying": "Difficulty emptying",
  "bowel.confidence": "Sudden bowel urgency",
};

/**
 * GoalHealthContextCatalog.options then SymptomProfileStore.prioritizedHealthOptions:
 * the concern closest to her focus goes first, then everything her calibration
 * answer relates to, then the rest, none hidden.
 */
export function healthOptions(goalId, pathway, focusId, situation) {
  let choices = healthOptionsRaw(goalId, pathway);
  const preferred = FOCUS_PREFERRED_CONDITION[focusId];
  if (preferred) {
    const index = choices.findIndex((c) => c.title === preferred);
    if (index > 0) {
      const [item] = choices.splice(index, 1);
      choices.unshift(item);
    }
  }
  const keywords = (situation?.relatedHealthKeywords || []).map((k) => k.toLowerCase());
  if (keywords.length) {
    const related = choices.filter((c) => keywords.some((k) => c.title.toLowerCase().includes(k)));
    const rest = choices.filter((c) => !related.includes(c));
    choices = [...related, ...rest];
  }
  return choices;
}

// ---------------------------------------------------------------------------
// Personalizing (PlanRevealViewController, phase two)
// ---------------------------------------------------------------------------

export const PERSONALIZING = {
  totalMs: 7000,
  mainTitle: "Building your plan",
  mainSubtitle: "Putting together your routine to stop leaks, ease pain and build confidence.",
  connecting: "Matching your goal to real sessions",
  calibrating: "Getting your exercises ready",
  analyzing: "Setting up: ",
  finalStatus: "Your plan is ready. Let's go.",
  progress: "Progress",
};

export function personalizingCopy(goalId, pathway, name, focusId) {
  const mens = isMens(pathway);
  const trimmed = (name || "").trim();
  const named = (title) => (trimmed ? `${trimmed}, ${title}` : title);
  if (!mens && goalId === "intimacy" && isTightening(focusId)) {
    return { title: named("Coach Mia™ is building your vaginal tightening plan"), subtitle: "Train the squeeze, lift and hold that make your vaginal canal tighter, stronger and more sensitive.", connecting: "Finding the muscles that grip and lift…", calibrating: "Setting your squeeze, hold and release for a tighter feel…", checklist: ["Find the muscles that grip", "Squeeze, lift and hold", "Full release between reps", "Endurance that lasts"] };
  }
  switch (goalId) {
    case "intimacy":
      return mens
        ? { title: named("Coach Mia™ is building your sexual health plan"), subtitle: "Build erection support, ejaculation control, pelvic release and confidence without gripping harder.", connecting: "Matching the plan to the sexual-health concern you selected…", calibrating: "Ordering release, timing and strength for better control…", checklist: ["Release excess pelvic tension", "Build erection support", "Train ejaculation control", "Strength for lasting confidence"] }
        : { title: named("Coach Mia™ is building your intimacy plan"), subtitle: "Build relaxation, sensation and control for more comfortable intimacy and stronger orgasms.", connecting: "Looking at what makes things comfortable for you…", calibrating: "Building relaxation and control for stronger orgasms…", checklist: ["Warm ups that feel good", "Letting go, then squeezing", "Strength for stronger orgasms", "Positions to share"] };
    case "bladderLeaks":
      return {
        title: "Coach Mia™ is building your leak control plan",
        subtitle: mens ? "Train the timing and support behind fewer leaks, sudden urges and after-urination drips." : "Train the muscles that hold you in, so a sneeze stops running your day.",
        connecting: mens ? "Matching control work to leaks, urges and drips…" : "Planning your quick squeezes and urge holds…",
        calibrating: "Setting your breathing and timing for real life moments…",
        checklist: mens ? ["Stop after-urination drips", "Hold off sudden urges", "Control coughs and lifts", "Build daily confidence"] : ["Hold off sudden urges", "Fast squeezes", "Breathing and pressure", "Run and jump practice"],
      };
    case "pelvicPain":
      return { title: "Coach Mia™ is building your pain relief plan", subtitle: "Let tension go, add support, and keep comfort first.", connecting: "Finding the tight spots and the sore ranges…", calibrating: "Adding gentle strength so the relief lasts…", checklist: ["Calm tight muscles", "Breathing that soothes", "Gentle hip and core support", "Daily posture resets"] };
    case "postpartum":
      return { title: "Coach Mia™ is building your postpartum plan", subtitle: "Kind, steady rebuilding for your core, hips and back.", connecting: "Checking which moves are safe for abdominal separation…", calibrating: "Setting up lifts and carries so daily life feels steady…", checklist: ["Breathe with your core", "Moves that are gap safe", "Hip and back relief", "Lifting and carrying practice"] };
    case "pregnancyPrep":
      return { title: "Coach Mia™ is building your prep plan", subtitle: "Good circulation, calm breathing and a core that supports you.", connecting: "Setting your breathing and stamina…", calibrating: "Loosening your hips and waking up your pelvic floor…", checklist: ["Circulation and breathing", "Pelvic floor control", "Looser hips", "Positions for labor"] };
    case "coreStrength":
      return { title: "Coach Mia™ is building your core plan", subtitle: "Deep, steady strength with no guesswork.", connecting: "Waking up the right muscles at the right time…", calibrating: "Adding the moves that build a solid middle…", checklist: ["Wake up your deep core", "Hold steady under load", "Squat and hinge, done right", "Kind to your back"] };
    case "fitness":
      return { title: "Coach Mia™ is building your training support", subtitle: "Make every workout you already do feel more solid.", connecting: "Setting your brace and breathing for lifts and cardio…", calibrating: "Matching how hard you work to how well you recover…", checklist: ["Warm up your core", "Brace and breathe", "Recovery and stretching", "Turn strength into power"] };
    case "diastasisRecti":
      return { title: "Coach Mia™ is building your diastasis recti plan", subtitle: "Train breath, deep-core connection and pressure control for less doming and stronger movement.", connecting: "Choosing positions that keep pressure off your middle…", calibrating: "Ordering breath and core work for better midline control…", checklist: ["Breathing for pressure control", "Reconnect your deep core", "Manage doming", "Everyday lifting support"] };
    case "prolapse":
      return { title: named("Coach Mia™ is building your prolapse support plan"), subtitle: "Build lift, pressure control and everyday support without straining down.", connecting: "Matching support to when you feel pressure or heaviness…", calibrating: "Ordering breath, lift and recovery for daily life…", checklist: ["Reduce downward pressure", "Build gentle lift", "Support standing and lifting", "Track heaviness over time"] };
    case "stability":
      return { title: "Coach Mia™ is building your stability plan", subtitle: "Tall, steady and sorted, all day long.", connecting: "Lining up your ribs over your hips…", calibrating: "Building the stamina that holds your posture…", checklist: ["Stand tall and breathe", "Stamina through your middle", "Wake up your side hips", "A reset for desk days"] };
    case "prostateRecovery":
      return { title: named("Coach Mia™ is building your prostate recovery plan"), subtitle: "Rebuild bladder control with recovery-aware timing, full release and steady progression.", connecting: "Matching the plan to your recovery stage and symptoms…", calibrating: "Setting technique, rest and progression for better control…", checklist: ["Reconnect the right muscles", "Reduce leaks and drips", "Control sudden urges", "Build recovery confidence"] };
    case "bowelControl":
      return { title: named("Coach Mia™ is building your bowel control plan"), subtitle: "Train urgency control, easier emptying and dependable support for daily life.", connecting: "Matching the plan to urgency, leakage and emptying…", calibrating: "Ordering breath, release and control for your exact concern…", checklist: ["Settle sudden bowel urges", "Reduce leakage", "Empty with less straining", "Build confidence away from home"] };
    default:
      return { title: "Coach Mia™ is building your core plan", subtitle: "Deep, steady strength with no guesswork.", connecting: "Waking up the right muscles at the right time…", calibrating: "Adding the moves that build a solid middle…", checklist: ["Wake up your deep core", "Hold steady under load", "Squat and hinge, done right", "Kind to your back"] };
  }
}

const CHECKLIST_TAIL = {
  [TIGHTENING_FOCUS]: ["Squeeze, lift and hold, then full release", "Build a tighter, stronger grip"],
  bladderLeaks: ["Train control for your exact trigger", "Track fewer leaks and bathroom trips"],
  intimacy: ["Release before stronger work", "Build comfort, feeling and control"],
  prolapse: ["Reduce downward pressure", "Build support for daily movement"],
  prostateRecovery: ["Rebuild bladder timing and control", "Track fewer leaks and drips"],
  bowelControl: ["Train control for sudden urgency", "Build confidence away from a bathroom"],
  pelvicPain: ["Calm guarding before strength", "Track comfort without triggering flares"],
  postpartum: ["Reconnect breath, core and pelvic floor", "Progress safely as your body recovers"],
  pregnancyPrep: ["Build support without excess tension", "Practice breath and pressure control"],
  diastasisRecti: ["Reduce doming with better pressure control", "Reconnect your deep core"],
  coreStrength: ["Switch on your deep core", "Build strength that supports real life"],
  fitness: ["Brace and breathe under effort", "Progress impact without leaks or heaviness"],
  stability: ["Reconnect posture, hips and core", "Build support that lasts all day"],
};

/** The emotional peak echoes her exact situation and focus, not four generic tasks. */
export function personalizedChecklist({ goalId, situation, focus, fallback }) {
  if (!situation && !focus) return fallback;
  const items = [];
  if (situation?.constellationOutcome) items.push(situation.constellationOutcome);
  if (focus?.title && !items.includes(focus.title)) items.push(focus.title);
  items.push(...((focus && CHECKLIST_TAIL[focus.id]) || CHECKLIST_TAIL[goalId] || CHECKLIST_TAIL.coreStrength));
  return items.slice(0, 4);
}
