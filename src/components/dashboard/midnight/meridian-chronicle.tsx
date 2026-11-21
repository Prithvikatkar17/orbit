"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Event } from "@/lib/schemas";
import { formatFriendlyDate, getLocalDateString, getOffsetDateString, parseLocalDate } from "@/lib/utils/dates";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import { getEventTransitPhase } from "./astronomical-math";

export interface MeridianChronicleProps {
  events: Event[];
  todayStr?: string | null;
}

export function MeridianChronicle(props: MeridianChronicleProps) {
  const { events, todayStr } = props;

  const resolvedToday = todayStr ?? getLocalDateString();
  const next7DaysStr = useMemo(
    () => getOffsetDateString(7, parseLocalDate(resolvedToday)),
    [resolvedToday]
  );

  // Expand recurring events and filter past events, sort chronologically
  const sortedEvents = useMemo(() => {
    if (!events.length) return [];
    return getAllOccurrencesForRange(events, resolvedToday, next7DaysStr)
      .sort((a, b) => {
        if (a.occurrenceDate !== b.occurrenceDate)
          return a.occurrenceDate.localeCompare(b.occurrenceDate);
        return (a.event.startTime || "").localeCompare(b.event.startTime || "");
      })
      .slice(0, 6);
  }, [events, resolvedToday, next7DaysStr]);

  return (
    <section className="space-y-4" aria-label="Meridian Transit Log">
      {/* Header Row: Single-Line with Ephemeris Link */}
      <div className="flex items-center justify-between pb-1 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <span className="font-serif italic text-sm text-[#818cf8] dark:text-[#a5b4fc] font-semibold">
            III.
          </span>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-semibold text-orbit-text">
            MERIDIAN TRANSIT
          </h2>
        </div>

        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-orbit-text-muted hover:text-[#818cf8] dark:hover:text-[#a5b4fc] transition-colors"
        >
          <span>Ephemeris</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Observatory Plate */}
      <div className="midnight-observatory-card p-6 relative overflow-hidden">
        {sortedEvents.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <p className="font-display italic text-sm text-orbit-text">
              The meridian arc is clear.
            </p>
            <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
              No astronomical transits scheduled in current horizon
            </p>
          </div>
        ) : (
          /* Vertical Graduated Brass/Indigo Meridian Axis */
          <div className="relative pl-6 ml-2 border-l-2 border-[#818cf8]/25 space-y-7 my-1">
            {sortedEvents.map((occ, idx) => {
              const ev = occ.event;
              const transitPhase = getEventTransitPhase(ev.startTime);
              const isFirst = idx === 0;

              return (
                <div key={`${ev.id}_${occ.occurrenceDate}`} className="relative group">
                  {/* Graduated Meridian Axis Node / Stellar Orb */}
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-125 ${
                      isFirst
                        ? "bg-[#eab308] shadow-[0_0_10px_#eab308] border border-[#ffffff]"
                        : "bg-[#0d1124] border-2 border-[#818cf8] text-[#818cf8]"
                    }`}
                  >
                    {isFirst ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ffffff]" />
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-[#818cf8]" />
                    )}
                  </div>

                  {/* Degree Tick Indicator on Axis */}
                  <div className="absolute -left-[35px] top-5 w-2 h-[1px] bg-[#818cf8]/40" />

                  {/* Event Detail Stack */}
                  <div className="space-y-1.5">
                    {/* Time & Solar/Sidereal Phase Pill */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-serif italic text-xs text-orbit-text">
                        <span className="font-semibold text-orbit-accent">
                          {ev.startTime || "All Day"}
                        </span>
                        <span className="text-orbit-text-muted">· {transitPhase}</span>
                      </div>

                      <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#818cf8]/10 text-[#818cf8] dark:text-[#a5b4fc] border border-[#818cf8]/20 font-semibold">
                        {ev.type?.toUpperCase() || "TRANSIT"}
                      </span>
                    </div>

                    {/* Event Title */}
                    <h4 className="text-sm font-medium leading-snug font-display text-orbit-text group-hover:text-orbit-accent transition-colors line-clamp-2">
                      {ev.title}
                    </h4>

                    {/* Date subtitle */}
                    {occ.occurrenceDate && (
                      <p className="font-mono text-[10px] text-orbit-text-muted tracking-wider">
                        {formatFriendlyDate(occ.occurrenceDate)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
