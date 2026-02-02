"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUserData } from "@/context/UserDataContext";
import {
  Sun,
  CloudSun,
  Moon,
  Flame,
  ChevronRight,
  Play,
  RotateCw,
  Trophy,
  Calendar,
  Zap,
  Activity,
  Info,
  Heart,
  Droplets,
  CreditCard,
  Mail,
  X,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from "lucide-react";

import DailyRoutinePlayer from "@/components/DailyRoutinePlayer";
import { getDailyPlaylist } from "@/utils/dailyLogic";

// --- CONFIGURATION ---
const THEME = {
  gradients: {
    intimacy: "from-pink-500 to-purple-600",
    leaks: "from-blue-500 to-cyan-500",
    postpartum: "from-green-500 to-teal-500",
    core: "from-orange-500 to-red-500",
    default: "from-[#E65473] to-[#C23A5B]",
  },
  colors: {
    intimacy: "#E65473",
    leaks: "#3B82F6",
    postpartum: "#10B981",
    core: "#F97316",
    default: "#E65473",
  },
};

const GOAL_TIPS = {
  intimacy: [
    { icon: Heart, text: "Relaxation is key. Focus on 'letting go' on the inhale." },
    { icon: Zap, text: "Stronger pelvic tone increases sensation and blood flow." },
  ],
  leak: [
    { icon: Droplets, text: "Try the 'Knack': Squeeze before you cough or sneeze." },
    { icon: Activity, text: "Consistency builds the 'seal' that stops leaks." },
  ],
  postpartum: [
    { icon: Trophy, text: "Be patient. You are rebuilding your foundation safely." },
    { icon: Info, text: "Avoid 'coning' in your belly. Keep movements gentle." },
  ],
  default: [
    { icon: Zap, text: "Consistency is your superpower. Small efforts compound." },
    { icon: Activity, text: "You are building a foundation for lifelong health." },
  ],
};

// --- PROFILE SETTINGS MODAL ---
const ProfileSettingsModal = ({ onClose, joinDate, userName }) => {
  const [view, setView] = useState("menu"); // 'menu' or 'email_input'
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [email, setEmail] = useState("");

  const handleManageSubscriptionClick = () => setView("email_input");

  const handlePortalSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoadingPortal(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          returnUrl: window.location.href,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("We couldn't find a subscription with that email. Please check for typos.");
        setIsLoadingPortal(false);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again later.");
      setIsLoadingPortal(false);
    }
  };

  const formattedDate = joinDate
    ? new Date(joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "January 2026";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-10 sm:pb-6 shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* VIEW 1: MAIN MENU */}
        {view === "menu" && (
          <>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100 shadow-md">
                  <img src="/coachMiaAvatar.png" className="w-full h-full object-cover" alt="Profile" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1A1A26]">{userName}</h3>
                  <p className="text-sm text-gray-500">Member since {formattedDate}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 bg-green-100 px-2.5 py-0.5 rounded-full w-fit">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide">
                      Active Premium
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-3">
              {/* Subscription Button */}
              <button
                onClick={handleManageSubscriptionClick}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700 group-hover:scale-110 transition-transform">
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#1A1A26] text-sm">Subscription</p>
                    <p className="text-xs text-gray-500">Manage plan / Cancel</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>

              {/* Support */}
              <a
                href="mailto:contact@pelvi.health?subject=Support Request - Pelvic Floor Coach"
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700 group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#1A1A26] text-sm">Contact Support</p>
                    <p className="text-xs text-gray-500">We're here to help</p>
                  </div>
                </div>
                <ExternalLink size={18} className="text-gray-400" />
              </a>

              {/* Get App */}
              <a
                href="https://apps.apple.com/us/app/pelvic-floor-core-coach/id6642654729"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-[#1A1A26] to-[#2C2C3E] text-white rounded-2xl shadow-lg group hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <img src="/logo.png" className="w-5 h-5 object-contain" alt="Logo" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Get the App</p>
                    <p className="text-xs text-white/60">Offline mode & Reminders</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-white/60" />
              </a>
            </div>
          </>
        )}

        {/* VIEW 2: EMAIL INPUT */}
        {view === "email_input" && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setView("menu")}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="text-lg font-bold text-[#1A1A26]">Manage Subscription</h3>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Enter the email address associated with your subscription to access the secure billing portal.
            </p>

            <form onSubmit={handlePortalSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[#1A1A26] font-medium focus:outline-none focus:ring-2 focus:ring-[#E65473]/20 focus:border-[#E65473] transition-all"
                />
              </div>

              <button
                disabled={isLoadingPortal}
                className="w-full h-12 bg-[#1A1A26] text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {isLoadingPortal ? <Loader2 size={18} className="animate-spin" /> : "Access Portal"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-300 mt-6">Version 2.4.0 • Pelvi Health Inc.</p>
      </div>
    </div>
  );
};

// --- DASHBOARD HEADER ---
const DashboardHeader = ({ name, greeting, onProfileClick }) => {
  const Icon = greeting.icon;
  const [liveCount, setLiveCount] = useState(124);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(80, Math.min(260, next)); // clamp to keep it realistic
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-between items-start animate-slide-up">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-yellow-500 animate-pulse" />
          <span className="text-sm font-medium text-[#737380]">{greeting.text},</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A26] tracking-tight">
          {name} <span className="inline-block animate-wave origin-bottom-right">👋</span>
        </h1>
        <div
          className="flex items-center gap-2 mt-1.5 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
        >
          <div className="relative w-2 h-2">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-xs font-medium text-[#737380]">Live: {liveCount} members online</span>
        </div>
      </div>

      {/* Profile Button */}
      <button
        onClick={onProfileClick}
        className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-white group relative hover:scale-105 transition-transform active:scale-95"
      >
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <img src="/coachMiaAvatar.png" className="w-full h-full object-cover" alt="Profile" />
      </button>
    </div>
  );
};

