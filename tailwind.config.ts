import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        appPrimaryAccent: "#E65473", // The exact Rose Pink from your extension
        appTextPrimary: "#1A1A26",   // The dark navy/gray
        appTextSecondary: "#737380", // The soft gray
        appSurface: "#FFFFFF",
        appBorderIdle: "#EBEBF0",
      },
      fontFamily: {
        // THIS IS THE SECRET SAUCE: Uses the native OS font (San Francisco on iOS)
        sans: [
          "-apple-system", 
          "BlinkMacSystemFont", 
          "Segoe UI", 
          "Roboto", 
          "Helvetica", 
          "Arial", 
          "sans-serif"
        ],
      },
      animation: {
        'slide-up': 'slideUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', // Smoother iOS easing
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
