"use client";
import React, { useEffect, useRef, useState } from "react";
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, CheckCircle2, Circle
} from 'lucide-react';

// --- MARK: - Theme Configuration ---

const THEME = {
  // Base Colors
  textPrimary: "text-slate-900",
  textSecondary: "text-slate-500",
  
  // Selection States (Million Dollar Style)
  unselected: "bg-white border-gray-200 shadow-sm",
  selected: "bg-white border-[#E65473] shadow-xl shadow-pink-200/50 scale-[1.02] z-20",
  
  // Text Colors
  textUnselected: "text-slate-900",
  textSelected: "text-[#E65473]",
  
  // Icon Colors
  iconUnselected: "text-[#E65473] opacity-80", 
  iconSelected: "text-[#E65473] scale-110",

  // Helper Text (Green)
  helper: "text-[#33B373]", 
  
  // Brand Gradient
  brandGradient: "from-[#E65473] to-[#C23A5B]",
};

// --- DATA ---
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

const PersonalizingConstants = {
  totalDuration: 7000,
  phase1Scale: 0.25,
  phase2Scale: 0.20,
};

// --- MARK: - Copy Providers (EXACT SWIFT PORT) ---

const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { headline: "Any health notes before we target leaks?", subtitle: "This helps me map safe, effective bladder-control sessions.", cta: "Build My Leak-Free Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes before we ease pain?", subtitle: "I’ll protect sensitive ranges and focus on release first.", cta: "Build My Pain-Relief Plan" },
    "Improve Intimacy": { headline: "Any health notes before we boost intimacy?", subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.", cta: "Build My Intimacy Plan" },
    "Recover Postpartum": { headline: "Any health notes before we rebuild gently?", subtitle: "I’ll keep everything postpartum-safe and progressive.", cta: "Build My Postpartum Plan" },
    "Prepare for Pregnancy": { headline: "Any health notes before we prep for pregnancy?", subtitle: "I’ll prioritize circulation, breath, and core support.", cta: "Build My Prep Plan" },
    "Build Core Strength": { headline: "Any health notes before we strengthen your core?", subtitle: "This ensures smart progressions and safe loading.", cta: "Build My Core Plan" },
    "Support My Fitness": { headline: "Any health notes before we support your training?", subtitle: "I’ll sync to your routine and recovery needs.", cta: "Build My Fitness Plan" },
    "Boost Stability": { headline: "Any health notes before we boost stability?", subtitle: "I’ll align mobility + deep core for posture wins.", cta: "Build My Stability Plan" },
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
    if (goal.includes("Stability")) return "✓ Noted. Deep core + alignment for steady posture wins.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    if (goal.includes("Leak")) return "✓ Great. We’ll start with core reflexes for leak control.";
    if (goal.includes("Pain")) return "✓ Great. Gentle release + support from day one.";
    if (goal.includes("Intimacy")) return "✓ Great. Comfort, sensation, and confidence from the start.";
    if (goal.includes("Postpartum")) return "✓ Great. Foundation work, safe and steady.";
    if (goal.includes("Pregnancy")) return "✓ Great. Building a strong, calm base for you.";
    if (goal.includes("Core")) return "✓ Great. Clean technique and deep core activation.";
    if (goal.includes("Fitness")) return "✓ Great. We’ll slot in perfectly with your routine.";
    if (goal.includes("Stability")) return "✓ Great. Alignment + deep core integration ahead.";
    return "✓ Great! We'll start with a foundational plan.";
  }
};

const getPersonalizingCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": { title: `Designing your intimacy plan`, subtitle: "Comfort, sensation, confidence—gently built for your body.", connecting: "Checking your profile for arousal flow and comfort…", calibrating: "Balancing relax/contract patterns for stronger orgasms…", checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for stronger orgasms", "Partner-friendly positions"] },
    "Stop Bladder Leaks": { title: "Personalizing your leak-control plan", subtitle: "Train reflexes so sneezes and laughs don’t own your day.", connecting: "Mapping urge delays and quick-contract sets…", calibrating: "Dialing breath and pressure control for real-life moments…", checklist: ["Urge-delay reflex training", "Fast-twitch squeezes", "Breath + pressure control", "Run/jump confidence drills"] },
    "Ease Pelvic Pain": { title: "Personalizing your pain-relief plan", subtitle: "Release tension, add support, and keep comfort front and center.", connecting: "Identifying tight patterns and sensitive ranges…", calibrating: "Layering gentle strength for lasting relief…", checklist: ["Down-train tight muscles", "Nerve-calming breath", "Gentle glute + core support", "Daily posture resets"] },
    "Recover Postpartum": { title: "Personalizing your postpartum plan", subtitle: "Kind, steady rebuilding for your core, hips, and back.", connecting: "Checking diastasis-safe progressions…", calibrating: "Tuning lifts and carries so daily life feels stable…", checklist: ["Core connection breath", "Diastasis-safe moves", "Hip + back relief", "Lift-and-carry practice"] },
    "Prepare for Pregnancy": { title: "Personalizing your prep plan", subtitle: "Circulation, breath, and a supportive core.", connecting: "Syncing breath-led endurance…", calibrating: "Setting hip mobility and pelvic coordination…", checklist: ["Circulation + breath", "Pelvic floor coordination", "Hip mobility", "Labor-prep positions"] },
    "Build Core Strength": { title: "Personalizing your core plan", subtitle: "Deep, steady strength without guesswork.", connecting: "Targeting activation and timing…", calibrating: "Building anti-rotation and hinge patterns…", checklist: ["Deep core activation", "Anti-rotation work", "Hinge + squat mechanics", "Back-friendly progressions"] },
    "Support My Fitness": { title: "Personalizing your training support", subtitle: "Make every workout you do feel more solid.", connecting: "Priming brace and breath for lifts/cardio…", calibrating: "Matching intensity to recovery…", checklist: ["Pre-workout core priming", "Brace + breathe", "Recovery mobilization", "Force transfer training"] },
    "Boost Stability": { title: "Personalizing your stability plan", subtitle: "Tall, steady, and organized all day.", connecting: "Stacking rib-to-pelvis alignment…", calibrating: "Endurance for postural muscles…", checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"] },
    "default": { title: `Personalizing your plan`, subtitle: "Tall, steady, and organized all day.", connecting: "Stacking rib-to-pelvis alignment…", calibrating: "Endurance for postural muscles…", checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"] }
  };
  return map[goal] || map["default"];
};

