"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog, Event } from "@/lib/schemas";
import { PerennialGarden } from "./perennial-garden";
import { HerbariumSpecimens } from "./herbarium-specimens";
import { SolarHorizon } from "./solar-horizon";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";

export interface NaturalistDashboardProps {
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

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getSolarPhase(hour: number): string {
  if (hour < 11) return "MORNING KOMOREBI";
  if (hour < 17) return "HIGH CANOPY SUN";
  return "TWILIGHT CONSERVATORY";
}

function getSeasonCycle(month: number): string {
  if (month >= 2 && month <= 4) return "SPRING EQUINOX CYCLE";
  if (month >= 5 && month <= 7) return "SUMMER SOLSTICE CYCLE";
  if (month >= 8 && month <= 10) return "AUTUMN EQUINOX CYCLE";
  return "WINTER SOLSTICE CYCLE";
}

function numberToWord(n: number): string {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
  ];
  return words[n] || String(n);
}

export function NaturalistDashboard(props: NaturalistDashboardProps) {
  const {
    events,
    activeHabits,
    habitLogs,
    openTasks,
    dueTodayTasks,
    focusTasks,
    todayStr,
    onToggleTask,
    onToggleHabit,
    onOpenQuickCapture,
  } = props;

  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();

  const greeting = getTimeOfDayGreeting();
  const solarPhase = useMemo(() => getSolarPhase(hour), [hour]);
  const seasonCycle = useMemo(() => getSeasonCycle(month), [month]);

  // Compute position of glowing golden sun along the solar celestial arc
  // Hour mapped from 6:00 to 20:00 [0..1]
  const sunPosition = useMemo(() => {
    const clampedHour = Math.min(20, Math.max(6, hour));
    const ratio = (clampedHour - 6) / 14;
    // Parabolic arc spanning viewBox width 100 to 360, height 20 to 80
    const cx = Math.round(110 + 240 * ratio);
    const cy = Math.round(75 - 55 * Math.sin(ratio * Math.PI));
    return { cx, cy };
  }, [hour]);

  // Urgent count = overdue + due today + high priority
  const urgentCount = useMemo(() => {
    return openTasks.filter(
      (t) =>
        (t.dueDate && todayStr && t.dueDate < todayStr) ||
        (t.dueDate && todayStr && t.dueDate === todayStr) ||
        t.priority === "high"
    ).length;
  }, [openTasks, todayStr]);

  // Dynamic poetic ecosystem narrative
  const ecosystemNarrative = useMemo(() => {
    const taskWord = numberToWord(openTasks.length);
    const habitWord = numberToWord(activeHabits.length).toLowerCase();
    const taskPlural = openTasks.length === 1 ? "specimen" : "specimens";
    const habitPlural = activeHabits.length === 1 ? "habit vessel" : "habit vessels";

    return `${taskWord} field ${taskPlural} thriving in the terraced courtyard, anchored by ${habitWord} daily perennial ${habitPlural}.`;
  }, [openTasks.length, activeHabits.length]);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      <LegacyMigrationBanner />
      {/* STRATUM 1: The Lush Conservatory Panorama & Solar Arc Pavilion */}
      <div className="naturalist-canopy-hero rounded-[28px] p-7 md:p-9 relative overflow-hidden">
        {/* Panoramic SVG Landscape Backdrop with Mountain Contours & Golden Solar Arc */}
        <svg
          className="absolute right-0 bottom-0 w-full max-w-2xl h-64 md:h-72 pointer-events-none select-none opacity-40 text-[#a3d4b2]"
          viewBox="0 0 400 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Topographic Hill & Mountain Contours */}
          <path
            d="M80 160 C 140 100, 210 130, 270 95 C 330 65, 370 110, 400 90 L400 160 Z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M160 160 C 210 115, 280 145, 340 120 C 370 105, 390 125, 400 115 L400 160 Z"
            fill="currentColor"
            opacity="0.25"
          />

          {/* Golden Celestial Solar Arc */}
          <path
            d="M 100 80 Q 230 15 360 80"
            stroke="#eab664"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Glowing Golden Amber Sun Orb along Arc */}
          <circle cx={sunPosition.cx} cy={sunPosition.cy} r="12" fill="#eab664" opacity="0.25" />
          <circle cx={sunPosition.cx} cy={sunPosition.cy} r="6.5" fill="#eab664" />
          <circle cx={sunPosition.cx} cy={sunPosition.cy} r="3" fill="#fffdfa" />

          {/* Botanical Fern Fronds Rising from Base */}
          <path
            d="M 280 160 C 295 130, 310 90, 345 50"
            stroke="#a3d4b2"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path d="M 310 125 C 300 115, 312 105, 325 118" stroke="#a3d4b2" strokeWidth="1.4" opacity="0.4" />
          <path d="M 322 105 C 335 95, 345 108, 332 115" stroke="#a3d4b2" strokeWidth="1.4" opacity="0.4" />
          <path d="M 330 85 C 320 72, 332 65, 345 78" stroke="#a3d4b2" strokeWidth="1.4" opacity="0.4" />
        </svg>

        {/* Top Eyebrow Row */}
        <div className="flex items-center justify-between pb-5 border-b border-[#a3d4b2]/20 relative z-10 text-xs">
          {/* Elevation & Solar Eyebrow */}
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-[#eab664]">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="3.5" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
            </svg>
            <span>
              34°N CONSERVATORY · {seasonCycle} · {solarPhase}
            </span>
          </div>

          {/* Mobile + Collect button */}
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="lg:hidden flex items-center gap-1 px-3 py-1 bg-[#eab664] text-[#1b3826] rounded-full text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#d99b3b] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Collect</span>
          </button>
        </div>

        {/* Main Banner Split */}
        <div className="pt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          {/* Left Greeting & Ecosystem Poetry */}
          <div className="space-y-3 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-serif font-normal tracking-tight text-[#f7f4ec]">
              {greeting}
            </h1>
            <p className="font-serif italic text-base md:text-lg text-[#d8e8dc] leading-relaxed">
              {ecosystemNarrative}
            </p>
          </div>

          {/* Right: Botanical Ecosystem Pill Strip */}
          <div className="flex items-center flex-wrap gap-3 shrink-0">
            {/* Pill 1: Cultivating */}
            <div className="bg-[#122b1c]/80 border border-[#a3d4b2]/25 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#a3d4b2]">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 14 C 4 9, 8 7, 14 2" />
                  <path d="M8 7 C 9 4, 12 3, 14 2" />
                </svg>
                <span className="font-serif text-2xl font-medium text-[#f7f4ec]">
                  {String(openTasks.length).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#a3d4b2] mt-0.5">
                Cultivating
              </div>
            </div>

            {/* Pill 2: Ripe / Urgent */}
            <div className="bg-[#b85a3a]/30 border border-[#b85a3a]/60 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#f5c6a5]">
                <svg className="w-4 h-4 text-[#eab664]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="4" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
                </svg>
                <span className="font-serif text-2xl font-medium text-[#f7f4ec]">
                  {String(urgentCount).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#f5c6a5] mt-0.5 font-semibold">
                Ripe / Today
              </div>
            </div>

            {/* Pill 3: Perennials */}
            <div className="bg-[#122b1c]/80 border border-[#a3d4b2]/25 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#a3d4b2]">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="8" r="7" />
                  <circle cx="8" cy="8" r="4.5" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
                <span className="font-serif text-2xl font-medium text-[#f7f4ec]">
                  {String(activeHabits.length).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#a3d4b2] mt-0.5">
                Perennials
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STRATUM 2: Full-Width Living Terrarium Vessels (3-Column Planters across all 12 cols) */}
      <PerennialGarden
        habits={activeHabits}
        habitLogs={habitLogs}
        todayStr={todayStr}
        onToggleHabit={onToggleHabit}
      />

      {/* STRATUM 3: Asymmetric Earth-Material Courtyard (Left 8 Cols) & Winding Trail (Right 4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left 8 Columns: The Terraced Earth Courtyard */}
        <div className="xl:col-span-8">
          <HerbariumSpecimens
            openTasks={openTasks}
            dueTodayTasks={dueTodayTasks}
            focusTasks={focusTasks}
            todayStr={todayStr}
            onToggleTask={onToggleTask}
          />
        </div>

        {/* Right 4 Columns: The Winding Trail Chronicle */}
        <div className="xl:col-span-4">
          <SolarHorizon events={events} todayStr={todayStr} />
        </div>
      </div>
    </div>
  );
}
