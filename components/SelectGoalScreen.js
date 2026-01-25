"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, 
  Activity, 
  Zap, 
  Droplets, 
  Heart, 
  Trophy, 
  Accessibility, 
  CheckCircle2 
} from 'lucide-react'; // High-quality SF Symbol equivalents

// Mapped Data: Exact match to Swift "OptionsType.selectGoals()"
const goals = [
  { id: 'pregnancy', title: "Prepare for Pregnancy", icon: <Baby size={32} /> },
  { id: 'postpartum', title: "Recover Postpartum", icon: <Activity size={32} /> }, // Closest to 'figure.baby' concept
  { id: 'core', title: "Build Core Strength", icon: <Zap size={32} /> }, // 'bolt.fill'
  { id: 'leaks', title: "Stop Bladder Leaks", icon: <Droplets size={32} /> }, // 'drop.fill'
  { id: 'pain', title: "Ease Pelvic Pain", icon: <Accessibility size={32} /> }, // 'bandage.fill' / accessibility represents care
  { id: 'intimacy', title: "Improve Intimacy", icon: <Heart size={32} /> }, // 'heart.fill'
  { id: 'fitness', title: "Support My Fitness", icon: <Trophy size={32} /> }, // 'figure.run' -> Trophy for goals
  { id: 'stability', title: "Boost Stability", icon: <Activity size={32} /> }, // 'figure.stand'
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData } = useUserData();
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  return (
    <div className="w-full h-full flex flex-col pt-10 px-6 pb-8 animate-fade-in relative">
      
      {/* Background Spotlights (Static decoration) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="z-10 mb-6 shrink-0">
        <h1 className="text-[26px] font-extrabold text-center text-app-textPrimary mb-3 leading-tight">
          Let's set your primary goal.
        </h1>
        <p className="text-center text-app-textSecondary text-[15px] leading-relaxed px-2">
          This is the most important step. Your choice will shape every workout.
        </p>
      </div>

      {/* Grid Container - Scrollable if screen is small */}
      <div className="z-10 flex-1 overflow-y-auto no-scrollbar pb-4 min-h-0">
        <div className="grid grid-cols-2 gap-4 auto-rows-fr">
          {goals.map((goal) => {
            const isSelected = selectedId === goal.id;
            
            return (
              <div
                key={goal.id}
                onClick={() => handleSelect(goal)}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-[24px] border-[1.5px] 
                  transition-all duration-300 cursor-pointer aspect-square shadow-sm active:scale-95
                  ${isSelected 
                    ? 'border-app-primary bg-white shadow-xl shadow-app-primary/15 scale-[1.02] z-10' 
                    : 'border-app-borderIdle bg-white hover:border-app-borderIdle/80'}
                `}
              >
                {/* "Spotlight" Gradient Background for Selected State */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-app-primary/5 to-transparent pointer-events-none" />
                )}

                {/* Checkmark Badge */}
                <div 
                  className={`absolute top-3 right-3 text-app-primary transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  <CheckCircle2 size={22} fill="currentColor" className="text-white" />
                </div>

                {/* Icon */}
                <div className={`mb-4 transition-colors duration-300 ${isSelected ? 'text-app-primary' : 'text-app-textPrimary'}`}>
                   {goal.icon}
                </div>

                {/* Title */}
                <span className={`text-[14px] font-semibold text-center leading-tight transition-colors duration-300 ${isSelected ? 'text-app-primary' : 'text-app-textPrimary'}`}>
                  {goal.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="z-20 mt-4 shrink-0">
        <button 
          onClick={onNext}
          disabled={!selectedId}
          className={`w-full h-14 font-bold text-[17px] rounded-full transition-all duration-300
            ${selectedId 
              ? 'bg-app-primary text-white shadow-lg shadow-app-primary/30 animate-breathe active:scale-95' 
              : 'bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed'}
          `}
        >
          Set My Goal
        </button>
      </div>
    </div>
  );
}
