"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';

// Logic from MiaCopyProvider
const getMessage = (step: string, name: string, age: number) => {
    switch(step) {
        case "name": return "Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?";
        case "age": return `Nice to meet you, ${name}. To start, what's your age?`;
        case "weight": return `At ${age}, we focus on calm breath and steady endurance. Now, what's your current weight (lbs)?`;
        case "height": return "Thanks. I will set positions that feel doable. Finally, what's your height (inches)?";
        default: return "";
    }
};

export default function PersonalIntakeStep() {
    const { userData, updateFields, nextStep } = useOnboarding();
    
    const [subStep, setSubStep] = useState<"name" | "age" | "weight" | "height">("name");
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    
    // Typing effect
    useEffect(() => {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 1200);
        return () => clearTimeout(timer);
    }, [subStep]);

    const handleContinue = () => {
        if (!inputValue) return;

        if (subStep === "name") {
            updateFields({ name: inputValue });
            setInputValue("");
            setSubStep("age");
        } else if (subStep === "age") {
            updateFields({ age: parseInt(inputValue) });
            setInputValue("");
            setSubStep("weight");
        } else if (subStep === "weight") {
            updateFields({ weight: parseInt(inputValue) });
            setInputValue("");
            setSubStep("height");
        } else if (subStep === "height") {
            updateFields({ height: parseInt(inputValue) });
            nextStep(); // Move to Plan Reveal
        }
    };

    return (
        <div className="flex flex-col h-full p-6 max-w-md mx-auto pt-16">
            
            {/* Chat Bubble Area */}
            <div className="flex items-start space-x-3 mb-10">
                <div className="w-12 h-12 rounded-full bg-pink-200 flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                    {/* Placeholder Avatar */}
                    <div className="w-full h-full bg-appPrimaryAccent flex items-center justify-center text-white text-xs">Mia</div>
                </div>
                
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-appBorderIdle max-w-[80%]">
                    {isTyping ? (
                        <div className="flex space-x-1 h-6 items-center">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    ) : (
                        <p className="text-appTextPrimary text-lg">
                            {getMessage(subStep, userData.name, userData.age)}
                        </p>
                    )}
                </div>
            </div>

            {/* Input Area (Centered) */}
            <div className={`flex-1 flex flex-col items-center justify-center transition-opacity duration-500 ${isTyping ? 'opacity-0' : 'opacity-100'}`}>
                {subStep === "name" ? (
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Your Name"
                        className="text-center text-3xl font-bold border-b-2 border-appBorderIdle focus:border-appPrimaryAccent outline-none bg-transparent w-full pb-2"
                        autoFocus
                    />
                ) : (
                    <div className="relative w-full">
                        <input 
                            type="number" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="text-center text-6xl font-bold text-appPrimaryAccent outline-none bg-transparent w-full"
                            autoFocus
                        />
                        <p className="text-center text-appTextSecondary mt-2">
                            {subStep === "height" ? "inches" : subStep === "weight" ? "lbs" : "years"}
                        </p>
                    </div>
                )}
            </div>

            <button 
                onClick={handleContinue}
                disabled={!inputValue || isTyping}
                className="w-full h-14 bg-appPrimaryAccent disabled:opacity-50 text-white text-lg font-bold rounded-full shadow-lg mb-8"
            >
                {subStep === "height" ? "Generate Plan" : "Next"}
            </button>
        </div>
    );
}
