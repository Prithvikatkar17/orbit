"use client";

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart2, Calendar } from "lucide-react";
import { db } from "@/lib/db/client";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { useMounted, useTodayDate } from "@/lib/utils/dates";
import {
  calculateAnalyticsSnapshot,
  type DateRangeType,
} from "@/lib/services/analytics-service";
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Date Range Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
              INSIGHTS & ANALYTICS
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Performance Overview
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track your output velocity, habit consistency, and personal momentum offline.
          </p>
        </div>

        {/* Date Range Segmented Control */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 self-start sm:self-auto">
          <Calendar className="ml-2 mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRangeType(opt.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                rangeType === opt.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {!snapshot ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={`skel-${i}`}
                className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-slate-800"
              />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-slate-800" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-slate-800" />
            <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-slate-800" />
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
