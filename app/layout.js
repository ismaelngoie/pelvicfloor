import { Inter } from "next/font/google";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pelvic Floor & Core Coach",
  description: "Strength & Confidence From Your Core Outward.",
  manifest: "/manifest.json", // <--- TELLS DEVICES IT IS A PWA
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pelvic Coach",
  },
  // This forces the "Add to Home Screen" icon to look right on iOS
  icons: {
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black sm:bg-gray-100 flex flex-col sm:justify-center sm:items-center fixed inset-0 w-full h-[100dvh]`}>
        
        {/* THE FRAME CONTAINER:
           Mobile: w-full h-full (Takes up exact screen space)
           Desktop: Bounded box
        */}
        <div className="w-full h-full sm:h-[850px] sm:w-[400px] bg-app-background relative overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 shadow-2xl flex flex-col">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
