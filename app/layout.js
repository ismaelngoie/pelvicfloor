import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

// --- 1. VIEWPORT CONFIGURATION ---
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: "cover",
  themeColor: "#E65473",
};

// --- 2. ROBUST SEO METADATA ---
export const metadata = {
  metadataBase: new URL('https://pelvi.health'),
  title: {
    default: "Pelvic Floor Exercises & Therapy | Stop Leaks & Prolapse",
    template: "%s | Pelvi Health"
  },
  description: "Clinically validated at-home pelvic floor therapy. 5-minute daily exercises for incontinence, prolapse, postpartum recovery, and core strength. Better than Kegels.",
  
  keywords: [
    "pelvic floor exercises",
    "pelvic floor therapy",
    "incontinence treatment",
    "prolapse exercises",
    "postpartum recovery",
    "diastasis recti",
    "kegel exercises",
    "core strengthening",
    "bladder control",
    "pelvic health app",
    "at home physical therapy"
  ],

  icons: {
    icon: "/icon.png",        
    shortcut: "/icon.png", 
    apple: "/logo.png",       
  },

  openGraph: {
    title: "Pelvic Floor Exercises & Therapy",
    description: "Heal your core and stop leaks in 5 minutes a day. The #1 App for Pelvic Health.",
    url: 'https://pelvi.health',
    siteName: 'Pelvi Health',
    images: [
      {
        url: '/og-image.png', 
        width: 1200,
        height: 630,
        alt: 'Pelvic Floor Therapy App Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: "Pelvic Floor Exercises & Therapy",
    description: "Heal your core and stop leaks in 5 minutes a day.",
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
      <body className={`${inter.className} bg-black sm:bg-gray-100 flex flex-col sm:justify-center sm:items-center fixed inset-0 w-full h-full`}>
        
        {/* --- 3. GOOGLE TAG (ADS) --- */}
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

        {/* --- APP CONTAINER --- */}
        <div className="w-full h-full sm:h-[850px] sm:w-[400px] bg-app-background relative overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 shadow-2xl flex flex-col">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