// --- VIDEO PREVIEW COMPONENT ---
const VideoPreview = ({ url }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 5) {
        video.currentTime = 0;
        video.play();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      playsInline
      autoPlay
      loop
      className="absolute inset-0 w-full h-full object-cover rounded-full opacity-90"
      style={{ transform: "scale(1.2)" }}
    />
  );
};

// --- WEEKLY GRAPH (YOUR EXACT CODE) ---
const WeeklyProgressGraph = ({ streak, goalColor, isTodayDone }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const [todayIndex, setTodayIndex] = useState(-1);

  useEffect(() => {
    let current = new Date().getDay() - 1;
    if (current === -1) current = 6;
    setTodayIndex(current);
  }, []);

  return (
    <div
      className="bg-white rounded-3xl p-5 border border-[#EBEBF0] shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-slide-up"
      style={{ animationDelay: "300ms" }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#1A1A26] text-sm">This Week's Activity</h3>
        <span className="text-[10px] font-semibold bg-[#FAF9FA] text-[#737380] px-2 py-1 rounded-full border border-[#EBEBF0]">
          {streak} Day Streak
        </span>
      </div>

      <div className="flex justify-between h-24 gap-2 items-stretch">
        {days.map((day, idx) => {
          if (todayIndex === -1) return null;

          const end = isTodayDone ? todayIndex : todayIndex - 1;

          if (end < 0) {
            const barColor = "#EBEBF0";
            return (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full">
                <div className="w-full flex-1 flex items-end justify-center rounded-lg bg-[#FAF9FA] overflow-hidden relative">
                  <div
                    className="w-2 rounded-full transition-all duration-700 ease-out"
                    style={{ height: "15%", backgroundColor: barColor }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    idx === todayIndex ? "text-[#1A1A26]" : "text-[#737380]"
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          }

          const start = end - (streak - 1);
          const isActive = streak > 0 && idx >= start && idx <= end;

          const height = isActive ? "80%" : "15%";
          const barColor = isActive ? goalColor : "#EBEBF0";

          return (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full">
              <div className="w-full flex-1 flex items-end justify-center rounded-lg bg-[#FAF9FA] overflow-hidden relative">
                <div
                  className="w-2 rounded-full transition-all duration-700 ease-out"
                  style={{ height, backgroundColor: barColor }}
                />
              </div>
              <span
                className={`text-[10px] font-bold ${
                  idx === todayIndex ? "text-[#1A1A26]" : "text-[#737380]"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CoachTipCard = ({ goalColor, userGoal }) => {
  const [index, setIndex] = useState(0);

  const tips = useMemo(() => {
    const g = (userGoal || "").toLowerCase();
    if (g.includes("intimacy")) return GOAL_TIPS.intimacy;
    if (g.includes("leak")) return GOAL_TIPS.leak;
    if (g.includes("postpartum")) return GOAL_TIPS.postpartum;
    return GOAL_TIPS.default;
  }, [userGoal]);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % tips.length), 8000);
    return () => clearInterval(timer);
  }, [tips]);

  const Tip = tips[index];
  const Icon = Tip.icon;

  return (
    <div
      className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-[#EBEBF0] animate-slide-up"
      style={{ animationDelay: "400ms" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${goalColor}20` }}
      >
        <Icon size={20} style={{ color: goalColor }} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-[#737380] uppercase tracking-wide mb-0.5">Coach Tip</p>
        {/* key={index} forces the fade-in to restart cleanly when tip changes */}
        <p key={index} className="text-sm font-medium text-[#1A1A26] leading-snug animate-fade-in">
          {Tip.text}
        </p>
      </div>
    </div>
  );
};

const DownloadAppCard = () => {
  return (
    <div
      className="relative overflow-hidden rounded-[32px] bg-[#1A1A26] p-6 text-white shadow-2xl animate-slide-up"
      style={{ animationDelay: "500ms" }}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-40"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-pink-500 rounded-full blur-[60px] opacity-40"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg border border-white/10">
            <img src="/logo.png" alt="App Logo" className="w-8 h-8 object-contain" />
          </div>
          <h3 className="text-lg font-bold">Get the Full Experience</h3>
        </div>

        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Unlock <strong>smart reminders</strong>, <strong>offline mode</strong>, and{" "}
          <strong>haptic guidance</strong> by downloading the official app. Your progress syncs automatically.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="https://apps.apple.com/us/app/pelvic-floor-core-coach/id6642654729"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-white text-[#1A1A26] rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.4 1.83.2 2.91 1.25 3.6 2.2-2.92 1.88-2.39 5.86.48 7.03-.64 1.84-1.68 3.59-3.53 4.4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.16 2.29-1.87 4.29-3.74 4.25z" />
            </svg>
            <span>Download on iOS</span>
          </a>

          <button
            disabled
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-white/10 text-gray-400 rounded-xl font-bold border border-white/10 cursor-not-allowed"
          >
            <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.14L3.84,2.15C3.84,2.15 6.05,2.66 6.05,2.66Z" />
            </svg>
            <span>Android Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- REUSABLE: STREAK WIDGET ---
const StreakWidget = ({ streak, completedToday }) => {
  return (
    <div
      className="bg-gradient-to-br from-[#1A1A26] to-[#2C2C3E] rounded-[24px] p-5 text-white shadow-xl flex items-center justify-between animate-slide-up"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/5 ${
            completedToday ? "shadow-[0_0_20px_rgba(251,146,60,0.6)]" : ""
          }`}
        >
          <Flame size={24} className={`text-orange-400 fill-orange-400 ${completedToday ? "animate-pulse" : ""}`} />
        </div>
        <div>
          <h4 className="font-bold text-lg">{streak} Day Streak</h4>
          <p className="text-xs text-gray-400 font-medium">
            {completedToday ? "🔥 Streak extended!" : "Complete today's plan to keep it."}
          </p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-500" />
    </div>
  );
};

// --- REUSABLE: DAILY ROUTINE CARD (mobile unchanged, desktop gets premium sizing) ---
const DailyRoutineCard = ({
  routineData,
  userGoal,
  themeGradient,
  themeColor,
  completedToday,
  previewVideoUrl,
  onClick,
  variant = "mobile", // "mobile" | "desktop"
}) => {
  const isDesktop = variant === "desktop";

  return (
    <div
      onClick={onClick}
      className={[
        "group w-full relative overflow-hidden bg-white border border-[#EBEBF0] shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 cursor-pointer",
        isDesktop ? "rounded-[36px] p-8 hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)]" : "rounded-[32px] p-6 active:scale-[0.98]",
        "animate-slide-up",
      ].join(" ")}
      style={{ animationDelay: isDesktop ? "80ms" : "100ms" }}
    >
      {/* Subtle premium glow */}
      {isDesktop && (
        <>
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-[70px] opacity-30" style={{ background: themeColor }} />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full blur-[80px] opacity-20" style={{ background: themeColor }} />
        </>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {routineData?.isChallenge ? (
                <Flame size={16} className="text-orange-500 fill-orange-500" />
              ) : (
                <Calendar size={16} className="text-blue-500" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">
                {routineData?.isChallenge ? `Day ${routineData.dayNumber} Challenge` : "Daily Maintenance"}
              </span>
            </div>

            <h2 className={`${isDesktop ? "text-2xl" : "text-xl"} font-bold text-[#1A1A26] leading-tight`}>
              {routineData?.title}
            </h2>

            <p className={`${isDesktop ? "text-[14px]" : "text-sm"} text-[#737380] mt-1`}>
              Tailored for: <span className="font-semibold text-[#1A1A26]">{userGoal}</span>
            </p>
          </div>

          {isDesktop && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">
                {completedToday ? "Done Today" : "Ready"}
              </span>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: completedToday ? "#10B981" : themeColor }}
              />
            </div>
          )}
        </div>

        <div className={`relative w-full ${isDesktop ? "h-20" : "h-16"} flex items-center gap-5`}>
          <div className={`relative ${isDesktop ? "w-20 h-20" : "w-16 h-16"} shrink-0 flex items-center justify-center`}>
            {!completedToday && previewVideoUrl ? (
              <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden shadow-md">
                <VideoPreview url={previewVideoUrl} />
                <svg className="absolute inset-0 w-full h-full rotate-[-90deg] z-10">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="175.9"
                    strokeDashoffset="175.9"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            ) : (
              <>
                <svg className="absolute w-full h-full rotate-[-90deg]">
                  <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="6" fill="none" />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={`url(#grad-theme-${variant})`}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray="175.9"
                    strokeDashoffset={completedToday ? 0 : 175.9}
                    strokeLinecap="round"
                    className="transition-all duration-[1500ms] ease-out"
                  />
                  <defs>
                    <linearGradient id={`grad-theme-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={themeColor} />
                      <stop offset="100%" stopColor={themeColor} stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                </svg>
              </>
            )}

            <div className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center z-20 ${completedToday ? "hidden" : ""}`}>
              <Play size={12} className="text-white fill-white ml-0.5" />
            </div>

            {completedToday && (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeGradient} flex items-center justify-center shadow-lg z-20`}>
                <RotateCw size={18} className="text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <span className={`${isDesktop ? "text-[18px]" : "text-[16px]"} font-bold text-[#1A1A26] transition-colors`}>
              {completedToday ? "Session Complete!" : "Start Session"}
            </span>
            <span className={`${isDesktop ? "text-[14px]" : "text-[13px]"} text-[#737380]`}>
              {completedToday ? "Great job, come back tomorrow." : "5 Minute Workout"}
            </span>
          </div>

          <div className="ml-auto">
            <div className={`rounded-full bg-[#FAF9FA] flex items-center justify-center group-hover:bg-[#F3F4F6] transition-colors ${isDesktop ? "w-11 h-11" : "w-10 h-10"}`}>
              <ChevronRight size={20} className="text-[#C7C7CC]" />
            </div>
          </div>
        </div>

        {/* Desktop: subtle “Up next” preview */}
        {isDesktop && Array.isArray(routineData?.videos) && routineData.videos.length > 0 && (
          <div className="mt-6 hidden lg:block">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Up next</p>
              <p className="text-[11px] font-semibold text-[#737380]">
                {routineData.videos.length} videos
              </p>
            </div>
            <div className="flex gap-2">
              {routineData.videos.slice(0, 3).map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-2xl border border-[#EBEBF0] bg-white/60 backdrop-blur-md px-3 py-2"
                >
                  <p className="text-[12px] font-bold text-[#1A1A26] truncate">
                    {v?.title || `Exercise ${i + 1}`}
                  </p>
                  <p className="text-[11px] text-[#737380] truncate">
                    {v?.duration ? `${v.duration}` : "Guided movement"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- DESKTOP: PREMIUM SHELL (sidebar + main) ---
const DesktopDashboardShell = ({
  userName,
  userGoal,
  greeting,
  routineData,
  streak,
  completedToday,
  themeColor,
  themeGradient,
  previewVideoUrl,
  onStartSession,
  onOpenProfile,
}) => {
  const formattedJoinDate = useMemo(() => {
    const jd = routineData?.joinDate;
    if (!jd) return null;
    try {
      return new Date(jd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  }, [routineData]);

  return (
    <div className="hidden md:block h-[100dvh] w-full overflow-hidden bg-[#FAF9FA]">
      {/* Background polish */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full blur-[90px] opacity-[0.10]" style={{ background: themeColor }} />
        <div className="absolute bottom-[-200px] right-[-200px] w-[520px] h-[520px] rounded-full blur-[100px] opacity-[0.08]" style={{ background: themeColor }} />
      </div>

      <div className="relative h-full max-w-7xl mx-auto px-8 py-8">
        <div className="h-full grid grid-cols-[420px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="min-h-0 flex flex-col rounded-[36px] border border-[#EBEBF0] bg-white/70 backdrop-blur-md shadow-[0_18px_70px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Sidebar Top */}
            <div className="shrink-0 px-7 pt-7 pb-6 border-b border-[#EBEBF0] bg-gradient-to-b from-white to-[#FAF9FA]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-[#EBEBF0] flex items-center justify-center">
                    <img src="/logo.png" alt="Pelvi Health" className="w-7 h-7 object-contain" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Pelvi Health</p>
                    <p className="text-[16px] font-extrabold text-[#1A1A26] leading-tight">Your Daily Dashboard</p>
                  </div>
                </div>

                <button
                  onClick={onOpenProfile}
                  className="w-11 h-11 rounded-full overflow-hidden border border-white shadow-lg hover:scale-105 transition-transform"
                >
                  <img src="/coachMiaAvatar.png" alt="Profile" className="w-full h-full object-cover" />
                </button>
              </div>

              <div className="mt-6">
                <DashboardHeader name={userName} greeting={greeting} onProfileClick={onOpenProfile} />
              </div>

              {/* Goal pill */}
              <div className="mt-5 flex items-center gap-2">
                <div className={`h-9 px-3 rounded-full bg-white border border-[#EBEBF0] shadow-sm flex items-center gap-2`}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                  <span className="text-[12px] font-bold text-[#1A1A26]">Focus:</span>
                  <span className="text-[12px] font-semibold text-[#737380] truncate max-w-[240px]">{userGoal}</span>
                </div>

                <div className="h-9 px-3 rounded-full bg-white border border-[#EBEBF0] shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[12px] font-semibold text-[#737380]">
                    {completedToday ? "Done today" : "Not started"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-7 space-y-6">
              <StreakWidget streak={streak} completedToday={completedToday} />
              <WeeklyProgressGraph streak={streak} goalColor={themeColor} isTodayDone={completedToday} />
              <CoachTipCard goalColor={themeColor} userGoal={userGoal} />
              <DownloadAppCard />
            </div>
          </aside>

          {/* Main */}
          <main className="min-h-0 flex flex-col rounded-[36px] border border-[#EBEBF0] bg-white shadow-[0_18px_70px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Main Top */}
            <div className="shrink-0 px-10 pt-9 pb-7 border-b border-[#EBEBF0] bg-gradient-to-b from-white to-[#FAF9FA]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Today</p>
                  <h2 className="text-3xl font-extrabold text-[#1A1A26] tracking-tight mt-1">
                    Your 5-minute plan
                  </h2>
                  <p className="text-[14px] text-[#737380] mt-2 max-w-xl leading-relaxed">
                    Built around your goal and progress. Consistency is what creates the “wow” results.
                  </p>
                </div>

                <div className="hidden lg:flex items-center gap-3">
                  <div className="px-4 py-2 rounded-full bg-[#FAF9FA] border border-[#EBEBF0] text-[#737380] text-[12px] font-semibold">
                    {routineData?.isChallenge ? `Challenge Day ${routineData?.dayNumber || ""}` : "Daily Maintenance"}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-10 py-10 space-y-8">
              {/* Hero card */}
              <DailyRoutineCard
                routineData={routineData}
                userGoal={userGoal}
                themeGradient={themeGradient}
                themeColor={themeColor}
                completedToday={completedToday}
                previewVideoUrl={previewVideoUrl}
                onClick={onStartSession}
                variant="desktop"
              />

              {/* Premium “insights” strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-[28px] border border-[#EBEBF0] bg-[#FAF9FA] p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Streak</p>
                  <p className="text-2xl font-extrabold text-[#1A1A26] mt-2">{streak}</p>
                  <p className="text-[13px] text-[#737380] mt-1">Days in a row</p>
                </div>

                <div className="rounded-[28px] border border-[#EBEBF0] bg-[#FAF9FA] p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Session</p>
                  <p className="text-2xl font-extrabold text-[#1A1A26] mt-2">5 min</p>
                  <p className="text-[13px] text-[#737380] mt-1">Fast. Effective. Repeatable.</p>
                </div>

                <div className="rounded-[28px] border border-[#EBEBF0] bg-[#FAF9FA] p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Status</p>
                  <p className="text-2xl font-extrabold mt-2" style={{ color: completedToday ? "#10B981" : themeColor }}>
                    {completedToday ? "Done" : "Ready"}
                  </p>
                  <p className="text-[13px] text-[#737380] mt-1">
                    {completedToday ? "Come back tomorrow." : "Start your session now."}
                  </p>
                </div>
              </div>

              {/* Secondary section (optional future content hook) */}
              <div className="rounded-[36px] border border-[#EBEBF0] p-8 bg-white">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#737380]">Your plan</p>
                    <h3 className="text-xl font-extrabold text-[#1A1A26] mt-1">Designed for your goal</h3>
                    <p className="text-[14px] text-[#737380] mt-2 max-w-2xl leading-relaxed">
                      Each day builds your foundation: core coordination, pelvic control, and confidence in real life moments.
                    </p>
                  </div>
                  <div className={`hidden lg:flex w-12 h-12 rounded-2xl bg-gradient-to-br ${themeGradient} items-center justify-center shadow-lg`}>
                    <Zap size={22} className="text-white" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onStartSession}
                    className={`flex-1 h-14 rounded-2xl bg-gradient-to-br ${themeGradient} text-white font-extrabold shadow-[0_18px_40px_rgba(230,84,115,0.25)] hover:opacity-95 active:scale-[0.99] transition`}
                  >
                    {completedToday ? "Replay Session" : "Start Session"}
                  </button>
                  <button
                    onClick={onOpenProfile}
                    className="h-14 px-5 rounded-2xl border border-[#EBEBF0] bg-white text-[#1A1A26] font-extrabold shadow-sm hover:bg-[#FAF9FA] transition"
                  >
                    Profile
                  </button>
                </div>
              </div>

              <div className="h-2" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function DashboardPage() {
  const { userDetails, saveUserData } = useUserData();

  const [loading, setLoading] = useState(true);
  const [routineData, setRoutineData] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [greeting, setGreeting] = useState({ text: "Good morning", icon: Sun });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // --- 1. GOOGLE ADS TRIGGER + DELAYED CLEANUP ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("plan") === "monthly") {
        if (window.gtag) {
          window.gtag("event", "conversion", {
            send_to: "AW-17911323675",
            value: 24.99,
            currency: "USD",
            transaction_id: Date.now(),
          });
          console.log("✅ Google Ads Conversion Fired");
        }

        setTimeout(() => {
          const cleanUrl = window.location.pathname;
          window.history.replaceState(null, "", cleanUrl);
        }, 5000);
      }
    }
  }, []);

  // --- 2. Init Data ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting({ text: "Good morning", icon: Sun });
    else if (hour >= 12 && hour < 18) setGreeting({ text: "Good afternoon", icon: CloudSun });
    else setGreeting({ text: "Good evening", icon: Moon });

    if (userDetails) {
      const data = getDailyPlaylist(userDetails.selectedTarget?.title, userDetails.joinDate);
      setRoutineData(data);

      const lastDate = userDetails.lastWorkoutDate ? new Date(userDetails.lastWorkoutDate) : null;
      const today = new Date();
      const isSameDay =
        lastDate && lastDate.getDate() === today.getDate() && lastDate.getMonth() === today.getMonth();

      setCompletedToday(!!isSameDay);
      setStreak(userDetails.streak || 0);
      setLoading(false);
    }
  }, [userDetails]);

  // Actions
  const handleProgressMarked = () => {
    if (completedToday) return;

    setCompletedToday(true);
    const newStreak = streak + 1;
    setStreak(newStreak);

    saveUserData("lastWorkoutDate", new Date().toISOString());
    saveUserData("streak", newStreak);

    if (navigator.vibrate) navigator.vibrate(50);
  };

  if (loading) {
    return <div className="w-full h-[100dvh] bg-[#FAF9FA]" />;
  }

  const userGoal = userDetails?.selectedTarget?.title || "Core Strength";
  const userName = userDetails?.name || "Friend";

  const getTheme = () => {
    const g = userGoal.toLowerCase();
    if (g.includes("intimacy")) return { gradient: THEME.gradients.intimacy, color: THEME.colors.intimacy };
    if (g.includes("leak")) return { gradient: THEME.gradients.leaks, color: THEME.colors.leaks };
    if (g.includes("postpartum")) return { gradient: THEME.gradients.postpartum, color: THEME.colors.postpartum };
    if (g.includes("core")) return { gradient: THEME.gradients.core, color: THEME.colors.core };
    return { gradient: THEME.gradients.default, color: THEME.colors.default };
  };

  const { gradient: themeGradient, color: themeColor } = getTheme();
  const previewVideoUrl = routineData?.videos?.[0]?.url;

  return (
    <div className="min-h-screen md:h-[100dvh] bg-[#FAF9FA] overflow-x-hidden relative md:overflow-hidden">
      {/* Player Overlay */}
      {showPlayer && routineData && (
        <DailyRoutinePlayer
          playlist={routineData.videos}
          onClose={() => setShowPlayer(false)}
          onProgressMarked={handleProgressMarked}
        />
      )}

      {/* Profile Modal Overlay */}
      {showProfileModal && (
        <ProfileSettingsModal
          onClose={() => setShowProfileModal(false)}
          userName={userName}
          joinDate={userDetails.joinDate}
        />
      )}

      {/* ✅ MOBILE (UNCHANGED) */}
      <div className="md:hidden min-h-screen bg-[#FAF9FA] pb-32 overflow-x-hidden relative">
        <div className="h-6" />
        <div className="px-6 pt-8 pb-4 space-y-8 max-w-md mx-auto">
          <DashboardHeader name={userName} greeting={greeting} onProfileClick={() => setShowProfileModal(true)} />

          <DailyRoutineCard
            routineData={routineData}
            userGoal={userGoal}
            themeGradient={themeGradient}
            themeColor={themeColor}
            completedToday={completedToday}
            previewVideoUrl={previewVideoUrl}
            onClick={() => setShowPlayer(true)}
            variant="mobile"
          />

          <StreakWidget streak={streak} completedToday={completedToday} />

          <WeeklyProgressGraph streak={streak} goalColor={themeColor} isTodayDone={completedToday} />

          <CoachTipCard goalColor={themeColor} userGoal={userGoal} />

          <div className="pt-4">
            <DownloadAppCard />
          </div>
        </div>
      </div>

      {/* ✅ DESKTOP (NEW “million-dollar” split shell) */}
      <DesktopDashboardShell
        userName={userName}
        userGoal={userGoal}
        greeting={greeting}
        routineData={routineData}
        streak={streak}
        completedToday={completedToday}
        themeColor={themeColor}
        themeGradient={themeGradient}
        previewVideoUrl={previewVideoUrl}
        onStartSession={() => setShowPlayer(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />
    </div>
  );
}
