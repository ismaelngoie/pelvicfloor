"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUserData } from "@/context/UserDataContext";
import {
  Check,
  HeartHandshake,
  Baby,
  Droplets,
  User,
  Sparkles,
  Lock,
  CheckCircle2,
} from "lucide-react";

/* =========================
   DATA (match Swift naming vibe)
========================= */
const CONDITIONS = [
  { id: "pain", title: "Ease Pelvic Pain", icon: <HeartHandshake size={28} /> },
  { id: "postpartum", title: "Speed Postpartum Recovery", icon: <Baby size={28} /> },
  { id: "leaks", title: "Stop Bladder Leaks", icon: <Droplets size={28} /> },
  { id: "prostate", title: "Support Prostate Health", icon: <User size={28} /> },
];

const ACTIVITIES = [
  { id: "sedentary", title: "Sedentary", sub: "(mostly sitting)" },
  { id: "moderate", title: "Lightly Active", sub: "(daily walks)" },
  { id: "active", title: "Very Active", sub: "(regular workouts)" },
];

/* =========================
   THEME (keep your existing app tokens)
========================= */
const THEME = {
  primary: "text-app-primary",
  primaryBg: "bg-app-primary",
  activeBorder: "border-rose-500",
  glow: "shadow-[0_18px_45px_rgba(244,63,94,0.18)]",
  inactiveBorder: "border-gray-200",
};

/* =========================
   COPY HELPERS (Swift logic)
========================= */
const getPersonalizedCopy = (goal, name) => {
  const safeName = name || "";
  const n = safeName ? safeName : "love";
  const map = {
    "Improve Intimacy": {
      title: `Designing your intimacy plan, ${n}`,
      subtitle: "Comfort, sensation, confidence—gently built for your body.",
      connecting: "Checking your profile for arousal flow and comfort…",
      calibrating: "Balancing relax/contract patterns for stronger, more reliable orgasms…",
      checklist: [
        "Comfort-first warmups",
        "Relax/contract patterns for arousal",
        "Tone for stronger orgasms",
        "Partner-friendly positions",
      ],
    },
    "Stop Bladder Leaks": {
      title: "Personalizing your leak-control plan",
      subtitle: "Train reflexes so sneezes and laughs don’t own your day.",
      connecting: "Mapping urge delays and quick-contract sets…",
      calibrating: "Dialing breath and pressure control for real-life moments…",
      checklist: [
        "Urge-delay reflex training",
        "Fast-twitch squeezes",
        "Breath + pressure control",
        "Run/jump confidence drills",
      ],
    },
    "Ease Pelvic Pain": {
      title: "Personalizing your pain-relief plan",
      subtitle: "Release tension, add support, and keep comfort front and center.",
      connecting: "Identifying tight patterns and sensitive ranges…",
      calibrating: "Layering gentle strength for lasting relief…",
      checklist: [
        "Down-train tight muscles",
        "Nerve-calming breath",
        "Gentle glute + core support",
        "Daily posture resets",
      ],
    },
    "Recover Postpartum": {
      title: "Personalizing your postpartum plan",
      subtitle: "Kind, steady rebuilding for your core, hips, and back.",
      connecting: "Checking diastasis-safe progressions…",
      calibrating: "Tuning lifts and carries so daily life feels stable…",
      checklist: [
        "Core connection breath",
        "Diastasis-safe moves",
        "Hip + back relief",
        "Lift-and-carry practice",
      ],
    },
    "Prepare for Pregnancy": {
      title: "Personalizing your prep plan",
      subtitle: "Circulation, breath, and a supportive core.",
      connecting: "Syncing breath-led endurance…",
      calibrating: "Setting hip mobility and pelvic coordination…",
      checklist: ["Circulation + breath", "Pelvic floor coordination", "Hip mobility", "Labor-prep positions"],
    },
    "Build Core Strength": {
      title: "Personalizing your core plan",
      subtitle: "Deep, steady strength without guesswork.",
      connecting: "Targeting activation and timing…",
      calibrating: "Building anti-rotation and hinge patterns…",
      checklist: ["Deep core activation", "Anti-rotation work", "Hinge + squat mechanics", "Back-friendly progressions"],
    },
    "Support My Fitness": {
      title: "Personalizing your training support",
      subtitle: "Make every workout you do feel more solid.",
      connecting: "Priming brace and breath for lifts/cardio…",
      calibrating: "Matching intensity to recovery…",
      checklist: ["Pre-workout core priming", "Brace + breathe", "Recovery mobilization", "Force transfer training"],
    },
    "Boost Stability & Posture": {
      title: "Personalizing your stability plan",
      subtitle: "Tall, steady, and organized all day.",
      connecting: "Stacking rib-to-pelvis alignment…",
      calibrating: "Endurance for postural muscles…",
      checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"],
    },
    default: {
      title: `Personalizing your plan${safeName ? `, ${safeName}` : ""}`,
      subtitle: "Crafting your custom routine to stop leaks, end pain, and build confidence.",
      connecting: "Connecting to Coach Mia…",
      calibrating: "Building your custom routine…",
      checklist: [
        "Custom exercises for leak-free living",
        "Deep insights to track your progress",
        "Expert tips to end pain and tension",
        "Community support for lasting habits",
      ],
    },
  };
  return map[goal] || map.default;
};

