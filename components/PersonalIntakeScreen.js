"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '@/context/UserDataContext';

// --- DATA: Mia's Logic (Exact copy from your Swift code) ---
const miaLogic = {
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
  "default": {
    ack: "Excellent, {name}. We will stack you tall and steady so your body feels organized again.",
    age: "At {age}, we train deep core timing and endurance for all day support, not just during workouts.",
    weight: "Thank you. I will set progressions that protect your back while strength builds.",
    height: "Noted. Your height guides stance and reach so alignment clicks quickly and stays with you."
  }
};

// --- COMPONENT: Typing Indicator ---
const TypingIndicator = () => (
  <div className="flex space-x-1 p-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
  </div>
);

// --- COMPONENT: Chat Bubble ---
const ChatBubble = ({ text, isTyping }) => (
  <div className="flex items-end gap-3 mb-6 animate-fade-in-up">
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
       <img src="/CoachMiaAvatar.jpg" alt="Mia" className="w-full h-full object-cover" />
    </div>
    
    {/* Bubble */}
    <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-none shadow-sm border border-app-borderIdle max-w-[85%]">
      {isTyping ? (
        <TypingIndicator />
      ) : (
        <p className="text-[16px] text-app-textPrimary leading-relaxed">
          {text}
        </p>
      )}
    </div>
  </div>
);

// --- COMPONENT: Wheel Picker (The "Million Dollar" Input) ---
const WheelPicker = ({ range, value, onChange, unit }) => {
  const scrollerRef = useRef(null);
  const ITEM_HEIGHT = 50; // Height of each number in px

  // Handle Scroll Snap Logic
  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const scrollY = scrollerRef.current.scrollTop;
    const index = Math.round(scrollY / ITEM_HEIGHT);
    const newValue = range[index];
    
    if (newValue && newValue !== value) {
      onChange(newValue);
    }
  };

  // Initial Scroll Position
  useEffect(() => {
    if (scrollerRef.current) {
      const index = range.indexOf(value);
      if (index !== -1) {
        scrollerRef.current.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, []); // Run once on mount

  return (
    <div className="relative h-[250px] w-full max-w-[300px] mx-auto overflow-hidden mt-4">
      {/* Selection Highlight (Center Bar) */}
      <div className="absolute top-1/2 left-0 w-full h-[50px] -translate-y-1/2 border-t-2 border-b-2 border-app-primary/20 bg-app-primary/5 pointer-events-none z-10" />
      
      {/* Gradient Masks */}
      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-app-background to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-t from-app-background to-transparent z-20 pointer-events-none" />

      {/* Scrollable List */}
      <div 
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[100px]" // Padding creates empty space top/bottom
      >
        {range.map((num) => (
          <div 
            key={num} 
            className={`h-[50px] flex items-center justify-center snap-center transition-all duration-200 ${num === value ? 'scale-125 font-bold text-app-primary' : 'scale-100 text-app-textSecondary/40'}`}
          >
            <span className="text-3xl">{num}</span>
            {unit && <span className="text-sm ml-1 mt-2 font-medium">{unit}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN SCREEN ---
export default function PersonalIntakeScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [step, setStep] = useState('name'); 
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]); // Stores chat history
  
  // Input States
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(65);

  // Logic Lookup
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const copy = miaLogic[goalTitle] || miaLogic["default"];

  // --- Helper: Add Message to History with Delay ---
  const addMessage = (text, delay = 800) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setHistory(prev => [...prev, { text, sender: 'mia' }]);
    }, delay);
  };

  // --- Initial Load ---
  useEffect(() => {
    addMessage("Hi there! I'm Coach Mia. What should I call you?", 500);
  }, []);

  // --- Step Handlers ---
  const handleNext = () => {
    if (step === 'name') {
      if (name.length < 2) return;
      saveUserData('name', name);
      setHistory(prev => [...prev, { text: name, sender: 'user' }]); // Add user bubble
      
      const nextText = copy.ack.replace("{name}", name) + " To start, what's your age?";
      addMessage(nextText, 1200);
      setStep('age');
    } 
    else if (step === 'age') {
      saveUserData('age', age);
      const nextText = copy.age.replace("{age}", age) + " Now, what's your current weight?";
      addMessage(nextText, 1200);
      setStep('weight');
    } 
    else if (step === 'weight') {
      saveUserData('weight', weight);
      const nextText = copy.weight + " And what's your height?";
      addMessage(nextText, 1200);
      setStep('height');
    } 
    else if (step === 'height') {
      saveUserData('height', height);
      onNext();
    }
  };

  // --- Render Input Area Based on Step ---
  const renderInput = () => {
    if (isTyping) return null; // Hide inputs while Mia is typing

    switch (step) {
      case 'name':
        return (
          <div className="w-full animate-slide-up">
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
        return <WheelPicker range={Array.from({length: 80}, (_, i) => i + 16)} value={age} onChange={setAge} unit="yrs" />;
      case 'weight':
        return <WheelPicker range={Array.from({length: 300}, (_, i) => i + 80)} value={weight} onChange={setWeight} unit="lbs" />;
      case 'height':
        return <WheelPicker range={Array.from({length: 40}, (_, i) => i + 48)} value={height} onChange={setHeight} unit="in" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-app-background relative">
      
      {/* 1. Chat History Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-8 pb-4 flex flex-col">
        {history.map((msg, index) => (
          msg.sender === 'mia' ? (
            <ChatBubble key={index} text={msg.text} isTyping={false} />
          ) : (
            // User Bubble
            <div key={index} className="self-end bg-app-primary text-white px-5 py-3 rounded-2xl rounded-br-none shadow-sm mb-6 max-w-[80%] animate-fade-in-up">
              {msg.text}
            </div>
          )
        ))}
        
        {/* Active Typing Indicator Bubble */}
        {isTyping && <ChatBubble text="" isTyping={true} />}
        
        {/* Spacer to push content up */}
        <div className="h-4" />
      </div>

      {/* 2. Input Area (Fixed Bottom) */}
      <div className="w-full bg-white rounded-t-[30px] shadow-[0_-5px_30px_rgba(0,0,0,0.05)] p-6 pb-8 transition-all duration-500 ease-in-out z-20">
        
        {/* Dynamic Input Component */}
        <div className="mb-6 min-h-[100px] flex items-center justify-center">
          {renderInput()}
        </div>

        {/* Continue Button */}
        <button 
          onClick={handleNext}
          disabled={isTyping || (step === 'name' && name.length < 2)}
          className={`w-full h-14 font-bold text-lg rounded-full shadow-lg transition-all duration-300
            ${isTyping || (step === 'name' && name.length < 2)
              ? 'bg-app-borderIdle text-app-textSecondary cursor-not-allowed opacity-50' 
              : 'bg-app-primary text-white shadow-app-primary/30 active:scale-95 animate-pulse-slow'}
          `}
        >
          {step === 'height' ? 'Generate Plan' : 'Continue'}
        </button>
      </div>

    </div>
  );
}
