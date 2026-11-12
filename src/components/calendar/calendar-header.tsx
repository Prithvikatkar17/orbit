"use client";

import React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";
import { Button, PageHeader, SurfaceCard } from "@/components/ui";

export type CalendarViewMode = "month" | "week" | "day";

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onSelectedTypeChange: (type: string) => void;
  onNewEvent: () => void;
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  title,
  onPrev,
  onNext,
  onToday,
  searchQuery,
  onSearchChange,
  selectedType,
  onSelectedTypeChange,
  onNewEvent,
}: CalendarHeaderProps) {
  return (
    <header className="space-y-4">
      <PageHeader
        eyebrow="TIME & RHYTHM"
        icon={<CalendarIcon className="h-4 w-4" />}
        title="Calendar"
        description="Plan events, milestones, and recurring schedules in one quiet view."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={onNewEvent}
          >
            New Event
          </Button>
        }
      />

      <SurfaceCard padding="sm" className="space-y-3 p-3.5 sm:p-4">
        {/* Top Bar: Date Navigation + Active Period Title + View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-0.5">
              <button
                type="button"
                onClick={onPrev}
                className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-orbit-text-secondary hover:bg-orbit-surface hover:text-orbit-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring transition-colors"
                title="Previous"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToday}
                className="min-h-[40px] sm:min-h-[32px] rounded-lg px-3 text-xs font-semibold text-orbit-text hover:bg-orbit-surface focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={onNext}
                className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-orbit-text-secondary hover:bg-orbit-surface hover:text-orbit-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring transition-colors"
                title="Next"
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <h2 className="font-display text-lg font-semibold tracking-tight text-orbit-text sm:text-xl">
              {title}
            </h2>
          </div>

          {/* Segmented View Mode Tabs */}
          <div
            role="tablist"
            aria-label="Calendar views"
            className="flex items-center gap-1 rounded-orbit-control bg-orbit-subtle p-1"
          >
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => {
              const isSelected = viewMode === mode;
              return (
                <button
                  key={mode}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => onViewModeChange(mode)}
                  className={`min-h-[40px] sm:min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                    isSelected
                      ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                      : "text-orbit-text-secondary hover:text-orbit-text"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar: Search & Event Type Filter Chips */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-orbit-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events by title or notes..."
              aria-label="Search events by title or notes"
              className="min-h-[40px] sm:min-h-[34px] w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary py-1.5 pr-9 pl-9 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-orbit-text-muted hover:text-orbit-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onSelectedTypeChange("all")}
              className={`min-h-[36px] shrink-0 rounded-orbit-control border px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedType === "all"
                  ? "border-orbit-accent/25 bg-orbit-accent-soft text-orbit-accent font-semibold"
                  : "border-transparent text-orbit-text-secondary hover:bg-orbit-surface-secondary hover:text-orbit-text"
              }`}
            >
              All Types
            </button>
            {EVENT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectedTypeChange(t.id)}
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-orbit-control border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === t.id
                    ? "border-orbit-accent/25 bg-orbit-accent-soft text-orbit-accent font-semibold"
                    : "border-transparent text-orbit-text-secondary hover:bg-orbit-surface-secondary hover:text-orbit-text"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </SurfaceCard>
    </header>
  );
}
