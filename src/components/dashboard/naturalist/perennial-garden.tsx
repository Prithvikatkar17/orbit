"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import {
  parseLocalDate,
  getOffsetDateString,
  calculateStreak,
} from "@/lib/utils/dates";

export interface PerennialGardenProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string | null;
  onToggleHabit: (habitId: string) => Promise<void>;
}

/**
 * Dynamic Living SVG Plant Growth Illustration
 * Renders progressive botanical growth based on the habit's completed days in the past 7 days:
 * 1-2 days: Young seedling sprouting in terracotta pot
 * 3-4 days: Branching fern/eucalyptus stem in deep forest green
 * 5-7 days: Lush blooming botanical branch inside an elegant glass cloche dome with amber nodes
 */
function PlantClocheIllustration({ completedCount }: { completedCount: number }) {
  if (completedCount >= 5) {
    // Lush blooming botanical branch inside an elegant glass cloche
    return (
      <svg
        className="w-12 h-14 text-[#2e593d] dark:text-[#68a87b] shrink-0"
        viewBox="0 0 48 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Lush blooming cloche"
      >
        {/* Glass Cloche Dome */}
        <path
          d="M8 48 C 8 20, 16 6, 24 6 C 32 6, 40 20, 40 48 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.35"
        />
        {/* Cloche Knob */}
        <circle cx="24" cy="5" r="2.5" fill="currentColor" opacity="0.4" />
        {/* Wooden / Limestone Base */}
        <path d="M5 49 H43" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

        {/* Central Blooming Branch */}
        <path d="M24 48 C 24 35, 23 20, 24 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Leaf Fronds */}
        <path d="M24 38 C 16 35, 14 28, 17 24 C 21 28, 23 33, 24 38 Z" fill="currentColor" opacity="0.85" />
        <path d="M24 32 C 32 29, 34 22, 31 18 C 27 22, 25 27, 24 32 Z" fill="currentColor" opacity="0.85" />
        <path d="M24 24 C 18 20, 18 14, 21 11 C 24 14, 24 19, 24 24 Z" fill="currentColor" opacity="0.9" />
        <path d="M24 18 C 30 14, 30 9, 27 6 C 24 9, 24 14, 24 18 Z" fill="currentColor" opacity="0.9" />
        {/* Golden Amber Flower / Pollen Nodes */}
        <circle cx="24" cy="12" r="2.2" fill="#d99b3b" />
        <circle cx="16" cy="24" r="1.6" fill="#d99b3b" />
        <circle cx="32" cy="18" r="1.6" fill="#d99b3b" />
      </svg>
    );
  }

  if (completedCount >= 3) {
    // Branching fern / eucalyptus stem in deep forest green
    return (
      <svg
        className="w-11 h-13 text-[#2e593d] dark:text-[#68a87b] shrink-0"
        viewBox="0 0 44 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Branching fern stem"
      >
        {/* Terracotta Pot */}
        <path d="M14 44 L16 50 H28 L30 44 Z" fill="#b85a3a" opacity="0.8" />
        <rect x="13" y="42" width="18" height="2.5" rx="1" fill="#b85a3a" />

        {/* Stem */}
        <path d="M22 42 C 22 30, 21 20, 22 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Leaves */}
        <path d="M22 35 C 16 33, 14 27, 18 24 C 20 27, 22 31, 22 35 Z" fill="currentColor" opacity="0.8" />
        <path d="M22 28 C 28 26, 30 20, 26 17 C 24 20, 22 24, 22 28 Z" fill="currentColor" opacity="0.8" />
        <path d="M22 20 C 18 16, 18 11, 21 9 C 23 12, 23 16, 22 20 Z" fill="currentColor" opacity="0.9" />
        <circle cx="22" cy="13" r="1.8" fill="#d99b3b" />
      </svg>
    );
  }

  // 0-2 days: Young two-leaf seedling in terracotta pot
  return (
    <svg
      className="w-10 h-12 text-[#2e593d] dark:text-[#68a87b] shrink-0"
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Young seedling"
    >
      {/* Terracotta Pot */}
      <path d="M12 40 L14 46 H26 L28 40 Z" fill="#b85a3a" opacity="0.7" />
      <rect x="11" y="38" width="18" height="2.5" rx="1" fill="#b85a3a" opacity="0.9" />

      {/* Tender Sprout */}
      <path d="M20 38 C 20 30, 20 24, 20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 24 C 14 23, 12 17, 16 15 C 18 18, 20 21, 20 24 Z" fill="currentColor" opacity="0.75" />
      <path d="M20 20 C 26 19, 28 13, 24 11 C 22 14, 20 17, 20 20 Z" fill="currentColor" opacity="0.75" />
      <circle cx="20" cy="19" r="1.5" fill="#d99b3b" />
    </svg>
  );
}

