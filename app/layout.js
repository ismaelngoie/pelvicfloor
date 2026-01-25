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
      <body className={`${inter.className} bg-black sm:bg-gray-100 flex justify-center items-center min-h-screen`}>
        {/* FIX: 
           1. 'w-full h-[100dvh]' ensures it fills a real phone screen exactly.
           2. 'sm:h-[850px] sm:w-[400px]' restricts it ONLY on desktop/tablets.
           3. 'sm:rounded-[40px]' adds corners ONLY on desktop.
        */}
        <div className="w-full h-[100dvh] sm:h-[850px] sm:w-[400px] bg-app-background relative overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 shadow-2xl">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
