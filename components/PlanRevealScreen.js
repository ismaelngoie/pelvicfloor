"use client";

import React, { useEffect, useMemo, useState } from "react";
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

// --- DATA: Options ---
const CONDITIONS = [
  { id: "pain", title: "Pelvic Pain", icon: <HeartHandshake size={28} /> },
  { id: "postpartum", title: "Postpartum Issues", icon: <Baby size={28} /> },
  { id: "leaks", title: "Urinary Incontinence", icon: <Droplets size={28} /> },
  { id: "prostate", title: "Prostate Issues", icon: <User size={28} /> },
];

const ACTIVITIES = [
  { id: "sedentary", title: "Sedentary", sub: "(mostly sitting)" },
  { id: "moderate", title: "Lightly Active", sub: "(daily walks)" },
  { id: "active", title: "Very Active", sub: "(regular workouts)" },
];

// --- THEME ---
const THEME = {
  activeBorder: "border-rose-500",
  activeBg: "bg-rose-50",
  activeText: "text-rose-500",
  glow: "shadow-rose-300/40",
  inactiveBorder: "border-gray-200",
  inactiveBg: "bg-white",
  inactiveText: "text-gray-500",
};

// --- HELPERS (Swift Logic) ---
const getPersonalizedCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": {
      title: `Designing your intimacy plan, ${safeName}`,
      subtitle: "Comfort, sensation, confidence—gently built for your body.",
      checklist: [
        "Comfort-first warmups",
        "Relax/contract patterns",
        "Tone for sensation",
        "Partner positions",
      ],
    },
    "Stop Bladder Leaks": {
      title: "Personalizing your leak-control plan",
      subtitle: "Train reflexes so sneezes and laughs don’t own your day.",
      checklist: [
        "Urge-delay reflex training",
        "Fast-twitch squeezes",
        "Breath + pressure control",
        "Run/jump confidence",
      ],
    },
    "Ease Pelvic Pain": {
      title: "Personalizing your pain-relief plan",
      subtitle: "Release tension, add support, and keep comfort front and center.",
      checklist: [
        "Down-train tight muscles",
        "Nerve-calming breath",
        "Gentle glute support",
        "Daily posture resets",
      ],
    },
    "Recover Postpartum": {
      title: "Personalizing your postpartum plan",
      subtitle: "Kind, steady rebuilding for your core, hips, and back.",
      checklist: [
        "Core connection breath",
        "Diastasis-safe moves",
        "Hip + back relief",
        "Lift-and-carry practice",
      ],
    },
    default: {
      title: `Personalizing your plan, ${safeName}`,
      subtitle: "Crafting your custom routine for strength and confidence.",
      checklist: ["Custom exercises", "Deep insights", "Expert tips", "Community support"],
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
    default: {
      headline: "Last step! Any health notes?",
      subtitle: "This ensures every exercise is safe and perfectly tailored to you.",
      cta: "Build My Custom Plan",
    },
  };
  return map[goal] || map.default;
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
        "With {activity}, we train quick squeezes you can use anywhere.",
        "At {age}, we blend long holds with fast pulses for real control.",
        "Plan respects {condition} while we rebuild trust.",
      ],
      cta: "Unlock My Leak-Free Plan",
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

// --- UI Helpers ---
const GradientText = ({ children, className = "" }) => (
  <span
    className={`bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent ${className}`}
    style={{ WebkitTextFillColor: "transparent" }}
  >
    {children}
  </span>
);

