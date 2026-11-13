"use client";

import React, { useState } from "react";
import { Plus, Clock, Repeat, Calendar as CalendarIcon } from "lucide-react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import { type EventOccurrence } from "@/lib/utils/recurrence";
import { formatDateDisplay, getLocalDateString } from "@/lib/utils/dates";
import { Badge, Button, EmptyState, SurfaceCard } from "@/components/ui";

interface DayViewProps {
  dateStr: string;
  isToday: boolean;
  todayStr?: string;
  occurrences: EventOccurrence[];
  onSelectEvent: (event: Event, occurrenceDate: string) => void;
  onCreateEvent: (dateStr: string, defaultTime?: string) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export function DayView({
  dateStr,
  isToday,
  todayStr = getLocalDateString(),
  occurrences,
  onSelectEvent,
  onCreateEvent,
}: DayViewProps) {
  const [showEmptySlots, setShowEmptySlots] = useState(false);

  const dayOccurrences = occurrences.filter((o) => o.occurrenceDate === dateStr);
  const allDayEvents = dayOccurrences.filter((o) => o.event.isAllDay);
  const timedEvents = dayOccurrences
    .filter((o) => !o.event.isAllDay)
    .sort((a, b) =>
      (a.event.startTime || "00:00").localeCompare(b.event.startTime || "00:00")
    );
  const isPastDay = dateStr < todayStr;

  return (
    <SurfaceCard className={`flex flex-col overflow-hidden ${showEmptySlots ? "flex-1" : ""}`}>
      {/* Day Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orbit-border bg-orbit-surface-secondary/75 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-orbit-control font-mono text-sm font-bold ${
              isToday
                ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs"
                : "bg-orbit-subtle text-orbit-text"
            }`}
          >
            {dateStr.split("-")[2]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-semibold text-orbit-text sm:text-lg">
                {formatDateDisplay(dateStr)}
              </h2>
              {isToday && <Badge variant="accent">Today</Badge>}
              {isPastDay && !isToday && <Badge variant="neutral">Past</Badge>}
            </div>
            <p className="text-xs text-orbit-text-secondary">
              {dayOccurrences.length}{" "}
              {dayOccurrences.length === 1 ? "event" : "events"} scheduled
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onCreateEvent(dateStr)}
        >
          Add Event
        </Button>
      </div>

      {/* Empty State when no events exist on this day */}
      {dayOccurrences.length === 0 ? (
        <div className="p-5 sm:p-8">
          <EmptyState
            dashed={false}
            className="border-0 py-6"
            eyebrow="DAY AGENDA"
            icon={<CalendarIcon className="h-6 w-6" />}
            title="Nothing scheduled for this day"
            description="Keep this day open for deep work, or add an event, deadline, or reminder."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => onCreateEvent(dateStr)}
                >
                  Schedule event
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmptySlots((prev) => !prev)}
                >
                  {showEmptySlots ? "Hide hourly slots" : "Browse hourly slots"}
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* All-Day Events Section */}
          {allDayEvents.length > 0 && (
            <div className="border-b border-orbit-border bg-orbit-surface-secondary/35 p-4 sm:px-6">
              <h3 className="mb-2.5 text-[11px] font-semibold tracking-wider text-orbit-text-muted uppercase">
                All-Day
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allDayEvents.map((occ) => {
                  const typeCfg =
                    EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                  return (
                    <button
                      key={`all-${occ.event.id}`}
                      type="button"
                      onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                      className={`flex min-h-[44px] items-center justify-between gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface p-3 text-left transition-colors hover:border-orbit-border-strong ${
                        isPastDay ? "opacity-70" : ""
                      }`}
                      style={{ borderLeft: `4px solid ${typeCfg.color}` }}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0 text-sm" aria-hidden="true">
                          {typeCfg.icon}
                        </span>
                        <span className="[overflow-wrap:anywhere] text-xs font-semibold text-orbit-text">
                          {occ.event.title}
                        </span>
                      </div>
                      {occ.event.recurrence && occ.event.recurrence.rule !== "none" && (
                        <Repeat className="h-3.5 w-3.5 shrink-0 text-orbit-text-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean Chronological Daily Agenda */}
          {timedEvents.length > 0 && (
            <div className="border-b border-orbit-border p-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold tracking-wider text-orbit-text-muted uppercase">
                  Daily Agenda
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmptySlots((prev) => !prev)}
                  className="min-h-[32px] text-xs font-medium text-orbit-accent hover:text-orbit-accent-hover transition-colors"
                >
                  {showEmptySlots ? "Hide hourly grid" : "Show hourly grid"}
                </button>
              </div>
              <div className="space-y-2">
                {timedEvents.map((occ) => {
                  const typeCfg =
                    EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                  return (
                    <button
                      key={`agenda-${occ.event.id}`}
                      type="button"
                      onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                      className={`flex w-full flex-col gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface p-3.5 text-left transition-colors hover:border-orbit-border-strong sm:flex-row sm:items-center sm:justify-between ${
                        isPastDay ? "opacity-70" : ""
                      }`}
                      style={{ borderLeft: `4px solid ${typeCfg.color}` }}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm" aria-hidden="true">
                            {typeCfg.icon}
                          </span>
                          <span className="[overflow-wrap:anywhere] text-sm font-semibold text-orbit-text">
                            {occ.event.title}
                          </span>
                          <Badge variant={occ.event.type === "deadline" ? "danger" : "neutral"}>
                            {typeCfg.label}
                          </Badge>
                        </div>
                        {(occ.event.notes || occ.event.description) && (
                          <p className="[overflow-wrap:anywhere] text-xs leading-relaxed text-orbit-text-secondary">
                            {occ.event.notes || occ.event.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-orbit-text-muted tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {occ.event.startTime || "00:00"}
                            {occ.event.endTime ? ` – ${occ.event.endTime}` : ""}
                          </span>
                        </span>
                        {occ.event.recurrence && occ.event.recurrence.rule !== "none" && (
                          <Repeat className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {timedEvents.length === 0 && !showEmptySlots && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <p className="text-xs text-orbit-text-muted">
                No timed events scheduled for this day.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEmptySlots(true)}
              >
                Browse hourly slots
              </Button>
            </div>
          )}
        </>
      )}

      {/* Interactive Hourly Timeline (toggled on empty days or alongside agenda) */}
      {showEmptySlots && (
        <div className="max-h-[540px] flex-1 divide-y divide-orbit-border/60 overflow-y-auto">
          {HOURS.map((hour) => {
            const hourStr = String(hour).padStart(2, "0") + ":00";
            const matchingEvents = timedEvents.filter((occ) => {
              const sTime = occ.event.startTime || "00:00";
              const eventHour = parseInt(sTime.split(":")[0], 10);
              return eventHour === hour;
            });

            return (
              <div
                key={hour}
                className="group flex min-h-[60px] transition-colors hover:bg-orbit-surface-secondary/50"
              >
                <div className="w-16 sm:w-20 shrink-0 border-r border-orbit-border p-3 text-right font-mono text-xs font-medium text-orbit-text-muted tabular-nums select-none">
                  {hourStr}
                </div>

                <div
                  onClick={() => onCreateEvent(dateStr, hourStr)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 p-2"
                >
                  {matchingEvents.length === 0 ? (
                    <div className="hidden items-center py-1 text-[11px] italic text-orbit-text-muted group-hover:flex">
                      + Click to add event at {hourStr}
                    </div>
                  ) : (
                    matchingEvents.map((occ) => {
                      const typeCfg =
                        EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                      return (
                        <button
                          key={`day-timed-${occ.event.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(occ.event, occ.occurrenceDate);
                          }}
                          className="flex items-center justify-between gap-3 rounded-orbit-control border border-orbit-border bg-orbit-surface p-2.5 text-left hover:border-orbit-border-strong transition-colors"
                          style={{ borderLeft: `4px solid ${typeCfg.color}` }}
                        >
                          <span className="truncate text-xs font-semibold text-orbit-text">
                            {typeCfg.icon} {occ.event.title}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-orbit-text-muted tabular-nums">
                            {occ.event.startTime}
                            {occ.event.endTime ? ` – ${occ.event.endTime}` : ""}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SurfaceCard>
  );
}
