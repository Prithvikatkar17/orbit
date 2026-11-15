"use client";

import React, { useState } from "react";
import type { Task } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";
import { toRomanNumeral } from "./archival-math";

export interface ManuscriptFocusProps {
  openTasks: Task[];
  dueTodayTasks: Task[];
  onToggleTask: (task: Task) => Promise<void>;
}

export function ManuscriptFocus({
  openTasks,
  dueTodayTasks,
  onToggleTask,
}: ManuscriptFocusProps) {
  const [filterMode, setFilterMode] = useState<"all" | "rubric">("all");

  const rubricTasks = React.useMemo(() => {
    return openTasks.filter(
      (t) => t.priority === "high" || dueTodayTasks.some((dt) => dt.id === t.id)
    );
  }, [openTasks, dueTodayTasks]);

  const activeTaskList = filterMode === "rubric" ? rubricTasks : openTasks;
  const leadTask = activeTaskList[0] ?? null;
  const secondaryTasks = activeTaskList.slice(1, 5);

  const getPriorityRubric = (priority: string) => {
    switch (priority) {
      case "high":
        return { label: "HIGH RUBRIC", color: "bg-[#8c2d38]/15 text-[#8c2d38] dark:text-[#f87171] border-[#8c2d38]/30" };
      case "medium":
        return { label: "CORE FOLIO", color: "bg-[#1b4332]/15 text-[#1b4332] dark:text-[#52b788] border-[#1b4332]/30" };
      default:
        return { label: "MARGINALIA", color: "bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700" };
    }
  };

  return (
    <section className="space-y-4">
      {/* Section Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold tracking-widest text-[#8c2d38] dark:text-[#c94a58] uppercase">
            II. Manuscript Folios & Catalog Drawer
          </span>
          <span className="text-[11px] font-serif italic text-stone-600 dark:text-stone-400">
            — Primary Works
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex items-center p-0.5 rounded-lg border border-stone-300 dark:border-stone-800 bg-[#eae4d4]/60 dark:bg-[#181411]">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
              filterMode === "all"
                ? "bg-[#fdfaf3] dark:bg-[#251e18] text-stone-900 dark:text-[#dfc07a] font-semibold shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            All Folios ({openTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("rubric")}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
              filterMode === "rubric"
                ? "bg-[#fdfaf3] dark:bg-[#251e18] text-[#8c2d38] dark:text-[#f87171] font-semibold shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Today&apos;s Rubric ({rubricTasks.length})
          </button>
        </div>
      </div>

      {leadTask ? (
        <div className="space-y-4">
          {/* Part 1 — The Illuminated Lead Rubric (Featured Top Task) */}
          <div className="archivist-catalog-card p-6 md:p-7 rounded-[16px] relative border-l-[6px] border-double border-[#8c2d38] dark:border-[#c94a58]">
            {/* Top Eyebrow */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-[#8c2d38] dark:text-[#f87171] uppercase">
                  ¶ RUBRIC I · PRIORITY INSCRIPTION
                </span>
                {leadTask.category && (
                  <span className="text-xs font-serif italic text-stone-600 dark:text-stone-400">
                    #{leadTask.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-600 dark:text-stone-400">
                <span>MS. ORBIT. 01</span>
                <span>·</span>
                <span className={leadTask.dueDate ? "text-[#8c2d38] dark:text-[#dfc07a] font-semibold" : ""}>
                  {leadTask.dueDate ? `Due ${formatFriendlyDate(leadTask.dueDate)}` : "Perennial Folio"}
                </span>
              </div>
            </div>

            {/* Task Title in Newsreader Serif */}
            <h3 className="text-xl md:text-2xl font-serif font-medium text-stone-900 dark:text-stone-100 leading-snug">
              {leadTask.title}
            </h3>

            {/* Description/Scholarly Notes */}
            {leadTask.notes && (
              <p className="text-sm font-serif text-stone-700 dark:text-stone-300 mt-2 leading-relaxed">
                {leadTask.notes}
              </p>
            )}

            {/* Bottom Action Footer */}
            <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              {/* Tactile Wax-Seal Completion Button */}
              <button
                type="button"
                onClick={() => onToggleTask(leadTask)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#8c2d38] hover:bg-[#73232c] text-[#f9f5eb] font-serif text-sm shadow-sm border border-amber-300/30 cursor-pointer transition-all active:scale-95 group"
                title="Affix archival seal and complete task"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-amber-200 group-hover:rotate-12 transition-transform"
                >
                  <path d="M12 2C12.5 5 14 7 16 8C14.5 9 13.5 10.5 13 12C14 12 16 11.5 18 10C17 12 17 14 15 15.5C14 14.5 13 14 12 14C11 14 10 14.5 9 15.5C7 14 7 12 6 10C8 11.5 10 12 11 12C10.5 10.5 9.5 9 8 8C10 7 11.5 5 12 2ZM12 16C12.5 18 13.5 20 15 22H9C10.5 20 11.5 18 12 16Z" />
                </svg>
                <span className="font-medium">Affix Seal &amp; Archive</span>
              </button>

              <div className="text-[11px] font-mono tracking-wider text-stone-600 dark:text-stone-400">
                CALL NO. MS. 2026.01 · FOLIO LEAF
              </div>
            </div>
          </div>

          {/* Part 2 — Remaining Tasks (2-Column Vintage Library Index Cards) */}
          {secondaryTasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {secondaryTasks.map((task, idx) => {
                const rubric = getPriorityRubric(task.priority);
                const callNumber = `CAT. ${String(idx + 2).padStart(2, "0")} // ED. ${toRomanNumeral(idx + 1)}`;

                return (
                  <div
                    key={task.id}
                    className="archivist-catalog-card p-4 rounded-[12px] relative flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      {/* Red horizontal index line at top of index card */}
                      <div className="border-b border-[#8c2d38]/30 dark:border-[#c94a58]/30 pb-2 mb-2.5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-600 dark:text-stone-400 font-semibold">
                          {callNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${rubric.color}`}>
                            {rubric.label}
                          </span>
                          {task.dueDate && (
                            <span className="text-stone-600 dark:text-stone-400">
                              {formatFriendlyDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Task Title & Notes */}
                      <h4 className="text-base font-serif font-medium text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                        {task.title}
                      </h4>
                      {task.notes && (
                        <p className="text-xs font-serif text-stone-600 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Card Footer with Punched Rod Hole & Ink-Stamp Checkbox */}
                    <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-800/80 flex items-center justify-between">
                      {task.category ? (
                        <span className="text-[10px] font-serif italic text-stone-600 dark:text-stone-400">
                          #{task.category}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-600 dark:text-stone-400">
                          FOLIO {idx + 2}
                        </span>
                      )}

                      {/* Punched library catalog rod hole motif (center-bottom) */}
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-stone-400 dark:border-stone-600 bg-[#eae4d4] dark:bg-[#110e0c] shadow-inner"
                        title="Catalog Drawer Retaining Rod Hole"
                      />

                      {/* Interactive Brass Ink-Stamp Checkbox */}
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className="w-5 h-5 rounded border border-[#b08938] dark:border-[#dfc07a] bg-stone-50 dark:bg-stone-900 flex items-center justify-center cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors group"
                        title="Mark catalog entry complete"
                      >
                        <span className="w-1.5 h-1.5 rounded-xs bg-transparent group-hover:bg-[#b08938] dark:group-hover:bg-[#dfc07a] transition-colors" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="archivist-catalog-card p-8 rounded-[16px] text-center border-l-[6px] border-double border-stone-300 dark:border-stone-700">
          <p className="text-base font-serif italic text-stone-600 dark:text-stone-400">
            All manuscript leaves cataloged. The archival ledger is complete.
          </p>
        </div>
      )}
    </section>
  );
}
