"use client";

import React, { useState, useMemo } from "react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface HerbariumSpecimensProps {
  openTasks: Task[];
  dueTodayTasks: Task[];
  focusTasks: Task[];
  todayStr: string | null;
  onToggleTask: (task: Task) => Promise<void>;
}

export function HerbariumSpecimens({
  openTasks,
  dueTodayTasks,
  focusTasks,
  todayStr,
  onToggleTask,
}: HerbariumSpecimensProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "harvest">("all");

  const displayedTasks = activeFilter === "harvest" ? dueTodayTasks : focusTasks;

  // Split into primary feature task (first item) and courtyard tasks (remaining items)
  const primaryTask = useMemo(() => displayedTasks[0] || null, [displayedTasks]);
  const courtyardTasks = useMemo(() => displayedTasks.slice(1), [displayedTasks]);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orbit-border">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-orbit-accent tracking-wider uppercase">
            I.
          </span>
          <h2 className="font-display font-medium text-lg tracking-tight text-orbit-text">
            THE TERRACED COURTYARD & CULTIVATION
          </h2>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-orbit-subtle/50 rounded-full border border-orbit-border text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-orbit-surface text-orbit-text font-medium shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            All Cultivations ({openTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("harvest")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeFilter === "harvest"
                ? "bg-orbit-surface text-orbit-text font-medium shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            Today&apos;s Harvest ({dueTodayTasks.length})
          </button>
        </div>
      </div>

      {displayedTasks.length === 0 ? (
        <div className="naturalist-limestone-card p-8 text-center space-y-2">
          <svg
            className="w-8 h-8 mx-auto text-orbit-accent/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          <p className="font-display italic text-base text-orbit-text">
            The terraced courtyard rests. All earth cultivations complete.
          </p>
          <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
            Field observations recorded in sanctuary ledger
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Primary Feature Earth Pavilion Card (Top Full-Width) */}
          {primaryTask && (
            <div className="naturalist-clay-card p-6 md:p-7 relative overflow-hidden shadow-md">
              {/* Subtle Botanical Watermark */}
              <svg
                className="absolute -right-6 -bottom-8 w-56 h-56 text-[#b85a3a] opacity-10 pointer-events-none select-none"
                viewBox="0 0 160 160"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 140 C 50 110, 75 70, 130 20" strokeLinecap="round" />
                <path d="M50 110 C 40 95, 55 85, 70 100" />
                <path d="M65 100 C 85 90, 95 105, 78 112" />
                <path d="M80 85 C 70 65, 85 55, 100 70" />
                <path d="M95 70 C 115 60, 125 75, 108 82" />
              </svg>

              <div className="relative z-10 space-y-3">
                {/* Eyebrow & Badges */}
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#b85a3a]/15 text-[#b85a3a] dark:text-[#d97757] font-semibold border border-[#b85a3a]/30">
                    RIPE FOR HARVEST · PRIMARY CULTIVATION
                  </span>
                  {primaryTask.category && (
                    <span className="italic font-serif text-xs text-orbit-accent">
                      #{primaryTask.category}
                    </span>
                  )}
                  <span className="font-mono text-xs text-orbit-text-muted ml-auto">
                    {primaryTask.dueDate && todayStr && primaryTask.dueDate === todayStr
                      ? primaryTask.dueTime
                        ? `Due today · ${primaryTask.dueTime}`
                        : "Due today · All day"
                      : primaryTask.dueDate
                      ? `Due ${formatFriendlyDate(primaryTask.dueDate)}`
                      : "Ongoing Cultivation"}
                  </span>
                </div>

                {/* Newsreader 22px Title */}
                <h3 className="text-xl md:text-2xl font-serif font-medium leading-snug text-orbit-text">
                  {primaryTask.title}
                </h3>

                {/* Notes */}
                {primaryTask.notes && (
                  <p className="text-sm text-orbit-text-secondary leading-relaxed">
                    {primaryTask.notes}
                  </p>
                )}

                {/* River-Stone Completion Pill Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onToggleTask(primaryTask)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#b85a3a] text-white font-medium text-xs hover:bg-[#a04e30] transition-all shadow-xs cursor-pointer group"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-white/90 group-hover:scale-110 transition-transform"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 14 C 4 9, 8 7, 14 2" />
                      <path d="M8 7 C 9 4, 12 3, 14 2" />
                    </svg>
                    <span>Harvest / Complete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Remaining Tasks in 2-Column Bento Courtyard */}
          {courtyardTasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courtyardTasks.map((task) => {
                const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
                const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);
                const isUrgent = task.priority === "high" || isOverdue;
                const isCore = task.priority === "medium" || isDueToday;

                let cardClass = "naturalist-limestone-card";
                let badgeClass = "bg-[#d99b3b]/15 text-[#d99b3b] border-[#d99b3b]/30";
                let badgeLabel = "Limestone · Study";

                if (isUrgent) {
                  cardClass = "naturalist-clay-card";
                  badgeClass = "bg-[#b85a3a]/15 text-[#b85a3a] dark:text-[#d97757] border-[#b85a3a]/30";
                  badgeLabel = isOverdue ? "Red Clay · Overdue" : "Red Clay · Urgent";
                } else if (isCore) {
                  cardClass = "naturalist-moss-card";
                  badgeClass = "bg-[#2e593d]/15 text-[#2e593d] dark:text-[#68a87b] border-[#2e593d]/30";
                  badgeLabel = "Canopy Moss · Core";
                }

                return (
                  <div
                    key={task.id}
                    className={`${cardClass} p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-3`}
                  >
                    <div className="space-y-2">
                      {/* Badge & Timing */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                        <span className="font-mono text-[11px] text-orbit-text-muted">
                          {isDueToday
                            ? task.dueTime
                              ? `Today · ${task.dueTime}`
                              : "Today · All day"
                            : task.dueDate
                            ? formatFriendlyDate(task.dueDate)
                            : "Perennial"}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-medium leading-snug font-display text-orbit-text line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Notes */}
                      {task.notes && (
                        <p className="text-xs text-orbit-text-muted line-clamp-2 leading-relaxed">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action: Seed Checkbox */}
                    <div className="flex items-center justify-between pt-1 border-t border-orbit-border/50">
                      {task.category && (
                        <span className="italic font-serif text-xs text-orbit-accent">
                          #{task.category}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className="ml-auto w-7 h-7 rounded-tl-[12px] rounded-br-[12px] rounded-tr-[5px] rounded-bl-[5px] border border-orbit-border hover:border-orbit-accent bg-orbit-subtle/30 hover:bg-orbit-accent/10 flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer group"
                        aria-label={`Mark task ${task.title} complete`}
                      >
                        <svg
                          className="w-3.5 h-3.5 text-orbit-text-muted/40 group-hover:text-orbit-accent transition-colors"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 13 C 5 9, 8 7, 13 3" />
                          <path d="M8 7 C 9 5, 11 5, 13 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
