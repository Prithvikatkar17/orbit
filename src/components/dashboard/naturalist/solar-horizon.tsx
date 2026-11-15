"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Event } from "@/lib/schemas";
import {
  parseLocalDate,
  getOffsetDateString,
  formatFriendlyDate,
} from "@/lib/utils/dates";
import { getAllOccurrencesForRange } from "@/lib/utils/recurrence";

export interface SolarHorizonProps {
  events: Event[];
  todayStr: string | null;
}

function getSolarPhaseBadge(timeStr?: string): { label: string; icon: "morning" | "high" | "dusk" } {
  if (!timeStr) return { label: "Circadian Flow", icon: "high" };
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (isNaN(hour)) return { label: "Field Trail", icon: "high" };
  if (hour < 11) return { label: "Morning Sun", icon: "morning" };
  if (hour < 15) return { label: "High Canopy", icon: "high" };
  return { label: "Golden Dusk", icon: "dusk" };
}

export function SolarHorizon({ events, todayStr }: SolarHorizonProps) {
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
      {/* Header — Fixed on ONE single crisp line */}
      <div className="flex items-center justify-between pb-2 border-b border-orbit-border whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-orbit-accent tracking-wider uppercase">
            III.
          </span>
          <h2 className="font-display font-medium text-lg tracking-tight text-orbit-text">
            TRAIL HORIZON
          </h2>
        </div>
        <Link
          href="/calendar"
          className="text-xs font-mono uppercase tracking-wider text-orbit-text-muted hover:text-orbit-accent inline-flex items-center gap-1 transition-colors group shrink-0"
        >
          <span>Calendar</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* The Winding Trail Card */}
      <div className="naturalist-moss-card p-5 relative overflow-hidden">
        {upcomingOccurrences.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="font-display italic text-sm text-orbit-text">
              The mountain trail is clear.
            </p>
            <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
              No expeditions scheduled in horizon
            </p>
          </div>
        ) : (
          <div className="border-l-2 border-[#2e593d]/35 dark:border-[#68a87b]/35 ml-3 pl-4 space-y-5 py-1 relative">
            {upcomingOccurrences.map((occ, idx) => {
              const isFirst = idx === 0;
              const isToday = occ.occurrenceDate === todayStr;
              const { label: solarPhaseLabel } = getSolarPhaseBadge(occ.event.startTime);
              const nodeBgClass =
                isFirst && isToday
                  ? "bg-[#b85a3a] dark:bg-[#d97757]"
                  : "bg-[#2e593d] dark:bg-[#68a87b]";

              return (
                <div key={`${occ.event.id}_${occ.occurrenceDate}`} className="relative space-y-1.5">
                  {/* Trail Leaf/Stone Node */}
                  <div
                    className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-tl-[6px] rounded-br-[6px] rounded-tr-[2px] rounded-bl-[2px] flex items-center justify-center text-white shadow-xs ${nodeBgClass}`}
                  >
                    <div className="w-1 h-1 rounded-full bg-white/90" />
                  </div>

                  {/* Solar Phase & Time Row */}
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    <span className="font-display font-medium text-sm text-orbit-text">
                      {occ.event.startTime || "All Day"}
                    </span>
                    <span className="font-serif italic text-xs text-orbit-accent font-medium">
                      · {solarPhaseLabel}
                    </span>
                    <span className="text-orbit-border">·</span>
                    <span className="font-mono text-[11px] text-orbit-text-muted">
                      {formatFriendlyDate(occ.occurrenceDate)}
                    </span>
                    {occ.event.type && (
                      <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orbit-subtle/80 text-orbit-text-muted font-semibold ml-auto">
                        {occ.event.type}
                      </span>
                    )}
                  </div>

                  {/* Newsreader 2-Line Wrapped Title */}
                  <h4 className="text-base font-medium text-orbit-text leading-snug line-clamp-2 font-display">
                    {occ.event.title}
                  </h4>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