const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": {
      headline: "Any health notes before we target leaks?",
      subtitle: "This helps me map safe, effective bladder-control sessions.",
      cta: "Build My Leak-Free Plan",
    },
    "Ease Pelvic Pain": {
      headline: "Any health notes before we ease pain?",
      subtitle: "I’ll protect sensitive ranges and focus on release first.",
      cta: "Build My Pain-Relief Plan",
    },
    "Improve Intimacy": {
      headline: "Any health notes before we boost intimacy?",
      subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.",
      cta: "Build My Intimacy Plan",
    },
    "Recover Postpartum": {
      headline: "Any health notes before we rebuild gently?",
      subtitle: "I’ll keep everything postpartum-safe and progressive.",
      cta: "Build My Postpartum Plan",
    },
    "Prepare for Pregnancy": {
      headline: "Any health notes before we prep for pregnancy?",
      subtitle: "I’ll prioritize circulation, breath, and core support.",
      cta: "Build My Prep Plan",
    },
    "Build Core Strength": {
      headline: "Any health notes before we strengthen your core?",
      subtitle: "This ensures smart progressions and safe loading.",
      cta: "Build My Core Plan",
    },
    "Support My Fitness": {
      headline: "Any health notes before we support your training?",
      subtitle: "I’ll sync to your routine and recovery needs.",
      cta: "Build My Fitness Plan",
    },
    "Boost Stability & Posture": {
      headline: "Any health notes before we boost stability?",
      subtitle: "I’ll align mobility + deep core for posture wins.",
      cta: "Build My Stability Plan",
    },
    default: {
      headline: "Last step! Any health notes?",
      subtitle: "This ensures every exercise is safe and perfectly tailored to you.",
      cta: "Build My Custom Plan",
    },
  };
  return map[goal] || map.default;
};

const helperCopy = (selected, goal) => {
  if (selected) {
    switch (goal) {
      case "Stop Bladder Leaks":
        return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
      case "Ease Pelvic Pain":
        return "✓ Noted. We’ll protect sensitive ranges and release tension first.";
      case "Improve Intimacy":
        return "✓ Noted. I’ll focus on comfort, arousal flow, and pelvic tone.";
      case "Recover Postpartum":
        return "✓ Noted. We’ll keep it postpartum-safe with gentle progressions.";
      case "Prepare for Pregnancy":
        return "✓ Noted. I’ll prioritize breath, circulation, and foundation.";
      case "Build Core Strength":
        return "✓ Noted. Smart progressions, no risky strain.";
      case "Support My Fitness":
        return "✓ Noted. I’ll match your training load and recovery.";
      case "Boost Stability & Posture":
        return "✓ Noted. Deep core + alignment for steady posture wins.";
      default:
        return "✓ Understood. I'll tailor your plan accordingly.";
    }
  } else {
    switch (goal) {
      case "Stop Bladder Leaks":
        return "✓ Great. We’ll start with core reflexes for leak control.";
      case "Ease Pelvic Pain":
        return "✓ Great. Gentle release + support from day one.";
      case "Improve Intimacy":
        return "✓ Great. Comfort, sensation, and confidence from the start.";
      case "Recover Postpartum":
        return "✓ Great. Foundation work, safe and steady.";
      case "Prepare for Pregnancy":
        return "✓ Great. Building a strong, calm base for you.";
      case "Build Core Strength":
        return "✓ Great. Clean technique and deep core activation.";
      case "Support My Fitness":
        return "✓ Great. We’ll slot in perfectly with your routine.";
      case "Boost Stability & Posture":
        return "✓ Great. Alignment + deep core integration ahead.";
      default:
        return "✓ Great! We'll start with a foundational plan.";
    }
  }
};

const getTimelineCopy = (goal) => {
  const map = {
    "Prepare for Pregnancy": {
      subtitle: "Feel ready to carry and move with ease by {date}.",
      insights: [
        "Built for your body (BMI {bmi}) so joints and pelvic floor stay happy.",
        "Because you’re {activity}, sessions are short, steady, and stick.",
        "At {age}, we train calm breath and deep core for a growing belly.",
        "Safe for {condition} with low-pressure positions.",
      ],
      cta: "Unlock My Pregnancy Prep",
    },
    "Recover Postpartum": {
      subtitle: "Feel steady holding your baby again by {date}.",
      insights: [
        "Calibrated for your body (BMI {bmi}) to protect healing tissue.",
        "Matched to {activity}—works on low-sleep days.",
        "At {age}, we rebuild core connection so feeds and lifts feel easier.",
        "Adjusted for {condition} including scar or tender areas.",
      ],
      cta: "Unlock My Postpartum Plan",
    },
    "Stop Bladder Leaks": {
      subtitle: "Confident coughs, laughs, and workouts by {date}.",
      insights: [
        "Tuned to your body (BMI {bmi}) to manage pressure.",
        "With {activity}, we train quick squeezes and urge delay you can use anywhere.",
        "At {age}, we blend long holds with fast pulses for real control.",
        "Plan respects {condition} while we rebuild trust.",
      ],
      cta: "Unlock My Leak-Free Plan",
    },
    "Ease Pelvic Pain": {
      subtitle: "Less ache sitting, standing, and at bedtime by {date}.",
      insights: [
        "Built for your body (BMI {bmi}) to lower strain.",
        "{activity} friendly—start quiet, calm the system first.",
        "At {age}, we pair soft release with light strength that lasts.",
        "Guided by {condition} so every range feels safe.",
      ],
      cta: "Unlock My Pain Relief Plan",
    },
    default: {
      subtitle: "Your personalized plan is set. Expect to feel a real difference by {date}.",
      insights: [
        "Your plan is calibrated for a BMI of {bmi}, ensuring perfect intensity.",
        "Because you have a {activity} activity level, we'll build foundation safely.",
        "At {age} years old, your plan focuses on neuro-muscular connection.",
        "We've modified your plan to be safe for your {condition}.",
      ],
      cta: "Unlock My Personal Plan",
    },
  };
  return map[goal] || map.default;
};

