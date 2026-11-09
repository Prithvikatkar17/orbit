"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, Calendar, CheckCircle2, Repeat } from "lucide-react";
import type { DailyCount } from "@/lib/services/analytics-service";
import { formatFriendlyDate, parseLocalDate } from "@/lib/utils/dates";

interface ActivityChartProps {
  dailyTaskCompletions: DailyCount[];
  dailyHabitCompletions?: DailyCount[];
  dateRangeType: string;
}

export function ActivityChart({
  dailyTaskCompletions,
  dailyHabitCompletions = [],
  dateRangeType,
}: ActivityChartProps) {
  const [metricMode, setMetricMode] = useState<"tasks" | "habits">("tasks");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeData = metricMode === "tasks" ? dailyTaskCompletions : dailyHabitCompletions;

  // Calculate statistics
  const { totalCount, maxCount, activeDays, averagePerDay, bestDay } = useMemo(() => {
    let total = 0;
    let max = 0;
    let active = 0;
    let peak: DailyCount | null = null;

    for (const item of activeData) {
      total += item.count;
      if (item.count > 0) active++;
      if (item.count > max) {
        max = item.count;
        peak = item;
      }
    }

    const avg = activeData.length > 0 ? Math.round((total / activeData.length) * 10) / 10 : 0;
    return {
      totalCount: total,
      maxCount: Math.max(max, 4), // Minimum scale ceiling of 4 for clean visuals
      activeDays: active,
      averagePerDay: avg,
      bestDay: peak,
    };
  }, [activeData]);

  // SVG dimensions
  const viewBoxWidth = 840;
  const viewBoxHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const chartWidth = viewBoxWidth - padLeft - padRight;
  const chartHeight = viewBoxHeight - padTop - padBottom;

  const countSteps = 3;
  const stepVal = Math.ceil(maxCount / countSteps);
  const adjustedMax = stepVal * countSteps;

  const numBars = activeData.length;
  const barSlotWidth = numBars > 0 ? chartWidth / numBars : chartWidth;
  const barWidth = Math.max(2, Math.min(24, barSlotWidth * 0.65));

  // Determine x-axis label interval
  const labelInterval = useMemo(() => {
    if (numBars <= 8) return 1;
    if (numBars <= 15) return 2;
    if (numBars <= 31) return 4;
    if (numBars <= 60) return 7;
    return 14;
  }, [numBars]);

  function formatDateShort(dateStr: string) {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const activeHoverItem = hoveredIndex !== null && activeData[hoveredIndex] ? activeData[hoveredIndex] : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header with Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Activity Throughput
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {metricMode === "tasks"
              ? "Completed tasks tracked day-by-day."
              : "Completed habit check-ins day-by-day."}
          </p>
        </div>

        {/* Metric Segmented Toggle */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setMetricMode("tasks");
              setHoveredIndex(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              metricMode === "tasks"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMetricMode("habits");
              setHoveredIndex(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              metricMode === "habits"
                ? "bg-white text-violet-600 shadow-xs dark:bg-slate-700 dark:text-violet-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Habits</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
        <div>
          <span className="text-slate-400">Period Total:</span>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
            {totalCount} {metricMode === "tasks" ? "tasks" : "check-ins"}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Daily Average:</span>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
            {averagePerDay} / day
          </p>
        </div>
        <div>
          <span className="text-slate-400">Active Days:</span>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
            {activeDays} of {numBars} days
          </p>
        </div>
        <div>
          <span className="text-slate-400">Peak Day:</span>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {bestDay ? `${bestDay.count} on ${formatDateShort(bestDay.date)}` : "—"}
          </p>
        </div>
      </div>

      {/* Inspector / Tooltip Bar */}
      <div className="h-7 flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
        {activeHoverItem ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatFriendlyDate(activeHoverItem.date)}:
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {activeHoverItem.count} {metricMode === "tasks" ? "task" : "habit"}
              {activeHoverItem.count === 1 ? "" : "s"} completed
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Hover or tap any bar to view details for that day
          </span>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="relative mt-1 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-48 sm:h-56 select-none"
          role="img"
          aria-label={`Activity bar chart showing ${metricMode} completed over ${dateRangeType}`}
        >
          {/* Y-axis gridlines & labels */}
          {[...Array(countSteps + 1)].map((_, i) => {
            const lineVal = stepVal * i;
            const yPos = padTop + chartHeight - (lineVal / adjustedMax) * chartHeight;
            return (
              <g key={`y-grid-${lineVal}`}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={viewBoxWidth - padRight}
                  y2={yPos}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-100 dark:text-slate-800"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {lineVal}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {activeData.map((item, index) => {
            const slotX = padLeft + index * barSlotWidth;
            const barX = slotX + (barSlotWidth - barWidth) / 2;
            const barHeight =
              item.count > 0 ? (item.count / adjustedMax) * chartHeight : 2;
            const barY = padTop + chartHeight - barHeight;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={item.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setHoveredIndex(index)}
              >
                {/* Invisible hit area for easier mouse/touch interaction */}
                <rect
                  x={slotX}
                  y={padTop}
                  width={barSlotWidth}
                  height={chartHeight + padBottom}
                  fill="transparent"
                />

                {/* Visible Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(3, barWidth / 2)}
                  className={`transition-colors duration-150 ${
                    item.count === 0
                      ? "fill-slate-200 dark:fill-slate-800"
                      : isHovered
                      ? metricMode === "tasks"
                        ? "fill-indigo-500"
                        : "fill-violet-500"
                      : metricMode === "tasks"
                      ? "fill-indigo-600 dark:fill-indigo-500"
                      : "fill-violet-600 dark:fill-violet-500"
                  }`}
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {activeData.map((item, index) => {
            const showLabel =
              index === 0 ||
              index === numBars - 1 ||
              index % labelInterval === 0;

            if (!showLabel) return null;

            const slotX = padLeft + index * barSlotWidth;
            const labelX = slotX + barSlotWidth / 2;
            const labelY = viewBoxHeight - 8;

            return (
              <text
                key={`label-${item.date}`}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] select-none"
              >
                {formatDateShort(item.date)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

