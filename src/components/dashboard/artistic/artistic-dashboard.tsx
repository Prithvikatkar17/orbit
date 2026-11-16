"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, Habit, HabitLog, Event } from "@/lib/schemas";
import { StudioPinboard } from "./studio-pinboard";
import { BauhausCadence } from "./bauhaus-cadence";
import { AtelierSchedule } from "./atelier-schedule";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { useMounted, parseLocalDate } from "@/lib/utils/dates";

export interface ArtisticDashboardProps {
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

function getSeasonName(month: number): string {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function formatCountWord(count: number, singular: string, plural: string): string {
  if (count === 0) return `no ${plural}`;
  const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const word = count < numberWords.length ? numberWords[count] : String(count);
  return `${word} ${count === 1 ? singular : plural}`;
}

export function ArtisticDashboard({
  habitLogs,
  events,
  activeHabits,
  openTasks,
  todayStr,
  onToggleTask,
  onToggleHabit,
  onOpenQuickCapture,
}: ArtisticDashboardProps) {
  const mounted = useMounted();

  const dateObj = useMemo(() => {
    return todayStr ? parseLocalDate(todayStr) : new Date();
  }, [todayStr]);

  const monthNumber = dateObj.getMonth();
  const season = getSeasonName(monthNumber);

  const formattedDate = mounted
    ? dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    : "";

  const greeting = mounted ? getTimeOfDayGreeting() : "Welcome";

  const narrativeSubtitle = useMemo(() => {
    if (!mounted) return "The studio is in motion.";
    const taskPhrase = formatCountWord(openTasks.length, "creative work", "creative works");
    const habitPhrase = formatCountWord(activeHabits.length, "studio ritual", "studio rituals");
    if (openTasks.length === 0 && activeHabits.length === 0) {
      return "The canvas is clear and open. Ready for your next study.";
    }
    return `${taskPhrase.charAt(0).toUpperCase() + taskPhrase.slice(1)} on the easel today, with ${habitPhrase} in motion.`;
  }, [mounted, openTasks.length, activeHabits.length]);

  return (
    <div className="space-y-8 pb-16 max-w-full">
      {/* Optional migration alert */}
      <LegacyMigrationBanner />

      {/* The Chromatic Hero Canvas Banner */}
      <section className="relative rounded-[28px] p-6 sm:p-8 md:p-10 overflow-hidden border border-orbit-border bg-orbit-surface shadow-[0_16px_40px_-12px_rgba(120,70,140,0.12),0_4px_16px_-2px_rgba(230,100,80,0.06)]">
        {/* Layered Multi-Stop Watercolor Wash (Zero GPU Tax, Pure CSS Gradients) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 12% 18%, rgba(79, 70, 229, 0.14), transparent 70%), radial-gradient(ellipse 55% 50% at 85% 20%, rgba(236, 72, 153, 0.16), transparent 65%), radial-gradient(ellipse 60% 60% at 50% 90%, rgba(251, 146, 60, 0.13), rgba(251, 191, 36, 0.08), transparent 70%)",
          }}
        />

        {/* Floating Matisse Cutout Botanical & Abstract Shapes */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 w-72 md:w-96 h-72 md:h-96 opacity-25 dark:opacity-20 text-[#ec4899] select-none"
        >
          <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full">
            {/* Matisse Seaweed / Coral Cutout Leaf 1 */}
            <path d="M120,20 C140,10 160,25 155,45 C150,60 170,75 165,95 C160,115 135,110 130,125 C125,140 145,160 130,175 C115,190 95,175 90,155 C85,135 65,145 55,130 C45,115 65,95 70,80 C75,65 50,55 60,35 C70,15 95,35 105,25 Z" />
            {/* Organic Floating Droplet / Mineral Pebble */}
            <path
              d="M175,130 C190,135 195,155 185,170 C175,185 155,180 145,165 C135,150 160,125 175,130 Z"
              fill="#fb923c"
              opacity="0.75"
            />
            {/* Floating Cutout Star Burst */}
            <path
              d="M30,85 C40,82 45,72 45,62 C50,72 60,78 68,75 C60,82 62,94 58,102 C52,94 40,95 30,85 Z"
              fill="#818cf8"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* Content Lockup */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Poetic Date & Studio Season */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-sans tracking-wide text-orbit-text-secondary">
              <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-tr from-[#e11d48] to-[#818cf8]" />
              <span className="font-medium">{formattedDate}</span>
              <span className="text-orbit-border-strong font-light">·</span>
              <span className="italic font-serif text-orbit-accent">{season} Studio</span>
            </div>

            {/* Sweeping Newsreader Greeting & Painted Brushstroke */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic text-orbit-text tracking-tight font-normal">
                {greeting}
              </h1>

              {/* Hand-Drawn Brushstroke Flourish */}
              <svg
                aria-hidden
                viewBox="0 0 260 14"
                fill="none"
                className="w-48 sm:w-64 h-3 sm:h-3.5"
              >
                <defs>
                  <linearGradient id="brushstroke-artistic" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="80%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path
                  d="M2,8 C40,3 90,11 140,5 C185,-0.5 220,10 258,6 C230,11 180,7 130,12 C80,16 35,9 2,8 Z"
                  fill="url(#brushstroke-artistic)"
                  opacity="0.85"
                />
              </svg>
            </div>

            {/* Expressive Narrative Subtitle */}
            <p className="text-sm sm:text-base text-orbit-text-secondary font-sans leading-relaxed pt-1">
              {narrativeSubtitle}
            </p>
          </div>

          {/* Right Floating Color Palette Pill & New Canvas Trigger */}
          <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-0">
            {/* Color Swatch Palette Pill */}
            <div
              className="flex items-center -space-x-2.5 p-1.5 px-3 rounded-full bg-orbit-surface/80 border border-orbit-border shadow-xs backdrop-blur-none"
              title="Studio Palette: Ultramarine, Magenta Rose, Warm Peach, Golden Amber"
            >
              <span className="w-5 h-5 rounded-full bg-[#4f46e5] border border-white/80 shadow-xs" />
              <span className="w-5 h-5 rounded-full bg-[#ec4899] border border-white/80 shadow-xs" />
              <span className="w-5 h-5 rounded-full bg-[#fb923c] border border-white/80 shadow-xs" />
              <span className="w-5 h-5 rounded-full bg-[#fbbd23] border border-white/80 shadow-xs" />
            </div>

            {/* Gradient Pill Button: + New Canvas */}
            <button
              type="button"
              onClick={onOpenQuickCapture}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-sans font-medium text-white bg-gradient-to-r from-[#e11d48] via-[#ec4899] to-[#6366f1] shadow-[0_8px_20px_-4px_rgba(225,29,72,0.35)] hover:shadow-[0_12px_28px_-6px_rgba(225,29,72,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
              <span>New Canvas</span>
            </button>
          </div>
        </div>
      </section>

      {/* Asymmetric Atelier Workshop: Left 7 Cols (Works on the Easel) & Right 5 Cols (Rituals & Critique) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Lower Left (7 Cols): Studio Pinboard / Works on the Easel */}
        <div className="xl:col-span-7 space-y-6">
          <StudioPinboard
            tasks={openTasks}
            todayStr={todayStr}
            onToggleTask={onToggleTask}
            onOpenQuickCapture={onOpenQuickCapture}
          />
        </div>

        {/* Lower Right (5 Cols): Daily Color Rituals & Studio Hours */}
        <div className="xl:col-span-5 space-y-8">
          <BauhausCadence
            habits={activeHabits}
            habitLogs={habitLogs}
            todayStr={todayStr}
            onToggleHabit={onToggleHabit}
            onOpenQuickCapture={onOpenQuickCapture}
          />

          <AtelierSchedule events={events} todayStr={todayStr} />
        </div>
      </div>
    </div>
  );
}
