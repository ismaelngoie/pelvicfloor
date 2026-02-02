"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { UserDataProvider } from "@/context/UserDataContext";

export default function AppFrameClient({ children }) {
  const pathname = usePathname();
  const mainRef = useRef(null);

  // ✅ Lock OUTER scroll on desktop only for onboarding-like routes
  // Adjust these checks if your onboarding is on a different path.
  const lockDesktopOuterScroll = useMemo(() => {
    if (!pathname) return false;

    // Common setups:
    // - onboarding on "/"
    // - onboarding on "/onboarding"
    // Add more routes if needed (e.g. "/intro", "/quiz", etc.)
    return pathname === "/" || pathname.startsWith("/onboarding");
  }, [pathname]);

  // ✅ If the outer scroll already happened, reset it so the card snaps back down
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!lockDesktopOuterScroll) return;

    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) return;

    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [lockDesktopOuterScroll, pathname]);

  // ✅ Mobile stays the same (scrollable main).
  // ✅ Desktop: lock main scroll only on onboarding routes (prevents card moving up).
  const mainClassName = `
    flex-1 min-h-0
    ${lockDesktopOuterScroll ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}
    overscroll-contain
    [-webkit-overflow-scrolling:touch] no-scrollbar
    pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
    pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
  `;

  return (
    <div className="flex h-dvh flex-col min-h-0">
      <div className="w-full flex-1 min-h-0 overflow-hidden">
        <div className="w-full h-full mx-auto bg-[#FAF9FA] md:max-w-6xl md:shadow-2xl md:border-x md:border-white/50 flex flex-col min-h-0">
          <main ref={mainRef} className={mainClassName}>
            <UserDataProvider>{children}</UserDataProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
