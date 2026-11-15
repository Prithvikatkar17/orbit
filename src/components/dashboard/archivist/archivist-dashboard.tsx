"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog, Event } from "@/lib/schemas";
import {
  getDayOfYear,
  getTimeOfDayGreeting,
  numberToWord,
} from "./archival-math";
import { LectionaryCadence } from "./lectionary-cadence";
import { ManuscriptFocus } from "./manuscript-focus";
import { AnnalsChronicle } from "./annals-chronicle";

export interface ArchivistDashboardProps {
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

export function ArchivistDashboard(props: ArchivistDashboardProps) {
  const {
    events,
    activeHabits,
    habits,
    habitLogs,
    openTasks,
    dueTodayTasks,
    overdueCount,
    todayStr,
    onToggleTask,
    onToggleHabit,
    onOpenQuickCapture,
  } = props;

  const displayHabits = activeHabits.length > 0 ? activeHabits : habits;

  const now = useMemo(() => new Date(), []);
  const dayOfYear = useMemo(() => getDayOfYear(now), [now]);
  const greeting = useMemo(() => getTimeOfDayGreeting(now), [now]);
  const dueTotal = overdueCount + dueTodayTasks.length;

  return (
    <div className="space-y-8 pb-16">
      {/* =========================================================================
          ZONE 1: The Bound Collector's Tome & Ex-Libris Header
          ========================================================================= */}
      <section className="archivist-folio-hero rounded-[18px] p-7 md:p-9 relative overflow-hidden">
        {/* Inset Brass Double-Rule Frame */}
        <div className="absolute inset-3 md:inset-4 border border-[rgba(197,160,89,0.35)] rounded-[14px] pointer-events-none z-10">
          {/* Top-Left Corner Filigree */}
          <svg
            className="absolute top-1.5 left-1.5 text-[#dfc07a]/60"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1V14C1 14 3 6 8 6C13 6 14 1 14 1H1Z"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
          </svg>

          {/* Top-Right Corner Filigree */}
          <svg
            className="absolute top-1.5 right-1.5 text-[#dfc07a]/60"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M27 1V14C27 14 25 6 20 6C15 6 14 1 14 1H27Z"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="24" cy="4" r="1.5" fill="currentColor" />
          </svg>

          {/* Bottom-Left Corner Filigree */}
          <svg
            className="absolute bottom-1.5 left-1.5 text-[#dfc07a]/60"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 27V14C1 14 3 22 8 22C13 22 14 27 14 27H1Z"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="4" cy="24" r="1.5" fill="currentColor" />
          </svg>

          {/* Bottom-Right Corner Filigree */}
          <svg
            className="absolute bottom-1.5 right-1.5 text-[#dfc07a]/60"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M27 27V14C27 14 25 22 20 22C15 22 14 27 14 27H27Z"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="24" cy="24" r="1.5" fill="currentColor" />
          </svg>
        </div>

        {/* Intricate Inline SVG Circular Ex-Libris / Bodleian Rose Compass Seal in Background */}
        <div className="absolute -right-10 md:right-8 top-1/2 -translate-y-1/2 w-64 h-64 md:w-84 md:h-84 pointer-events-none opacity-20 md:opacity-28 text-[#dfc07a]">
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 4" />
            <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="12" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.1" />

            {/* 8-Point Compass / Rose Petals */}
            <path d="M100 20 L104 68 L100 88 L96 68 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.5" />
            <path d="M100 180 L104 132 L100 112 L96 132 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.5" />
            <path d="M20 100 L68 96 L88 100 L68 104 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.5" />
            <path d="M180 100 L132 96 L112 100 L132 104 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.5" />

            <path d="M43 43 L78 68 L88 88 L68 78 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.5" />
            <path d="M157 43 L122 68 L112 88 L132 78 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.5" />
            <path d="M43 157 L78 132 L88 112 L68 122 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.5" />
            <path d="M157 157 L122 132 L112 112 L132 122 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.5" />

            {/* Fleurons on Cardinal Axes */}
            <circle cx="100" cy="35" r="2.5" fill="currentColor" />
            <circle cx="100" cy="165" r="2.5" fill="currentColor" />
            <circle cx="35" cy="100" r="2.5" fill="currentColor" />
            <circle cx="165" cy="100" r="2.5" fill="currentColor" />
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-20 space-y-6">
          {/* Top Eyebrow Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#dfc07a] text-xs font-mono font-semibold tracking-widest uppercase">
                EX LIBRIS ORBIT · CODEX VOL. XXVI · FOLIO NO. {String(dayOfYear).padStart(3, "0")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-[#dfc07a]/80 text-[11px] font-mono tracking-widest uppercase border border-[rgba(223,192,122,0.3)] px-2.5 py-0.5 rounded-sm bg-[#163024]/40">
                CURATORIAL ARCHIVE · RARE MANUSCRIPT ROOM
              </span>

              {/* Mobile + Inscribe Button */}
              <button
                type="button"
                onClick={onOpenQuickCapture}
                className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-[#dfc07a] text-[#163024] font-semibold shadow-xs hover:bg-amber-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inscribe</span>
              </button>
            </div>
          </div>

          {/* Main Tome Split: Left Greeting + Right Brass Cabinet Plates */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pt-2">
            {/* Left: Sweeping Newsreader Greeting & Narrative */}
            <div className="lg:col-span-7 space-y-2">
              <h1 className="text-4xl md:text-5xl font-serif text-[#f9f5eb] tracking-tight leading-tight flex items-center gap-3">
                <span>{greeting}</span>
                <span className="text-[#dfc07a] text-3xl font-serif">❦</span>
              </h1>
              <p className="text-base md:text-lg font-serif italic text-[#dfc07a]/90 leading-relaxed max-w-xl">
                {numberToWord(openTasks.length)} unbound folios await your curation today, accompanied by {numberToWord(displayHabits.length)} daily lectionary seals.
              </p>
            </div>

            {/* Right: 3 Screwed-on Brass Label Plates */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              {/* Plate 1: Total Folios */}
              <div className="bg-[#16291e] dark:bg-[#121814] border border-[rgba(212,175,85,0.4)] rounded-md px-3 py-2.5 relative shadow-inner text-center">
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 right-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 right-1.5" />

                <div className="text-xl font-serif font-bold text-[#f9f5eb]">
                  {String(openTasks.length).padStart(2, "0")}
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#dfc07a] uppercase mt-0.5">
                  FOLIOS
                </div>
              </div>

              {/* Plate 2: Rubric Due */}
              <div className="bg-[#2a1b18] dark:bg-[#201412] border border-[rgba(212,175,85,0.4)] rounded-md px-3 py-2.5 relative shadow-inner text-center">
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 right-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 right-1.5" />

                <div className="text-xl font-serif font-bold text-[#f87171]">
                  {String(dueTotal).padStart(2, "0")}
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#dfc07a] uppercase mt-0.5">
                  RUBRIC / DUE
                </div>
              </div>

              {/* Plate 3: Active Lectionary */}
              <div className="bg-[#16291e] dark:bg-[#121814] border border-[rgba(212,175,85,0.4)] rounded-md px-3 py-2.5 relative shadow-inner text-center">
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute top-1.5 right-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 left-1.5" />
                <span className="w-1 h-1 rounded-full bg-[#dfc07a]/50 absolute bottom-1.5 right-1.5" />

                <div className="text-xl font-serif font-bold text-[#f9f5eb]">
                  {String(displayHabits.length).padStart(2, "0")}
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#dfc07a] uppercase mt-0.5">
                  LECTIONARY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZONE 2: Full-Width 3-Column Silk Bookmark & Wax Seal Lectionary
          ========================================================================= */}
      <LectionaryCadence
        habits={habits}
        activeHabits={activeHabits}
        habitLogs={habitLogs}
        todayStr={todayStr}
        onToggleHabit={onToggleHabit}
      />

      {/* =========================================================================
          ZONE 3: Illuminated Rubric Folio & Catalog Drawer (8 cols)
                  + Chronological Annals (4 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8">
          <ManuscriptFocus
            openTasks={openTasks}
            dueTodayTasks={dueTodayTasks}
            onToggleTask={onToggleTask}
          />
        </div>
        <div className="xl:col-span-4">
          <AnnalsChronicle events={events} />
        </div>
      </div>
    </div>
  );
}