const getTimelineCopy = (goal) => {
  const map = {
    "Prepare for Pregnancy": { subtitle: "Feel ready to carry and move with ease by **{date}**.", insights: ["Built for your body (BMI **{bmi}**) so joints and pelvic floor stay happy.", "Because you’re **{activity}**, sessions are short, steady, and stick.", "At **{age}**, we train calm breath and deep core for a growing belly.", "Safe for **{condition}** with low-pressure positions."], cta: "Unlock My Pregnancy Prep" },
    "Recover Postpartum": { subtitle: "Feel steady holding your baby again by **{date}**.", insights: ["Calibrated for your body (BMI **{bmi}**) to protect healing tissue.", "Matched to **{activity}**—works on low-sleep days.", "At **{age}**, we rebuild core connection so feeds, lifts, and stroller walks feel easier.", "Adjusted for **{condition}** including scar or tender areas."], cta: "Unlock My Postpartum Plan" },
    "Build Core Strength": { subtitle: "Feel solid through your middle by **{date}**.", insights: ["Built for your body (BMI **{bmi}**)—strong, not stressful.", "Because you’re **{activity}**, sessions slot right into your day.", "At **{age}**, we focus on clean form and deep bracing you can feel.", "Respects **{condition}** with safe ranges."], cta: "Unlock My Core Plan" },
    "Stop Bladder Leaks": { subtitle: "Confident coughs, laughs, and workouts by **{date}**.", insights: ["Tuned to your body (BMI **{bmi}**) to manage pressure.", "With **{activity}**, we train quick squeezes and urge delay you can use anywhere.", "At **{age}**, we blend long holds with fast pulses for real control.", "Plan respects **{condition}** while we rebuild trust."], cta: "Unlock My Leak-Free Plan" },
    "Ease Pelvic Pain": { subtitle: "Less ache sitting, standing, and at bedtime by **{date}**.", insights: ["Built for your body (BMI **{bmi}**) to lower strain.", "**{activity}** friendly—start quiet, calm the system first.", "At **{age}**, we pair soft release with light strength that lasts.", "Guided by **{condition}** so every range feels safe."], cta: "Unlock My Pain Relief Plan" },
    "Improve Intimacy": { subtitle: "More arousal, easy comfort, and reliable orgasm by **{date}**.", insights: ["Paced for your body (BMI **{bmi}**) to boost blood flow without pressure.", "With **{activity}**, we build relaxed release *and* strong tone for better sensation.", "At **{age}**, we tune reflexes so arousal starts sooner and orgasm lands stronger.", "Positions and pacing adjusted for **{condition}** so comfort stays high."], cta: "Unlock My Intimacy Plan" },
    "Support My Fitness": { subtitle: "More power in lifts, runs, and classes by **{date}**.", insights: ["Calibrated for your body (BMI **{bmi}**) so intensity helps, not hurts.", "Synced to **{activity}**—easy to stack with training.", "At **{age}**, we pair stability with power you feel next workout.", "Safeguards in place for **{condition}**."], cta: "Unlock My Fitness Plan" },
    "Boost Stability": { subtitle: "Feel taller and steady from desk to steps by **{date}**.", insights: ["Built for your body (BMI **{bmi}**)—steady holds you can keep all day.", "Because you’re **{activity}**, we target sitting time, walks, and carrying.", "At **{age}**, we train deep timing so standing and stairs feel smooth.", "Aligned with **{condition}**—easy on back, hips, and neck."], cta: "Unlock My Stability Plan" },
    "default": { subtitle: "Your personalized plan is set. Expect to feel a real difference by **{date}**.", insights: ["Your plan is calibrated for a BMI of **{bmi}**, ensuring perfect intensity.", "Because you have a **{activity}** activity level, we'll build your foundation safely.", "At **{age} years old**, your plan focuses on neuro-muscular connection.", "We've modified your plan to be safe and effective for your **{condition}**."], cta: "Unlock My Personal Plan" }
  };
  return map[goal] || map["default"];
};

// --- MARK: - Sub-Components (Animation) ---

// 1. AICoreView (Animation matching Swift layers)
const AICoreView = () => (
  <div className="relative w-40 h-40 flex items-center justify-center">
    <div className="absolute w-[80px] h-[80px] border-[3px] border-[#E65473]/80 rounded-full animate-spin [animation-duration:8s] border-t-transparent border-l-transparent" />
    <div className="absolute w-[110px] h-[110px] border-[2px] border-[#E65473]/60 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse] border-b-transparent border-r-transparent" />
    <div className="absolute w-[140px] h-[140px] border-[1px] border-[#E65473]/40 rounded-full animate-spin [animation-duration:15s] border-t-transparent" />
    <div className="absolute w-10 h-10 bg-[#E65473]/50 rounded-full blur-md animate-pulse" />
    <div className="absolute w-6 h-6 bg-[#E65473] rounded-full shadow-[0_0_15px_rgba(230,84,115,0.8)]" />
  </div>
);

// 2. Typewriter Effect
const TypewriterText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    // hard-stop any existing timer before starting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setDisplayed("");
    let i = 0;

    timerRef.current = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 40);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse text-[#E65473]">|</span>
    </span>
  );
};

