"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Event } from "@/lib/schemas";
import {
  formatFriendlyDate,
  parseLocalDate,
  getOffsetDateString,
} from "@/lib/utils/dates";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";

export interface HorizonChronicleProps {
  events: Event[];
  todayStr: string | null;
}

export function HorizonChronicle({ events, todayStr }: HorizonChronicleProps) {
  const next7DaysStr = useMemo(() => {
    if (!todayStr) return "";
    return getOffsetDateString(7, parseLocalDate(todayStr));
  }, [todayStr]);

  const upcomingOccurrences = useMemo(() => {
    if (!todayStr || !next7DaysStr || events.length === 0) return [];
    return getAllOccurrencesForRange(events, todayStr, next7DaysStr).slice(0, 6);
  }, [events, todayStr, next7DaysStr]);

  return (
    <div className="space-y-4">
      {/* Table Header Row */}
      <div className="flex items-center justify-between pb-2 border-b border-orbit-border text-[11px] font-mono uppercase tracking-[0.18em] text-orbit-text-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orbit-text">03 / HORIZON</span>
        </div>
        <Link
          href="/calendar"
          className="hover:text-orbit-text inline-flex items-center gap-1 transition-colors group"
        >
          <span>TIMETABLE</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {upcomingOccurrences.length === 0 ? (
        <div className="py-8 text-center border-b border-orbit-border">
          <p className="font-mono text-xs uppercase tracking-widest text-orbit-text-muted">
            00 — HORIZON CLEAR / NO SCHEDULED EVENTS
          </p>
        </div>
      ) : (
        <div className="divide-y divide-orbit-border border-b border-orbit-border">
          {upcomingOccurrences.map((occ, idx) => {
            const isFirst = idx === 0;
            const isToday = occ.occurrenceDate === todayStr;

            // Formatted 24-hr time or day label
            const timeDisplay = occ.event.startTime
              ? occ.event.startTime
              : isToday
              ? "ALL DAY"
              : formatFriendlyDate(occ.occurrenceDate).toUpperCase();

            const category = occ.event.type || "GENERAL";

            return (
              <div
                key={`${occ.event.id}_${occ.occurrenceDate}_${occ.event.startTime || "allday"}`}
                className="py-3 hover:bg-orbit-subtle/30 transition-colors flex items-center gap-3 md:gap-4 px-1"
              >
                {/* 1. Tabular 24-Hour Time / Schedule Readout */}
                <span className="font-mono text-xs md:text-sm font-medium w-16 shrink-0 text-orbit-text tabular-nums">
                  {timeDisplay}
                </span>

                {/* 2. Precision Signal Micro-Dot */}
                <div className="w-3 flex items-center justify-center shrink-0">
                  {isFirst && isToday ? (
                    <span
                      title="Next immediate event"
                      className="w-1.5 h-1.5 rounded-full bg-[#ff3b00] shrink-0 animate-pulse"
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-orbit-text/30 shrink-0" />
                  )}
                </div>

                {/* 3. Event Title */}
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-sm font-medium text-orbit-text line-clamp-2 leading-snug block">
                    {occ.event.title}
                  </span>
                </div>

                {/* 4. Category Tag */}
                <span className="text-[10px] font-mono tracking-[0.16em] uppercase text-orbit-text-muted shrink-0 hidden sm:inline">
                  {category}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
