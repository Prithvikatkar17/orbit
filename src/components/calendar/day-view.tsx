"use client";

import React from "react";
import { Plus, Clock, Repeat } from "lucide-react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import { type EventOccurrence } from "@/lib/utils/recurrence";
import { formatDateDisplay } from "@/lib/utils/dates";

interface DayViewProps {
  dateStr: string;
  isToday: boolean;
  occurrences: EventOccurrence[];
  onSelectEvent: (event: Event, occurrenceDate: string) => void;
  onCreateEvent: (dateStr: string, defaultTime?: string) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export function DayView({
  dateStr,
  isToday,
  occurrences,
  onSelectEvent,
  onCreateEvent,
}: DayViewProps) {
  const dayOccurrences = occurrences.filter((o) => o.occurrenceDate === dateStr);
  const allDayEvents = dayOccurrences.filter((o) => o.event.isAllDay);
  const timedEvents = dayOccurrences.filter((o) => !o.event.isAllDay);

  return (
    <div className="flex flex-col flex-1 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Day Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${isToday
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}
          >
            {dateStr.split("-")[2]}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {formatDateDisplay(dateStr)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dayOccurrences.length} {dayOccurrences.length === 1 ? "event" : "events"} scheduled
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCreateEvent(dateStr)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Event</span>
        </button>
      </div>

      {/* All-Day Events Section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/20">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            All-Day Events
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allDayEvents.map((occ) => {
              const typeCfg = EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
              return (
                <div
                  key={`all-${occ.event.id}`}
                  onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer dark:border-slate-800 dark:bg-slate-900"
                  style={{ borderLeft: `4px solid ${typeCfg.color}` }}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-sm">{typeCfg.icon}</span>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {occ.event.title}
                    </span>
                  </div>
                  {occ.event.recurrence && occ.event.recurrence.rule !== "none" && (
                    <Repeat className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly Schedule */}
      <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-100 dark:divide-slate-800/60">
        {HOURS.map((hour) => {
          const hourStr = String(hour).padStart(2, "0") + ":00";
          const matchingEvents = timedEvents.filter((occ) => {
            const sTime = occ.event.startTime || "00:00";
            const eventHour = parseInt(sTime.split(":")[0], 10);
            return eventHour === hour;
          });

          return (
            <div
              key={hour}
              className="flex min-h-[64px] group hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
            >
              {/* Hour Column */}
              <div className="w-20 shrink-0 border-r border-slate-200 p-3 text-right text-xs font-semibold text-slate-400 dark:border-slate-800 select-none">
                {hourStr}
              </div>

              {/* Slots Column */}
              <div
                onClick={() => onCreateEvent(dateStr, hourStr)}
                className="flex-1 p-2 flex flex-col gap-2 cursor-pointer"
              >
                {matchingEvents.length === 0 ? (
                  <div className="hidden group-hover:flex items-center text-[11px] text-slate-400 italic py-1">
                    + Click to add event at {hourStr}
                  </div>
                ) : (
                  matchingEvents.map((occ) => {
                    const typeCfg =
                      EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                    return (
                      <div
                        key={`day-timed-${occ.event.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(occ.event, occ.occurrenceDate);
                        }}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-colors cursor-pointer"
                        style={{ borderLeft: `4px solid ${typeCfg.color}` }}
                      >
                        <div className="space-y-0.5 truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{typeCfg.icon}</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {occ.event.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeCfg.badgeClass}`}
                            >
                              {typeCfg.label}
                            </span>
                          </div>
                          {occ.event.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                              {occ.event.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {occ.event.startTime} - {occ.event.endTime || "end"}
                            </span>
                          </div>
                          {occ.event.recurrence && occ.event.recurrence.rule !== "none" && (
                            <Repeat className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
