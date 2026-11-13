"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { db } from "@/lib/db/client";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import {
  useTodayDate,
  getOffsetDateString,
  parseLocalDate,
  formatFriendlyDate,
} from "@/lib/utils/dates";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import { EmptyState, SurfaceCard } from "@/components/ui";

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
    <SurfaceCard as="section" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-orbit-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="h-4 w-4 text-orbit-accent" aria-hidden />
          <h2 className="font-display text-base font-bold text-orbit-text">
            Upcoming Schedule
          </h2>
          <span className="text-xs text-orbit-text-muted">Next 7 days</span>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors"
        >
          <span>Calendar</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            dashed={false}
            className="border-0 py-6"
            eyebrow="UPCOMING"
            icon={<CalendarIcon className="h-6 w-6" />}
            title="Clear schedule ahead"
            description="No upcoming events or reminders in the next 7 days."
            action={
              <Link
                href="/calendar"
                className="text-xs font-semibold text-orbit-accent hover:underline"
              >
                + Open Calendar
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-orbit-border">
          {upcomingOccurrences.map((occ) => {
            const typeCfg =
              EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
            const isToday = occ.occurrenceDate === todayStr;

            return (
              <li key={`dash-${occ.event.id}-${occ.occurrenceDate}`}>
                <Link
                  href={`/calendar?eventId=${occ.event.id}&date=${occ.occurrenceDate}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-orbit-surface-secondary/70 sm:px-6"
                  style={{ borderLeft: `3px solid ${typeCfg.color}` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm select-none" aria-hidden>
                        {typeCfg.icon}
                      </span>
                      <p className="truncate text-sm font-medium text-orbit-text">
                        {occ.event.title}
                      </p>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-orbit-text-muted">
                      <span className={isToday ? "font-semibold text-orbit-accent" : ""}>
                        {formatFriendlyDate(occ.occurrenceDate)}
                      </span>
                      <span>·</span>
                      <span>{occ.event.isAllDay ? "All Day" : occ.event.startTime}</span>
                      <span>·</span>
                      <span>{typeCfg.label}</span>
                    </div>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-orbit-text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceCard>
  );
}
