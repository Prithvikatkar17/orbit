"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Event } from "@/lib/schemas";
import { formatFriendlyDate, getLocalDateString, getOffsetDateString, parseLocalDate } from "@/lib/utils/dates";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";
import { getCanonicalHour } from "./archival-math";

export interface AnnalsChronicleProps {
  events: Event[];
  todayStr?: string | null;
}

export function AnnalsChronicle({ events, todayStr }: AnnalsChronicleProps) {
  const resolvedToday = todayStr ?? getLocalDateString();
  const next7DaysStr = useMemo(
    () => getOffsetDateString(7, parseLocalDate(resolvedToday)),
    [resolvedToday]
  );

  const displayEvents = useMemo(() => {
    if (!events.length) return [];
    // Expand recurring events and filter out past dates using the same pattern as other themes
    return getAllOccurrencesForRange(events, resolvedToday, next7DaysStr).slice(0, 4);
  }, [events, resolvedToday, next7DaysStr]);

  return (
    <section className="space-y-4">
      {/* Single-Line Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold tracking-widest text-[#8c2d38] dark:text-[#c94a58] uppercase whitespace-nowrap">
            III. Chronological Annals
          </span>
        </div>
        <Link
          href="/calendar"
          className="group inline-flex items-center gap-1 text-xs font-mono tracking-wider text-stone-600 dark:text-stone-400 hover:text-[#1b4332] dark:hover:text-[#52b788] transition-colors whitespace-nowrap"
        >
          <span>Almanac</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Events Card with Vertical Red Rubricated Margin Rule */}
      <div className="archivist-catalog-card p-5 md:p-6 rounded-[14px]">
        {displayEvents.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-[#8c2d38]/40 dark:border-[#c94a58]/40 space-y-6 my-1">
            {displayEvents.map((occ) => {
              const event = occ.event;
              const canonical = getCanonicalHour(event.startTime);
              const eventDateLabel = occ.occurrenceDate ? formatFriendlyDate(occ.occurrenceDate) : "Today";

              return (
                <div key={`${event.id}_${occ.occurrenceDate}`} className="relative group">
                  {/* Fleuron / Wax Pin Node on the Margin Rule */}
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#8c2d38] dark:bg-[#c94a58] border-2 border-[#fdfaf3] dark:border-[#1b1613] shadow-xs flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-amber-200" />
                  </div>

                  {/* Header Row: Time, Canonical Hour & Type Pill */}
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                      <span className="font-semibold text-stone-900 dark:text-stone-200">
                        {event.startTime || "All Day"}
                      </span>
                      <span>·</span>
                      <span className="font-serif italic text-stone-600 dark:text-stone-400">
                        {canonical.secular}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300/80 dark:border-stone-700">
                      {event.type || "SESSION"}
                    </span>
                  </div>

                  {/* Event Title in Newsreader Serif */}
                  <h4 className="text-sm font-serif font-medium text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                    {event.title}
                  </h4>

                  {/* Provenance Date & Notes */}
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-serif text-stone-600 dark:text-stone-400">
                    <span className="italic">{eventDateLabel}</span>
                    {event.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate">{event.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm font-serif italic text-stone-600 dark:text-stone-400">
              No gatherings recorded in today&apos;s almanac.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