export function PerennialGarden(props: PerennialGardenProps) {
  const { habits, habitLogs, todayStr, onToggleHabit } = props;

  // Generate past 7 days: [today - 6d, ..., today]
  const last7Days = useMemo(() => {
    if (!todayStr) return [];
    const base = parseLocalDate(todayStr);
    const arr: { dateStr: string; dayLetter: string; isToday: boolean }[] = [];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

    for (let i = 6; i >= 0; i--) {
      const dStr = getOffsetDateString(-i, base);
      const dObj = parseLocalDate(dStr);
      const letter = dayNames[dObj.getDay()] || "·";
      arr.push({
        dateStr: dStr,
        dayLetter: letter,
        isToday: i === 0,
      });
    }
    return arr;
  }, [todayStr]);

  // Fast lookup set of completed logs
  const { completedLogSet, logsByHabit } = useMemo(() => {
    const set = new Set<string>();
    const byHabit = new Map<string, string[]>();

    for (const log of habitLogs) {
      if (log.completed) {
        set.add(`${log.habitId}_${log.date}`);
        const existing = byHabit.get(log.habitId) ?? [];
        existing.push(log.date);
        byHabit.set(log.habitId, existing);
      }
    }
    return { completedLogSet: set, logsByHabit: byHabit };
  }, [habitLogs]);

  return (
    <section className="space-y-4">
      {/* Stratum 2 Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-orbit-border">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-orbit-accent tracking-wider uppercase">
            II.
          </span>
          <h2 className="font-display font-medium text-lg tracking-tight text-orbit-text">
            LIVING PERENNIAL TERRARIUMS
          </h2>
        </div>
        <Link
          href="/habits"
          className="text-xs font-mono uppercase tracking-wider text-orbit-text-muted hover:text-orbit-accent inline-flex items-center gap-1 transition-colors group whitespace-nowrap"
        >
          <span>Inspect garden</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 3-Column Terrarium Planter Cards */}
      {habits.length === 0 ? (
        <div className="naturalist-limestone-card p-6 text-center space-y-1">
          <p className="font-display italic text-sm text-orbit-text">
            No perennial vessels planted yet.
          </p>
          <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
            Cultivate a daily botanical rhythm to nurture growth
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {habits.map((habit) => {
            const completedDates = logsByHabit.get(habit.id) || [];
            const streak = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            ).currentStreak;

            // Count completed days in the 7-day window
            const recentCompletedCount = last7Days.filter((d) =>
              completedLogSet.has(`${habit.id}_${d.dateStr}`)
            ).length;

            return (
              <div
                key={habit.id}
                className="naturalist-limestone-card p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 space-y-4 flex flex-col justify-between"
              >
                {/* Top Section: Title + Plant Cloche Illustration */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="inline-block font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2e593d]/10 text-[#2e593d] dark:text-[#68a87b] font-semibold">
                      {streak > 0 ? `${streak} day root system · Thriving` : "Germinating"}
                    </span>
                    <h3 className="text-base sm:text-lg font-medium leading-snug font-display text-orbit-text">
                      {habit.title}
                    </h3>
                  </div>

                  {/* Dynamic Cloche Plant Illustration */}
                  <PlantClocheIllustration completedCount={recentCompletedCount} />
                </div>

                {/* Bottom Section: 7 River-Pebble Stepping Stones */}
                <div className="relative pt-2 pb-1">
                  {/* Winding Vine Line Running Behind Stones */}
                  <div className="absolute top-[20px] left-3 right-3 h-[1.5px] bg-orbit-border/80 -z-0" />

                  {/* 7 Pebble Stepping Stones */}
                  <div className="flex items-center justify-between relative z-10 px-1">
                    {last7Days.map((day) => {
                      const isCompleted = completedLogSet.has(`${habit.id}_${day.dateStr}`);
                      const isToday = day.isToday;

                      return (
                        <div
                          key={day.dateStr}
                          className="flex flex-col items-center gap-1.5"
                        >
                          {/* River-Pebble Interactive Node */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isToday) {
                                onToggleHabit(habit.id);
                              }
                            }}
                            disabled={!isToday}
                            title={`${day.dateStr} (${day.dayLetter}) - ${
                              isCompleted ? "Cultivated" : "Dormant"
                            }${isToday ? " · Click to cultivate" : ""}`}
                            className={`w-7 h-7 rounded-tl-[10px] rounded-br-[10px] rounded-tr-[3px] rounded-bl-[3px] flex items-center justify-center transition-all duration-200 ${
                              isToday ? "cursor-pointer hover:scale-110" : "cursor-default"
                            } ${
                              isCompleted
                                ? "bg-[#2d5a40] text-white shadow-xs"
                                : isToday
                                ? "bg-[#c86446]/10 border-2 border-[#c86446] text-[#c86446]"
                                : "bg-orbit-subtle/70 border border-orbit-border/60 text-orbit-text-muted"
                            }`}
                          >
                            {isCompleted ? (
                              <svg
                                className="w-3.5 h-3.5 text-white"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" />
                              </svg>
                            ) : isToday ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#c86446]" />
                            ) : null}
                          </button>

                          {/* Day Label Underneath Node */}
                          <span
                            className={`font-mono text-[10px] tracking-wider uppercase ${
                              isToday
                                ? "font-bold text-[#c86446]"
                                : "text-orbit-text-muted"
                            }`}
                          >
                            {day.dayLetter}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
