"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight, Plus, AlertCircle, Clock } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface TodaysFocusProps {
  tasks: Task[];
  totalOpenCount: number;
  todayStr: string;
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

export function TodaysFocus({
  tasks,
  totalOpenCount,
  todayStr,
  onToggleTask,
  onOpenQuickCapture,
}: TodaysFocusProps) {
  return (
    <section className="futuristic-panel flex flex-col">
      {/* Section Header */}
      <div className="futuristic-panel-header flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-orbit-accent" aria-hidden />
          <h2 className="font-sans text-base font-bold text-orbit-text tracking-tight">
            Today&apos;s Focus
          </h2>
          {totalOpenCount > 0 && (
            <span className="font-mono text-xs text-orbit-text-muted">
              ({tasks.length} of {totalOpenCount})
            </span>
          )}
        </div>

        <Link
          href="/tasks"
          className="inline-flex min-h-[44px] sm:min-h-[32px] items-center gap-1 font-mono text-xs font-semibold text-orbit-accent hover:text-orbit-accent-hover transition-colors py-1"
        >
          <span>All tasks</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-xs border border-orbit-border bg-orbit-surface-secondary flex items-center justify-center mb-3 text-orbit-success">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-orbit-text mb-1">
            All clear for today
          </h3>
          <p className="text-xs text-orbit-text-muted max-w-sm mb-4">
            You have no pending tasks in your focus queue. Capture a thought or plan ahead for tomorrow.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="futuristic-btn-tactile futuristic-btn-tactile-secondary inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 px-3.5 py-1.5 font-sans text-xs font-medium text-orbit-text rounded-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Add a task</span>
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-orbit-border/50">
          {tasks.map((task) => {
            const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
            const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);

            return (
              <li
                key={task.id}
                className="futuristic-row group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* Physical LED Hardware Switch Checkbox with 44px tap target */}
                  <button
                    type="button"
                    aria-label={`Mark task "${task.title}" as completed`}
                    onClick={() => onToggleTask(task)}
                    className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] -ml-2.5 -mt-1 items-center justify-center cursor-pointer focus-visible:outline-hidden group/btn"
                  >
                    <span className="futuristic-led-checkbox" data-checked="false">
                      <Check className="h-3 w-3 stroke-[3] text-transparent group-hover/btn:text-[#00f0ff]/60 transition-colors" />
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks?taskId=${task.id}`}
                      className="block text-sm sm:text-[15px] font-medium text-orbit-text hover:text-orbit-accent transition-colors line-clamp-2 [overflow-wrap:anywhere]"
                    >
                      {task.title}
                    </Link>

                    {/* Contextual Information Row (rendered only when meaningful) */}
                    {(task.dueDate || task.priority === "high" || task.category !== "task") && (
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-orbit-danger">
                            <AlertCircle className="h-3 w-3" />
                            <span>Overdue · {formatFriendlyDate(task.dueDate)}</span>
                          </span>
                        )}

                        {isDueToday && (
                          <span className="font-mono text-[11px] font-medium text-orbit-accent">
                            Due today{task.dueTime ? ` at ${task.dueTime}` : ""}
                          </span>
                        )}

                        {!isOverdue && !isDueToday && task.dueDate && (
                          <span className="font-mono text-[11px] text-orbit-text-muted">
                            {formatFriendlyDate(task.dueDate, task.dueTime)}
                          </span>
                        )}

                        {task.priority === "high" && (
                          <span className="px-1.5 py-0.2 bg-orbit-danger/10 border border-orbit-danger/30 text-orbit-danger rounded-2xs font-mono text-[10px] font-bold">
                            High
                          </span>
                        )}

                        {task.category && task.category !== "task" && (
                          <span className="text-orbit-text-muted font-mono text-[11px]">
                            #{task.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side inspect cue */}
                <div className="sm:shrink-0 flex items-center justify-end pl-8 sm:pl-0">
                  <Link
                    href={`/tasks?taskId=${task.id}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity font-mono text-[11px] text-orbit-text-muted hover:text-orbit-accent flex items-center gap-1 py-1"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
