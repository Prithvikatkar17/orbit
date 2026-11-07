"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";

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
    <div className="flex flex-col gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
      {/* Top Row: Title, Nav, View Toggle, New Event Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>

        {/* View mode toggle & Action */}
        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <button
            type="button"
            onClick={onNewEvent}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Second Row: Search & Type Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events by title or notes..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Pills / Dropdown */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectedTypeChange("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
              selectedType === "all"
                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            All Types
          </button>
          {EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectedTypeChange(t.id)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
                selectedType === t.id
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
