"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import {
  useTodayDate,
  getOffsetDateString,
  parseLocalDate,
  formatFriendlyDate,
} from "@/lib/utils/dates";
import { EVENT_TYPE_MAP } from "@/lib/constants";

export function UpcomingAgenda() {
  const todayStr = useTodayDate();
  const events = useLiveQuery(() => db.events.toArray(), []);

  const next7DaysStr = useMemo(
    () => (todayStr ? getOffsetDateString(7, parseLocalDate(todayStr)) : ""),
    [todayStr]
  );

  const upcomingOccurrences = useMemo(() => {
    const list = events || [];
    if (!todayStr || !next7DaysStr || list.length === 0) return [];
    return getAllOccurrencesForRange(list, todayStr, next7DaysStr).slice(0, 4);
  }, [events, todayStr, next7DaysStr]);

  return (
    <section className="futuristic-panel flex flex-col">
      {/* Section Header */}
      <div className="futuristic-panel-header flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-orbit-accent" aria-hidden />
          <h2 className="font-sans text-base font-bold text-orbit-text tracking-tight">
            Upcoming Schedule
          </h2>
          {upcomingOccurrences.length > 0 && (
            <span className="font-mono text-xs text-orbit-text-muted">
              ({upcomingOccurrences.length})
            </span>
          )}
        </div>

        <Link
          href="/calendar"
          className="inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1 font-mono text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors py-1"
        >
          <span>Calendar</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-orbit-text-muted mb-3">
            Clear schedule ahead. No events in the next 7 days.
          </p>
          <Link
            href="/calendar"
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1.5 px-3 py-1 font-sans text-xs font-medium text-orbit-text rounded-xs"
          >
            <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
            <span>Open Calendar</span>
          </Link>
        </div>
      ) : (
        <div className="p-5">
          <ul className="space-y-3 relative border-l border-orbit-border/80 pl-4 ml-1">
            {upcomingOccurrences.map((occ) => {
              const typeCfg = EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.other || {
                label: "Event",
                icon: "📌",
                color: "#00e5ff",
                badgeClass: "bg-orbit-surface-secondary text-orbit-text",
              };

              const isToday = occ.occurrenceDate === todayStr;
              const timeDisplay = occ.event.isAllDay ? "All Day" : occ.event.startTime;

              return (
                <li key={`agenda-${occ.event.id}-${occ.occurrenceDate}`} className="relative">
                  {/* Timeline Anchor Node — Physical Hardware LED */}
                  <span
                    className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-[1px] ${
                      isToday
                        ? "border border-[#38bdf8] bg-[#00f0ff] shadow-[0_0_8px_#00f0ff,inset_0_1px_0_rgba(255,255,255,0.7)]"
                        : "border border-[#2a3850] bg-[#090d16] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]"
                    }`}
                    aria-hidden
                  />

                  <Link
                    href={`/calendar?eventId=${occ.event.id}&date=${occ.occurrenceDate}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-orbit-text group-hover:text-orbit-accent transition-colors truncate">
                        {occ.event.title}
                      </span>
                      <span className="text-[10px] font-mono text-orbit-text-muted shrink-0">
                        {typeCfg.label}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-orbit-text-muted">
                      <span className={isToday ? "font-semibold text-orbit-accent" : ""}>
                        {formatFriendlyDate(occ.occurrenceDate)}
                      </span>
                      {timeDisplay && (
                        <>
                          <span>·</span>
                          <span>{timeDisplay}</span>
                        </>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
