"use client";

import React from "react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import {
  type EventOccurrence,
  getWeekDays,
} from "@/lib/utils/recurrence";
import { SurfaceCard } from "@/components/ui";

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
    <SurfaceCard className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Week Header Row */}
          <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-orbit-border bg-orbit-surface-secondary/85">
            <div className="border-r border-orbit-border p-2.5 text-center font-mono text-[10px] font-semibold tracking-wider text-orbit-text-muted uppercase">
              Time
            </div>
            {weekDays.map((day, idx) => (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center justify-center border-r border-orbit-border p-2 text-center last:border-r-0 ${
                  day.isToday ? "bg-orbit-accent-soft/35" : ""
                }`}
              >
                <span className="text-[11px] font-medium text-orbit-text-secondary">
                  {dayNames[idx]}
                </span>
                <span
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    day.isToday
                      ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs"
                      : "text-orbit-text"
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* All-Day Events Row */}
          <div className="grid min-h-[44px] grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-orbit-border bg-orbit-surface-secondary/35">
            <div className="flex items-center justify-center border-r border-orbit-border p-1 font-mono text-[10px] font-semibold tracking-wider text-orbit-text-muted uppercase">
              All-day
            </div>
            {weekDays.map((day) => {
              const allDayEvents = eventsByDate.get(day.dateStr)?.allDay || [];
              const isPast = day.dateStr < todayStr;
              return (
                <div
                  key={`allday-${day.dateStr}`}
                  className="min-w-0 space-y-1 border-r border-orbit-border p-1 last:border-r-0"
                >
                  {allDayEvents.map((occ) => {
                    const typeCfg =
                      EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                    return (
                      <button
                        key={`ad-${occ.event.id}-${occ.occurrenceDate}`}
                        type="button"
                        onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                        className={`flex w-full items-center gap-1 rounded-md border border-orbit-border/50 bg-orbit-surface px-1.5 py-1 text-left text-[11px] font-semibold text-orbit-text hover:border-orbit-border-strong transition-colors ${
                          isPast ? "opacity-65" : ""
                        }`}
                        style={{ borderLeft: `3px solid ${typeCfg.color}` }}
                        title={occ.event.title}
                      >
                        <span className="shrink-0" aria-hidden="true">
                          {typeCfg.icon}
                        </span>
                        <span className="truncate">{occ.event.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Hourly Time Grid */}
          <div className="max-h-[620px] divide-y divide-orbit-border/60 overflow-y-auto">
            {HOURS.map((hour) => {
              const hourStr = String(hour).padStart(2, "0") + ":00";
              return (
                <div
                  key={hour}
                  className="group grid min-h-[58px] grid-cols-[64px_repeat(7,minmax(0,1fr))]"
                >
                  {/* Hour Label */}
                  <div className="border-r border-orbit-border p-1.5 text-right font-mono text-[11px] font-medium text-orbit-text-muted tabular-nums select-none">
                    {hourStr}
                  </div>

                  {/* 7 Days Columns for this hour */}
                  {weekDays.map((day) => {
                    const dayTimed = eventsByDate.get(day.dateStr)?.timed || [];
                    const isPast = day.dateStr < todayStr;
                    const hourEvents = dayTimed.filter((occ) => {
                      const sTime = occ.event.startTime || "00:00";
                      const eventHour = parseInt(sTime.split(":")[0], 10);
                      return eventHour === hour;
                    });

                    return (
                      <div
                        key={`${day.dateStr}-${hour}`}
                        onClick={() => onCreateEvent(day.dateStr, hourStr)}
                        className={`relative min-w-0 cursor-pointer space-y-1 border-r border-orbit-border/60 p-1 last:border-r-0 transition-colors hover:bg-orbit-accent-soft/20 ${
                          day.isToday ? "bg-orbit-accent-soft/10" : ""
                        }`}
                      >
                        {hourEvents.map((occ) => {
                          const typeCfg =
                            EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                          return (
                            <button
                              key={`timed-${occ.event.id}-${occ.occurrenceDate}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEvent(occ.event, occ.occurrenceDate);
                              }}
                              className={`flex w-full flex-col rounded-lg border border-orbit-border/60 bg-orbit-surface-secondary/90 p-1.5 text-left text-[11px] font-medium leading-tight transition-colors hover:border-orbit-border-strong hover:bg-orbit-subtle ${
                                isPast ? "opacity-65" : ""
                              }`}
                              style={{ borderLeft: `3px solid ${typeCfg.color}` }}
                            >
                              <div className="flex min-w-0 items-center gap-1 font-semibold text-orbit-text">
                                <span className="shrink-0" aria-hidden="true">
                                  {typeCfg.icon}
                                </span>
                                <span className="truncate">{occ.event.title}</span>
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-orbit-text-muted tabular-nums">
                                {occ.event.startTime}
                                {occ.event.endTime ? ` – ${occ.event.endTime}` : ""}
                              </div>
                            </button>
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
      </div>
    </SurfaceCard>
  );
}
