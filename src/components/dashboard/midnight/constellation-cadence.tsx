"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import { parseLocalDate, getOffsetDateString, calculateStreak } from "@/lib/utils/dates";
import { getConstellationForHabit } from "./astronomical-math";

export interface ConstellationCadenceProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string | null;
  onToggleHabit: (habitId: string) => Promise<void>;
}

export function ConstellationCadence(props: ConstellationCadenceProps) {
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

  // Index logs by habitId
  const logsByHabit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of habitLogs) {
      if (log.completed) {
        const arr = map.get(log.habitId) || [];
        arr.push(log.date);
        map.set(log.habitId, arr);
      }
    }
    return map;
  }, [habitLogs]);

  // Completed log lookup set
  const completedLogSet = useMemo(() => {
    const set = new Set<string>();
    for (const log of habitLogs) {
      if (log.completed) {
        set.add(`${log.habitId}_${log.date}`);
      }
    }
    return set;
  }, [habitLogs]);

  return (
    <section className="space-y-4" aria-label="Constellation Cadences">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <span className="font-serif italic text-sm text-[#818cf8] dark:text-[#a5b4fc] font-semibold">
            II.
          </span>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-semibold text-orbit-text">
            LIVING STAR CONSTELLATIONS
          </h2>
        </div>
        <Link
          href="/habits"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-orbit-text-muted hover:text-[#818cf8] dark:hover:text-[#a5b4fc] transition-colors"
        >
          <span>Observatory Archive</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3-Column Living Star Constellation Cards */}
      {habits.length === 0 ? (
        <div className="midnight-observatory-card p-6 text-center space-y-1">
          <p className="font-display italic text-sm text-orbit-text">
            No star constellation paths tracked yet.
          </p>
          <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
            Initiate daily sidereal alignments to chart celestial cadence
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {habits.map((habit, idx) => {
            const completedDates = logsByHabit.get(habit.id) || [];
            const streak = calculateStreak(
              completedDates,
              habit.frequency,
              habit.customDays
            ).currentStreak;
            const constellationName = getConstellationForHabit(idx);

            // Subtle vertical star declination curve heights across the 7 nodes
            const declinationHeights = [20, 14, 24, 16, 22, 12, 18];

            return (
              <div
                key={habit.id}
                className="midnight-observatory-card p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 space-y-5 flex flex-col justify-between"
              >
                {/* Top Section: Title & Constellation Alignment Badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block font-mono text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#818cf8]/30 bg-[#818cf8]/10 text-[#818cf8] dark:text-[#a5b4fc] font-semibold">
                      {streak > 0
                        ? `${streak} night alignment · ${constellationName}`
                        : `Dormant · ${constellationName}`}
                    </span>
                    <span className="font-mono text-[10px] text-orbit-text-muted tracking-widest">
                      {`RA 18h ${idx * 12}m`}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-medium leading-snug font-display text-orbit-text">
                    {habit.title}
                  </h3>
                </div>

                {/* The 7-Day Star Constellation Map */}
                <div className="relative pt-2 pb-1">
                  {/* Inline SVG Constellation Vector Line connecting the 7 star nodes */}
                  <div className="absolute top-[18px] left-4 right-4 h-6 pointer-events-none -z-0">
                    <svg
                      className="w-full h-full text-[#818cf8]/35 dark:text-[#818cf8]/30 overflow-visible"
                      viewBox="0 0 240 24"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      {/* Connected Constellation Vector Line */}
                      <path
                        d="M 10 18 L 47 12 L 85 20 L 122 14 L 160 19 L 197 10 L 230 16"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    </svg>
                  </div>

                  {/* 7 Star Nodes Row */}
                  <div className="flex items-center justify-between relative z-10 px-1">
                    {last7Days.map((day, dIdx) => {
                      const isCompleted = completedLogSet.has(`${habit.id}_${day.dateStr}`);
                      const isToday = day.isToday;

                      return (
                        <div
                          key={day.dateStr}
                          className="flex flex-col items-center gap-1.5"
                          style={{
                            transform: `translateY(${(declinationHeights[dIdx] - 17) * 0.4}px)`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleHabit(habit.id)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                              isCompleted
                                ? "bg-[#4338ca] text-[#f8fafc] border border-[#818cf8] shadow-[0_0_12px_rgba(129,140,248,0.55)]"
                                : isToday
                                ? "border-2 border-[#eab308] bg-[#eab308]/15 text-[#eab308] hover:bg-[#eab308]/25"
                                : "border border-orbit-border/60 bg-orbit-subtle/40 text-orbit-text-muted hover:border-orbit-accent/40"
                            }`}
                            aria-label={`${habit.title} on ${day.dateStr}: ${
                              isCompleted ? "Completed" : "Incomplete"
                            }`}
                          >
                            {isCompleted ? (
                              /* 4-Point Luminous Supernova Star */
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e0e7ff] drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                              >
                                <path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z" />
                              </svg>
                            ) : isToday ? (
                              /* Horological Astrolabe Reticle with Gold Center */
                              <div className="w-2 h-2 rounded-full bg-[#eab308] shadow-[0_0_6px_#eab308]" />
                            ) : (
                              /* Dwarf Star Core */
                              <div className="w-1.5 h-1.5 rounded-full bg-orbit-border/80" />
                            )}
                          </button>

                          {/* Clean single day label underneath */}
                          <span
                            className={`font-mono text-[10px] font-semibold ${
                              isToday
                                ? "text-[#eab308]"
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
