"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, CheckCircle2
} from 'lucide-react';

// --- THEME: "Million Dollar" Rose Theme ---
// Unselected: Rose tint background, rose text.
// Selected: White background, strong rose border, shadow "pop".
const THEME = {
  unselected: "bg-rose-50 border-rose-100 text-rose-500",
  selected: "bg-white border-rose-500 text-rose-600 shadow-lg shadow-rose-200 z-10 scale-[1.02]",
  glow: "shadow-rose-200"
};

// --- DATA ---
const CONDITIONS = [
  { id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={24} /> },
  { id: 'postpartum', title: 'Postpartum', icon: <Baby size={24} /> },
  { id: 'leaks', title: 'Incontinence', icon: <Droplets size={24} /> },
  { id: 'prostate', title: 'Prostate', icon: <User size={24} /> },
];

const ACTIVITIES = [
  { id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' },
  { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' },
  { id: 'active', title: 'Very Active', sub: '(regular workouts)' },
];

// --- LOGIC: Copy Providers ---
const getPersonalizedCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": { title: `Designing your intimacy plan, ${safeName}`, subtitle: "Maximizing comfort & sensation.", checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for sensation", "Partner positions"] },
    "Stop Bladder Leaks": { title: "Personalizing your leak-control plan", subtitle: "Reflex training for dry days.", checklist: ["Urge-delay reflexes", "Fast-twitch squeezes", "Breath control", "Run/jump confidence"] },
    "default": { title: `Personalizing your plan, ${safeName}`, subtitle: "Crafting your custom routine.", checklist: ["Custom exercises", "Deep insights", "Expert tips", "Community support"] }
  };
  return map[goal] || map["default"];
};

