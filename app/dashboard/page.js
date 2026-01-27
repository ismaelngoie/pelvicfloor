"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Sun, CloudSun, Moon, Flame, ChevronRight, Play, RotateCw, 
  Trophy, Calendar, Zap, Activity, Info, Heart, Droplets
} from 'lucide-react';

import DailyRoutinePlayer from '@/components/DailyRoutinePlayer';
import { getDailyPlaylist } from '@/utils/dailyLogic';

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
    default: "#E65473"
  }
};

const GOAL_TIPS = {
  "intimacy": [
    { icon: Heart, text: "Relaxation is key. Focus on 'letting go' on the inhale." },
    { icon: Zap, text: "Stronger pelvic tone increases sensation and blood flow." }
  ],
  "leak": [
    { icon: Droplets, text: "Try the 'Knack': Squeeze before you cough or sneeze." },
    { icon: Activity, text: "Consistency builds the 'seal' that stops leaks." }
  ],
  "postpartum": [
    { icon: Trophy, text: "Be patient. You are rebuilding your foundation safely." },
    { icon: Info, text: "Avoid 'coning' in your belly. Keep movements gentle." }
  ],
  "default": [
    { icon: Zap, text: "Consistency is your superpower. Small efforts compound." },
    { icon: Activity, text: "You are building a foundation for lifelong health." }
  ]
};

// --- SUBCOMPONENTS ---

const DashboardHeader = ({ name, greeting }) => {
  const Icon = greeting.icon;
  const [liveCount, setLiveCount] = useState(124);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
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
        <div className="flex items-center gap-2 mt-1.5 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
           <div className="relative w-2 h-2">
             <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
             <div className="relative w-2 h-2 bg-green-500 rounded-full"></div>
           </div>
           <span className="text-xs font-medium text-[#737380]">Live: {liveCount} members online</span>
        </div>
      </div>
      <button className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-white group relative">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
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

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
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
      style={{ transform: 'scale(1.2)' }}
    />
  );
};

