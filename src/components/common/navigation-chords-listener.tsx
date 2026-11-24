"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CHORD_NAV_MAP,
  shouldIgnoreNavigationChord,
  isAnyModalOpen,
} from "@/lib/services/navigation-chords-service";

export { CHORD_NAV_MAP, shouldIgnoreNavigationChord, isAnyModalOpen };

export function NavigationChordsListener() {
  const router = useRouter();
  const leaderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaderKeyRef = useRef<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if modifier keys are active
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore if focus is in an input or editable field
      if (shouldIgnoreNavigationChord(e.target)) return;
      // Ignore if any modal is currently open
      if (isAnyModalOpen()) return;

      const key = e.key.toLowerCase();

      // If leader "g" was pressed and this is the second key within 700ms
      if (leaderKeyRef.current === "g") {
        if (leaderTimerRef.current) {
          clearTimeout(leaderTimerRef.current);
          leaderTimerRef.current = null;
        }
        leaderKeyRef.current = null;

        const targetRoute = CHORD_NAV_MAP[key];
        if (targetRoute) {
          e.preventDefault();
          router.push(targetRoute);
        }
        return;
      }

      // First key: "g"
      if (key === "g") {
        leaderKeyRef.current = "g";
        if (leaderTimerRef.current) {
          clearTimeout(leaderTimerRef.current);
        }
        leaderTimerRef.current = setTimeout(() => {
          leaderKeyRef.current = null;
          leaderTimerRef.current = null;
        }, 700);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (leaderTimerRef.current) {
        clearTimeout(leaderTimerRef.current);
      }
    };
  }, [router]);

  return null;
}
