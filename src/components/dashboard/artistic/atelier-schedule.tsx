"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import type { Event } from "@/lib/schemas";
import {
  formatFriendlyDate,
  parseLocalDate,
  getOffsetDateString,
} from "@/lib/utils/dates";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";

export interface AtelierScheduleProps {
  events: Event[];
  todayStr: string | null;
}

export function AtelierSchedule({ events, todayStr }: AtelierScheduleProps) {
  const next7DaysStr = useMemo(() => {
    if (!todayStr) return "";
    return getOffsetDateString(7, parseLocalDate(todayStr));
  }, [todayStr]);

  const upcomingOccurrences = useMemo(() => {
    if (!todayStr || !next7DaysStr || events.length === 0) return [];
    return getAllOccurrencesForRange(events, todayStr, next7DaysStr).slice(0, 5);
  }, [events, todayStr, next7DaysStr]);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif italic font-normal text-orbit-text tracking-tight">
              Studio Hours &amp; Critique
            </h2>
          </div>
          {/* Subtle painterly accent stroke */}
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#ec4899] opacity-70" />
        </div>

        <Link
          href="/calendar"
          className="group inline-flex items-center gap-1 text-xs font-sans font-medium text-orbit-text-muted hover:text-orbit-accent transition-colors shrink-0"
        >
          <span>Calendar</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="rounded-[24px] border border-orbit-border bg-orbit-surface p-8 text-center shadow-card space-y-2">
          <CalendarIcon className="h-6 w-6 text-orbit-text-muted/60 mx-auto mb-1 stroke-1" />
          <p className="font-serif italic text-base text-orbit-text-secondary">
            No studio sessions or critiques scheduled
          </p>
          <p className="text-xs font-sans text-orbit-text-muted">
            The studio calendar is open for dedicated uninterrupted craft.
          </p>
        </div>
      ) : (
        <div className="rounded-[22px] border border-orbit-border bg-orbit-surface p-4 sm:p-5 shadow-[0_12px_30px_-8px_rgba(120,70,140,0.06)] divide-y divide-orbit-border/50">
          {upcomingOccurrences.map((occ, idx) => {
            const isToday = occ.occurrenceDate === todayStr;
            const timeDisplay = occ.event.isAllDay
              ? "All Day"
              : occ.event.startTime
              ? occ.event.startTime
              : "Studio session";

            // Ribbon gradient palette
            const ribbons = [
              "from-[#e11d48] to-[#ec4899]",
              "from-[#4f46e5] to-[#818cf8]",
              "from-[#0d9488] to-[#34d399]",
              "from-[#f59e0b] to-[#fb923c]",
            ];
            const ribbonGrad = ribbons[idx % ribbons.length];

            return (
              <div
                key={`${occ.event.id}-${occ.occurrenceDate}`}
                className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 group/event"
              >
                {/* Vertical Blended Pigment Ribbon */}
                <div
                  className={`w-1.5 self-stretch rounded-full bg-gradient-to-b ${ribbonGrad} shrink-0 opacity-80 group-hover/event:opacity-100 transition-opacity`}
                />

                {/* Event Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-serif italic text-base sm:text-lg text-orbit-accent">
                      {timeDisplay}
                    </span>
                    <span className="text-[11px] font-sans text-orbit-text-muted">
                      {isToday ? (
                        <span className="text-[#e11d48] font-medium">Today</span>
                      ) : (
                        formatFriendlyDate(occ.occurrenceDate)
                      )}
                    </span>
                  </div>

                  <h3 className="font-serif font-medium text-base text-orbit-text leading-snug hover:text-orbit-accent transition-colors line-clamp-2">
                    <Link href={`/calendar?eventId=${occ.event.id}&date=${occ.occurrenceDate}`}>
                      {occ.event.title}
                    </Link>
                  </h3>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-orbit-surface-secondary text-orbit-text-secondary capitalize">
                      {occ.event.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
