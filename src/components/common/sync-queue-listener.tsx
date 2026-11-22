"use client";

import { useEffect } from "react";
import { flushSyncQueue } from "@/lib/services/sync-queue-service";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";

export function usePendingSyncCount(): number {
  return useLiveQuery(() => db.syncQueue.count(), []) ?? 0;
}

export function SyncQueueListener() {
  useEffect(() => {
    // 1. Initial flush on mount
    void flushSyncQueue();

    // 2. Auto-flush on network reconnection
    function handleOnline() {
      void flushSyncQueue();
    }

    // 3. Auto-flush when user returns to app
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void flushSyncQueue();
      }
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
