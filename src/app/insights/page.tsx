"use client";

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar } from "lucide-react";
import { db } from "@/lib/db/client";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { useMounted, useTodayDate } from "@/lib/utils/dates";
import {
  calculateAnalyticsSnapshot,
  type DateRangeType,
} from "@/lib/services/analytics-service";
import { PageHeader } from "@/components/ui/page-header";
import { OverviewCards } from "@/components/insights/overview-cards";
import { ActivityChart } from "@/components/insights/activity-chart";
import { HabitBreakdown } from "@/components/insights/habit-breakdown";
import { TaskDistribution } from "@/components/insights/task-distribution";
import { RecentAccomplishments } from "@/components/insights/recent-accomplishments";

const RANGE_OPTIONS: { id: DateRangeType; label: string }[] = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

export default function InsightsPage() {
  const mounted = useMounted();
  const todayStr = useTodayDate();
  const [rangeType, setRangeType] = useState<DateRangeType>("30d");

  // Reactive Dexie queries
  const rawTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const rawHabits = useLiveQuery(() => db.habits.toArray(), []);
  const rawHabitLogs = useLiveQuery(() => db.habitLogs.toArray(), []);

  // Hydration-safe memoized arrays
  const tasks: Task[] = useMemo(
    () => (mounted && rawTasks ? rawTasks : []),
    [mounted, rawTasks]
  );
  const habits: Habit[] = useMemo(
    () => (mounted && rawHabits ? rawHabits : []),
    [mounted, rawHabits]
  );
  const habitLogs: HabitLog[] = useMemo(
    () => (mounted && rawHabitLogs ? rawHabitLogs : []),
    [mounted, rawHabitLogs]
  );

  // Pure analytics snapshot calculation
  const snapshot = useMemo(() => {
    if (!mounted || !rawTasks || !rawHabits || !rawHabitLogs) {
      return null;
    }
    return calculateAnalyticsSnapshot({
      rangeType,
      tasks,
      habits,
      habitLogs,
      today: todayStr || undefined,
      accomplishmentLimit: 20,
    });
  }, [
    mounted,
    rawTasks,
    rawHabits,
    rawHabitLogs,
    rangeType,
    tasks,
    habits,
    habitLogs,
    todayStr,
  ]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Editorial Page Header with Date Range Selector */}
      <PageHeader
        eyebrow="INSIGHTS & ANALYTICS"
        icon="📊"
        title="Personal Insights"
        description="Reflect on your momentum, output velocity, and habit consistency over time."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-orbit-border bg-orbit-surface p-1 shadow-orbit-xs">
            <Calendar className="ml-2 mr-1 h-3.5 w-3.5 text-orbit-text-muted shrink-0" />
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRangeType(opt.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  rangeType === opt.id
                    ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs font-semibold"
                    : "text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-surface-secondary/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Loading Skeleton */}
      {!snapshot ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={`skel-${i}`}
                className="h-28 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60"
              />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60" />
            <div className="h-80 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60" />
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: Overview Cards */}
          <OverviewCards snapshot={snapshot} />

          {/* Section 2: Daily Activity Throughput Chart */}
          <ActivityChart
            dailyTaskCompletions={snapshot.dailyTaskCompletions}
            dailyHabitCompletions={snapshot.dailyHabitCompletions}
            dateRangeType={
              RANGE_OPTIONS.find((o) => o.id === rangeType)?.label || rangeType
            }
          />

          {/* Section 3: Habit Consistency & Task Distribution Two-Column Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HabitBreakdown
              habitConsistency={snapshot.habitConsistency}
              habitStreaks={snapshot.habitStreaks}
            />
            <TaskDistribution distributions={snapshot.distributions} />
          </div>

          {/* Section 4: Recent Accomplishments */}
          <RecentAccomplishments
            accomplishments={snapshot.recentAccomplishments}
          />
        </>
      )}
    </div>
  );
}
