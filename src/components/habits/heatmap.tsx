"use client";

import React, { useRef, useEffect } from "react";
import { getOffsetDateString, parseLocalDate, useTodayDate, formatFriendlyDate } from "@/lib/utils/dates";

interface HeatmapProps {
  completedDates: Set<string>;
  color?: string; // hex color e.g. "#10b981"
  today?: string;
}

export function HabitHeatmap({ completedDates, color = "#10b981", today: propToday }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hookToday = useTodayDate();
  const today = propToday || hookToday;

  // Scroll to the right end (today) on mount or when today is set
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [today]);

  if (!today) {
    return (
      <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/40" />
    );
  }

  // Exact 180 calendar days range: from (today - 179 days) to today inclusive
  const todayDate = parseLocalDate(today);
  const minDateStr = getOffsetDateString(-179, todayDate);

  // Align grid to week boundaries (Sunday to Saturday)
  const currentDayOfWeek = todayDate.getDay(); // 0 (Sun) to 6 (Sat)
  const daysUntilSaturday = 6 - currentDayOfWeek;
  const endDate = parseLocalDate(getOffsetDateString(daysUntilSaturday, todayDate));

  // 26 weeks = 182 days grid slots to ensure full 7-row columns
  const totalWeeks = 26;
  const totalDays = totalWeeks * 7;
  const startDate = parseLocalDate(getOffsetDateString(-(totalDays - 1), endDate));

  // Build grid columns (weeks)
  const weeks: {
    dateStr: string;
    isCompleted: boolean;
    isInRange: boolean;
    isToday: boolean;
  }[][] = [];

  let currentWeek: {
    dateStr: string;
    isCompleted: boolean;
    isInRange: boolean;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < totalDays; i++) {
    const curDateStr = getOffsetDateString(i, startDate);
    const isInRange = curDateStr >= minDateStr && curDateStr <= today;
    const isCompleted = isInRange && completedDates.has(curDateStr);
    const isToday = curDateStr === today;

    currentWeek.push({
      dateStr: curDateStr,
      isCompleted,
      isInRange,
      isToday,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
        <span>Last 180 Days</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="h-2.5 w-2.5 rounded-[3px] bg-slate-100 dark:bg-slate-800" />
          <div
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: color }}
          />
          <span>More</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
      >
        <div className="inline-flex gap-1.5 py-1">
          {/* Day of week labels */}
          <div className="grid grid-rows-7 gap-1 text-[9px] font-semibold text-slate-400 select-none pr-1">
            {dayLabels.map((label, idx) => (
              <div key={idx} className="flex h-3 w-3 items-center justify-center">
                {idx % 2 === 1 ? label : ""}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-rows-7 gap-1">
              {week.map((day) => {
                if (!day.isInRange) {
                  return (
                    <div
                      key={day.dateStr}
                      className="h-3 w-3 rounded-[3px] bg-transparent opacity-0 pointer-events-none"
                    />
                  );
                }

                const friendlyLabel = formatFriendlyDate(day.dateStr);

                return (
                  <div
                    key={day.dateStr}
                    title={`${friendlyLabel} (${day.dateStr}): ${
                      day.isCompleted ? "Completed" : "Not logged"
                    }`}
                    style={
                      day.isCompleted
                        ? { backgroundColor: color }
                        : undefined
                    }
                    className={`h-3 w-3 rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${
                      day.isCompleted
                        ? "shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700"
                    } ${
                      day.isToday
                        ? "ring-1 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
