"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Check, ArrowRight, Plus, Repeat } from "lucide-react";
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
  onToggleHabit: (habitId: string) => Promise<void>;
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
    <section className="futuristic-panel flex flex-col">
      {/* Section Header */}
      <div className="futuristic-panel-header flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-orbit-accent" aria-hidden />
          <h2 className="font-sans text-base font-bold text-orbit-text tracking-tight">
            Habit Cadence
          </h2>
          {activeHabits.length > 0 && (
            <span className="font-mono text-xs text-orbit-text-muted">
              ({activeHabits.length})
            </span>
          )}
        </div>

        <Link
          href="/habits"
          className="inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1 font-mono text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors py-1"
        >
          <span>All habits</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {activeHabits.length === 0 ? (
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-orbit-text-muted mb-3">
            No active routines yet. Track your daily consistency at a glance.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1.5 px-3 py-1 font-sans text-xs font-medium text-orbit-text rounded-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Create a habit</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-orbit-border/40">
          {/* Weekday Column Header */}
          <div className="flex items-center justify-between px-5 py-1.5 bg-orbit-surface-secondary/20 text-[10px] font-mono text-orbit-text-muted">
            <span className="truncate">ROUTINE</span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {DAY_LABELS.map((d, i) => (
                <span key={i} className="w-5 text-center font-bold">
                  {d}
                </span>
              ))}
              <span className="w-8 text-right ml-1">STRK</span>
            </div>
          </div>

          {activeHabits.map((habit) => {
            const completedDates = logsByHabit.get(habit.id) ?? [];
            const streakInfo = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            );

            return (
              <div
                key={habit.id}
                className="futuristic-row flex items-center justify-between gap-3 px-5 py-2.5"
              >
                {/* Left: Title with frequency */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-orbit-text">
                    {habit.title}
                  </div>
                  <div className="font-mono text-[10px] text-orbit-text-muted">
                    {habit.frequency === "weekdays" ? "Mon–Fri" : habit.frequency}
                  </div>
                </div>

                {/* Right: 7-Day Spark Blocks & Streak */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {currentWeekDays.map((dateStr) => {
                    const isDone = completionMap.has(`${habit.id}:${dateStr}`);
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < todayStr;

                    if (isToday) {
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          aria-label={`Toggle habit "${habit.title}" for today`}
                          onClick={() => onToggleHabit(habit.id)}
                          className="flex min-h-[44px] min-w-[20px] sm:min-h-[26px] items-center justify-center cursor-pointer group/toggle focus-visible:outline-hidden"
                        >
                          <span
                            className="futuristic-spark-toggle"
                            data-active={isDone ? "true" : "false"}
                          >
                            {isDone ? (
                              <Check className="h-2.5 w-2.5 stroke-[3.5] text-[#04111d]" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-[1px] bg-orbit-accent shadow-[0_0_4px_rgba(0,240,255,0.6)] group-hover/toggle:scale-125 transition-transform" />
                            )}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div
                        key={dateStr}
                        className="flex h-6 w-5 items-center justify-center select-none"
                      >
                        <span
                          className={`h-3.5 w-3.5 rounded-[2px] border ${
                            isDone
                              ? "border-orbit-accent/80 bg-orbit-accent/25 text-orbit-accent shadow-[0_0_6px_rgba(0,240,255,0.35)]"
                              : isPast
                              ? "border-orbit-border/60 bg-[#070b13] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                              : "border-orbit-border/30 bg-transparent opacity-25"
                          } flex items-center justify-center`}
                        >
                          {isDone && <Check className="h-2 w-2 stroke-[3]" />}
                        </span>
                      </div>
                    );
                  })}

                  {/* Streak */}
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums font-semibold ml-1 text-orbit-text-muted">
                    {streakInfo.currentStreak > 0 ? (
                      <span className="text-orbit-accent font-bold">{streakInfo.currentStreak}d</span>
                    ) : (
                      "0d"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
