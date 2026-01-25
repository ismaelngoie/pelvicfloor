"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';

// --- A. DATA: Coach Mia's Logic (Mapped from Swift) ---
const miaLogic = {
  "Prepare for Pregnancy": {
    ack: "Beautiful choice, {name}. We will gently prepare your pelvic floor so you feel supported.",
    age: "At {age}, we focus on calm breath and steady endurance.",
    weight: "Thanks. I will set positions that feel doable today and build quietly.",
    height: "Got it. Your height helps me cue stance and reach naturally."
  },
  "Recover Postpartum": {
    ack: "I have you, {name}. We will rebuild your foundation with kindness.",
    age: "At {age}, I pace recovery for connection over intensity.",
    weight: "Thank you. I will scale loads so lifting your little one feels safe.",
    height: "Noted. Your height lets me fine tune carry and lift forms."
  },
  "Build Core Strength": {
    ack: "Love it, {name}. We will build a deep, steady core that supports every move.",
    age: "At {age}, we sharpen activation so strength grows without strain.",
    weight: "Thanks. I will use this to set starting loads so work feels strong.",
    height: "Great. Your height helps me dial plank angles and hinge depth."
  },
  // Default fallback for others
  "default": {
    ack: "Excellent choice, {name}. We will stack you tall and steady.",
    age: "At {age}, we train deep core timing for all-day support.",
    weight: "Thank you. I will set progressions that protect your back.",
    height: "Noted. Your height guides stance so alignment clicks quickly."
  }
};

// --- B. COMPONENT: The Chat Bubble ---
const ChatBubble = ({ text, isTyping }) => (
  <div className="bg-white rounded-2xl rounded-tl-none p-5 shadow-sm border border-app-borderIdle max-w-[90%] self-start mb-6 animate-fade-in">
    {isTyping ? (
      <div className="flex gap-1.5 h-6 items-center">
        <div className="w-2 h-2 bg-app-textSecondary/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 bg-app-textSecondary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-app-textSecondary/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    ) : (
      <p className="text-[17px] leading-relaxed text-app-textPrimary font-medium">
        {text}
      </p>
    )}
  </div>
);

// --- C. COMPONENT: The Ruler Picker (Scrollable) ---
const RulerPicker = ({ min, max, unit, value, onChange }) => {
  const scrollRef = useRef(null);
  const itemHeight = 60; // Height of each number

  // Generate numbers
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Handle Scroll to find center
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const center = scrollRef.current.scrollTop + (scrollRef.current.clientHeight / 2);
    const index = Math.floor(center / itemHeight);
    const newValue = numbers[index];
    if (newValue && newValue !== value) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative w-full h-[300px] flex justify-center items-center overflow-hidden">
      {/* Selection Line/Indicator */}
      <div className="absolute w-full h-[60px] border-t-2 border-b-2 border-app-primary/20 bg-app-primary/5 z-10 pointer-events-none" />
      
      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[120px]"
      >
        {numbers.map((num) => (
          <div 
            key={num} 
            className={`h-[60px] flex items-center justify-center snap-center transition-all duration-200 ${num === value ? 'scale-125 font-bold text-app-primary' : 'scale-100 text-app-textSecondary/50'}`}
          >
            <span className="text-3xl">{num}</span>
            {num === value && <span className="text-lg ml-1 font-medium text-app-textPrimary">{unit}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- D. MAIN SCREEN ---
export default function PersonalIntakeScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [step, setStep] = useState('name'); // name, age, weight, height
  const [isTyping, setIsTyping] = useState(true);
  const [displayMessage, setDisplayMessage] = useState("");
  
  // Input States
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(65); // inches

  // Get Copy based on Goal
  const goalTitle = userDetails.selectedTarget?.title || "default";
  const copy = miaLogic[goalTitle] || miaLogic["default"];

  // --- Logic: Typing Effect & Step Management ---
  useEffect(() => {
    // Start typing effect whenever step changes
    setIsTyping(true);
    let message = "";

    if (step === 'name') {
      message = "Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?";
    } else if (step === 'age') {
      message = copy.ack.replace("{name}", name) + " To start, what's your age?";
    } else if (step === 'weight') {
      message = copy.age.replace("{age}", age) + " Now, what's your current weight?";
    } else if (step === 'height') {
      message = copy.weight + " And what's your height?";
    }

    // Delay to simulate "thinking"
    const timer = setTimeout(() => {
      setIsTyping(false);
      setDisplayMessage(message);
    }, 1500);

    return () => clearTimeout(timer);
  }, [step, name, age, weight, height, copy]);

  // --- Handlers ---
  const handleContinue = () => {
    if (step === 'name') {
      if (name.length < 2) return; // Validation
      saveUserData('name', name);
      setStep('age');
    } else if (step === 'age') {
      saveUserData('age', age);
      setStep('weight');
    } else if (step === 'weight') {
      saveUserData('weight', weight);
      setStep('height');
    } else if (step === 'height') {
      saveUserData('height', height);
      onNext(); // Go to Plan Reveal
    }
  };

  return (
    // h-[100dvh] ensures it fits mobile screen exactly including address bars
    <div className="flex flex-col w-full h-[100dvh] bg-app-background relative overflow-hidden">
      
      {/* Top Section: Avatar & Chat */}
      <div className="flex-1 flex flex-col px-6 pt-10 pb-4 overflow-y-auto no-scrollbar">
        {/* Coach Row */}
        <div className="flex gap-4 items-end mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
             <img src="/coachMiaAvatar.png" alt="Mia" className="w-full h-full object-cover" />
          </div>
          <ChatBubble text={displayMessage} isTyping={isTyping} />
        </div>
      </div>

      {/* Middle Section: Inputs */}
      <div className="flex-1 flex flex-col justify-center items-center w-full px-6 transition-all duration-500">
        {!isTyping && (
          <>
            {step === 'name' && (
              <div className="w-full animate-slide-up">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type your name..."
                  className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-app-borderIdle focus:border-app-primary outline-none py-2 text-app-textPrimary placeholder:text-app-textSecondary/30"
                  autoFocus
                />
              </div>
            )}

            {step === 'age' && (
              <div className="w-full animate-slide-up">
                <RulerPicker min={18} max={99} unit="yrs" value={age} onChange={setAge} />
              </div>
            )}

            {step === 'weight' && (
              <div className="w-full animate-slide-up">
                <RulerPicker min={80} max={400} unit="lbs" value={weight} onChange={setWeight} />
              </div>
            )}

            {step === 'height' && (
              <div className="w-full animate-slide-up">
                {/* Simplified Height Picker (Inches) */}
                <RulerPicker min={48} max={84} unit="in" value={height} onChange={setHeight} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Section: Button */}
      <div className="w-full px-6 pb-8 pt-4 bg-gradient-to-t from-app-background to-transparent z-20">
        <button 
          onClick={handleContinue}
          disabled={isTyping || (step === 'name' && name.length < 2)}
          className={`w-full h-14 font-bold text-lg rounded-full shadow-lg transition-all duration-300
            ${isTyping || (step === 'name' && name.length < 2)
              ? 'bg-app-borderIdle text-app-textSecondary cursor-not-allowed opacity-50' 
              : 'bg-app-primary text-white shadow-app-primary/30 active:scale-95'}
          `}
        >
          {step === 'height' ? 'Generate My Plan' : 'Next'}
        </button>
      </div>

    </div>
  );
}
