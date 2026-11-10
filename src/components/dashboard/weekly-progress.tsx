"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Repeat,
  ArrowRight,
} from "lucide-react";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { useMounted, useTodayDate, parseLocalDate } from "@/lib/utils/dates";
import { calculateAnalyticsSnapshot } from "@/lib/services/analytics-service";
import { fetchDashboardSnapshotData } from "@/lib/services/workspace-queries";

export interface WeeklyProgressWidgetProps {
  tasks?: Task[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  isLoaded?: boolean;
}

export function WeeklyProgressWidget({
  tasks: propTasks,
  habits: propHabits,
  habitLogs: propHabitLogs,
  isLoaded: propIsLoaded,
}: WeeklyProgressWidgetProps = {}) {
  const mounted = useMounted();
  const todayStr = useTodayDate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasExternalData = Boolean(
    propTasks !== undefined && propHabits !== undefined && propHabitLogs !== undefined
  );

  // Skip Dexie subscription entirely when parent supplies consolidated live data
  const liveData = useLiveQuery(
    () => (hasExternalData ? null : fetchDashboardSnapshotData()),
    [hasExternalData]
  );

  const isReady = hasExternalData ? (propIsLoaded ?? true) : Boolean(liveData);

  // Hydration-safe arrays
  const tasks: Task[] = useMemo(() => {
    if (!mounted) return [];
    return hasExternalData ? (propTasks ?? []) : (liveData?.tasks ?? []);
  }, [mounted, hasExternalData, propTasks, liveData]);

  const habits: Habit[] = useMemo(() => {
    if (!mounted) return [];
    return hasExternalData ? (propHabits ?? []) : (liveData?.habits ?? []);
  }, [mounted, hasExternalData, propHabits, liveData]);

  const habitLogs: HabitLog[] = useMemo(() => {
    if (!mounted) return [];
    return hasExternalData ? (propHabitLogs ?? []) : (liveData?.habitLogs ?? []);
  }, [mounted, hasExternalData, propHabitLogs, liveData]);

  // Pure analytics snapshot for last 7 days
  const snapshot = useMemo(() => {
    if (!mounted || !isReady) return null;
    return calculateAnalyticsSnapshot({
      rangeType: "7d",
      tasks,
      habits,
      habitLogs,
      today: todayStr || undefined,
    });
  }, [mounted, isReady, tasks, habits, habitLogs, todayStr]);

  if (!mounted || !snapshot) {
    return (
      <div className="h-44 w-full animate-pulse rounded-2xl border border-slate-200/50 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40" />
    );
  }

  const {
    tasksCompletedInRange,
    taskPeriodComparison,
    dailyTaskCompletions,
    habitConsistency,
  } = snapshot;

  // Chart scaling
  const maxDaily = Math.max(3, ...dailyTaskCompletions.map((d) => d.count));
  const svgWidth = 400;
  const svgHeight = 110;
  const padBottom = 26;
  const barAreaHeight = svgHeight - padBottom;
  const numBars = dailyTaskCompletions.length;
  const barSlotWidth = svgWidth / numBars;
  const barWidth = 28;

  function getWeekdayShort(dateStr: string) {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }

  const activeHover = hoveredIndex !== null ? dailyTaskCompletions[hoveredIndex] : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Weekly Progress
          </h2>
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">
            · Last 7 days
          </span>
        </div>

        <Link
          href="/insights"
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 group"
        >
          <span>View Insights</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        {/* Left: Summary Metrics (5 columns) */}
        <div className="grid grid-cols-2 gap-3.5 md:col-span-5">
          {/* Tasks Completed (7d) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/70 dark:bg-slate-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Tasks Done</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {tasksCompletedInRange}
              </div>

              <div className="mt-1 flex items-center text-[11px]">
                {taskPeriodComparison.percentageChange !== null ? (
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      taskPeriodComparison.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : taskPeriodComparison.trend === "down"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {taskPeriodComparison.trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {taskPeriodComparison.trend === "down" && <TrendingDown className="h-3 w-3" />}
                    {taskPeriodComparison.trend === "neutral" && <Minus className="h-3 w-3" />}
                    {taskPeriodComparison.percentageChange > 0 ? "+" : ""}
                    {taskPeriodComparison.percentageChange}%
                    <span className="text-slate-400 font-normal ml-0.5">vs prev wk</span>
                  </span>
                ) : (
                  <span className="text-slate-400">0 prior week</span>
                )}
              </div>
            </div>
          </div>

          {/* Habit Consistency (7d) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/70 dark:bg-slate-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Habits (7d)</span>
              <Repeat className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {habitConsistency.consistencyRate}%
              </div>

              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, habitConsistency.consistencyRate))}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-[10px] text-slate-400 truncate">
                {habitConsistency.totalCompleted} of {habitConsistency.totalScheduled} check-ins
              </p>
            </div>
          </div>
        </div>

        {/* Right: Compact 7-Day Activity Chart (7 columns) */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Daily Task Activity
            </span>
            {activeHover ? (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-in fade-in duration-100">
                {activeHover.date}: {activeHover.count} {activeHover.count === 1 ? "task" : "tasks"}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Hover for daily count</span>
            )}
          </div>

          {/* Compact SVG Bar Chart */}
          <div className="w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-24 select-none"
              role="img"
              aria-label="7-day task completions chart"
            >
              {/* Baseline axis */}
              <line
                x1={0}
                y1={barAreaHeight}
                x2={svgWidth}
                y2={barAreaHeight}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth={1}
              />

              {dailyTaskCompletions.map((item, index) => {
                const slotX = index * barSlotWidth;
                const barX = slotX + (barSlotWidth - barWidth) / 2;
                const barHeight =
                  item.count > 0 ? (item.count / maxDaily) * (barAreaHeight - 14) : 2;
                const barY = barAreaHeight - barHeight;
                const isHovered = hoveredIndex === index;
                const isToday = item.date === todayStr;

                return (
                  <g
                    key={item.date}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Hover hit area */}
                    <rect
                      x={slotX}
                      y={0}
                      width={barSlotWidth}
                      height={svgHeight}
                      fill="transparent"
                    />

                    {/* Value count above bar if > 0 */}
                    {item.count > 0 && (
                      <text
                        x={barX + barWidth / 2}
                        y={barY - 3}
                        textAnchor="middle"
                        className={`text-[9px] font-bold ${
                          isHovered
                            ? "fill-indigo-600 dark:fill-indigo-400"
                            : "fill-slate-500 dark:fill-slate-400"
                        }`}
                      >
                        {item.count}
                      </text>
                    )}

                    {/* Bar */}
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      className={`transition-colors duration-150 ${
                        item.count === 0
                          ? "fill-slate-100 dark:fill-slate-800"
                          : isHovered
                          ? "fill-indigo-500"
                          : isToday
                          ? "fill-indigo-600 dark:fill-indigo-500"
                          : "fill-indigo-500/80 dark:fill-indigo-600/80"
                      }`}
                    />

                    {/* Day label */}
                    <text
                      x={barX + barWidth / 2}
                      y={svgHeight - 6}
                      textAnchor="middle"
                      className={`text-[10px] select-none ${
                        isToday
                          ? "font-bold fill-indigo-600 dark:fill-indigo-400"
                          : "fill-slate-400"
                      }`}
                    >
                      {getWeekdayShort(item.date)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

