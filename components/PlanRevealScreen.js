"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, CheckCircle2, Circle
} from 'lucide-react';

// --- MARK: - Theme & Data Config ---

const THEME = {
  bg: 'bg-app-background',
  text: 'text-app-textPrimary',
  brand: '#E65473', 
  brandGradient: 'from-[#E65473] to-[#C23A5B]',
  
  // Selection States
  unselected: "bg-white border-gray-200 shadow-sm",
  selected: "bg-white border-app-primary text-app-primary shadow-xl shadow-pink-200/50 scale-[1.02] z-20",
  
  textUnselected: "text-slate-900",
  textSelected: "text-app-primary",
  
  iconUnselected: "text-app-primary opacity-80", 
  iconSelected: "text-app-primary scale-110",

  helper: "text-app-positive", // Using your config 'positive' color (green)
};

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

// --- MARK: - Copy Providers ---

const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { headline: "Any health notes before we target leaks?", subtitle: "This helps me map safe, effective bladder-control sessions.", cta: "Build My Leak-Free Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes before we ease pain?", subtitle: "I’ll protect sensitive ranges and focus on release first.", cta: "Build My Pain-Relief Plan" },
    "Improve Intimacy": { headline: "Any health notes before we boost intimacy?", subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.", cta: "Build My Intimacy Plan" },
    "default": { headline: "Any health notes?", subtitle: "Ensures every move is safe & tailored.", cta: "Build My Custom Plan" }
  };
  return map[goal] || map["default"];
};

const getHelperCopy = (selected, goal) => {
  if (selected) {
    if (goal.includes("Leak")) return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
    if (goal.includes("Pain")) return "✓ Noted. We’ll protect sensitive ranges.";
    if (goal.includes("Intimacy")) return "✓ Noted. I’ll focus on comfort & tone.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    return "✓ Great! We'll start with a foundational plan.";
  }
};

const getPersonalizingCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": { title: `Designing your intimacy plan`, subtitle: "Comfort, sensation, confidence—gently built for your body.", connecting: "Checking your profile for arousal flow and comfort…", calibrating: "Balancing relax/contract patterns for stronger orgasms…", checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for stronger orgasms", "Partner-friendly positions"] },
    "Stop Bladder Leaks": { title: "Personalizing your leak-control plan", subtitle: "Train reflexes so sneezes and laughs don’t own your day.", connecting: "Mapping urge delays and quick-contract sets…", calibrating: "Dialing breath and pressure control for real-life moments…", checklist: ["Urge-delay reflex training", "Fast-twitch squeezes", "Breath + pressure control", "Run/jump confidence drills"] },
    "default": { title: `Personalizing your plan`, subtitle: "Crafting your custom routine.", connecting: "Analyzing profile...", calibrating: "Building routine...", checklist: ["Custom exercises", "Deep insights", "Expert tips", "Community support"] }
  };
  return map[goal] || map["default"];
};

const getTimelineCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { subtitle: "Confident coughs & laughs by {date}.", insights: ["Tuned to your BMI to manage pressure.", "Quick squeeze training for urge delay.", "Fast-twitch pulses for real control.", "Rebuilds trust in your body."], cta: "Unlock My Leak-Free Plan" },
    "default": { subtitle: "Feel the difference by {date}.", insights: ["Calibrated for your body type.", "Builds foundation safely.", "Neuro-muscular connection focus.", "Modified for your specific needs."], cta: "Unlock My Personal Plan" }
  };
  return map[goal] || map["default"];
};

// --- MARK: - Sub-Components (Fixed Animations) ---

const AICoreView = () => (
  <div className="relative w-40 h-40 flex items-center justify-center">
    {/* Outer Ring */}
    <div className="absolute w-[80px] h-[80px] border-[3px] border-app-primary/80 rounded-full animate-ai-spin border-t-transparent border-l-transparent" />
    {/* Middle Ring */}
    <div className="absolute w-[110px] h-[110px] border-[2px] border-app-primary/60 rounded-full animate-ai-spin-reverse border-b-transparent border-r-transparent" />
    {/* Inner Ring */}
    <div className="absolute w-[140px] h-[140px] border-[1px] border-app-primary/40 rounded-full animate-ai-spin border-t-transparent" />
    {/* Core Glow */}
    <div className="absolute w-10 h-10 bg-app-primary/50 rounded-full blur-md animate-pulse" />
    {/* Solid Center */}
    <div className="absolute w-6 h-6 bg-app-primary rounded-full shadow-[0_0_15px_rgba(230,84,115,0.8)]" />
  </div>
);

