"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Sparkles, Lock, ArrowRight, Activity, ShieldCheck
} from 'lucide-react';

// --- MARK: - Data & Copy Config (Replicated from Swift) ---

const CONDITIONS = [
  { id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={32} /> },
  { id: 'postpartum', title: 'Postpartum Issues', icon: <Baby size={32} /> },
  { id: 'leaks', title: 'Urinary Incontinence', icon: <Droplets size={32} /> },
  { id: 'prostate', title: 'Prostate Issues', icon: <User size={32} /> },
];

const ACTIVITIES = [
  { id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' },
  { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' },
  { id: 'active', title: 'Very Active', sub: '(regular workouts)' },
];

const PersonalizingConstants = {
  primaryColor: '#ec4899', // systemPink
  totalDuration: 7000,
  phase1Scale: 0.25,
  phase2Scale: 0.20,
};

// --- MARK: - Copy Providers ---

const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { headline: "Any health notes before we target leaks?", subtitle: "This helps me map safe, effective bladder-control sessions.", cta: "Build My Leak-Free Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes before we ease pain?", subtitle: "I’ll protect sensitive ranges and focus on release first.", cta: "Build My Pain-Relief Plan" },
    "Improve Intimacy": { headline: "Any health notes before we boost intimacy?", subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.", cta: "Build My Intimacy Plan" },
    "Recover Postpartum": { headline: "Any health notes before we rebuild gently?", subtitle: "I’ll keep everything postpartum-safe and progressive.", cta: "Build My Postpartum Plan" },
    "Prepare for Pregnancy": { headline: "Any health notes before we prep for pregnancy?", subtitle: "I’ll prioritize circulation, breath, and core support.", cta: "Build My Prep Plan" },
    "Build Core Strength": { headline: "Any health notes before we strengthen your core?", subtitle: "This ensures smart progressions and safe loading.", cta: "Build My Core Plan" },
    "Support My Fitness": { headline: "Any health notes before we support your training?", subtitle: "I’ll sync to your routine and recovery needs.", cta: "Build My Fitness Plan" },
    "default": { headline: "Last step! Any health notes?", subtitle: "This ensures every exercise is safe and perfectly tailored to you.", cta: "Build My Custom Plan" }
  };
  return map[goal] || map["default"];
};

const getHelperCopy = (selected, goal) => {
  if (selected) {
    if (goal.includes("Leak")) return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
    if (goal.includes("Pain")) return "✓ Noted. We’ll protect sensitive ranges and release tension first.";
    if (goal.includes("Intimacy")) return "✓ Noted. I’ll focus on comfort, arousal flow, and pelvic tone.";
    if (goal.includes("Postpartum")) return "✓ Noted. We’ll keep it postpartum-safe with gentle progressions.";
    if (goal.includes("Pregnancy")) return "✓ Noted. I’ll prioritize breath, circulation, and foundation.";
    if (goal.includes("Core")) return "✓ Noted. Smart progressions, no risky strain.";
    if (goal.includes("Fitness")) return "✓ Noted. I’ll match your training load and recovery.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    // None selected logic
    if (goal.includes("Leak")) return "✓ Great. We’ll start with core reflexes for leak control.";
    if (goal.includes("Pain")) return "✓ Great. Gentle release + support from day one.";
    if (goal.includes("Intimacy")) return "✓ Great. Comfort, sensation, and confidence from the start.";
    if (goal.includes("Core")) return "✓ Great. Clean technique and deep core activation.";
    return "✓ Great! We'll start with a foundational plan.";
  }
};

const getPersonalizingCopy = (goal, name) => {
  const safeName = name || "love";
  const map = {
    "Improve Intimacy": {
      title: `Designing your intimacy plan, ${safeName}`,
      subtitle: "Comfort, sensation, confidence—gently built for your body.",
      connecting: "Checking your profile for arousal flow and comfort…",
      calibrating: "Balancing relax/contract patterns for stronger orgasms…",
      checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for stronger orgasms", "Partner-friendly positions"]
    },
    "Stop Bladder Leaks": {
      title: "Personalizing your leak-control plan",
      subtitle: "Train reflexes so sneezes and laughs don’t own your day.",
      connecting: "Mapping urge delays and quick-contract sets…",
      calibrating: "Dialing breath and pressure control for real-life moments…",
      checklist: ["Urge-delay reflex training", "Fast-twitch squeezes", "Breath + pressure control", "Run/jump confidence drills"]
    },
    "Ease Pelvic Pain": {
      title: "Personalizing your pain-relief plan",
      subtitle: "Release tension, add support, and keep comfort front and center.",
      connecting: "Identifying tight patterns and sensitive ranges…",
      calibrating: "Layering gentle strength for lasting relief…",
      checklist: ["Down-train tight muscles", "Nerve-calming breath", "Gentle glute + core support", "Daily posture resets"]
    },
    "Recover Postpartum": {
      title: "Personalizing your postpartum plan",
      subtitle: "Kind, steady rebuilding for your core, hips, and back.",
      connecting: "Checking diastasis-safe progressions…",
      calibrating: "Tuning lifts and carries so daily life feels stable…",
      checklist: ["Core connection breath", "Diastasis-safe moves", "Hip + back relief", "Lift-and-carry practice"]
    },
    "default": {
      title: `Personalizing your stability plan`,
      subtitle: "Tall, steady, and organized all day.",
      connecting: "Stacking rib-to-pelvis alignment…",
      calibrating: "Endurance for postural muscles…",
      checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"]
    }
  };
  return map[goal] || map["default"];
};

const getTimelineCopy = (goal) => {
  const map = {
    "Prepare for Pregnancy": {
      subtitle: "Feel ready to carry and move with ease by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**) so joints and pelvic floor stay happy.",
        "Because you’re **{activity}**, sessions are short, steady, and stick.",
        "At **{age}**, we train calm breath and deep core for a growing belly.",
        "Safe for **{condition}** with low-pressure positions."
      ],
      cta: "Unlock My Pregnancy Prep"
    },
    "Stop Bladder Leaks": {
      subtitle: "Confident coughs, laughs, and workouts by **{date}**.",
      insights: [
        "Tuned to your body (BMI **{bmi}**) to manage pressure.",
        "With **{activity}**, we train quick squeezes and urge delay you can use anywhere.",
        "At **{age}**, we blend long holds with fast pulses for real control.",
        "Plan respects **{condition}** while we rebuild trust."
      ],
      cta: "Unlock My Leak-Free Plan"
    },
    "Ease Pelvic Pain": {
      subtitle: "Less ache sitting, standing, and at bedtime by **{date}**.",
      insights: [
        "Built for your body (BMI **{bmi}**) to lower strain.",
        "**{activity}** friendly—start quiet, calm the system first.",
        "At **{age}**, we pair soft release with light strength that lasts.",
        "Guided by **{condition}** so every range feels safe."
      ],
      cta: "Unlock My Pain Relief Plan"
    },
    "default": {
      subtitle: "Your personalized plan is set. Expect to feel a real difference by **{date}**.",
      insights: [
        "Your plan is calibrated for a BMI of **{bmi}**, ensuring perfect intensity.",
        "Because you have a **{activity}** activity level, we'll build your foundation safely.",
        "At **{age} years old**, your plan focuses on neuro-muscular connection.",
        "We've modified your plan to be safe and effective for your **{condition}**."
      ],
      cta: "Unlock My Personal Plan"
    }
  };
  return map[goal] || map["default"];
};

