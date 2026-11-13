"use client";

import React, { useMemo } from "react";
import { Repeat, Flame, Trophy, CheckCircle2 } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";
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
    <SurfaceCard padding="md" className="flex flex-col h-full">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-4 border-b border-orbit-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-chart-2">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Habit Consistency &amp; Streaks
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Cadence adherence and active retention
            </p>
          </div>
        </div>
        <Badge variant="neutral">
          {habits.length} {habits.length === 1 ? "habit" : "habits"}
        </Badge>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orbit-border bg-orbit-surface-secondary/40 py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-orbit-text-muted/50" />
            <p className="mt-2 text-sm font-medium text-orbit-text">
              No habits scheduled in this period
            </p>
            <p className="mt-1 text-xs text-orbit-text-muted">
              Create habits in the Habit Tracker to start tracking consistency.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                  className={`rounded-lg border p-3.5 transition-colors ${
                    habit.isActive
                      ? "border-orbit-border bg-orbit-surface-secondary/50 hover:bg-orbit-surface-secondary"
                      : "border-orbit-border/50 bg-orbit-surface-secondary/20 opacity-60"
                  }`}
                >
                  {/* Top row: Title, Frequency badge, Consistency % */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-orbit-text truncate">
                        {habit.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orbit-surface border border-orbit-border text-orbit-text-muted shrink-0">
                        {frequencyLabel}
                      </span>
                      {!habit.isActive && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orbit-surface/50 border border-orbit-border/50 text-orbit-text-muted shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-sm font-semibold text-orbit-text shrink-0 tabular-nums">
                      {habit.consistencyRate}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                    <div
                      className="h-full rounded-full bg-orbit-chart-2 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, habit.consistencyRate))}%`,
                      }}
                    />
                  </div>

                  {/* Bottom row: Scheduled vs Completed check-ins & Streaks */}
                  <div className="mt-2 flex items-center justify-between text-xs text-orbit-text-muted">
                    <span className="font-mono text-[11px] tabular-nums">
                      {habit.completedCount} of {habit.scheduledCount} completed
                    </span>

                    <div className="flex items-center gap-3">
                      {streak.currentStreak > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-orbit-warning text-xs tabular-nums">
                          <Flame className="h-3 w-3 fill-orbit-warning text-orbit-warning" />
                          <span>{streak.currentStreak}d streak</span>
                        </span>
                      )}
                      {streak.bestStreak > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-orbit-text-muted tabular-nums">
                          <Trophy className="h-3 w-3 text-orbit-warning/80" />
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
    </SurfaceCard>
  );
}
