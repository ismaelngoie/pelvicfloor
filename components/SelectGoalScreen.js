"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, Activity, Zap, Droplets, HeartHandshake, Heart, Dumbbell, CheckCircle2 
} from 'lucide-react'; 

// --- UNIFIED ROSE THEME (Applied to ALL) ---
const THEME = {
  unselected: "bg-rose-50 border-rose-100 text-rose-400",
  selected: "bg-white border-rose-500 text-rose-500 shadow-xl shadow-rose-200 scale-[1.05] z-50",
  iconUnselected: "text-rose-400",
  iconSelected: "text-rose-500 scale-110",
};

// --- DATA (Intimacy #1, Leaks #2) ---
const goals = [
  { id: 'intimacy', title: "Improve Intimacy", icon: <Heart size={28} strokeWidth={2} /> },
  { id: 'leaks', title: "Stop Bladder Leaks", icon: <Droplets size={28} strokeWidth={2} /> },
  { id: 'pregnancy', title: "Prepare for Pregnancy", icon: <Baby size={28} strokeWidth={2} /> },
  { id: 'postpartum', title: "Recover Postpartum", icon: <Activity size={28} strokeWidth={2} /> },
  { id: 'core', title: "Build Core Strength", icon: <Zap size={28} strokeWidth={2} /> },
  { id: 'pain', title: "Ease Pelvic Pain", icon: <HeartHandshake size={28} strokeWidth={2} /> },
  { id: 'fitness', title: "Support My Fitness", icon: <Dumbbell size={28} strokeWidth={2} /> },
  { id: 'stability', title: "Boost Stability", icon: <Activity size={28} strokeWidth={2} /> },
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(userDetails.selectedTarget?.id || null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  return (
    <div className="w-full h-full flex flex-col px-5 pt-8 pb-6 animate-fade-in relative bg-white/50">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-rose-100 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <div className="z-10 mb-2 shrink-0">
        <h1 className="text-[26px] font-extrabold text-center text-app-textPrimary mb-1 leading-tight">
          Let's set your primary goal.
        </h1>
        <p className="text-center text-app-textSecondary text-[14px] leading-snug px-4 font-medium">
          This is the most important step. Your choice will shape every workout.
        </p>
      </div>

      {/* Grid Container (Flex-1 ensures it takes available space) */}
      <div className="z-10 flex-1 min-h-0 flex flex-col justify-center"> 
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
                  ${isSelected ? THEME.selected : `border-rose-100 bg-rose-50/50 hover:bg-rose-50 z-10`}
                `}
              >
                {/* Background Tint for Unselected */}
                {!isSelected && (
                  <div className="absolute inset-0 rounded-[22px] bg-rose-50 opacity-40 pointer-events-none" />
                )}

                {/* Checkmark Badge */}
                <div 
                  className={`absolute top-2 right-2 transition-all duration-300 transform ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  <CheckCircle2 size={20} className="fill-rose-500 text-white" />
                </div>

                {/* Icon */}
                <div className={`mb-2 transition-all duration-300 ${isSelected ? THEME.iconSelected : THEME.iconUnselected}`}>
                   {goal.icon}
                </div>

                {/* Title */}
                <span className={`text-[13px] font-bold text-center leading-tight transition-colors duration-300 ${isSelected ? 'text-app-textPrimary' : 'text-rose-400'}`}>
                  {goal.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="z-20 mt-2 shrink-0">
        <button 
          onClick={onNext}
          disabled={!selectedId}
          className={`w-full h-14 font-bold text-[18px] rounded-full transition-all duration-300 shadow-xl
            ${selectedId 
              ? 'bg-app-primary text-white shadow-app-primary/30 animate-breathe active:scale-95 transform' 
              : 'bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed shadow-none'}
          `}
        >
          Set My Goal
        </button>
      </div>
    </div>
  );
}
