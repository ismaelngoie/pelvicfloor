"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, Activity, Zap, Droplets, HeartHandshake, Heart, Dumbbell, CheckCircle2 
} from 'lucide-react'; 

// --- DATA & THEME CONFIGURATION ---
// Unified "Million Dollar" Rose Theme for all items
const UNIFIED_THEME = {
  color: "text-rose-500",
  bg: "bg-rose-50",
  border: "border-rose-100",
  selectedBorder: "border-rose-500",
  glow: "shadow-rose-200"
};

const goals = [
  // 1. Intimacy
  { 
    id: 'intimacy', 
    title: "Improve Intimacy", 
    icon: <Heart size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 2. Leaks
  { 
    id: 'leaks', 
    title: "Stop Bladder Leaks", 
    icon: <Droplets size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 3. Pregnancy
  { 
    id: 'pregnancy', 
    title: "Prepare for Pregnancy", 
    icon: <Baby size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 4. Postpartum
  { 
    id: 'postpartum', 
    title: "Recover Postpartum", 
    icon: <Activity size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 5. Core
  { 
    id: 'core', 
    title: "Build Core Strength", 
    icon: <Zap size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 6. Pain
  { 
    id: 'pain', 
    title: "Ease Pelvic Pain", 
    icon: <HeartHandshake size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 7. Fitness
  { 
    id: 'fitness', 
    title: "Support My Fitness", 
    icon: <Dumbbell size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
  // 8. Stability
  { 
    id: 'stability', 
    title: "Boost Stability", 
    icon: <Activity size={32} strokeWidth={1.8} />,
    ...UNIFIED_THEME
  },
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(userDetails.selectedTarget?.id || null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  return (
    <div className="w-full h-full flex flex-col pt-8 px-5 pb-6 animate-fade-in relative bg-white/50">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-rose-100 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <div className="z-10 mb-4 shrink-0 relative">
        <h1 className="text-[28px] font-extrabold text-center text-app-textPrimary mb-2 leading-tight tracking-tight">
          Let's set your primary goal.
        </h1>
        <p className="text-center text-app-textSecondary text-[15px] leading-relaxed px-4 font-medium">
          This is the most important step. Your choice will shape every workout.
        </p>
      </div>

      {/* Grid Container */}
      <div className="z-10 flex-1 overflow-y-auto no-scrollbar min-h-0 pt-2 pb-24 px-1"> 
        <div className="grid grid-cols-2 gap-4">
          {goals.map((goal) => {
            const isSelected = selectedId === goal.id;
            
            return (
              <button
                key={goal.id}
                onClick={() => handleSelect(goal)}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-[28px] border-[2px] 
                  transition-all duration-300 ease-out aspect-[1/1] outline-none shadow-sm active:scale-95
                  ${isSelected 
                    ? `bg-white ${goal.selectedBorder} shadow-xl ${goal.glow} scale-[1.05] z-20` 
                    : `bg-white ${goal.border} hover:bg-rose-50/50 z-10`}
                `}
              >
                {/* Subtle Background Tint (Visible on selection, faint otherwise) */}
                <div className={`absolute inset-0 rounded-[26px] transition-opacity duration-300 ${goal.bg} pointer-events-none ${isSelected ? 'opacity-20' : 'opacity-0'}`} />

                {/* Checkmark Badge - Only visible when selected */}
                <div 
                  className={`absolute top-3 right-3 transition-all duration-300 transform ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  <CheckCircle2 size={24} className={`fill-current ${goal.color} text-white`} />
                </div>

                {/* Icon */}
                <div className={`mb-3 transition-all duration-300 transform ${isSelected ? 'scale-110' : 'scale-100'} ${goal.color}`}>
                   {goal.icon}
                </div>

                {/* Title */}
                <span className={`text-[15px] font-bold text-center leading-tight transition-colors duration-300 ${isSelected ? 'text-app-textPrimary' : 'text-app-textSecondary'}`}>
                  {goal.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / CTA - Floating above content */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-8 pt-10 bg-gradient-to-t from-white via-white/95 to-transparent z-[60]">
        <button 
          onClick={onNext}
          disabled={!selectedId}
          className={`w-full h-14 font-bold text-[18px] rounded-full transition-all duration-300 shadow-xl
            ${selectedId 
              ? `bg-app-primary text-white shadow-app-primary/30 animate-breathe active:scale-95 transform` 
              : 'bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed shadow-none'}
          `}
        >
          Set My Goal
        </button>
      </div>
    </div>
  );
}
