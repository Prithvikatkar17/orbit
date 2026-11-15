"use client";

import React, { useState, useMemo } from "react";
import { Check } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface SwissFocusLedgerProps {
  openTasks: Task[];
  dueTodayTasks: Task[];
  todayStr: string | null;
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

export function SwissFocusLedger({
  openTasks,
  dueTodayTasks,
  todayStr,
  onToggleTask,
  onOpenQuickCapture,
}: SwissFocusLedgerProps) {
  const [filter, setFilter] = useState<"all" | "today">("all");

  const displayedTasks = useMemo(() => {
    const list = filter === "today" ? dueTodayTasks : openTasks;
    const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

    return [...list]
      .sort((a, b) => {
        const aOverdue = Boolean(a.dueDate && todayStr && a.dueDate < todayStr);
        const bOverdue = Boolean(b.dueDate && todayStr && b.dueDate < todayStr);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        const aToday = Boolean(a.dueDate && todayStr && a.dueDate === todayStr);
        const bToday = Boolean(b.dueDate && todayStr && b.dueDate === todayStr);
        if (aToday !== bToday) return aToday ? -1 : 1;

        const pDiff = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
        if (pDiff !== 0) return pDiff;

        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      })
      .slice(0, 10);
  }, [filter, openTasks, dueTodayTasks, todayStr]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Swiss Margin Index (2 cols on lg) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex lg:flex-col items-baseline lg:items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tabular-nums text-orbit-text">
              01
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-orbit-text-muted font-medium">
              FOCUS
            </span>
          </div>

          {/* Filter Toggles */}
          <div className="flex lg:flex-col items-center lg:items-start gap-3 lg:gap-2 pt-1 lg:pt-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`text-xs font-mono uppercase tracking-wider inline-flex items-center transition-colors ${
                filter === "all"
                  ? "text-orbit-text font-semibold"
                  : "text-orbit-text-muted hover:text-orbit-text"
              }`}
            >
              {filter === "all" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00] mr-2 inline-block shrink-0" />
              )}
              All ({openTasks.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter("today")}
              className={`text-xs font-mono uppercase tracking-wider inline-flex items-center transition-colors ${
                filter === "today"
                  ? "text-orbit-text font-semibold"
                  : "text-orbit-text-muted hover:text-orbit-text"
              }`}
            >
              {filter === "today" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00] mr-2 inline-block shrink-0" />
              )}
              Today ({dueTodayTasks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Right Open Architectural Ledger (10 cols on lg) */}
      <div className="lg:col-span-10">
        {displayedTasks.length === 0 ? (
          <div className="py-12 text-center border-b border-orbit-border space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-orbit-text-muted">
              00 — NO ACTIVE ITEMS IN LEDGER
            </p>
            <button
              type="button"
              onClick={onOpenQuickCapture}
              className="text-xs font-mono uppercase tracking-wider text-orbit-accent hover:underline"
            >
              + Create First Entry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-orbit-border border-b border-orbit-border">
            {displayedTasks.map((task, idx) => {
              const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
              const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);
              const isP1 = task.priority === "high";
              const isDone = task.status === "completed";

              // Formatting due time / date
              const timeDisplay = isOverdue
                ? "OVERDUE"
                : isDueToday
                ? "TODAY"
                : task.dueDate
                ? formatFriendlyDate(task.dueDate)
                : "OPEN";

              const tag = task.tags?.[0] || task.category || "GENERAL";

              return (
                <div
                  key={task.id}
                  className="py-3.5 hover:bg-orbit-subtle/50 transition-colors group flex items-center gap-2 sm:gap-3 md:gap-4 px-1"
                >
                  {/* 1. Index & Precision Checkbox */}
                  <div className="w-12 sm:w-14 shrink-0 flex items-center gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      aria-label={isDone ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                      onClick={() => onToggleTask(task)}
                      className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors shrink-0 ${
                        isDone
                          ? "bg-orbit-text border-orbit-text text-orbit-bg"
                          : "border-orbit-text/40 group-hover:border-orbit-text bg-transparent"
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                    <span className="tabular-nums text-xs font-mono text-orbit-text-muted">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* 2. Task Title & Brief */}
                  <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                    <span
                      className={`text-[14px] sm:text-[15px] font-medium tracking-tight truncate block ${
                        isDone ? "line-through text-orbit-text-muted" : "text-orbit-text"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.notes && (
                      <span className="font-normal text-orbit-text-muted text-xs line-clamp-1 mt-0.5 leading-tight block">
                        {task.notes}
                      </span>
                    )}
                  </div>

                  {/* 3. Tag / Domain */}
                  <div className="w-20 md:w-28 shrink-0 hidden md:block text-left">
                    <span className="text-[10px] tracking-[0.18em] text-orbit-text-muted font-mono uppercase truncate block">
                      {tag}
                    </span>
                  </div>

                  {/* 4. Temporal & Signal Column */}
                  <div className="w-20 sm:w-28 md:w-36 shrink-0 text-right tabular-nums flex items-center justify-end gap-1.5 sm:gap-2">
                    <span
                      className={`text-xs font-mono uppercase ${
                        isOverdue
                          ? "text-[#ff3b00] font-semibold"
                          : isDueToday
                          ? "text-orbit-text font-medium"
                          : "text-orbit-text-muted"
                      }`}
                    >
                      {timeDisplay}
                    </span>

                    {/* International Signal Orange Dot for P1 or Overdue */}
                    {(isP1 || isOverdue) && !isDone && (
                      <span
                        title={isOverdue ? "Overdue Task" : "High Priority (P1)"}
                        className="w-1.5 h-1.5 rounded-full bg-[#ff3b00] shrink-0"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
