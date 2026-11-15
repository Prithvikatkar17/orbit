"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Check, ArrowRight, Plus } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface CuratedFocusProps {
  tasks: Task[];
  todayStr: string;
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

export function CuratedFocus({
  tasks,
  todayStr,
  onToggleTask,
  onOpenQuickCapture,
}: CuratedFocusProps) {
  const [filterMode, setFilterMode] = useState<"all" | "today">("all");

  const filteredTasks = useMemo(() => {
    if (filterMode === "today") {
      return tasks.filter((t) => t.dueDate && t.dueDate <= todayStr);
    }
    return tasks;
  }, [tasks, filterMode, todayStr]);

  const leadTask = filteredTasks[0] ?? null;
  const remainingTasks = filteredTasks.slice(1);

  return (
    <section className="space-y-6">
      {/* Section Header & Minimalist Filter Tabs */}
      <div className="flex items-center justify-between border-b border-orbit-border/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-orbit-text-muted">
            II. CURATED FOCUS
          </span>
          <span className="font-serif italic text-xs text-orbit-text-muted">
            ({filteredTasks.length} {filteredTasks.length === 1 ? "entry" : "entries"})
          </span>
        </div>

        {/* Understated Text Filter Tabs with Italic Serif Active Indicator */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`transition-colors cursor-pointer py-0.5 ${
              filterMode === "all"
                ? "font-serif italic text-sm text-orbit-accent border-b border-orbit-accent"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            All Intentions
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("today")}
            className={`transition-colors cursor-pointer py-0.5 ${
              filterMode === "today"
                ? "font-serif italic text-sm text-orbit-accent border-b border-orbit-accent"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            Today&apos;s Focus
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="border-t border-b border-orbit-border py-12 px-4 text-center">
          <h3 className="font-serif text-xl font-normal text-orbit-text mb-1.5">
            A tranquil stillness
          </h3>
          <p className="font-serif italic text-sm text-orbit-text-muted mb-4 max-w-sm mx-auto">
            No intentions are presently waiting in this view. Enjoy the quiet pause or capture a new thought.
          </p>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-orbit-text bg-orbit-surface border border-orbit-border rounded-full hover:border-orbit-accent hover:text-orbit-accent transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Record an intention</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Part 1 — The Lead Feature (Hero Task Card) */}
          {leadTask && (
            <div className="orbit-surface-card rounded-[20px] border border-orbit-border bg-orbit-surface p-6 sm:p-7 shadow-[var(--orbit-shadow-card)] relative overflow-hidden transition-all">
              {/* Inner Decorative Hairline Border */}
              <div className="absolute inset-2 border border-orbit-border/30 rounded-[16px] pointer-events-none" />

              <div className="relative space-y-4">
                {/* Eyebrow Status */}
                <div className="flex items-center justify-between text-[10px] tracking-[0.2em] font-sans uppercase">
                  <span className="font-semibold text-orbit-accent">
                    {leadTask.dueDate && todayStr && leadTask.dueDate < todayStr
                      ? "OVERDUE FOCUS"
                      : leadTask.priority === "high"
                      ? "LEAD FOCUS · HIGH PRIORITY"
                      : "PRIMARY FOCUS"}
                  </span>

                  {leadTask.category && (
                    <span className="text-orbit-text-muted">
                      #{leadTask.category}
                    </span>
                  )}
                </div>

                {/* Hero Headline in Newsreader */}
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-orbit-text leading-snug">
                  <Link
                    href={`/tasks?taskId=${leadTask.id}`}
                    className="hover:text-orbit-accent transition-colors [overflow-wrap:anywhere]"
                  >
                    {leadTask.title}
                  </Link>
                </h3>

                {/* Contextual Due Date Prose */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-orbit-border/50">
                  <div className="font-serif italic text-sm text-orbit-text-muted">
                    {leadTask.dueDate ? (
                      leadTask.dueDate === todayStr ? (
                        <span className="text-orbit-accent">
                          Due today{leadTask.dueTime ? ` at ${leadTask.dueTime}` : ""}
                        </span>
                      ) : (
                        <span>Scheduled for {formatFriendlyDate(leadTask.dueDate, leadTask.dueTime)}</span>
                      )
                    ) : (
                      <span>Open-ended contemplation</span>
                    )}
                  </div>

                  {/* Interactive Fulfill Action Button */}
                  <button
                    type="button"
                    onClick={() => onToggleTask(leadTask)}
                    className="inline-flex min-h-[36px] items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-orbit-accent bg-orbit-accent-soft hover:bg-orbit-accent hover:text-white transition-all cursor-pointer"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current">
                      <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                    </span>
                    <span>Complete Intention</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Part 2 — The Editorial Index (Remaining Tasks) */}
          {remainingTasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-sans tracking-[0.2em] uppercase text-orbit-text-muted pb-1">
                INDEX OF INTENTIONS
              </div>

              <ul className="divide-y divide-orbit-border/40">
                {remainingTasks.map((task, idx) => {
                  const displayIndex = String(idx + 2).padStart(2, "0");
                  const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);

                  return (
                    <li
                      key={task.id}
                      className="group flex items-center justify-between gap-3 py-3 hover:bg-orbit-surface-secondary/40 px-2 rounded-lg transition-colors"
                    >
                      {/* Left: Ink Checkbox + Italic Numeral + Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          aria-label={`Mark "${task.title}" complete`}
                          onClick={() => onToggleTask(task)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orbit-border-strong hover:border-orbit-accent hover:bg-orbit-accent-soft text-transparent hover:text-orbit-accent transition-colors cursor-pointer"
                        >
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </button>

                        <span className="font-serif italic text-sm text-orbit-text-muted shrink-0 w-5 select-none">
                          {displayIndex}
                        </span>

                        <Link
                          href={`/tasks?taskId=${task.id}`}
                          className="text-[15px] font-sans font-medium text-orbit-text hover:text-orbit-accent transition-colors truncate"
                          title={task.title}
                        >
                          {task.title}
                        </Link>

                        {/* Dotted Leader Line (Kinfolk / Museum Table of Contents) */}
                        <span className="flex-1 min-w-[24px] border-b border-dotted border-orbit-border/80 mx-2 sm:mx-3 self-end mb-1.5 opacity-70" />
                      </div>

                      {/* Right: Due Date & Metadata */}
                      <div className="shrink-0 flex items-center gap-2 text-xs font-sans text-orbit-text-muted">
                        {isOverdue && (
                          <span className="text-[10px] tracking-wider uppercase text-orbit-danger font-medium">
                            Overdue
                          </span>
                        )}

                        {task.dueDate && (
                          <span className="font-serif italic text-xs whitespace-nowrap">
                            {formatFriendlyDate(task.dueDate)}
                          </span>
                        )}

                        {task.priority === "high" && (
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orbit-accent-soft text-orbit-accent font-semibold">
                            P1
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="pt-2">
        <Link
          href="/tasks"
          className="group inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.14em] uppercase text-orbit-text-muted hover:text-orbit-accent transition-colors"
        >
          <span>OPEN COMPLETE CATALOG</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
