"use client";

import * as React from "react";
import {
  DEFAULT_THEME_PERSONALITY,
  ThemePersonality,
  ThemePersonalitySchema,
} from "@/lib/schemas/settings";
import { db } from "@/lib/db/client";
import { useMounted } from "@/lib/utils/dates";

interface ThemePersonalityContextValue {
  themePersonality: ThemePersonality;
  setThemePersonality: (personality: ThemePersonality) => Promise<void>;
  isLoaded: boolean;
}

const ThemePersonalityContext = React.createContext<ThemePersonalityContextValue>({
  themePersonality: DEFAULT_THEME_PERSONALITY,
  setThemePersonality: async () => {},
  isLoaded: false,
});

export const THEME_PERSONALITY_STORAGE_KEY = "orbit-theme-personality";

function getInitialPersonality(): ThemePersonality {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PERSONALITY;
  }
  try {
    const stored = localStorage.getItem(THEME_PERSONALITY_STORAGE_KEY);
    const parsed = ThemePersonalitySchema.safeParse(stored);
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // localStorage may fail in restricted contexts
  }
  return DEFAULT_THEME_PERSONALITY;
}

export function ThemePersonalityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [personality, setPersonality] = React.useState<ThemePersonality>(getInitialPersonality);
  const isLoaded = useMounted();

  React.useEffect(() => {
    // Sync DOM attribute on mount / personality change
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-orbit-theme", personality);
    }

    // Hydrate and reconcile from Dexie user_settings
    db.settings
      .get("user_settings")
      .then((settings) => {
        if (settings?.themePersonality) {
          const parsed = ThemePersonalitySchema.safeParse(settings.themePersonality);
          if (parsed.success && parsed.data !== personality) {
            setPersonality(parsed.data);
            if (typeof document !== "undefined") {
              document.documentElement.setAttribute("data-orbit-theme", parsed.data);
            }
            try {
              localStorage.setItem(THEME_PERSONALITY_STORAGE_KEY, parsed.data);
            } catch {
              // ignore
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load theme personality from DB:", err);
      });
  }, [personality]);

  const setThemePersonality = React.useCallback(
    async (next: ThemePersonality) => {
      setPersonality(next);

      // Instant DOM update (no page reload)
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-orbit-theme", next);
      }

      // Fast cache in localStorage
      try {
        localStorage.setItem(THEME_PERSONALITY_STORAGE_KEY, next);
      } catch {
        // ignore
      }

      // Synchronize with Dexie settings table
      try {
        const existing = await db.settings.get("user_settings");
        const nowIso = new Date().toISOString();
        if (existing) {
          await db.settings.update("user_settings", {
            themePersonality: next,
            updatedAt: nowIso,
          });
        } else {
          await db.settings.add({
            id: "user_settings",
            theme: "system",
            themePersonality: next,
            defaultPriority: "medium",
            defaultReminderTime: "09:00",
            weekStartsOn: "monday",
            dateFormat: "DD/MM/YYYY",
            notificationsEnabled: true,
            heatmapDays: 180,
            schemaVersion: 1,
            updatedAt: nowIso,
          });
        }
      } catch (err) {
        console.error("Failed to persist theme personality to DB:", err);
      }
    },
    []
  );

  return (
    <ThemePersonalityContext.Provider
      value={{
        themePersonality: personality,
        setThemePersonality,
        isLoaded,
      }}
    >
      {children}
    </ThemePersonalityContext.Provider>
  );
}

export function useThemePersonality() {
  const context = React.useContext(ThemePersonalityContext);
  if (!context) {
    throw new Error(
      "useThemePersonality must be used within a ThemePersonalityProvider"
    );
  }
  return context;
}
