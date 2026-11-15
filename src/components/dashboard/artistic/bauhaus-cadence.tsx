"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Check, ArrowRight, Plus } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import {
  getWeekMonday,
  getOffsetDateString,
  parseLocalDate,
  calculateStreak,
} from "@/lib/utils/dates";

export interface BauhausCadenceProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string | null;
  onToggleHabit: (habitId: string) => Promise<void>;
  onOpenQuickCapture: () => void;
}

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

// Multi-hue watercolor gradient spectra per habit row
const ROW_GRADIENTS = [
  {
    name: "Ultramarine & Rose",
    gradientClass: "bg-gradient-to-tr from-[#4f46e5] via-[#a855f7] to-[#ec4899] text-white shadow-xs",
    tagClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  {
    name: "Sunset Coral & Amber",
    gradientClass: "bg-gradient-to-tr from-[#f43f5e] via-[#fb923c] to-[#facc15] text-white shadow-xs",
    tagClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    name: "Teal & Cerulean",
    gradientClass: "bg-gradient-to-tr from-[#0d9488] via-[#10b981] to-[#0284c7] text-white shadow-xs",
    tagClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    name: "Plum & Lavender",
    gradientClass: "bg-gradient-to-tr from-[#7c3aed] via-[#c084fc] to-[#f472b6] text-white shadow-xs",
    tagClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
];

export function BauhausCadence({
  habits,
  habitLogs,
  todayStr,
  onToggleHabit,
  onOpenQuickCapture,
}: BauhausCadenceProps) {
  // Compute current week days (Mon -> Sun)
  const currentWeekDays = useMemo(() => {
    if (!todayStr) return [];
    const mondayStr = getWeekMonday(todayStr);
    const mondayDate = parseLocalDate(mondayStr);

    return Array.from({ length: 7 }, (_, i) => {
      return getOffsetDateString(i, mondayDate);
    });
  }, [todayStr]);

  // Map completed logs for O(1) cell lookup
  const completionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const log of habitLogs) {
      if (log.completed) {
        map.set(`${log.habitId}:${log.date}`, true);
      }
    }
    return map;
  }, [habitLogs]);

  // Group logs by habit for streak math
  const logsByHabit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of habitLogs) {
      if (log.completed) {
        const arr = map.get(log.habitId) ?? [];
        arr.push(log.date);
        map.set(log.habitId, arr);
      }
    }
    return map;
  }, [habitLogs]);

  const activeHabits = useMemo(() => {
    return habits.filter((h) => h.isActive);
  }, [habits]);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif italic font-normal text-orbit-text tracking-tight">
              Daily Color Rituals
            </h2>
          </div>
          {/* Subtle painterly accent stroke */}
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-[#fb923c] to-[#ec4899] opacity-70" />
        </div>

        <Link
          href="/habits"
          className="group inline-flex items-center gap-1 text-xs font-sans font-medium text-orbit-text-muted hover:text-orbit-accent transition-colors shrink-0"
        >
          <span>All Rituals</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {activeHabits.length === 0 ? (
        <div className="rounded-[24px] border border-orbit-border bg-orbit-surface p-8 text-center shadow-card space-y-3">
          <p className="font-serif italic text-base text-orbit-text-secondary">
            No daily rituals observed yet
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-sans font-medium text-white bg-gradient-to-r from-[#e11d48] to-[#fb923c] rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Initialize Ritual</span>
          </button>
        </div>
      ) : (
        /* The Living Palette: Watercolor Droplet Cadence Cards */
        <div className="space-y-3.5">
          {activeHabits.map((habit, rowIndex) => {
            const completedDates = logsByHabit.get(habit.id) ?? [];
            const streakInfo = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            );
            const pigment = ROW_GRADIENTS[rowIndex % ROW_GRADIENTS.length];
            const streak = streakInfo.currentStreak;
            const streakText = streak > 0 ? `${streak} day flow` : "Fresh rhythm";

            return (
              <div
                key={habit.id}
                className="orbit-surface-card rounded-[22px] p-4 sm:p-5 border border-orbit-border bg-orbit-surface shadow-[0_12px_30px_-8px_rgba(120,70,140,0.06),0_2px_6px_rgba(0,0,0,0.02)] space-y-3.5 transition-all hover:shadow-[0_16px_36px_-10px_rgba(120,70,140,0.12)]"
              >
                {/* Top Row: Habit Title & Streak Pill */}
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className="font-serif font-medium text-base sm:text-lg text-orbit-text truncate"
                    title={habit.title}
                  >
                    {habit.title}
                  </h3>
                  <span
                    className={`text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full shrink-0 ${pigment.tagClass}`}
                  >
                    {streakText}
                  </span>
                </div>

                {/* Bottom Row: 7-Day Watercolor Spectrum Droplets */}
                <div className="flex items-center justify-between gap-1 pt-1 select-none">
                  {currentWeekDays.map((dateStr, i) => {
                    const isDone = completionMap.has(`${habit.id}:${dateStr}`);
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < (todayStr || "");
                    const dayHeader = DAY_HEADERS[i];

                    return (
                      <div key={dateStr} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        {/* Day label */}
                        <span
                          className={`text-[10px] font-sans ${
                            isToday ? "text-[#e11d48] font-bold" : "text-orbit-text-muted"
                          }`}
                        >
                          {dayHeader}
                        </span>

                        {isToday ? (
                          <button
                            type="button"
                            aria-label={`Mark routine "${habit.title}" for today`}
                            onClick={() => onToggleHabit(habit.id)}
                            className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isDone
                                ? pigment.gradientClass
                                : "border-2 border-dashed border-[#ec4899]/60 hover:border-[#ec4899] bg-gradient-to-tr from-rose-50/50 to-indigo-50/50 dark:from-rose-950/20 dark:to-indigo-950/20 text-[#e11d48] hover:scale-105"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            ) : (
                              <span className="text-xs font-sans font-bold leading-none">+</span>
                            )}
                          </button>
                        ) : (
                          <div
                            className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center ${
                              isDone
                                ? pigment.gradientClass
                                : isPast
                                ? "bg-orbit-surface-secondary/50 border border-orbit-border/40 text-orbit-text-muted/30"
                                : "bg-orbit-surface border border-orbit-border/30 text-orbit-text-muted/20"
                            }`}
                          >
                            {isDone ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