const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { headline: "Any health notes?", subtitle: "I'll map safe sessions.", cta: "Build My Leak-Free Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes?", subtitle: "I’ll protect sensitive ranges.", cta: "Build My Pain-Relief Plan" },
    "default": { headline: "Any health notes?", subtitle: "Ensures every move is safe.", cta: "Build My Custom Plan" }
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

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('health'); 
  
  // Phase 1 State
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");

  // Phase 2 State
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Connecting...");
  const [checklistVisible, setChecklistVisible] = useState(0);

  // Phase 3 State
  const [showTimeline, setShowTimeline] = useState(false);

  // Get Data
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const healthText = getHealthCopy(goalTitle);

  // --- LOGIC Phase 1 ---
  const toggleCondition = (id) => {
    setIsNone(false);
    setSelectedConditions(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const toggleNone = () => { setIsNone(!isNone); setSelectedConditions([]); };
  
  useEffect(() => {
    if (selectedConditions.length > 0) setHelperText("✓ Noted. I'll adjust for your needs.");
    else if (isNone) setHelperText("✓ Great. We'll start with a standard plan.");
    else setHelperText(""); 
    
    if (activity) setHelperText(prev => prev ? prev + " Matching your pace." : "✓ I'll match your pace.");
  }, [selectedConditions, isNone, activity]);

  const handleHealthContinue = () => {
    saveUserData('healthConditions', selectedConditions);
    saveUserData('activityLevel', activity);
    startAnalysis();
  };

  // --- LOGIC Phase 2 (7 Seconds) ---
  const startAnalysis = () => {
    setPhase('analyzing');
    const TOTAL_DURATION = 7000;
    const intervalTime = 50; 
    let currentStep = 0;
    const steps = TOTAL_DURATION / intervalTime;

    const timer = setInterval(() => {
      currentStep++;
      const pct = Math.round((currentStep / steps) * 100);
      setProgress(pct);

      if (pct === 20) setAnalysisStatus("Syncing goals...");
      if (pct === 50) setAnalysisStatus("Calibrating plan...");
      
      if (pct > 20 && pct < 30) setChecklistVisible(1);
      if (pct > 40 && pct < 50) setChecklistVisible(2);
      if (pct > 60 && pct < 70) setChecklistVisible(3);
      if (pct > 80 && pct < 90) setChecklistVisible(4);

      if (currentStep >= steps) {
        clearInterval(timer);
        setPhase('timeline');
        setTimeout(() => setShowTimeline(true), 100);
      }
    }, intervalTime);
  };

  // --- LOGIC Phase 3 ---
  const date = new Date(); date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timelineCopy = getTimelineCopy(goalTitle);
  const formattedInsights = timelineCopy.insights.slice(0, 3); // Limit to 3 to fit one screen

  return (
    <div className={`relative w-full h-full flex flex-col transition-colors duration-700 ease-in-out overflow-hidden
      ${phase === 'health' ? 'bg-app-background' : 'bg-slate-950'}
    `}>
      
      {/* ================= PHASE 1: HEALTH INTAKE (One Screen Optimized) ================= */}
      {phase === 'health' && (
        <div className="flex flex-col h-full w-full px-6 pt-6 pb-6 animate-fade-in relative z-10 bg-app-background">
          
          {/* Header */}
          <div className="text-center mb-3 shrink-0">
            <h1 className="text-2xl font-extrabold text-app-textPrimary mb-1 leading-tight">{healthText.headline}</h1>
            <p className="text-app-textSecondary text-sm">{healthText.subtitle}</p>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
            {CONDITIONS.map((c) => {
              const active = selectedConditions.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCondition(c.id)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-[2px] transition-all duration-300 active:scale-95 h-24 outline-none
                    ${active ? THEME.selected : THEME.unselected}`}
                >
                  <div className="mb-1">{c.icon}</div>
                  <span className="text-xs font-bold text-center leading-tight">{c.title}</span>
                  {active && <div className="absolute top-2 right-2 text-rose-500"><CheckCircle2 size={18} fill="currentColor" className="text-white" /></div>}
                </button>
              );
            })}
          </div>

          {/* None Button */}
          <button onClick={toggleNone}
            className={`w-full py-3 rounded-xl border-[2px] font-semibold text-sm mb-3 transition-all outline-none shrink-0 active:scale-95
              ${isNone ? THEME.selected : THEME.unselected}`}
          >
            None of the above
          </button>

          {/* Activity Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            <h3 className="text-sm font-bold text-center mb-2 text-app-textPrimary shrink-0">Your activity level</h3>
            <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-2">
              {ACTIVITIES.map((a) => {
                const active = activity === a.id;
                return (
                  <button key={a.id} onClick={() => setActivity(a.id)}
                    className={`w-full py-3 px-4 rounded-xl border-[2px] text-left flex items-center justify-between transition-all duration-300 active:scale-95 outline-none shrink-0
                      ${active ? THEME.selected : THEME.unselected}`}
                  >
                    <span className="font-bold text-sm">
                      {a.title} <span className="font-normal opacity-70 text-xs">{a.sub}</span>
                    </span>
                    {active && <CheckCircle2 size={20} className="text-rose-500 fill-current text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Helper Text */}
          <div className="h-5 flex items-center justify-center shrink-0 mt-1">
            <p className="text-rose-500 text-xs font-bold animate-fade-in">{helperText}</p>
          </div>

          {/* Footer Button (Floating above to ensure visibility) */}
          <div className="mt-2 shrink-0 z-50">
            <button onClick={handleHealthContinue} disabled={(!isNone && selectedConditions.length === 0) || !activity}
              className={`w-full h-12 font-bold text-lg rounded-full transition-all duration-300 shadow-lg
                ${((isNone || selectedConditions.length > 0) && activity) ? 'bg-app-primary text-white animate-breathe shadow-rose-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {healthText.cta}
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE 2: ANALYSIS (7s Animation) ================= */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 text-white relative overflow-hidden bg-slate-950">
          {/* Animated Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
             <div className="w-[600px] h-[600px] border border-rose-500/30 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
             <div className="absolute w-[400px] h-[400px] border border-white/20 rounded-full animate-[ping_4s_ease-in-out_infinite_1s]" />
          </div>

          {/* AI Core */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-rose-500/40 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-28 h-28 bg-gradient-to-tr from-rose-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center animate-[spin_10s_linear_infinite]">
               <Sparkles size={48} className="text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-2 animate-slide-up">Designing your plan...</h2>
          
          {/* Checklist */}
          <div className="w-full max-w-xs space-y-3 mb-8 min-h-[160px]">
            {getPersonalizedCopy(goalTitle).checklist.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${idx < checklistVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>{analysisStatus}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 3: REVEAL (Holographic) ================= */}
      {phase === 'timeline' && (
        <div className={`flex flex-col h-full bg-slate-950 relative overflow-hidden transition-opacity duration-1000 ${showTimeline ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-6 z-10">
            <h1 className="text-2xl font-extrabold text-white text-center mb-2 leading-tight">
              <span className="text-rose-500">{userDetails.name || "Your"}</span> path to<br/>{goalTitle} is ready.
            </h1>
            <p className="text-center text-white/70 text-sm mb-4">{getTimelineCopy(goalTitle).subtitle.replace("{date}", dateString)}</p>
            
            {/* Holographic Graph with "Rider" Animation */}
            <div className="w-full h-48 relative my-2">
               <svg viewBox="0 0 300 150" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                 <defs>
                   <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                     <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
                   </linearGradient>
                 </defs>
                 {/* The Line */}
                 <path d="M 0,140 C 80,130 120,80 300,20" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" 
                       className="animate-draw-line" strokeDasharray="400" strokeDashoffset="400" />
                 
                 {/* Moving Rider Dot */}
                 <circle r="6" fill="white" className="animate-ride-line">
                    <animateMotion dur="1.5s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
                       <mpath href="#path" /> {/* Using CSS trick for path motion */}
                    </animateMotion>
                 </circle>
                 {/* Manual CSS Animation substitute for Rider */}
                 <circle cx="300" cy="20" r="6" fill="#f43f5e" stroke="white" strokeWidth="2" className="animate-fade-in delay-1000" />
                 <text x="250" y="10" fill="#f43f5e" fontSize="10" fontWeight="bold">Goal</text>
               </svg>
            </div>

            {/* Insights */}
            <div className="w-full space-y-3 mt-4">
              {formattedInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up" style={{ animationDelay: `${1.2 + (index*0.2)}s` }}>
                  <div className="bg-rose-500/20 p-1.5 rounded-full text-rose-500 shrink-0"><Sparkles size={16}/></div>
                  <span className="text-xs text-white/90 font-medium leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-8 pt-4 bg-slate-950 z-20 shrink-0">
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-lg rounded-full shadow-lg shadow-rose-900/50 flex items-center justify-center gap-2 animate-breathe active:scale-95">
              <Lock size={18} /> {getTimelineCopy(goalTitle).cta}
            </button>
            <p className="text-center text-white/40 text-xs mt-3">Secure checkout • 100% Money-back guarantee</p>
          </div>
        </div>
      )}
    </div>
  );
}
