"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, AlertCircle } from "lucide-react";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { TodaysFocus } from "./todays-focus";
import { HabitCadence } from "./habit-cadence";
import { UpcomingAgenda } from "./upcoming-agenda";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { useMounted, formatDateDisplay } from "@/lib/utils/dates";
import { useSearchStore } from "@/lib/stores/search-store";

export interface FuturisticDashboardProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  activeHabits: Habit[];
  completedTodayHabitIds: Set<string>;
  openTasks: Task[];
  dueTodayTasks: Task[];
  focusTasks: Task[];
  overdueCount: number;
  habitsCompletedCount: number;
  habitsTotalCount: number;
  habitsProgressPct: number;
  todayStr: string;
  upcomingEventsCount: number;
  inboxCount?: number;
  onToggleTask: (task: Task) => Promise<void>;
  onToggleHabit: (habitId: string) => Promise<void>;
  onOpenQuickCapture: () => void;
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function FuturisticDashboard({
  habits,
  habitLogs,
  openTasks,
  dueTodayTasks,
  focusTasks,
  overdueCount,
  habitsCompletedCount,
  habitsTotalCount,
  todayStr,
  onToggleTask,
  onToggleHabit,
  onOpenQuickCapture,
}: FuturisticDashboardProps) {
  const mounted = useMounted();
  const openSearch = useSearchStore((s) => s.openSearch);

  // Restrained digital clock
  const [clockStr, setClockStr] = useState<string>("");

  useEffect(() => {
    if (!mounted) return;
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      setClockStr(`${h}:${m}`);
    }
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, [mounted]);

  const greeting = mounted ? getTimeOfDayGreeting() : "Welcome";
  const dateStr = mounted && todayStr ? formatDateDisplay(todayStr).toUpperCase() : "";

  return (
    <div className="space-y-6 pb-12 max-w-full">
      {/* Optional migration alert */}
      <LegacyMigrationBanner />

      {/* 1. Restrained Industrial Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-orbit-border pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-xs text-orbit-text-muted tracking-wider">
            <span>{dateStr}</span>
            {clockStr && (
              <>
                <span className="text-orbit-border-strong">·</span>
                <span className="text-orbit-accent font-semibold tabular-nums">{clockStr}</span>
              </>
            )}
          </div>

          <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text">
            {greeting}
          </h1>

          {/* Calm, inline textual summary indicator (No cards, no five-cell ribbon) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-orbit-text-muted">
            <Link href="/tasks" className="hover:text-orbit-text transition-colors">
              <span className="font-semibold text-orbit-text tabular-nums">{openTasks.length}</span> open tasks
            </Link>

            {dueTodayTasks.length > 0 && (
              <>
                <span className="text-orbit-border-strong select-none">·</span>
                <Link href="/tasks" className="hover:text-orbit-accent transition-colors text-orbit-accent">
                  <span className="font-semibold tabular-nums">{dueTodayTasks.length}</span> due today
                </Link>
              </>
            )}

            {overdueCount > 0 && (
              <>
                <span className="text-orbit-border-strong select-none">·</span>
                <Link href="/tasks" className="inline-flex items-center gap-1 font-semibold text-orbit-danger hover:underline">
                  <AlertCircle className="h-3 w-3" />
                  <span>{overdueCount} overdue</span>
                </Link>
              </>
            )}

            {habitsTotalCount > 0 && (
              <>
                <span className="text-orbit-border-strong select-none">·</span>
                <Link href="/habits" className="hover:text-orbit-text transition-colors">
                  <span className="font-semibold text-orbit-text tabular-nums">
                    {habitsCompletedCount}/{habitsTotalCount}
                  </span>{" "}
                  habits completed
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => openSearch()}
            aria-label="Universal search"
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 px-3 py-1.5 font-sans text-xs font-medium text-orbit-text bg-orbit-surface border border-orbit-border rounded-xs cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-orbit-text-muted" aria-hidden />
            <span>Search</span>
            <span className="font-mono text-[10px] text-orbit-text-muted ml-1">⌘K</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickCapture}
            aria-label="Quick capture"
            className="futuristic-btn-tactile futuristic-btn-tactile-primary inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 px-3.5 py-1.5 font-sans text-xs font-semibold rounded-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            <span>Quick Capture</span>
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PRIMARY SECTION: Today's Focus (Visually Dominant 7-8 columns on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <TodaysFocus
            tasks={focusTasks}
            totalOpenCount={openTasks.length}
            todayStr={todayStr}
            onToggleTask={onToggleTask}
            onOpenQuickCapture={onOpenQuickCapture}
          />
        </div>

        {/* SECONDARY SUPPORTING COLUMN: Habits & Upcoming (4-5 columns on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          <HabitCadence
            habits={habits}
            habitLogs={habitLogs}
            todayStr={todayStr}
            onToggleHabit={onToggleHabit}
            onOpenQuickCapture={onOpenQuickCapture}
          />

          <UpcomingAgenda />
        </div>
      </div>
    </div>
  );
}
