"use client";

// Every word the funnel says, keyed by goal id.
//
// Ported from the iOS app, which keys these tables by the goal's DISPLAY TITLE
// ("Stop Bladder Leaks"). Keying by title means a copy fix on the card silently
// empties nine tables, so the web keys by the stable id from lib/program.js
// instead. `stability` is kept because members who picked it before the swap to
// diastasisRecti still exist and still deserve their own words.
//
// Source of truth: the iOS strings. If you change a line here, change it there
// in the same breath, or the same woman is promised two different things on two
// different screens.
//
// House style, non-negotiable: no em dashes, no en dashes, roughly a 6th grade
// reading level. Straight and curly apostrophes below are deliberate; they are
// reproduced exactly as iOS ships them.

export const DEFAULT_GOAL = "coreStrength";

const pick = (table, goalId) => table[goalId] || table[DEFAULT_GOAL];

// ---------------------------------------------------------------------------
// 1. Welcome
// ---------------------------------------------------------------------------

export const WELCOME_HEADLINE_LINES = [
  "Strength & Confidence",
  "From Your Core Outward.",
];

export const WELCOME_HEADLINE_A11Y =
  "Strength and Confidence from your core outward.";

export const WELCOME_SUBHEADLINE =
  "Your personal AI physio-coach for leaks, pain, and confidence.";

export const WELCOME_BENEFITS = [
  { icon: "figure.run.circle.fill", text: "A new 5-minute plan, just for you, every day." },
  { icon: "play.rectangle.on.rectangle.fill", text: "300+ videos, all approved by physios." },
  { icon: "bubble.left.and.bubble.right.fill", text: "Chat with your AI Coach, Mia™, 24/7." },
];

export const WELCOME_CTA = "Start My 5-Min Journey";

export const MEMBER_COUNT_FROM = 9800;
export const MEMBER_COUNT_TO = 10200;
export const MEMBER_COUNT_DURATION_MS = 2400;

export const memberCountLine = (n) =>
  `Join ${n.toLocaleString("en-US")}+ members finding confidence.`;

// The straight apostrophe in #10 and the curly one in #2 are both intentional.
export const TESTIMONIALS = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night. Life feels possible again.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe again.", author: "Mia, 33" },
  { text: "Bathroom maps? Deleted. I go where I want.", author: "Priya, 37" },
  { text: "Post-prostate rehab that finally clicked.", author: "James, 62" },
  { text: "Five minutes I actually do, and it changes everything.", author: "Paige, 28" },
  { text: "Jumped on the trampoline with my kids, first time in years.", author: "Priya, 37" },
  { text: "I almost quit at week three. By day 90 I honestly didn't recognise my old self.", author: "Marianne, 54" },
];

// ---------------------------------------------------------------------------
// 2. Select goal
// ---------------------------------------------------------------------------

export const GOAL_HEADLINE = "What would you like to work on?";

export const GOAL_SUBTITLE =
  "Pick the one that matters most. Coach Mia™ builds your plan around it, and you can change it later.";

export const GOAL_CTA = "Set My Goal";

// ---------------------------------------------------------------------------
// 3. How Pelvi helps
// ---------------------------------------------------------------------------

