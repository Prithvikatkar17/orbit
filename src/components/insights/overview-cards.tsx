"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Target,
  AlertCircle,
  Repeat,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { AnalyticsSnapshot } from "@/lib/services/analytics-service";

interface OverviewCardsProps {
  snapshot: AnalyticsSnapshot;
}

export function OverviewCards({ snapshot }: OverviewCardsProps) {
  const {
    taskOverview,
    tasksCompletedInRange,
    taskPeriodComparison,
    habitConsistency,
    range,
  } = snapshot;

  const isOverdue = taskOverview.overdueTasks > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Tasks Completed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tasks Completed
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {tasksCompletedInRange}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {range.type === "all" ? (
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                Total completed all time
              </span>
            ) : taskPeriodComparison.percentageChange !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  taskPeriodComparison.trend === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : taskPeriodComparison.trend === "down"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {taskPeriodComparison.trend === "up" && <TrendingUp className="h-3.5 w-3.5" />}
                {taskPeriodComparison.trend === "down" && <TrendingDown className="h-3.5 w-3.5" />}
                {taskPeriodComparison.trend === "neutral" && <Minus className="h-3.5 w-3.5" />}
                {taskPeriodComparison.percentageChange > 0 ? "+" : ""}
                {taskPeriodComparison.percentageChange}%
                <span className="text-slate-400 font-normal ml-0.5">vs prev {range.daysCount}d</span>
              </span>
            ) : (
              <span className="text-slate-400">No prior period</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Pending Tasks */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Pending Tasks
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {taskOverview.pendingTasks}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {taskOverview.dueTodayTasks > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {taskOverview.dueTodayTasks} due today
              </span>
            ) : (
              <span>0 due today</span>
            )}
            <span className="mx-1 text-slate-300 dark:text-slate-700">·</span>
            <span>{taskOverview.upcomingTasks} upcoming</span>
          </div>
        </div>
      </div>

      {/* 3. Task Completion Rate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Completion Rate
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Target className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {taskOverview.completionRate}%
            </span>
          </div>

          <div className="mt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, taskOverview.completionRate))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {taskOverview.completedTasks} of {taskOverview.totalTasks} active tasks done
            </p>
          </div>
        </div>
      </div>

      {/* 4. Overdue Tasks */}
      <div
        className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
          isOverdue
            ? "border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/20"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              isOverdue
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Overdue Tasks
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              isOverdue
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div
            className={`text-3xl font-extrabold tracking-tight ${
              isOverdue
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {taskOverview.overdueTasks}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {isOverdue ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Needs your attention
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                All caught up!
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 5. Habit Consistency */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Habit Consistency
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
            <Repeat className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {habitConsistency.consistencyRate}%
            </span>
          </div>

          <div className="mt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, habitConsistency.consistencyRate))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 truncate">
              {habitConsistency.totalCompleted} / {habitConsistency.totalScheduled} check-ins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

