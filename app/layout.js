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

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/logo.png",
  },

  openGraph: {
    title: "Stop Leaks & Improve Intimacy | Pelvi Health",
    description:
      "Improve intimacy, stop bladder leaks and build core strength with our personalized 5-Minute daily home plan.",
    url: "https://pelvi.health",
    siteName: "Pelvi Health",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pelvic Floor Coach Preview",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} fixed inset-0 h-full overflow-hidden bg-[#FAF9FA] md:bg-[#F2F1F2]`}>
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

        {/* --- MICROSOFT CLARITY --- */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "v8cur93469");
          `}
        </Script>

        {/* Full-height app shell; ONLY the inside scrolls */}
        <div className="flex h-dvh flex-col min-h-0">
          <div className="w-full flex-1 min-h-0 overflow-hidden">
            <div className="w-full h-full mx-auto bg-[#FAF9FA] md:max-w-6xl md:shadow-2xl md:border-x md:border-white/50 flex flex-col min-h-0">
              {/* ✅ Only this area scrolls */}
              <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] no-scrollbar">
                <UserDataProvider>{children}</UserDataProvider>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
