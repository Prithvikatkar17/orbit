"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { RitualsCadence } from "./rituals-cadence";
import { CuratedFocus } from "./curated-focus";
import { EditorialAgenda } from "./editorial-agenda";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { useMounted, parseLocalDate } from "@/lib/utils/dates";

export interface AestheticDashboardProps {
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

function numberToWord(n: number): string {
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ];
  return words[n] || String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function AestheticDashboard({
  habits,
  habitLogs,
  openTasks,
  dueTodayTasks,
  focusTasks,
  overdueCount,
  todayStr,
  onToggleTask,
  onToggleHabit,
  onOpenQuickCapture,
}: AestheticDashboardProps) {
  const mounted = useMounted();

  const dateObj = useMemo(() => {
    return todayStr ? parseLocalDate(todayStr) : new Date();
  }, [todayStr]);

  const dayOfYear = useMemo(() => (mounted ? getDayOfYear(dateObj) : 1), [mounted, dateObj]);
  const weekNumber = useMemo(() => (mounted ? getWeekNumber(dateObj) : 1), [mounted, dateObj]);

  const dayNumber = mounted ? String(dateObj.getDate()) : "";
  const monthName = mounted
    ? dateObj.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
    : "";
  const weekdayName = mounted
    ? dateObj.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
    : "";

  const greeting = mounted ? getTimeOfDayGreeting() : "Welcome";

  // Dynamic narrative prose generated honestly from real data
  const narrativeSummary = useMemo(() => {
    if (!mounted) return "";
    const totalOpen = openTasks.length;
    if (totalOpen === 0) {
      return "All intentions fulfilled for the day; space and stillness remain.";
    }

    if (overdueCount > 0) {
      const openWord = capitalize(numberToWord(totalOpen));
      const overdueWord = numberToWord(overdueCount);
      return `${openWord} open ${totalOpen === 1 ? "intention" : "intentions"} today, with ${overdueWord} overdue focus requiring your care.`;
    }

    if (dueTodayTasks.length > 0) {
      const openWord = capitalize(numberToWord(totalOpen));
      const dueWord = numberToWord(dueTodayTasks.length);
      return `${openWord} open ${totalOpen === 1 ? "intention" : "intentions"} today, with ${dueWord} thoughtfully scheduled for today.`;
    }

    const openWord = capitalize(numberToWord(totalOpen));
    return `${openWord} open ${totalOpen === 1 ? "intention" : "intentions"} calmly awaiting your pace.`;
  }, [mounted, openTasks.length, overdueCount, dueTodayTasks.length]);

  return (
    <div className="space-y-10 pb-16 max-w-full">
      {/* Optional migration alert */}
      <LegacyMigrationBanner />

      {/* A. The Masthead Header */}
      <header className="space-y-6">
        {/* Top Eyebrow Row */}
        <div className="flex items-center justify-between gap-y-2 gap-x-3 text-[11px] font-sans tracking-[0.18em] uppercase text-orbit-text-muted">
          <div className="flex items-center gap-2">
            <span>EDITION NO. {dayOfYear}</span>
            <span>·</span>
            <span>WEEK {weekNumber}</span>
          </div>

          {/* Right: Editorial publication metadata on desktop; subtle inline + Capture on mobile */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-orbit-text-muted/80">
              <span>PERSONAL ARCHIVE</span>
              <span>·</span>
              <span>LOCAL EDITION</span>
            </div>

            <button
              type="button"
              onClick={onOpenQuickCapture}
              aria-label="New intention entry"
              className="lg:hidden inline-flex items-center gap-1 text-[11px] font-sans tracking-[0.18em] uppercase text-orbit-accent hover:text-orbit-accent-hover transition-colors cursor-pointer py-0.5"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" aria-hidden />
              <span>Capture</span>
            </button>
          </div>
        </div>

        {/* Main Masthead Split */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          {/* Left: Serif Headline & Narrative Prose */}
          <div className="space-y-2.5 max-w-2xl">
            <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-orbit-text leading-tight">
              {greeting}
            </h1>
            {narrativeSummary && (
              <p className="font-serif italic text-base sm:text-lg text-orbit-text-secondary leading-relaxed">
                {narrativeSummary}
              </p>
            )}
          </div>

          {/* Right: Large Editorial Date Block */}
          {mounted && dayNumber && (
            <div className="flex items-baseline gap-3 shrink-0 self-start md:self-end">
              <span className="font-serif text-5xl sm:text-6xl italic text-orbit-text leading-none select-none">
                {dayNumber}
              </span>
              <div className="flex flex-col text-[10px] font-sans tracking-[0.2em] uppercase text-orbit-text-muted leading-tight">
                <span className="font-semibold text-orbit-text">{monthName}</span>
                <span>{weekdayName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Double Editorial Rule */}
        <div className="border-t border-b border-orbit-border h-1 opacity-70" />
      </header>

      {/* B. Zone 1: Daily Rituals Full-Width Horizontal Gallery Strip */}
      <RitualsCadence
        habits={habits}
        habitLogs={habitLogs}
        todayStr={todayStr}
        onToggleHabit={onToggleHabit}
        onOpenQuickCapture={onOpenQuickCapture}
      />

      {/* C & D. Lower Split: Curated Focus (7 cols) + Schedule & Horizon (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-2">
        {/* Zone 2: Curated Focus (7 Cols) */}
        <div className="lg:col-span-7">
          <CuratedFocus
            tasks={focusTasks}
            todayStr={todayStr}
            onToggleTask={onToggleTask}
            onOpenQuickCapture={onOpenQuickCapture}
          />
        </div>

        {/* Zone 3: Schedule & Horizon (5 Cols — separated by vertical hairline on desktop) */}
        <div className="lg:col-span-5 lg:border-l lg:border-orbit-border lg:pl-8">
          <EditorialAgenda />
        </div>
      </div>
    </div>
  );
}
