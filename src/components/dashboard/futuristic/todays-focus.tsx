"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Check, Plus, ArrowRight, Clock, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface TodaysFocusProps {
  tasks: Task[];
  totalOpenCount: number;
  todayStr: string;
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

type FilterMode = "all" | "today";

export function TodaysFocus({
  tasks,
  totalOpenCount,
  todayStr,
  onToggleTask,
  onOpenQuickCapture,
}: TodaysFocusProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Filter tasks based on hardware switches
  const filteredTasks = useMemo(() => {
    if (filterMode === "today") {
      return tasks.filter((t) => t.dueDate === todayStr);
    }
    return tasks;
  }, [tasks, filterMode, todayStr]);

  const dueTodayCount = useMemo(() => {
    return tasks.filter((t) => t.dueDate === todayStr).length;
  }, [tasks, todayStr]);

  // Primary Focus Task (#1 Top Task) vs Remaining Tasks
  const primaryTask = filteredTasks[0] || null;
  const remainingTasks = filteredTasks.slice(1);

  return (
    <div className="space-y-4">
      {/* Clean Section Header (Zero Jargon Subtitle) */}
      <div className="flex items-center justify-between gap-3 border-b border-orbit-border/70 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-bold tracking-wider text-orbit-text uppercase">
            01 // TODAY&apos;S FOCUS
          </h2>
          <span className="font-mono text-xs text-orbit-text-muted">
            ({tasks.length}{totalOpenCount > tasks.length ? ` of ${totalOpenCount}` : ""})
          </span>
        </div>

        {/* Hardware Filter Switches */}
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer ${filterMode === "all"
              ? "bg-[#00f0ff] text-[#04111d] border-[#38bdf8] font-semibold shadow-[0_0_8px_rgba(0,240,255,0.35)]"
              : "bg-orbit-surface border-orbit-border text-orbit-text-muted hover:text-orbit-text"
              }`}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("today")}
            className={`px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer ${filterMode === "today"
              ? "bg-[#00f0ff] text-[#04111d] border-[#38bdf8] font-semibold shadow-[0_0_8px_rgba(0,240,255,0.35)]"
              : "bg-orbit-surface border-orbit-border text-orbit-text-muted hover:text-orbit-text"
              }`}
          >
            Due Today ({dueTodayCount})
          </button>

          <Link
            href="/tasks"
            className="inline-flex min-h-[44px] sm:min-h-[28px] items-center gap-1 text-orbit-accent hover:text-orbit-accent-hover transition-colors ml-2 py-1 text-xs"
          >
            <span>All tasks</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="futuristic-panel p-8 rounded-[12px] flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-[4px] bg-orbit-surface-secondary border border-orbit-border flex items-center justify-center mb-3 text-[#10b981]">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="font-mono text-xs font-bold text-orbit-text uppercase mb-1 tracking-wider">
            ALL CLEAR // NO PENDING FOCUS TASKS
          </h3>
          <p className="text-xs text-orbit-text-muted max-w-sm mb-4">
            You are fully caught up with today&apos;s focus queue. Capture a new task or take a well-deserved break.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-2 px-4 py-2 font-mono text-xs font-semibold text-orbit-text rounded-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-orbit-accent" aria-hidden />
            <span>Add a task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* ===================================================================
              PART 1: PRIMARY FOCUS CARD (TOP #1 TASK — SLEEK & MACHINED)
              =================================================================== */}
          {primaryTask && (
            <div className="futuristic-plate p-5 rounded-[12px] border-l-[3px] border-l-[#00f0ff] relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Metadata, Title, and Preview Note */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Top Row: Clean Priority & Category Tag */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {primaryTask.priority === "high" && (
                      <span className="inline-flex items-center gap-1 text-[#ef4444] font-semibold bg-[#ef4444]/10 border border-[#ef4444]/25 px-2 py-0.5 rounded-[2px] text-[11px]">
                        <AlertCircle className="h-3 w-3" />
                        P1 · High Priority
                      </span>
                    )}

                    {primaryTask.dueDate && (
                      <span className="inline-flex items-center gap-1 text-orbit-text-muted text-[11px]">
                        <Clock className="h-3 w-3 text-orbit-accent" />
                        <span>{formatFriendlyDate(primaryTask.dueDate, primaryTask.dueTime)}</span>
                      </span>
                    )}

                    {primaryTask.category && primaryTask.category !== "task" && (
                      <span className="text-orbit-accent font-medium text-[11px] uppercase tracking-wider">
                        #{primaryTask.category}
                      </span>
                    )}
                  </div>

                  {/* Task Title (Crisp, High-Contrast, Generous Whitespace) */}
                  <Link
                    href={`/tasks?taskId=${primaryTask.id}`}
                    className="block text-lg sm:text-xl font-semibold text-orbit-text hover:text-orbit-accent transition-colors leading-snug whitespace-normal break-words"
                  >
                    {primaryTask.title}
                  </Link>

                  {/* Single-line Note Preview */}
                  {primaryTask.notes && (
                    <p className="text-sm text-orbit-text-muted line-clamp-1 leading-relaxed">
                      {primaryTask.notes}
                    </p>
                  )}
                </div>

                {/* Right: Tactile Hardware Complete Focus Button */}
                <button
                  type="button"
                  onClick={() => onToggleTask(primaryTask)}
                  aria-label={`Complete focus task: ${primaryTask.title}`}
                  className="futuristic-btn-tactile futuristic-btn-tactile-primary inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-2 px-3.5 py-1.5 font-mono text-xs font-bold rounded-xs cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Complete Focus</span>
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              PART 2: REMAINING TASKS (UNIFIED MACHINED PANEL WITH DIVIDE-Y)
              Clean, sleek rows with zero callsign noise!
              =================================================================== */}
          {remainingTasks.length > 0 && (
            <div className="futuristic-panel rounded-[12px] divide-y divide-orbit-border/50 overflow-hidden">
              {remainingTasks.map((task) => {
                const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
                const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);

                return (
                  <div
                    key={task.id}
                    className="futuristic-row flex items-center justify-between gap-3 px-4 py-3 group"
                  >
                    {/* Left: Physical LED Checkbox + Task Title & Note */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Physical LED Hardware Switch Checkbox (44px tap target) */}
                      <button
                        type="button"
                        aria-label={`Mark task "${task.title}" as completed`}
                        onClick={() => onToggleTask(task)}
                        className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] items-center justify-center cursor-pointer focus-visible:outline-hidden group/btn -ml-1.5"
                      >
                        <span className="futuristic-led-checkbox" data-checked="false">
                          <Check className="h-3 w-3 stroke-[3] text-transparent group-hover/btn:text-[#00f0ff]/70 transition-colors" />
                        </span>
                      </button>

                      {/* Title & Subtle Note */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/tasks?taskId=${task.id}`}
                          className="block text-[14px] sm:text-[15px] font-medium text-orbit-text group-hover:text-orbit-accent transition-colors truncate"
                        >
                          {task.title}
                        </Link>
                        {task.notes && (
                          <p className="text-xs text-orbit-text-muted line-clamp-1">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Due Date & Priority Pill */}
                    <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
                      {isOverdue ? (
                        <span className="text-[#ef4444] font-semibold text-[11px]">
                          Overdue · {formatFriendlyDate(task.dueDate)}
                        </span>
                      ) : isDueToday ? (
                        <span className="text-[#00f0ff] font-medium text-[11px]">
                          Today{task.dueTime ? ` · ${task.dueTime}` : ""}
                        </span>
                      ) : task.dueDate ? (
                        <span className="text-orbit-text-muted text-[11px]">
                          {formatFriendlyDate(task.dueDate, task.dueTime)}
                        </span>
                      ) : null}

                      {task.priority && task.priority !== "low" && (
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase ${task.priority === "high"
                            ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                            : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30"
                            }`}
                        >
                          {task.priority === "high" ? "High" : "Med"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
