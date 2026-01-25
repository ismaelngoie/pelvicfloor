import { Inter } from "next/font/google";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pelvic Floor & Core Coach",
  description: "Strength & Confidence From Your Core Outward.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* LOGIC:
        1. Mobile (default): Background is 'app-background', flex col, full width/height.
        2. Desktop (sm+): Background is gray-100, flex center to show the "phone frame".
      */}
      <body className={`${inter.className} bg-app-background sm:bg-gray-100 flex flex-col sm:justify-center sm:items-center min-h-screen`}>
        
        {/* THE FRAME CONTAINER:
           - Mobile: w-full, min-h-[100dvh] (fills screen exactly, respects address bar)
           - Desktop: Fixed width/height, rounded corners, border (the "phone look")
        */}
        <div className="w-full min-h-[100dvh] sm:min-h-0 sm:h-[850px] sm:w-[400px] bg-app-background relative overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 shadow-2xl flex flex-col">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
