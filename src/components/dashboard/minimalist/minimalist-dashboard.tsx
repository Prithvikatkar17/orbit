"use client";

import React, { useMemo } from "react";
import type { Task, Habit, HabitLog, Event } from "@/lib/schemas";
import { parseLocalDate } from "@/lib/utils/dates";
import { SwissFocusLedger } from "./swiss-focus-ledger";
import { DieterCadenceStrip } from "./dieter-cadence-strip";
import { HorizonChronicle } from "./horizon-chronicle";

export interface MinimalistDashboardProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  events: Event[];
  activeHabits: Habit[];
  completedTodayHabitIds: Set<string>;
  openTasks: Task[];
  dueTodayTasks: Task[];
  focusTasks: Task[];
  overdueCount: number;
  habitsCompletedCount: number;
  habitsTotalCount: number;
  habitsProgressPct: number;
  todayStr: string | null;
  upcomingEventsCount: number;
  inboxCount: number;
  onToggleTask: (task: Task) => Promise<void>;
  onToggleHabit: (habitId: string) => Promise<void>;
  onOpenQuickCapture: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function MinimalistDashboard({
  tasks,
  habits,
  habitLogs,
  events,
  activeHabits,
  completedTodayHabitIds,
  openTasks,
  dueTodayTasks,
  overdueCount,
  habitsCompletedCount,
  habitsTotalCount,
  todayStr,
  onToggleTask,
  onToggleHabit,
  onOpenQuickCapture,
}: MinimalistDashboardProps) {
  // Vignelli Date Math
  const { dayNumber, monthYear, weekday } = useMemo(() => {
    if (!todayStr) {
      return { dayNumber: "—", monthYear: "CALENDAR", weekday: "TODAY" };
    }
    const d = parseLocalDate(todayStr);
    const day = String(d.getDate()).padStart(2, "0");
    const m = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const y = d.getFullYear();
    const w = d.toLocaleString("en-US", { weekday: "long" }).toUpperCase();
    return {
      dayNumber: day,
      monthYear: `${m} ${y}`,
      weekday: w,
    };
  }, [todayStr]);

  // Daily Completion Ratio Filament
  const ratioPct = useMemo(() => {
    // Total actionable items today: due today tasks + total habits
    const tasksDueOrCompletedToday = tasks.filter(
      (t) =>
        t.dueDate === todayStr ||
        (t.status === "completed" && t.completedAt && todayStr && t.completedAt.startsWith(todayStr))
    );
    const totalItems = tasksDueOrCompletedToday.length + habitsTotalCount;
    if (totalItems === 0) return 0;

    const completedTasksToday = tasksDueOrCompletedToday.filter((t) => t.status === "completed").length;
    const completedItems = completedTasksToday + habitsCompletedCount;
    return Math.min(100, Math.round((completedItems / totalItems) * 100));
  }, [tasks, todayStr, habitsTotalCount, habitsCompletedCount]);

  const greeting = getGreeting();

  return (
    <div className="space-y-10 pb-16 overflow-hidden">
      {/* 1. Top Horizon Filament (The Daily Ratio Bar) */}
      <div className="w-full h-[2px] bg-orbit-border overflow-hidden">
        <div
          className="h-full bg-[#ff3b00] transition-all duration-500 ease-out"
          style={{ width: `${ratioPct}%` }}
          role="progressbar"
          aria-valuenow={ratioPct}
          aria-valuemin={0}
          aria-valuemax={100}
          title={`Daily Completion Ratio: ${ratioPct}%`}
        />
      </div>

      {/* 2. The Swiss Typographic Masthead */}
      <header className="border-b border-orbit-border pb-8 pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Left Column: Oversized Vignelli-style date and greeting lockup */}
          <div className="flex items-baseline gap-3 sm:gap-4 md:gap-6">
            <span className="text-5xl sm:text-6xl md:text-7xl font-light tracking-tighter leading-none text-orbit-text tabular-nums select-none shrink-0">
              {dayNumber}
            </span>

            <div className="space-y-1 min-w-0">
              <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-orbit-text-muted leading-tight truncate">
                {monthYear} / {weekday}
              </div>
              <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-orbit-text truncate">
                {greeting}
              </h1>
            </div>
          </div>

          {/* Right Column: Clean Tabular Readout of Database State */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 self-start md:self-end">
            <div className="flex flex-wrap items-center divide-x divide-orbit-border">
              {/* Open Count */}
              <div className="pr-3 md:pr-6 text-left">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted block">
                  OPEN
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-orbit-text">
                  {String(openTasks.length).padStart(2, "0")}
                </span>
              </div>

              {/* Today Count */}
              <div className="px-3 md:px-6 text-left">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted block">
                  TODAY
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-orbit-text">
                  {String(dueTodayTasks.length).padStart(2, "0")}
                </span>
              </div>

              {/* Cadence Count */}
              <div className="px-3 md:px-6 text-left">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted block">
                  CADENCE
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-orbit-text">
                  {String(habitsCompletedCount).padStart(2, "0")}/{String(habitsTotalCount).padStart(2, "0")}
                </span>
              </div>

              {/* Overdue Alert (if any) */}
              {overdueCount > 0 && (
                <div className="pl-3 md:pl-6 text-left flex items-start gap-1.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#ff3b00] block">
                      OVERDUE
                    </span>
                    <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[#ff3b00]">
                      {String(overdueCount).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#ff3b00] mt-1 shrink-0 animate-pulse" />
                </div>
              )}

              {/* Desktop Ratio Readout (Deduplicating sidebar button) */}
              <div className="hidden lg:block pl-3 md:pl-6 text-left">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted block">
                  RATIO
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[#ff3b00]">
                  {ratioPct}%
                </span>
              </div>
            </div>

            {/* Mobile / Tablet Quick Action Trigger */}
            <button
              type="button"
              onClick={onOpenQuickCapture}
              className="lg:hidden text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] border border-orbit-border hover:border-orbit-text hover:bg-orbit-subtle/50 px-2.5 sm:px-3 py-1.5 rounded-[2px] transition-colors text-orbit-text shrink-0"
            >
              + NEW ENTRY
            </button>
          </div>
        </div>
      </header>

      {/* 3. The Swiss Margin Grid System */}
      {/* Band 01: The Tabular Focus Ledger */}
      <section>
        <SwissFocusLedger
          openTasks={openTasks}
          dueTodayTasks={dueTodayTasks}
          todayStr={todayStr}
          onToggleTask={onToggleTask}
          onOpenQuickCapture={onOpenQuickCapture}
        />
      </section>

      {/* Band 02 & Band 03: Cadence & Horizon (Full 12-Column Split: 6 cols & 6 cols) */}
      <section className="pt-6 border-t border-orbit-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Band 02 — Dieter Cadence Strip (6 cols on lg) */}
          <div className="lg:col-span-6">
            <DieterCadenceStrip
              habits={activeHabits.length > 0 ? activeHabits : habits}
              habitLogs={habitLogs}
              completedTodayHabitIds={completedTodayHabitIds}
              todayStr={todayStr}
              onToggleHabit={onToggleHabit}
            />
          </div>

          {/* Band 03 — Horizon Chronicle (6 cols on lg with vertical hairline border) */}
          <div className="lg:col-span-6 lg:border-l lg:border-orbit-border lg:pl-8">
            <HorizonChronicle events={events} todayStr={todayStr} />
          </div>
        </div>
      </section>
    </div>
  );
}
