"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, CheckCircle2, Circle
} from 'lucide-react';

const CONDITIONS = [
  { id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={26} /> },
  { id: 'postpartum', title: 'Postpartum', icon: <Baby size={26} /> },
  { id: 'leaks', title: 'Incontinence', icon: <Droplets size={26} /> },
  { id: 'prostate', title: 'Prostate', icon: <User size={26} /> },
];

const ACTIVITIES = [
  { id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' },
  { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' },
  { id: 'active', title: 'Very Active', sub: '(regular workouts)' },
];

const THEME = {
  unselected: "bg-white border-gray-200 shadow-sm",
  selected: "bg-white border-[#E65473] shadow-xl shadow-pink-200/50 scale-[1.02] z-20",
  textUnselected: "text-slate-900",
  textSelected: "text-[#E65473]",
  iconUnselected: "text-[#E65473] opacity-80", 
  iconSelected: "text-[#E65473] scale-110",
  helper: "text-[#33B373]", 
};

export default function HealthInfoView({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelper, setActivityHelper] = useState("");

  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";

  // --- LOGIC ---
  const toggleCondition = (id) => {
    setIsNone(false);
    setSelectedConditions(prev => {
      const newSet = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      updateHelpers(newSet.length > 0, activity);
      return newSet;
    });
  };
  
  const toggleNone = () => {
    const newVal = !isNone;
    setIsNone(newVal);
    if (newVal) setSelectedConditions([]);
    updateHelpers(newVal, activity);
  };

  const selectActivity = (act) => {
    setActivity(act);
    updateHelpers(selectedConditions.length > 0 || isNone, act);
    setActivityHelper("✓ Perfect, I'll match your pace & recovery.");
  };

  const updateHelpers = (hasCond, hasAct) => {
    if (hasCond) setHelperText("✓ Noted. I'll tailor your plan accordingly.");
    else setHelperText("");
  };

  const handleContinue = () => {
    saveUserData('healthConditions', selectedConditions);
    saveUserData('activityLevel', activity);
    onNext();
  };

  const canContinue = (selectedConditions.length > 0 || isNone) && activity;

  return (
    <div className="flex flex-col h-full w-full px-5 pt-8 pb-6 animate-fade-in bg-app-background relative z-10">
        
        {/* Header */}
        <div className="mb-2 shrink-0 text-center">
          <h1 className="text-[26px] font-extrabold text-center text-slate-900 mb-1 leading-tight">Any health notes?</h1>
          <p className="text-center text-slate-500 text-sm">Ensures every move is safe & tailored.</p>
        </div>

        <div className="flex-1 flex flex-col justify-center min-h-0">
          
          {/* Conditions Grid */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {CONDITIONS.map((item) => {
                const isSelected = selectedConditions.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggleCondition(item.id)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-[24px] border-[2px] h-[100px] transition-all duration-300 active:scale-95 outline-none
                      ${isSelected ? THEME.selected : THEME.unselected}
                    `}
                  >
                    <div className={`mb-2 transition-all duration-300 ${isSelected ? THEME.iconSelected : THEME.iconUnselected}`}>{item.icon}</div>
                    <span className={`text-[13px] font-bold text-center leading-tight px-1 transition-colors duration-300 ${isSelected ? THEME.textSelected : THEME.textUnselected}`}>{item.title}</span>
                    <div className="absolute top-3 right-3">
                       {isSelected 
                         ? <CheckCircle2 size={20} className="fill-[#E65473] text-white" /> 
                         : <Circle size={20} className="text-gray-200" strokeWidth={1.5} />
                       }
                    </div>
                  </button>
                );
              })}
            </div>

             <div className={`text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 h-4 mb-2 ${helperText ? 'opacity-100' : 'opacity-0'}`}>
              {helperText}
            </div>

            <button onClick={toggleNone}
              className={`w-full py-3.5 rounded-full border-[1.5px] font-semibold text-[15px] transition-all duration-300 active:scale-95 outline-none
                ${isNone ? 'bg-white border-[2.5px] border-[#E65473] text-[#E65473] shadow-sm' : 'bg-white border-gray-200 text-slate-400'}
              `}
            >
              ✓ None of the Above
            </button>
          </div>

          {/* Activity Level */}
          <div className="mt-3">
            <h3 className="text-[15px] font-bold text-center text-slate-900 mb-2">Your typical activity level</h3>
            <div className="flex flex-col gap-2.5">
              {ACTIVITIES.map((act) => {
                const isSelected = activity === act.id;
                return (
                  <button key={act.id} onClick={() => selectActivity(act.id)}
                    className={`w-full py-3.5 px-5 rounded-[22px] border-[2px] text-left flex items-center justify-between transition-all duration-300 active:scale-95 outline-none
                      ${isSelected ? THEME.selected : THEME.unselected}
                    `}
                  >
                    <span className={`font-bold text-[15px] ${isSelected ? THEME.textSelected : THEME.textUnselected}`}>
                      {act.title} <span className="text-xs opacity-70 font-normal ml-1">{act.sub}</span>
                    </span>
                    {isSelected 
                         ? <CheckCircle2 size={22} className="fill-[#E65473] text-white" /> 
                         : <Circle size={22} className="text-gray-200" strokeWidth={1.5} />
                    }
                  </button>
                );
              })}
            </div>
             <div className={`text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 h-4 mt-2 ${activityHelper ? 'opacity-100' : 'opacity-0'}`}>
              {activityHelper}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 z-50">
          <button onClick={handleContinue} disabled={!canContinue}
            className={`w-full h-14 rounded-full font-bold text-lg text-white transition-all duration-300 active:scale-95 shadow-xl
              ${canContinue ? `bg-gradient-to-b from-[#E65473] to-[#C23A5B] shadow-[#E65473]/30` : 'bg-slate-300 cursor-not-allowed shadow-none'}
            `}
          >
            Build My Custom Plan
          </button>
        </div>
    </div>
  );
}
