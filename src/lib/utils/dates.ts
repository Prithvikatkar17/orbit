/**
 * Local-date and time utilities for ORBIT.
 * Guarantees zero timezone offset drift between UTC and local calendar days.
 */

import { useSyncExternalStore } from "react";

/**
 * Returns today's local date as "YYYY-MM-DD".
 */
export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes user-entered URL strings (e.g. "github.com" -> "https://github.com").
 */
export function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Parses "YYYY-MM-DD" into a local Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns a "YYYY-MM-DD" string offset by N days from given reference.
 */
export function getOffsetDateString(offsetDays: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  return getLocalDateString(d);
}

/**
 * Formats a "YYYY-MM-DD" string into a human-friendly format (e.g. "Today", "Tomorrow", "Yesterday", "Nov 6, 2026").
 */
export function formatFriendlyDate(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "Someday";

  const today = getLocalDateString();
  const tomorrow = getOffsetDateString(1);
  const yesterday = getOffsetDateString(-1);

  let label = dateStr;
  if (dateStr === today) {
    label = "Today";
  } else if (dateStr === tomorrow) {
    label = "Tomorrow";
  } else if (dateStr === yesterday) {
    label = "Yesterday";
  } else {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (year && month && day) {
      const dateObj = new Date(year, month - 1, day);
      label = dateObj.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: year !== new Date().getFullYear() ? "numeric" : undefined,
      });
    }
  }

  if (timeStr) {
    return `${label} at ${timeStr}`;
  }
  return label;
}

/**
 * Checks whether a given calendar date string matches a habit's scheduled frequency.
 */
export function isScheduledDay(
  dateStr: string,
  frequency: "daily" | "weekdays" | "weekly" | "custom" = "daily",
  customDays: number[] = []
): boolean {
  if (frequency === "daily" || frequency === "weekly") return true;

  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  if (frequency === "weekdays") {
    return day >= 1 && day <= 5;
  }

  if (frequency === "custom") {
    if (!customDays || customDays.length === 0) return true;
    return customDays.includes(day);
  }

  return true;
}

/**
 * Finds the nearest scheduled date strictly before dateStr for a given frequency.
 */
export function getPreviousScheduledDate(
  dateStr: string,
  frequency: "daily" | "weekdays" | "weekly" | "custom" = "daily",
  customDays: number[] = []
): string {
  let cur = parseLocalDate(dateStr);
  for (let i = 0; i < 14; i++) {
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
    const candidateStr = getLocalDateString(cur);
    if (isScheduledDay(candidateStr, frequency, customDays)) {
      return candidateStr;
    }
  }
  return getOffsetDateString(-1, parseLocalDate(dateStr));
}

/**
 * Returns the Monday date string ("YYYY-MM-DD") representing the calendar week of dateStr.
 */
export function getWeekMonday(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  return getLocalDateString(monday);
}

/**
 * Computes consecutive streak and historical best streak respecting habit frequency.
 * - For "daily", "weekdays", "custom": checks scheduled days.
 * - For "weekly": checks completions across calendar weeks.
 */
