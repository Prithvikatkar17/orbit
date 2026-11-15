"use client";

import React, { useMemo } from "react";
import type { Habit, HabitLog } from "@/lib/schemas";
import { parseLocalDate, getOffsetDateString, calculateStreak } from "@/lib/utils/dates";

export interface DieterCadenceStripProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  completedTodayHabitIds: Set<string>;
  todayStr: string | null;
  onToggleHabit: (habitId: string) => Promise<void>;
}

export function DieterCadenceStrip({
  habits,
  habitLogs,
  completedTodayHabitIds,
  todayStr,
  onToggleHabit,
}: DieterCadenceStripProps) {
  // Generate past 7 days: [today - 6d, ..., today]
  const last7Days = useMemo(() => {
    if (!todayStr) return [];
    const base = parseLocalDate(todayStr);
    const arr: { dateStr: string; dayLetter: string; isToday: boolean }[] = [];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

    for (let i = 6; i >= 0; i--) {
      const dStr = getOffsetDateString(-i, base);
      const dObj = parseLocalDate(dStr);
      const letter = dayNames[dObj.getDay()] || "·";
      arr.push({
        dateStr: dStr,
        dayLetter: letter,
        isToday: i === 0,
      });
    }
    return arr;
  }, [todayStr]);

  // Fast lookup set of completed logs: Set<"habitId_dateStr"> and completed dates by habit
  const { completedLogSet, logsByHabit } = useMemo(() => {
    const set = new Set<string>();
    const byHabit = new Map<string, string[]>();

    for (const log of habitLogs) {
      if (log.completed) {
        set.add(`${log.habitId}_${log.date}`);
        const existing = byHabit.get(log.habitId) ?? [];
        existing.push(log.date);
        byHabit.set(log.habitId, existing);
      }
    }
    return { completedLogSet: set, logsByHabit: byHabit };
  }, [habitLogs]);

  return (
    <div className="space-y-4">
      {/* Table Header Row */}
      <div className="flex items-center justify-between pb-2 border-b border-orbit-border text-[11px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orbit-text">02</span>
          <span>CADENCE</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 justify-end">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 justify-center shrink-0">
            {last7Days.map((d) => (
              <span
                key={d.dateStr}
                className={`w-3 md:w-4 text-center tabular-nums ${
                  d.isToday ? "text-[#ff3b00] font-semibold" : "text-orbit-text-muted"
                }`}
              >
                {d.dayLetter}
              </span>
            ))}
          </div>
          <span className="w-14 text-right shrink-0">STREAK</span>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="py-8 text-center border-b border-orbit-border">
          <p className="font-mono text-xs uppercase tracking-widest text-orbit-text-muted">
            00 — NO ACTIVE CADENCES DEFINED
          </p>
        </div>
      ) : (
        <div className="divide-y divide-orbit-border border-b border-orbit-border">
          {habits.map((habit) => {
            const isCompletedToday = completedTodayHabitIds.has(habit.id);
            const completedDates = logsByHabit.get(habit.id) ?? [];
            const streakInfo = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            );
            const streak = streakInfo.currentStreak;

            return (
              <div
                key={habit.id}
                className="py-3 hover:bg-orbit-subtle/30 transition-colors flex items-center justify-between gap-3 sm:gap-4 px-1 group"
              >
                {/* Habit Title */}
                <div className="flex-1 min-w-0 pr-3">
                  <span className="text-sm font-medium text-orbit-text block line-clamp-2 leading-snug">
                    {habit.title}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted block mt-0.5">
                    {habit.frequency || "DAILY"}
                  </span>
                </div>

                {/* Right cluster: 7-Day Precision Vertical Dial Ticks + Streak */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 justify-center shrink-0">
                    {last7Days.map((d) => {
                      const isDone = completedLogSet.has(`${habit.id}_${d.dateStr}`);

                      if (d.isToday) {
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => onToggleHabit(habit.id)}
                            title={isCompletedToday ? "Completed today (click to undo)" : "Mark completed today"}
                            aria-label={`Toggle habit ${habit.title} for today`}
                            className="w-3 md:w-4 flex items-center justify-center py-1 group/tick focus:outline-none"
                          >
                            {isCompletedToday ? (
                              <span className="w-2 h-6 rounded-[1px] bg-[#ff3b00] shadow-sm block transition-transform group-hover/tick:scale-y-110" />
                            ) : (
                              <span className="w-2 h-6 rounded-[1px] border border-[#ff3b00] bg-[#ff3b00]/20 block transition-transform group-hover/tick:scale-y-110 animate-pulse" />
                            )}
                          </button>
                        );
                      }

                      return (
                        <div
                          key={d.dateStr}
                          className="w-3 md:w-4 flex items-center justify-center py-1"
                          title={`${d.dateStr}: ${isDone ? "Completed" : "Incomplete"}`}
                        >
                          {isDone ? (
                            <span className="w-2 h-6 rounded-[1px] bg-orbit-text block" />
                          ) : (
                            <span className="w-1 h-5 rounded-[0.5px] bg-orbit-border block opacity-70" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabular Streak Readout */}
                  <div className="w-14 text-right shrink-0">
                    <span className="tabular-nums text-xs font-mono text-orbit-text-muted">
                      {String(streak).padStart(2, "0")}d
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