// --- MARK: - Sub-Components (Phase 2 & 3) ---

// 1. AICoreView (Replicating CALayers)
const AICoreView = () => {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Ring 1 */}
      <div className="absolute w-[80px] h-[80px] border-[3px] border-pink-500/80 rounded-full animate-spin [animation-duration:8s] border-t-transparent border-l-transparent" />
      {/* Ring 2 */}
      <div className="absolute w-[110px] h-[110px] border-[2px] border-pink-500/60 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse] border-b-transparent border-r-transparent" />
      {/* Ring 3 */}
      <div className="absolute w-[140px] h-[140px] border-[1px] border-pink-500/40 rounded-full animate-spin [animation-duration:15s] border-t-transparent" />
      {/* Orb */}
      <div className="absolute w-10 h-10 bg-pink-500/50 rounded-full blur-md animate-pulse" />
      <div className="absolute w-6 h-6 bg-pink-500 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
    </div>
  );
};

// 2. ChecklistItemView (Replicating ProgressLayer)
const ChecklistItem = ({ text, delay, onComplete }) => {
  const [status, setStatus] = useState('waiting'); // waiting, processing, completed

  useEffect(() => {
    // Start processing after delay
    const startTimer = setTimeout(() => {
      setStatus('processing');
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (status === 'processing') {
      // Simulate processing time then complete
      const processTimer = setTimeout(() => {
        setStatus('completed');
        if (onComplete) onComplete();
      }, 1500); 
      return () => clearTimeout(processTimer);
    }
  }, [status, onComplete]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-500 ${status === 'waiting' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      {/* Background Progress Fill */}
      <div 
        className={`absolute inset-0 bg-white/10 transition-transform duration-[1500ms] ease-out origin-left ${status === 'processing' ? 'scale-x-100' : status === 'completed' ? 'scale-x-100 opacity-0' : 'scale-x-0'}`} 
      />
      
      <div className="relative flex items-center p-4 gap-4 z-10">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'completed' ? 'bg-pink-500 scale-110' : 'bg-white/10'}`}>
          {status === 'completed' ? <Check size={14} className="text-white" strokeWidth={3} /> : <div className="w-2 h-2 bg-pink-500/60 rounded-full" />}
        </div>
        <span className="text-[15px] font-medium text-white/90">{text}</span>
      </div>
    </div>
  );
};

// 3. HolographicTimelineView (Replicating Bezier Path)
const HolographicTimeline = ({ goal }) => {
  // Simple "fade in" animation for milestones
  const [visible, setVisible] = useState(false);
  useEffect(() => setTimeout(() => setVisible(true), 500), []);

  return (
    <div className="w-full h-48 relative my-4">
       {/* Gradient Defs */}
       <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(236, 72, 153, 0.2)" />
            <stop offset="100%" stopColor="rgba(236, 72, 153, 1)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Bezier Curve: Replicating Swift Control Points
            Start: (20, 80%) -> Control1: (20%, 90%) -> Control2: (80%, 10%) -> End: (Width-20, 20%) 
        */}
        <path 
          d="M 10,120 C 80,140 200,20 320,30" 
          fill="none" 
          stroke="url(#lineGradient)" 
          strokeWidth="3" 
          strokeLinecap="round"
          filter="url(#glow)"
          className={`transition-all duration-[2000ms] ease-out ${visible ? 'stroke-dasharray-[400] stroke-dashoffset-0' : 'stroke-dasharray-[400] stroke-dashoffset-[400]'}`}
        />

        {/* Milestones */}
        <g className={`transition-opacity duration-1000 delay-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Start Node */}
            <circle cx="10" cy="120" r="4" fill="white" />
            <text x="10" y="145" textAnchor="middle" fill="white" fontSize="10" opacity="0.7">Today</text>

            {/* Mid Node */}
            <circle cx="160" cy="75" r="4" fill="white" />
            <text x="160" y="100" textAnchor="middle" fill="white" fontSize="10" opacity="0.7">Relief</text>

            {/* End Node */}
            <circle cx="320" cy="30" r="6" fill="#ec4899" stroke="white" strokeWidth="2" />
            <text x="310" y="15" textAnchor="end" fill="#ec4899" fontSize="12" fontWeight="bold">Goal</text>
        </g>
       </svg>
    </div>
  );
};


// --- MARK: - Main Controller ---

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('askingHealthInfo'); // askingHealthInfo -> personalizing -> showingTimeline
  
  // Phase 1 State
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelperText, setActivityHelperText] = useState("");

  // Phase 2 State
  const [personalizingStatus, setPersonalizingStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);

  // Goal Data
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const healthCopy = getHealthCopy(goalTitle);
  const personalizingCopy = getPersonalizingCopy(goalTitle, userDetails.name);
  const timelineCopy = getTimelineCopy(goalTitle);

  // --- Logic: Phase 1 ---

  const toggleCondition = (id) => {
    setNoneSelected(false);
    setSelectedConditions(prev => {
      const newSet = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      updateHelperText(newSet.length > 0, selectedActivity);
      return newSet;
    });
  };

  const toggleNone = () => {
    const newVal = !noneSelected;
    setNoneSelected(newVal);
    if (newVal) setSelectedConditions([]);
    updateHelperText(newVal, selectedActivity);
  };

  const selectActivity = (act) => {
    setSelectedActivity(act);
    updateHelperText(selectedConditions.length > 0 || noneSelected, act);
    setActivityHelperText("✓ Perfect, I'll match your pace & recovery.");
  };

  const updateHelperText = (hasCondition, hasActivity) => {
    setHelperText(getHelperCopy(hasCondition, goalTitle));
  };

  const canContinue = (selectedConditions.length > 0 || noneSelected) && selectedActivity;

  const handlePhase1Continue = () => {
    saveUserData('healthConditions', selectedConditions);
    saveUserData('activityLevel', selectedActivity);
    setPhase('personalizing');
  };

  // --- Logic: Phase 2 (Sequence) ---

  useEffect(() => {
    if (phase === 'personalizing') {
      let startTime = Date.now();
      
      // 1. Connecting Status
      setPersonalizingStatus(personalizingCopy.connecting);

      // Progress Bar Loop
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(99, Math.floor((elapsed / PersonalizingConstants.totalDuration) * 100));
        setProgressPercent(p);
      }, 50);

      // 2. Calibrating Status (after 25% of time)
      const t1 = setTimeout(() => {
        setPersonalizingStatus(personalizingCopy.calibrating);
      }, PersonalizingConstants.totalDuration * PersonalizingConstants.phase1Scale);

      // 3. Show Checklist (after 45% of time)
      const t2 = setTimeout(() => {
        setPersonalizingStatus(""); // Hide text, show checklist
        setShowChecklist(true);
      }, PersonalizingConstants.totalDuration * (PersonalizingConstants.phase1Scale + PersonalizingConstants.phase2Scale));

      return () => {
        clearInterval(progressInterval);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [phase]);

  // Phase 2 Completion
  const onChecklistComplete = () => {
    setProgressPercent(100);
    setPersonalizingStatus("Your plan is locked in—let’s go!");
    setTimeout(() => {
      setPhase('showingTimeline');
    }, 1200);
  };


  // --- Logic: Phase 3 (Timeline Helpers) ---
  const calculateBMI = () => {
    if (!userDetails.weight || !userDetails.height) return "22.5";
    const h = userDetails.height * 0.0254;
    const w = userDetails.weight * 0.453592;
    return (w / (h * h)).toFixed(1);
  };

  const getFutureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const formatRichText = (text) => {
    // Replaces **text** with bold spans
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        let content = part.slice(2, -2);
        // Hydrate variables
        if (content === '{date}') content = getFutureDate();
        if (content === '{bmi}') content = calculateBMI();
        if (content === '{activity}') content = selectedActivity ? ACTIVITIES.find(a => a.id === selectedActivity)?.title.toLowerCase() : "active";
        if (content === '{age}') content = userDetails.age || "30";
        if (content === '{condition}') content = selectedConditions.length > 0 ? "unique needs" : "body";
        
        return <span key={i} className="text-white font-bold">{content}</span>;
      }
      return <span key={i} className="text-white/80">{part}</span>;
    });
  };

  // --- RENDER ---

  return (
    <div className={`relative w-full h-full flex flex-col transition-colors duration-700 overflow-hidden
      ${phase === 'askingHealthInfo' ? 'bg-[#f8f9fa]' : 'bg-black'}
    `}>
      
      {/* ---------------- PHASE 1: HEALTH INFO ---------------- */}
      {phase === 'askingHealthInfo' && (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-700">
          <div className="flex-1 px-6 pt-12 overflow-y-auto no-scrollbar pb-32">
            
            {/* Header */}
            <h1 className="text-[28px] font-bold text-center text-slate-900 mb-2 leading-tight">
              {healthCopy.headline}
            </h1>
            <p className="text-center text-slate-500 text-[16px] mb-8">
              {healthCopy.subtitle}
            </p>

            {/* Conditions Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {CONDITIONS.map((item) => {
                const isSelected = selectedConditions.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleCondition(item.id)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-[24px] border-[1.5px] h-[115px] transition-all duration-300
                      ${isSelected 
                        ? 'bg-white border-[3px] border-pink-500 shadow-[0_5px_14px_rgba(0,0,0,0.1)] scale-[1.04] z-10' 
                        : 'bg-white border-slate-200 shadow-[0_5px_10px_rgba(0,0,0,0.04)]'}
                    `}
                  >
                    <div className={`mb-3 ${isSelected ? 'text-pink-500' : 'text-pink-500'}`}>
                      {item.icon}
                    </div>
                    <span className="text-[15px] font-semibold text-center text-slate-900 leading-tight">
                      {item.title}
                    </span>
                    {/* Checkmark */}
                    <div className={`absolute top-3 right-3 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                       <Check size={20} className="text-pink-500 fill-current" strokeWidth={4} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Helper Text 1 */}
            <div className={`h-6 text-center text-sm font-medium text-emerald-600 transition-opacity duration-300 mb-4 ${helperText ? 'opacity-100' : 'opacity-0'}`}>
              {helperText}
            </div>

            {/* None Button */}
            <button
              onClick={toggleNone}
              className={`w-full py-4 rounded-full border-[1.5px] font-medium text-[16px] mb-8 transition-all duration-300
                ${noneSelected 
                  ? 'bg-white border-[3px] border-pink-500 text-pink-500' 
                  : 'bg-white border-slate-200 text-slate-500'}
              `}
            >
              ✓ None of the Above
            </button>

            {/* Activity */}
            <h3 className="text-[18px] font-bold text-center text-slate-900 mb-4">Your typical activity level</h3>
            <div className="flex flex-col gap-3">
              {ACTIVITIES.map((act) => {
                const isSelected = selectedActivity === act.id;
                return (
                  <button
                    key={act.id}
                    onClick={() => selectActivity(act.id)}
                    className={`w-full py-4 rounded-[25px] border-[1.5px] text-[16px] font-medium transition-all duration-300
                      ${isSelected
                        ? 'bg-white border-[3px] border-pink-500 text-pink-500'
                        : 'bg-white border-slate-200 text-slate-500'}
                    `}
                  >
                    {act.title} <span className="text-sm opacity-70 font-normal">{act.sub}</span>
                  </button>
                );
              })}
            </div>

             {/* Helper Text 2 */}
             <div className={`h-6 text-center text-sm font-medium text-emerald-600 transition-opacity duration-300 mt-3 ${activityHelperText ? 'opacity-100' : 'opacity-0'}`}>
              {activityHelperText}
            </div>

          </div>

          {/* Footer Button */}
          <div className="p-6 bg-[#f8f9fa]">
            <button
              onClick={handlePhase1Continue}
              disabled={!canContinue}
              className={`w-full h-14 rounded-full font-bold text-lg text-white transition-all duration-300
                ${canContinue 
                  ? 'bg-gradient-to-b from-pink-500 to-pink-600 shadow-lg translate-y-0' 
                  : 'bg-slate-300 shadow-none cursor-not-allowed'}
              `}
            >
              {healthCopy.cta}
            </button>
          </div>
        </div>
      )}


      {/* ---------------- PHASE 2: PERSONALIZING ---------------- */}
      {phase === 'personalizing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 relative animate-in fade-in duration-1000">
          
          {/* AI Core Animation */}
          <div className={`transition-all duration-500 ${showChecklist ? 'scale-75 -translate-y-8 opacity-0' : 'scale-100 opacity-100'}`}>
            <AICoreView />
          </div>

          {/* Status Text (Typing effect simulation via simple opacity fade here for React perf) */}
          {!showChecklist && (
             <div className="mt-12 text-center h-20">
               <h2 className="text-[22px] font-medium text-white/90 mb-2 animate-pulse">{personalizingStatus}</h2>
             </div>
          )}

          {/* Checklist Mode */}
          {showChecklist && (
            <div className="w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8 duration-700">
               <h2 className="text-2xl font-bold text-white text-center mb-2">{personalizingCopy.title}</h2>
               <p className="text-center text-gray-400 text-sm mb-8">{personalizingCopy.subtitle}</p>
               
               <div className="space-y-4">
                  {personalizingCopy.checklist.map((item, idx) => (
                    <ChecklistItem 
                      key={idx} 
                      text={item} 
                      delay={idx * 800} // Stagger start
                      onComplete={idx === personalizingCopy.checklist.length - 1 ? onChecklistComplete : undefined}
                    />
                  ))}
               </div>
               
               <div className="mt-8 text-center text-pink-500 font-medium text-sm animate-pulse">
                 {progressPercent === 100 ? "Ready!" : "Fine-tuning for: " + (personalizingCopy.checklist[Math.min(3, Math.floor(progressPercent/25))] || "Results")}
               </div>
            </div>
          )}

          {/* Bottom Progress */}
          <div className="absolute bottom-10 left-0 w-full px-8">
            <div className="flex justify-between items-end mb-3">
              <span className="text-white/60 font-medium">Progress</span>
              <span className="text-white font-mono text-2xl font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-center text-pink-500 text-sm mt-3 font-medium min-h-[20px]">
               {progressPercent < 30 ? "Syncing your goals..." : progressPercent < 100 ? "Preparing exercises..." : "Your plan is locked in—let’s go!"}
            </p>
          </div>
        </div>
      )}


      {/* ---------------- PHASE 3: TIMELINE ---------------- */}
      {phase === 'showingTimeline' && (
        <div className="flex flex-col h-full animate-in fade-in duration-1000 bg-slate-900 relative">
          
          {/* Particle Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
               <div key={i} className="absolute bg-white/30 rounded-full w-1 h-1 animate-ping" 
                    style={{
                      left: `${Math.random()*100}%`, 
                      top: `${Math.random()*100}%`, 
                      animationDuration: `${2+Math.random()*3}s`,
                      animationDelay: `${Math.random()*2}s`
                    }} 
               />
            ))}
          </div>

          <div className="flex-1 px-6 pt-12 overflow-y-auto no-scrollbar pb-32 z-10">
            {/* Headline */}
            <h1 className="text-[30px] font-bold text-center text-white mb-2 leading-tight">
               <span className="text-white/90">{userDetails.name ? `${userDetails.name}, your` : "Your"} path to</span><br/>
               <span className="text-white">{goalTitle}</span> is ready.
            </h1>
            
            {/* Subtitle */}
            <p className="text-center text-white/80 text-[16px] mb-8 leading-relaxed">
              {formatRichText(timelineCopy.subtitle)}
            </p>

            {/* Holographic Chart */}
            <HolographicTimeline goal={goalTitle} />

            {/* Insights */}
            <div className="mt-6 space-y-5">
              <h3 className="text-lg font-semibold text-white mb-2">Your Personal Insights</h3>
              {timelineCopy.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                  <div className="mt-1 text-purple-400">
                    <Sparkles size={20} />
                  </div>
                  <p className="text-[14px] leading-relaxed">
                    {formatRichText(insight)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky CTA */}
          <div className="p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent z-20">
             <button
               onClick={onNext}
               className="w-full h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transition-all transform active:scale-95"
             >
               {timelineCopy.cta}
             </button>
          </div>

        </div>
      )}

    </div>
  );
}
