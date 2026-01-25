"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, Circle, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, ChevronRight, X
} from 'lucide-react';

// --- DATA: Options ---
const CONDITIONS = [
  { id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={28} /> },
  { id: 'postpartum', title: 'Postpartum Issues', icon: <Baby size={28} /> },
  { id: 'leaks', title: 'Urinary Incontinence', icon: <Droplets size={28} /> },
  { id: 'prostate', title: 'Prostate Issues', icon: <User size={28} /> },
];

const ACTIVITIES = [
  { id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' },
  { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' },
  { id: 'active', title: 'Very Active', sub: '(regular workouts)' },
];

// --- HELPER: Analysis Copy (Swift Logic) ---
const getPersonalizedCopy = (goal, name) => {
  const safeName = name || "there";
  // Logic from Swift 'personalizingCopy'
  const map = {
    "Improve Intimacy": {
      title: `Designing your intimacy plan, ${safeName}`,
      subtitle: "Comfort, sensation, confidence—gently built for your body.",
      checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for sensation", "Partner positions"]
    },
    "Stop Bladder Leaks": {
      title: "Personalizing your leak-control plan",
      subtitle: "Train reflexes so sneezes and laughs don’t own your day.",
      checklist: ["Urge-delay reflex training", "Fast-twitch squeezes", "Breath + pressure control", "Run/jump confidence"]
    },
    "Ease Pelvic Pain": {
      title: "Personalizing your pain-relief plan",
      subtitle: "Release tension, add support, and keep comfort front and center.",
      checklist: ["Down-train tight muscles", "Nerve-calming breath", "Gentle glute support", "Daily posture resets"]
    },
    "Recover Postpartum": {
      title: "Personalizing your postpartum plan",
      subtitle: "Kind, steady rebuilding for your core, hips, and back.",
      checklist: ["Core connection breath", "Diastasis-safe moves", "Hip + back relief", "Lift-and-carry practice"]
    },
    "default": {
      title: `Personalizing your plan, ${safeName}`,
      subtitle: "Crafting your custom routine for strength and confidence.",
      checklist: ["Custom exercises", "Deep insights", "Expert tips", "Community support"]
    }
  };
  return map[goal] || map["default"];
};

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  
  // --- STATE ---
  const [phase, setPhase] = useState('health'); // 'health' -> 'analyzing' -> 'timeline'
  
  // Phase 1: Inputs
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");

  // Phase 2: Analysis
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Connecting to Coach Mia…");
  const [checklistVisible, setChecklistVisible] = useState(0);

  // Phase 3: Timeline
  const [showTimeline, setShowTimeline] = useState(false);

  // --- LOGIC: Phase 1 (Health) ---
  const toggleCondition = (id) => {
    setIsNone(false);
    if (selectedConditions.includes(id)) {
      setSelectedConditions(prev => prev.filter(c => c !== id));
    } else {
      setSelectedConditions(prev => [...prev, id]);
    }
  };

  const toggleNone = () => {
    setIsNone(!isNone);
    setSelectedConditions([]);
  };

  const handleHealthContinue = () => {
    saveUserData('healthConditions', selectedConditions);
    saveUserData('activityLevel', activity);
    startAnalysis();
  };

  // Update Helper Text based on selection (Swift Logic)
  useEffect(() => {
    if (selectedConditions.length > 0 || isNone) {
      if (activity) {
        setHelperText("✓ Perfect, I'll match your pace & recovery.");
      } else {
        const goal = userDetails.selectedTarget?.title || "";
        if (goal.includes("Leak")) setHelperText("✓ Got it. I’ll train urge delay reflexes.");
        else if (goal.includes("Pain")) setHelperText("✓ Noted. We’ll protect sensitive ranges.");
        else setHelperText("✓ Understood. I'll tailor your plan accordingly.");
      }
    } else {
      setHelperText("");
    }
  }, [selectedConditions, isNone, activity, userDetails]);


  // --- LOGIC: Phase 2 (Analysis - 7 Seconds) ---
  const startAnalysis = () => {
    setPhase('analyzing');
    
    const TOTAL_DURATION = 7000; // 7 seconds
    const intervalTime = 50; 
    const steps = TOTAL_DURATION / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const pct = Math.min(100, Math.round((currentStep / steps) * 100));
      setProgress(pct);

      // Timeline of Events (Swift Timings)
      if (pct === 25) {
        setAnalysisStatus("Syncing your goals for real results...");
      } 
      if (pct === 45) {
        setAnalysisStatus("Preparing exercises for fast relief...");
      }
      
      // Checklist Items Appearance
      if (pct > 50 && pct < 60) setChecklistVisible(1);
      if (pct > 65 && pct < 75) setChecklistVisible(2);
      if (pct > 80 && pct < 90) setChecklistVisible(3);
      if (pct > 95) setChecklistVisible(4);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setPhase('timeline');
          setTimeout(() => setShowTimeline(true), 100); // Fade in
        }, 800);
      }
    }, intervalTime);
  };

  // --- RENDER ---
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const copy = getPersonalizedCopy(goalTitle, userDetails.name);

  return (
    <div className={`relative w-full h-full flex flex-col transition-colors duration-700 ease-in-out
      ${phase === 'health' ? 'bg-app-background' : 'bg-slate-950'}
    `}>
      
      {/* ---------------- PHASE 1: HEALTH INTAKE ---------------- */}
      {phase === 'health' && (
        <div className="flex flex-col h-full px-6 pt-10 pb-8 animate-fade-in">
          <h1 className="text-2xl font-extrabold text-center text-app-textPrimary mb-2">
            Any health notes?
          </h1>
          <p className="text-center text-app-textSecondary text-[15px] mb-8">
            This ensures every exercise is safe and perfectly tailored to you.
          </p>

          {/* Conditions Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {CONDITIONS.map((c) => {
              const active = selectedConditions.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCondition(c.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-[1.5px] transition-all duration-200 active:scale-95 h-28
                    ${active ? 'border-app-primary bg-white shadow-md' : 'border-app-borderIdle bg-white'}`}
                >
                  <div className={`mb-2 ${active ? 'text-app-primary' : 'text-app-textPrimary'}`}>{c.icon}</div>
                  <span className="text-[13px] font-bold text-center leading-tight">{c.title}</span>
                  {active && <div className="absolute top-2 right-2 text-app-primary"><CheckCircleIcon size={18} /></div>}
                </button>
              );
            })}
          </div>

          {/* None Button */}
          <button 
            onClick={toggleNone}
            className={`w-full py-3 rounded-full border-[1.5px] font-medium text-[15px] mb-8 transition-colors
              ${isNone ? 'border-app-primary text-app-primary bg-app-primary/5' : 'border-app-borderIdle text-app-textSecondary bg-white'}`}
          >
            None of the above
          </button>

          {/* Activity Level */}
          <h3 className="text-lg font-bold text-center mb-4 text-app-textPrimary">Your typical activity level</h3>
          <div className="flex flex-col gap-3 mb-4">
            {ACTIVITIES.map((a) => {
              const active = activity === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={`w-full py-3.5 px-5 rounded-xl border-[1.5px] text-left flex items-center justify-between transition-all duration-200 active:scale-95
                    ${active ? 'border-app-primary bg-white shadow-sm' : 'border-app-borderIdle bg-white'}`}
                >
                  <span className={`font-semibold ${active ? 'text-app-primary' : 'text-app-textPrimary'}`}>
                    {a.title} <span className="font-normal opacity-70">{a.sub}</span>
                  </span>
                  {active && <CheckCircleIcon size={20} className="text-app-primary" />}
                </button>
              );
            })}
          </div>

          {/* Helper Text */}
          <div className="h-6 flex items-center justify-center mb-4">
            {helperText && (
              <p className="text-app-positive text-sm font-medium animate-fade-in">{helperText}</p>
            )}
          </div>

          {/* Button */}
          <div className="mt-auto">
            <button 
              onClick={handleHealthContinue}
              disabled={(!isNone && selectedConditions.length === 0) || !activity}
              className={`w-full h-14 font-bold text-lg rounded-full transition-all duration-300
                ${((isNone || selectedConditions.length > 0) && activity)
                  ? 'bg-app-primary text-white shadow-lg animate-breathe' 
                  : 'bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed'}
              `}
            >
              Build My Custom Plan
            </button>
          </div>
        </div>
      )}


      {/* ---------------- PHASE 2: ANALYZING (7 Seconds) ---------------- */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 pt-12 pb-10 text-white animate-fade-in relative overflow-hidden">
          
          {/* Animated Background Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <div className="w-[500px] h-[500px] border border-app-primary rounded-full animate-ping [animation-duration:3s]" />
             <div className="absolute w-[300px] h-[300px] border border-white/50 rounded-full animate-ping [animation-duration:4s]" />
          </div>

          {/* AI Core */}
          <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-app-primary/30 rounded-full animate-pulse blur-xl" />
            <div className="relative w-24 h-24 bg-gradient-to-tr from-app-primary to-rose-600 rounded-full shadow-2xl flex items-center justify-center animate-spin-slow">
               <Sparkles size={40} className="text-white" />
            </div>
          </div>

          {/* Text */}
          <h2 className="text-2xl font-bold text-center mb-2 leading-tight animate-slide-up">
            {copy.title}
          </h2>
          <p className="text-center text-white/60 text-[15px] mb-8 animate-slide-up">
            {copy.subtitle}
          </p>

          {/* Checklist */}
          <div className="w-full max-w-xs space-y-4 mb-auto">
            {copy.checklist.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-4 transition-all duration-500
                  ${idx < checklistVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
              >
                <div className="w-6 h-6 rounded-full bg-app-primary flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-[15px] font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-8">
            <div className="flex justify-between text-xs font-medium text-white/70 mb-2">
              <span>{analysisStatus}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-app-primary transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}


      {/* ---------------- PHASE 3: TIMELINE REVEAL ---------------- */}
      {phase === 'timeline' && (
        <div className={`flex flex-col h-full bg-slate-900 relative overflow-hidden transition-opacity duration-1000 ${showTimeline ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none">
             {[...Array(20)].map((_,i) => (
               <div key={i} className="absolute bg-white/20 w-1 h-1 rounded-full animate-float" 
                    style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s` }} />
             ))}
          </div>

          <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-24 overflow-y-auto no-scrollbar z-10">
            <h1 className="text-3xl font-extrabold text-white text-center mb-3 leading-tight drop-shadow-xl">
              <span className="text-app-primary">{userDetails.name || "Your"}</span> path to<br/>{goalTitle} is ready.
            </h1>
            
            {/* Holographic Graph Container */}
            <div className="w-full h-56 relative my-6">
               {/* Glowing Line SVG */}
               <svg viewBox="0 0 300 150" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(230,84,115,0.6)]">
                 <defs>
                   <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#E65473" stopOpacity="0.2" />
                     <stop offset="100%" stopColor="#E65473" stopOpacity="1" />
                   </linearGradient>
                 </defs>
                 <path d="M 0,140 C 80,130 120,80 300,20" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" 
                       className="animate-draw-line" strokeDasharray="400" strokeDashoffset="400" />
                 
                 {/* Milestones */}
                 <circle cx="0" cy="140" r="4" fill="white" className="animate-fade-in delay-300" />
                 <text x="10" y="145" fill="white" fontSize="10" opacity="0.7">Today</text>
                 
                 <circle cx="150" cy="80" r="4" fill="white" className="animate-fade-in delay-700" />
                 <text x="160" y="85" fill="white" fontSize="10" opacity="0.7">Relief</text>

                 <circle cx="300" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" className="animate-fade-in delay-1000" />
                 <text x="250" y="15" fill="#E65473" fontSize="12" fontWeight="bold">Goal Reached</text>
               </svg>
            </div>

            {/* Insights Stack */}
            <div className="w-full space-y-4">
              <h3 className="text-white font-bold text-lg mb-2">Your Personal Insights</h3>
              <InsightRow icon={<Activity size={18}/>} text={`Calibrated for your specific body type.`} delay={1.2} />
              <InsightRow icon={<Lock size={18}/>} text={`Builds foundation safely to prevent injury.`} delay={1.4} />
              <InsightRow icon={<Sparkles size={18}/>} text={`Neuro-muscular connection focus.`} delay={1.6} />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="absolute bottom-0 w-full px-6 pb-8 pt-6 bg-gradient-to-t from-slate-900 to-transparent z-20">
            <button 
              onClick={onNext}
              className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-600 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/40 flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform"
            >
              <Lock size={18} /> Unlock My Personal Plan
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Helpers ---
const CheckCircleIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const InsightRow = ({ icon, text, delay }) => (
  <div 
    className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="bg-app-primary/20 p-2 rounded-full text-app-primary shrink-0">{icon}</div>
    <span className="text-sm text-white/90 font-medium leading-relaxed">{text}</span>
  </div>
);
