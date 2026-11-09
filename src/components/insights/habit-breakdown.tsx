"use client";

import React, { useMemo } from "react";
import { Repeat, Flame, Trophy, CheckCircle2 } from "lucide-react";
import type {
  OverallHabitConsistency,
  GlobalStreakMetrics,
} from "@/lib/services/analytics-service";

interface HabitBreakdownProps {
  habitConsistency: OverallHabitConsistency;
  habitStreaks: GlobalStreakMetrics;
}

export function HabitBreakdown({
  habitConsistency,
  habitStreaks,
}: HabitBreakdownProps) {
  // Map streaks by habitId for quick lookup
  const streaksMap = useMemo(() => {
    const map = new Map<string, { currentStreak: number; bestStreak: number }>();
    for (const item of habitStreaks.habits) {
      map.set(item.habitId, {
        currentStreak: item.currentStreak,
        bestStreak: item.bestStreak,
      });
    }
    return map;
  }, [habitStreaks]);

  const habits = habitConsistency.habits;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Habit Consistency & Streaks
          </h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          {habits.length} {habits.length === 1 ? "habit" : "habits"}
        </span>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No habits scheduled in this period
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Create habits in the Habit Tracker to start tracking consistency.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const streak = streaksMap.get(habit.habitId) || {
                currentStreak: 0,
                bestStreak: 0,
              };

              // Frequency label formatter
              const frequencyLabel =
                habit.frequency === "daily"
                  ? "Daily"
                  : habit.frequency === "weekdays"
                  ? "Weekdays"
                  : habit.frequency === "weekly"
                  ? "Weekly"
                  : "Custom";

              return (
                <div
                  key={habit.habitId}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    habit.isActive
                      ? "border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-800/30"
                      : "border-slate-100/60 bg-slate-50/20 opacity-70 dark:border-slate-800/30 dark:bg-slate-800/10"
                  }`}
                >
                  {/* Top row: Title, Status badge, Consistency % */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {habit.title}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                        {frequencyLabel}
                      </span>
                      {!habit.isActive && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-extrabold text-slate-900 dark:text-white shrink-0">
                      {habit.consistencyRate}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, habit.consistencyRate))}%`,
                      }}
                    />
                  </div>

                  {/* Bottom row: Scheduled vs Completed check-ins & Streaks */}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {habit.completedCount} of {habit.scheduledCount} completed
                    </span>

                    <div className="flex items-center gap-3">
                      {streak.currentStreak > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-xs">
                          <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>{streak.currentStreak}d streak</span>
                        </span>
                      )}
                      {streak.bestStreak > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Trophy className="h-3 w-3 text-amber-500/80" />
                          <span>Best: {streak.bestStreak}d</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

