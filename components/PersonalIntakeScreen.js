"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';

// --- A. DATA: Exact Copy from Swift MiaCopyProvider ---
const MIA_COPY = {
  "Prepare for Pregnancy": {
    ack: "Beautiful choice, {name}. We will gently prepare your pelvic floor and core so you feel supported every step of pregnancy.",
    age: "At {age}, we focus on calm breath, steady endurance, and safe strength so your body feels ready and held.",
    weight: "Thanks. I will set positions and resistance that feel doable today and build quietly each week.",
    height: "Got it. Your height helps me cue stance and reach so form feels natural from day one."
  },
  "Recover Postpartum": {
    ack: "I have you, {name}. We will rebuild your foundation with kindness and bring your core and confidence back.",
    age: "At {age}, I pace recovery for connection over intensity so healing feels steady and real.",
    weight: "Thank you. I will scale loads and positions so holding and lifting your little one feels safe again.",
    height: "Noted. Your height lets me fine tune carry, lift, and reach so your body feels supported."
  },
  "Build Core Strength": {
    ack: "Love it, {name}. We will build a deep, steady core that supports every move you make.",
    age: "At {age}, we sharpen activation and use smart progressions so strength grows without strain.",
    weight: "Thanks. I will use this to set starting loads so work feels strong, not stressful.",
    height: "Great. Your height helps me dial plank angles, hinge depth, and reach for clean form."
  },
  "Stop Bladder Leaks": {
    ack: "On it, {name}. We will train control so sneezes, laughs, and runs stop owning your day.",
    age: "At {age}, we blend endurance with quick contractions so real life control shows up when you need it.",
    weight: "Thank you. I will scale impact and pressure so you stay dry while you move.",
    height: "Noted. Your height guides setup so alignment and breath cues land perfectly."
  },
  "Ease Pelvic Pain": {
    ack: "I am with you, {name}. We will release what is tight and strengthen what supports, gently and steadily.",
    age: "At {age}, we favor calming patterns and gradual load so relief lasts beyond the session.",
    weight: "Thanks. I will choose positions that lower strain and invite real ease.",
    height: "Got it. Your height helps me fine tune angles so sitting, standing, and walking feel softer."
  },
  "Improve Intimacy": {
    ack: "Let’s make this feel good again, {name}. We will build comfort, confidence, and sensation at your pace.",
    age: "At {age}, I balance relaxation and activation to support arousal and more reliable orgasms.",
    weight: "Thank you. I will set intensities that build tone without bracing for better blood flow and sensation.",
    height: "Noted. I will cue supportive positions and angles so comfort stays high and climax is not cut short by tension."
  },
  "Support My Fitness": {
    ack: "Nice, {name}. We will turn your core into a quiet engine that powers every workout.",
    age: "At {age}, we pair stability with power so lifts and cardio feel solid and repeatable.",
    weight: "Thanks. I will set loads and tempos that build performance without extra fatigue.",
    height: "Great. Your height lets me tune stance and range so reps feel clean and strong."
  },
  "Boost Stability": { 
    ack: "Excellent, {name}. We will stack you tall and steady so your body feels organized again.",
    age: "At {age}, we train deep core timing and endurance for all day support, not just during workouts.",
    weight: "Thank you. I will set progressions that protect your back while strength builds.",
    height: "Noted. Your height guides stance and reach so alignment clicks quickly and stays with you."
  },
  // Fallback
  "default": {
    ack: "Excellent choice, {name}. We will stack you tall and steady.",
    age: "At {age}, we train deep core timing for all-day support.",
    weight: "Thank you. I will set progressions that protect your back.",
    height: "Noted. Your height guides stance so alignment clicks quickly."
  }
};

// --- B. HELPER: Typing Indicator ---
const TypingIndicator = () => (
  <div className="flex space-x-1.5 p-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
  </div>
);