const CompactInsightList = ({ items }) => {
  return (
    <div className="w-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 max-[740px]:p-3">
      <div className="flex items-center gap-2 mb-3 max-[740px]:mb-2">
        <div className="bg-app-primary/20 p-2 max-[740px]:p-1.5 rounded-full text-app-primary">
          <Sparkles size={18} />
        </div>
        <p className="text-white font-bold text-[15px] max-[740px]:text-[14px]">
          Your Personal Insights
        </p>
      </div>

      <div className="space-y-2.5 max-[740px]:space-y-2">
        {items.map((t, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <div className="mt-[6px] w-2 h-2 rounded-full bg-app-primary/80 shrink-0" />
            <p className="text-white/90 text-[13px] leading-snug max-[740px]:text-[12.5px]">
              {t}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();

  // --- STATE ---
  const [phase, setPhase] = useState("health"); // 'health' -> 'analyzing' -> 'timeline'

  // Phase 1
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");

  // Phase 2
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Connecting to Coach Mia…");
  const [checklistVisible, setChecklistVisible] = useState(0);

  // Phase 3
  const [showTimeline, setShowTimeline] = useState(false);

  // Goal Data
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const healthText = getHealthCopy(goalTitle);
  const analysisCopy = getPersonalizedCopy(goalTitle, userDetails.name);

  // Stable particles (so it doesn’t jump on re-render)
  const particles = useMemo(() => {
    return [...Array(18)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      size: Math.random() > 0.7 ? 2 : 1,
      opacity: 0.12 + Math.random() * 0.18,
    }));
  }, []);

  // --- LOGIC: Phase 1 ---
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
    saveUserData("healthConditions", selectedConditions);
    saveUserData("activityLevel", activity);
    startAnalysis();
  };

  useEffect(() => {
    if (selectedConditions.length > 0 || isNone) {
      if (activity) {
        setHelperText("✓ Perfect, I'll match your pace & recovery.");
      } else {
        const goal = userDetails.selectedTarget?.title || "";
        if (goal.includes("Leak")) setHelperText("✓ Got it. I’ll train urge delay reflexes.");
        else if (goal.includes("Pain")) setHelperText("✓ Noted. We’ll protect sensitive ranges.");
        else setHelperText("✓ Understood. I'll tailor your plan accordingly.");
      }
    } else {
      setHelperText("");
    }
  }, [selectedConditions, isNone, activity, userDetails]);

  // --- LOGIC: Phase 2 ---
  const startAnalysis = () => {
    setPhase("analyzing");

    const TOTAL_DURATION = 7000;
    const intervalTime = 50;
    const steps = TOTAL_DURATION / intervalTime;
    let currentStep = 0;

    setProgress(0);
    setChecklistVisible(0);
    setAnalysisStatus("Connecting to Coach Mia…");

    const timer = setInterval(() => {
      currentStep++;
      const pct = Math.min(100, Math.round((currentStep / steps) * 100));
      setProgress(pct);

      if (pct === 25) setAnalysisStatus("Syncing your goals for real results...");
      if (pct === 45) setAnalysisStatus("Preparing exercises for fast relief...");

      if (pct > 50 && pct < 60) setChecklistVisible(1);
      if (pct > 65 && pct < 75) setChecklistVisible(2);
      if (pct > 80 && pct < 90) setChecklistVisible(3);
      if (pct > 95) setChecklistVisible(4);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setPhase("timeline");
          setTimeout(() => setShowTimeline(true), 80);
        }, 700);
      }
    }, intervalTime);
  };

  // --- LOGIC: Phase 3 Data ---
  const calculateBMI = () => {
    if (!userDetails.weight || !userDetails.height) return "22.5";
    const heightM = userDetails.height * 0.0254;
    const weightKg = userDetails.weight * 0.453592;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };

  const date = new Date();
  date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timelineCopy = getTimelineCopy(goalTitle);
  const timelineSubtitle = timelineCopy.subtitle.replace("{date}", dateString);

  const formattedInsights = timelineCopy.insights.map((t) =>
    t
      .replace("{bmi}", calculateBMI())
      .replace(
        "{activity}",
        activity ? ACTIVITIES.find((a) => a.id === activity)?.title.toLowerCase() : "active"
      )
      .replace("{age}", userDetails.age || "30")
      .replace("{condition}", selectedConditions.length > 0 ? "your unique needs" : "your body")
  );

  const canContinue =
    (isNone || selectedConditions.length > 0) && Boolean(activity);

  // --- FULLSCREEN PWA SHELL ---
  const bgClass = phase === "health" ? "bg-app-background" : "bg-slate-950";

  return (
    <div
      className={`relative w-full h-[100svh] overflow-hidden overscroll-none ${bgClass}`}
      style={{
        WebkitOverflowScrolling: "auto",
      }}
    >
      {/* Fixed full-viewport background so iOS PWA never shows white */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${bgClass}`} />
        {phase !== "health" && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(800px_600px_at_50%_20%,rgba(230,84,115,0.20),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_50%_85%,rgba(255,255,255,0.07),transparent_60%)]" />
          </>
        )}
      </div>

      {/* ---------------- PHASE 1: HEALTH (ONE SCREEN, NO SCROLL) ---------------- */}
      {phase === "health" && (
        <div
          className="
            w-full h-[100svh] flex flex-col
            px-5
            pt-[calc(env(safe-area-inset-top)+14px)]
            pb-[calc(env(safe-area-inset-bottom)+16px)]
          "
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[26px] max-[740px]:text-[24px] font-extrabold text-app-textPrimary leading-tight">
              {healthText.headline}
            </h1>
            <p className="mt-2 text-app-textSecondary text-[14px] max-[740px]:text-[13.5px] leading-snug">
              {healthText.subtitle}
            </p>
          </div>

          {/* Content (scaled down on short devices) */}
          <div className="flex-1 min-h-0 flex flex-col justify-center">
            <div className="origin-top max-[740px]:scale-[0.96] max-[700px]:scale-[0.92]">
              {/* Conditions */}
              <div className="mt-5 max-[740px]:mt-4">
                <div className="grid grid-cols-2 gap-3 max-[740px]:gap-2.5">
                  {CONDITIONS.map((c) => {
                    const active = selectedConditions.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCondition(c.id)}
                        className={`
                          relative flex flex-col items-center justify-center
                          rounded-[22px] border-[2px]
                          transition-all duration-300
                          h-[108px] max-[740px]:h-[100px]
                          px-3
                          ${active
                            ? `bg-white ${THEME.activeBorder} shadow-lg ${THEME.glow} scale-[1.02]`
                            : `bg-white ${THEME.inactiveBorder}`}
                          active:scale-95
                        `}
                      >
                        {active && (
                          <div
                            className={`absolute inset-0 rounded-[20px] ${THEME.activeBg} opacity-20 pointer-events-none`}
                          />
                        )}

                        <div
                          className={`mb-1.5 transition-colors duration-300 ${
                            active ? THEME.activeText : THEME.inactiveText
                          }`}
                        >
                          {c.icon}
                        </div>

                        <span
                          className={`text-[13px] max-[740px]:text-[12.5px] font-bold text-center leading-tight ${
                            active ? "text-app-textPrimary" : "text-gray-500"
                          }`}
                        >
                          {c.title}
                        </span>

                        {active && (
                          <div className={`absolute top-3 right-3 ${THEME.activeText}`}>
                            <CheckCircle2 size={20} className="fill-current text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* None */}
                <button
                  onClick={toggleNone}
                  className={`
                    mt-3 max-[740px]:mt-2.5
                    w-full h-11 max-[740px]:h-10
                    rounded-full border-[1.5px]
                    font-semibold text-[14px]
                    transition-all active:scale-95
                    ${isNone
                      ? `${THEME.activeBorder} ${THEME.activeText} ${THEME.activeBg} shadow-sm`
                      : `${THEME.inactiveBorder} ${THEME.inactiveText} bg-white`}
                  `}
                >
                  ✓ None of the above
                </button>
              </div>

              {/* Activity */}
              <div className="mt-5 max-[740px]:mt-4">
                <h3 className="text-[16px] max-[740px]:text-[15px] font-extrabold text-center text-app-textPrimary">
                  Your typical activity level
                </h3>

                <div className="mt-3 max-[740px]:mt-2.5 flex flex-col gap-2.5">
                  {ACTIVITIES.map((a) => {
                    const active = activity === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setActivity(a.id)}
                        className={`
                          w-full h-12 max-[740px]:h-11
                          rounded-[18px] border-[2px]
                          px-4 flex items-center justify-between
                          transition-all duration-300
                          relative overflow-hidden
                          ${active
                            ? `bg-white ${THEME.activeBorder} shadow-md ${THEME.glow} scale-[1.01]`
                            : `bg-white ${THEME.inactiveBorder}`}
                          active:scale-95
                        `}
                      >
                        {active && (
                          <div className={`absolute inset-0 ${THEME.activeBg} opacity-30 pointer-events-none`} />
                        )}

                        <span
                          className={`font-bold text-[14px] relative z-10 ${
                            active ? "text-app-textPrimary" : "text-gray-500"
                          }`}
                        >
                          {a.title}{" "}
                          <span className="font-normal opacity-70 text-[12.5px] ml-1">
                            {a.sub}
                          </span>
                        </span>

                        {active && (
                          <CheckCircle2
                            size={20}
                            className={`relative z-10 fill-current ${THEME.activeText} text-white`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Helper */}
                <div className="mt-2 h-6 flex items-center justify-center">
                  {helperText && (
                    <p className="text-rose-500 text-[13px] font-semibold animate-fade-in">
                      {helperText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA (still on same screen, safe-area aware) */}
          <button
            onClick={handleHealthContinue}
            disabled={!canContinue}
            className={`
              w-full h-14 max-[740px]:h-[52px]
              font-extrabold text-[16px] rounded-full
              transition-all duration-300
              shadow-xl
              ${canContinue
                ? "bg-app-primary text-white shadow-app-primary/30 active:scale-95"
                : "bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed shadow-none"}
            `}
          >
            {healthText.cta}
          </button>
        </div>
      )}

      {/* ---------------- PHASE 2: ANALYZING (UNCHANGED FLOW, BETTER TITLE) ---------------- */}
      {phase === "analyzing" && (
        <div
          className="
            w-full h-[100svh]
            flex flex-col items-center justify-center
            px-7
            pt-[calc(env(safe-area-inset-top)+18px)]
            pb-[calc(env(safe-area-inset-bottom)+18px)]
            text-white
            relative overflow-hidden
          "
        >
          {/* Ambient Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <div className="w-[520px] h-[520px] border border-app-primary/40 rounded-full animate-ping [animation-duration:3.2s]" />
            <div className="absolute w-[320px] h-[320px] border border-white/30 rounded-full animate-ping [animation-duration:4.2s]" />
          </div>

          {/* AI Core */}
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-app-primary/30 rounded-full animate-pulse blur-xl" />
            <div className="relative w-24 h-24 bg-gradient-to-tr from-app-primary to-rose-600 rounded-full shadow-2xl flex items-center justify-center animate-spin-slow">
              <Sparkles size={40} className="text-white" />
            </div>
          </div>

          {/* Title (upgraded typography) */}
          <h2 className="text-center mb-2 leading-tight">
            <GradientText className="text-[22px] max-[740px]:text-[21px] font-extrabold tracking-tight drop-shadow-[0_10px_30px_rgba(230,84,115,0.22)]">
              {analysisCopy.title}
            </GradientText>
          </h2>
          <p className="text-center text-white/70 text-[14px] max-[740px]:text-[13.5px] mb-7 max-w-sm">
            {analysisCopy.subtitle}
          </p>

          {/* Checklist */}
          <div className="w-full max-w-xs space-y-3.5 mb-auto">
            {analysisCopy.checklist.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3.5 transition-all duration-500
                  ${idx < checklistVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}
                `}
              >
                <div className="w-6 h-6 rounded-full bg-app-primary/90 flex items-center justify-center shrink-0 shadow-md shadow-app-primary/30">
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-[14px] font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="w-full mt-7">
            <div className="flex justify-between text-[12px] font-medium text-white/70 mb-2">
              <span className="truncate pr-3">{analysisStatus}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-app-primary transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 3: TIMELINE (ONE SCREEN, NO SCROLL) ---------------- */}
      {phase === "timeline" && (
        <div
          className={`
            w-full h-[100svh]
            flex flex-col
            px-5
            pt-[calc(env(safe-area-inset-top)+14px)]
            pb-[calc(env(safe-area-inset-bottom)+16px)]
            transition-opacity duration-700
            ${showTimeline ? "opacity-100" : "opacity-0"}
            relative overflow-hidden
          `}
        >
          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full bg-white animate-float"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  opacity: p.opacity,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="text-center relative z-10">
            <h1 className="text-[28px] max-[740px]:text-[26px] font-extrabold text-white leading-tight drop-shadow-xl">
              <span className="text-app-primary">{userDetails.name || "Your"}</span>{" "}
              path to
              <br />
              {goalTitle} is ready.
            </h1>
            <p className="mt-2 text-white/80 text-[14px] max-[740px]:text-[13.5px] leading-snug">
              {timelineSubtitle}
            </p>
          </div>

          {/* Content (scaled on short devices) */}
          <div className="flex-1 min-h-0 flex flex-col justify-center relative z-10">
            <div className="origin-top max-[740px]:scale-[0.96] max-[700px]:scale-[0.92]">
              {/* Chart */}
              <div className="w-full h-44 max-[740px]:h-40 relative mt-5 max-[740px]:mt-4">
                <svg
                  viewBox="0 0 300 150"
                  className="w-full h-full overflow-visible drop-shadow-[0_0_18px_rgba(230,84,115,0.55)]"
                >
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E65473" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#E65473" stopOpacity="1" />
                    </linearGradient>
                    <radialGradient id="glowDot" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="100%" stopColor="#E65473" stopOpacity="0.85" />
                    </radialGradient>
                  </defs>

                  <path
                    d="M 0,140 C 80,130 120,80 300,20"
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-draw-line"
                    strokeDasharray="400"
                    strokeDashoffset="400"
                  />

                  {/* Milestones */}
                  <circle cx="0" cy="140" r="4" fill="white" opacity="0.9" className="animate-fade-in delay-200" />
                  <text x="10" y="145" fill="white" fontSize="10" opacity="0.7">
                    Today
                  </text>

                  <circle cx="150" cy="80" r="4" fill="white" opacity="0.9" className="animate-fade-in delay-500" />
                  <text x="160" y="85" fill="white" fontSize="10" opacity="0.7">
                    Relief
                  </text>

                  <circle
                    cx="300"
                    cy="20"
                    r="7"
                    fill="url(#glowDot)"
                    stroke="white"
                    strokeWidth="2"
                    className="animate-fade-in delay-800"
                  />
                  <text x="232" y="16" fill="#E65473" fontSize="12" fontWeight="bold">
                    Goal Reached
                  </text>
                </svg>
              </div>

              {/* Insights (compressed so it fits) */}
              <div className="mt-5 max-[740px]:mt-4">
                <CompactInsightList items={formattedInsights} />
              </div>
            </div>
          </div>

          {/* Footer CTA (same screen, safe-area aware) */}
          <div className="relative z-10">
            <button
              onClick={onNext}
              className="
                w-full h-14 max-[740px]:h-[52px]
                bg-gradient-to-r from-app-primary to-rose-600
                text-white font-extrabold text-[16px]
                rounded-full
                shadow-lg shadow-app-primary/40
                flex items-center justify-center gap-2
                active:scale-95 transition-transform
              "
            >
              <Lock size={18} /> {timelineCopy.cta}
            </button>
            <p className="text-center text-white/40 text-[11px] mt-2">
              Secure checkout • 100% Money-back guarantee
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
