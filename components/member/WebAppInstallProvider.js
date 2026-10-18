"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { createWebAppInstallStore } from "@/lib/webAppInstall";

const WebAppInstallContext = createContext(null);

export function WebAppInstallProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createWebAppInstallStore();
  useEffect(() => storeRef.current.connect(window), []);
  return <WebAppInstallContext.Provider value={storeRef.current}>{children}</WebAppInstallContext.Provider>;
}

export function useWebAppInstall() {
  const store = useContext(WebAppInstallContext);
  if (!store) throw new Error("Home-screen setup requires the member layout.");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...state, requestInstall: store.requestInstall };
}
