"use client";
import React from 'react';
import { Icons } from '@/components/Icons';

export default function SubscriptionStep() {
    // In a real app, integrate Stripe/RevenueCat here.
    const handlePurchase = () => {
        alert("This would trigger the purchase flow.");
    };

    return (
        <div className="flex flex-col h-full bg-black text-white relative">
            {/* Background Video Mock */}
            <div className="absolute inset-0 bg-gray-900 z-0">
                {/* <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-60">
                    <source src="/paywall_video.mp4" type="video/mp4" />
                </video> */}
                {/* Fallback gradient if no video */}
                <div className="w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-black opacity-80"></div>
            </div>

            <div className="z-10 flex flex-col h-full p-6 pt-12 overflow-y-auto">
                <h1 className="text-4xl font-black text-center mb-6 drop-shadow-lg">
                    Ready to stop leaks?
                </h1>

                {/* Features Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 mb-6">
                    <h3 className="font-bold text-center mb-4">Your Plan Includes:</h3>
                    <div className="space-y-4">
                        {[
                            "AI Coach adapts daily",
                            "5-min personalized routines",
                            "300+ physio-approved videos",
                            "Trackable progress"
                        ].map((feat, i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <Icons.Butterfly color="white" />
                                <span className="font-medium">{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Social Proof */}
                <div className="bg-white/5 rounded-2xl p-4 mb-8">
                    <div className="flex items-center justify-center space-x-1 text-yellow-400 mb-2">
                        {"★★★★★".split("").map((s,i) => <span key={i}>{s}</span>)}
                    </div>
                    <p className="text-center italic text-sm text-gray-300">
                        "Zero leaks by week 2. I cried happy tears." <br/>
                        <span className="font-bold not-italic text-white">- Emily, 39</span>
                    </p>
                </div>

                {/* Sticky Bottom CTA */}
                <div className="mt-auto pt-4">
                    <button 
                        onClick={handlePurchase}
                        className="w-full h-14 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full font-bold text-lg shadow-xl breathing-button mb-3"
                    >
                        Start My Leak-Free Plan
                    </button>
                    <p className="text-center text-xs text-gray-400">
                        Try for 7 days. If not satisfied, 100% money-back guarantee.
                    </p>
                    <div className="flex justify-center space-x-6 mt-4 text-xs text-gray-500">
                        <button>Restore</button>
                        <button>Terms</button>
                        <button>Privacy</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
