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
  Flame,
} from "lucide-react";
import type { AnalyticsSnapshot } from "@/lib/services/analytics-service";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";

interface OverviewCardsProps {
  snapshot: AnalyticsSnapshot;
}

export function OverviewCards({ snapshot }: OverviewCardsProps) {
  const {
    taskOverview,
    tasksCompletedInRange,
    taskPeriodComparison,
    habitConsistency,
    habitStreaks,
    goalProgress,
    range,
  } = snapshot;

  const isOverdue = taskOverview.overdueTasks > 0;
  const bestActiveStreak = habitStreaks.longestCurrentStreak;

  return (
    <div className="space-y-4">
      {/* Editorial Narrative Summary Strip */}
      <SurfaceCard variant="tonal" padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-orbit-accent">
                Rhythm & Output
              </span>
              <Badge variant="neutral">
                {range.type === "all" ? "All Time" : `Past ${range.daysCount} Days`}
              </Badge>
            </div>
            <p className="font-display text-lg font-semibold text-orbit-text">
              {tasksCompletedInRange > 0
                ? `${tasksCompletedInRange} ${
                    tasksCompletedInRange === 1 ? "task" : "tasks"
                  } completed with ${habitConsistency.consistencyRate}% habit consistency.`
                : "A calm period. Ready when you want to begin tracking momentum."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-orbit-text-secondary tabular-nums">
            <span className="inline-flex items-center gap-1.5 rounded-orbit-control bg-orbit-surface px-2.5 py-1 border border-orbit-border/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-orbit-success" />
              <span>{taskOverview.completionRate}% task rate</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-orbit-control bg-orbit-surface px-2.5 py-1 border border-orbit-border/80">
              <Flame className="h-3.5 w-3.5 text-orbit-warning" />
              <span>{bestActiveStreak}d active streak</span>
            </span>
            {goalProgress.totalGoals > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-orbit-control bg-orbit-surface px-2.5 py-1 border border-orbit-border/80">
                <Target className="h-3.5 w-3.5 text-orbit-accent" />
                <span>{goalProgress.completedGoals}/{goalProgress.totalGoals} goals</span>
              </span>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Bento-Style 5 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {/* 1. Tasks Completed in Range — Hero Volume & Velocity Tile */}
        <SurfaceCard
          padding="md"
          className="flex flex-col justify-between sm:col-span-2 lg:col-span-7 border-l-4 border-l-orbit-accent/80 transition-all hover:border-l-orbit-accent"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-muted">
                Tasks Completed
              </span>
              <p className="text-[11px] text-orbit-text-secondary">
                Velocity within selected window
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-orbit-control bg-orbit-accent-soft text-orbit-accent shadow-orbit-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-orbit-text tabular-nums">
                {tasksCompletedInRange}
              </span>
              <span className="text-xs font-medium text-orbit-text-muted">
                {tasksCompletedInRange === 1 ? "task done" : "tasks done"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {range.type === "all" ? (
                <span className="font-medium text-orbit-text-muted">
                  Total completed all time
                </span>
              ) : taskPeriodComparison.percentageChange !== null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border ${
                    taskPeriodComparison.trend === "up"
                      ? "border-orbit-success/30 bg-orbit-success/10 text-orbit-success"
                      : taskPeriodComparison.trend === "down"
                      ? "border-orbit-danger/30 bg-orbit-danger/10 text-orbit-danger"
                      : "border-orbit-border bg-orbit-surface-secondary text-orbit-text-muted"
                  }`}
                >
                  {taskPeriodComparison.trend === "up" && (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  {taskPeriodComparison.trend === "down" && (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {taskPeriodComparison.trend === "neutral" && (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  <span className="font-mono tabular-nums font-semibold">
                    {taskPeriodComparison.percentageChange > 0 ? "+" : ""}
                    {taskPeriodComparison.percentageChange}%
                  </span>
                  <span className="text-orbit-text-muted">
                    vs prev {range.daysCount}d
                  </span>
                </span>
              ) : (
                <span className="text-orbit-text-muted">No prior period</span>
              )}
            </div>
          </div>
        </SurfaceCard>

        {/* 2. Habit Consistency — Hero Cadence & Streaks Tile */}
        <SurfaceCard
          padding="md"
          className="flex flex-col justify-between sm:col-span-2 lg:col-span-5 border-l-4 border-l-orbit-chart-2/80 transition-all hover:border-l-orbit-chart-2"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-muted">
                Habit Consistency
              </span>
              <p className="text-[11px] text-orbit-text-secondary">
                Scheduled routine adherence
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-orbit-control bg-orbit-accent-secondary-soft text-orbit-accent-secondary shadow-orbit-xs">
              <Repeat className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-orbit-text tabular-nums">
                {habitConsistency.consistencyRate}%
              </span>
              {bestActiveStreak > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-orbit-warning">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{bestActiveStreak}d streak</span>
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                <div
                  className="h-full rounded-full bg-orbit-chart-2 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, habitConsistency.consistencyRate)
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-orbit-text-muted tabular-nums truncate">
                {habitConsistency.totalCompleted} / {habitConsistency.totalScheduled} check-ins
              </p>
            </div>
          </div>
        </SurfaceCard>

        {/* 3. Task Completion Rate — Supporting Metric Tile */}
        <SurfaceCard
          padding="md"
          className="flex flex-col justify-between sm:col-span-1 lg:col-span-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orbit-text-muted">
              Completion Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-orbit-control bg-orbit-success-soft text-orbit-success">
              <Target className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-orbit-text tabular-nums">
                {taskOverview.completionRate}%
              </span>
            </div>

            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                <div
                  className="h-full rounded-full bg-orbit-progress-fill transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, taskOverview.completionRate)
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-orbit-text-muted tabular-nums">
                {taskOverview.completedTasks} / {taskOverview.totalTasks} active tasks done
              </p>
            </div>
          </div>
        </SurfaceCard>

        {/* 4. Pending Tasks — Supporting Metric Tile */}
        <SurfaceCard
          padding="md"
          className="flex flex-col justify-between sm:col-span-1 lg:col-span-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orbit-text-muted">
              Pending Tasks
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-orbit-control bg-orbit-warning-soft text-orbit-warning">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-orbit-text tabular-nums">
              {taskOverview.pendingTasks}
            </div>
            <div className="mt-2 text-xs text-orbit-text-secondary">
              {taskOverview.dueTodayTasks > 0 ? (
                <span className="font-medium text-orbit-warning">
                  {taskOverview.dueTodayTasks} due today
                </span>
              ) : (
                <span>0 due today</span>
              )}
              <span className="mx-1 text-orbit-border-strong">·</span>
              <span className="font-mono tabular-nums">
                {taskOverview.upcomingTasks} upcoming
              </span>
            </div>
          </div>
        </SurfaceCard>

        {/* 5. Overdue Tasks — Supporting Metric / Status Alert Tile */}
        <SurfaceCard
          padding="md"
          className={`flex flex-col justify-between sm:col-span-2 lg:col-span-4 transition-colors ${
            isOverdue
              ? "border-orbit-danger/35 bg-orbit-danger-soft/30"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold ${
                isOverdue
                  ? "text-orbit-danger"
                  : "text-orbit-text-muted"
              }`}
            >
              Overdue Tasks
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-orbit-control ${
                isOverdue
                  ? "bg-orbit-danger-soft text-orbit-danger"
                  : "bg-orbit-surface-secondary text-orbit-text-muted"
              }`}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3">
            <div
              className={`font-display text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${
                isOverdue ? "text-orbit-danger" : "text-orbit-text"
              }`}
            >
              {taskOverview.overdueTasks}
            </div>
            <p className="mt-2 text-xs">
              {isOverdue ? (
                <span className="font-medium text-orbit-danger">
                  Needs your attention
                </span>
              ) : (
                <span className="font-medium text-orbit-success">
                  All caught up!
                </span>
              )}
            </p>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
