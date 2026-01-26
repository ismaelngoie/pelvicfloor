"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { CheckCircle2, Circle } from 'lucide-react'; 

// --- THEME CONFIGURATION ---
const THEME = {
  // Unselected: White BG, Grey Border, Black Text
  unselected: "bg-white border-gray-200",
  textUnselected: "text-slate-900",
  
  // Selected: White BG, Rose Border, Rose Text, Glow
  selected: "bg-white border-rose-500 shadow-xl shadow-rose-200 scale-[1.05] z-50",
  textSelected: "text-rose-600",

  // Icons: Always Rose, but pop more when selected
  iconUnselected: "text-rose-500",
  iconSelected: "text-rose-600 scale-110 drop-shadow-sm",
};

// --- MILLION DOLLAR CUSTOM ICONS (Filled & Solid) ---
const IntimacyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
  </svg>
);

const LeaksIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);

const PregnancyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 1.145.134 2.258.384 3.326a5.243 5.243 0 115.34-5.342 16.59 16.59 0 00-3.957-1.152A6 6 0 0112.75 6z" clipRule="evenodd" />
  </svg>
);

const PostpartumIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path d="M11.644 1.59a.75.75 0 01.712 0l9.75 5.25a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l9.75-5.25z" />
    <path d="M3.265 10.602l7.668 4.129a2.25 2.25 0 002.134 0l7.668-4.13 1.37.739a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.71 0l-9.75-5.25a.75.75 0 010-1.32l1.37-.738z" />
    <path d="M10.933 19.231l-7.668-4.13-1.37.739a.75.75 0 000 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 000-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 01-2.134-.001z" />
  </svg>
);

const CoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
  </svg>
);

const PainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
  </svg>
);

const FitnessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

const StabilityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.75.75 0 00.724 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

// --- DATA ---
const goals = [
  { id: 'intimacy', title: "Improve Intimacy", Icon: IntimacyIcon },
  { id: 'leaks', title: "Stop Bladder Leaks", Icon: LeaksIcon },
  { id: 'pregnancy', title: "Prepare for Pregnancy", Icon: PregnancyIcon },
  { id: 'postpartum', title: "Recover Postpartum", Icon: PostpartumIcon },
  { id: 'core', title: "Build Core Strength", Icon: CoreIcon },
  { id: 'pain', title: "Ease Pelvic Pain", Icon: PainIcon },
  { id: 'fitness', title: "Support My Fitness", Icon: FitnessIcon },
  { id: 'stability', title: "Boost Stability", Icon: StabilityIcon },
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

      {/* Grid Container */}
      <div className="z-10 flex-1 min-h-0 flex flex-col justify-center"> 
        <div className="grid grid-cols-2 gap-3">
          {goals.map((goal) => {
            const isSelected = selectedId === goal.id;
            const Icon = goal.Icon;
            
            return (
              <button
                key={goal.id}
                onClick={() => handleSelect(goal)}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-[24px] border-[2px] 
                  transition-all duration-300 ease-out w-full aspect-[4/3] outline-none active:scale-95
                  ${isSelected 
                    ? THEME.selected // White BG, Rose Border
                    : `${THEME.unselected} hover:bg-gray-50 z-10` // Grey Border, White BG
                  }
                `}
              >
                {/* Checkmark Badge */}
                <div 
                  className={`absolute top-2 right-2 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-60 scale-90'}`}
                >
                  {isSelected ? (
                    // Selected: Solid Rose Checkmark
                    <CheckCircle2 size={22} className="fill-rose-500 text-white" />
                  ) : (
                    // Unselected: Empty Grey Circle
                    <Circle size={22} className="text-gray-200 fill-transparent" strokeWidth={1.5} />
                  )}
                </div>

                {/* Icon (Always Rose) */}
                <div className={`mb-2 transition-all duration-300 ${isSelected ? THEME.iconSelected : THEME.iconUnselected}`}>
                   <Icon />
                </div>

                {/* Title (Black when unselected, Rose when selected) */}
                <span className={`text-[13px] font-bold text-center leading-tight transition-colors duration-300 ${isSelected ? THEME.textSelected : THEME.textUnselected}`}>
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