const HOW_IT_HELPS = {
  pregnancyPrep: {
    subtitle: "We build a strong base now, so pregnancy feels better and recovery comes easier.",
    hub: "figure.child",
    tiles: [
      { icon: "leaf.fill", text: "Gentle prep for birth" },
      { icon: "bolt.heart.fill", text: "A ready pelvic floor" },
      { icon: "figure.strengthtraining.traditional", text: "A core built for birth" },
      { icon: "figure.stand", text: "Support for your bump" },
      { icon: "figure.walk", text: "Easier back and hips" },
      { icon: "sparkles", text: "Calm body, calm mind" },
    ],
  },
  postpartum: {
    subtitle: "We rebuild your core gently and safely, at the pace your body is ready for.",
    hub: "heart.fill",
    tiles: [
      { icon: "heart.fill", text: "A restored pelvic floor" },
      { icon: "link", text: "Core joined up again" },
      { icon: "shield.lefthalf.filled", text: "Gentle, safe steps" },
      { icon: "figure.stand", text: "Lift baby with ease" },
      { icon: "figure.walk", text: "A back that feels held" },
      { icon: "bandage.fill", text: "Kind to C-section scars" },
    ],
  },
  coreStrength: {
    subtitle: "We build deep strength you can feel, so you stand taller and move with more power.",
    hub: "bolt.fill",
    tiles: [
      { icon: "bolt.fill", text: "A stronger deep core" },
      { icon: "figure.strengthtraining.traditional", text: "Lift without worry" },
      { icon: "figure.run", text: "Run tall, run free" },
      { icon: "figure.stand", text: "Posture that holds" },
      { icon: "shield.lefthalf.filled", text: "Fewer aches and strains" },
      { icon: "lungs.fill", text: "Breathe from your core" },
    ],
  },
  bladderLeaks: {
    subtitle: "We train the muscles that hold you in, so a cough or a laugh stops being a worry.",
    hub: "shield.lefthalf.filled",
    tiles: [
      { icon: "drop.fill", text: "Sneeze without worry" },
      { icon: "figure.run", text: "Run and jump freely" },
      { icon: "bed.double.fill", text: "Drier nights" },
      { icon: "timer", text: "Fewer sudden urges" },
      { icon: "figure.strengthtraining.traditional", text: "Workouts without leaks" },
      { icon: "checkmark.circle.fill", text: "Leave the pads behind" },
    ],
  },
  pelvicPain: {
    subtitle: "We release the tight muscles first, then add the gentle strength that keeps the relief.",
    hub: "bandage.fill",
    tiles: [
      { icon: "figure.seated.side", text: "Sit without pain" },
      { icon: "figure.walk", text: "Move more comfortably" },
      { icon: "bed.double.fill", text: "Sleep through the night" },
      { icon: "leaf.fill", text: "Gentle relief each day" },
      { icon: "heart.fill", text: "Enjoy intimacy again" },
      { icon: "bolt.slash.fill", text: "Let deep tension go" },
    ],
  },
  intimacy: {
    subtitle: "We work on comfort, feeling and confidence, at your pace and in private.",
    hub: "heart.circle.fill",
    tiles: [
      { icon: "heart.circle.fill", text: "More feeling" },
      { icon: "heart.fill", text: "Stronger orgasms" },
      { icon: "sparkles", text: "Comfort, not tension" },
      { icon: "face.smiling", text: "Confidence comes back" },
      { icon: "person.2.fill", text: "Feel close again" },
      { icon: "bolt.heart.fill", text: "A stronger pelvic floor" },
    ],
  },
  fitness: {
    subtitle: "We build the core strength underneath everything else you train.",
    hub: "trophy.fill",
    tiles: [
      { icon: "figure.walk", text: "Stronger every day" },
      { icon: "figure.strengthtraining.traditional", text: "Safe, guided sessions" },
      { icon: "figure.run", text: "Cardio, core, control" },
      { icon: "chart.line.uptrend.xyaxis", text: "Progress you can feel" },
      { icon: "timer", text: "5 minutes a day" },
      { icon: "figure.stand", text: "Move with confidence" },
    ],
  },
  stability: {
    subtitle: "We steady your middle, so standing, walking and stairs all feel easier.",
    hub: "figure.stand",
    tiles: [
      { icon: "figure.stand", text: "A steady, balanced core" },
      { icon: "arrow.up.and.down.circle", text: "Steady on your feet" },
      { icon: "figure.walk", text: "Walk tall, no wobble" },
      { icon: "shield.lefthalf.filled", text: "A back that feels held" },
      { icon: "figure.strengthtraining.traditional", text: "Stronger hips and knees" },
      { icon: "arrow.left.and.right", text: "Steady side to side" },
    ],
  },
  diastasisRecti: {
    subtitle: "We close the gap in your tummy muscles gently and rebuild your deep core. No surgery.",
    hub: "arrow.right.and.line.vertical.and.arrow.left",
    tiles: [
      { icon: "arrow.right.and.line.vertical.and.arrow.left", text: "Close the gap gently" },
      { icon: "link", text: "Deep core joined up" },
      { icon: "shield.lefthalf.filled", text: "Safe for your gap" },
      { icon: "figure.stand", text: "A flatter middle" },
      { icon: "figure.walk", text: "Lift and carry easily" },
      { icon: "checkmark.circle.fill", text: "No surgery needed" },
    ],
  },
};

