import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

// --- 1. VIEWPORT CONFIGURATION ---
// Optimized for mobile-first but responsive
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: "cover",
  themeColor: "#E65473",
};

// --- 2. SEO & METADATA (INTIMACY & LEAKS FOCUS) ---
export const metadata = {
  metadataBase: new URL('https://pelvi.health'),
  title: {
    default: "Pelvic Floor Exercises | Stop Leaks & Improve Intimacy",
    template: "%s | Pelvi Health"
  },
  description: "Clinically validated 5-minute daily routines to stop bladder leaks, improve intimacy, and build core strength. No equipment needed.",
  
  // High-Intent Keywords (Swapped Prolapse for Intimacy)
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
    "pelvic health app"
  ],

  icons: {
    icon: "/icon.png",        
    shortcut: "/icon.png", 
    apple: "/logo.png",       
  },

  openGraph: {
    title: "Stop Leaks & Improve Intimacy | Pelvi Health",
    description: "Heal your core and transform your intimacy in 5 minutes a day. The #1 App for Pelvic Health.",
    url: 'https://pelvi.health',
    siteName: 'Pelvi Health',
    images: [
      {
        url: '/og-image.png', 
        width: 1200,
        height: 630,
        alt: 'Pelvic Floor Coach Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: "Stop Leaks & Improve Intimacy",
    description: "Heal your core in 5 minutes a day.",
    images: ['/og-image.png'],
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
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* LAYOUT UPDATE:
         - Removed 'fixed inset-0' so desktop users can scroll.
         - Removed 'sm:w-[400px]' phone box constraints.
         - Added 'bg-[#FAF9FA]' for a premium dashboard background feel.
      */}
      <body className={`${inter.className} bg-[#FAF9FA] min-h-screen flex flex-col`}>
        
        {/* --- 3. GOOGLE ADS TAG --- */}
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

        {/* --- 4. MICROSOFT CLARITY --- */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "v8cur93469");
          `}
        </Script>

        {/* APP CONTAINER:
           - On Mobile: Full width, behaves like a native app.
           - On Desktop: Centered, max-width constrained for readability, but NOT a tiny phone box.
        */}
        <div className="w-full min-h-screen flex flex-col mx-auto bg-app-background shadow-sm">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
