import { db } from "@/lib/db/client";
import {
  DEFAULT_THEME_PERSONALITY,
  ONBOARDING_CURRENT_VERSION,
  type ThemePersonality,
} from "@/lib/schemas/settings";
import { THEME_PERSONALITY_STORAGE_KEY } from "@/components/theme-personality-provider";

export const ONBOARDING_STORAGE_KEY = "orbit_onboarding_completed_version";

export interface OnboardingStatusResult {
  needsOnboarding: boolean;
  isExistingUser: boolean;
  existingTheme?: ThemePersonality;
}

/**
 * Checks whether the current user needs to complete the first-time onboarding flow.
 * Reliably differentiates between:
 * 1. Fresh installations (no data, no settings, no completion flag) -> needs onboarding
 * 2. Existing users (has tasks, habits, items, events, library entries, or prior settings) -> bypasses onboarding
 * 3. Completed users (versioned onboarding completion recorded in Dexie or localStorage) -> bypasses onboarding
 * 4. Restricted/Failed environments (IndexedDB unavailable or throws) -> safe fallback to bypass without crashing
 */
export async function checkOnboardingStatus(): Promise<OnboardingStatusResult> {
  // 1. Fast synchronous check in localStorage
  if (typeof window !== "undefined") {
    try {
      const localVersion = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (localVersion && parseInt(localVersion, 10) >= ONBOARDING_CURRENT_VERSION) {
        return { needsOnboarding: false, isExistingUser: false };
      }
    } catch {
      // localStorage may fail in restricted contexts; proceed to IndexedDB check
    }
  }

  // 2. Deep check in Dexie IndexedDB
  try {
    const settings = await db.settings.get("user_settings");

    // Case A: User has already completed versioned onboarding in Dexie
    if (
      settings?.onboardingCompletedVersion &&
      settings.onboardingCompletedVersion >= ONBOARDING_CURRENT_VERSION
    ) {
      syncLocalStorage(settings.onboardingCompletedVersion);
      return {
        needsOnboarding: false,
        isExistingUser: false,
        existingTheme: settings.themePersonality,
      };
    }

    // Case B: Existing user detection (has settings or has existing user data)
    // Never overwrite an existing user's settings or interrupt their workflow
    const hasExistingSettings = Boolean(settings);
    let hasUserData = false;

    if (!hasExistingSettings) {
      try {
        const [taskCount, habitCount, itemCount, entryCount, eventCount] =
          await Promise.all([
            db.tasks.count().catch(() => 0),
            db.habits.count().catch(() => 0),
            db.items.count().catch(() => 0),
            db.libraryEntries.count().catch(() => 0),
            db.events.count().catch(() => 0),
          ]);
        hasUserData =
          taskCount + habitCount + itemCount + entryCount + eventCount > 0;
      } catch {
        hasUserData = false;
      }
    }

    if (hasExistingSettings || hasUserData) {
      // Auto-mark onboarding as completed for this existing user without altering their theme
      await autoMarkExistingUserCompleted(settings?.themePersonality);
      return {
        needsOnboarding: false,
        isExistingUser: true,
        existingTheme: settings?.themePersonality,
      };
    }

    // Case C: Truly fresh installation with zero entities and zero settings
    return { needsOnboarding: true, isExistingUser: false };
  } catch (err) {
    console.warn("IndexedDB check failed during onboarding detection:", err);
    // In restricted/offline/error environments, never trap the user
    return { needsOnboarding: false, isExistingUser: false };
  }
}

/**
 * Persists onboarding completion into both Dexie user_settings and localStorage.
 */
export async function completeOnboarding(options?: {
  themePersonality?: ThemePersonality;
  skipped?: boolean;
}): Promise<void> {
  const chosenPersonality = options?.themePersonality ?? DEFAULT_THEME_PERSONALITY;
  const nowIso = new Date().toISOString();

  // 1. Sync to localStorage for fast pre-hydration caching
  syncLocalStorage(ONBOARDING_CURRENT_VERSION);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_PERSONALITY_STORAGE_KEY, chosenPersonality);
      document.documentElement.setAttribute("data-orbit-theme", chosenPersonality);
    } catch {
      // ignore
    }
  }

  // 2. Persist to Dexie user_settings
  try {
    const existing = await db.settings.get("user_settings");
    if (existing) {
      await db.settings.update("user_settings", {
        themePersonality: chosenPersonality,
        onboardingCompletedVersion: ONBOARDING_CURRENT_VERSION,
        onboardingCompletedAt: nowIso,
        updatedAt: nowIso,
      });
    } else {
      await db.settings.add({
        id: "user_settings",
        theme: "system",
        themePersonality: chosenPersonality,
        defaultPriority: "medium",
        defaultReminderTime: "09:00",
        weekStartsOn: "monday",
        dateFormat: "DD/MM/YYYY",
        notificationsEnabled: true,
        heatmapDays: 180,
        schemaVersion: 1,
        onboardingCompletedVersion: ONBOARDING_CURRENT_VERSION,
        onboardingCompletedAt: nowIso,
        updatedAt: nowIso,
      });
    }
  } catch (err) {
    console.error("Failed to persist onboarding completion to Dexie:", err);
    // We already persisted to localStorage, so user can proceed
  }
}

/**
 * Silently marks existing users as completed without modifying their theme.
 */
async function autoMarkExistingUserCompleted(
  existingTheme?: ThemePersonality
): Promise<void> {
  syncLocalStorage(ONBOARDING_CURRENT_VERSION);
  const nowIso = new Date().toISOString();

  try {
    const existing = await db.settings.get("user_settings");
    if (existing) {
      await db.settings.update("user_settings", {
        onboardingCompletedVersion: ONBOARDING_CURRENT_VERSION,
        onboardingCompletedAt: nowIso,
        updatedAt: nowIso,
      });
    } else {
      await db.settings.add({
        id: "user_settings",
        theme: "system",
        themePersonality: existingTheme ?? DEFAULT_THEME_PERSONALITY,
        defaultPriority: "medium",
        defaultReminderTime: "09:00",
        weekStartsOn: "monday",
        dateFormat: "DD/MM/YYYY",
        notificationsEnabled: true,
        heatmapDays: 180,
        schemaVersion: 1,
        onboardingCompletedVersion: ONBOARDING_CURRENT_VERSION,
        onboardingCompletedAt: nowIso,
        updatedAt: nowIso,
      });
    }
  } catch {
    // ignore
  }
}

function syncLocalStorage(version: number): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, String(version));
    } catch {
      // ignore
    }
  }
}

/**
 * Resets onboarding state (useful for QA, testing, and settings tour replay).
 */
export async function resetOnboardingForTesting(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  try {
    const existing = await db.settings.get("user_settings");
    if (existing) {
      await db.settings.update("user_settings", {
        onboardingCompletedVersion: undefined,
        onboardingCompletedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // ignore
  }
}