const getMilestones = (goalLower) => {
  switch (goalLower) {
    case "stop bladder leaks":
      return [
        { week: 1, t: 0.1, label: "Re-educating Pelvic Floor" },
        { week: 2, t: 0.3, label: "Improving Bladder Control" },
        { week: 4, t: 0.7, label: "Confidence During Sneezes" },
        { week: 6, t: 1.0, label: "Full Leak-Proof Strength" },
      ];
    case "ease pelvic pain":
      return [
        { week: 1, t: 0.1, label: "Gentle Release & Relaxation" },
        { week: 2, t: 0.3, label: "Reducing Chronic Tension" },
        { week: 4, t: 0.7, label: "Building Supportive Strength" },
        { week: 6, t: 1.0, label: "Pain-Free Daily Movement" },
      ];
    default:
      return [
        { week: 1, t: 0.1, label: "Foundation Week" },
        { week: 2, t: 0.3, label: "Muscle Activation" },
        { week: 4, t: 0.7, label: "Building Endurance" },
        { week: 6, t: 1.0, label: "Full Core Integration" },
      ];
  }
};

// cubic-bezier point (SVG coords)
const pointOnCurve = (t, W = 300, H = 180) => {
  const p0 = { x: 20, y: H * 0.8 };
  const p3 = { x: W - 20, y: H * 0.2 };
  const p1 = { x: W * 0.2, y: H * 0.9 };
  const p2 = { x: W * 0.8, y: H * 0.1 };

  const oneMinusT = 1 - t;
  const oneMinusTSq = oneMinusT * oneMinusT;
  const oneMinusTCb = oneMinusTSq * oneMinusT;
  const tSq = t * t;
  const tCb = tSq * t;

  const x =
    oneMinusTCb * p0.x +
    3 * oneMinusTSq * t * p1.x +
    3 * oneMinusT * tSq * p2.x +
    tCb * p3.x;

  const y =
    oneMinusTCb * p0.y +
    3 * oneMinusTSq * t * p1.y +
    3 * oneMinusT * tSq * p2.y +
    tCb * p3.y;

  return { x, y };
};

