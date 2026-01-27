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

// --- FIXED WEEKLY GRAPH ---
const WeeklyProgressGraph = ({ streak, goalColor, isTodayDone }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const [todayIndex, setTodayIndex] = useState(-1);

  useEffect(() => {
    // Calculate today (0=Mon ... 6=Sun)
    let current = new Date().getDay() - 1; 
    if (current === -1) current = 6; 
    setTodayIndex(current);
  }, []);
  
  return (
    <div className="bg-white rounded-3xl p-5 border border-[#EBEBF0] shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#1A1A26] text-sm">This Week's Activity</h3>
        <span className="text-[10px] font-semibold bg-[#FAF9FA] text-[#737380] px-2 py-1 rounded-full border border-[#EBEBF0]">
          {streak} Day Streak
        </span>
      </div>
      <div className="flex justify-between h-24 gap-2 items-stretch">
  {days.map((day, idx) => {
  if (todayIndex === -1) return null;

  // streak ends today if done, otherwise ends yesterday
  const end = isTodayDone ? todayIndex : todayIndex - 1;

  // If end is before Monday (e.g., it's Monday and not done), nothing to show in this week
  if (end < 0) {
    const barColor = "#EBEBF0";
    return (
      <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full">
        <div className="w-full flex-1 flex items-end justify-center rounded-lg bg-[#FAF9FA] overflow-hidden relative">
          <div className="w-2 rounded-full transition-all duration-700 ease-out" style={{ height: "15%", backgroundColor: barColor }} />
        </div>
        <span className={`text-[10px] font-bold ${idx === todayIndex ? 'text-[#1A1A26]' : 'text-[#737380]'}`}>{day}</span>
      </div>
    );
  }

  // Fill last `streak` days up to `end`
  const start = end - (streak - 1);
  const isActive = streak > 0 && idx >= start && idx <= end;

  const height = isActive ? "80%" : "15%";
  const barColor = isActive ? goalColor : "#EBEBF0";

  return (
    <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full">
      <div className="w-full flex-1 flex items-end justify-center rounded-lg bg-[#FAF9FA] overflow-hidden relative">
        <div className="w-2 rounded-full transition-all duration-700 ease-out" style={{ height, backgroundColor: barColor }} />
      </div>
      <span className={`text-[10px] font-bold ${idx === todayIndex ? 'text-[#1A1A26]' : 'text-[#737380]'}`}>{day}</span>
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

const DownloadAppCard = () => {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-[#1A1A26] p-6 text-white shadow-2xl animate-slide-up" style={{ animationDelay: '500ms' }}>
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-40"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-pink-500 rounded-full blur-[60px] opacity-40"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg border border-white/10">
            {/* USE ACTUAL APP ICON HERE */}
            <img src="/logo.png" alt="App Logo" className="w-8 h-8 object-contain" />
          </div>
          <h3 className="text-lg font-bold">Get the Full Experience</h3>
        </div>
        
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Unlock <strong>smart reminders</strong>, <strong>offline mode</strong>, and <strong>haptic guidance</strong> by downloading the official app. Your progress syncs automatically.
        </p>

        <div className="flex flex-col gap-3">
          {/* iOS Button */}
          <a 
            href="https://apps.apple.com/us/app/pelvic-floor-core-coach/id6642654729" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-white text-[#1A1A26] rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.4 1.83.2 2.91 1.25 3.6 2.2-2.92 1.88-2.39 5.86.48 7.03-.64 1.84-1.68 3.59-3.53 4.4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.16 2.29-1.87 4.29-3.74 4.25z"/></svg>
            <span>Download on iOS</span>
          </a>

          {/* Android Button */}
          <button 
            disabled 
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-white/10 text-gray-400 rounded-xl font-bold border border-white/10 cursor-not-allowed"
          >
             <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.14L3.84,2.15C3.84,2.15 6.05,2.66 6.05,2.66Z" /></svg>
            <span>Android Coming Soon</span>
          </button>
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

  // Init
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

    // Instant Update for Graph and Streak
    setCompletedToday(true);
    const newStreak = streak + 1;
    setStreak(newStreak);

    // Persist
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
               
               {/* 1. Video Preview (Visible if NOT complete) */}
               {!completedToday && previewVideoUrl ? (
                   <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden shadow-md">
                      <VideoPreview url={previewVideoUrl} />
                      <svg className="absolute inset-0 w-full h-full rotate-[-90deg] z-10">
                        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
                        <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="4" fill="none" strokeDasharray="175.9" strokeDashoffset="175.9" strokeLinecap="round" />
                      </svg>
                   </div>
               ) : (
                   /* 2. Standard Ring */
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

               {/* Play Button */}
               <div className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center z-20 ${completedToday ? 'hidden' : ''}`}>
                   <Play size={12} className="text-white fill-white ml-0.5" />
               </div>

               {/* Checkmark */}
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

        {/* Graph (Fixed) */}
        <WeeklyProgressGraph streak={streak} goalColor={themeColor} isTodayDone={completedToday} />

        {/* Tips */}
        <CoachTipCard goalColor={themeColor} userGoal={userGoal} />

        {/* Download App */}
        <div className="pt-4">
          <DownloadAppCard />
        </div>

      </div>
    </div>
  );
}
