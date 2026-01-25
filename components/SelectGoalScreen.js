"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, Activity, Zap, Droplets, HeartHandshake, Heart, Dumbbell, CheckCircle2 
} from 'lucide-react'; 

// --- DATA & THEME CONFIGURATION ---
const goals = [
  // 1. Intimacy
  { 
    id: 'intimacy', 
    title: "Improve Intimacy", 
    icon: <Heart size={32} strokeWidth={1.8} />,
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
    selectedBorder: "border-rose-500",
    glow: "shadow-rose-200"
  },
  // 2. Leaks (Moved Here)
  { 
    id: 'leaks', 
    title: "Stop Bladder Leaks", 
    icon: <Droplets size={32} strokeWidth={1.8} />,
    color: "text-cyan-500",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
    selectedBorder: "border-cyan-500",
    glow: "shadow-cyan-200"
  },
  // 3. Pregnancy
  { 
    id: 'pregnancy', 
    title: "Prepare for Pregnancy", 
    icon: <Baby size={32} strokeWidth={1.8} />,
    color: "text-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
    selectedBorder: "border-violet-500",
    glow: "shadow-violet-200"
  },
  // 4. Postpartum
  { 
    id: 'postpartum', 
    title: "Recover Postpartum", 
    icon: <Activity size={32} strokeWidth={1.8} />,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
    selectedBorder: "border-blue-500",
    glow: "shadow-blue-200"
  },
  // 5. Core
  { 
    id: 'core', 
    title: "Build Core Strength", 
    icon: <Zap size={32} strokeWidth={1.8} />,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    selectedBorder: "border-amber-500",
    glow: "shadow-amber-200"
  },
  // 6. Pain
  { 
    id: 'pain', 
    title: "Ease Pelvic Pain", 
    icon: <HeartHandshake size={32} strokeWidth={1.8} />,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    selectedBorder: "border-emerald-500",
    glow: "shadow-emerald-200"
  },
  // 7. Fitness
  { 
    id: 'fitness', 
    title: "Support My Fitness", 
    icon: <Dumbbell size={32} strokeWidth={1.8} />,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    selectedBorder: "border-indigo-500",
    glow: "shadow-indigo-200"
  },
  // 8. Stability
  { 
    id: 'stability', 
    title: "Boost Stability", 
    icon: <Activity size={32} strokeWidth={1.8} />,
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    selectedBorder: "border-slate-600",
    glow: "shadow-slate-300"
  },
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(userDetails.selectedTarget?.id || null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  // Find the color of the selected item to style the "Next" button dynamically
  const selectedGoal = goals.find(g => g.id === selectedId);

  return (
    <div className="w-full h-full flex flex-col pt-8 px-5 pb-6 animate-fade-in relative bg-white/50">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-blue-200 rounded-full blur-[80px]" />
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
                    : `bg-white ${goal.border} hover:bg-opacity-80 z-10 opacity-90 grayscale-[0.3]`}
                `}
              >
                {/* Subtle Background Tint */}
                <div className={`absolute inset-0 rounded-[26px] opacity-20 ${goal.bg} pointer-events-none`} />

                {/* Checkmark Badge */}
                <div 
                  className={`absolute top-3 right-3 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
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
