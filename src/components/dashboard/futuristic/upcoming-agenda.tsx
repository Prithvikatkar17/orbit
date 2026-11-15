"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import {
  useTodayDate,
  getOffsetDateString,
  parseLocalDate,
  formatFriendlyDate,
} from "@/lib/utils/dates";

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
    <div className="space-y-3">
      {/* Clean Single-Line Header */}
      <div className="flex items-center justify-between gap-2 border-b border-orbit-border/70 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-bold tracking-wider text-orbit-text uppercase">
            03 // SCHEDULE
          </h2>
          {upcomingOccurrences.length > 0 && (
            <span className="font-mono text-xs text-orbit-text-muted">
              ({upcomingOccurrences.length})
            </span>
          )}
        </div>

        <Link
          href="/calendar"
          className="inline-flex min-h-[44px] sm:min-h-[28px] items-center gap-1 font-mono text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors py-1"
        >
          <span>Calendar</span>
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="futuristic-panel p-6 rounded-[12px] flex flex-col items-center justify-center text-center">
          <div className="h-8 w-8 rounded-[4px] bg-orbit-surface-secondary border border-orbit-border flex items-center justify-center mb-2.5 text-orbit-text-muted">
            <Calendar className="h-4 w-4" />
          </div>
          <p className="text-xs text-orbit-text-muted mb-3">
            Clear schedule ahead. No events in the next 7 days.
          </p>
          <Link
            href="/calendar"
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1.5 px-3 py-1 font-mono text-xs font-semibold text-orbit-text rounded-xs"
          >
            <span>Open Calendar</span>
          </Link>
        </div>
      ) : (
        <div className="futuristic-panel rounded-[12px] p-4 space-y-3 overflow-hidden">
          <ul className="space-y-3.5 relative border-l border-orbit-border/80 pl-3.5 ml-1.5">
            {upcomingOccurrences.map((occ) => {
              const isToday = occ.occurrenceDate === todayStr;
              const timeDisplay = occ.event.isAllDay ? "All Day" : occ.event.startTime || "--:--";

              return (
                <li key={`agenda-${occ.event.id}-${occ.occurrenceDate}`} className="relative group">
                  {/* Glowing LED Node Indicator */}
                  <span
                    className={`absolute -left-[19px] top-1.5 h-2 w-2 rounded-full transition-all ${
                      isToday
                        ? "bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]"
                        : "bg-[#64748b] group-hover:bg-[#00f0ff]"
                    }`}
                    aria-hidden
                  />

                  <Link
                    href={`/calendar?eventId=${occ.event.id}&date=${occ.occurrenceDate}`}
                    className="block group/link"
                  >
                    {/* Timestamp & Date */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-orbit-text-muted mb-0.5">
                      <span className={`font-semibold tabular-nums ${isToday ? "text-[#00f0ff]" : "text-orbit-text"}`}>
                        {timeDisplay}
                      </span>
                      <span>·</span>
                      <span>{formatFriendlyDate(occ.occurrenceDate)}</span>
                    </div>

                    {/* Title (Clean 2-line wrapped) */}
                    <div className="text-sm font-medium text-orbit-text group-hover/link:text-orbit-accent transition-colors line-clamp-2 leading-snug">
                      {occ.event.title}
                    </div>

                    {occ.event.notes && (
                      <p className="text-xs text-orbit-text-muted line-clamp-1 mt-0.5">
                        {occ.event.notes}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