// --- WEEKLY GRAPH COMPONENT (FIXED) ---
const WeeklyProgressGraph = ({ streak, goalColor, isTodayDone }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const [historyData, setHistoryData] = useState(Array(7).fill(false));
  const [activeDayIndex, setActiveDayIndex] = useState(-1);

  useEffect(() => {
    // 1. Determine "Today" strictly on client side to avoid hydration mismatch
    // (0=Mon, 1=Tue... 6=Sun)
    let today = new Date().getDay() - 1; 
    if (today === -1) today = 6; 
    setActiveDayIndex(today);

    // 2. Generate static history for previous days (Visual only)
    const history = Array(7).fill(0).map((_, i) => i < today && Math.random() > 0.4);
    setHistoryData(history);
  }, []);
  
  return (
    <div className="bg-white rounded-3xl p-5 border border-[#EBEBF0] shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#1A1A26] text-sm">This Week's Activity</h3>
        <span className="text-[10px] font-semibold bg-[#FAF9FA] text-[#737380] px-2 py-1 rounded-full border border-[#EBEBF0]">
          {streak} Day Streak
        </span>
      </div>
      
      <div className="flex justify-between items-end h-24 gap-2">
        {days.map((day, idx) => {
          const isToday = idx === activeDayIndex;
          
          // Strict Logic:
          // If it is today -> Use the `isTodayDone` prop passed from Dashboard
          // If it is past -> Use the random history data
          const isActive = isToday ? isTodayDone : historyData[idx];
          
          const height = isActive ? "80%" : "15%";
          const barColor = isActive ? goalColor : "#EBEBF0";
          
          return (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-full h-full flex items-end justify-center rounded-lg bg-[#FAF9FA] overflow-hidden relative">
                <div 
                  className="w-2 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    height: height, 
                    backgroundColor: barColor 
                  }}
                />
              </div>
              <span className={`text-[10px] font-bold ${isToday ? 'text-[#1A1A26]' : 'text-[#737380]'}`}>
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
  
  const getTips = () => {
      const g = (userGoal || "").toLowerCase();
      if (g.includes("intimacy")) return GOAL_TIPS.intimacy;
      if (g.includes("leak")) return GOAL_TIPS.leak;
      if (g.includes("postpartum")) return GOAL_TIPS.postpartum;
      return GOAL_TIPS.default;
  };
  const tips = getTips();

  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % tips.length), 8000);
    return () => clearInterval(timer);
  }, [tips]);

  const Tip = tips[index];
  const Icon = Tip.icon;

  return (
    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-[#EBEBF0] animate-slide-up" style={{ animationDelay: '400ms' }}>
       <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${goalColor}20` }}>
          <Icon size={20} style={{ color: goalColor }} />
       </div>
       <div className="flex-1">
          <p className="text-xs font-bold text-[#737380] uppercase tracking-wide mb-0.5">Coach Tip</p>
          <p className="text-sm font-medium text-[#1A1A26] leading-snug animate-fade-in key={index}">
             {Tip.text}
          </p>
       </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function DashboardPage() {
  const { userDetails, saveUserData } = useUserData();
  
  // State
  const [loading, setLoading] = useState(true);
  const [routineData, setRoutineData] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [greeting, setGreeting] = useState({ text: "Good morning", icon: Sun });

  // Init Logic
  useEffect(() => {
    // 1. Time of Day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting({ text: "Good morning", icon: Sun });
    else if (hour >= 12 && hour < 18) setGreeting({ text: "Good afternoon", icon: CloudSun });
    else setGreeting({ text: "Good evening", icon: Moon });

    // 2. Load User Data
    if (userDetails) {
      const data = getDailyPlaylist(userDetails.selectedTarget?.title, userDetails.joinDate);
      setRoutineData(data);
      
      const lastDate = userDetails.lastWorkoutDate ? new Date(userDetails.lastWorkoutDate) : null;
      const today = new Date();
      const isSameDay = lastDate && lastDate.getDate() === today.getDate() && lastDate.getMonth() === today.getMonth();
      
      setCompletedToday(isSameDay);
      setStreak(userDetails.streak || 0);
      setLoading(false);
    }
  }, [userDetails]);

  // Actions
  const handleProgressMarked = () => {
    if (completedToday) return;

    // 🚀 INSTANTLY Update State (Graph fills up, Streak increases)
    setCompletedToday(true);
    const newStreak = streak + 1;
    setStreak(newStreak);

    saveUserData('lastWorkoutDate', new Date().toISOString());
    saveUserData('streak', newStreak);
    
    if (navigator.vibrate) navigator.vibrate(50);
  };

  if (loading) return <div className="w-full h-screen bg-[#FAF9FA]" />;

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
  // Get first video for preview
  const previewVideoUrl = routineData?.videos?.[0]?.url;

  return (
    <div className="min-h-screen bg-[#FAF9FA] pb-32 overflow-x-hidden">
      
      {showPlayer && routineData && (
        <DailyRoutinePlayer 
          playlist={routineData.videos} 
          onClose={() => setShowPlayer(false)}
          onProgressMarked={handleProgressMarked} 
        />
      )}

      <div className="h-6" /> 
      
      <div className="px-6 pt-8 pb-4 space-y-8 max-w-md mx-auto">
        
        {/* Header */}
        <DashboardHeader name={userName} greeting={greeting} />

        {/* Daily Routine Card */}
        <div 
          onClick={() => setShowPlayer(true)}
          className="group w-full relative overflow-hidden rounded-[32px] bg-white border border-[#EBEBF0] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 active:scale-[0.98] animate-slide-up cursor-pointer"
          style={{ animationDelay: '100ms' }}
        >
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
              <h2 className="text-xl font-bold text-[#1A1A26] leading-tight">{routineData?.title}</h2>
              <p className="text-sm text-[#737380] mt-1">Tailored for: <span className="font-semibold text-[#1A1A26]">{userGoal}</span></p>
            </div>
          </div>

          <div className="relative w-full h-16 flex items-center gap-5">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
               
               {/* 1. Video Preview Background (Visible if NOT complete) */}
               {!completedToday && previewVideoUrl ? (
                   <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden shadow-md">
                      <VideoPreview url={previewVideoUrl} />
                      {/* Ring Overlay */}
                      <svg className="absolute inset-0 w-full h-full rotate-[-90deg] z-10">
                        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
                        <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="4" fill="none" strokeDasharray="175.9" strokeDashoffset="175.9" strokeLinecap="round" />
                      </svg>
                   </div>
               ) : (
                   /* 2. Standard Ring (If complete or no video) */
                   <>
                     <svg className="absolute w-full h-full rotate-[-90deg]">
                        <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="6" fill="none" />
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke={`url(#grad-theme)`} 
                          strokeWidth="6" 
                          fill="none" 
                          strokeDasharray="175.9" 
                          strokeDashoffset={completedToday ? 0 : 175.9} 
                          strokeLinecap="round" 
                          className="transition-all duration-[1500ms] ease-out"
                        />
                        <defs>
                          <linearGradient id="grad-theme" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={themeColor} />
                              <stop offset="100%" stopColor={themeColor} stopOpacity="0.6" />
                          </linearGradient>
                        </defs>
                     </svg>
                   </>
               )}

               {/* Play Button Overlay */}
               <div className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center z-20 ${completedToday ? 'hidden' : ''}`}>
                   <Play size={12} className="text-white fill-white ml-0.5" />
               </div>

               {/* Checkmark Overlay (If complete) */}
               {completedToday && (
                 <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeGradient} flex items-center justify-center shadow-lg z-20`}>
                    <RotateCw size={18} className="text-white" />
                 </div>
               )}
            </div>
            
            <div className="flex flex-col justify-center">
              <span className="text-[16px] font-bold text-[#1A1A26] transition-colors">
                {completedToday ? "Session Complete!" : "Start Session"}
              </span>
              <span className="text-[13px] text-[#737380]">
                 {completedToday ? "Great job, come back tomorrow." : "5 Minute Workout"}
              </span>
            </div>

            <div className="ml-auto">
              <div className="w-10 h-10 rounded-full bg-[#FAF9FA] flex items-center justify-center group-hover:bg-[#F3F4F6] transition-colors">
                 <ChevronRight size={20} className="text-[#C7C7CC]" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Streak Widget */}
        <div 
          className="bg-gradient-to-br from-[#1A1A26] to-[#2C2C3E] rounded-[24px] p-5 text-white shadow-xl flex items-center justify-between animate-slide-up" 
          style={{ animationDelay: '200ms' }}
        >
           <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/5 ${completedToday ? 'shadow-[0_0_20px_rgba(251,146,60,0.6)]' : ''}`}>
               <Flame size={24} className={`text-orange-400 fill-orange-400 ${completedToday ? 'animate-pulse' : ''}`} />
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

        {/* Graph */}
        <WeeklyProgressGraph streak={streak} goalColor={themeColor} isTodayDone={completedToday} />

        {/* Tips */}
        <CoachTipCard goalColor={themeColor} userGoal={userGoal} />

      </div>
    </div>
  );
}
