"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // Unregister service workers in dev to prevent stale cache issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // SW registration failed silently
        });
      }
    }
  }, []);

  return null;
}