// --- C. COMPONENT: Chat Bubble ---
const ChatBubble = ({ text, isTyping, isUser }) => (
  <div className={`flex w-full mb-6 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
    {!isUser && (
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 mr-3 mt-auto">
         <img src="/coachMiaAvatar.png" alt="Mia" className="w-full h-full object-cover" />
      </div>
    )}
    
    <div className={`px-5 py-3.5 shadow-sm max-w-[85%] text-[16px] leading-relaxed font-medium
      ${isUser 
        ? 'bg-app-primary text-white rounded-2xl rounded-br-none' 
        : 'bg-white border border-app-borderIdle text-app-textPrimary rounded-2xl rounded-bl-none'}
    `}>
      {isTyping ? <TypingIndicator /> : text}
    </div>
  </div>
);

// --- D. COMPONENT: Million Dollar Wheel Picker ---
const WheelPicker = ({ range, value, onChange, unit, formatLabel }) => {
  const scrollerRef = useRef(null);
  const ITEM_HEIGHT = 54; // Height of each number in px

  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const scrollY = scrollerRef.current.scrollTop;
    const centerIndex = Math.round(scrollY / ITEM_HEIGHT);
    const newValue = range[centerIndex];
    
    if (newValue !== undefined && newValue !== value) {
      onChange(newValue);
    }
  };

  // Initial Scroll
  useEffect(() => {
    if (scrollerRef.current) {
      const index = range.indexOf(value);
      if (index !== -1) {
        scrollerRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'auto' });
      }
    }
  }, []);

  return (
    <div className="relative h-[220px] w-full max-w-[320px] mx-auto overflow-hidden mt-2">
      {/* Selection Highlight */}
      <div className="absolute top-1/2 left-0 w-full h-[54px] -translate-y-1/2 border-t-2 border-b-2 border-app-primary/10 bg-app-primary/5 pointer-events-none z-10" />
      
      {/* Gradients */}
      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-white via-white/90 to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-t from-white via-white/90 to-transparent z-20 pointer-events-none" />

      <div 
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[83px]"
      >
        {range.map((num) => (
          <div 
            key={num} 
            className={`h-[54px] flex items-center justify-center snap-center transition-all duration-200 
              ${num === value ? 'scale-110 font-bold text-app-primary text-2xl' : 'scale-90 text-app-textSecondary/40 text-xl'}`}
          >
            {formatLabel ? formatLabel(num) : num}
            {unit && <span className="text-sm ml-1.5 mt-1 font-medium text-app-textSecondary/60">{unit}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- E. MAIN SCREEN ---
export default function PersonalIntakeScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [step, setStep] = useState('name'); 
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]); 
  const chatBottomRef = useRef(null);
  
  // Data
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(65); // Stored as inches

  // Logic Lookup
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  // Robust fallback logic
  const copy = MIA_COPY[goalTitle] || MIA_COPY["Boost Stability"] || MIA_COPY["default"];

  // Helper: Auto Scroll
  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Helper: Add Message
  const addMessage = (text, sender, delay = 0) => {
    if (sender === 'mia') setIsTyping(true);
    
    setTimeout(() => {
      if (sender === 'mia') setIsTyping(false);
      setHistory(prev => [...prev, { text, sender }]);
      scrollToBottom();
    }, delay);
  };

  // Initial Greeting
  useEffect(() => {
    addMessage("Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?", 'mia', 600);
  }, []);

  // --- Step Handlers ---
  const handleNext = () => {
    if (isTyping) return; // Prevent double taps

    // 1. NAME STEP
    if (step === 'name') {
      if (name.length < 2) return;
      saveUserData('name', name);
      addMessage(name, 'user'); // Show user reply immediately
      
      const nextText = copy.ack.replace("{name}", name) + " To start, what's your age?";
      addMessage(nextText, 'mia', 1000); // Mia thinks for 1s
      setStep('age');
    } 
    // 2. AGE STEP
    else if (step === 'age') {
      saveUserData('age', age);
      addMessage(`${age}`, 'user');
      
      const nextText = copy.age.replace("{age}", age) + " Now, what's your current weight?";
      addMessage(nextText, 'mia', 1000);
      setStep('weight');
    } 
    // 3. WEIGHT STEP
    else if (step === 'weight') {
      saveUserData('weight', weight);
      addMessage(`${weight} lbs`, 'user');
      
      const nextText = copy.weight + " And what's your height?";
      addMessage(nextText, 'mia', 1200);
      setStep('height');
    } 
    // 4. HEIGHT STEP (Final)
    else if (step === 'height') {
      saveUserData('height', height);
      // Format height for chat bubble (5'5")
      const feet = Math.floor(height / 12);
      const inches = height % 12;
      addMessage(`${feet}'${inches}"`, 'user');
      
      // Short delay before transition
      setTimeout(() => {
        onNext();
      }, 800);
    }
  };

  // --- Render Input ---
  const renderInput = () => {
    if (isTyping) return <div className="h-[220px] flex items-center justify-center text-app-textSecondary/50 text-sm animate-pulse">Mia is thinking...</div>;

    switch (step) {
      case 'name':
        return (
          <div className="w-full animate-slide-up py-10">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name..."
              className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-app-borderIdle focus:border-app-primary outline-none py-3 text-app-textPrimary placeholder:text-app-textSecondary/30"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          </div>
        );
      case 'age':
        return <WheelPicker range={Array.from({length: 80}, (_, i) => i + 16)} value={age} onChange={setAge} unit="years old" />;
      case 'weight':
        return <WheelPicker range={Array.from({length: 300}, (_, i) => i + 80)} value={weight} onChange={setWeight} unit="lbs" />;
      case 'height':
        return (
          <WheelPicker 
            range={Array.from({length: 40}, (_, i) => i + 48)} 
            value={height} 
            onChange={setHeight} 
            // Fix: Show 5'5" format
            formatLabel={(val) => `${Math.floor(val / 12)}'${val % 12}"`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-app-background relative">
      
      {/* 1. Chat History Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-8 pb-4 flex flex-col">
        {history.map((msg, index) => (
          <ChatBubble key={index} text={msg.text} isTyping={false} isUser={msg.sender === 'user'} />
        ))}
        
        {/* Active Typing Indicator */}
        {isTyping && <ChatBubble isTyping={true} isUser={false} />}
        
        {/* Invisible spacer to scroll to */}
        <div ref={chatBottomRef} className="h-4" />
      </div>

      {/* 2. Input Area (Fixed Bottom) */}
      <div className="w-full bg-white rounded-t-[35px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 pb-10 z-20">
        
        {/* Input Component */}
        <div className="mb-6">
          {renderInput()}
        </div>

        {/* Continue Button */}
        <button 
          onClick={handleNext}
          disabled={isTyping || (step === 'name' && name.length < 2)}
          className={`w-full h-14 font-bold text-lg rounded-full shadow-xl transition-all duration-300
            ${isTyping || (step === 'name' && name.length < 2)
              ? 'bg-app-borderIdle text-app-textSecondary cursor-not-allowed opacity-50 shadow-none' 
              : 'bg-app-primary text-white shadow-app-primary/30 active:scale-95 animate-breathe'}
          `}
        >
          {step === 'height' ? 'Continue' : 'Next'}
        </button>
      </div>

    </div>
  );
}