export const howItHelps = (goalId) => pick(HOW_IT_HELPS, goalId);

export const HOW_IT_HELPS_CTA = "Next: Make My Plan";

// ---------------------------------------------------------------------------
// 4. Coach Mia intake
// ---------------------------------------------------------------------------

export const MIA_NAME_QUESTION =
  "Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?";

const MIA = {
  pregnancyPrep: {
    ack: "Beautiful choice, {name}. We'll get your pelvic floor and core ready, so you feel supported the whole way through.",
    age: "At {age}, we work on calm breathing and steady strength, so your body feels ready and held.",
    weight: "Thanks. I'll pick positions that feel doable today and get a little stronger each week.",
  },
  postpartum: {
    ack: "I've got you, {name}. We'll rebuild your core gently and bring your confidence back with it.",
    age: "At {age}, I go for connection before intensity, so healing feels steady and real.",
    weight: "Thank you. I'll keep the moves light enough that holding and lifting your little one feels safe again.",
  },
  coreStrength: {
    ack: "Love it, {name}. We'll build a deep, steady core that holds you up in everything you do.",
    age: "At {age}, we wake the right muscles up first, then build slowly, so strength comes without strain.",
    weight: "Thanks. I'll use this to set your starting level, so the work feels strong, not stressful.",
  },
  bladderLeaks: {
    ack: "On it, {name}. We'll train control, so a sneeze, a laugh or a run stops owning your day.",
    age: "At {age}, we mix long holds with quick squeezes, so the control is there when real life needs it.",
    weight: "Thank you. I'll set the pressure and impact, so you stay dry while you move.",
  },
  pelvicPain: {
    ack: "I'm with you, {name}. We'll let go of what is tight and build up what supports you, gently.",
    age: "At {age}, we start with calming work and add strength slowly, so the relief lasts past the session.",
    weight: "Thanks. I'll choose positions that take the strain off and let you feel real ease.",
  },
  intimacy: {
    ack: "Let's make this feel good again, {name}. We'll build comfort, confidence and feeling, at your pace.",
    age: "At {age}, I balance letting go with squeezing, which supports arousal and more reliable orgasms.",
    weight: "Thank you. I'll set a level that builds strength without tensing up, for better blood flow and more feeling.",
  },
  fitness: {
    ack: "Nice, {name}. We'll turn your core into the quiet engine behind every workout.",
    age: "At {age}, we pair steadiness with power, so lifts and cardio feel solid every time.",
    weight: "Thanks. I'll set loads and speeds that build performance without extra tiredness.",
  },
  stability: {
    ack: "Excellent, {name}. We'll stack you tall and steady, so your body feels sorted again.",
    age: "At {age}, we train the deep core to hold you up all day, not just during a workout.",
    weight: "Thank you. I'll build up in steps that protect your back while the strength comes.",
  },
  diastasisRecti: {
    ack: "I'm so glad you're here, {name}. We'll close the gap in your tummy muscles gently and rebuild your deep core. No surgery, just steady daily care.",
    age: "At {age}, we take it at a pace that is safe for the gap, so the tissue in the middle heals and joins back up.",
    weight: "Thank you. I'll choose positions that keep pressure off your middle while the gap draws closed.",
  },
};

