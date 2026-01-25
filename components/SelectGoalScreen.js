"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, Activity, Zap, Droplets, HeartHandshake, Heart, Dumbbell, CheckCircle2 
} from 'lucide-react'; 

// Mapped Data - Intimacy First!
const goals = [
  { id: 'intimacy', title: "Improve Intimacy", icon: <Heart size={32} strokeWidth={1.5} /> }, // Moved to #1
  { id: 'leaks', title: "Stop Bladder Leaks", icon: <Droplets size={32} strokeWidth={1.5} /> },
  { id: 'pregnancy', title: "Prepare for Pregnancy", icon: <Baby size={32} strokeWidth={1.5} /> },
  { id: 'postpartum', title: "Recover Postpartum", icon: <Activity size={32} strokeWidth={1.5} /> },
  { id: 'core', title: "Build Core Strength", icon: <Zap size={32} strokeWidth={1.5} /> },
  { id: 'pain', title: "Ease Pelvic Pain", icon: <HeartHandshake size={32} strokeWidth={1.5} /> },
  { id: 'fitness', title: "Support My Fitness", icon: <Dumbbell size={32} strokeWidth={1.5} /> },
  { id: 'stability', title: "Boost Stability", icon: <Activity size={32} strokeWidth={1.5} /> },
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(userDetails.selectedTarget?.id || null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  return (
    <div className="w-full h-full flex flex-col pt-10 px-6 pb-8 animate-fade-in relative bg-app-background/50">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header - High Z-Index to prevent overlapping */}
      <div className="z-30 mb-6 shrink-0 relative bg-app-background/80 backdrop-blur-sm py-2">
        <h1 className="text-[26px] font-extrabold text-center text-app-textPrimary mb-2 leading-tight">
          Let's set your primary goal.
        </h1>
        <p className="text-center text-app-textSecondary text-[15px] leading-relaxed px-2 font-medium">
          This is the most important step. Your choice will shape every workout.
        </p>
      </div>

      {/* Grid Container */}
      <div className="z-10 flex-1 overflow-y-auto no-scrollbar min-h-0 pt-2 pb-20"> {/* Extra bottom padding */}
        <div className="grid grid-cols-2 gap-4">
          {goals.map((goal) => {
            const isSelected = selectedId === goal.id;
            
            return (
              <button
                key={goal.id}
                onClick={() => handleSelect(goal)}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-[28px] border-[2px] 
                  transition-all duration-300 aspect-[1/1] active:scale-95 outline-none shadow-sm
                  ${isSelected 
                    ? 'border-app-primary bg-white shadow-2xl shadow-app-primary/20 scale-[1.05] -translate-y-2 z-20' // Lift Up Effect
                    : 'border-app-borderIdle bg-white hover:border-app-borderIdle/80 z-10'}
                `}
              >
                {/* Selected State: Inner Glow */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-app-primary/5 to-transparent pointer-events-none" />
                )}

                {/* Checkmark Badge */}
                <div 
                  className={`absolute top-3 right-3 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  {/* Solid Fill Icon */}
                  <CheckCircle2 size={26} className="fill-app-primary text-white" />
                </div>

                {/* Icon */}
                <div className={`mb-3 transition-colors duration-300 ${isSelected ? 'text-app-primary' : 'text-app-textPrimary/80'}`}>
                   {goal.icon}
                </div>

                {/* Title */}
                <span className={`text-[15px] font-bold text-center leading-tight transition-colors duration-300 ${isSelected ? 'text-app-primary' : 'text-app-textPrimary'}`}>
                  {goal.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / CTA - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-8 pt-6 bg-gradient-to-t from-app-background via-app-background/95 to-transparent z-40">
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
