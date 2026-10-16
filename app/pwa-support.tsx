"use client";

import { useEffect } from "react";

export function PwaSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (!disposed) await registration.update();
      } catch (error) {
        console.warn("Todly: installazione PWA non disponibile.", error);
      }
    };
    void register();
    const refresh = () => { if (document.visibilityState === "visible") void register(); };
    document.addEventListener("visibilitychange", refresh);
    return () => { disposed = true; document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return null;
}
