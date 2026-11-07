"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import {
  type EventOccurrence,
  getMonthCalendarGrid,
} from "@/lib/utils/recurrence";

interface MonthViewProps {
  year: number;
  month: number; // 1-12
  todayStr: string;
  occurrences: EventOccurrence[];
  weekStartsOn?: "monday" | "sunday";
  onSelectEvent: (event: Event, occurrenceDate: string) => void;
  onCreateEvent: (dateStr: string) => void;
}

export function MonthView({
  year,
  month,
  todayStr,
  occurrences,
  weekStartsOn = "monday",
  onSelectEvent,
  onCreateEvent,
}: MonthViewProps) {
  const [dayOverflowPopover, setDayOverflowPopover] = useState<{
    dateStr: string;
    events: EventOccurrence[];
  } | null>(null);

  const grid = getMonthCalendarGrid(year, month, todayStr, weekStartsOn);

  // Group occurrences by date string
  const eventsByDate = new Map<string, EventOccurrence[]>();
  for (const occ of occurrences) {
    const list = eventsByDate.get(occ.occurrenceDate) || [];
    list.push(occ);
    eventsByDate.set(occ.occurrenceDate, list);
  }

  const weekHeaders =
    weekStartsOn === "monday"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MAX_VISIBLE_EVENTS = 3;

  return (
    <div className="flex flex-col flex-1 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Day of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center dark:border-slate-800 dark:bg-slate-950/60">
        {weekHeaders.map((dayName, idx) => {
          const isWeekend =
            weekStartsOn === "monday" ? idx >= 5 : idx === 0 || idx === 6;
          return (
            <div
              key={dayName}
              className={`py-2 text-xs font-semibold uppercase tracking-wider ${
                isWeekend
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {dayName}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
        {grid.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateStr) || [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);

          return (
            <div
              key={cell.dateStr}
              className={`group relative flex min-h-[105px] flex-col p-1.5 transition-colors select-none ${
                cell.isCurrentMonth
                  ? "bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  : "bg-slate-50/40 text-slate-400 dark:bg-slate-950/30 dark:text-slate-600"
              } ${cell.isToday ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50/10" : ""}`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    cell.isToday
                      ? "bg-indigo-600 font-bold text-white shadow-xs"
                      : cell.isCurrentMonth
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Quick Add Button on Hover */}
                <button
                  type="button"
                  onClick={() => onCreateEvent(cell.dateStr)}
                  className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                  title={`Add event on ${cell.dateStr}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Event Chips List */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map((occ) => {
                  const typeCfg =
                    EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                  return (
                    <button
                      key={`${occ.event.id}-${occ.occurrenceDate}`}
                      type="button"
                      onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                      className="flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-transform hover:scale-[1.01] active:scale-[0.99] border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                      style={{
                        backgroundColor: `${typeCfg.color}15`,
                        color: typeCfg.color,
                      }}
                      title={`${occ.event.title} (${
                        occ.event.isAllDay ? "All day" : occ.event.startTime
                      })`}
                    >
                      <span className="shrink-0 text-[10px]">{typeCfg.icon}</span>
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {occ.event.title}
                      </span>
                      {!occ.event.isAllDay && occ.event.startTime && (
                        <span className="ml-auto shrink-0 text-[10px] opacity-70">
                          {occ.event.startTime}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Overflow Badge */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDayOverflowPopover({
                        dateStr: cell.dateStr,
                        events: dayEvents,
                      })
                    }
                    className="w-full text-left px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Popover Modal */}
      {dayOverflowPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Events on {dayOverflowPopover.dateStr}
              </h3>
              <button
                type="button"
                onClick={() => setDayOverflowPopover(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="my-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {dayOverflowPopover.events.map((occ) => {
                const typeCfg =
                  EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                return (
                  <button
                    key={`pop-${occ.event.id}-${occ.occurrenceDate}`}
                    type="button"
                    onClick={() => {
                      setDayOverflowPopover(null);
                      onSelectEvent(occ.event, occ.occurrenceDate);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left text-xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{typeCfg.icon}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {occ.event.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {occ.event.isAllDay ? "All day" : occ.event.startTime}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const target = dayOverflowPopover.dateStr;
                setDayOverflowPopover(null);
                onCreateEvent(target);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Event on this day</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
