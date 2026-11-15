"use client";

import React, { useState, useMemo } from "react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface OrbitalFocusProps {
  tasks: Task[];
  openTasks: Task[];
  dueTodayTasks: Task[];
  focusTasks: Task[];
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

export function OrbitalFocus(props: OrbitalFocusProps) {
  const { openTasks, dueTodayTasks, focusTasks, onToggleTask, onOpenQuickCapture } = props;
  const [activeFilter, setActiveFilter] = useState<"all" | "today">("all");

  // Determine Primary Perihelion Focus task
  const primaryTask = useMemo(() => {
    if (focusTasks.length > 0) return focusTasks[0];
    if (dueTodayTasks.length > 0) return dueTodayTasks[0];
    if (openTasks.length > 0) return openTasks[0];
    return null;
  }, [focusTasks, dueTodayTasks, openTasks]);

  // Secondary tasks: remaining open tasks excluding the primary
  const secondaryTasks = useMemo(() => {
    const list = activeFilter === "today" ? dueTodayTasks : openTasks;
    if (!primaryTask) return list;
    return list.filter((t) => t.id !== primaryTask.id);
  }, [activeFilter, dueTodayTasks, openTasks, primaryTask]);

  return (
    <section className="space-y-5" aria-label="Orbital Focus and Gravity Well">
      {/* Section Header with Pill Filter Toggles */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="font-serif italic text-sm text-[#818cf8] dark:text-[#a5b4fc] font-semibold">
            I.
          </span>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-semibold text-orbit-text">
            ORBITAL FOCUS & GRAVITY WELL
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex items-center rounded-full border border-orbit-border/70 bg-orbit-subtle/50 p-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              activeFilter === "all"
                ? "bg-orbit-surface text-orbit-text shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            All Orbits ({openTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("today")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              activeFilter === "today"
                ? "bg-orbit-surface text-orbit-text shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            Perihelion Today ({dueTodayTasks.length})
          </button>
        </div>
      </div>

      {openTasks.length === 0 ? (
        <div className="midnight-observatory-card p-10 text-center space-y-3">
          <p className="font-display italic text-lg text-orbit-text">
            All celestial bodies have completed their orbital transit.
          </p>
          <p className="text-xs text-orbit-text-muted font-mono uppercase tracking-wider">
            NO ACTIVE CELESTIAL PERIHELION DETECTED
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenQuickCapture}
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-[#818cf8]/40 hover:border-[#818cf8] text-[#818cf8] hover:bg-[#818cf8]/10 transition-colors"
            >
              + Chart New Orbital Trajectory
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Part 1: Primary Perihelion Hero Card */}
          {primaryTask && (
            <div className="midnight-hero-task-card p-6 md:p-7 relative overflow-hidden space-y-4">
              {/* Subtle Celestial Ring Background Watermark */}
              <div className="absolute -right-8 -bottom-10 w-48 h-48 pointer-events-none opacity-[0.06] text-orbit-text">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="50" cy="50" r="46" strokeDasharray="2 3" />
                  <circle cx="50" cy="50" r="34" />
                  <circle cx="50" cy="50" r="20" strokeDasharray="1 2" />
                  <line x1="50" y1="0" x2="50" y2="100" />
                  <line x1="0" y1="50" x2="100" y2="50" />
                </svg>
              </div>

              {/* Eyebrow & Timing Row */}
              <div className="flex items-center justify-between gap-3 relative z-10 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-semibold border border-[#eab308]/40 bg-[#eab308]/15 text-[#b48327] dark:text-[#facc15]">
                    MAGNITUDE I · PERIHELION FOCUS
                  </span>
                  {primaryTask.category && (
                    <span className="italic font-serif text-xs text-[#818cf8] dark:text-[#a5b4fc]">
                      #{primaryTask.category}
                    </span>
                  )}
                </div>

                <span className="font-mono text-xs text-orbit-text-muted">
                  {primaryTask.dueDate
                    ? `Transit ${formatFriendlyDate(primaryTask.dueDate)}`
                    : "Continuous Orbit"}
                </span>
              </div>

              {/* Title & Notes */}
              <div className="space-y-2 relative z-10">
                <h3 className="text-xl md:text-2xl font-normal leading-snug font-display text-orbit-text">
                  {primaryTask.title}
                </h3>
                {primaryTask.notes && (
                  <p className="text-xs md:text-sm text-orbit-text-muted leading-relaxed max-w-2xl">
                    {primaryTask.notes}
                  </p>
                )}
              </div>

              {/* Tactile Astrolabe Completion Pill Button */}
              <div className="pt-2 relative z-10 flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onToggleTask(primaryTask)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-semibold bg-[#4338ca] hover:bg-[#3730a3] text-[#ffffff] border border-[#818cf8]/50 shadow-[0_4px_14px_rgba(67,56,202,0.35)] transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {/* 4-Point Star Icon */}
                  <svg className="w-3.5 h-3.5 text-[#eab308]" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z" />
                  </svg>
                  <span>Lock Alignment</span>
                </button>

                <span className="font-mono text-[10px] uppercase tracking-widest text-orbit-text-muted">
                  PERIHELION MASS · 1.00 M☉
                </span>
              </div>
            </div>
          )}

          {/* Part 2: 2-Column Bento Plates for Remaining Orbits */}
          {secondaryTasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {secondaryTasks.map((task, idx) => {
                const isOverdue = task.dueDate && task.dueDate < (new Date().toISOString().slice(0, 10));
                const isDueToday = task.dueDate && task.dueDate === (new Date().toISOString().slice(0, 10));

                let magnitudeBadge = "MAGNITUDE III · OUTER ORBIT";
                let badgeStyle = "border-orbit-border bg-orbit-subtle/50 text-orbit-text-muted";

                if (task.priority === "high" || isOverdue) {
                  magnitudeBadge = isOverdue ? "MAGNITUDE I · APHELION DRIFT" : "MAGNITUDE I · CRITICAL";
                  badgeStyle = "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#ef4444] dark:text-[#f87171]";
                } else if (task.priority === "medium" || isDueToday) {
                  magnitudeBadge = "MAGNITUDE II · INNER ORBIT";
                  badgeStyle = "border-[#818cf8]/40 bg-[#818cf8]/15 text-[#818cf8] dark:text-[#a5b4fc]";
                }

                return (
                  <div
                    key={task.id}
                    className="midnight-observatory-card p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      {/* Magnitude & Timing */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border ${badgeStyle}`}>
                          {magnitudeBadge}
                        </span>
                        <span className="font-mono text-[11px] text-orbit-text-muted">
                          {isDueToday
                            ? `Today · ${task.dueTime || "14:00"}`
                            : task.dueDate
                            ? formatFriendlyDate(task.dueDate)
                            : "Perennial Orbit"}
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

                    {/* Bottom Action: Orbital Ring Checkbox */}
                    <div className="flex items-center justify-between pt-1 border-t border-orbit-border/50">
                      {task.category ? (
                        <span className="italic font-serif text-xs text-[#818cf8] dark:text-[#a5b4fc]">
                          #{task.category}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-orbit-text-muted">
                          BODY #{String(idx + 2).padStart(2, "0")}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className="ml-auto w-7 h-7 rounded-full border border-orbit-border hover:border-[#818cf8] bg-orbit-subtle/30 hover:bg-[#818cf8]/15 flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer group"
                        aria-label={`Mark task ${task.title} complete`}
                      >
                        {/* Orbital Double-Ring Satellite Checkbox */}
                        <svg
                          className="w-4 h-4 text-orbit-text-muted/50 group-hover:text-[#818cf8] transition-colors"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
                          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="16" cy="10" r="1.5" fill="currentColor" />
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
