import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Clarity from "./Clarity";
import ServiceWorker from "./ServiceWorker";

const inter = Inter({ subsets: ["latin"] });

// --- 1. VIEWPORT CONFIGURATION ---
export const viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale and userScalable are gone on purpose. They fail WCAG 1.4.4
  // for anyone who needs to pinch a 12px footnote bigger, and iOS has ignored
  // both since iOS 10, so the only thing they ever really did was block zoom
  // on Android.
  viewportFit: "cover", // without this every env(safe-area-inset-*) resolves to 0px
  // Ask the browser to shrink the layout viewport when the keyboard opens
  // instead of sliding it over the top. Chromium honours it, Firefox is in
  // progress, Safari ignores it: which is why every bottom bar in the funnel
  // is a flex child rather than position: fixed.
  interactiveWidget: "resizes-content",
  themeColor: "#E65473",
};

// --- 2. SEO & METADATA ---
export const metadata = {
  metadataBase: new URL("https://pelvi.health"),
  title: {
    default: "Pelvic Floor Exercises | Stop Leaks & Improve Intimacy",
    template: "%s | Pelvi Health",
  },
  description:
    "Improve intimacy, stop bladder leaks and build core strength with our personalized 5-Minute daily home plan for Men & Women. No equipment needed.",

  keywords: [
    "pelvic floor exercises",
    "stop bladder leaks",
    "improve intimacy",
    "better sex exercises",
    "incontinence treatment",
    "postpartum recovery",
    "kegel exercises",
    "core strengthening",
    "bladder control",
    "pelvic health app",
  ],

  // /logo.png is the 160px hero mark on the welcome screen and nothing else.
  // It used to be pointed at from here too, which meant every page loaded a
  // 1024x1024, 615 KB PNG to draw a favicon.
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Stop Leaks & Improve Intimacy | Pelvi Health",
    description:
      "Improve intimacy, stop bladder leaks and build core strength with our personalized 5-Minute daily home plan.",
    url: "https://pelvi.health",
    siteName: "Pelvi Health",
    // This file did not exist until now. Every share of pelvi.health, in every
    // unfurl, on every platform, had no preview image at all.
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pelvi Health: Strength and Confidence From Your Core Outward.",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Stop Leaks & Improve Intimacy",
    description: "Heal your core in 5 minutes a day.",
    images: ["/og-image.png"],
  },

  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pelvi Health",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} fixed inset-0 h-full overflow-hidden bg-[#FAF9FA]`}
      >
        {/* --- GOOGLE ADS & ANALYTICS --- */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=AW-17911323675"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17911323675');
          `}
        </Script>

        {/* --- MICROSOFT CLARITY ---
            The tag used to be inlined here, unconditionally, which put session
            replay on /app and /admin too: member names, email addresses,
            billing state, symptom check-ins and Coach Mia transcripts. Pelvic
            health is data concerning health, which is special category data
            under GDPR Article 9, and none of that may be recorded.

            <Clarity /> injects the same tag, but only after checking the path
            AND the query string against the allowlist in lib/analytics.js, and
            it is deny-by-default: a route nobody has named there is private.
            Read the header of app/Clarity.jsx before moving this back inline.

            Note for whoever owns the Google tag above: it is still on every
            route, including /app and /admin. That is a separate decision and a
            separate vendor, and it is deliberately not touched here. */}
        <Clarity />

        {/* Full-height frame; body locked; ONLY interior scrolls */}
        <div className="flex h-dvh flex-col min-h-0">
          <div className="w-full flex-1 min-h-0 overflow-hidden">
            {/* The width cap stays, because the member app and the admin
                dashboard have no cap of their own and would run to 1920px
                without it. What is gone is the drop shadow, the side borders
                and the grey page behind them: together they drew a lit card on
                a dark table, which is the exact "app in a box" look every
                surface here is meant to stop having. Anything that wants the
                whole viewport (the marketing landing, the funnel) escapes this
                column with position: fixed, as the funnel already did. */}
            <div className="w-full h-full mx-auto bg-[#FAF9FA] md:max-w-6xl flex flex-col min-h-0">
              {/* ✅ scroll area + safe-area padding for iPhone notch/dynamic island */}
              <main
                className="
                  flex-1 min-h-0 overflow-y-auto overscroll-contain
                  [-webkit-overflow-scrolling:touch] no-scrollbar
                  pt-[var(--sat)] pb-[var(--sab)]
                  pl-[var(--sal)] pr-[var(--sar)]
                "
              >
                {children}
              </main>
              <ServiceWorker />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
