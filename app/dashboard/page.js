"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Sun, Moon, CloudSun, Play, RotateCw, 
  Flame, Calendar, ChevronRight, Trophy, 
  Activity, Star, Zap, Lock, Heart, Droplets
} from 'lucide-react';

// --- THEME CONFIG (Matches Swift ColorExtensions) ---
const THEME = {
  primary: '#E65473',
  secondary: '#737380',
  gradients: {
    intimacy: "from-pink-500 to-purple-600",
    leaks: "from-blue-500 to-cyan-500",
    postpartum: "from-green-500 to-teal-500",
    core: "from-orange-500 to-red-500",
    default: "from-[#E65473] to-[#C23A5B]",
  }
};

// --- MARK: 1. Community Pulse (Live Ticker) ---
const CommunityPulse = ({ userGoal }) => {
  const [count, setCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  // Logic ported from Swift CommunityPulseViewModel
  useEffect(() => {
    const updateCount = () => {
      const hour = new Date().getHours();
      let base = 60;
      if ((hour >= 6 && hour <= 9) || (hour >= 18 && hour <= 21)) base = 180;
      else if (hour >= 10 && hour <= 17) base = 100;
      else base = 30;

      const variance = Math.floor(Math.random() * 8) - 3; // -3 to +5
      setCount(prev => (prev === 0 ? base : prev + variance));
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1500);
    };

    updateCount(); // Initial
    const timer = setInterval(updateCount, 7000); // 7s interval
    return () => clearInterval(timer);
  }, []);

  const getActionPhrase = (goal) => {
    const g = (goal || "").toLowerCase();
    if (g.includes("intimacy")) return "improving intimacy";
    if (g.includes("leak")) return "improving control";
    if (g.includes("postpartum")) return "recovering safely";
    return "building core strength";
  };

  return (
    <div className="flex items-center gap-2 mt-1 animate-fade-in">
      <div className="relative flex items-center justify-center w-3.5 h-3.5">
        <div className={`absolute w-full h-full bg-green-500 rounded-full opacity-30 ${isPulsing ? 'animate-ping' : ''}`} />
        <div className="w-2 h-2 bg-green-500 rounded-full" />
      </div>
      <span className="text-xs font-medium text-app-textSecondary">
        Live: <span className="font-bold text-app-textPrimary transition-all duration-500">{count}</span> members {getActionPhrase(userGoal)} right now
      </span>
    </div>
  );
};

// --- MARK: 2. Header Component ---
const DashboardHeader = ({ name, goal }) => {
  const [greeting, setGreeting] = useState({ text: "Good morning", icon: Sun });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting({ text: "Good morning", icon: Sun });
    else if (hour < 18) setGreeting({ text: "Good afternoon", icon: CloudSun });
    else setGreeting({ text: "Good evening", icon: Moon });
  }, []);

  const Icon = greeting.icon;

  return (
    <div className="flex justify-between items-start w-full px-1">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-yellow-500 animate-pulse" />
          <span className="text-sm font-medium text-app-textSecondary">{greeting.text},</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-app-textPrimary tracking-tight">
            {name || "Member"} <span className="inline-block animate-wave origin-bottom-right">👋</span>
          </h1>
        </div>
        <CommunityPulse userGoal={goal} />
      </div>
      
      {/* Profile Avatar with Pulse Ring */}
      <button className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-lg group">
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-400 to-purple-500 opacity-90 group-hover:opacity-100 transition-opacity" />
        <img src="/coachMiaAvatar.png" alt="Profile" className="w-full h-full object-cover p-0.5 rounded-full" />
        <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
      </button>
    </div>
  );
};

