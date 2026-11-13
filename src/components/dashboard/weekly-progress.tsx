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
import { SurfaceCard } from "@/components/ui";

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
      <div className="h-44 w-full animate-pulse rounded-orbit-card border border-orbit-border bg-orbit-subtle/60" />
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
    <SurfaceCard as="section" className="@container p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orbit-border pb-4">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-4 w-4 text-orbit-accent" aria-hidden />
          <h2 className="font-display text-base font-bold text-orbit-text">
            Weekly Rhythm
          </h2>
          <span className="hidden text-xs text-orbit-text-muted sm:inline">
            · Last 7 days
          </span>
        </div>

        <Link
          href="/insights"
          className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors"
        >
          <span>Insights</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 @lg:grid-cols-12 @lg:items-center">
        {/* Left: Summary Metrics (5 columns, tonal surface without nested borders) */}
        <div className="grid grid-cols-1 gap-3 @[340px]:grid-cols-2 @lg:col-span-5">
          {/* Tasks Completed (7d) */}
          <div className="flex flex-col justify-between rounded-orbit-control bg-orbit-surface-secondary p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-orbit-text-muted">
              <span>Tasks Done</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-orbit-accent" aria-hidden />
            </div>

            <div className="mt-2">
              <div className="font-display text-2xl font-bold text-orbit-text tabular-nums">
                {tasksCompletedInRange}
              </div>

              <div className="mt-1 flex items-center text-[11px]">
                {taskPeriodComparison.percentageChange !== null ? (
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      taskPeriodComparison.trend === "up"
                        ? "text-orbit-success"
                        : taskPeriodComparison.trend === "down"
                        ? "text-orbit-danger"
                        : "text-orbit-text-muted"
                    }`}
                  >
                    {taskPeriodComparison.trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {taskPeriodComparison.trend === "down" && <TrendingDown className="h-3 w-3" />}
                    {taskPeriodComparison.trend === "neutral" && <Minus className="h-3 w-3" />}
                    {taskPeriodComparison.percentageChange > 0 ? "+" : ""}
                    {taskPeriodComparison.percentageChange}%
                    <span className="ml-0.5 font-normal text-orbit-text-muted">vs prev wk</span>
                  </span>
                ) : (
                  <span className="text-orbit-text-muted">0 prior week</span>
                )}
              </div>
            </div>
          </div>

          {/* Habit Consistency (7d) */}
          <div className="flex flex-col justify-between rounded-orbit-control bg-orbit-surface-secondary p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-orbit-text-muted">
              <span>Habits (7d)</span>
              <Repeat className="h-3.5 w-3.5 text-orbit-chart-2" aria-hidden />
            </div>

            <div className="mt-2">
              <div className="font-display text-2xl font-bold text-orbit-text tabular-nums">
                {habitConsistency.consistencyRate}%
              </div>

              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                <div
                  className="h-full rounded-full bg-orbit-chart-2 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, habitConsistency.consistencyRate))}%`,
                  }}
                />
              </div>

              <p className="mt-1 truncate text-[10px] text-orbit-text-muted">
                {habitConsistency.totalCompleted} of {habitConsistency.totalScheduled} check-ins
              </p>
            </div>
          </div>
        </div>

        {/* Right: Compact 7-Day Activity Chart (7 columns) */}
        <div className="flex flex-col justify-between md:col-span-7">
          <div className="mb-1 flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-semibold tracking-wider text-orbit-text-muted uppercase">
              Daily Task Activity
            </span>
            {activeHover ? (
              <span className="text-xs font-semibold text-orbit-chart-1 animate-in fade-in duration-100">
                {activeHover.date}: {activeHover.count}{" "}
                {activeHover.count === 1 ? "task" : "tasks"}
              </span>
            ) : (
              <span className="text-[11px] text-orbit-text-muted">Hover for daily count</span>
            )}
          </div>

          {/* Compact SVG Bar Chart */}
          <div className="w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-24 w-full select-none"
              role="img"
              aria-label="7-day task completions chart"
            >
              {/* Baseline axis */}
              <line
                x1={0}
                y1={barAreaHeight}
                x2={svgWidth}
                y2={barAreaHeight}
                stroke="var(--orbit-chart-grid)"
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
                        fill={isHovered ? "var(--orbit-chart-highlight)" : "var(--orbit-chart-axis, var(--orbit-text-muted))"}
                        className="text-[9px] font-bold"
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
                      rx={4}
                      fill={
                        item.count === 0
                          ? "var(--orbit-heatmap-0, var(--orbit-progress-track))"
                          : isHovered
                          ? "var(--orbit-chart-highlight)"
                          : "var(--orbit-chart-1)"
                      }
                      opacity={item.count === 0 ? 1 : isToday || isHovered ? 1 : 0.78}
                      className="transition-all duration-150"
                    />

                    {/* Day label */}
                    <text
                      x={barX + barWidth / 2}
                      y={svgHeight - 6}
                      textAnchor="middle"
                      fill={isToday ? "var(--orbit-chart-1)" : "var(--orbit-chart-axis, var(--orbit-text-muted))"}
                      className={`text-[10px] select-none ${isToday ? "font-bold" : ""}`}
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
    </SurfaceCard>
  );
}
