"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Check, ArrowRight, Plus, Sliders } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import {
  getWeekMonday,
  getOffsetDateString,
  parseLocalDate,
  calculateStreak,
} from "@/lib/utils/dates";

export interface HabitCadenceProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string;
  onToggleHabit: (habitId: string, dateStr?: string) => Promise<void>;
  onOpenQuickCapture: () => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitCadence({
  habits,
  habitLogs,
  todayStr,
  onToggleHabit,
  onOpenQuickCapture,
}: HabitCadenceProps) {
  // Compute the 7 calendar days of the current week (Mon -> Sun)
  const currentWeekDays = useMemo(() => {
    if (!todayStr) return [];
    const mondayStr = getWeekMonday(todayStr);
    const mondayDate = parseLocalDate(mondayStr);

    return Array.from({ length: 7 }, (_, i) => {
      return getOffsetDateString(i, mondayDate);
    });
  }, [todayStr]);

  // Fast lookup table for habit logs: `${habitId}:${date}` -> true
  const completionMap = useMemo(() => {
    const map = new Set<string>();
    for (const log of habitLogs) {
      if (log.completed) {
        map.add(`${log.habitId}:${log.date}`);
      }
    }
    return map;
  }, [habitLogs]);

  // Group logs by habit to calculate real streak
  const logsByHabit = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const log of habitLogs) {
      if (log.completed) {
        const list = grouped.get(log.habitId) ?? [];
        list.push(log.date);
        grouped.set(log.habitId, list);
      }
    }
    return grouped;
  }, [habitLogs]);

  const activeHabits = useMemo(() => {
    return habits.filter((h) => h.isActive);
  }, [habits]);

  return (
    <div className="space-y-3">
      {/* Clean Single-Line Header (Zero Jargon Subtitle) */}
      <div className="flex items-center justify-between gap-2 border-b border-orbit-border/70 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-bold tracking-wider text-orbit-text uppercase">
            02 // HABIT CADENCE
          </h2>
          {activeHabits.length > 0 && (
            <span className="font-mono text-xs text-orbit-text-muted">
              ({activeHabits.length})
            </span>
          )}
        </div>

        <Link
          href="/habits"
          className="inline-flex min-h-[44px] sm:min-h-[28px] items-center gap-1 font-mono text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors py-1"
        >
          <span>All habits</span>
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {activeHabits.length === 0 ? (
        <div className="futuristic-panel p-6 rounded-[12px] flex flex-col items-center justify-center text-center">
          <div className="h-8 w-8 rounded-[4px] bg-orbit-surface-secondary border border-orbit-border flex items-center justify-center mb-2.5 text-orbit-text-muted">
            <Sliders className="h-4 w-4" />
          </div>
          <p className="text-xs text-orbit-text-muted mb-3">
            No routines tracked yet. Build daily consistency with a 7-day cadence.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1.5 px-3 py-1 font-sans text-xs font-medium text-orbit-text rounded-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-orbit-accent" aria-hidden />
            <span>Create a habit</span>
          </button>
        </div>
      ) : (
        /* Unified Compact Panel with Divide-Y */
        <div className="futuristic-panel rounded-[12px] divide-y divide-orbit-border/50 overflow-hidden">
          {activeHabits.map((habit) => {
            const completedDates = logsByHabit.get(habit.id) ?? [];
            const streakInfo = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            );

            return (
              <div key={habit.id} className="p-3.5 space-y-2.5 hover:bg-orbit-surface-secondary/20 transition-colors">
                {/* Line 1: Full Habit Title (Zero Truncation) + Streak Pill */}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-orbit-text leading-snug whitespace-normal break-words flex-1">
                    {habit.title}
                  </h3>

                  {/* Clean Streak Pill */}
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-[3px] shrink-0 ${streakInfo.currentStreak > 0
                      ? "text-[#00e5a3] bg-[#00e5a3]/10 border border-[#00e5a3]/30"
                      : "text-orbit-text-muted bg-orbit-surface-secondary border border-orbit-border"
                      }`}
                  >
                    {streakInfo.currentStreak}d
                  </span>
                </div>

                {/* Line 2: 7-Day Low-Profile Hardware LED Step Bar */}
                <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                  {currentWeekDays.map((dateStr, dayIdx) => {
                    const isDone = completionMap.has(`${habit.id}:${dateStr}`);
                    const isToday = dateStr === todayStr;
                    const dayLetter = DAY_LABELS[dayIdx] || "·";

                    return (
                      <div key={dateStr} className="flex flex-col items-center gap-1">
                        {/* Tactile Hardware Step Button (Accessible touch target) */}
                        <button
                          type="button"
                          aria-label={`Toggle habit ${habit.title} for ${dateStr}`}
                          onClick={() => onToggleHabit(habit.id, dateStr)}
                          className="relative min-h-[44px] min-w-[28px] w-full flex items-center justify-center p-0.5 cursor-pointer focus-visible:outline-hidden group"
                        >
                          <span
                            className={`h-6 w-full rounded-[4px] flex items-center justify-center transition-all ${isDone
                              ? "bg-[#0284c7] border border-[#0369a1] text-white shadow-[0_1px_3px_rgba(2,132,199,0.35)] dark:bg-[#00f0ff] dark:border-[#38bdf8] dark:text-[#04111d] dark:shadow-[0_0_8px_rgba(0,240,255,0.7)]"
                              : "bg-[#e8eef5] border border-[#cbd5e1] text-transparent hover:border-[#0284c7]/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] dark:bg-[#070b13] dark:border-[#1c283c] dark:shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.85)] dark:hover:border-[#00f0ff]/50"
                              } ${isToday && !isDone
                                ? "ring-1 ring-[#0284c7]/50 dark:ring-[#00f0ff]/60 ring-offset-1 ring-offset-white dark:ring-offset-black"
                                : ""
                              }`}
                          >
                            <Check
                              className={`h-3 w-3 stroke-[3] transition-transform ${isDone
                                ? "scale-100"
                                : "scale-75 text-transparent group-hover:text-[#0284c7]/40 dark:group-hover:text-[#00f0ff]/30"
                                }`}
                            />
                          </span>
                        </button>

                        {/* Subtle Day Letter Below Step */}
                        <span
                          className={`font-mono text-[10px] select-none ${isToday ? "text-[#0284c7] dark:text-[#00f0ff] font-bold" : "text-orbit-text-muted"
                            }`}
                        >
                          {dayLetter}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
