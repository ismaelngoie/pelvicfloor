/** @type {import('tailwindcss').Config} */

// The palette is lifted verbatim from the iOS app so the two products cannot
// drift. Source: "Pelvic Floor/Helper/Extensions/ColorExtensions.swift" and
// "Pelvic Floor/Assets.xcassets/Colors/". If a colour is not in this file it
// does not belong in the web app either.
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    // Compiles every `hover:` utility inside `@media (hover: hover)`. Without
    // it a tapped card on a phone keeps its hover skin until something else is
    // tapped, and on a 1210px iPad in landscape the desktop layout is live
    // while hover is not, so a hover-only affordance is simply unreachable.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Two extra stops on top of the stock scale. Stock stays stock, so
      // sm/md/lg/xl still mean what everyone already thinks they mean.
      //
      // `tab` is the one that earns its keep. An iPad mini in portrait is
      // 744px, which stock Tailwind files under `sm` — so it would get the
      // phone layout stretched to 744px, and a Galaxy Z Fold unfolded (883px)
      // falls in the same hole. 704 sits below both and above every phone in
      // landscape, so it is where "this is a tablet" is actually true.
      //
      // Values are px, not rem, because the stock v3 scale is px and the
      // breakpoint sort is unit-naive: mixing the two silently reorders them.
      screens: {
        xs: '416px',   // large phone
        tab: '704px',  // tablet mode starts here
        '3xl': '1920px', // the cap; nothing gets wider or denser past this
      },
      colors: {
        app: {
          primary: '#E65473',      // appPrimaryAccent
          background: '#FAF9FA',   // appBackground
          textPrimary: '#1A1A26',  // appTextPrimary
          textSecondary: '#737380',// appTextSecondary
          surface: '#FFFFFF',      // appSurface
          borderIdle: '#EBEBF0',   // appBorderIdle
          positive: '#33B373',     // appPositiveFeedback
          // The two "ink" shades exist because iOS renders these colours on
          // glass and we render them on paper. #33B373 on #FAF9FA measures
          // 2.55:1 and #E65473 measures 3.40:1, so every helper line and every
          // small pink footnote in the funnel failed WCAG AA. These are the same
          // hues, darkened until they clear 4.5:1 on both #FFFFFF and #FAF9FA.
          // Use them for TEXT under 18px on a light background; keep `positive`
          // and `primary` for fills, borders, icons and large type.
          positiveInk: '#137A48',  // 5.12:1 on #FAF9FA, 5.38:1 on white
          primaryInk: '#C0374F',   // 5.13:1 on #FAF9FA, 5.38:1 on white
        },
        // The app's dominant accent is UIKit systemPink, not appPrimaryAccent.
        // Buttons, selection rings, the tab tint and the rulers all use it.
        ios: {
          pink: '#FF2D55',         // systemPink
          purple: '#AF52DE',       // systemPurple
          yellow: '#FFCC00',       // systemYellow (rating star)
          gray4: '#D1D1D6',        // systemGray4 (typing dots)
        },
        brand: {
          rose: '#E65473',
          roseDeep: '#C33A5C',
          roseLight: '#F68AA2',
          blushTop: '#FFF9FB',
          blushBottom: '#FEE6ED',
          plumTop: '#25131A',
          plumBottom: '#120A0E',
          theme: '#FF566E',
        },
        // Per-goal card gradients, matching GoalID's asset colours.
        goal: {
          bladderLeaksFrom: '#EDF5FF', bladderLeaksTo: '#D9EDFC',
          intimacyFrom: '#FFF0F5',     intimacyTo: '#FCE0ED',
          postpartumFrom: '#F2FAF2',   postpartumTo: '#E0F2E3',
          pregnancyPrepFrom: '#F7F2FF',pregnancyPrepTo: '#EBE0FC',
          pelvicPainFrom: '#FFF7ED',   pelvicPainTo: '#FCEBD9',
          diastasisFrom: '#F0F7FA',    diastasisTo: '#DEF0F5',
          coreFrom: '#F2F2FA',         coreTo: '#E3E6F7',
        },
      },
      fontFamily: {
        // Inter is loaded in app/layout.js via next/font and exposed as
        // --font-inter. The paywall and the plan reveal deliberately use the
        // system stack, matching iOS, which uses SF Pro on those two screens.
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        system: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(135deg, #E65473 0%, #C33A5C 100%)',
        'paywall-cta': 'linear-gradient(90deg, #FF3B61 0%, #D959E8 100%)',
        'blush': 'linear-gradient(180deg, #FFF9FB 0%, #FEE6ED 100%)',
        'plum': 'linear-gradient(180deg, #25131A 0%, #120A0E 100%)',
      },
      borderRadius: {
        'card': '18px',
        'sheet': '35px',
        'pill': '28px',
      },
      animation: {
        'float': 'float 15s ease-in-out infinite',
        'breathe': 'breathe 2.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'draw-line': 'drawLine 0.8s ease-out forwards',
        'pop-in': 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'ai-spin': 'spin 8s linear infinite',
        'ai-spin-reverse': 'spin 12s linear infinite reverse',
        'ai-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        spin: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.5' } },
        ping: { '75%, 100%': { transform: 'scale(2)', opacity: '0' } },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        breathe: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.04)' } },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        drawLine: { '0%': { strokeDashoffset: '100' }, '100%': { strokeDashoffset: '0' } },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
