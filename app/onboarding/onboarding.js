"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/context/UserDataContext";
import {
  Baby,
  Activity,
  Zap,
  Droplets,
  HeartHandshake,
  Heart,
  Dumbbell,
  CheckCircle2,
  Circle,
  Leaf,
  Shield,
  PersonStanding,
  Sparkles,
  Move,
  Check,
  User,
  Brain,
  Timer,
  Play,
  Loader2,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ==========================================
// SCREEN 1: WELCOME SCREEN
// ==========================================

// --- CUSTOM ICONS ---
const RunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-app-primary"
  >
    <path d="M13.5 2c-1.1 0-2 .9-2 2s.9 2 2 2c1.11 0 2-.89 2-2s-.89-2-2-2zM19 6c0-1.66-1.34-3-3-3-1.25 0-2.3.8-2.77 1.91l-1.92 4.47-2.6-1.29.62-3.09c-.93-.25-1.91.13-2.42.92l-2.09 3.27c-.49.77-.28 1.8.49 2.29.77.49 1.8.28 2.29-.49l1.1-1.72.33 1.57L5 12v6c0 1.1.9 2 2 2s2-.9 2-2v-4.18l2.12.91 2.38 5.95c.33.83 1.28 1.24 2.11.91.83-.33 1.24-1.28.91-2.11L14.77 13l1.86-.92c.76-.38 1.37-1.34 1.37-2.18V6h1z" />
  </svg>
);

const VideoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-app-primary"
  >
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
  </svg>
);

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-app-primary"
  >
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
  </svg>
);

// --- DATA ---
const reviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

// --- FULL SCREEN BUTTERFLY BACKGROUND ---
const ButterflyBackground = () => {
  const [butterflies, setButterflies] = useState([]);

  useEffect(() => {
    const count = 25;
    const items = Array.from({ length: count }).map((_, i) => {
      const duration = 15 + Math.random() * 15;
      return {
        id: i,
        left: Math.random() * 100,
        size: 20 + Math.random() * 30,
        duration,
        delay: -(Math.random() * duration),
        rotation: (Math.random() - 0.5) * 60,
        isBehind: Math.random() > 0.6,
      };
    });
    setButterflies(items);
  }, []);

  const brandPinkFilter =
    "brightness(0) saturate(100%) invert(48%) sepia(91%) saturate(343%) hue-rotate(304deg) brightness(91%) contrast(96%)";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(110vh) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20vh) translateX(50px) rotate(20deg);
            opacity: 0;
          }
        }
      `}</style>

      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            top: "0",
            animation: `floatUp ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
            opacity: b.isBehind ? 0.3 : 0.7,
            filter: brandPinkFilter,
            transform: `rotate(${b.rotation}deg)`,
            zIndex: 0,
          }}
        >
          <img
            src="/butterfly_template.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
};

