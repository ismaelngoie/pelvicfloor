import React from 'react';

export const Icons = {
  Check: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  Logo: () => (
    <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
        <span className="text-white font-bold text-2xl">PF</span>
    </div>
  ),
  Butterfly: ({ color = "#E65473" }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} opacity="0.6">
        <path d="M12 2C12 2 14 6 18 6C22 6 22 2 22 2C22 2 20 10 18 12C16 14 12 12 12 12C12 12 8 14 6 12C4 10 2 2 2 2C2 2 2 6 6 6C10 6 12 2 12 2Z" />
    </svg>
  )
};