export function calculateStreak(
  completedDates: string[],
  frequency: "daily" | "weekdays" | "weekly" | "custom" = "daily",
  customDays: number[] = []
): { currentStreak: number; bestStreak: number } {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayStr = getLocalDateString();
  const completedSet = new Set(completedDates);

  // 1. Weekly Habit Streak Calculation
  if (frequency === "weekly") {
    const completedWeeks = Array.from(
      new Set(completedDates.map((d) => getWeekMonday(d)))
    ).sort();

    if (completedWeeks.length === 0) return { currentStreak: 0, bestStreak: 0 };

    const thisWeekMonday = getWeekMonday(todayStr);
    const lastWeekMonday = getOffsetDateString(-7, parseLocalDate(thisWeekMonday));

    const completedWeeksSet = new Set(completedWeeks);

    let currentStreak = 0;
    let checkWeek: string | null = null;

    if (completedWeeksSet.has(thisWeekMonday)) {
      checkWeek = thisWeekMonday;
    } else if (completedWeeksSet.has(lastWeekMonday)) {
      checkWeek = lastWeekMonday;
    }

    while (checkWeek && completedWeeksSet.has(checkWeek)) {
      currentStreak++;
      checkWeek = getOffsetDateString(-7, parseLocalDate(checkWeek));
    }

    // Historical best streak for weekly
    let bestStreak = 0;
    let tempStreak = 0;
    let expectedNextWeek: string | null = null;

    for (const week of completedWeeks) {
      if (!expectedNextWeek || week === expectedNextWeek) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      expectedNextWeek = getOffsetDateString(7, parseLocalDate(week));
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
    };
  }

  // 2. Day-based Habit Streak Calculation (daily, weekdays, custom)
  // Determine anchor for currentStreak
  let checkDate: string | null = null;
  const isTodayScheduled = isScheduledDay(todayStr, frequency, customDays);

  if (isTodayScheduled) {
    if (completedSet.has(todayStr)) {
      checkDate = todayStr;
    } else {
      // Today is scheduled but not completed yet. Check if previous scheduled day was completed.
      const prev = getPreviousScheduledDate(todayStr, frequency, customDays);
      if (completedSet.has(prev)) {
        checkDate = prev;
      }
    }
  } else {
    // Today is not a scheduled day (e.g. weekend for weekdays habit).
    // Find most recent scheduled day on or before today.
    let search = parseLocalDate(todayStr);
    for (let i = 0; i < 7; i++) {
      const cand = getLocalDateString(search);
      if (isScheduledDay(cand, frequency, customDays)) {
        if (completedSet.has(cand)) {
          checkDate = cand;
        }
        break;
      }
      search = new Date(search.getFullYear(), search.getMonth(), search.getDate() - 1);
    }
  }

  let currentStreak = 0;
  while (checkDate && completedSet.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousScheduledDate(checkDate, frequency, customDays);
  }

  // Calculate historical best streak
  const validScheduledDates = Array.from(
    new Set(completedDates.filter((d) => isScheduledDay(d, frequency, customDays)))
  ).sort();

  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const date of validScheduledDates) {
    if (prevDate) {
      const expectedPrev = getPreviousScheduledDate(date, frequency, customDays);
      if (expectedPrev === prevDate) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
    prevDate = date;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}

/**
 * Subscribes to local calendar date changes (e.g. midnight roll-over).
 */
function subscribeDateChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  let currentDate = getLocalDateString();
  const interval = setInterval(() => {
    const freshDate = getLocalDateString();
    if (freshDate !== currentDate) {
      currentDate = freshDate;
      callback();
    }
  }, 1000);

  return () => clearInterval(interval);
}

/**
 * React hook that returns today's local date "YYYY-MM-DD".
 * Subscribes to midnight rollover and is safe for SSR / static prerender.
 */
export function useTodayDate(): string {
  return useSyncExternalStore(
    subscribeDateChange,
    () => getLocalDateString(),
    () => ""
  );
}

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has mounted on the client.
 * Uses useSyncExternalStore to guarantee zero hydration mismatch and zero cascading renders.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats a "YYYY-MM-DD" string or year/month into "Month YYYY" (e.g. "November 2026").
 */
export function formatMonthYear(dateInput: string | { year: number; month: number }): string {
  if (typeof dateInput === "string") {
    const [year, month] = dateInput.split("-").map(Number);
    return `${MONTH_NAMES[(month || 1) - 1]} ${year}`;
  }
  return `${MONTH_NAMES[(dateInput.month || 1) - 1]} ${dateInput.year}`;
}

/**
 * Formats a "YYYY-MM-DD" string into a full date display, e.g. "Wednesday, November 11, 2026".
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