const TypewriterText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const t = setInterval(() => {
      if (i < text.length) {
        setDisplayed(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(t);
      }
    }, 40);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}<span className="animate-pulse text-app-primary">|</span></span>;
};

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
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-500 
      ${status === 'waiting' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className={`absolute inset-0 bg-white/10 transition-transform duration-[1500ms] ease-out origin-left 
        ${status === 'processing' ? 'scale-x-100' : status === 'completed' ? 'scale-x-100 opacity-0' : 'scale-x-0'}`} />
      <div className="relative flex items-center p-3 gap-3 z-10">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 
          ${status === 'completed' ? 'bg-app-primary scale-110' : 'bg-white/10'}`}>
          {status === 'completed' ? <Check size={14} className="text-white" strokeWidth={3} /> : <div className="w-2 h-2 bg-app-primary/60 rounded-full" />}
        </div>
        <span className="text-[14px] font-medium text-white/90 leading-tight">{text}</span>
      </div>
    </div>
  );
};

const HolographicTimeline = () => {
  const [show, setShow] = useState(false);
  useEffect(() => setTimeout(() => setShow(true), 500), []);
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
  
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelperText, setActivityHelperText] = useState("");

  const [personalizingStatus, setPersonalizingStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);

  // Safety: Ensure we have valid data or default
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const healthCopy = getHealthCopy(goalTitle);
  const personalizingCopy = getPersonalizingCopy(goalTitle, userDetails?.name);
  const timelineCopy = getTimelineCopy(goalTitle);

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
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
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

  return (
    <div className={`relative w-full h-full flex flex-col transition-colors duration-700 overflow-hidden ${phase === 'askingHealthInfo' ? 'bg-app-background' : 'bg-black'}`}>
      
      {/* ---------------- PHASE 1: HEALTH INFO ---------------- */}
      {phase === 'askingHealthInfo' && (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-700 px-5 pt-8 pb-6">
            
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
                        <div className="absolute top-3 right-3">
                           {isSelected 
                             ? <CheckCircle2 size={20} className="fill-app-primary text-white" /> 
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
                    ${noneSelected ? 'bg-white border-[2.5px] border-app-primary text-app-primary shadow-sm' : 'bg-white border-gray-200 text-slate-400'}
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
                             ? <CheckCircle2 size={22} className="fill-app-primary text-white" /> 
                             : <Circle size={22} className="text-gray-200" strokeWidth={1.5} />
                        }
                      </button>
                    );
                  })}
                </div>
                 <div className={`text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 h-4 mt-2 ${activityHelperText ? 'opacity-100' : 'opacity-0'}`}>
                  {activityHelperText}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2">
              <button onClick={handlePhase1Continue} disabled={!canContinue}
                className={`w-full h-14 rounded-full font-bold text-lg text-white transition-all duration-300 active:scale-95 shadow-xl
                  ${canContinue ? `bg-gradient-to-b ${THEME.brandGradient} shadow-app-primary/30` : 'bg-slate-300 cursor-not-allowed shadow-none'}
                `}
              >
                {healthCopy.cta}
              </button>
            </div>
        </div>
      )}

      {/* ---------------- PHASE 2: ANALYSIS ---------------- */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 text-white relative bg-slate-950">
          <AICoreView />
          
          <div className="h-20 flex flex-col justify-center items-center mt-6 mb-4">
             <h2 className="text-2xl font-bold text-center animate-slide-up bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
               {personalizingCopy.title}
             </h2>
             <div className="text-sm font-mono text-app-primary mt-2">
                <TypewriterText text={personalizingStatus} />
             </div>
          </div>
          
          <div className="w-full max-w-xs space-y-4 mb-10 min-h-[180px]">
            {personalizingCopy.checklist.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${idx < checklistVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="w-6 h-6 rounded-full bg-app-primary flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-app-primary transition-all duration-75 ease-linear" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 3: TIMELINE ---------------- */}
      {phase === 'showingTimeline' && (
        <div className={`flex flex-col h-full bg-slate-950 relative transition-opacity duration-1000 ${showTimeline ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-6 z-10">
            <h1 className="text-2xl font-extrabold text-white text-center mb-2 leading-tight">
              <span className="text-app-primary">{userDetails?.name || "Your"}</span> path to<br/>{goalTitle} is ready.
            </h1>
            <p className="text-center text-white/70 text-sm mb-4">{timelineCopy.subtitle.replace("{date}", dateString)}</p>
            
            <HolographicTimeline />

            <div className="w-full space-y-3 mt-6">
              <h3 className="text-white font-bold text-sm mb-2">Your Personal Insights</h3>
              {formattedInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up" style={{ animationDelay: `${0.5 + (index*0.2)}s` }}>
                  <div className="bg-app-primary/20 p-1.5 rounded-full text-app-primary shrink-0"><Sparkles size={16}/></div>
                  <span className="text-xs text-white/90 font-medium leading-relaxed">{formatRichText(insight)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 pb-8 pt-4 bg-slate-950 z-20 shrink-0">
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-app-primary to-rose-600 text-white font-bold text-lg rounded-full shadow-lg shadow-pink-900/50 flex items-center justify-center gap-2 animate-breathe active:scale-95">
              <Lock size={18} /> {timelineCopy.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
