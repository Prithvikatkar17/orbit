"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  Clock,
  Repeat,
  Plus,
  ArrowRight,
  ShieldCheck,
  Search,
  Inbox,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { useSearchStore } from "@/lib/stores/search-store";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events";
import { WeeklyProgressWidget } from "@/components/dashboard/weekly-progress";
import { Badge, Button, EmptyState, SurfaceCard } from "@/components/ui";
import { CATEGORY_ICONS } from "@/lib/constants";
import {
  formatDateDisplay,
  formatFriendlyDate,
  useMounted,
  useTodayDate,
} from "@/lib/utils/dates";
import { toggleTaskCompletionWithSync } from "@/lib/services/task-sync-service";
import {
  fetchDashboardSnapshotData,
  deriveDashboardMetrics,
} from "@/lib/services/workspace-queries";
import type { Task } from "@/lib/schemas";

const EMPTY_DASHBOARD_DATA = {
  tasks: [],
  habits: [],
  habitLogs: [],
};

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const mounted = useMounted();
  const todayStr = useTodayDate();
  const { openQuickCapture } = useUIStore();
  const openSearch = useSearchStore((s) => s.openSearch);

  // Single consolidated Dexie live query shared between HomePage & WeeklyProgressWidget
  const rawDashboardData = useLiveQuery(() => fetchDashboardSnapshotData(), []);
  const dashboardData = rawDashboardData ?? EMPTY_DASHBOARD_DATA;

  const {
    activeHabits,
    completedTodayHabitIds,
    openTasks,
    dueTodayTasks,
  } = useMemo(
    () => deriveDashboardMetrics(dashboardData, todayStr),
    [dashboardData, todayStr]
  );

  // Surface the most actionable tasks first: overdue -> due today -> high priority -> custom order
  const focusTasks = useMemo(() => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return [...openTasks]
      .sort((a, b) => {
        const aOverdue = Boolean(a.dueDate && todayStr && a.dueDate < todayStr);
        const bOverdue = Boolean(b.dueDate && todayStr && b.dueDate < todayStr);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        const aToday = Boolean(a.dueDate && todayStr && a.dueDate === todayStr);
        const bToday = Boolean(b.dueDate && todayStr && b.dueDate === todayStr);
        if (aToday !== bToday) return aToday ? -1 : 1;

        const pDiff = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
        if (pDiff !== 0) return pDiff;

        return a.sortOrder - b.sortOrder;
      })
      .slice(0, 6);
  }, [openTasks, todayStr]);

  const overdueCount = useMemo(() => {
    if (!todayStr) return 0;
    return openTasks.filter((t) => Boolean(t.dueDate && t.dueDate < todayStr)).length;
  }, [openTasks, todayStr]);

  const habitsCompletedCount = completedTodayHabitIds.size;
  const habitsTotalCount = activeHabits.length;
  const habitsProgressPct =
    habitsTotalCount > 0 ? Math.round((habitsCompletedCount / habitsTotalCount) * 100) : 0;

  async function toggleHabit(habitId: string) {
    if (!todayStr) return;
    const existing = await db.habitLogs
      .where("[habitId+date]")
      .equals([habitId, todayStr])
      .first();

    if (existing) {
      await db.habitLogs.delete(existing.id);
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        habitId,
        date: todayStr,
        completed: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function toggleTask(task: Task) {
    try {
      await toggleTaskCompletionWithSync(task);
    } catch (err: unknown) {
      console.error("Toggle task error:", err);
    }
  }

  const greetingText = mounted ? getTimeOfDayGreeting() : "Welcome home";
  const dateSubtitle =
    mounted && todayStr ? formatDateDisplay(todayStr) : "Your personal space, everything in place.";

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-200">
      {/* Migration Alert from Everything-List */}
      <LegacyMigrationBanner />

      {/* Personal Welcome & Daily Briefing Header */}
      <header className="flex flex-col justify-between gap-5 border-b border-orbit-border pb-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-orbit-accent uppercase">
            {dateSubtitle}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-orbit-text md:text-4xl">
            {greetingText}
          </h1>

          {/* Calm Inline Summary Strip (replaces 4 KPI boxes) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-orbit-text-secondary">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 hover:text-orbit-text transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orbit-accent" aria-hidden />
              <span>
                <strong className="font-semibold text-orbit-text">{dueTodayTasks.length}</strong>{" "}
                due today
              </span>
            </Link>

            {overdueCount > 0 && (
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 text-orbit-danger hover:underline"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orbit-danger" aria-hidden />
                <span>
                  <strong className="font-semibold">{overdueCount}</strong> overdue
                </span>
              </Link>
            )}

            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 hover:text-orbit-text transition-colors"
            >
              <span>
                <strong className="font-semibold text-orbit-text">{openTasks.length}</strong> open
                tasks
              </span>
            </Link>

            <Link
              href="/habits"
              className="inline-flex items-center gap-1.5 hover:text-orbit-text transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orbit-success" aria-hidden />
              <span>
                <strong className="font-semibold text-orbit-text">
                  {habitsCompletedCount}/{habitsTotalCount}
                </strong>{" "}
                habits today
              </span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<Search className="h-3.5 w-3.5 text-orbit-text-muted" />}
            onClick={() => openSearch()}
          >
            Search
          </Button>
          <Link
            href="/inbox"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 text-xs font-semibold text-orbit-text-secondary shadow-orbit-xs transition-colors hover:border-orbit-border-strong hover:bg-orbit-subtle hover:text-orbit-text"
          >
            <Inbox className="h-3.5 w-3.5 text-orbit-text-muted" />
            <span>Inbox</span>
          </Link>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={openQuickCapture}
          >
            Quick Capture
          </Button>
        </div>
      </header>

      {/* Main Workspace Asymmetric Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column (7 cols): Today's Focus + Weekly Progress */}
        <div className="space-y-6 lg:col-span-7">
          <SurfaceCard as="section" className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-orbit-border px-5 py-4 sm:px-6">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <Clock className="h-4 w-4 shrink-0 text-orbit-accent" aria-hidden />
                <h2 className="font-display text-base font-bold text-orbit-text">
                  Today&apos;s Focus
                </h2>
                {openTasks.length > 0 && (
                  <span className="text-xs font-medium text-orbit-text-muted">
                    ({openTasks.length} open)
                  </span>
                )}
              </div>
              <Link
                href="/tasks"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors"
              >
                <span>All tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {focusTasks.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  dashed={false}
                  className="border-0 py-6"
                  icon={<CheckCircle2 className="h-6 w-6 text-orbit-success" />}
                  title="All clear for now"
                  description="You have no open tasks waiting. Capture a thought or add something for today."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={openQuickCapture}
                    >
                      Add a task
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-orbit-border">
                {focusTasks.map((task) => {
                  const icon = CATEGORY_ICONS[task.category] || "📌";
                  const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
                  const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);

                  return (
                    <li
                      key={task.id}
                      className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-orbit-surface-secondary/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <button
                          type="button"
                          aria-label={`Mark "${task.title}" as completed`}
                          onClick={() => toggleTask(task)}
                          className="group/check -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--orbit-focus-ring)]"
                        >
                          <span className="h-5 w-5 rounded-full border-2 border-orbit-border-strong transition-colors group-hover/check:border-orbit-accent" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-sm select-none" aria-hidden>
                              {icon}
                            </span>
                            <Link
                              href={`/tasks?taskId=${task.id}`}
                              className="line-clamp-2 [overflow-wrap:anywhere] text-sm font-medium text-orbit-text hover:text-orbit-accent transition-colors"
                            >
                              {task.title}
                            </Link>
                          </div>
                          {task.dueDate && (
                            <p
                              className={`mt-0.5 text-xs ${
                                isOverdue
                                  ? "font-semibold text-orbit-danger"
                                  : isDueToday
                                  ? "font-medium text-orbit-accent"
                                  : "text-orbit-text-muted"
                              }`}
                            >
                              {formatFriendlyDate(task.dueDate, task.dueTime)}
                              {isOverdue ? " · Overdue" : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {(task.priority === "high" || task.category.toLowerCase() === "goal") && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:shrink-0 sm:pl-0">
                          {task.priority === "high" && (
                            <Badge variant="danger">High</Badge>
                          )}
                          {task.category.toLowerCase() === "goal" && (
                            <Badge variant="accent">Goal</Badge>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>

          <WeeklyProgressWidget
            tasks={dashboardData.tasks}
            habits={dashboardData.habits}
            habitLogs={dashboardData.habitLogs}
            isLoaded={Boolean(rawDashboardData)}
          />
        </div>

        {/* Right Column (5 cols): Daily Routines + Upcoming Schedule */}
        <div className="space-y-6 lg:col-span-5">
          <SurfaceCard as="section" className="overflow-hidden">
            <div className="border-b border-orbit-border px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Repeat className="h-4 w-4 text-orbit-success" aria-hidden />
                  <h2 className="font-display text-base font-bold text-orbit-text">
                    Daily Routines
                  </h2>
                </div>
                <Link
                  href="/habits"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors"
                >
                  <span>All habits</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {habitsTotalCount > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orbit-progress-track">
                    <div
                      className="h-full rounded-full bg-orbit-chart-2 transition-all duration-300"
                      style={{ width: `${habitsProgressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-orbit-text-muted tabular-nums">
                    {habitsCompletedCount}/{habitsTotalCount}
                  </span>
                </div>
              )}
            </div>

            {activeHabits.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  dashed={false}
                  className="border-0 py-6"
                  icon={<Repeat className="h-6 w-6" />}
                  title="No active routines yet"
                  description="Create daily or weekly habits to track consistency at a glance."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={openQuickCapture}
                    >
                      Create a habit
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-orbit-border">
                {activeHabits.map((habit) => {
                  const done = completedTodayHabitIds.has(habit.id);
                  return (
                    <li
                      key={habit.id}
                      className="flex items-center justify-between gap-3 px-5 py-1.5 transition-colors hover:bg-orbit-surface-secondary/70 sm:px-6"
                    >
                      <button
                        type="button"
                        aria-pressed={done}
                        aria-label={
                          done
                            ? `Mark "${habit.title}" incomplete`
                            : `Mark "${habit.title}" completed`
                        }
                        onClick={() => toggleHabit(habit.id)}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 py-2 text-left focus-visible:outline-hidden group"
                      >
                        <span
                          style={
                            done
                              ? { backgroundColor: habit.color, borderColor: habit.color }
                              : { borderColor: habit.color }
                          }
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                            done ? "text-white" : "bg-transparent group-hover:scale-105"
                          }`}
                        >
                          {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={`truncate text-sm font-medium transition-colors ${
                            done
                              ? "text-orbit-text-muted line-through"
                              : "text-orbit-text"
                          }`}
                        >
                          {habit.title}
                        </span>
                      </button>

                      <span className="shrink-0 text-[11px] font-medium capitalize text-orbit-text-muted">
                        {habit.frequency === "weekdays" ? "Mon–Fri" : habit.frequency}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>

          <UpcomingEventsWidget />
        </div>
      </div>

      {/* Subtle Local-First Footer Note */}
      <footer className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-orbit-text-muted">
        <ShieldCheck className="h-4 w-4 text-orbit-success shrink-0" aria-hidden />
        <span>
          Local-first &amp; private — all your data stays in this browser&apos;s IndexedDB.
        </span>
      </footer>
    </div>
  );
}
