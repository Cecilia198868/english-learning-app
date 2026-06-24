"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 60_000;

export default function SessionInvalidationWatcher() {
  useEffect(() => {
    let isRedirecting = false;
    let intervalId = 0;

    async function checkSession() {
      if (isRedirecting || document.visibilityState === "hidden") return;

      try {
        const response = await fetch("/api/auth/session-status", {
          cache: "no-store",
        });

        if (response.status === 409) {
          isRedirecting = true;
          window.location.assign("/api/auth/session-replaced");
        }
      } catch {
        // Session checks are best-effort; the next navigation/API call still
        // performs server-side validation.
      }
    }

    function checkOnFocus() {
      void checkSession();
    }

    void checkSession();
    intervalId = window.setInterval(checkSession, CHECK_INTERVAL_MS);
    window.addEventListener("focus", checkOnFocus);
    document.addEventListener("visibilitychange", checkOnFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkOnFocus);
      document.removeEventListener("visibilitychange", checkOnFocus);
    };
  }, []);

  return null;
}
