"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Check } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import {
  getWeekMonday,
  getOffsetDateString,
  parseLocalDate,
  calculateStreak,
} from "@/lib/utils/dates";

export interface RitualsCadenceProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string;
  onToggleHabit: (habitId: string) => Promise<void>;
  onOpenQuickCapture: () => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function RitualsCadence({
  habits,
  habitLogs,
  todayStr,
  onToggleHabit,
  onOpenQuickCapture,
}: RitualsCadenceProps) {
  // Compute current week days (Mon -> Sun)
  const currentWeekDays = useMemo(() => {
    if (!todayStr) return [];
    const mondayStr = getWeekMonday(todayStr);
    const mondayDate = parseLocalDate(mondayStr);

    return Array.from({ length: 7 }, (_, i) => {
      return getOffsetDateString(i, mondayDate);
    });
  }, [todayStr]);

  // Lookup map: `${habitId}:${date}`
  const completionMap = useMemo(() => {
    const map = new Set<string>();
    for (const log of habitLogs) {
      if (log.completed) {
        map.add(`${log.habitId}:${log.date}`);
      }
    }
    return map;
  }, [habitLogs]);

  // Group logs by habit
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
    return habits.filter((h) => h.isActive).slice(0, 3);
  }, [habits]);

  return (
    <section className="space-y-3.5">
      {/* Section Eyebrow Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-orbit-text-muted">
            I. DAILY RITUALS
          </span>
          {activeHabits.length > 0 && (
            <span className="font-serif italic text-xs text-orbit-text-muted">
              ({activeHabits.length} observed)
            </span>
          )}
        </div>

        <Link
          href="/habits"
          className="group inline-flex items-center gap-1 text-[11px] font-sans tracking-[0.14em] uppercase text-orbit-text-muted hover:text-orbit-accent transition-colors"
        >
          <span>VIEW ALL RITUALS</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {activeHabits.length === 0 ? (
        <div className="border-t border-b border-orbit-border py-12 px-4 text-center">
          <p className="font-serif italic text-base text-orbit-text-muted mb-4 max-w-md mx-auto">
            No routines observed yet. Anchor your day with a calm morning or evening ritual.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-orbit-text bg-orbit-surface border border-orbit-border rounded-full hover:border-orbit-accent hover:text-orbit-accent transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Begin a ritual</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeHabits.map((habit) => {
            const completedDates = logsByHabit.get(habit.id) ?? [];
            const streakInfo = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            );

            const rhythmText =
              streakInfo.currentStreak > 0
                ? `${streakInfo.currentStreak} day rhythm`
                : "Awaiting rhythm";

            return (
              <div
                key={habit.id}
                className="orbit-surface-card rounded-[18px] border border-orbit-border bg-orbit-surface p-5 shadow-[var(--orbit-shadow-card)] flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5"
              >
                {/* Top Row: Habit Title stacked above Poetic Rhythm Label */}
                <div className="flex flex-col items-start gap-0.5">
                  <h3
                    className="font-serif text-base sm:text-lg font-medium text-orbit-text tracking-tight line-clamp-1 w-full"
                    title={habit.title}
                  >
                    {habit.title}
                  </h3>
                  <span className="font-serif italic text-xs text-orbit-text-muted">
                    {rhythmText}
                  </span>
                </div>

                {/* Bottom Row: 7-Day Organic Circular Stones Strip */}
                <div className="flex items-center justify-between pt-2 border-t border-orbit-border/50">
                  {currentWeekDays.map((dateStr, i) => {
                    const isDone = completionMap.has(`${habit.id}:${dateStr}`);
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < todayStr;
                    const dayLetter = DAY_LABELS[i];

                    if (isToday) {
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          aria-label={`Mark ritual "${habit.title}" for today`}
                          onClick={() => onToggleHabit(habit.id)}
                          className="flex flex-col items-center gap-1.5 group/stone cursor-pointer focus-visible:outline-hidden"
                        >
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                              isDone
                                ? "bg-[var(--orbit-success)] text-white shadow-xs"
                                : "border border-orbit-accent bg-orbit-accent-soft text-orbit-accent group-hover/stone:scale-110"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-orbit-accent" />
                            )}
                          </span>
                          <span className="text-[9px] font-sans tracking-widest text-orbit-accent font-semibold">
                            TODAY
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div
                        key={dateStr}
                        className="flex flex-col items-center gap-1.5 select-none"
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                            isDone
                              ? "bg-[var(--orbit-success)] text-white"
                              : isPast
                              ? "border border-orbit-border/60 bg-orbit-surface-secondary/50 text-transparent"
                              : "border border-dotted border-orbit-border/40 bg-transparent text-transparent"
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : null}
                        </span>
                        <span className="text-[9px] font-sans text-orbit-text-muted/60">
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
    </section>
  );
}
