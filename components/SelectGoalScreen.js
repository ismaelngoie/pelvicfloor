"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';

// Options mapped from Swift
const goals = [
  { id: 'pregnancy', title: "Prepare for Pregnancy", icon: "figure.child" },
  { id: 'postpartum', title: "Recover Postpartum", icon: "figure.baby" },
  { id: 'core', title: "Build Core Strength", icon: "bolt.fill" },
  { id: 'leaks', title: "Stop Bladder Leaks", icon: "drop.fill" },
  { id: 'pain', title: "Ease Pelvic Pain", icon: "bandage.fill" },
  { id: 'intimacy', title: "Improve Intimacy", icon: "heart.fill" },
  { id: 'fitness', title: "Support My Fitness", icon: "figure.run" },
  { id: 'stability', title: "Boost Stability & Posture", icon: "figure.stand" },
];

export default function SelectGoalScreen({ onNext }) {
  const { saveUserData } = useUserData();
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal); // Save to context
  };

  return (
    <div className="w-full h-full flex flex-col pt-12 px-6 pb-8 animate-fade-in">
      
      {/* Header */}
      <h1 className="text-2xl font-bold text-center text-app-textPrimary mb-3">
        Let's set your primary goal.
      </h1>
      <p className="text-center text-app-textSecondary text-[15px] mb-8">
        This is the most important step. Your choice will shape every workout.
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto no-scrollbar pb-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => handleSelect(goal)}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-3xl border-[1.5px] transition-all duration-300 cursor-pointer h-36 shadow-sm
              ${selectedId === goal.id 
                ? 'border-app-primary bg-white shadow-lg shadow-app-primary/10 scale-105 z-10' 
                : 'border-app-borderIdle bg-white'}
            `}
          >
            {/* Selection Checkmark */}
            {selectedId === goal.id && (
              <div className="absolute top-3 right-3 text-app-primary animate-pop-in">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
            )}

            {/* Icon Placeholder (Replace with Images later if needed) */}
            <div className={`mb-3 ${selectedId === goal.id ? 'text-app-primary' : 'text-app-textPrimary'}`}>
               {/* Using a generic SVG here, you would use Image component with goal.imageName */}
               <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" opacity="0.5"/></svg>
            </div>

            <span className={`text-[14px] font-semibold text-center leading-tight ${selectedId === goal.id ? 'text-app-primary' : 'text-app-textPrimary'}`}>
              {goal.title}
            </span>
          </div>
        ))}
      </div>

      {/* Button */}
      <button 
        onClick={onNext}
        disabled={!selectedId}
        className={`w-full h-14 font-bold text-lg rounded-full transition-all duration-300 mt-4
          ${selectedId 
            ? 'bg-app-primary text-white shadow-lg shadow-app-primary/30 animate-breathe' 
            : 'bg-app-borderIdle text-app-textSecondary cursor-not-allowed'}
        `}
      >
        Set My Goal
      </button>
    </div>
  );
}
