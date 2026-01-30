"use client";

import { useEffect } from "react";

/**
 * Controls:
 * - Layout safe-area padding (top/bottom)
 * - Frame background behind safe-areas (Dynamic Island / notch area)
 * - <meta name="theme-color"> (Safari/Chrome toolbar color)
 * - CSS color-scheme (optional)
 */
export function useSystemBars({
  frameBg,
  safeTop,
  safeBottom,
  themeColor,
  colorScheme,
} = {}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Save previous inline overrides (empty string means "use CSS default")
    const prev = {
      frameBg: root.style.getPropertyValue("--app-frame-bg"),
      safeTop: root.style.getPropertyValue("--app-safe-top"),
      safeBottom: root.style.getPropertyValue("--app-safe-bottom"),
      colorScheme: root.style.colorScheme,
    };

    // Grab all theme-color metas (Next can render one; some setups render multiple)
    const themeMetas = Array.from(
      document.querySelectorAll('meta[name="theme-color"]')
    );
    const prevThemeMetaContents = themeMetas.map((m) => m.getAttribute("content"));
    let createdMeta = null;

    // Apply vars
    if (frameBg !== undefined) root.style.setProperty("--app-frame-bg", frameBg);
    if (safeTop !== undefined) root.style.setProperty("--app-safe-top", safeTop);
    if (safeBottom !== undefined)
      root.style.setProperty("--app-safe-bottom", safeBottom);

    if (colorScheme !== undefined) {
      root.style.colorScheme = colorScheme;
    }

    if (themeColor !== undefined) {
      if (themeMetas.length > 0) {
        themeMetas.forEach((m) => m.setAttribute("content", themeColor));
      } else {
        // If none exist, create one
        const m = document.createElement("meta");
        m.setAttribute("name", "theme-color");
        m.setAttribute("content", themeColor);
        document.head.appendChild(m);
        createdMeta = m;
      }
    }

    return () => {
      // Restore vars
      if (prev.frameBg) root.style.setProperty("--app-frame-bg", prev.frameBg);
      else root.style.removeProperty("--app-frame-bg");

      if (prev.safeTop) root.style.setProperty("--app-safe-top", prev.safeTop);
      else root.style.removeProperty("--app-safe-top");

      if (prev.safeBottom)
        root.style.setProperty("--app-safe-bottom", prev.safeBottom);
      else root.style.removeProperty("--app-safe-bottom");

      root.style.colorScheme = prev.colorScheme || "";

      // Restore theme-color
      if (createdMeta) {
        createdMeta.remove();
      } else if (themeMetas.length > 0) {
        themeMetas.forEach((m, i) => {
          const prevVal = prevThemeMetaContents[i];
          if (prevVal) m.setAttribute("content", prevVal);
          else m.removeAttribute("content");
        });
      }
    };
  }, [frameBg, safeTop, safeBottom, themeColor, colorScheme]);
}
