"use client";

import React, { useState } from "react";
import { Plus, X, Repeat } from "lucide-react";
import { type Event } from "@/lib/schemas/event";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import {
  type EventOccurrence,
  getMonthCalendarGrid,
} from "@/lib/utils/recurrence";
import { formatDateDisplay } from "@/lib/utils/dates";
import { Button, SurfaceCard } from "@/components/ui";

interface MonthViewProps {
  year: number;
  month: number; // 1-12
  todayStr: string;
  selectedDateStr?: string;
  onSelectDate?: (dateStr: string) => void;
  occurrences: EventOccurrence[];
  weekStartsOn?: "monday" | "sunday";
  onSelectEvent: (event: Event, occurrenceDate: string) => void;
  onCreateEvent: (dateStr: string) => void;
}

export function MonthView({
  year,
  month,
  todayStr,
  selectedDateStr,
  onSelectDate,
  occurrences,
  weekStartsOn = "monday",
  onSelectEvent,
  onCreateEvent,
}: MonthViewProps) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(todayStr);
  const [dayOverflowPopover, setDayOverflowPopover] = useState<{
    dateStr: string;
    events: EventOccurrence[];
  } | null>(null);

  const activeSelectedDate = selectedDateStr || internalSelectedDate;
  const handleSelectDate = (dateStr: string) => {
    setInternalSelectedDate(dateStr);
    onSelectDate?.(dateStr);
  };

  const grid = getMonthCalendarGrid(year, month, todayStr, weekStartsOn);

  // Group occurrences by date string
  const eventsByDate = new Map<string, EventOccurrence[]>();
  for (const occ of occurrences) {
    const list = eventsByDate.get(occ.occurrenceDate) || [];
    list.push(occ);
    eventsByDate.set(occ.occurrenceDate, list);
  }

  const weekHeaders =
    weekStartsOn === "monday"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MAX_VISIBLE_EVENTS = 3;
  const selectedDayEvents = eventsByDate.get(activeSelectedDate) || [];

  return (
    <SurfaceCard className="@container flex flex-1 flex-col overflow-hidden">
      {/* Day of Week Header */}
      <div className="grid grid-cols-7 border-b border-orbit-border bg-orbit-surface-secondary/75 text-center">
        {weekHeaders.map((dayName, idx) => {
          const isWeekend =
            weekStartsOn === "monday" ? idx >= 5 : idx === 0 || idx === 6;
          return (
            <div
              key={dayName}
              className={`py-2.5 text-[11px] font-semibold tracking-wider uppercase ${
                isWeekend ? "text-orbit-text-muted" : "text-orbit-text-secondary"
              }`}
            >
              <span className="sm:hidden">{dayName.slice(0, 1)}</span>
              <span className="hidden sm:inline">{dayName}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="grid flex-1 grid-cols-7 divide-x divide-y divide-orbit-border/60 md:auto-rows-fr">
        {grid.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateStr) || [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);
          const isSelected = activeSelectedDate === cell.dateStr;
          const isPast = cell.dateStr < todayStr;

          return (
            <div
              key={cell.dateStr}
              onClick={() => handleSelectDate(cell.dateStr)}
              className={`group relative flex min-h-[54px] flex-col p-1 transition-colors select-none md:min-h-[108px] md:p-2 ${
                cell.isCurrentMonth
                  ? "bg-orbit-surface hover:bg-orbit-surface-secondary/50"
                  : "bg-orbit-surface-secondary/55 text-orbit-text-muted"
              } ${
                cell.isToday
                  ? "bg-orbit-accent-soft/20"
                  : isSelected
                  ? "ring-1 ring-inset ring-orbit-accent/45 bg-orbit-accent-soft/10"
                  : ""
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-center md:justify-between md:mb-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectDate(cell.dateStr);
                  }}
                  aria-label={`Select ${cell.dateStr}`}
                  aria-pressed={isSelected}
                  className={`flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-full text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                    cell.isToday
                      ? "bg-orbit-accent font-bold text-orbit-accent-fg shadow-orbit-xs"
                      : isSelected
                      ? "bg-orbit-subtle font-semibold text-orbit-text ring-1 ring-orbit-accent/40"
                      : cell.isCurrentMonth
                      ? "text-orbit-text hover:bg-orbit-subtle"
                      : "text-orbit-text-muted/70 hover:bg-orbit-subtle/60"
                  }`}
                >
                  {cell.dayNumber}
                </button>

                {/* Quick Add Button on Hover (desktop) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateEvent(cell.dateStr);
                  }}
                  className="hidden h-7 w-7 items-center justify-center rounded-lg text-orbit-text-muted opacity-0 transition-opacity hover:bg-orbit-subtle hover:text-orbit-text group-hover:opacity-100 group-focus-within:opacity-100 md:flex"
                  title={`Add event on ${cell.dateStr}`}
                  aria-label={`Add event on ${cell.dateStr}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Compact Mobile Dot Indicators (< 768px) */}
              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex items-center justify-center gap-0.5 md:hidden">
                  {dayEvents.slice(0, 3).map((occ) => {
                    const typeCfg =
                      EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                    return (
                      <span
                        key={`dot-${occ.event.id}-${occ.occurrenceDate}`}
                        className={`h-1.5 w-1.5 rounded-full ${isPast ? "opacity-50" : ""}`}
                        style={{ backgroundColor: typeCfg.color }}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-orbit-accent leading-none">
                      +
                    </span>
                  )}
                </div>
              )}

              {/* Desktop Event Chips List (>= 768px) */}
              <div className="hidden flex-1 space-y-1 overflow-hidden md:block">
                {visibleEvents.map((occ) => {
                  const typeCfg =
                    EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                  return (
                    <button
                      key={`${occ.event.id}-${occ.occurrenceDate}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(occ.event, occ.occurrenceDate);
                      }}
                      className={`flex w-full items-center gap-1.5 truncate rounded-md border border-orbit-border/50 bg-orbit-surface-secondary/90 px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors hover:border-orbit-border-strong hover:bg-orbit-subtle ${
                        isPast ? "opacity-65" : ""
                      }`}
                      style={{
                        borderLeft: `3px solid ${typeCfg.color}`,
                      }}
                      title={`${occ.event.title} (${
                        occ.event.isAllDay ? "All day" : occ.event.startTime
                      })`}
                    >
                      <span className="shrink-0 text-[10px]" aria-hidden="true">
                        {typeCfg.icon}
                      </span>
                      <span className="truncate font-medium text-orbit-text">
                        {occ.event.title}
                      </span>
                      {!occ.event.isAllDay && occ.event.startTime && (
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-orbit-text-muted tabular-nums">
                          {occ.event.startTime}
                        </span>
                      )}
                    </button>
                  );
                })}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayOverflowPopover({
                        dateStr: cell.dateStr,
                        events: dayEvents,
                      });
                    }}
                    className="w-full rounded px-1.5 py-0.5 text-left text-[10px] font-semibold text-orbit-accent hover:bg-orbit-accent-soft/50 transition-colors"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected-Day Editorial Agenda Panel for Mobile (< 768px) */}
      <div className="border-t border-orbit-border bg-orbit-surface-secondary/45 p-4 md:hidden">
        <div className="flex items-center justify-between gap-2 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-orbit-accent uppercase">
              {activeSelectedDate === todayStr ? "Today's Agenda" : "Selected Day"}
            </p>
            <h3 className="font-display text-base font-semibold text-orbit-text">
              {formatDateDisplay(activeSelectedDate)}
            </h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => onCreateEvent(activeSelectedDate)}
          >
            Add
          </Button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p className="py-2 text-xs text-orbit-text-muted">
            No events scheduled for this day.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((occ) => {
              const typeCfg =
                EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
              const isPast = occ.occurrenceDate < todayStr;
              return (
                <button
                  key={`mobile-${occ.event.id}-${occ.occurrenceDate}`}
                  type="button"
                  onClick={() => onSelectEvent(occ.event, occ.occurrenceDate)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2.5 text-left transition-colors hover:border-orbit-border-strong ${
                    isPast ? "opacity-70" : ""
                  }`}
                  style={{ borderLeft: `3px solid ${typeCfg.color}` }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-sm" aria-hidden="true">
                      {typeCfg.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="[overflow-wrap:anywhere] text-xs font-semibold text-orbit-text">
                        {occ.event.title}
                      </p>
                      <p className="font-mono text-[11px] text-orbit-text-muted">
                        {occ.event.isAllDay
                          ? "All day"
                          : `${occ.event.startTime || "00:00"}${
                              occ.event.endTime ? ` – ${occ.event.endTime}` : ""
                            }`}
                      </p>
                    </div>
                  </div>
                  {occ.event.recurrence && occ.event.recurrence.rule !== "none" && (
                    <Repeat className="h-3.5 w-3.5 shrink-0 text-orbit-text-muted" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Overflow Popover Modal */}
      {dayOverflowPopover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-2xs"
          onClick={() => setDayOverflowPopover(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-overflow-title"
            className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-orbit-card border border-orbit-border bg-orbit-surface-elevated p-4 sm:p-5 shadow-orbit-elevated animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-orbit-border">
              <h3 id="month-overflow-title" className="font-display text-base font-semibold text-orbit-text">
                {formatDateDisplay(dayOverflowPopover.dateStr)}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setDayOverflowPopover(null)}
                className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {dayOverflowPopover.events.map((occ) => {
                const typeCfg =
                  EVENT_TYPE_MAP[occ.event.type] || EVENT_TYPE_MAP.general;
                return (
                  <button
                    key={`pop-${occ.event.id}-${occ.occurrenceDate}`}
                    type="button"
                    onClick={() => {
                      setDayOverflowPopover(null);
                      onSelectEvent(occ.event, occ.occurrenceDate);
                    }}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-2.5 text-left text-xs hover:border-orbit-border-strong hover:bg-orbit-subtle transition-colors"
                    style={{ borderLeft: `3px solid ${typeCfg.color}` }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true">{typeCfg.icon}</span>
                      <span className="[overflow-wrap:anywhere] font-semibold text-orbit-text">
                        {occ.event.title}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-orbit-text-muted">
                      {occ.event.isAllDay ? "All day" : occ.event.startTime}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                const target = dayOverflowPopover.dateStr;
                setDayOverflowPopover(null);
                onCreateEvent(target);
              }}
              className="w-full"
            >
              Add Event on this day
            </Button>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
