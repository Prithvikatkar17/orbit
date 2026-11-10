"use client";

import React, { useEffect } from "react";
import { checkDueReminders } from "@/lib/services/reminder-service";
import { useNotificationStore } from "@/lib/stores/notification-store";

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hydrate persisted notifications from IndexedDB, then check due reminders
    async function init() {
      await useNotificationStore.getState().hydrateNotifications();
      await checkDueReminders();
    }
    init();

    // Check periodically every 30 seconds
    const interval = setInterval(() => {
      checkDueReminders();
    }, 30_000);

    // Also check when tab becomes visible or receives focus
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkDueReminders();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  return <>{children}</>;
}

