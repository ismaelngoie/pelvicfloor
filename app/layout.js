import { Inter } from "next/font/google";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

// 1. Viewport MUST be a separate export in Next.js App Router
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // <--- THIS FIXES THE ISLAND/BOTTOM BAR
  themeColor: "#000000", // Helps blend the status bar
};

export const metadata = {
  title: "Pelvic Floor & Core Coach",
  description: "Strength & Confidence From Your Core Outward.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // This allows content to go under the status bar
    title: "Pelvic Coach",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* We add 'fixed inset-0' to body to ensure the base layer 
        doesn't scroll or bounce behind your app 
      */}
      <body className={`${inter.className} bg-black sm:bg-gray-100 flex flex-col sm:justify-center sm:items-center fixed inset-0 w-full h-[100dvh]`}>
        
        {/* THE FRAME CONTAINER */}
        <div className="w-full h-full sm:h-[850px] sm:w-[400px] bg-app-background relative overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 shadow-2xl flex flex-col">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
