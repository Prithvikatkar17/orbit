"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";

export interface StudioPinboardProps {
  tasks: Task[];
  todayStr: string | null;
  onToggleTask: (task: Task) => Promise<void>;
  onOpenQuickCapture: () => void;
}

export function StudioPinboard({
  tasks,
  todayStr,
  onToggleTask,
  onOpenQuickCapture,
}: StudioPinboardProps) {
  const [filterMode, setFilterMode] = useState<"all" | "today">("all");

  const filteredTasks = useMemo(() => {
    if (filterMode === "today" && todayStr) {
      return tasks.filter((t) => t.dueDate === todayStr);
    }
    return tasks;
  }, [tasks, filterMode, todayStr]);

  return (
    <section className="space-y-5">
      {/* Section Header & Studio Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-orbit-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-serif italic font-normal text-orbit-text tracking-tight">
              Works on the Easel
            </h2>
            <span className="text-xs font-serif italic text-orbit-accent px-2 py-0.5 rounded-full bg-orbit-accent-soft">
              {filteredTasks.length} {filteredTasks.length === 1 ? "study" : "studies"}
            </span>
          </div>
          {/* Subtle painterly accent stroke */}
          <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#e11d48] to-[#818cf8] opacity-70" />
        </div>

        {/* Soft Pill Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-orbit-surface-secondary/60 border border-orbit-border/50 text-xs font-sans">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-orbit-surface text-orbit-text shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            All Works
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("today")}
            className={`px-3.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
              filterMode === "today"
                ? "bg-orbit-surface text-orbit-text shadow-xs"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            Today&apos;s Focus
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-[24px] border border-orbit-border bg-orbit-surface p-10 text-center shadow-card space-y-4">
          <div className="w-12 h-12 rounded-full mx-auto bg-gradient-to-tr from-rose-100 via-amber-100 to-indigo-100 dark:from-rose-950/40 dark:via-amber-950/40 dark:to-indigo-950/40 flex items-center justify-center text-orbit-accent">
            <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#e11d48] to-[#6366f1]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif italic text-lg text-orbit-text">
              An open canvas awaits
            </h3>
            <p className="text-sm font-sans text-orbit-text-muted max-w-sm mx-auto">
              No creative works currently on the easel. Begin a new watercolor study or sketch whenever inspiration strikes.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-sans font-medium text-white bg-gradient-to-r from-[#e11d48] to-[#ec4899] rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>+ Pin New Work</span>
          </button>
        </div>
      ) : (
        /* 2-Column Gallery Wall: Gouache Color Study / Pantone Art Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTasks.map((task, idx) => {
            const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr);
            const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr);

            // Rich multi-hue chromatic wash bands
            let washBandClass = "bg-gradient-to-r from-[#0ea5e9] via-[#10b981] to-[#34d399]";
            let studyLabel = "Exploratory Study";
            let studyBadgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

            if (isOverdue || task.priority === "high") {
              washBandClass = "bg-gradient-to-r from-[#f43f5e] via-[#fb7185] to-[#fb923c]";
              studyLabel = isOverdue ? "Overdue Study" : "Primary Study";
              studyBadgeClass = "bg-rose-500/10 text-rose-700 dark:text-rose-300";
            } else if (task.priority === "medium") {
              washBandClass = "bg-gradient-to-r from-[#4f46e5] via-[#a855f7] to-[#ec4899]";
              studyLabel = "Studio Focus";
              studyBadgeClass = "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
            } else if (idx % 2 === 1) {
              washBandClass = "bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#c084fc]";
              studyLabel = "Palette Note";
              studyBadgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300";
            }

            return (
              <div
                key={task.id}
                className="group/task orbit-surface-card orbit-card-interactive rounded-[22px] overflow-hidden border border-orbit-border bg-orbit-surface flex flex-col justify-between shadow-[0_12px_30px_-8px_rgba(120,70,140,0.08),0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-10px_rgba(120,70,140,0.14)] hover:-translate-y-1 transition-all"
              >
                {/* Top Chromatic Wash Band */}
                <div className={`h-3 w-full ${washBandClass}`} />

                {/* Card Body */}
                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  {/* Metadata Row: Pigment Pill + Artistic Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full ${studyBadgeClass}`}
                    >
                      {studyLabel}
                    </span>
                    {task.category && (
                      <span className="text-xs font-serif italic text-orbit-text-muted">
                        #{task.category}
                      </span>
                    )}
                  </div>

                  {/* Task Title & Notes */}
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-serif font-medium text-lg sm:text-xl leading-snug text-orbit-text group-hover/task:text-orbit-accent transition-colors line-clamp-2">
                      <Link href={`/tasks?taskId=${task.id}`} className="hover:underline">
                        {task.title}
                      </Link>
                    </h3>

                    {task.notes && (
                      <p className="text-xs sm:text-sm font-sans text-orbit-text-secondary leading-relaxed line-clamp-2">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Due Info & Painter's Droplet Checkbox */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-orbit-border/40">
                    <div className="text-xs font-serif italic text-orbit-text-muted">
                      {isDueToday ? (
                        <span className="text-[#e11d48] font-medium not-italic font-sans">
                          Due today {task.dueTime ? `· ${task.dueTime}` : ""}
                        </span>
                      ) : isOverdue ? (
                        <span className="text-rose-600 font-medium not-italic font-sans">
                          Overdue {task.dueDate ? `· ${formatFriendlyDate(task.dueDate)}` : ""}
                        </span>
                      ) : task.dueDate ? (
                        <span>Due {formatFriendlyDate(task.dueDate)}</span>
                      ) : (
                        <span>Open horizon</span>
                      )}
                    </div>

                    {/* Painter's Droplet Checkbox */}
                    <button
                      type="button"
                      aria-label={`Mark task "${task.title}" as complete`}
                      onClick={() => onToggleTask(task)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 border-2 ${
                        task.status === "completed"
                          ? "bg-gradient-to-tr from-[#e11d48] via-[#ec4899] to-[#6366f1] border-transparent text-white shadow-xs"
                          : "border-dashed border-[#ec4899]/50 hover:border-[#ec4899] bg-orbit-surface hover:bg-gradient-to-tr hover:from-rose-50 hover:to-indigo-50 dark:hover:from-rose-950/30 dark:hover:to-indigo-950/30 text-transparent hover:text-orbit-accent/40"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
