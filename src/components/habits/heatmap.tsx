"use client";

import React, { useRef, useEffect, useState } from "react";
import { getOffsetDateString, parseLocalDate, useTodayDate, formatFriendlyDate } from "@/lib/utils/dates";

interface HeatmapProps {
  completedDates: Set<string>;
  color?: string; // hex color e.g. "#10b981"
  today?: string;
}

export function HabitHeatmap({ completedDates, color = "#10b981", today: propToday }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const hookToday = useTodayDate();
  const today = propToday || hookToday;

  // Scroll to the right end (today) when full 180-day view is opened or today updates
  useEffect(() => {
    if (expanded && containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [today, expanded]);

  if (!today) {
    return (
      <div className="h-20 w-full animate-pulse rounded-orbit-control bg-orbit-surface-secondary" />
    );
  }

  const todayDate = parseLocalDate(today);

  // Compact 28-day recent activity strip (fits container cleanly with zero horizontal scroll)
  const recentDays = Array.from({ length: 28 }, (_, idx) => {
    const dateStr = getOffsetDateString(idx - 27, todayDate);
    return {
      dateStr,
      isCompleted: completedDates.has(dateStr),
      isToday: dateStr === today,
    };
  });

  // Full 180 calendar days range: from (today - 179 days) to today inclusive
  const minDateStr = getOffsetDateString(-179, todayDate);

  // Align grid to week boundaries (Sunday to Saturday)
  const currentDayOfWeek = todayDate.getDay(); // 0 (Sun) to 6 (Sat)
  const daysUntilSaturday = 6 - currentDayOfWeek;
  const endDate = parseLocalDate(getOffsetDateString(daysUntilSaturday, todayDate));

  // 26 weeks = 182 days grid slots to ensure full 7-row columns
  const totalWeeks = 26;
  const totalDays = totalWeeks * 7;
  const startDate = parseLocalDate(getOffsetDateString(-(totalDays - 1), endDate));

  const weeks: {
    dateStr: string;
    isCompleted: boolean;
    isInRange: boolean;
    isToday: boolean;
  }[][] = [];

  if (expanded) {
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
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-orbit-text-muted">
        <div className="flex items-center gap-2">
          <span>{expanded ? "Last 180 Days" : "Last 28 Days"}</span>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex min-h-[36px] items-center rounded-orbit-control px-2 text-[11px] font-semibold text-orbit-accent transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring"
          >
            {expanded ? "Compact 28d view" : "180-day view"}
          </button>
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span>Less</span>
          <div className="h-2.5 w-2.5 rounded-[2px] bg-orbit-heatmap-0 border border-orbit-border/50" title="No activity" />
          <div className="h-2.5 w-2.5 rounded-[2px] bg-orbit-heatmap-1" title="Low activity" />
          <div className="h-2.5 w-2.5 rounded-[2px] bg-orbit-heatmap-2" title="Medium activity" />
          <div className="h-2.5 w-2.5 rounded-[2px] bg-orbit-heatmap-3" title="High activity" />
          <div
            className="h-2.5 w-2.5 rounded-[2px] bg-orbit-heatmap-4"
            style={color && color !== "#10b981" ? { backgroundColor: color } : undefined}
            title="Completed"
          />
          <span>More</span>
        </div>
      </div>

      {!expanded ? (
        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5 @[540px]:grid-cols-[repeat(28,minmax(0,1fr))]">
          {recentDays.map((day) => {
            const friendlyLabel = formatFriendlyDate(day.dateStr);
            const isCustomColor = color && color !== "#10b981";
            return (
              <div
                key={day.dateStr}
                title={`${friendlyLabel} (${day.dateStr}): ${
                  day.isCompleted ? "Completed" : "Not logged"
                }`}
                style={
                  day.isCompleted && isCustomColor
                    ? { backgroundColor: color }
                    : undefined
                }
                className={`aspect-square w-full rounded-[3px] transition-transform hover:scale-110 ${
                  day.isCompleted
                    ? isCustomColor
                      ? "shadow-orbit-xs"
                      : "bg-orbit-heatmap-4 shadow-orbit-xs"
                    : "bg-orbit-heatmap-0 border border-orbit-border/30 hover:bg-orbit-heatmap-1"
                } ${
                  day.isToday
                    ? "ring-1 ring-orbit-chart-highlight ring-offset-1 ring-offset-orbit-surface"
                    : ""
                }`}
              />
            );
          })}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-x-auto pb-1"
        >
          <div className="inline-flex gap-1.5 py-1">
            {/* Day of week labels */}
            <div className="grid grid-rows-7 gap-1 pr-1 text-[9px] font-semibold text-orbit-text-muted select-none">
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
                        className="pointer-events-none h-3 w-3 rounded-[3px] bg-transparent opacity-0"
                      />
                    );
                  }

                  const friendlyLabel = formatFriendlyDate(day.dateStr);
                  const isCustomColor = color && color !== "#10b981";

                  return (
                    <div
                      key={day.dateStr}
                      title={`${friendlyLabel} (${day.dateStr}): ${
                        day.isCompleted ? "Completed" : "Not logged"
                      }`}
                      style={
                        day.isCompleted && isCustomColor
                          ? { backgroundColor: color }
                          : undefined
                      }
                      className={`h-3 w-3 cursor-pointer rounded-[3px] transition-transform hover:scale-125 ${
                        day.isCompleted
                          ? isCustomColor
                            ? "shadow-orbit-xs"
                            : "bg-orbit-heatmap-4 shadow-orbit-xs"
                          : "bg-orbit-heatmap-0 border border-orbit-border/30 hover:bg-orbit-heatmap-1"
                      } ${
                        day.isToday
                          ? "ring-1 ring-orbit-chart-highlight ring-offset-1 ring-offset-orbit-surface"
                          : ""
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