export function miaAgeQuestion(goalId, name) {
  const who = (name || "").trim() || "there";
  return `${pick(MIA, goalId).ack.replace("{name}", who)} First, how old are you?`;
}

export function miaWeightQuestion(goalId, age) {
  return `${pick(MIA, goalId).age.replace("{age}", String(age))} Now, how much do you weigh?`;
}

export function miaHeightQuestion(goalId) {
  return `${pick(MIA, goalId).weight} And how tall are you?`;
}

// ---------------------------------------------------------------------------
// 5. Health info
// ---------------------------------------------------------------------------

export const HEALTH_HEADLINE = "Anything I should know before we start?";

export const HEALTH_CONDITIONS = [
  { id: "pelvicPain", title: "Ease Pelvic Pain", icon: "heart.text.square", noun: "pelvic pain" },
  { id: "postpartum", title: "Speed Postpartum Recovery", icon: "figure.child", noun: "postpartum recovery" },
  { id: "bladderLeaks", title: "Stop Bladder Leaks", icon: "drop", noun: "bladder leaks" },
  { id: "prostate", title: "Support Prostate Health", icon: "figure.stand", noun: "prostate concerns" },
];

export const HEALTH_NONE_LABEL = "None of these";

export const ACTIVITY_QUESTION = "How active are you most days?";

export const ACTIVITY_LEVELS = [
  { id: "sedentary", title: "Sedentary (mostly sitting)", phrase: "sedentary" },
  { id: "light", title: "Lightly Active (daily walks)", phrase: "lightly active" },
  { id: "very", title: "Very Active (regular workouts)", phrase: "very active" },
];

export const ACTIVITY_HELPER = "✓ Perfect. I'll match your pace and your recovery.";

const HEALTH = {
  bladderLeaks: {
    subtitle: "It helps me choose sessions that are safe for you.",
    cta: "Build My Leak-Free Plan",
    helperSelected: "✓ Got it. We'll work on holding off urges and staying dry.",
    helperNone: "✓ Great. We'll start with the basics of leak control.",
  },
  pelvicPain: {
    subtitle: "I'll stay away from sore spots and start with letting tension go.",
    cta: "Build My Pain-Relief Plan",
    helperSelected: "✓ Noted. We'll protect the sore spots and let tension go first.",
    helperNone: "✓ Great. Gentle release and support from day one.",
  },
  intimacy: {
    subtitle: "I'll build your plan around comfort first.",
    cta: "Build My Intimacy Plan",
    helperSelected: "✓ Noted. Comfort and feeling come first.",
    helperNone: "✓ Great. Comfort, feeling and confidence from the start.",
  },
  postpartum: {
    subtitle: "I'll keep everything gentle and safe after birth.",
    cta: "Build My Postpartum Plan",
    helperSelected: "✓ Noted. Gentle steps, safe after birth.",
    helperNone: "✓ Great. Foundation work, safe and steady.",
  },
  pregnancyPrep: {
    subtitle: "I'll focus on breathing, circulation and core support.",
    cta: "Build My Prep Plan",
    helperSelected: "✓ Noted. Breathing, circulation and a strong base.",
    helperNone: "✓ Great. Building a strong, calm base for you.",
  },
  coreStrength: {
    subtitle: "It helps me build you up safely, step by step.",
    cta: "Build My Core Plan",
    helperSelected: "✓ Noted. We'll build up safely, with no risky strain.",
    helperNone: "✓ Great. Clean form and a deep core that wakes up.",
  },
  fitness: {
    subtitle: "I'll fit around the training you already do.",
    cta: "Build My Fitness Plan",
    helperSelected: "✓ Noted. I'll match how hard you already train.",
    helperNone: "✓ Great. We'll slot right into your routine.",
  },
  stability: {
    subtitle: "I'll work on your deep core and how you hold yourself.",
    cta: "Build My Stability Plan",
    helperSelected: "✓ Noted. Deep core and posture, together.",
    helperNone: "✓ Great. Posture and deep core, from day one.",
  },
  diastasisRecti: {
    subtitle: "I'll keep every move safe for the gap while we rebuild your deep core.",
    cta: "Build My Gap-Healing Plan",
    helperSelected: "✓ Noted. Every move stays safe for the gap.",
    helperNone: "✓ Great. Gentle work to close the gap. No surgery needed.",
  },
};