function WelcomeScreen({ onNext }) {
  const router = useRouter();
  const { userDetails } = useUserData();

  const [socialProofCount, setSocialProofCount] = useState(9800);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // --- 1. INSTANT REDIRECT CHECK (SPEED OPTIMIZED) ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedData = localStorage.getItem("pelvic_user_data");
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.isPremium === true) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (userDetails && userDetails.isPremium) {
      router.replace("/dashboard");
    } else {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [userDetails, router]);

  // Social Proof Counter
  useEffect(() => {
    if (!showContent) return;
    const finalValue = 10200;
    const duration = 2000;
    const steps = 60;
    const increment = (finalValue - 9800) / steps;
    let current = 9800;
    const timer = setInterval(() => {
      current += increment;
      if (current >= finalValue) {
        setSocialProofCount(finalValue);
        clearInterval(timer);
      } else {
        setSocialProofCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [showContent]);

  // Review Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!showContent && userDetails?.isPremium) return null;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-b from-pink-50/50 to-white">
      <ButterflyBackground />

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div
          className={`z-10 flex flex-col items-center px-6 pt-16 w-full transition-all duration-1000 ${
            showContent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/logo.png"
              width={80}
              height={80}
              alt="Logo"
              className="object-contain"
            />
          </div>

          <h1 className="text-[28px] font-extrabold text-app-textPrimary text-center mb-3 leading-tight">
            Pelvic Floor Strengthening
            <br />
            <span className="text-[24px]">5-Minute Daily Home Plan</span>
          </h1>

          <p className="text-app-textSecondary text-center mb-8 text-[16px] max-w-xs leading-relaxed">
            Stop bladder leaks, heal prolapse, and improve intimacy.
          </p>

          {/* Benefits List */}
          <div className="flex flex-col gap-6 w-full max-w-xs items-start pl-2 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-1">
                <RunIcon />
              </div>
              <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">
                A new 5-minute plan, just for you, every day.
              </span>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-1">
                <VideoIcon />
              </div>
              <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">
                300+ physio-approved videos for total wellness.
              </span>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-1">
                <ChatIcon />
              </div>
              <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">
                Chat with your AI Coach, Mia™, 24/7.
              </span>
            </div>
          </div>

          <div className="h-8" />
        </div>
      </div>

      {/* Sticky bottom */}
      <div
        className={`w-full px-8 pb-8 flex flex-col gap-4 items-center z-30 transition-all duration-1000 delay-300 ${
          showContent
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        {/* Review Ticker */}
        <div className="h-14 overflow-hidden w-full relative">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="absolute w-full text-center transition-all duration-500 ease-out flex flex-col items-center justify-center h-full"
              style={{
                transform: `translateY(${(index - currentReviewIndex) * 100}%)`,
                opacity: index === currentReviewIndex ? 1 : 0,
              }}
            >
              <p className="text-[15px] text-app-textPrimary/90 italic leading-snug">
                “{review.text}” <br />
                <span className="font-bold not-italic text-sm text-app-textPrimary">
                  – {review.author}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* Button */}
        <button
          onClick={onNext}
          className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-xl shadow-app-primary/30 animate-breathe active:scale-95 transition-transform relative z-40"
        >
          Start Strengthening My Pelvic Floor
        </button>

        <p className="text-app-textSecondary text-[13px] font-medium">
          Join {socialProofCount.toLocaleString()}+ women strengthening their
          pelvic floor.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 2: SELECT GOAL SCREEN
// ==========================================

const THEME_GOAL = {
  unselected: "bg-white border-gray-200",
  textUnselected: "text-slate-900",
  selected:
    "bg-white border-rose-500 shadow-xl shadow-rose-200 scale-[1.05] z-50",
  textSelected: "text-rose-600",
  iconUnselected: "text-rose-500",
  iconSelected: "text-rose-600 scale-110 drop-shadow-sm",
};

const goals = [
  { id: "intimacy", title: "Improve Intimacy", icon: <Heart size={28} strokeWidth={2} /> },
  { id: "leaks", title: "Stop Bladder Leaks", icon: <Droplets size={28} strokeWidth={2} /> },
  { id: "pregnancy", title: "Prepare for Pregnancy", icon: <Baby size={28} strokeWidth={2} /> },
  { id: "postpartum", title: "Recover Postpartum", icon: <Activity size={28} strokeWidth={2} /> },
  { id: "core", title: "Build Core Strength", icon: <Zap size={28} strokeWidth={2} /> },
  { id: "pain", title: "Ease Pelvic Pain", icon: <HeartHandshake size={28} strokeWidth={2} /> },
  { id: "fitness", title: "Support My Fitness", icon: <Dumbbell size={28} strokeWidth={2} /> },
  { id: "stability", title: "Boost Stability", icon: <Activity size={28} strokeWidth={2} /> },
];

function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(
    userDetails.selectedTarget?.id || null
  );

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData("selectedTarget", goal);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-white/50">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-rose-100 rounded-full blur-[80px]" />
      </div>

      {/* Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-8 pb-6 z-10">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-[26px] font-extrabold text-center text-app-textPrimary mb-1 leading-tight">
            Let's set your primary goal.
          </h1>
          <p className="text-center text-app-textSecondary text-[14px] leading-snug px-4 font-medium">
            This shapes your custom pelvic strengthening plan.
          </p>
        </div>

        {/* Grid */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-md">
            <div className="grid grid-cols-2 gap-3">
              {goals.map((goal) => {
                const isSelected = selectedId === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => handleSelect(goal)}
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-[24px] border-[2px] 
                      transition-all duration-300 ease-out h-[100px] w-full outline-none active:scale-95
                      ${isSelected ? THEME_GOAL.selected : `${THEME_GOAL.unselected} hover:bg-gray-50 z-10`}
                    `}
                  >
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <CheckCircle2 size={20} className="fill-rose-500 text-white" />
                      ) : (
                        <Circle size={20} className="text-gray-200" strokeWidth={1.5} />
                      )}
                    </div>

                    <div
                      className={`mb-2 transition-all duration-300 ${
                        isSelected
                          ? THEME_GOAL.iconSelected
                          : THEME_GOAL.iconUnselected
                      }`}
                    >
                      {goal.icon}
                    </div>

                    <span
                      className={`text-[13px] font-bold text-center leading-tight transition-colors duration-300 ${
                        isSelected
                          ? THEME_GOAL.textSelected
                          : THEME_GOAL.textUnselected
                      }`}
                    >
                      {goal.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer CTA */}
      <div className="shrink-0 z-20 px-5 pb-6">
        <button
          onClick={onNext}
          disabled={!selectedId}
          className={`w-full h-14 font-bold text-[18px] rounded-full transition-all duration-300 shadow-xl
            ${
              selectedId
                ? "bg-app-primary text-white shadow-app-primary/30 animate-breathe active:scale-95 transform"
                : "bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed shadow-none"
            }
          `}
        >
          Set My Goal
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 3: HOW IT HELPS SCREEN
// ==========================================

function BabyIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M10 16c.5.5 1.5.5 2 0" />
      <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
    </svg>
  );
}

const benefitsData = {
  "Prepare for Pregnancy": {
    subtitle:
      "Your plan will build a strong, supportive foundation for a healthy pregnancy and smoother recovery.",
    icon: <BabyIcon size={40} />,
    benefits: [
      { icon: <Leaf size={20} />, text: "Gentle prep for birth" },
      { icon: <Heart size={20} />, text: "Pelvic floor ready" },
      { icon: <Dumbbell size={20} />, text: "Core strong for birth" },
      { icon: <PersonStanding size={20} />, text: "Support your bump" },
      { icon: <Move size={20} />, text: "Ease back and hips" },
      { icon: <Sparkles size={20} />, text: "Calm body, calm mind" },
    ],
  },
  "Recover Postpartum": {
    subtitle:
      "Your plan is designed to safely rebuild your foundation and restore your core after pregnancy.",
    icon: <Heart size={40} />,
    benefits: [
      { icon: <Heart size={20} />, text: "Pelvic floor restored" },
      { icon: <Activity size={20} />, text: "Core reconnected" },
      { icon: <Shield size={20} />, text: "Gentle, safe progress" },
      { icon: <PersonStanding size={20} />, text: "Lift baby with ease" },
      { icon: <Move size={20} />, text: "Back feels supported" },
      { icon: <Leaf size={20} />, text: "C-section friendly" },
    ],
  },
  "Build Core Strength": {
    subtitle:
      "Your plan focuses on building deep, functional strength for better posture, power, and stability.",
    icon: <Zap size={40} />,
    benefits: [
      { icon: <Zap size={20} />, text: "Stronger, deeper core" },
      { icon: <Dumbbell size={20} />, text: "Confident lifts" },
      { icon: <Activity size={20} />, text: "Run tall, run free" },
      { icon: <PersonStanding size={20} />, text: "Posture that holds" },
      { icon: <Shield size={20} />, text: "Injury risk reduced" },
      { icon: <Leaf size={20} />, text: "Deeper core breath" },
    ],
  },
  "Stop Bladder Leaks": {
    subtitle:
      "Your plan focuses on building a reliable 'leakproof seal' for total confidence in your daily life.",
    icon: <Shield size={40} />,
    benefits: [
      { icon: <Droplets size={20} />, text: "Sneeze without worry" },
      { icon: <Activity size={20} />, text: "Run and jump freely" },
      { icon: <Leaf size={20} />, text: "Drier nights" },
      { icon: <Zap size={20} />, text: "Urgency under control" },
      { icon: <Dumbbell size={20} />, text: "Confident workouts" },
      { icon: <CheckCircle2 size={20} />, text: "Leave pads behind" },
    ],
  },
  "Ease Pelvic Pain": {
    subtitle:
      "Your plan focuses on gentle release and building supportive strength to bring you lasting relief.",
    icon: <Leaf size={40} />,
    benefits: [
      { icon: <PersonStanding size={20} />, text: "Pain-free sitting" },
      { icon: <Move size={20} />, text: "Comfort in movement" },
      { icon: <Leaf size={20} />, text: "Sleep through night" },
      { icon: <Sparkles size={20} />, text: "Gentle daily relief" },
      { icon: <Heart size={20} />, text: "Enjoy intimacy again" },
      { icon: <Zap size={20} />, text: "Release deep tension" },
    ],
  },
  "Improve Intimacy": {
    subtitle:
      "Your plan focuses on enhancing sensation, comfort, and confidence for a more fulfilling intimate life.",
    icon: <Heart size={40} />,
    benefits: [
      { icon: <Heart size={20} />, text: "More sensation" },
      { icon: <Sparkles size={20} />, text: "Stronger orgasms" },
      { icon: <Leaf size={20} />, text: "Comfort in intimacy" },
      { icon: <PersonStanding size={20} />, text: "Confidence returns" },
      { icon: <Activity size={20} />, text: "Feel close again" },
      { icon: <Zap size={20} />, text: "Pelvic tone improved" },
    ],
  },
  "Support My Fitness": {
    subtitle:
      "Your plan will build the foundational core strength that powers all your other athletic goals.",
    icon: <Dumbbell size={40} />,
    benefits: [
      { icon: <Move size={20} />, text: "Stronger every day" },
      { icon: <Dumbbell size={20} />, text: "Safe, guided workouts" },
      { icon: <Activity size={20} />, text: "Cardio, core, control" },
      { icon: <Zap size={20} />, text: "Progress you can feel" },
      { icon: <Leaf size={20} />, text: "5-min plan, daily" },
      { icon: <PersonStanding size={20} />, text: "Move with confidence" },
    ],
  },
  "Boost Stability": {
    subtitle:
      "Your plan focuses on creating a stable, balanced core for effortless posture and confident movement.",
    icon: <PersonStanding size={40} />,
    benefits: [
      { icon: <PersonStanding size={20} />, text: "Balanced, stable core" },
      { icon: <Activity size={20} />, text: "Steady on your feet" },
      { icon: <Move size={20} />, text: "Walk tall, no wobble" },
      { icon: <Shield size={20} />, text: "Back feels supported" },
      { icon: <Dumbbell size={20} />, text: "Stronger hips, knees" },
      { icon: <Zap size={20} />, text: "Stable side to side" },
    ],
  },
};

function HowItHelpsScreen({ onNext }) {
  const { userDetails } = useUserData();
  const [animate, setAnimate] = useState(false);

  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const data = benefitsData[goalTitle] || benefitsData["Build Core Strength"];

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-app-background">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl -z-10" />

      {/* Scrollable middle */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pt-12 px-4 pb-8">
        {/* Header */}
        <div className="z-10 text-center mb-4">
          <h1 className="text-3xl font-bold text-app-textPrimary mb-4 leading-tight animate-slide-up">
            Here's how we'll <br />
            <span className="text-app-primary">{goalTitle}</span>
          </h1>
          <p
            className="text-app-textSecondary text-[16px] leading-relaxed px-4 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {data.subtitle}
          </p>
        </div>

        {/* Constellation */}
        <div className="w-full relative flex items-center justify-center min-h-[380px]">
          <div
            className={`absolute z-20 bg-white p-6 rounded-full shadow-xl shadow-app-primary/15 text-app-primary border border-app-borderIdle transition-all duration-700 ${
              animate ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
          >
            {data.icon}
          </div>

          {data.benefits.map((benefit, index) => {
            const total = data.benefits.length;
            const radius = 135;
            const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <React.Fragment key={index}>
                <svg
                  className="absolute top-1/2 left-1/2 pointer-events-none overflow-visible -z-10"
                  style={{ width: "0px", height: "0px" }}
                >
                  <line
                    x1="0"
                    y1="0"
                    x2={x}
                    y2={y}
                    stroke="#EBEBF0"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className={`transition-all duration-1000 ease-out ${
                      animate ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDelay: `${0.3 + index * 0.1}s` }}
                  />
                </svg>

                <div
                  className="absolute flex flex-col items-center gap-1.5 transition-all duration-500"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    opacity: animate ? 1 : 0,
                    transitionDelay: `${0.5 + index * 0.1}s`,
                    width: "90px",
                  }}
                >
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-app-borderIdle text-app-primary">
                    {benefit.icon}
                  </div>
                  <span className="text-[11px] font-bold text-center text-app-textPrimary leading-tight bg-app-background/80 backdrop-blur-sm px-1 rounded">
                    {benefit.text}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="h-4" />
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 z-20 px-4 pb-6">
        <button
          onClick={onNext}
          className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-500 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/30 active:scale-95 transition-transform animate-fade-in"
          style={{ animationDelay: "1.2s" }}
        >
          Next: Personalize My Plan
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 4: PERSONAL INTAKE SCREEN
// ==========================================

const MIA_COPY = {
  "Prepare for Pregnancy": {
    ack: "Beautiful choice, {name}. We will gently prepare your pelvic floor and core so you feel supported every step of pregnancy.",
    age: "At {age}, we focus on calm breath, steady endurance, and safe strength so your body feels ready and held.",
    weight: "Thanks. I will set positions and resistance that feel doable today and build quietly each week.",
    height: "Got it. Your height helps me cue stance and reach so form feels natural from day one.",
  },
  "Recover Postpartum": {
    ack: "I have you, {name}. We will rebuild your foundation with kindness and bring your core and confidence back.",
    age: "At {age}, I pace recovery for connection over intensity so healing feels steady and real.",
    weight: "Thank you. I will scale loads and positions so holding and lifting your little one feels safe again.",
    height: "Noted. Your height lets me fine tune carry, lift, and reach so your body feels supported.",
  },
  "Build Core Strength": {
    ack: "Love it, {name}. We will build a deep, steady core that supports every move you make.",
    age: "At {age}, we sharpen activation and use smart progressions so strength grows without strain.",
    weight: "Thanks. I will use this to set starting loads so work feels strong, not stressful.",
    height: "Great. Your height helps me dial plank angles, hinge depth, and reach for clean form.",
  },
  "Stop Bladder Leaks": {
    ack: "On it, {name}. We will train control so sneezes, laughs, and runs stop owning your day.",
    age: "At {age}, we blend endurance with quick contractions so real life control shows up when you need it.",
    weight: "Thank you. I will scale impact and pressure so you stay dry while you move.",
    height: "Noted. Your height guides setup so alignment and breath cues land perfectly.",
  },
  "Ease Pelvic Pain": {
    ack: "I am with you, {name}. We will release what is tight and strengthen what supports, gently and steadily.",
    age: "At {age}, we favor calming patterns and gradual load so relief lasts beyond the session.",
    weight: "Thanks. I will choose positions that lower strain and invite real ease.",
    height: "Got it. Your height helps me fine tune angles so sitting, standing, and walking feel softer.",
  },
  "Improve Intimacy": {
    ack: "Let’s make this feel good again, {name}. We will build comfort, confidence, and sensation at your pace.",
    age: "At {age}, I balance relaxation and activation to support arousal and more reliable orgasms.",
    weight: "Thank you. I will set intensities that build tone without bracing for better blood flow and sensation.",
    height: "Noted. I will cue supportive positions and angles so comfort stays high and climax is not cut short by tension.",
  },
  "Support My Fitness": {
    ack: "Nice, {name}. We will turn your core into a quiet engine that powers every workout.",
    age: "At {age}, we pair stability with power so lifts and cardio feel solid and repeatable.",
    weight: "Thanks. I will set loads and tempos that build performance without extra fatigue.",
    height: "Great. Your height lets me tune stance and range so reps feel clean and strong.",
  },
  "Boost Stability": {
    ack: "Excellent, {name}. We will stack you tall and steady so your body feels organized again.",
    age: "At {age}, we train deep core timing and endurance for all day support, not just during workouts.",
    weight: "Thank you. I will set progressions that protect your back while strength builds.",
    height: "Noted. Your height guides stance and reach so alignment clicks quickly and stays with you.",
  },
  default: {
    ack: "Excellent choice, {name}. We will stack you tall and steady.",
    age: "At {age}, we train deep core timing for all-day support.",
    weight: "Thank you. I will set progressions that protect your back.",
    height: "Noted. Your height guides stance so alignment clicks quickly.",
  },
};

const TypingIndicator = () => (
  <div className="flex space-x-1.5 p-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
  </div>
);

const ChatBubble = ({
  text,
  isTyping,
  isUser,
}) => (
  <div
    className={`flex w-full mb-6 animate-fade-in-up ${
      isUser ? "justify-end" : "justify-start"
    }`}
  >
    {!isUser && (
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 mr-3 mt-auto">
        <img
          src="/coachMiaAvatar.png"
          alt="Mia"
          className="w-full h-full object-cover"
        />
      </div>
    )}

    <div
      className={`px-5 py-3.5 shadow-sm max-w-[85%] text-[16px] leading-relaxed font-medium
      ${
        isUser
          ? "bg-app-primary text-white rounded-2xl rounded-br-none"
          : "bg-white border border-app-borderIdle text-app-textPrimary rounded-2xl rounded-bl-none"
      }
    `}
    >
      {isTyping ? <TypingIndicator /> : text}
    </div>
  </div>
);

const WheelPicker = ({
  range,
  value,
  onChange,
  unit,
  formatLabel,
}) => {
  const scrollerRef = useRef(null);
  const ITEM_HEIGHT = 54;

  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const scrollY = scrollerRef.current.scrollTop;
    const centerIndex = Math.round(scrollY / ITEM_HEIGHT);
    const newValue = range[centerIndex];

    if (newValue !== undefined && newValue !== value) {
      onChange(newValue);
    }
  };

  useEffect(() => {
    if (scrollerRef.current) {
      const index = range.indexOf(value);
      if (index !== -1) {
        scrollerRef.current.scrollTo({
          top: index * ITEM_HEIGHT,
          behavior: "auto",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-[220px] w-full max-w-[320px] mx-auto overflow-hidden mt-2">
      <div className="absolute top-1/2 left-0 w-full h-[54px] -translate-y-1/2 border-t-2 border-b-2 border-app-primary/10 bg-app-primary/5 pointer-events-none z-10" />

      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-white via-white/90 to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-t from-white via-white/90 to-transparent z-20 pointer-events-none" />

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[83px]"
      >
        {range.map((num) => (
          <div
            key={num}
            className={`h-[54px] flex items-center justify-center snap-center transition-all duration-200 
              ${
                num === value
                  ? "scale-110 font-bold text-app-primary text-2xl"
                  : "scale-90 text-app-textSecondary/40 text-xl"
              }`}
          >
            {formatLabel ? formatLabel(num) : num}
            {unit && (
              <span className="text-sm ml-1.5 mt-1 font-medium text-app-textSecondary/60">
                {unit}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function PersonalIntakeScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [step, setStep] = useState("name");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const chatBottomRef = useRef(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(65);

  const goalTitle =
    userDetails.selectedTarget?.title || "Build Core Strength";
  const copy =
    MIA_COPY[goalTitle] || MIA_COPY["Boost Stability"] || MIA_COPY["default"];

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const addMessage = (text, sender, delay = 0) => {
    if (sender === "mia") setIsTyping(true);

    setTimeout(() => {
      if (sender === "mia") setIsTyping(false);
      setHistory((prev) => [...prev, { text, sender }]);
      scrollToBottom();
    }, delay);
  };

  useEffect(() => {
    addMessage(
      "Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?",
      "mia",
      600
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (isTyping) return;

    if (step === "name") {
      if (name.length < 2) return;
      saveUserData("name", name);
      addMessage(name, "user");

      const nextText =
        copy.ack.replace("{name}", name) + " To start, what's your age?";
      addMessage(nextText, "mia", 1000);
      setStep("age");
    } else if (step === "age") {
      saveUserData("age", age);
      addMessage(`${age}`, "user");

      const nextText =
        copy.age.replace("{age}", age) + " Now, what's your current weight?";
      addMessage(nextText, "mia", 1000);
      setStep("weight");
    } else if (step === "weight") {
      saveUserData("weight", weight);
      addMessage(`${weight} lbs`, "user");

      const nextText = copy.weight + " And what's your height?";
      addMessage(nextText, "mia", 1200);
      setStep("height");
    } else if (step === "height") {
      saveUserData("height", height);
      const feet = Math.floor(height / 12);
      const inches = height % 12;
      addMessage(`${feet}'${inches}"`, "user");

      setTimeout(() => {
        onNext();
      }, 800);
    }
  };

  const renderInput = () => {
    if (isTyping)
      return (
        <div className="h-[220px] flex items-center justify-center text-app-textSecondary/50 text-sm animate-pulse">
          Mia is thinking...
        </div>
      );

    switch (step) {
      case "name":
        return (
          <div className="w-full animate-slide-up py-10">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name..."
              className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-app-borderIdle focus:border-app-primary outline-none py-3 text-app-textPrimary placeholder:text-app-textSecondary/30"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
            />
          </div>
        );
      case "age":
        return (
          <WheelPicker
            range={Array.from({ length: 80 }, (_, i) => i + 16)}
            value={age}
            onChange={setAge}
            unit="years old"
          />
        );
      case "weight":
        return (
          <WheelPicker
            range={Array.from({ length: 300 }, (_, i) => i + 80)}
            value={weight}
            onChange={setWeight}
            unit="lbs"
          />
        );
      case "height":
        return (
          <WheelPicker
            range={Array.from({ length: 40 }, (_, i) => i + 48)}
            value={height}
            onChange={setHeight}
            formatLabel={(val) => `${Math.floor(val / 12)}'${val % 12}"`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-app-background relative overflow-hidden">
      {/* Chat History Area */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pt-8 pb-4 flex flex-col">
        {history.map((msg, index) => (
          <ChatBubble
            key={index}
            text={msg.text}
            isTyping={false}
            isUser={msg.sender === "user"}
          />
        ))}

        {isTyping && <ChatBubble isTyping={true} isUser={false} />}

        <div ref={chatBottomRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="w-full bg-white rounded-t-[35px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 pb-10 z-20">
        <div className="mb-6">{renderInput()}</div>

        <button
          onClick={handleNext}
          disabled={isTyping || (step === "name" && name.length < 2)}
          className={`w-full h-14 font-bold text-lg rounded-full shadow-xl transition-all duration-300
            ${
              isTyping || (step === "name" && name.length < 2)
                ? "bg-app-borderIdle text-app-textSecondary cursor-not-allowed opacity-50 shadow-none"
                : "bg-app-primary text-white shadow-app-primary/30 active:scale-95 animate-breathe"
            }
          `}
        >
          {step === "height" ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 5: PLAN REVEAL SCREEN
// ==========================================

// (Everything below is your same logic/UI; only the desktop shell changed later.)

const THEME_REVEAL = {
  bg: "bg-app-background",
  text: "text-slate-900",

  textPrimary: "text-slate-900",
  textSecondary: "text-slate-500",

  unselected: "bg-white border-gray-200 shadow-sm",
  selected:
    "bg-white border-[#E65473] shadow-xl shadow-pink-200/50 scale-[1.02] z-20",

  textUnselected: "text-slate-900",
  textSelected: "text-[#E65473]",

  iconUnselected: "text-[#E65473] opacity-80",
  iconSelected: "text-[#E65473] scale-110",

  helper: "text-[#33B373]",
  brandGradient: "from-[#E65473] to-[#C23A5B]",
};

const CONDITIONS = [
  { id: "pain", title: "Pelvic Pain", icon: <HeartHandshake size={26} /> },
  { id: "postpartum", title: "Postpartum", icon: <Baby size={26} /> },
  { id: "leaks", title: "Incontinence", icon: <Droplets size={26} /> },
  { id: "prostate", title: "Prostate", icon: <User size={26} /> },
];

const ACTIVITIES = [
  { id: "sedentary", title: "Sedentary", sub: "(mostly sitting)" },
  { id: "moderate", title: "Lightly Active", sub: "(daily walks)" },
  { id: "active", title: "Very Active", sub: "(regular workouts)" },
];

const PersonalizingConstants = {
  totalDuration: 7000,
  phase1Scale: 0.25,
  phase2Scale: 0.2,
};

const usePlanRevealChrome = (enabled, color = "#000000") => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Desktop should not mutate global chrome; keep it scoped to mobile.
    if (window.matchMedia("(min-width: 768px)").matches) return;

    let meta = document.querySelector('meta[name="theme-color"]');
    let created = false;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
      created = true;
    }

    const prevTheme = meta.getAttribute("content");
    meta.setAttribute("content", color);

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    html.style.backgroundColor = color;
    body.style.backgroundColor = color;

    return () => {
      if (created) meta.remove();
      else if (prevTheme) meta.setAttribute("content", prevTheme);

      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [enabled, color]);
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
    "Boost Stability": {
      headline: "Any health notes before we boost stability?",
      subtitle: "I’ll align mobility + deep core for posture wins.",
      cta: "Build My Stability Plan",
    },
    default: {
      headline: "Last step! Any health notes?",
      subtitle:
        "This ensures every exercise is safe and perfectly tailored to you.",
      cta: "Build My Custom Plan",
    },
  };
  return map[goal] || map.default;
};

const getHelperCopy = (selected, goal) => {
  if (selected) {
    if (goal.includes("Leak"))
      return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
    if (goal.includes("Pain"))
      return "✓ Noted. We’ll protect sensitive ranges and release tension first.";
    if (goal.includes("Intimacy"))
      return "✓ Noted. I’ll focus on comfort, arousal flow, and pelvic tone.";
    if (goal.includes("Postpartum"))
      return "✓ Noted. We’ll keep it postpartum-safe with gentle progressions.";
    if (goal.includes("Pregnancy"))
      return "✓ Noted. I’ll prioritize breath, circulation, and foundation.";
    if (goal.includes("Core")) return "✓ Noted. Smart progressions, no risky strain.";
    if (goal.includes("Fitness")) return "✓ Noted. I’ll match your training load and recovery.";
    if (goal.includes("Stability")) return "✓ Noted. Deep core + alignment for steady posture wins.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    if (goal.includes("Leak")) return "✓ Great. We’ll start with core reflexes for leak control.";
    if (goal.includes("Pain")) return "✓ Great. Gentle release + support from day one.";
    if (goal.includes("Intimacy")) return "✓ Great. Comfort, sensation, and confidence from the start.";
    if (goal.includes("Postpartum")) return "✓ Great. Foundation work, safe and steady.";
    if (goal.includes("Pregnancy")) return "✓ Great. Building a strong, calm base for you.";
    if (goal.includes("Core")) return "✓ Great. Clean technique and deep core activation.";
    if (goal.includes("Fitness")) return "✓ Great. We’ll slot in perfectly with your routine.";
    if (goal.includes("Stability")) return "✓ Great. Alignment + deep core integration ahead.";
    return "✓ Great! We'll start with a foundational plan.";
  }
};

const getPersonalizingCopy = (goal, name) => {
  const map = {
    "Improve Intimacy": {
      title: `Designing your intimacy plan`,
      subtitle: "Comfort, sensation, confidence—gently built for your body.",
      connecting: "Checking your profile for arousal flow and comfort…",
      calibrating: "Balancing relax/contract patterns for stronger orgasms…",
      checklist: [
        "Comfort-first warmups",
        "Relax/contract patterns",
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
    "Boost Stability": {
      title: "Personalizing your stability plan",
      subtitle: "Tall, steady, and organized all day.",
      connecting: "Stacking rib-to-pelvis alignment…",
      calibrating: "Endurance for postural muscles…",
      checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"],
    },
    default: {
      title: `Personalizing your plan`,
      subtitle: "Tall, steady, and organized all day.",
      connecting: "Stacking rib-to-pelvis alignment…",
      calibrating: "Endurance for postural muscles…",
      checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"],
    },
  };
  return map[goal] || map.default;
};

const getTimelineCopy = (goal) => {
  const map = {
    "Prepare for Pregnancy": {
      subtitle: "Feel ready to carry and move with ease by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**) so joints and pelvic floor stay happy.",
        "Because you’re **{activity}**, sessions are short, steady, and stick.",
        "At **{age}**, we train calm breath and deep core for a growing belly.",
        "Safe for **{condition}** with low-pressure positions.",
      ],
      cta: "Unlock My Pregnancy Prep",
    },
    "Recover Postpartum": {
      subtitle: "Feel steady holding your baby again by **{date}**.",
      insights: [
        "Calibrated for your body (BMI **{bmi}**) to protect healing tissue.",
        "Matched to **{activity}**—works on low-sleep days.",
        "At **{age}**, we rebuild core connection so feeds, lifts, and stroller walks feel easier.",
        "Adjusted for **{condition}** including scar or tender areas.",
      ],
      cta: "Unlock My Postpartum Plan",
    },
    "Build Core Strength": {
      subtitle: "Feel solid through your middle by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**)—strong, not stressful.",
        "Because you’re **{activity}**, sessions slot right into your day.",
        "At **{age}**, we focus on clean form and deep bracing you can feel.",
        "Respects **{condition}** with safe ranges.",
      ],
      cta: "Unlock My Core Plan",
    },
    "Stop Bladder Leaks": {
      subtitle: "Confident coughs, laughs, and workouts by **{date}**.",
      insights: [
        "Tuned to your body (BMI **{bmi}**) to manage pressure.",
        "With **{activity}**, we train quick squeezes and urge delay you can use anywhere.",
        "At **{age}**, we blend long holds with fast pulses for real control.",
        "Plan respects **{condition}** while we rebuild trust.",
      ],
      cta: "Unlock My Leak-Free Plan",
    },
    "Ease Pelvic Pain": {
      subtitle: "Less ache sitting, standing, and at bedtime by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**) to lower strain.",
        "**{activity}** friendly—start quiet, calm the system first.",
        "At **{age}**, we pair soft release with light strength that lasts.",
        "Guided by **{condition}** so every range feels safe.",
      ],
      cta: "Unlock My Pain Relief Plan",
    },
    "Improve Intimacy": {
      subtitle: "More arousal, easy comfort, and reliable orgasm by **{date}**.",
      insights: [
        "Paced for your body (BMI **{bmi}**) to boost blood flow without pressure.",
        "With **{activity}**, we build relaxed release *and* strong tone for better sensation.",
        "At **{age}**, we tune reflexes so arousal starts sooner and orgasm lands stronger.",
        "Positions and pacing adjusted for **{condition}** so comfort stays high.",
      ],
      cta: "Unlock My Intimacy Plan",
    },
    "Support My Fitness": {
      subtitle: "More power in lifts, runs, and classes by **{date}**.",
      insights: [
        "Calibrated for your body (BMI **{bmi}**) so intensity helps, not hurts.",
        "Synced to **{activity}**—easy to stack with training.",
        "At **{age}**, we pair stability with power you feel next workout.",
        "Safeguards in place for **{condition}**.",
      ],
      cta: "Unlock My Fitness Plan",
    },
    "Boost Stability": {
      subtitle: "Feel taller and steady from desk to steps by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**)—steady holds you can keep all day.",
        "Because you’re **{activity}**, we target sitting time, walks, and carrying.",
        "At **{age}**, we train deep timing so standing and stairs feel smooth.",
        "Aligned with **{condition}**—easy on back, hips, and neck.",
      ],
      cta: "Unlock My Stability Plan",
    },
    default: {
      subtitle: "Your personalized plan is set. Expect to feel a real difference by **{date}**.",
      insights: [
        "Your plan is calibrated for a BMI of **{bmi}**, ensuring perfect intensity.",
        "Because you have a **{activity}** activity level, we'll build your foundation safely.",
        "At **{age} years old**, your plan focuses on neuro-muscular connection.",
        "We've modified your plan to be safe and effective for your **{condition}**.",
      ],
      cta: "Unlock My Personal Plan",
    },
  };
  return map[goal] || map.default;
};

const AICoreView = () => (
  <div className="relative w-40 h-40 flex items-center justify-center">
    <div className="absolute w-[80px] h-[80px] border-[3px] border-[#E65473]/80 rounded-full animate-spin [animation-duration:8s] border-t-transparent border-l-transparent" />
    <div className="absolute w-[110px] h-[110px] border-[2px] border-[#E65473]/60 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse] border-b-transparent border-r-transparent" />
    <div className="absolute w-[140px] h-[140px] border-[1px] border-[#E65473]/40 rounded-full animate-spin [animation-duration:15s] border-t-transparent" />
    <div className="absolute w-10 h-10 bg-[#E65473]/50 rounded-full blur-md animate-pulse" />
    <div className="absolute w-6 h-6 bg-[#E65473] rounded-full shadow-[0_0_15px_rgba(230,84,115,0.8)]" />
  </div>
);

const TypewriterText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setDisplayed("");
    let i = 0;

    timerRef.current = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 40);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse text-[#E65473]">|</span>
    </span>
  );
};

const ChecklistItem = ({
  text,
  delay,
  onComplete,
}) => {
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    const t1 = setTimeout(() => setStatus("processing"), delay);
    return () => clearTimeout(t1);
  }, [delay]);

  useEffect(() => {
    if (status === "processing") {
      const t2 = setTimeout(() => {
        setStatus("completed");
        if (onComplete) onComplete();
      }, 1500);
      return () => clearTimeout(t2);
    }
  }, [status, onComplete]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-500 ${
        status === "waiting" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      }`}
    >
      <div
        className={`absolute inset-0 bg-white/10 transition-transform duration-[1500ms] ease-out origin-left ${
          status === "processing"
            ? "scale-x-100"
            : status === "completed"
            ? "scale-x-100 opacity-0"
            : "scale-x-0"
        }`}
      />
      <div className="relative flex items-center p-3 gap-3 z-10">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
            status === "completed" ? "bg-[#E65473] scale-110" : "bg-white/10"
          }`}
        >
          {status === "completed" ? (
            <Check size={14} className="text-white" strokeWidth={3} />
          ) : (
            <div className="w-2 h-2 bg-[#E65473]/60 rounded-full" />
          )}
        </div>
        <span className="text-[14px] font-medium text-white/90 leading-tight">
          {text}
        </span>
      </div>
    </div>
  );
};

const HolographicTimeline = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="w-full h-36 relative my-2">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(230, 84, 115, 0.2)" />
            <stop offset="100%" stopColor="rgba(230, 84, 115, 1)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path
          d="M 10,100 C 80,110 200,10 320,20"
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          className={`transition-all duration-[2000ms] ease-out ${
            show
              ? "stroke-dasharray-[400] stroke-dashoffset-0"
              : "stroke-dasharray-[400] stroke-dashoffset-[400]"
          }`}
        />
        <g className={`transition-opacity duration-1000 delay-1000 ${show ? "opacity-100" : "opacity-0"}`}>
          <circle cx="10" cy="100" r="4" fill="white" />
          <text x="10" y="125" textAnchor="middle" fill="white" fontSize="10" opacity="0.7">
            Today
          </text>
          <circle cx="320" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" />
          <text x="310" y="10" textAnchor="end" fill="#E65473" fontSize="12" fontWeight="bold">
            Goal
          </text>
        </g>
      </svg>
    </div>
  );
};

function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState("askingHealthInfo");

  const isDark = phase === "personalizing" || phase === "showingTimeline";

  // Safari/bottom bar congruency ONLY on dark phases
  usePlanRevealChrome(isDark, "#000000");

  // Phase 1 State
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelperText, setActivityHelperText] = useState("");

  // Phase 2 State
  const [personalizingStatus, setPersonalizingStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);

  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const healthCopy = getHealthCopy(goalTitle);
  const personalizingCopy = getPersonalizingCopy(goalTitle, userDetails?.name);
  const timelineCopy = getTimelineCopy(goalTitle);

  const updateHelperText = (hasCondition) => {
    setHelperText(getHelperCopy(hasCondition, goalTitle));
  };

  const toggleCondition = (id) => {
    setNoneSelected(false);
    setSelectedConditions((prev) => {
      const newSet = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      updateHelperText(newSet.length > 0);
      return newSet;
    });
  };

  const toggleNone = () => {
    const newVal = !noneSelected;
    setNoneSelected(newVal);
    if (newVal) setSelectedConditions([]);
    updateHelperText(newVal);
  };

  const selectActivity = (act) => {
    setSelectedActivity(act);
    setActivityHelperText("✓ Perfect, I'll match your pace & recovery.");
  };

  const canContinue = (selectedConditions.length > 0 || noneSelected) && selectedActivity;

  const handlePhase1Continue = () => {
    saveUserData("healthConditions", selectedConditions);
    saveUserData("activityLevel", selectedActivity);
    setPhase("personalizing");
  };

  useEffect(() => {
    if (phase !== "personalizing") return;

    let startTime = Date.now();
    setPersonalizingStatus(personalizingCopy.connecting);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(
        99,
        Math.floor((elapsed / PersonalizingConstants.totalDuration) * 100)
      );
      setProgressPercent(p);
    }, 50);

    const t1 = setTimeout(() => {
      setPersonalizingStatus(personalizingCopy.calibrating);
    }, PersonalizingConstants.totalDuration * PersonalizingConstants.phase1Scale);

    const t2 = setTimeout(() => {
      setPersonalizingStatus("");
      setShowChecklist(true);
    }, PersonalizingConstants.totalDuration * (PersonalizingConstants.phase1Scale + PersonalizingConstants.phase2Scale));

    return () => {
      clearInterval(progressInterval);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, personalizingCopy.connecting, personalizingCopy.calibrating]);

  const onChecklistComplete = () => {
    setProgressPercent(100);
    setPersonalizingStatus("Your plan is locked in—let’s go!");
    setTimeout(() => setPhase("showingTimeline"), 1200);
  };

  const calculateBMI = () => {
    if (!userDetails?.weight || !userDetails?.height) return "22.5";
    const h = userDetails.height * 0.0254;
    const w = userDetails.weight * 0.453592;
    return (w / (h * h)).toFixed(1);
  };

  const date = new Date();
  date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const formatRichText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        let content = part.slice(2, -2);
        if (content === "{date}") content = dateString;
        if (content === "{bmi}") content = calculateBMI();
        if (content === "{activity}")
          content = selectedActivity
            ? ACTIVITIES.find((a) => a.id === selectedActivity)?.title.toLowerCase()
            : "active";
        if (content === "{age}") content = userDetails?.age || "30";
        if (content === "{condition}")
          content = selectedConditions.length > 0 ? "unique needs" : "body";
        return (
          <span key={i} className="text-white font-extrabold">
            {content}
          </span>
        );
      }
      return (
        <span key={i} className="text-white/80">
          {part}
        </span>
      );
    });
  };

  return (
    <div
      className={`
        relative w-full flex flex-col transition-colors duration-700
        ${isDark ? "bg-black" : THEME_REVEAL.bg}
        ${
          isDark
            ? "h-[calc(100%+env(safe-area-inset-top)+env(safe-area-inset-bottom))] -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)]"
            : "h-full"
        }
        overflow-hidden
      `}
    >
      {isDark && (
        <div className="fixed md:absolute bottom-0 left-0 w-full pointer-events-none z-20">
          <div className="w-full h-[calc(env(safe-area-inset-bottom)+20px)] bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
        </div>
      )}

      {/* ---------------- PHASE 1: HEALTH INFO ---------------- */}
      {phase === "askingHealthInfo" && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
          >
            <div className="mb-2 shrink-0 text-center">
              <h1 className={`text-[26px] font-extrabold text-center ${THEME_REVEAL.text} mb-1 leading-tight`}>
                {healthCopy.headline}
              </h1>
              <p className="text-center text-[rgb(26,26,38)]/60 text-sm">
                {healthCopy.subtitle}
              </p>
            </div>

            <div className="flex flex-col justify-center min-h-0">
              <div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {CONDITIONS.map((item) => {
                    const isSelected = selectedConditions.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleCondition(item.id)}
                        className={`relative flex flex-col items-center justify-center p-2 rounded-[24px] border-[2px] h-[100px] transition-all duration-300 active:scale-95 outline-none
                          ${isSelected ? THEME_REVEAL.selected : THEME_REVEAL.unselected}
                        `}
                      >
                        <div className={`mb-2 transition-all duration-300 ${isSelected ? THEME_REVEAL.iconSelected : THEME_REVEAL.iconUnselected}`}>
                          {item.icon}
                        </div>
                        <span className={`text-[13px] font-bold text-center leading-tight px-1 transition-colors duration-300 ${isSelected ? THEME_REVEAL.textSelected : THEME_REVEAL.textUnselected}`}>
                          {item.title}
                        </span>
                        <div className="absolute top-3 right-3">
                          {isSelected ? (
                            <CheckCircle2 size={20} className="fill-[#E65473] text-white" />
                          ) : (
                            <Circle size={20} className="text-gray-200" strokeWidth={1.5} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className={`text-center text-xs font-bold ${THEME_REVEAL.helper} transition-opacity duration-300 h-4 mb-2 ${helperText ? "opacity-100" : "opacity-0"}`}>
                  {helperText}
                </div>

                <button
                  onClick={toggleNone}
                  className={`w-full py-3.5 rounded-full border-[1.5px] font-semibold text-[15px] transition-all duration-300 active:scale-95 outline-none
                    ${
                      noneSelected
                        ? "bg-white border-[2.5px] border-[#E65473] text-[#E65473] shadow-sm"
                        : "bg-white border-gray-200 text-slate-400"
                    }
                  `}
                >
                  ✓ None of the Above
                </button>
              </div>

              <div className="mt-3">
                <h3 className={`text-[15px] font-bold text-center ${THEME_REVEAL.text} mb-2`}>
                  Your typical activity level
                </h3>
                <div className="flex flex-col gap-2.5">
                  {ACTIVITIES.map((act) => {
                    const isSelected = selectedActivity === act.id;
                    return (
                      <button
                        key={act.id}
                        onClick={() => selectActivity(act.id)}
                        className={`w-full py-3.5 px-5 rounded-[22px] border-[2px] text-left flex items-center justify-between transition-all duration-300 active:scale-95 outline-none
                          ${isSelected ? THEME_REVEAL.selected : THEME_REVEAL.unselected}
                        `}
                      >
                        <span className={`font-bold text-[15px] ${isSelected ? THEME_REVEAL.textSelected : THEME_REVEAL.textUnselected}`}>
                          {act.title}{" "}
                          <span className="text-xs opacity-70 font-normal ml-1">
                            {act.sub}
                          </span>
                        </span>
                        {isSelected ? (
                          <CheckCircle2 size={22} className="fill-[#E65473] text-white" />
                        ) : (
                          <Circle size={22} className="text-gray-200" strokeWidth={1.5} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className={`text-center text-xs font-bold ${THEME_REVEAL.helper} transition-opacity duration-300 h-4 mt-2 ${activityHelperText ? "opacity-100" : "opacity-0"}`}>
                  {activityHelperText}
                </div>
              </div>
            </div>

            <div className="h-6" />
          </div>

          <div className="shrink-0 px-5 pb-6">
            <button
              onClick={handlePhase1Continue}
              disabled={!canContinue}
              className={`w-full h-14 rounded-full font-bold text-lg text-white transition-all duration-300 active:scale-95 shadow-xl
                ${
                  canContinue
                    ? `bg-gradient-to-b ${THEME_REVEAL.brandGradient} shadow-[#E65473]/30`
                    : "bg-slate-300 cursor-not-allowed shadow-none"
                }
              `}
            >
              {healthCopy.cta}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 2: PERSONALIZING ---------------- */}
      {phase === "personalizing" && (
        <div
          className="flex flex-col items-center justify-center h-full px-8 relative animate-in fade-in duration-1000"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className={`transition-all duration-500 ${showChecklist ? "scale-75 -translate-y-8 opacity-0" : "scale-100 opacity-100"}`}>
            <AICoreView />
          </div>

          {!showChecklist && (
            <div className="mt-12 text-center h-20 px-4">
              <h2 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br ${THEME_REVEAL.brandGradient} drop-shadow-sm mb-2 animate-pulse leading-tight`}>
                <TypewriterText key={personalizingStatus} text={personalizingStatus} />
              </h2>
            </div>
          )}

          {showChecklist && (
            <div className="w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8 duration-700">
              <h2 className="text-2xl font-bold text-white text-center mb-2 leading-tight">
                {personalizingCopy.title}
              </h2>
              <p className="text-center text-gray-400 text-sm mb-6">
                {personalizingCopy.subtitle}
              </p>
              <div className="space-y-3">
                {personalizingCopy.checklist.map((item, idx) => (
                  <ChecklistItem
                    key={idx}
                    text={item}
                    delay={idx * 800}
                    onComplete={idx === personalizingCopy.checklist.length - 1 ? onChecklistComplete : undefined}
                  />
                ))}
              </div>
              <div className="mt-6 text-center text-[#E65473] font-medium text-sm animate-pulse">
                {progressPercent === 100
                  ? "Ready!"
                  : "Fine-tuning for: " +
                    (personalizingCopy.checklist[Math.min(3, Math.floor(progressPercent / 25))] || "Results")}
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-0 w-full px-8" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-white/60 font-medium text-sm">Progress</span>
              <span className="text-white font-mono text-xl font-bold">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#E65473] transition-all duration-100 ease-linear" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-center text-[#E65473] text-xs mt-2 font-medium min-h-[16px]">
              {progressPercent < 30
                ? "Syncing your goals..."
                : progressPercent < 100
                ? "Preparing exercises..."
                : "Your plan is locked in—let’s go!"}
            </p>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 3: TIMELINE ---------------- */}
      {phase === "showingTimeline" && (
        <div className="flex flex-col h-full animate-in fade-in duration-1000 bg-black relative">
          <div className="flex-1 flex flex-col justify-between px-6 z-10 min-h-0" style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
            <div>
              <h1 className="text-2xl font-extrabold text-center text-white mb-2 leading-tight">
                <span className="text-white/90">{userDetails?.name || "Your"} path to</span>
                <br />
                <span className="text-[#E65473]">{goalTitle}</span> is ready.
              </h1>
              <p className="text-center text-white/80 text-[15px] mb-4 leading-relaxed">
                {formatRichText(timelineCopy.subtitle)}
              </p>
              <HolographicTimeline />
              <div className="mt-4 space-y-3">
                <h3 className="text-[16px] font-semibold text-white mb-1">
                  Your Personal Insights
                </h3>
                {timelineCopy.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-700"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="mt-0.5 text-[#E65473] shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <p className="text-[13px] leading-snug text-white/90">
                      {formatRichText(insight)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={onNext}
                className={`w-full h-14 rounded-full bg-gradient-to-r ${THEME_REVEAL.brandGradient} text-white font-bold text-lg shadow-[0_0_25px_rgba(230,84,115,0.5)] active:scale-95 transition-all`}
              >
                {timelineCopy.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SCREEN 6: PAYWALL SCREEN
// ==========================================

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const REVIEW_IMAGES = ["/review9.png", "/review1.png", "/review5.png", "/review4.png", "/review2.png"];

function usePaywallChrome(color = "#0A0A10") {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Desktop should not mutate global chrome; keep it scoped to mobile.
    if (window.matchMedia("(min-width: 768px)").matches) return;

    let meta = document.querySelector('meta[name="theme-color"]');
    let created = false;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
      created = true;
    }

    const prevTheme = meta.getAttribute("content");
    meta.setAttribute("content", color);

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    html.style.backgroundColor = color;
    body.style.backgroundColor = color;

    return () => {
      if (created) meta.remove();
      else if (prevTheme) meta.setAttribute("content", prevTheme);

      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [color]);
}

const getButtonText = (goalTitle) => {
  const g = (goalTitle || "").toLowerCase();
  if (g.includes("pregnancy")) return "Start My Pregnancy Plan";
  if (g.includes("postpartum")) return "Start My Postpartum Plan";
  if (g.includes("leak")) return "Start My Leak-Free Plan";
  if (g.includes("intimacy") || g.includes("sex")) return "Start My Intimacy Plan";
  if (g.includes("pain")) return "Start My Relief Plan";
  if (g.includes("core") || g.includes("strength")) return "Start My Core Plan";
  return "Start My Personalized Plan";
};

const getReviewsForGoal = (goalTitle) => {
  const goal = (goalTitle || "").toLowerCase();

  const pack = (names, texts) =>
    names.map((name, i) => ({
      name,
      text: texts[i],
      image: REVIEW_IMAGES[i % REVIEW_IMAGES.length],
    }));

  if (goal.includes("leaks") || goal.includes("bladder")) {
    return pack(
      ["Emily D.", "Dana A.", "Hannah L.", "Priya S.", "Zoe M."],
      ["Week 1 I laughed and stayed dry", "Pads live in a drawer now", "I jogged today and stayed dry", "Bathroom maps deleted I feel free", "My bladder finally listens to me"]
    );
  }
  if (goal.includes("pain") || goal.includes("discomfort")) {
    return pack(
      ["Laura P.", "Ana R.", "Katie B.", "Mia K.", "Jen C."],
      ["Meetings passed without that deep ache", "I enjoyed intimacy without flinching", "Gentle moves gave real relief", "I woke up calm not burning", "I lifted my toddler without bracing"]
    );
  }
  if (goal.includes("postpartum") || goal.includes("recover")) {
    return pack(
      ["Sarah W.", "Michelle T.", "Chloe N.", "Olivia G.", "Jess P."],
      ["Week 2 stronger steadier with baby", "My core feels connected again", "From leaks to laughter with my baby", "Recovery finally makes sense", "Five minutes I actually keep"]
    );
  }
  if (goal.includes("pregnancy") || goal.includes("prepare")) {
    return pack(
      ["Kara D.", "Ivy S.", "Bella R.", "Nora P.", "June K."],
      ["Breath is calm belly supported", "Hips opened and sleep returned", "Week 2 my core feels ready", "Movements finally feel safe", "I feel ready for our baby"]
    );
  }
  if (goal.includes("intimacy") || goal.includes("sexual")) {
    return pack(
      ["Maya S.", "Dani R.", "Lina H.", "Brooke E.", "Kim W."],
      ["More sensation and less worry", "Bedroom confidence is back", "Stronger connection with my partner", "I actually look forward to intimacy", "Orgasms came without fear"]
    );
  }
  if (goal.includes("strength") || goal.includes("fitness")) {
    return pack(
      ["Sam P.", "Helena R.", "Jules M.", "Tess K.", "Ana L."],
      ["Runs feel springy and sure", "Deadlifts steady no pinch", "Balance finally clicked in yoga", "Core fired my pace improved", "Recovery better workouts stick"]
    );
  }
  if (goal.includes("stability") || goal.includes("posture")) {
    return pack(
      ["Camille D.", "Erin S.", "Mina J.", "Paige R.", "Ruth N."],
      ["Shoulders dropped I grew taller", "Neck stayed easy all day", "Stairs felt steady and safe", "Desk hours no longer punish", "Week 1 standing feels organized"]
    );
  }

  return pack(
    ["Olivia G.", "Emily D.", "Sarah W.", "Emily J.", "Dana A."],
    ["This finally felt made for me", "Small wins in days I smiled", "Five minutes gave real change", "Pain eased and I breathed", "Confidence returned I feel in control"]
  );
};

const FEATURES = [
  { icon: <Brain size={28} className="text-white" />, text: "AI coach that adapts daily" },
  { icon: <Timer size={28} className="text-white" />, text: "5-minute personalized routines" },
  { icon: <Play size={28} className="text-white" fill="white" />, text: "300+ physio-approved videos" },
  { icon: <Activity size={28} className="text-white" />, text: "Trackable progress & streaks" },
];

const CheckoutForm = ({ onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { saveUserData } = useUserData();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "https://pelvi.health/dashboard?plan=monthly",
        receipt_email: email,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || "Payment error");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      saveUserData("isPremium", true);
      saveUserData("joinDate", new Date().toISOString());
      router.push("https://pelvi.health/dashboard?plan=monthly");
    } else {
      setMessage("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs",
    fields: { billingDetails: { phone: "auto" } },
  };

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-[#1A1A26] p-6 rounded-3xl border border-white/10 shadow-2xl animate-slide-up relative my-auto mx-4"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <X size={20} className="text-white" />
      </button>

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1">Secure Checkout</h3>
        <p className="text-sm text-white/50">Total due: $24.99 / month</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-white">
          <LinkAuthenticationElement
            id="link-authentication-element"
            onChange={(e) => setEmail(e.value.email)}
          />
        </div>
        <PaymentElement id="payment-element" options={paymentElementOptions} />
      </div>

      {message && (
        <div className="text-red-400 text-sm mt-4 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          {message}
        </div>
      )}

      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full mt-6 h-14 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : "Pay $24.99"}
      </button>

      <p className="text-center text-white/30 text-xs mt-4">
        100% Secure Payment via Stripe
      </p>
    </form>
  );
};

const RestoreModal = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { saveUserData } = useUserData();

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/restore-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.isPremium) {
        saveUserData("isPremium", true);
        saveUserData("joinDate", new Date().toISOString());
        if (data.customerName) saveUserData("name", data.customerName);
        router.push("https://pelvi.health/dashboard");
      } else {
        alert("We found your email, but no active subscription was detected.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Unable to verify purchase. Please check your internet connection.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed md:absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#1A1A26] border border-white/10 rounded-3xl p-6 shadow-2xl animate-scale-up"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Restore Purchase</h3>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <p className="text-white/60 text-sm mb-6">
          Enter the email address you used to purchase your subscription. We'll find your account.
        </p>

        <form onSubmit={handleRestoreSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#E65473] transition-colors"
              autoFocus
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Find My Plan"}
          </button>
        </form>
      </div>
    </div>
  );
};

function PaywallScreen() {
  const router = useRouter();
  const { userDetails, saveUserData } = useUserData();

  usePaywallChrome("#0A0A10");

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800);
  const [showContent, setShowContent] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [dateString, setDateString] = useState("");

  const [clientSecret, setClientSecret] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);
  const buttonText = getButtonText(goalTitle);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setDateString(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    setShowContent(true);
  }, []);

  useEffect(() => {
    const featureTimer = setInterval(() => setActiveFeatureIndex((p) => (p + 1) % FEATURES.length), 4000);
    const reviewTimer = setInterval(() => setCurrentReviewIndex((p) => (p + 1) % reviews.length), 5000);
    return () => {
      clearInterval(featureTimer);
      clearInterval(reviewTimer);
    };
  }, [reviews]);

  useEffect(() => {
    if (!showContent) return;
    let start = 9800;
    const timer = setInterval(() => {
      start += 5;
      if (start >= 10200) {
        setUserCount(10200);
        clearInterval(timer);
      } else setUserCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [showContent]);

  const handleStartPlan = async () => {
    setIsButtonLoading(true);

    if (!clientSecret) {
      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server Error: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Stripe Error:", err);
        alert(`Could not initialize payment: ${err.message}. Please check your internet or try again later.`);
        setIsButtonLoading(false);
        return;
      }
    }

    setIsButtonLoading(false);
    setShowCheckoutModal(true);
  };

  const stripeAppearance = {
    theme: "night",
    variables: {
      colorPrimary: "#E65473",
      colorBackground: "#1A1A26",
      colorText: "#ffffff",
      colorDanger: "#df1b41",
      fontFamily: "Inter, system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "12px",
    },
  };

  const getCtaSubtext = () => {
    if (!dateString) return "";
    return `Feel real progress by ${dateString}. If not, one tap full $24.99 refund.`;
  };

  return (
    <div
      className={`
        relative w-full bg-[#0A0A10] overflow-hidden flex flex-col
        h-[calc(100dvh+env(safe-area-inset-top))]
        -mt-[env(safe-area-inset-top)]
        md:h-full md:mt-0
      `}
    >
      <div className="fixed md:absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[env(safe-area-inset-top)] bg-[#0A0A10]" />

        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/30" />

        <div className="absolute top-0 inset-x-0 h-[calc(env(safe-area-inset-top)+64px)] bg-gradient-to-b from-[#0A0A10]/85 to-transparent" />

        <div className="absolute bottom-0 inset-x-0 h-[calc(env(safe-area-inset-bottom)+2px)] bg-gradient-to-t from-[#0A0A10]/95 via-[#0A0A10]/75 to-transparent" />
      </div>

      <div
        className={`
          z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar px-6
          pt-[calc(env(safe-area-inset-top)+3rem)]
          pb-[calc(9rem+env(safe-area-inset-bottom))]
          transition-all duration-700
          ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <h1 className="text-[34px] font-extrabold text-white text-center mb-8 leading-tight drop-shadow-xl">
          <span className="text-white">{userName === "Ready" ? "Ready to" : `${userName}, ready to`}</span>
          <br />
          <span className="capitalize text-[#E65473]">
            {goalTitle.replace("Stop ", "").replace("Build ", "")}
          </span>
          ?
          <span className="block text-[28px] text-white mt-1">100% Money-Back Guarantee.</span>
        </h1>

        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] overflow-hidden mb-6 flex flex-col items-center shadow-2xl">
          <div className="pt-5 pb-2">
            <h3 className="text-[17px] font-bold text-white text-center drop-shadow-md">
              Your Personalized Plan Includes:
            </h3>
          </div>

          <div className="relative w-full h-[140px] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const isActive = index === activeFeatureIndex;
              return (
                <div
                  key={index}
                  className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center ${
                    isActive ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
                  }`}
                >
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#E65473] to-[#C23A5B] flex items-center justify-center shadow-lg shadow-rose-500/30">
                    {feature.icon}
                  </div>
                  <span className="text-[17px] font-semibold text-white leading-tight drop-shadow-md">
                    {feature.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full px-6 pb-6 flex gap-1.5 h-1.5">
            {FEATURES.map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white rounded-full transition-all ease-linear ${
                    i === activeFeatureIndex
                      ? "duration-[4000ms] w-full"
                      : i < activeFeatureIndex
                      ? "w-full"
                      : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-[24px] p-5 flex flex-col items-center gap-3 mb-6 shadow-xl">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[22px] font-bold text-white drop-shadow-sm">4.9</span>
            <div className="flex text-yellow-400 gap-1 drop-shadow-sm">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <span className="text-[11px] font-medium text-white/80 uppercase tracking-wide">
              App Store Rating
            </span>
          </div>

          <div className="w-full min-h-[70px] flex items-center justify-center relative">
            {reviews.map((review, idx) => (
              <div
                key={idx}
                className={`absolute w-full flex flex-col items-center transition-all duration-500 ${
                  idx === currentReviewIndex
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4 pointer-events-none"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={review.image}
                    className="w-10 h-10 rounded-full border-2 border-white/50 object-cover shadow-sm"
                    alt={review.name}
                  />
                  <p className="text-[15px] italic text-white text-center font-medium drop-shadow-md">
                    "{review.text}"
                  </p>
                  <p className="text-[12px] font-bold text-white/90 drop-shadow-md">{review.name}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-white/70 text-center mt-2 font-medium">
            Join <span className="font-bold text-white">{userCount.toLocaleString()}+ women</span> feeling strong.
          </p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <div
            onClick={() => setIsFaqOpen(!isFaqOpen)}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center gap-2 text-white/90">
              <span className="text-[14px] font-semibold">How do I get my money back?</span>
              {isFaqOpen ? (
                <ChevronUp size={14} className="text-white/60" />
              ) : (
                <ChevronDown size={14} className="text-white/60" />
              )}
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isFaqOpen ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-[13px] text-white/60 text-center leading-relaxed">
                Tap “Refund” in Settings → “Billing” → Done. No questions asked.
              </p>
            </div>
          </div>

          <div className="flex justify-center items-center gap-3 text-[11px] font-medium text-white/50">
            <button
              onClick={() => setShowRestoreModal(true)}
              className="underline decoration-white/30 hover:text-white transition-colors"
            >
              Restore Purchase
            </button>
            <span>•</span>
            <span className="cursor-default">Physio-Designed</span>
            <span>•</span>
            <span className="cursor-default">Doctor Approved</span>
          </div>
        </div>
      </div>

      <div
        className={`
          fixed md:absolute bottom-0 left-0 w-full z-30 px-6 pt-6
          pb-[calc(env(safe-area-inset-bottom)+2rem)]
          bg-gradient-to-t from-[#0A0A10]/90 via-[#0A0A10]/30 to-transparent
          transition-all duration-700 delay-200
          ${showContent ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
        `}
      >
        <button
          onClick={handleStartPlan}
          disabled={isButtonLoading}
          className="w-full h-[58px] rounded-full shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] transition-all group-hover:scale-105" />
          <div className="relative flex items-center gap-2 z-10">
            {isButtonLoading && <Loader2 className="animate-spin text-white" size={24} />}
            <span className="text-[18px] font-bold text-white">{buttonText}</span>
          </div>
        </button>

        <p className="text-center text-white/90 text-[12px] font-medium mt-3 leading-snug px-4 drop-shadow-md">
          {getCtaSubtext()}
        </p>
      </div>

      {/* Stripe overlay */}
      {showCheckoutModal && clientSecret && (
        <div
          className="fixed md:absolute inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <Elements options={{ clientSecret, appearance: stripeAppearance }} stripe={stripePromise}>
              <CheckoutForm onClose={() => setShowCheckoutModal(false)} />
            </Elements>
          </div>
        </div>
      )}

      {showRestoreModal && <RestoreModal onClose={() => setShowRestoreModal(false)} />}
    </div>
  );
}

const Star = ({ size, fill }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ==========================================
// MAIN EXPORT: ONBOARDING FLOW MANAGER
// ==========================================

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState("welcome");

  const Screen = () => {
    if (currentStep === "welcome")
      return <WelcomeScreen onNext={() => setCurrentStep("select_goal")} />;
    if (currentStep === "select_goal")
      return <SelectGoalScreen onNext={() => setCurrentStep("how_it_helps")} />;
    if (currentStep === "how_it_helps")
      return <HowItHelpsScreen onNext={() => setCurrentStep("intake")} />;
    if (currentStep === "intake")
      return <PersonalIntakeScreen onNext={() => setCurrentStep("plan_reveal")} />;
    if (currentStep === "plan_reveal")
      return <PlanRevealScreen onNext={() => setCurrentStep("paywall")} />;
    return <PaywallScreen />;
  };

  // ✅ Option A: Desktop-first, full-screen onboarding everywhere.
  // ✅ No phone preview, no left marketing panel.
  // ✅ Outer shell owns height + prevents body scroll; each screen manages its own internal scroll.
  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden">
      {/* Desktop background glow */}
      <div className="hidden md:block absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] bg-rose-200/40 rounded-full blur-[90px]" />
        <div className="absolute -bottom-24 -right-24 w-[520px] h-[520px] bg-pink-200/30 rounded-full blur-[90px]" />
      </div>

      <div className="w-full h-full min-h-0 flex flex-col">
        <Screen />
      </div>
    </div>
  );
}
