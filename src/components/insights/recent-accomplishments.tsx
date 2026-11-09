"use client";

import React from "react";
import { Sparkles, CheckCircle2, Target, Calendar } from "lucide-react";
import type { AccomplishmentItem } from "@/lib/services/analytics-service";
import { formatFriendlyDate } from "@/lib/utils/dates";

interface RecentAccomplishmentsProps {
  accomplishments: AccomplishmentItem[];
}

export function RecentAccomplishments({
  accomplishments,
}: RecentAccomplishmentsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Accomplishments
          </h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {accomplishments.length} completed
        </span>
      </div>

      {/* Content */}
      <div className="mt-4">
        {accomplishments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No accomplishments in this period
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Complete tasks and reach your goals to see them celebrated here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {accomplishments.map((item) => {
              const isGoal = item.type === "goal";
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-2 rounded-xl transition-colors"
                >
                  {/* Left: Checkmark, Title, Type */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {isGoal && (
                          <span className="inline-flex items-center gap-1 rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 shrink-0">
                            <Target className="h-2.5 w-2.5" />
                            <span>Goal</span>
                          </span>
                        )}
                        {item.priority === "high" && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 shrink-0">
                            High
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Completion Date */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 sm:shrink-0 pl-10 sm:pl-0">
                    <Calendar className="h-3 w-3" />
                    <span>{formatFriendlyDate(item.completedDate)}</span>
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