export const health = (goalId) => pick(HEALTH, goalId);

// ---------------------------------------------------------------------------
// 6. Personalizing
// ---------------------------------------------------------------------------

const PERSONALIZING = {
  intimacy: {
    title: "Building your intimacy plan, {name}",
    subtitle: "Comfort, feeling and confidence, built gently for your body.",
    connecting: "Looking at what makes things comfortable for you…",
    calibrating: "Balancing letting go and squeezing, for stronger orgasms…",
    checklist: [
      "Warm ups that feel good",
      "Letting go, then squeezing",
      "Strength for stronger orgasms",
      "Positions to share",
    ],
  },
  bladderLeaks: {
    title: "Building your leak control plan",
    subtitle: "Train the muscles that hold you in, so a sneeze stops running your day.",
    connecting: "Planning your quick squeezes and urge holds…",
    calibrating: "Setting your breathing so real life moments are covered…",
    checklist: [
      "Hold off sudden urges",
      "Fast squeezes",
      "Breathing and pressure",
      "Run and jump practice",
    ],
  },
  pelvicPain: {
    title: "Building your pain relief plan",
    subtitle: "Let tension go, add support, and keep comfort first.",
    connecting: "Finding the tight spots and the sore ranges…",
    calibrating: "Adding gentle strength so the relief lasts…",
    checklist: [
      "Calm tight muscles",
      "Breathing that soothes",
      "Gentle hip and core support",
      "Daily posture resets",
    ],
  },
  postpartum: {
    title: "Building your postpartum plan",
    subtitle: "Kind, steady rebuilding for your core, hips and back.",
    connecting: "Checking which moves are safe for a tummy gap…",
    calibrating: "Setting up lifts and carries so daily life feels steady…",
    checklist: [
      "Breathe with your core",
      "Moves that are gap safe",
      "Hip and back relief",
      "Lifting and carrying practice",
    ],
  },
  pregnancyPrep: {
    title: "Building your prep plan",
    subtitle: "Good circulation, calm breathing and a core that supports you.",
    connecting: "Setting your breathing and stamina…",
    calibrating: "Loosening your hips and waking up your pelvic floor…",
    checklist: [
      "Circulation and breathing",
      "Pelvic floor control",
      "Looser hips",
      "Positions for labor",
    ],
  },
  coreStrength: {
    title: "Building your core plan",
    subtitle: "Deep, steady strength with no guesswork.",
    connecting: "Waking up the right muscles at the right time…",
    calibrating: "Adding the moves that build a solid middle…",
    checklist: [
      "Wake up your deep core",
      "Hold steady under load",
      "Squat and hinge, done right",
      "Kind to your back",
    ],
  },
  fitness: {
    title: "Building your training support",
    subtitle: "Make every workout you already do feel more solid.",
    connecting: "Setting your brace and breathing for lifts and cardio…",
    calibrating: "Matching how hard you work to how well you recover…",
    checklist: [
      "Warm up your core",
      "Brace and breathe",
      "Recovery and stretching",
      "Turn strength into power",
    ],
  },
  diastasisRecti: {
    title: "Building your gap healing plan",
    subtitle: "Closing the gap gently and rebuilding your deep core. No surgery.",
    connecting: "Choosing positions that keep pressure off your middle…",
    calibrating: "Ordering the moves that draw the gap closed…",
    checklist: [
      "Breathing that is gap safe",
      "Join your deep core back up",
      "No pressure on your middle",
      "Everyday lifting support",
    ],
  },
  stability: {
    title: "Building your stability plan",
    subtitle: "Tall, steady and sorted, all day long.",
    connecting: "Lining up your ribs over your hips…",
    calibrating: "Building the stamina that holds your posture…",
    checklist: [
      "Stand tall and breathe",
      "Stamina through your middle",
      "Wake up your side hips",
      "A reset for desk days",
    ],
  },
};