// 3. Checklist Item
const ChecklistItem = ({ text, delay, onComplete }) => {
  const [status, setStatus] = useState('waiting');
  useEffect(() => {
    const t1 = setTimeout(() => setStatus('processing'), delay);
    return () => clearTimeout(t1);
  }, [delay]);
  useEffect(() => {
    if (status === 'processing') {
      const t2 = setTimeout(() => {
        setStatus('completed');
        if (onComplete) onComplete();
      }, 1500);
      return () => clearTimeout(t2);
    }
  }, [status, onComplete]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-500 ${status === 'waiting' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className={`absolute inset-0 bg-white/10 transition-transform duration-[1500ms] ease-out origin-left ${status === 'processing' ? 'scale-x-100' : status === 'completed' ? 'scale-x-100 opacity-0' : 'scale-x-0'}`} />
      <div className="relative flex items-center p-3 gap-3 z-10">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'completed' ? 'bg-[#E65473] scale-110' : 'bg-white/10'}`}>
          {status === 'completed' ? <Check size={14} className="text-white" strokeWidth={3} /> : <div className="w-2 h-2 bg-[#E65473]/60 rounded-full" />}
        </div>
        <span className="text-[14px] font-medium text-white/90 leading-tight">{text}</span>
      </div>
     </div>
     );
};

// 4. Holographic Timeline
const HolographicTimeline = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
  const t = setTimeout(() => setShow(true), 500);
  return () => clearTimeout(t);
}, []);
  return (
    <div className="w-full h-36 relative my-2">
       <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(230, 84, 115, 0.2)" />
            <stop offset="100%" stopColor="rgba(230, 84, 115, 1)" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
        </defs>
        <path d="M 10,100 C 80,110 200,10 320,20" fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)"
          className={`transition-all duration-[2000ms] ease-out ${show ? 'stroke-dasharray-[400] stroke-dashoffset-0' : 'stroke-dasharray-[400] stroke-dashoffset-[400]'}`} />
        <g className={`transition-opacity duration-1000 delay-1000 ${show ? 'opacity-100' : 'opacity-0'}`}>
            <circle cx="10" cy="100" r="4" fill="white" />
            <text x="10" y="125" textAnchor="middle" fill="white" fontSize="10" opacity="0.7">Today</text>
            <circle cx="320" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" />
            <text x="310" y="10" textAnchor="end" fill="#E65473" fontSize="12" fontWeight="bold">Goal</text>
        </g>
       </svg>
    </div>
  );
};

// --- MARK: - Main Component ---

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('askingHealthInfo'); 
  
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

  // Data Loading (Safety Checked)
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const healthCopy = getHealthCopy(goalTitle);
  const personalizingCopy = getPersonalizingCopy(goalTitle, userDetails?.name);
  const timelineCopy = getTimelineCopy(goalTitle);

  // --- 🔥 NUCLEAR THEME FIX 🔥 ---
  useEffect(() => {
    // Function to force update both META and BODY BG
    const updateTheme = (color) => {
      // A. Update Meta Tag (Status Bar)
      let meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', color);
      } else {
        // Fallback if it doesn't exist (though layout.js creates it)
        meta = document.createElement('meta');
        meta.name = "theme-color";
        meta.content = color;
        document.head.appendChild(meta);
      }

      // B. Update Body Background (Crucial for overscroll/rubber-band areas)
      // Using !important to override any tailwind classes on body
      document.documentElement.style.setProperty('background-color', color, 'important');
      document.body.style.setProperty('background-color', color, 'important');
    };

    if (phase === 'askingHealthInfo') {
        // Phase 1: Light Background
        updateTheme('#FAF9FA');
    } else {
        // Phase 2 & 3: Pure Black Background
        updateTheme('#000000');
    }
  }, [phase]);

  // --- Logic Phase 1 ---
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

  // --- Logic Phase 2 ---
  useEffect(() => {
    if (phase === 'personalizing') {
      let startTime = Date.now();
      setPersonalizingStatus(personalizingCopy.connecting);
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(99, Math.floor((elapsed / PersonalizingConstants.totalDuration) * 100));
        setProgressPercent(p);
      }, 50);
      const t1 = setTimeout(() => { setPersonalizingStatus(personalizingCopy.calibrating); }, PersonalizingConstants.totalDuration * PersonalizingConstants.phase1Scale);
      const t2 = setTimeout(() => { setPersonalizingStatus(""); setShowChecklist(true); }, PersonalizingConstants.totalDuration * (PersonalizingConstants.phase1Scale + PersonalizingConstants.phase2Scale));
      return () => { clearInterval(progressInterval); clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase]);

  const onChecklistComplete = () => {
    setProgressPercent(100);
    setPersonalizingStatus("Your plan is locked in—let’s go!");
    setTimeout(() => { setPhase('showingTimeline'); }, 1200);
  };

  // --- Logic Phase 3 ---
  const calculateBMI = () => {
    if (!userDetails?.weight || !userDetails?.height) return "22.5";
    const h = userDetails.height * 0.0254;
    const w = userDetails.weight * 0.453592;
    return (w / (h * h)).toFixed(1);
  };
  const date = new Date(); date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const formatRichText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        let content = part.slice(2, -2);
        if (content === '{date}') content = dateString;
        if (content === '{bmi}') content = calculateBMI();
        if (content === '{activity}') content = selectedActivity ? ACTIVITIES.find(a => a.id === selectedActivity)?.title.toLowerCase() : "active";
        if (content === '{age}') content = userDetails?.age || "30";
        if (content === '{condition}') content = selectedConditions.length > 0 ? "unique needs" : "body";
        return <span key={i} className="text-white font-extrabold">{content}</span>;
      }
      return <span key={i} className="text-white/80">{part}</span>;
    });
  };

  // --- RENDER ---
  return (
    <div className={`absolute inset-0 w-full h-full flex flex-col transition-colors duration-700 overflow-hidden ${phase === 'askingHealthInfo' ? THEME.bg : 'bg-black'}`}>
      
      {/* ---------------- PHASE 1: HEALTH INFO (One Screen) ---------------- */}
      {phase === 'askingHealthInfo' && (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-700 px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            
            {/* Header - Moved Higher */}
            <div className="mb-2 shrink-0 text-center">
              <h1 className={`text-[26px] font-extrabold text-center ${THEME.text} mb-1 leading-tight`}>{healthCopy.headline}</h1>
              <p className="text-center text-[rgb(26,26,38)]/60 text-sm">{healthCopy.subtitle}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-0">
              
              {/* Conditions */}
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
                        {/* Badge Logic: Checkmark if selected, Circle if unselected */}
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

                 {/* Helper 1: GREEN */}
                 <div className={`text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 h-4 mb-2 ${helperText ? 'opacity-100' : 'opacity-0'}`}>
                  {helperText}
                </div>

                <button onClick={toggleNone}
                  className={`w-full py-3.5 rounded-full border-[1.5px] font-semibold text-[15px] transition-all duration-300 active:scale-95 outline-none
                    ${noneSelected ? 'bg-white border-[2.5px] border-[#E65473] text-[#E65473] shadow-sm' : 'bg-white border-gray-200 text-slate-400'}
                  `}
                >
                  ✓ None of the Above
                </button>
              </div>

              {/* Activity */}
              <div className="mt-3">
                <h3 className={`text-[15px] font-bold text-center ${THEME.text} mb-2`}>Your typical activity level</h3>
                <div className="flex flex-col gap-2.5">
                  {ACTIVITIES.map((act) => {
                    const isSelected = selectedActivity === act.id;
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
                 {/* Helper 2: GREEN */}
                 <div className={`text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 h-4 mt-2 ${activityHelperText ? 'opacity-100' : 'opacity-0'}`}>
                  {activityHelperText}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2">
              <button onClick={handlePhase1Continue} disabled={!canContinue}
                className={`w-full h-14 rounded-full font-bold text-lg text-white transition-all duration-300 active:scale-95 shadow-xl
                  ${canContinue ? `bg-gradient-to-b ${THEME.brandGradient} shadow-[#E65473]/30` : 'bg-slate-300 cursor-not-allowed shadow-none'}
                `}
              >
                {healthCopy.cta}
              </button>
            </div>
        </div>
      )}

      {/* ---------------- PHASE 2: PERSONALIZING ---------------- */}
      {phase === 'personalizing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 relative animate-in fade-in duration-1000" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          
          <div className={`transition-all duration-500 ${showChecklist ? 'scale-75 -translate-y-8 opacity-0' : 'scale-100 opacity-100'}`}>
            <AICoreView />
          </div>

          {!showChecklist && (
             <div className="mt-12 text-center h-20 px-4">
               {/* 4XL Gradient Title + Typewriter */}
               <h2 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br ${THEME.brandGradient} drop-shadow-sm mb-2 animate-pulse leading-tight`}>
                 <TypewriterText key={personalizingStatus} text={personalizingStatus} />
               </h2>
             </div>
          )}

          {showChecklist && (
            <div className="w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8 duration-700">
               <h2 className="text-2xl font-bold text-white text-center mb-2 leading-tight">{personalizingCopy.title}</h2>
               <p className="text-center text-gray-400 text-sm mb-6">{personalizingCopy.subtitle}</p>
               <div className="space-y-3">
                  {personalizingCopy.checklist.map((item, idx) => (
                    <ChecklistItem key={idx} text={item} delay={idx * 800} onComplete={idx === personalizingCopy.checklist.length - 1 ? onChecklistComplete : undefined} />
                  ))}
               </div>
               <div className="mt-6 text-center text-[#E65473] font-medium text-sm animate-pulse">
                 {progressPercent === 100 ? "Ready!" : "Fine-tuning for: " + (personalizingCopy.checklist[Math.min(3, Math.floor(progressPercent/25))] || "Results")}
               </div>
            </div>
          )}

          <div className="absolute bottom-8 left-0 w-full px-8" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-white/60 font-medium text-sm">Progress</span>
              <span className="text-white font-mono text-xl font-bold">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#E65473] transition-all duration-100 ease-linear" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-center text-[#E65473] text-xs mt-2 font-medium min-h-[16px]">
               {progressPercent < 30 ? "Syncing your goals..." : progressPercent < 100 ? "Preparing exercises..." : "Your plan is locked in—let’s go!"}
            </p>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 3: TIMELINE ---------------- */}
      {phase === 'showingTimeline' && (
        <div className="flex flex-col h-full animate-in fade-in duration-1000 bg-black relative">
          <div className="flex-1 flex flex-col justify-between px-6 z-10 min-h-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <div>
              <h1 className="text-2xl font-extrabold text-center text-white mb-2 leading-tight">
                <span className="text-white/90">{userDetails?.name || "Your"} path to</span><br/><span className="text-[#E65473]">{goalTitle}</span> is ready.
              </h1>
              <p className="text-center text-white/80 text-[15px] mb-4 leading-relaxed">{formatRichText(timelineCopy.subtitle)}</p>
              <HolographicTimeline />
              <div className="mt-4 space-y-3">
                <h3 className="text-[16px] font-semibold text-white mb-1">Your Personal Insights</h3>
                {timelineCopy.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="mt-0.5 text-[#E65473] shrink-0"><Sparkles size={18} /></div>
                    <p className="text-[13px] leading-snug text-white/90">{formatRichText(insight)}</p>
                  </div>
                ))}
              </div>
            </div>
             <div className="mt-4">
               <button 
  onClick={onNext}
  className={`w-full h-14 rounded-full bg-gradient-to-r ${THEME.brandGradient} text-white font-bold text-lg shadow-[0_0_25px_rgba(230,84,115,0.5)] active:scale-95 transition-all`}
>
  {timelineCopy.cta}
</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
