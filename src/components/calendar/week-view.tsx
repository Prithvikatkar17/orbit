"use client";

import React from "react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import {
  type EventOccurrence,
  getWeekDays,
} from "@/lib/utils/recurrence";

interface WeekViewProps {
  currentDateStr: string;
  todayStr: string;
  occurrences: EventOccurrence[];
  weekStartsOn?: "monday" | "sunday";
  onSelectEvent: (event: Event, occurrenceDate: string) => void;
  onCreateEvent: (dateStr: string, defaultTime?: string) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export function WeekView({
  currentDateStr,
  todayStr,
  occurrences,
  weekStartsOn = "monday",
  onSelectEvent,
  onCreateEvent,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDateStr, todayStr, weekStartsOn);

  // Group occurrences by date
  const eventsByDate = new Map<string, { allDay: EventOccurrence[]; timed: EventOccurrence[] }>();
  for (const day of weekDays) {
    eventsByDate.set(day.dateStr, { allDay: [], timed: [] });
  }

  for (const occ of occurrences) {
    const entry = eventsByDate.get(occ.occurrenceDate);
    if (entry) {
      if (occ.event.isAllDay) {
        entry.allDay.push(occ);
      } else {
        entry.timed.push(occ);
      }
    }
  }

  const dayNames =
    weekStartsOn === "monday"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col flex-1 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Week Header Row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60 sticky top-0 z-10">
        <div className="border-r border-slate-200 p-2 text-center text-[10px] font-semibold text-slate-400 dark:border-slate-800 uppercase">
          Time
        </div>
        {weekDays.map((day, idx) => (
          <div
            key={day.dateStr}
            className={`flex flex-col items-center justify-center border-r border-slate-200 p-2 text-center last:border-r-0 dark:border-slate-800 ${
              day.isToday ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {dayNames[idx]}
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mt-0.5 ${
                day.isToday
                  ? "bg-indigo-600 text-white"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      {/* All-Day Events Row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950/20 min-h-[42px]">
        <div className="flex items-center justify-center border-r border-slate-200 text-[10px] font-semibold text-slate-400 uppercase p-1 dark:border-slate-800">
          All-day
        </div>
        {weekDays.map((day) => {
          const allDayEvents = eventsByDate.get(day.dateStr)?.allDay || [];
          return (
            <div
              key={`allday-${day.dateStr}`}
              className="border-r border-slate-200 p-1 last:border-r-0 dark:border-slate-800 space-y-1"
            >
              {allDayEvents.map((occ) => {
                const typeCfg =
                  EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                return (
                  <button
                    key={`ad-${occ.event.id}-${occ.occurrenceDate}`}
                    type="button"
                    onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                    className="flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold truncate hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: `${typeCfg.color}20`,
                      color: typeCfg.color,
                    }}
                  >
                    <span>{typeCfg.icon}</span>
                    <span className="truncate">{occ.event.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Hourly Time Grid (Scrollable) */}
      <div className="flex-1 overflow-y-auto max-h-[620px] divide-y divide-slate-100 dark:divide-slate-800/60">
        {HOURS.map((hour) => {
          const hourStr = String(hour).padStart(2, "0") + ":00";
          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[56px] group"
            >
              {/* Hour Label */}
              <div className="border-r border-slate-200 p-1 text-right text-[11px] font-medium text-slate-400 dark:border-slate-800 select-none">
                {hourStr}
              </div>

              {/* 7 Days Columns for this hour */}
              {weekDays.map((day) => {
                const dayTimed = eventsByDate.get(day.dateStr)?.timed || [];
                // Find events starting in this hour
                const hourEvents = dayTimed.filter((occ) => {
                  const sTime = occ.event.startTime || "00:00";
                  const eventHour = parseInt(sTime.split(":")[0], 10);
                  return eventHour === hour;
                });

                return (
                  <div
                    key={`${day.dateStr}-${hour}`}
                    onClick={() => onCreateEvent(day.dateStr, hourStr)}
                    className={`relative border-r border-slate-100 p-1 last:border-r-0 dark:border-slate-800/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 cursor-pointer transition-colors ${
                      day.isToday ? "bg-indigo-50/10" : ""
                    }`}
                  >
                    {hourEvents.map((occ) => {
                      const typeCfg =
                        EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                      return (
                        <div
                          key={`timed-${occ.event.id}-${occ.occurrenceDate}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(occ.event, occ.occurrenceDate);
                          }}
                          className="flex flex-col rounded-lg p-1.5 text-[11px] font-medium leading-tight shadow-2xs hover:shadow-xs transition-shadow cursor-pointer mb-1"
                          style={{
                            backgroundColor: `${typeCfg.color}15`,
                            borderLeft: `3px solid ${typeCfg.color}`,
                          }}
                        >
                          <div className="flex items-center gap-1 truncate font-semibold text-slate-800 dark:text-slate-100">
                            <span>{typeCfg.icon}</span>
                            <span className="truncate">{occ.event.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {occ.event.startTime} - {occ.event.endTime || "end"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
