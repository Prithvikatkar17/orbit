"use client";

import React, { useState } from "react";
import { Layers, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { TaskDistributions } from "@/lib/services/analytics-service";
import { CATEGORY_ICONS } from "@/lib/constants";

interface TaskDistributionProps {
  distributions: TaskDistributions;
}

export function TaskDistribution({ distributions }: TaskDistributionProps) {
  const [viewTab, setViewTab] = useState<"category" | "priority">("category");
  const { byCategory, byPriority, totalEligibleTasks } = distributions;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
      {/* Header with View Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Task Distribution
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewTab("category")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewTab === "category"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            By Category
          </button>
          <button
            type="button"
            onClick={() => setViewTab("priority")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewTab === "priority"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            By Priority
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {totalEligibleTasks === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No active tasks to distribute
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Add tasks to see category and priority breakdowns.
            </p>
          </div>
        ) : viewTab === "category" ? (
          <div className="space-y-3.5">
            {byCategory.length === 0 ? (
              <p className="text-xs text-slate-400">No categories found.</p>
            ) : (
              byCategory.map((cat) => {
                const icon = CATEGORY_ICONS[cat.category.toLowerCase()] || "📌";
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{icon}</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {cat.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({cat.totalCount} {cat.totalCount === 1 ? "task" : "tasks"} · {cat.completedCount} done)
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        {cat.percentageOfTotal}%
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfTotal))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {byPriority.map((item) => {
              const label =
                item.priority === "high"
                  ? "High Priority"
                  : item.priority === "medium"
                  ? "Medium Priority"
                  : "Low Priority";

              const colorClass =
                item.priority === "high"
                  ? "bg-rose-500"
                  : item.priority === "medium"
                  ? "bg-amber-500"
                  : "bg-blue-500";

              const badgeColor =
                item.priority === "high"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : item.priority === "medium"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

              const icon =
                item.priority === "high" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                );

              return (
                <div key={item.priority} className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/20">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {label}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                        {item.totalCount} {item.totalCount === 1 ? "task" : "tasks"}
                      </span>
                    </div>

                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {item.percentageOfTotal}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percentageOfTotal))}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.completedCount} completed</span>
                    <span>{item.pendingCount} pending</span>
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

