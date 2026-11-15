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

export function EditorialAgenda() {
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
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-orbit-border/60 pb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-orbit-text-muted whitespace-nowrap">
            III. SCHEDULE & HORIZON
          </span>
          {upcomingOccurrences.length > 0 && (
            <span className="hidden 2xl:inline font-serif italic text-xs text-orbit-text-muted shrink-0">
              ({upcomingOccurrences.length} scheduled)
            </span>
          )}
        </div>

        <Link
          href="/calendar"
          className="group inline-flex items-center gap-1 text-[11px] font-sans tracking-[0.14em] uppercase text-orbit-text-muted hover:text-orbit-accent transition-colors shrink-0 whitespace-nowrap"
        >
          <span>CALENDAR</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="py-10 text-center">
          <CalendarIcon className="h-6 w-6 text-orbit-text-muted/40 mx-auto mb-2" strokeWidth={1.5} />
          <h4 className="font-serif text-base text-orbit-text mb-1">
            An open horizon
          </h4>
          <p className="font-serif italic text-xs text-orbit-text-muted max-w-xs mx-auto mb-4">
            No scheduled exhibitions or appointments in the coming seven days.
          </p>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-sans tracking-wide uppercase text-orbit-text-muted border border-orbit-border rounded-full hover:border-orbit-accent hover:text-orbit-accent transition-colors"
          >
            Open Almanac
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          <ul className="divide-y divide-orbit-border/50">
            {upcomingOccurrences.map((occ) => {
              const typeCfg = EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.other || {
                label: "Event",
                icon: "📌",
                color: "#c86d51",
                badgeClass: "bg-orbit-surface-secondary text-orbit-text",
              };

              const isToday = occ.occurrenceDate === todayStr;
              const timeDisplay = occ.event.isAllDay ? "All day" : occ.event.startTime || "Scheduled";

              return (
                <li key={`agenda-${occ.event.id}-${occ.occurrenceDate}`} className="py-3.5 first:pt-1">
                  <Link
                    href={`/calendar?eventId=${occ.event.id}&date=${occ.occurrenceDate}`}
                    className="group flex items-start gap-4"
                  >
                    {/* Left Column: Italicized Time in Newsreader */}
                    <div className="w-20 shrink-0 pt-0.5">
                      <span className="font-serif italic text-base sm:text-lg text-orbit-text leading-none group-hover:text-orbit-accent transition-colors">
                        {timeDisplay}
                      </span>
                    </div>

                    {/* Right Column: Title + Category + Day */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-medium text-orbit-text group-hover:text-orbit-accent transition-colors line-clamp-2 leading-snug">
                        {occ.event.title}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-sans tracking-wider uppercase text-orbit-text-muted">
                        <span className={isToday ? "text-orbit-accent font-semibold" : ""}>
                          {isToday ? "Today" : formatFriendlyDate(occ.occurrenceDate)}
                        </span>
                        <span>·</span>
                        <span>{typeCfg.label}</span>
                      </div>
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