// Goals with no entry of their own fall back to the stability block, which is
// what iOS does. coreStrength has its own, so DEFAULT_GOAL is not the fallback
// here and this one lookup is written out in full.
export function personalizing(goalId, name) {
  const block = PERSONALIZING[goalId] || PERSONALIZING.stability;
  const who = (name || "").trim() || "love";
  return { ...block, title: block.title.replace("{name}", who) };
}

export const PERSONALIZING_TOTAL_MS = 7000;
export const PERSONALIZING_PHASE_1 = 0.25;
export const PERSONALIZING_PHASE_2 = 0.2;

export const PERSONALIZING_STATUS = {
  matching: "Matching your goal to real results",
  preparing: "Getting your exercises ready",
  settingUp: (item) => `Setting up: ${item}`,
  done: "Your plan is ready. Let's go.",
};

export const PERSONALIZING_FALLBACK_TITLE = "Building your plan";
export const PERSONALIZING_FALLBACK_SUBTITLE =
  "Putting together your routine to stop leaks, ease pain and build confidence.";

// ---------------------------------------------------------------------------
// 7. Plan reveal timeline
// ---------------------------------------------------------------------------

const TIMELINE = {
  pregnancyPrep: {
    subtitle: "Feel ready to carry and move with ease by **{date}**.",
    insights: [
      "Built for your body (BMI **{bmi}**) so joints and pelvic floor stay happy.",
      "Because you're **{activity}**, sessions are short, steady, and stick.",
      "At **{age}**, we train calm breath and deep core for a growing belly.",
      "Safe for **{condition}** with low-pressure positions.",
    ],
    cta: "Unlock My Pregnancy Prep",
  },
  postpartum: {
    subtitle: "Feel steady holding your baby again by **{date}**.",
    insights: [
      "Set for your body (BMI **{bmi}**) to protect healing tissue.",
      "Matched to your **{activity}** routine, so it still works on low sleep days.",
      "At **{age}**, we rebuild your core so feeds, lifts and walks feel easier.",
      "Adjusted for **{condition}**, including any scar or tender areas.",
    ],
    cta: "Unlock My Postpartum Plan",
  },
  coreStrength: {
    subtitle: "Feel solid through your middle by **{date}**.",
    insights: [
      "Built for your body (BMI **{bmi}**), so it feels strong, not stressful.",
      "Because you're **{activity}**, sessions slot right into your day.",
      "At **{age}**, we focus on clean form and a deep hold you can feel.",
      "Kept safe around **{condition}**.",
    ],
    cta: "Unlock My Core Plan",
  },
  bladderLeaks: {
    subtitle: "Cough, laugh and work out with confidence by **{date}**.",
    insights: [
      "Set for your body (BMI **{bmi}**) to keep pressure in check.",
      "With **{activity}** days, we train quick squeezes and urge holds you can use anywhere.",
      "At **{age}**, we mix long holds with fast squeezes for real control.",
      "Your plan works around **{condition}** while we rebuild your trust.",
    ],
    cta: "Unlock My Leak-Free Plan",
  },
  pelvicPain: {
    subtitle: "Less ache sitting, standing and at bedtime by **{date}**.",
    insights: [
      "Built for your body (BMI **{bmi}**) to take the strain off.",
      "Right for **{activity}** days: we start quiet and calm things down first.",
      "At **{age}**, we pair gentle release with light strength that lasts.",
      "Guided by **{condition}**, so every move feels safe.",
    ],
    cta: "Unlock My Pain Relief Plan",
  },
  intimacy: {
    subtitle: "More feeling, more comfort and reliable orgasms by **{date}**.",
    insights: [
      "Paced for your body (BMI **{bmi}**) to boost blood flow without pressure.",
      "With **{activity}** days, we build both the letting go and the strength behind more feeling.",
      "At **{age}**, we retrain the muscles so arousal starts sooner and orgasms land stronger.",
      "Positions and pacing adjusted for **{condition}**, so comfort stays high.",
    ],
    cta: "Unlock My Intimacy Plan",
  },
  fitness: {
    subtitle: "More power in lifts, runs and classes by **{date}**.",
    insights: [
      "Set for your body (BMI **{bmi}**), so the effort helps and never hurts.",
      "Matched to your **{activity}** routine, so it is easy to stack with your training.",
      "At **{age}**, we pair steadiness with power you feel in your next workout.",
      "Kept safe around **{condition}**.",
    ],
    cta: "Unlock My Fitness Plan",
  },
  stability: {
    subtitle: "Feel taller and steadier, from your desk to the stairs, by **{date}**.",
    insights: [
      "Built for your body (BMI **{bmi}**), with holds you can keep up all day.",
      "Because you're **{activity}**, we work on sitting, walking and carrying.",
      "At **{age}**, we train your deep core so standing and stairs feel smooth.",
      "Set around **{condition}**, so it stays easy on your back, hips and neck.",
    ],
    cta: "Unlock My Stability Plan",
  },
  diastasisRecti: {
    subtitle: "Feel your gap closing and your middle joining back up by **{date}**.",
    insights: [
      "Built for your body (BMI **{bmi}**), so every rep stays safe for the gap.",
      "Because you're **{activity}**, we rebuild your deep core without pressure spikes.",
      "At **{age}**, we retrain your deep core so the gap draws closed. No surgery.",
      "Adjusted for **{condition}**, so healing tissue is always protected.",
    ],
    cta: "Unlock My Gap-Healing Plan",
  },
};

