import { Inter } from "next/font/google";
import "./globals.css";
import { UserDataProvider } from "@/context/UserDataContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pelvic Floor & Core Coach",
  description: "Strength & Confidence From Your Core Outward.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 flex justify-center items-center min-h-screen`}>
        {/* Simulate Mobile Frame on Desktop */}
        <div className="w-full max-w-[430px] h-[100dvh] bg-app-background shadow-2xl relative overflow-hidden sm:rounded-[40px] sm:h-[900px] sm:border-[8px] sm:border-gray-900">
          <UserDataProvider>
            {children}
          </UserDataProvider>
        </div>
      </body>
    </html>
  );
}
