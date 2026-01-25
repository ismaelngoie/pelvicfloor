/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        appPrimaryAccent: '#E65473',
        appBackground: '#FAF9FA',
        appTextPrimary: '#1A1A26',
        appTextSecondary: '#737380',
        appBorderIdle: '#EBEBF0',
      },
      fontFamily: {
        // iOS uses System Font. San Francisco is default on Apple devices.
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
