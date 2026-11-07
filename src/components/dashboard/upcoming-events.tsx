"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { db } from "@/lib/db/client";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import { useTodayDate, getOffsetDateString, parseLocalDate, formatFriendlyDate } from "@/lib/utils/dates";
import { EVENT_TYPE_MAP } from "@/lib/constants";

export function UpcomingEventsWidget() {
  const todayStr = useTodayDate();

  const events = useLiveQuery(() => db.events.toArray(), []);

  const next7DaysStr = useMemo(
    () => (todayStr ? getOffsetDateString(7, parseLocalDate(todayStr)) : ""),
    [todayStr]
  );

  const upcomingOccurrences = useMemo(() => {
    const list = events || [];
    if (!todayStr || !next7DaysStr || list.length === 0) return [];
    return getAllOccurrencesForRange(list, todayStr, next7DaysStr).slice(0, 5);
  }, [events, todayStr, next7DaysStr]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Upcoming Events (7 Days)
          </h2>
        </div>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <span>View calendar</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {upcomingOccurrences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
            <CalendarIcon className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No events in the next 7 days.
            </p>
            <Link
              href="/calendar"
              className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              + Schedule an event or birthday
            </Link>
          </div>
        ) : (
          upcomingOccurrences.map((occ) => {
            const typeCfg =
              EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
            const isToday = occ.occurrenceDate === todayStr;

            return (
              <div
                key={`dash-${occ.event.id}-${occ.occurrenceDate}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/60 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                style={{ borderLeft: `3px solid ${typeCfg.color}` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{typeCfg.icon}</span>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {occ.event.title}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-medium ${typeCfg.badgeClass}`}
                    >
                      {typeCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className={isToday ? "font-bold text-indigo-600 dark:text-indigo-400" : ""}>
                      {formatFriendlyDate(occ.occurrenceDate)}
                    </span>
                    <span>•</span>
                    <span>{occ.event.isAllDay ? "All Day" : occ.event.startTime}</span>
                  </div>
                </div>

                <Link
                  href="/calendar"
                  className="rounded-lg p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="View in calendar"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