export const timeline = (goalId) => pick(TIMELINE, goalId);

export const INSIGHTS_HEADLINE = "Your Personal Insights";

const MILESTONES = {
  "stop bladder leaks": [
    { week: 1, text: "Re-educating Pelvic Floor" },
    { week: 2, text: "Improving Bladder Control" },
    { week: 4, text: "Confidence During Sneezes" },
    { week: 6, text: "Full Leak-Proof Strength" },
  ],
  "ease pelvic pain": [
    { week: 1, text: "Gentle Release & Relaxation" },
    { week: 2, text: "Reducing Chronic Tension" },
    { week: 4, text: "Building Supportive Strength" },
    { week: 6, text: "Pain-Free Daily Movement" },
  ],
  "heal diastasis recti": [
    { week: 1, text: "Reconnecting Your Deep Core" },
    { week: 2, text: "Gap-Safe Strength Building" },
    { week: 4, text: "Drawing the Gap Closed" },
    { week: 6, text: "A Strong, Rebuilt Middle" },
  ],
  default: [
    { week: 1, text: "Foundation Week" },
    { week: 2, text: "Muscle Activation" },
    { week: 4, text: "Building Endurance" },
    { week: 6, text: "Full Core Integration" },
  ],
};

/** Keyed on the lowercased sentence phrase, exactly as iOS keys it. */
export const milestones = (sentencePhrase) =>
  MILESTONES[(sentencePhrase || "").toLowerCase()] || MILESTONES.default;

// ---------------------------------------------------------------------------
// 8. Email capture
// ---------------------------------------------------------------------------

export function emailTitle(name) {
  const who = (name || "").trim();
  return who
    ? `Your plan is ready, ${who}. Where should we send it?`
    : "Your plan is ready. Where should we send it?";
}

export const EMAIL_SUBTITLE =
  "We'll email you a copy of your plan so you never lose it. No spam. Unsubscribe anytime.";

export const EMAIL_PLACEHOLDER = "Your email address";
export const EMAIL_CTA = "Email My Plan";
export const EMAIL_SKIP = "Continue without saving";
