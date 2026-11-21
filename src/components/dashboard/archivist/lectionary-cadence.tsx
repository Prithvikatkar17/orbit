"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/schemas";
import { calculateStreak, parseLocalDate, getOffsetDateString } from "@/lib/utils/dates";
import { toRomanNumeral } from "./archival-math";

export interface LectionaryCadenceProps {
  habits: Habit[];
  activeHabits: Habit[];
  habitLogs: HabitLog[];
  todayStr: string | null;
  onToggleHabit: (habitId: string, dateStr?: string) => Promise<void>;
}

const RIBBON_COLORS = [
  { fill: "#8c2d38", stroke: "#dfc07a", name: "Oxblood Crimson" },
  { fill: "#1b4332", stroke: "#b08938", name: "Oxford Hunter Green" },
  { fill: "#b08938", stroke: "#fdfaf3", name: "Antique Brass Gold" },
];

export function LectionaryCadence({
  habits,
  activeHabits,
  habitLogs,
  todayStr,
  onToggleHabit,
}: LectionaryCadenceProps) {
  const displayHabits = activeHabits.length > 0 ? activeHabits : habits;

  // Build the 7-day past week window ending on today (UTC-safe local date math)
  const weekDays = React.useMemo(() => {
    const days: { dateStr: string; label: string; isToday: boolean }[] = [];
    const base = todayStr ? parseLocalDate(todayStr) : new Date();
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    for (let i = 6; i >= 0; i--) {
      const dateStr = getOffsetDateString(-i, base);
      const d = parseLocalDate(dateStr);
      days.push({
        dateStr,
        label: dayLabels[d.getDay()],
        isToday: i === 0,
      });
    }
    return days;
  }, [todayStr]);

  const logsByHabit = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of habitLogs) {
      if (log.completed) {
        const list = map.get(log.habitId) || [];
        list.push(log.date);
        map.set(log.habitId, list);
      }
    }
    return map;
  }, [habitLogs]);

  const completedMap = React.useMemo(() => {
    const map = new Set<string>();
    habitLogs.forEach((log) => {
      if (log.completed) {
        map.add(`${log.habitId}::${log.date}`);
      }
    });
    return map;
  }, [habitLogs]);

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold tracking-widest text-[#8c2d38] dark:text-[#c94a58] uppercase">
            I. Daily Lectionary & Habit Seals
          </span>
          <span className="text-[11px] font-serif italic text-stone-600 dark:text-stone-400">
            — Circadian Inscriptions
          </span>
        </div>
        <Link
          href="/habits"
          className="group inline-flex items-center gap-1 text-xs font-mono tracking-wider text-stone-600 dark:text-stone-400 hover:text-[#1b4332] dark:hover:text-[#52b788] transition-colors"
        >
          <span>Inspect Codex</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* 3-Column Habit Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {displayHabits.slice(0, 3).map((habit, idx) => {
          const completedDates = logsByHabit.get(habit.id) || [];
          const streak = calculateStreak(
            completedDates,
            habit.frequency,
            habit.customDays
          ).currentStreak;
          const ribbon = RIBBON_COLORS[idx % RIBBON_COLORS.length];

          return (
            <div
              key={habit.id}
              className="archivist-catalog-card rounded-[14px] p-5 relative overflow-hidden flex flex-col justify-between min-h-[175px]"
            >
              {/* Hanging Silk Bookmark Ribbon */}
              <div
                className="absolute -top-1 right-6 pointer-events-none drop-shadow-md z-10"
                title={`${ribbon.name} Silk Bookmark`}
              >
                <svg
                  width="26"
                  height="46"
                  viewBox="0 0 26 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 0H26V44L13 36L0 44V0Z"
                    fill={ribbon.fill}
                  />
                  {/* Subtle woven stitching border */}
                  <path
                    d="M3 0V39.5L13 33.5L23 39.5V0"
                    stroke={ribbon.stroke}
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                    opacity="0.65"
                  />
                  <line
                    x1="13"
                    y1="2"
                    x2="13"
                    y2="33"
                    stroke={ribbon.stroke}
                    strokeWidth="0.6"
                    opacity="0.3"
                  />
                </svg>
              </div>

              {/* Top Habit Title & Metadata */}
              <div className="pr-12">
                <span className="text-[10px] font-mono tracking-widest text-stone-600 dark:text-stone-400 uppercase block mb-1">
                  LECTIONARY {toRomanNumeral(idx + 1)} · {habit.frequency.toUpperCase()}
                </span>
                <h3 className="text-lg font-serif font-medium leading-snug text-stone-900 dark:text-stone-100">
                  {habit.title}
                </h3>
                <p className="text-xs font-serif italic text-stone-600 dark:text-stone-400 mt-1">
                  {streak > 0
                    ? `${streak} day continuous inscription · Folio ${toRomanNumeral(idx + 1)}`
                    : "Awaiting today's inscription seal"}
                </p>
              </div>

              {/* Bottom: 7-Day Wax Seal & Signet Matrix */}
              <div className="mt-5 pt-3 border-t border-stone-200/80 dark:border-stone-800">
                <div className="relative flex items-center justify-between">
                  {/* Background double-ruled ink line */}
                  <div className="absolute left-2 right-2 top-4 -translate-y-1/2 h-[3px] border-t border-b border-stone-300 dark:border-stone-700 pointer-events-none z-0 opacity-70" />

                  {weekDays.map((d) => {
                    const isDone = completedMap.has(`${habit.id}::${d.dateStr}`);

                    return (
                      <div
                        key={d.dateStr}
                        className="flex flex-col items-center relative z-10"
                      >
                        {d.isToday ? (
                          // Today's Target: Clickable Stamped Seal if completed, or Brass Signet Ring if pending
                          <button
                            type="button"
                            onClick={() => onToggleHabit(habit.id, d.dateStr)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                              isDone
                                ? "bg-[#8c2d38] text-[#f9f5eb] shadow-sm ring-1 ring-inset ring-amber-300/40"
                                : "border-2 border-[#b08938] dark:border-[#dfc07a] bg-amber-500/10 hover:bg-amber-500/20 shadow-xs"
                            }`}
                            title={isDone ? "Seal affixed for today" : "Affix wax seal for today"}
                          >
                            {isDone ? (
                              // Embossed Fleur-de-lis / Seal Mark
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="text-amber-200"
                              >
                                <path d="M12 2C12.5 5 14 7 16 8C14.5 9 13.5 10.5 13 12C14 12 16 11.5 18 10C17 12 17 14 15 15.5C14 14.5 13 14 12 14C11 14 10 14.5 9 15.5C7 14 7 12 6 10C8 11.5 10 12 11 12C10.5 10.5 9.5 9 8 8C10 7 11.5 5 12 2ZM12 16C12.5 18 13.5 20 15 22H9C10.5 20 11.5 18 12 16Z" />
                              </svg>
                            ) : (
                              // Brass Signet Center Nib Dot
                              <span className="w-2 h-2 rounded-full bg-[#b08938] dark:bg-[#dfc07a]" />
                            )}
                          </button>
                        ) : isDone ? (
                          // Past Completed Day: Circular Stamped Wax Seal in Oxblood
                          <div
                            className="w-8 h-8 rounded-full bg-[#8c2d38] dark:bg-[#8c2d38] text-[#f9f5eb] flex items-center justify-center shadow-xs ring-1 ring-inset ring-amber-300/30"
                            title={`Completed on ${d.dateStr}`}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="text-amber-200"
                            >
                              <path d="M12 2C12.5 5 14 7 16 8C14.5 9 13.5 10.5 13 12C14 12 16 11.5 18 10C17 12 17 14 15 15.5C14 14.5 13 14 12 14C11 14 10 14.5 9 15.5C7 14 7 12 6 10C8 11.5 10 12 11 12C10.5 10.5 9.5 9 8 8C10 7 11.5 5 12 2ZM12 16C12.5 18 13.5 20 15 22H9C10.5 20 11.5 18 12 16Z" />
                            </svg>
                          </div>
                        ) : (
                          // Past Uncompleted Day: Hollow Parchment Ring
                          <div
                            className="w-7 h-7 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-900/60 flex items-center justify-center"
                            title={`No seal on ${d.dateStr}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                          </div>
                        )}

                        {/* Clean Day Label underneath (zero letters inside seals) */}
                        <span
                          className={`text-[11px] font-mono tracking-wider mt-1.5 ${
                            d.isToday
                              ? "font-bold text-[#8c2d38] dark:text-[#dfc07a]"
                              : "text-stone-600 dark:text-stone-400"
                          }`}
                        >
                          {d.label}
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
    </section>
  );
}
