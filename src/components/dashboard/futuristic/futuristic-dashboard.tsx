"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog } from "@/lib/schemas";
import { TodaysFocus } from "./todays-focus";
import { HabitCadence } from "./habit-cadence";
import { UpcomingAgenda } from "./upcoming-agenda";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { useMounted, formatDateDisplay } from "@/lib/utils/dates";
import { formatRealStatusSentence } from "./futuristic-math";

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

  // Precision digital clock
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

  // Real, concise narrative status sentence
  const statusSentence = useMemo(() => {
    return formatRealStatusSentence(openTasks.length, dueTodayTasks.length, overdueCount);
  }, [openTasks.length, dueTodayTasks.length, overdueCount]);

  return (
    <div className="space-y-6 pb-14 max-w-full font-sans">
      {/* Optional migration alert */}
      <LegacyMigrationBanner />

      {/* =========================================================================
          1. SLEEK, LOW-PROFILE HORIZON HEADER (Max ~130px height)
          ========================================================================= */}
      <header className="futuristic-command-deck rounded-[14px] px-6 sm:px-7 py-5 relative overflow-hidden">
        {/* Subtle Low-Opacity Background Horizon Watermark (Zero Boxed HUD) */}
        <div className="absolute inset-0 pointer-events-none opacity-10 select-none overflow-hidden" aria-hidden>
          <svg
            viewBox="0 0 1000 130"
            preserveAspectRatio="none"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Precision horizon grid & arc */}
            <line x1="0" y1="90" x2="1000" y2="90" stroke="#00f0ff" strokeWidth="1" />
            <line x1="0" y1="110" x2="1000" y2="110" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4 6" />
            <path
              d="M 650 130 A 260 110 0 0 0 950 20"
              fill="none"
              stroke="#00f0ff"
              strokeWidth="1.2"
            />
            <path
              d="M 680 130 A 230 90 0 0 0 930 40"
              fill="none"
              stroke="#00f0ff"
              strokeWidth="0.6"
              strokeDasharray="2 4"
            />
            {/* Subtle precision pitch ticks on the far right */}
            <line x1="820" y1="65" x2="840" y2="65" stroke="#00f0ff" strokeWidth="1" />
            <line x1="880" y1="65" x2="900" y2="65" stroke="#00f0ff" strokeWidth="1" />
            <circle cx="860" cy="65" r="2.5" fill="#00f0ff" />
          </svg>
        </div>

        {/* 4 Corner Subtle Hex Markers */}
        <span className="absolute top-2 left-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute top-2 right-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute bottom-2 left-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute bottom-2 right-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>

        {/* Single Balanced Row on Desktop */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Left Side: Eyebrow + Calm Title Case Greeting + 1-Sentence Real Status */}
          <div className="space-y-1">
            {/* Eyebrow with Pulsing Cyan LED */}
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-[#00f0ff]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]" />
              </span>
              <span>
                {dateStr}
                {clockStr && (
                  <>
                    <span className="text-[#334155] mx-1.5">·</span>
                    <span className="tabular-nums font-semibold">{clockStr}</span>
                  </>
                )}
              </span>
            </div>

            {/* Calm Greeting (Title Case, NOT all-caps) */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
              {greeting}
            </h1>

            {/* Subtitle: Exactly One Concise Sentence of Real Status */}
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-normal max-w-xl">
              {statusSentence}
            </p>
          </div>

          {/* Right Side: 3 Recessed OLED Readout Capsules (Clean, Tabular, Minimal) */}
          <div className="flex items-center gap-2.5 sm:shrink-0 self-start sm:self-auto">
            {/* Capsule 1: Open Tasks */}
            <Link
              href="/tasks"
              className="futuristic-oled-panel px-3.5 py-2 text-center min-w-[76px] hover:border-[#00f0ff]/50 transition-colors block"
              aria-label={`${openTasks.length} open tasks`}
            >
              <div className="text-base sm:text-lg font-bold font-mono text-[#00f0ff] tabular-nums leading-none">
                {String(openTasks.length).padStart(2, "0")}
              </div>
              <div className="text-[9px] font-mono text-[#64748b] tracking-wider mt-1 uppercase">
                OPEN
              </div>
            </Link>

            {/* Capsule 2: Due Today */}
            <Link
              href="/tasks"
              className="futuristic-oled-panel px-3.5 py-2 text-center min-w-[76px] hover:border-[#00f0ff]/50 transition-colors block"
              aria-label={`${dueTodayTasks.length} tasks due today`}
            >
              <div
                className={`text-base sm:text-lg font-bold font-mono tabular-nums leading-none ${
                  overdueCount > 0
                    ? "text-[#ef4444]"
                    : dueTodayTasks.length > 0
                    ? "text-[#ffb000]"
                    : "text-[#94a3b8]"
                }`}
              >
                {String(dueTodayTasks.length).padStart(2, "0")}
              </div>
              <div className="text-[9px] font-mono text-[#64748b] tracking-wider mt-1 uppercase">
                {overdueCount > 0 ? "OVERDUE" : "DUE TODAY"}
              </div>
            </Link>

            {/* Capsule 3: Habits Progress */}
            <Link
              href="/habits"
              className="futuristic-oled-panel px-3.5 py-2 text-center min-w-[76px] hover:border-[#00f0ff]/50 transition-colors block"
              aria-label={`${habitsCompletedCount} of ${habitsTotalCount} habits completed`}
            >
              <div className="text-base sm:text-lg font-bold font-mono text-[#00e5a3] tabular-nums leading-none">
                {String(habitsCompletedCount).padStart(2, "0")}/{String(habitsTotalCount).padStart(2, "0")}
              </div>
              <div className="text-[9px] font-mono text-[#64748b] tracking-wider mt-1 uppercase">
                HABITS
              </div>
            </Link>

            {/* Mobile-only compact quick capture button (Hidden on desktop to avoid duplicate) */}
            <button
              type="button"
              onClick={onOpenQuickCapture}
              aria-label="Quick capture"
              className="lg:hidden futuristic-btn-tactile futuristic-btn-tactile-primary p-2 rounded-xs cursor-pointer flex items-center justify-center min-h-[38px] min-w-[38px]"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. CALM 2-COLUMN HIERARCHY (8 COLS PRIMARY FOCUS | 4 COLS HABITS & SCHEDULE)
          Tasks are dominant and 100% visible above the fold!
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Today's Focus — Dominant & Breathable */}
        <main className="lg:col-span-8">
          <TodaysFocus
            tasks={focusTasks}
            totalOpenCount={openTasks.length}
            todayStr={todayStr}
            onToggleTask={onToggleTask}
            onOpenQuickCapture={onOpenQuickCapture}
          />
        </main>

        {/* Right Column (4 cols): Compact Stacked Habit Sequencer & Schedule */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <HabitCadence
            habits={habits}
            habitLogs={habitLogs}
            todayStr={todayStr}
            onToggleHabit={onToggleHabit}
            onOpenQuickCapture={onOpenQuickCapture}
          />

          <UpcomingAgenda />
        </aside>
      </div>
    </div>
  );
}
