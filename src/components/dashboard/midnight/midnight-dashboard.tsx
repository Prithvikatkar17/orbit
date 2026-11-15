"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog, Event } from "@/lib/schemas";
import {
  calculateLunarPhase,
  getSiderealMeridianPhase,
  getTimeOfDayGreeting,
  numberToWord,
} from "./astronomical-math";
import { ConstellationCadence } from "./constellation-cadence";
import { OrbitalFocus } from "./orbital-focus";
import { MeridianChronicle } from "./meridian-chronicle";

export interface MidnightDashboardProps {
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

export function MidnightDashboard(props: MidnightDashboardProps) {
  const {
    habits,
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

  const displayHabits = activeHabits.length > 0 ? activeHabits : habits;

  // Real Astronomical Calculations based on current time
  const now = useMemo(() => new Date(), []);
  const lunarPhase = useMemo(() => calculateLunarPhase(now), [now]);
  const siderealPhase = useMemo(() => getSiderealMeridianPhase(now.getHours()), [now]);
  const greeting = useMemo(() => getTimeOfDayGreeting(), []);

  // Urgent/Perihelion task count
  const urgentCount = useMemo(() => {
    return openTasks.filter((t) => {
      const isOverdue = t.dueDate && t.dueDate < (now.toISOString().slice(0, 10));
      const isDueToday = t.dueDate && t.dueDate === (now.toISOString().slice(0, 10));
      return isOverdue || isDueToday || t.priority === "high";
    }).length;
  }, [openTasks, now]);

  // Synthetic epoch descriptor
  const epochYear = now.getFullYear();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(epochYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const epochFraction = (dayOfYear / 365).toFixed(1).replace("0.", "");

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* ZONE 1: The Planetarium Zenith Dome & Lunar Astrolabe */}
      <div className="midnight-zenith-hero rounded-[26px] p-7 md:p-9 relative overflow-hidden">
        {/* Inline SVG Horological Astrolabe Orrery & Constellation Backdrop */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 pointer-events-none overflow-hidden select-none opacity-40 md:opacity-80">
          <svg
            className="w-full h-full text-[#d4af37]"
            viewBox="0 0 500 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMaxYMid meet"
          >
            {/* Concentric Astrolabe Degree Circles & Astrological Declination Rings */}
            <circle cx="360" cy="120" r="160" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.4" />
            <circle cx="360" cy="120" r="130" stroke="#d4af37" strokeWidth="1.2" opacity="0.6" />
            <circle cx="360" cy="120" r="100" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.35" />
            <circle cx="360" cy="120" r="70" stroke="#d4af37" strokeWidth="1" strokeDasharray="6 3" opacity="0.5" />
            <circle cx="360" cy="120" r="35" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />

            {/* Astrolabe Axis Crosshairs & Degree Graduation Lines */}
            <line x1="360" y1="0" x2="360" y2="240" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.3" />
            <line x1="200" y1="120" x2="520" y2="120" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.3" />
            <line x1="246" y1="35" x2="474" y2="205" stroke="#d4af37" strokeWidth="0.6" opacity="0.35" />
            <line x1="474" y1="35" x2="246" y2="205" stroke="#d4af37" strokeWidth="0.6" opacity="0.35" />

            {/* Micro Astrolabe Graduation Marks */}
            <circle cx="360" cy="120" r="128" stroke="#d4af37" strokeWidth="4" strokeDasharray="1 11" opacity="0.4" />

            {/* 5-Star Connected Constellation Vector Vector */}
            <path
              d="M 230 60 L 290 85 L 340 50 L 410 75 L 460 45"
              stroke="#818cf8"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.65"
            />
            {/* Constellation Star Nodes */}
            <circle cx="230" cy="60" r="3" fill="#ffffff" />
            <circle cx="290" cy="85" r="2.5" fill="#818cf8" />
            <circle cx="340" cy="50" r="3.5" fill="#eab308" />
            <circle cx="410" cy="75" r="2.5" fill="#ffffff" />
            <circle cx="460" cy="45" r="3" fill="#818cf8" />

            {/* The Real Calculated Lunar Phase Orb at Astrolabe Center */}
            <g transform="translate(360, 120)">
              {/* Lunar Halo */}
              <circle cx="0" cy="0" r="18" fill="#eab308" fillOpacity="0.12" />
              <circle cx="0" cy="0" r="14" stroke="#d4af37" strokeWidth="1.2" fill="#090d1f" />
              {/* Moon Illumination Path */}
              <path
                d="M 0 -13 A 13 13 0 0 1 0 13 A 8 13 0 0 0 0 -13 Z"
                fill="#f59e0b"
                opacity="0.9"
              />
              <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10 space-y-6">
          {/* Top Eyebrow Row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#eab308]">
              {/* Crescent Moon & Star Emblem */}
              <svg className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
                <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.045.136.152.243.288.288l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a.455.455 0 0 0-.288.288l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162a.455.455 0 0 0-.288-.288l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a.455.455 0 0 0 .288-.288l.387-1.162z" />
              </svg>
              <span>
                OBSERVATORY MERIDIAN · {lunarPhase.phaseName.toUpperCase()} (DAY{" "}
                {String(lunarPhase.cycleDay).padStart(2, "0")}) · {siderealPhase}
              </span>
            </div>

            {/* Desktop: Astronomical Chart Code / Mobile: Quick Capture Pill */}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block font-mono text-[10px] tracking-widest text-[#a5b4fc]/70 uppercase">
                {`EPOCH J${epochYear}.${epochFraction} · LOCAL DOME`}
              </span>
              <button
                type="button"
                onClick={onOpenQuickCapture}
                className="md:hidden inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#eab308]/20 border border-[#eab308]/40 text-[#fde047]"
              >
                <Plus className="w-3 h-3" />
                <span>Chart</span>
              </button>
            </div>
          </div>

          {/* Main Greeting & Poetic Celestial Narrative */}
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl font-normal tracking-tight text-[#f8fafc]">
              {greeting}
            </h1>
            <p className="font-serif italic text-base md:text-lg text-[#e0e7ff]/90 leading-relaxed">
              {`${numberToWord(openTasks.length)} orbital bodies in active alignment today, guided by ${numberToWord(displayHabits.length).toLowerCase()} constellation cadences.`}
            </p>
          </div>

          {/* 3 Horological Astrolabe Counters */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Counter 1: In Orbit */}
            <div className="bg-[#0b1026]/80 border border-[#818cf8]/30 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#818cf8]">
                <span className="font-mono text-sm">/</span>
                <span className="font-serif text-2xl font-medium text-[#f8fafc]">
                  {String(openTasks.length).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#a5b4fc] mt-0.5">
                In Orbit
              </div>
            </div>

            {/* Counter 2: Perihelion / Today */}
            <div className="bg-[#b48327]/25 border border-[#eab308]/50 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#fde047]">
                <span className="font-serif text-base">◇</span>
                <span className="font-serif text-2xl font-medium text-[#f8fafc]">
                  {String(urgentCount).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#fde047] mt-0.5 font-semibold">
                Perihelion / Today
              </div>
            </div>

            {/* Counter 3: Constellations */}
            <div className="bg-[#0b1026]/80 border border-[#818cf8]/30 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-[#818cf8]">
                <span className="font-serif text-base">◎</span>
                <span className="font-serif text-2xl font-medium text-[#f8fafc]">
                  {String(displayHabits.length).padStart(2, "0")}
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[#a5b4fc] mt-0.5">
                Constellations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 2: Full-Width 3-Column Living Star Constellations */}
      <ConstellationCadence
        habits={displayHabits}
        habitLogs={habitLogs}
        todayStr={todayStr}
        onToggleHabit={onToggleHabit}
      />

      {/* ZONE 3: Asymmetric Ground Split (Left 8 Cols Orbital Focus & Right 4 Cols Meridian Transit) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left 8 Columns: The Orbital Gravity Stream */}
        <div className="xl:col-span-8">
          <OrbitalFocus
            tasks={openTasks}
            openTasks={openTasks}
            dueTodayTasks={dueTodayTasks}
            focusTasks={focusTasks}
            onToggleTask={onToggleTask}
            onOpenQuickCapture={onOpenQuickCapture}
          />
        </div>

        {/* Right 4 Columns: The Meridian Transit Log */}
        <div className="xl:col-span-4">
          <MeridianChronicle events={events} />
        </div>
      </div>
    </div>
  );
}
