/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          primary: '#E65473', // Your "SystemPink"
          background: '#FAF9FA', // Your "AppBackground"
          textPrimary: '#1A1A26',
          textSecondary: '#737380',
          surface: '#FFFFFF',
          borderIdle: '#EBEBF0',
          positive: '#33B373',
        }
      },
      animation: {
        'float': 'float 15s ease-in-out infinite',
        'breathe': 'breathe 2.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'draw-line': 'drawLine 0.8s ease-out forwards',
        'pop-in': 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        // New AI Animations
        'ai-spin': 'spin 8s linear infinite',
        'ai-spin-reverse': 'spin 12s linear infinite reverse',
        'ai-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ai-ping': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};