/* =========================
   MAIN
========================= */
export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();

  // phase: 'health' -> 'analyzing' -> 'timeline'
  const [phase, setPhase] = useState("health");

  // Phase 1
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);

  // helper labels (match Swift split)
  const [conditionHelper, setConditionHelper] = useState("");
  const [activityHelper, setActivityHelper] = useState("");

  // Phase 2 (7s)
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Connecting to Coach Mia…");
  const [typedStatus, setTypedStatus] = useState("");
  const timerRef = useRef(null);

  // Phase 3
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineReady, setTimelineReady] = useState(false);

  // stable client-only values (avoid hydration mismatch)
  const [dateString, setDateString] = useState("");
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDateString(
      d.toLocaleDateString("en-US", { month: "long", day: "2-digit" })
    );
    setParticles(
      Array.from({ length: 32 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        dur: 4.5 + Math.random() * 4,
        size: 1 + Math.random() * 2,
        opacity: 0.15 + Math.random() * 0.35,
      }))
    );
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const healthText = getHealthCopy(goalTitle);

  const analysisCopy = getPersonalizedCopy(goalTitle, userDetails.name);
  const timelineCopy = getTimelineCopy(goalTitle);

  const canContinue = (isNone || selectedConditions.length > 0) && !!activity;

  /* ---------- Phase 1 actions ---------- */
  const toggleCondition = (id) => {
    setIsNone(false);
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleNone = () => {
    setIsNone((v) => !v);
    setSelectedConditions([]);
  };

  const handleHealthContinue = () => {
    if (!canContinue) return;
    saveUserData("healthConditions", selectedConditions);
    saveUserData("activityLevel", activity);
    startAnalysis();
  };

  // helper labels like Swift
  useEffect(() => {
    const hasCond = selectedConditions.length > 0;
    if (hasCond) setConditionHelper(helperCopy(true, goalTitle));
    else if (isNone) setConditionHelper(helperCopy(false, goalTitle));
    else setConditionHelper("");

    if (activity) setActivityHelper("✓ Perfect, I'll match your pace & recovery.");
    else setActivityHelper("");
  }, [selectedConditions, isNone, activity, goalTitle]);

  /* ---------- Phase 2: analysis (7 sec) ---------- */
  const startAnalysis = () => {
    setPhase("analyzing");
    setProgress(0);
    setTypedStatus("");
    setAnalysisStatus(analysisCopy.connecting || "Connecting to Coach Mia…");

    const TOTAL = 7000;
    const tick = 50;
    const steps = TOTAL / tick;
    let s = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      s += 1;
      const pct = Math.min(100, Math.round((s / steps) * 100));
      setProgress(pct);

      // Swift-ish phase timings
      if (pct === 25) setAnalysisStatus(analysisCopy.calibrating || "Building your custom routine…");
      if (pct === 45) setAnalysisStatus("Preparing exercises for fast relief…");
      if (pct === 60) setAnalysisStatus("Fine-tuning for: " + (analysisCopy.checklist?.[0] || "your routine"));
      if (pct === 73) setAnalysisStatus("Fine-tuning for: " + (analysisCopy.checklist?.[1] || "your routine"));
      if (pct === 86) setAnalysisStatus("Fine-tuning for: " + (analysisCopy.checklist?.[2] || "your routine"));
      if (pct === 96) setAnalysisStatus("Fine-tuning for: " + (analysisCopy.checklist?.[3] || "your routine"));

      if (pct >= 100) {
        clearInterval(timerRef.current);
        timerRef.current = null;

        // final
        setTimeout(() => {
          setPhase("timeline");
          setTimelineReady(true);
          setTimeout(() => setShowTimeline(true), 120);
        }, 600);
      }
    }, tick);
  };

  // Type-out effect (Swift typeOut)
  useEffect(() => {
    let cancelled = false;
    setTypedStatus("");

    const text = analysisStatus || "";
    let idx = 0;

    const t = setInterval(() => {
      if (cancelled) return;
      idx += 1;
      setTypedStatus(text.slice(0, idx));
      if (idx >= text.length) clearInterval(t);
    }, 18);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [analysisStatus]);

  // Checklist item progress (like Swift stroke border)
  const checklistProgress = useMemo(() => {
    // start checklist around 50%, spread across 4 items to ~98%
    const starts = [50, 62, 74, 86];
    const span = 12;
    return (analysisCopy.checklist || []).map((_, i) => {
      const start = starts[i] ?? 50;
      const end = start + span;
      const p = (progress - start) / (end - start);
      return Math.max(0, Math.min(1, p));
    });
  }, [progress, analysisCopy.checklist]);

  const checklistVisibleCount = useMemo(() => {
    // when progress crosses each start, item appears
    const starts = [50, 62, 74, 86];
    return starts.filter((s) => progress >= s).length;
  }, [progress]);

  /* ---------- Phase 3: timeline ---------- */
  const calculateBMI = () => {
    if (!userDetails.weight || !userDetails.height) return "22.5";
    const heightM = userDetails.height * 0.0254;
    const weightKg = userDetails.weight * 0.453592;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };

  const activityLabel = activity
    ? (ACTIVITIES.find((a) => a.id === activity)?.title || "Active").toLowerCase()
    : "active";

  const firstConditionTitle = selectedConditions.length
    ? (CONDITIONS.find((c) => c.id === selectedConditions[0])?.title || "unique needs")
    : "unique needs";

  const timelineSubtitle = (timelineCopy.subtitle || "")
    .replace("{date}", dateString || "soon");

  const formattedInsights = (timelineCopy.insights || []).map((t) =>
    t
      .replace("{bmi}", calculateBMI())
      .replace("{activity}", activityLabel)
      .replace("{age}", userDetails.age || "30")
      .replace("{condition}", firstConditionTitle)
  );

  const goalLower = (goalTitle || "").toLowerCase();
  const milestones = useMemo(() => getMilestones(goalLower), [goalLower]);
  const bezierPath = useMemo(
    () => `M 20 144 C 60 162 240 18 280 36`,
    []
  );

  return (
    <div
      className={`relative w-full overflow-hidden transition-colors duration-700 ease-in-out
        ${phase === "health" ? "bg-app-background" : "bg-black"}
        min-h-[100dvh]`}
    >
      {/* =========================
          PHASE 1: HEALTH
      ========================= */}
      {phase === "health" && (
        <div className="flex flex-col min-h-[100dvh]">
          <div className="flex-1 px-6 pt-10 pb-4 overflow-y-auto no-scrollbar pf-fade-in">
            <div className="pf-softTopGlow" />

            <h1 className="text-[28px] font-extrabold text-center text-app-textPrimary mb-2 leading-tight">
              {healthText.headline}
            </h1>
            <p className="text-center text-app-textSecondary text-[15px] mb-8">
              {healthText.subtitle}
            </p>

            {/* Conditions Grid (Swift ConditionCell vibes) */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              {CONDITIONS.map((c) => {
                const active = selectedConditions.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCondition(c.id)}
                    className={[
                      "relative group flex flex-col items-center justify-center px-4 py-4 rounded-[24px]",
                      "border transition-all duration-300 outline-none",
                      "pf-card",
                      active ? "pf-card-active" : "pf-card-idle",
                    ].join(" ")}
                  >
                    {/* icon */}
                    <div
                      className={[
                        "mb-2 transition-all duration-300",
                        active ? "text-rose-500" : "text-gray-400",
                      ].join(" ")}
                    >
                      {c.icon}
                    </div>

                    {/* title */}
                    <span
                      className={[
                        "text-[13px] font-semibold text-center leading-tight",
                        active ? "text-app-textPrimary" : "text-gray-500",
                      ].join(" ")}
                    >
                      {c.title}
                    </span>

                    {/* check */}
                    <div
                      className={[
                        "absolute top-3 right-3 transition-all duration-300",
                        active ? "opacity-100 scale-100" : "opacity-0 scale-90",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <div className="pf-checkPill">
                        <CheckCircle2 size={20} className="text-white" />
                      </div>
                    </div>

                    {/* subtle active tint */}
                    {active && <div className="pf-activeTint" />}
                  </button>
                );
              })}
            </div>

            {/* Condition helper (Swift: conditionsHelperLabel) */}
            <div className="min-h-[24px] flex items-center justify-center mb-3">
              {conditionHelper && (
                <p className="text-rose-500 text-sm font-semibold pf-fade-in">
                  {conditionHelper}
                </p>
              )}
            </div>

            {/* None Button (Swift: ✓ None of the Above) */}
            <button
              onClick={toggleNone}
              className={[
                "w-full py-3.5 rounded-full border font-semibold text-[15px] mb-7 transition-all outline-none active:scale-[0.99]",
                "pf-pill",
                isNone ? "pf-pill-active" : "pf-pill-idle",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <span className={isNone ? "text-rose-500" : "text-gray-400"}>✓</span>
                None of the Above
              </span>
            </button>

            {/* Activity Level */}
            <h3 className="text-lg font-extrabold text-center mb-4 text-app-textPrimary">
              Your typical activity level
            </h3>
            <div className="flex flex-col gap-3 mb-2">
              {ACTIVITIES.map((a) => {
                const active = activity === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActivity(a.id)}
                    className={[
                      "relative w-full px-5 py-4 rounded-[22px] border outline-none transition-all duration-300",
                      "flex items-center justify-between text-left overflow-hidden",
                      "pf-card",
                      active ? "pf-card-active" : "pf-card-idle",
                    ].join(" ")}
                  >
                    <span className="relative z-10">
                      <span className={active ? "text-app-textPrimary font-bold text-[15px]" : "text-gray-500 font-bold text-[15px]"}>
                        {a.title}{" "}
                      </span>
                      <span className="text-sm opacity-70 ml-1">{a.sub}</span>
                    </span>

                    <span
                      className={[
                        "relative z-10 transition-all duration-300",
                        active ? "opacity-100 scale-100" : "opacity-0 scale-90",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <div className="pf-checkPill">
                        <CheckCircle2 size={20} className="text-white" />
                      </div>
                    </span>

                    {active && <div className="pf-activeTint" />}
                  </button>
                );
              })}
            </div>

            {/* Activity helper (Swift: activityHelperLabel) */}
            <div className="min-h-[24px] flex items-center justify-center mb-4">
              {activityHelper && (
                <p className="text-rose-500 text-sm font-semibold pf-fade-in">
                  {activityHelper}
                </p>
              )}
            </div>

            {/* Spacer so sticky CTA never covers content */}
            <div className="h-28 w-full" />
          </div>

          {/* Sticky Footer CTA (Swift gradient button) */}
          <div className="absolute bottom-0 w-full px-6 pb-8 pt-6 bg-gradient-to-t from-app-background via-app-background/95 to-transparent z-[50]">
            <button
              onClick={handleHealthContinue}
              disabled={!canContinue}
              className={[
                "w-full h-14 rounded-full font-extrabold text-lg transition-all duration-300",
                "pf-cta",
                canContinue ? "pf-cta-active" : "pf-cta-disabled",
              ].join(" ")}
            >
              {healthText.cta}
            </button>
          </div>
        </div>
      )}

      {/* =========================
          PHASE 2: PERSONALIZING (Swift AICore + checklist)
      ========================= */}
      {phase === "analyzing" && (
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-8 pt-10 pb-10 text-white pf-fade-in overflow-hidden">
          {/* background */}
          <div className="pf-darkGlow" aria-hidden="true" />

          {/* Title + Subtitle (fade in after checklist stage begins) */}
          <div
            className={[
              "w-full max-w-md text-center transition-all duration-700",
              progress >= 50 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
            ].join(" ")}
          >
            <div className="text-white/85 tracking-[0.12em] text-[11px] font-semibold mb-3">
              PERSONALIZING YOUR BODY&apos;S PLAN
            </div>
            <h2 className="text-[26px] font-extrabold leading-tight mb-2">
              {analysisCopy.title}
            </h2>
            <p className="text-white/60 text-[15px] mb-6">
              {analysisCopy.subtitle}
            </p>
          </div>

          {/* Status label (Swift typeOut) - visible in early stage */}
          <div
            className={[
              "absolute top-16 left-0 right-0 px-8 text-center transition-all duration-700",
              progress < 50 ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <div className="text-white/85 text-[18px] font-semibold leading-snug pf-typeLine">
              {typedStatus}
              <span className="pf-caret" aria-hidden="true" />
            </div>
          </div>

          {/* AICore (3 rings + orb) */}
          <div className="relative w-[160px] h-[160px] mt-6 mb-10">
            <div className="pf-core">
              <div className="pf-ring pf-ring-1" />
              <div className="pf-ring pf-ring-2" />
              <div className="pf-ring pf-ring-3" />
              <div className="pf-orb" />
              <div className="pf-orbGlow" />
            </div>
          </div>

          {/* Checklist */}
          <div
            className={[
              "w-full max-w-md space-y-4 transition-all duration-700",
              progress >= 50 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            ].join(" ")}
          >
            {(analysisCopy.checklist || []).map((item, idx) => {
              const visible = idx < checklistVisibleCount;
              const p = checklistProgress[idx] ?? 0;
              const done = p >= 1;

              return (
                <ChecklistItem
                  key={idx}
                  text={item}
                  visible={visible}
                  progress={p}
                  done={done}
                  delay={0.05 * idx}
                />
              );
            })}
          </div>

          {/* Bottom Progress (Swift: Progress + % + bar + status) */}
          <div className="w-full max-w-md mt-10">
            <div className="flex items-end justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">Progress</span>
              <span className="text-white font-extrabold text-[22px] tabular-nums">
                {Math.min(progress, 100)}%
              </span>
            </div>

            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-app-primary pf-progressFill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="mt-3 text-center text-rose-400 font-semibold text-[13px]">
              {analysisStatus}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          PHASE 3: TIMELINE REVEAL (Swift holographic vibes + particles)
      ========================= */}
      {phase === "timeline" && (
        <div
          className={[
            "relative flex flex-col min-h-[100dvh] overflow-hidden transition-opacity duration-1000",
            showTimeline ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {/* particles */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="pf-timelineGlow" />
            {(particles || []).map((p) => (
              <span
                key={p.id}
                className="pf-spark"
                style={{
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.dur}s`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  opacity: p.opacity,
                }}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-28 overflow-y-auto no-scrollbar relative z-10">
            <h1 className="text-[32px] font-extrabold text-white text-center mb-3 leading-tight drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
              <span className="text-app-primary">{userDetails.name || "Your"}</span>{" "}
              path to
              <br />
              {goalTitle} is ready.
            </h1>

            <p className="text-center text-white/75 text-[15px] max-w-md">
              {timelineSubtitle}
            </p>

            {/* Holographic Timeline */}
            <div className="w-full max-w-md mt-8 mb-6">
              <div className="pf-holoCard">
                <div className="pf-holoHeader">
                  <span className="text-white/80 text-xs font-semibold tracking-[0.18em]">
                    YOUR 6-WEEK PATH
                  </span>
                </div>

                <div className="relative w-full h-[190px]">
                  <svg viewBox="0 0 300 180" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="pfLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(244,63,94,0.25)" />
                        <stop offset="60%" stopColor="rgba(244,63,94,0.85)" />
                        <stop offset="100%" stopColor="rgba(168,85,247,0.85)" />
                      </linearGradient>

                      <radialGradient id="pfRad" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="rgba(244,63,94,0.16)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                      </radialGradient>

                      <filter id="pfGlow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <rect x="0" y="0" width="300" height="180" fill="url(#pfRad)" />

                    {/* path (draw animation) */}
                    <path
                      d={bezierPath}
                      fill="none"
                      stroke="url(#pfLine)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      filter="url(#pfGlow)"
                      className={timelineReady ? "pf-drawPath" : ""}
                    />

                    {/* rider dot (motion path via CSS if supported) */}
                    <circle
                      r="5"
                      cx="20"
                      cy="144"
                      className={timelineReady ? "pf-riderDot" : ""}
                      fill="white"
                      filter="url(#pfGlow)"
                    />

                    {/* milestones */}
                    {milestones.map((m, i) => {
                      const pt = pointOnCurve(m.t, 300, 180);
                      const delay = 0.9 + m.t * 1.8; // Swift-ish stagger
                      return (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={m.t === 1 ? 7 : 5}
                            fill={m.t === 1 ? "rgba(244,63,94,0.95)" : "white"}
                            stroke={m.t === 1 ? "white" : "rgba(255,255,255,0.7)"}
                            strokeWidth={m.t === 1 ? 2 : 1.5}
                            filter="url(#pfGlow)"
                            className="pf-nodePop"
                            style={{ animationDelay: `${delay}s` }}
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 16}
                            textAnchor="middle"
                            className="pf-nodeLabel"
                            style={{ animationDelay: `${delay}s` }}
                          >
                            Week {m.week}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className="pf-miniMilestone"
                      style={{ animationDelay: `${1.1 + i * 0.12}s` }}
                    >
                      <span className="pf-miniDot" />
                      <span className="text-white/80 text-[12px] leading-snug">
                        <span className="text-white font-semibold">Week {m.week}:</span> {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="w-full max-w-md space-y-4 mt-2">
              <h3 className="text-white font-extrabold text-lg mb-1">
                Your Personal Insights
              </h3>
              {formattedInsights.map((insight, index) => (
                <InsightRow
                  key={index}
                  icon={<Sparkles size={18} />}
                  text={insight}
                  delay={0.25 + index * 0.12}
                />
              ))}
            </div>

            <div className="h-20" />
          </div>

          {/* Sticky Footer */}
          <div className="absolute bottom-0 w-full px-6 pb-8 pt-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
            <button
              onClick={onNext}
              className="w-full h-14 pf-ctaTimeline rounded-full text-white font-extrabold text-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            >
              <Lock size={18} /> {timelineCopy.cta}
            </button>
            <p className="text-center text-white/40 text-xs mt-3">
              Secure checkout • 100% Money-back guarantee
            </p>
          </div>
        </div>
      )}

      {/* =========================
          INLINE CSS (no other files needed)
      ========================= */}
      <style jsx global>{`
        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .pf-fade-in, .pf-drawPath, .pf-nodePop, .pf-spark, .pf-ring, .pf-orb { animation: none !important; }
          .pf-progressFill { transition: none !important; }
        }

        /* base fades */
        @keyframes pfFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pf-fade-in { animation: pfFadeIn 520ms cubic-bezier(.2,.8,.2,1) both; }

        /* subtle top glow */
        .pf-softTopGlow{
          position:absolute; inset:-80px -80px auto -80px; height:220px;
          background: radial-gradient(circle at 50% 40%, rgba(244,63,94,0.18), rgba(0,0,0,0));
          pointer-events:none;
          filter: blur(10px);
        }

        /* Card styles (Swift ConditionCell feel) */
        .pf-card{
          background: #ffffff;
          border-width: 1.5px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
          transform: translateZ(0);
          transition:
            transform 350ms cubic-bezier(.2,.8,.2,1),
            box-shadow 350ms cubic-bezier(.2,.8,.2,1),
            border-color 350ms cubic-bezier(.2,.8,.2,1),
            border-width 350ms cubic-bezier(.2,.8,.2,1);
          position: relative;
        }
        .pf-card-idle{
          border-color: rgba(229,231,235,1);
        }
        .pf-card-active{
          border-color: rgba(244,63,94,1);
          border-width: 3px;
          transform: scale(1.04);
          box-shadow: 0 18px 45px rgba(244,63,94,0.18), 0 12px 28px rgba(0,0,0,0.06);
          z-index: 10;
        }
        .pf-activeTint{
          position:absolute; inset:0;
          border-radius: 22px;
          background: radial-gradient(circle at 50% 30%, rgba(244,63,94,0.18), rgba(244,63,94,0.04), rgba(255,255,255,0));
          pointer-events:none;
        }
        .pf-checkPill{
          width: 26px; height: 26px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(244,63,94,1), rgba(244,63,94,0.78));
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 12px 25px rgba(244,63,94,0.22);
        }

        /* pills (none button) */
        .pf-pill{ border-width:1.5px; background:#fff; }
        .pf-pill-idle{ border-color: rgba(229,231,235,1); color: rgba(107,114,128,1); }
        .pf-pill-active{
          border-color: rgba(244,63,94,1);
          border-width: 3px;
          color: rgba(244,63,94,1);
          background: rgba(244,63,94,0.06);
          box-shadow: 0 14px 34px rgba(244,63,94,0.14);
          transform: scale(1.01);
        }

        /* CTA (health) */
        .pf-cta{
          box-shadow: 0 18px 40px rgba(0,0,0,0.12);
        }
        .pf-cta-active{
          background: linear-gradient(180deg, rgba(244,63,94,1), rgba(244,63,94,0.82));
          color: white;
        }
        .pf-cta-active:active{ transform: scale(0.99); }
        .pf-cta-disabled{
          background: rgba(229,231,235,1);
          color: rgba(156,163,175,1);
          box-shadow: none;
          cursor: not-allowed;
        }

        /* Phase 2 background glow */
        .pf-darkGlow{
          position:absolute; inset:-120px;
          background:
            radial-gradient(circle at 50% 25%, rgba(244,63,94,0.18), rgba(0,0,0,0) 55%),
            radial-gradient(circle at 15% 70%, rgba(168,85,247,0.14), rgba(0,0,0,0) 52%),
            radial-gradient(circle at 85% 75%, rgba(244,63,94,0.10), rgba(0,0,0,0) 55%);
          filter: blur(14px);
          pointer-events:none;
        }

        /* Typeout caret */
        .pf-typeLine{ text-shadow: 0 10px 30px rgba(0,0,0,0.45); }
        @keyframes pfCaret { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .pf-caret{
          display:inline-block; width:8px; height:18px; margin-left:6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.5);
          vertical-align: -3px;
          animation: pfCaret 900ms infinite;
        }

        /* AI Core (Swift rings + orb) */
        .pf-core{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        .pf-ring{
          position:absolute; border-radius:9999px;
          border: 2px solid rgba(244,63,94,0.5);
          filter: drop-shadow(0 0 14px rgba(244,63,94,0.25));
          opacity: 1;
        }
        .pf-ring-1{ width: 86px; height: 86px; border-width: 3px; animation: pfRotateCW 8s linear infinite; }
        .pf-ring-2{ width: 114px; height: 114px; border-width: 2px; opacity:.7; animation: pfRotateCCW 12s linear infinite; }
        .pf-ring-3{ width: 142px; height: 142px; border-width: 1px; opacity:.5; animation: pfRotateCW 15s linear infinite; }

        @keyframes pfRotateCW{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pfRotateCCW{ from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }

        .pf-orb{
          width: 44px; height: 44px; border-radius: 999px;
          background: rgba(244,63,94,0.42);
          border: 2px solid rgba(244,63,94,0.7);
          box-shadow: 0 0 22px rgba(244,63,94,0.65);
          animation: pfOrbPulse 2.5s ease-in-out infinite;
          position: relative;
          z-index: 5;
        }
        .pf-orbGlow{
          position:absolute; width: 78px; height: 78px; border-radius:999px;
          background: radial-gradient(circle, rgba(244,63,94,0.22), rgba(0,0,0,0));
          filter: blur(10px);
          z-index: 1;
          animation: pfOrbGlow 2.5s ease-in-out infinite;
        }
        @keyframes pfOrbPulse{
          0%,100%{ transform: scale(1) }
          50%{ transform: scale(1.08) }
        }
        @keyframes pfOrbGlow{
          0%,100%{ transform: scale(1); opacity:.9 }
          50%{ transform: scale(1.12); opacity:.65 }
        }

        /* Progress fill smoothing */
        .pf-progressFill{
          transition: width 75ms linear;
          box-shadow: 0 0 16px rgba(244,63,94,0.22);
        }

        /* Checklist item */
        .pf-checkItem{
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          transform: translateX(-8px);
          opacity: 0;
          transition: opacity 500ms cubic-bezier(.2,.8,.2,1), transform 500ms cubic-bezier(.2,.8,.2,1);
        }
        .pf-checkItem.pf-visible{ opacity: 1; transform: translateX(0); }
        .pf-checkIcon{
          width: 26px; height: 26px; border-radius: 999px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(244,63,94,0.14);
          border: 1px solid rgba(244,63,94,0.20);
          color: rgba(244,63,94,1);
          box-shadow: 0 0 0 rgba(244,63,94,0.0);
          transition: all 260ms ease;
        }
        .pf-checkIcon.pf-done{
          background: rgba(244,63,94,1);
          border-color: rgba(244,63,94,1);
          color: white;
          animation: pfPop 380ms cubic-bezier(.2,.9,.2,1) both;
          box-shadow: 0 0 18px rgba(244,63,94,0.35);
        }
        @keyframes pfPop{
          0%{ transform: scale(0.9) }
          60%{ transform: scale(1.08) }
          100%{ transform: scale(1) }
        }

        /* Timeline */
        .pf-timelineGlow{
          position:absolute; inset:-140px;
          background:
            radial-gradient(circle at 50% 20%, rgba(244,63,94,0.20), rgba(0,0,0,0) 55%),
            radial-gradient(circle at 20% 70%, rgba(168,85,247,0.16), rgba(0,0,0,0) 55%),
            radial-gradient(circle at 80% 80%, rgba(244,63,94,0.10), rgba(0,0,0,0) 60%);
          filter: blur(16px);
        }

        .pf-spark{
          position:absolute;
          top: -10px;
          background: rgba(255,255,255,1);
          border-radius: 999px;
          animation-name: pfFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          box-shadow: 0 0 14px rgba(244,63,94,0.22);
        }
        @keyframes pfFall{
          0%{ transform: translateY(-10px) translateX(0); }
          100%{ transform: translateY(110vh) translateX(18px); }
        }

        .pf-holoCard{
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.35);
          padding: 14px 14px 16px;
          overflow:hidden;
        }
        .pf-holoHeader{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom: 10px;
          padding: 0 4px;
        }

        /* draw path */
        .pf-drawPath{
          stroke-dasharray: 420;
          stroke-dashoffset: 420;
          animation: pfDraw 1500ms ease-in-out forwards;
        }
        @keyframes pfDraw{
          to{ stroke-dashoffset: 0; }
        }

        .pf-nodePop{
          transform-origin: center;
          opacity: 0;
          animation: pfNode 520ms ease-out forwards;
        }
        @keyframes pfNode{
          0%{ opacity:0; transform: scale(0.0); }
          70%{ opacity:1; transform: scale(1.12); }
          100%{ opacity:1; transform: scale(1.0); }
        }

        .pf-nodeLabel{
          fill: rgba(255,255,255,0.75);
          font-size: 10px;
          font-weight: 600;
          opacity: 0;
          animation: pfLabel 1400ms ease-in-out forwards;
        }
        @keyframes pfLabel{
          0%{ opacity:0; transform: translateY(6px); }
          25%{ opacity:1; transform: translateY(0); }
          70%{ opacity:1; }
          100%{ opacity:0; }
        }

        /* rider dot (simple pulse) */
        .pf-riderDot{
          opacity: 0;
          animation: pfRider 2500ms ease-in-out forwards;
        }
        @keyframes pfRider{
          0%{ opacity:0; transform: scale(0.7); }
          20%{ opacity:1; transform: scale(1); }
          60%{ opacity:1; }
          100%{ opacity:1; }
        }

        .pf-miniMilestone{
          display:flex;
          gap:10px;
          align-items:flex-start;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          opacity: 0;
          transform: translateY(8px);
          animation: pfFadeMini 600ms cubic-bezier(.2,.8,.2,1) forwards;
        }
        @keyframes pfFadeMini{
          to{ opacity: 1; transform: translateY(0); }
        }
        .pf-miniDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 12px rgba(255,255,255,0.35);
          margin-top: 3px;
          flex: 0 0 auto;
        }

        /* CTA timeline */
        .pf-ctaTimeline{
          background: linear-gradient(90deg, rgba(244,63,94,1), rgba(244,63,94,0.82), rgba(168,85,247,0.85));
          box-shadow: 0 18px 50px rgba(244,63,94,0.22);
        }
      `}</style>
    </div>
  );
}

/* =========================
   Components
========================= */
function ChecklistItem({ text, visible, progress, done, delay }) {
  const dash = 100;
  const offset = dash * (1 - progress);

  return (
    <div
      className={`pf-checkItem ${visible ? "pf-visible" : ""}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {/* progress stroke (Swift progressLayer vibe) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="16"
          ry="16"
          fill="none"
          stroke="rgba(244,63,94,0.95)"
          strokeWidth="2"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 240ms ease-out",
            filter: "drop-shadow(0 0 10px rgba(244,63,94,0.25))",
          }}
        />
      </svg>

      <div className="relative z-10 flex items-center gap-4 px-5 py-[18px]">
        <div className={`pf-checkIcon ${done ? "pf-done" : ""}`}>
          {done ? <Check size={16} strokeWidth={3} /> : <span className="block w-[10px] h-[10px] rounded-full bg-rose-400/70" />}
        </div>
        <div className="text-[15px] font-medium text-white/90 leading-snug">
          {text}
        </div>
      </div>
    </div>
  );
}

function InsightRow({ icon, text, delay }) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
      style={{
        animation: "pfFadeIn 520ms cubic-bezier(.2,.8,.2,1) both",
        animationDelay: `${delay}s`,
      }}
    >
      <div className="bg-app-primary/20 p-2 rounded-full text-app-primary shrink-0">
        {icon}
      </div>
      <span className="text-sm text-white/90 font-medium leading-relaxed">
        {text}
      </span>
    </div>
  );
}
