"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { Sun, CloudSun, Moon, Flame, ChevronRight, Play, RotateCw } from 'lucide-react';

// --- IMPORTS ---
import DailyRoutinePlayer from '@/components/DailyRoutinePlayer';
import { getDailyPlaylist } from '@/utils/dailyLogic'; // Logic we created above

// --- THEME ---
const THEME = {
  gradients: {
    intimacy: "from-pink-500 to-purple-600",
    leaks: "from-blue-500 to-cyan-500",
    postpartum: "from-green-500 to-teal-500",
    default: "from-[#E65473] to-[#C23A5B]",
  }
};

export default function DashboardPage() {
  const { userDetails } = useUserData();
  const [loading, setLoading] = useState(true);
  const [routineData, setRoutineData] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  
  // Calculate Time of Day Greeting
  const [greeting, setGreeting] = useState({ text: "Good morning", icon: Sun });
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting({ text: "Good morning", icon: Sun });
    else if (hour < 18) setGreeting({ text: "Good afternoon", icon: CloudSun });
    else setGreeting({ text: "Good evening", icon: Moon });
  }, []);

  // Calculate Routine based on User Goal & Join Date
  useEffect(() => {
    if (userDetails) {
      const data = getDailyPlaylist(userDetails.selectedTarget?.title, userDetails.joinDate);
      setRoutineData(data);
      setLoading(false);
    }
  }, [userDetails]);

  if (loading) return <div className="w-full h-screen bg-[#FAF9FA]" />;

  const userGoal = userDetails?.selectedTarget?.title || "Core Strength";
  const userName = userDetails?.name || "Friend";
  const Icon = greeting.icon;

  // Determine gradient
  const getGradient = () => {
    const g = userGoal.toLowerCase();
    if (g.includes("leak")) return THEME.gradients.leaks;
    if (g.includes("intimacy")) return THEME.gradients.intimacy;
    if (g.includes("postpartum")) return THEME.gradients.postpartum;
    return THEME.gradients.default;
  };

  return (
    <div className="min-h-screen bg-[#FAF9FA] pb-24 overflow-hidden">
      
      {/* Player Modal */}
      {showPlayer && (
        <DailyRoutinePlayer 
          playlist={routineData.videos} 
          onClose={() => setShowPlayer(false)} 
        />
      )}

      <div className="h-6" /> {/* Safe Area */}

      <div className="px-5 pt-6 pb-2 space-y-8 max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start animate-slide-up">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <Icon size={16} className="text-yellow-500 animate-pulse" />
               <span className="text-sm font-medium text-[#737380]">{greeting.text},</span>
             </div>
             <h1 className="text-2xl font-extrabold text-[#1A1A26] tracking-tight">
               {userName} <span className="inline-block animate-wave">👋</span>
             </h1>
             <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-[#737380]">Live: 124 members online</span>
             </div>
           </div>
           <button className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-white">
             <img src="/coachMiaAvatar.png" className="w-full h-full object-cover" alt="Profile" />
           </button>
        </div>

        {/* Main Daily Routine Card */}
        <div 
          onClick={() => setShowPlayer(true)}
          className="w-full relative overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 active:scale-[0.98] animate-slide-up"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame size={16} className="text-orange-500 fill-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {routineData.isChallenge ? "Active Challenge" : "Daily Maintenance"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{routineData.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Tailored for: <span className="font-semibold text-gray-800">{userGoal}</span></p>
            </div>
          </div>

          <div className="relative w-full h-16 flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
               {/* Static Ring for visual */}
               <svg className="absolute w-full h-full rotate-[-90deg]">
                  <circle cx="32" cy="32" r="28" stroke="#F3F4F6" strokeWidth="6" fill="none" />
                  <circle cx="32" cy="32" r="28" stroke={`url(#grad-${userGoal})`} strokeWidth="6" fill="none" strokeDasharray="175.9" strokeDashoffset="175.9" strokeLinecap="round" />
                  <defs><linearGradient id={`grad-${userGoal}`}><stop offset="0%" stopColor="#E65473" /><stop offset="100%" stopColor="#C23A5B" /></linearGradient></defs>
               </svg>
               <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient()} flex items-center justify-center shadow-lg z-10 animate-breathe`}>
                  <Play size={18} className="text-white fill-white ml-0.5" />
               </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-base font-bold text-gray-900">Start Session</span>
              <span className="text-sm text-gray-500">5 mins • {routineData.videos.length} Exercises</span>
            </div>
            <div className="ml-auto">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                 <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Streak Widget */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between animate-slide-up" style={{ animationDelay: '200ms' }}>
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
               <Flame size={24} className="text-orange-400 fill-orange-400 animate-pulse" />
             </div>
             <div>
               <h4 className="font-bold text-lg">0 Day Streak</h4>
               <p className="text-xs text-gray-400">Start your journey today!</p>
             </div>
           </div>
           <ChevronRight size={16} className="text-gray-400" />
        </div>

      </div>
    </div>
  );
}