// --- MARK: 3. Daily Routine Card (The Hero) ---
const DailyRoutineCard = ({ goal, progress, dayNumber, isChallenge }) => {
  // Determine gradient based on goal
  const getGradient = () => {
    const g = (goal || "").toLowerCase();
    if (g.includes("leak")) return THEME.gradients.leaks;
    if (g.includes("intimacy")) return THEME.gradients.intimacy;
    if (g.includes("postpartum")) return THEME.gradients.postpartum;
    return THEME.gradients.default;
  };

  const gradient = getGradient();
  const isComplete = progress >= 100;

  return (
    <div className="w-full relative overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] active:scale-[0.98]">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isChallenge ? <Star size={16} className="text-yellow-500 fill-yellow-500" /> : <Flame size={16} className="text-orange-500 fill-orange-500" />}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {isChallenge ? "Active Challenge" : "Daily Plan"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">
            {isChallenge ? `Day ${dayNumber}: Deep Activation` : "Today's 5-Minute Routine"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Tailored for: <span className="font-semibold text-gray-800">{goal}</span></p>
        </div>
      </div>

      {/* Interactive Player Area */}
      <div className="relative w-full h-16 flex items-center gap-4">
        
        {/* Progress Circle & Play Button */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="absolute w-full h-full rotate-[-90deg]">
            <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="6" fill="none" />
            <circle 
              cx="32" cy="32" r="28" 
              stroke="url(#progressGradient)" 
              strokeWidth="6" 
              fill="none" 
              strokeDasharray="175.9" 
              strokeDashoffset={175.9 - (175.9 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E65473" />
                <stop offset="100%" stopColor="#C23A5B" />
              </linearGradient>
            </defs>
          </svg>

          {/* Play Icon (Pulsing) */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-pink-200 z-10 ${!isComplete ? 'animate-breathe' : ''}`}>
            {isComplete ? (
              <RotateCw size={18} className="text-white" />
            ) : (
              <Play size={18} className="text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="flex flex-col justify-center">
          <span className="text-base font-bold text-gray-900">
            {isComplete ? "Session Complete! 🎉" : "Start Your Session"}
          </span>
          <span className="text-sm text-gray-500">
            {isComplete ? "Great work today." : `${Math.floor(progress)}% completed • 5 mins`}
          </span>
        </div>

        {/* Action Chevron */}
        <div className="ml-auto">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
             <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MARK: 4. Pathway Card (The Upsell/Next Step) ---
const PathwayCard = ({ goal, onTap }) => {
  // Mapping logic from Swift
  const config = useMemo(() => {
    const g = (goal || "").toLowerCase();
    if (g.includes("intimacy")) return { title: "7-Day Intimacy Boost", icon: Heart, color: "bg-rose-50 border-rose-100", iconColor: "text-rose-500" };
    if (g.includes("leak")) return { title: "7-Day Leakproof Seal", icon: Droplets, color: "bg-blue-50 border-blue-100", iconColor: "text-blue-500" };
    if (g.includes("postpartum")) return { title: "7-Day Postpartum Restore", icon: Activity, color: "bg-teal-50 border-teal-100", iconColor: "text-teal-500" };
    return { title: "7-Day Core Challenge", icon: Zap, color: "bg-orange-50 border-orange-100", iconColor: "text-orange-500" };
  }, [goal]);

  const Icon = config.icon;

  return (
    <button onClick={onTap} className={`w-full flex items-center p-4 rounded-2xl border ${config.color} mb-6 transition-transform active:scale-95 text-left`}>
      <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm mr-4 shrink-0`}>
        <Icon size={24} className={config.iconColor} />
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-bold text-gray-900">{config.title}</h3>
        <p className="text-xs text-gray-500 leading-tight mt-0.5">Recommended based on your goal.</p>
      </div>
      <Lock size={16} className="text-gray-400" />
    </button>
  );
};

// --- MARK: 5. Stats Graph (Simplified from Swift) ---
const ProgressGraph = () => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  // Random data for visual
  const data = [0.2, 0.8, 1.0, 0.4, 1.2, 0.0, 0.0]; 
  const currentDayIndex = new Date().getDay() - 1; // 0-6

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900">This Week</h3>
        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Week</span>
      </div>
      
      <div className="flex justify-between items-end h-32 gap-2">
        {data.map((value, idx) => {
          const isToday = idx === (currentDayIndex < 0 ? 6 : currentDayIndex);
          const height = Math.max(10, value * 100);
          
          return (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
              <div className="relative w-full flex items-end justify-center h-full">
                <div 
                  className={`w-full max-w-[12px] rounded-full transition-all duration-1000 ease-out relative
                    ${isToday ? 'bg-gradient-to-t from-pink-500 to-purple-500' : 'bg-gray-100 group-hover:bg-pink-200'}
                  `}
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on Hover */}
                  {value > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {Math.floor(value * 100)}%
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-bold ${isToday ? 'text-pink-500' : 'text-gray-400'}`}>
                {days[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MARK: 6. Streak Widget ---
const StreakWidget = () => (
  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 text-white shadow-lg shadow-gray-200 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
        <Flame size={24} className="text-orange-400 fill-orange-400 animate-pulse" />
      </div>
      <div>
        <h4 className="font-bold text-lg">3 Day Streak</h4>
        <p className="text-xs text-gray-400">You're on fire! Keep it up.</p>
      </div>
    </div>
    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
      <ChevronRight size={16} className="text-gray-400" />
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function DashboardPage() {
  const { userDetails } = useUserData();
  const [loading, setLoading] = useState(true);

  // Simulate data load
  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="w-full h-screen bg-app-background" />;

  const userGoal = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Friend";

  return (
    <div className="min-h-screen bg-app-background pb-24">
      {/* Top Padding for Safe Area */}
      <div className="h-6" />
      
      <div className="px-5 pt-6 pb-2 space-y-8 max-w-md mx-auto">
        
        {/* Header */}
        <section className="animate-slide-up" style={{ animationDelay: '0ms' }}>
          <DashboardHeader name={userName} goal={userGoal} />
        </section>

        {/* Dynamic Pathway Card (If relevant) */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
           {/* Logic: If no active challenge, show recommendation */}
           <PathwayCard goal={userGoal} onTap={() => console.log("Start Pathway")} />
        </section>

        {/* Main Daily Routine */}
        <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <DailyRoutineCard 
            goal={userGoal} 
            progress={35} // Hardcoded for demo, normally from context
            dayNumber={1}
            isChallenge={false} 
          />
        </section>

        {/* Streak */}
        <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <StreakWidget />
        </section>

        {/* Stats */}
        <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <ProgressGraph />
        </section>

      </div>
    </div>
  );
}
