"use client";

import { useEffect } from "react";

export function PwaSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false, lastCheck = 0;
    const register = async () => {
      // Check for a new version at most every 30 minutes, so reopening the app does not compete with loading the tasks.
      if (Date.now() - lastCheck < 30 * 60 * 1000) return;
      lastCheck = Date.now();
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (!disposed) await registration.update();
      } catch (error) {
        console.warn("Todly: installazione PWA non disponibile.", error);
      }
    };
    // Wait until the page is ready and idle before touching the service worker.
    const hasIdle = "requestIdleCallback" in window;
    const start = () => { if (!disposed) void register(); };
    const timer = hasIdle ? window.requestIdleCallback(start, { timeout: 4000 }) : window.setTimeout(start, 2500);
    const refresh = () => { if (document.visibilityState === "visible") void register(); };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(timer); else window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return null;
}
