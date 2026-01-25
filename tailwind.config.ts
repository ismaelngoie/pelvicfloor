import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EXACT MATCH from ColorExtensions.swift
        appPrimaryAccent: "#E65473",
        appBackground: "#FAF9FA",
        appTextPrimary: "#1A1A26",
        appTextSecondary: "#737380",
        appBorderIdle: "#EBEBF0",
        appPositiveFeedback: "#33B373",
      },
      boxShadow: {
        // Matches CTA button shadow: CGSize(width: 0, height: 4), Radius 10, Opacity 0.25
        'cta': '0 4px 10px rgba(0, 0, 0, 0.25)',
        // Matches pressed state: Radius 15, Opacity 0.6, Color Pink
        'cta-pressed': '0 0 15px rgba(230, 84, 115, 0.6)',
      },
      fontFamily: {
        // iOS System Font approximation
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
export default config;
