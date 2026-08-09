"use client";

// Registers public/sw.js. See that file for what it will and will not cache.
//
// Two details that matter more than the registration itself:
//
//   `updateViaCache: "none"` makes the browser refetch sw.js from the network
//   instead of its HTTP cache, so a fix to the worker cannot be delayed by up
//   to 24 hours. public/_headers sends `Cache-Control: no-cache` for /sw.js for
//   the same reason; belt and braces, because this is the one file that can
//   strand a member on an old build.
//
//   Registering after `load` keeps the worker off the critical path of the
//   landing page, which is paid traffic and is measured on how fast it paints.

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;
    // Service workers need a secure context. localhost counts; a preview served
    // over plain http on a LAN address does not, and would throw.
    const secure = window.isSecureContext;
    if (!secure) return undefined;

    let cancelled = false;
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // An install failure must never break the page. The site works
          // exactly the same without a worker; only installability is lost.
        });
    };

    if (document.readyState === "complete") {
      register();
      return () => {
        cancelled = true;
      };
    }
    window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
