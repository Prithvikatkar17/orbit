"use client";

import React, { useState } from "react";
import { Layers, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { TaskDistributions } from "@/lib/services/analytics-service";
import { CATEGORY_ICONS } from "@/lib/constants";

const CATEGORY_PALETTE = [
  "bg-orbit-chart-1",
  "bg-orbit-chart-2",
  "bg-orbit-chart-3",
  "bg-orbit-chart-4",
  "bg-orbit-chart-5",
];

interface TaskDistributionProps {
  distributions: TaskDistributions;
}

export function TaskDistribution({ distributions }: TaskDistributionProps) {
  const [viewTab, setViewTab] = useState<"category" | "priority">("category");
  const { byCategory, byPriority, totalEligibleTasks } = distributions;

  return (
    <SurfaceCard padding="md" className="flex flex-col h-full">
      {/* Editorial Header with View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orbit-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight truncate">
              Task Distribution
            </h2>
            <p className="text-xs text-orbit-text-muted truncate">
              Allocation across work streams and urgency
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 rounded-lg bg-orbit-surface-secondary border border-orbit-border p-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewTab("category")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              viewTab === "category"
                ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs font-semibold"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            By Category
          </button>
          <button
            type="button"
            onClick={() => setViewTab("priority")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              viewTab === "priority"
                ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs font-semibold"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            By Priority
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {totalEligibleTasks === 0 ? (
          <EmptyState
            compact
            dashed
            icon={<CheckCircle2 className="h-5 w-5" />}
            eyebrow="ALLOCATION"
            title="No active tasks to distribute"
            description="Add tasks to see category and priority breakdowns across your active work streams."
          />
        ) : viewTab === "category" ? (
          <div className="space-y-3.5">
            {byCategory.length === 0 ? (
              <p className="text-xs text-orbit-text-muted">No categories found.</p>
            ) : (
              byCategory.map((cat, idx) => {
                const icon = CATEGORY_ICONS[cat.category.toLowerCase()] || "📌";
                const barColor = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{icon}</span>
                        <span className="font-medium text-orbit-text truncate">
                          {cat.category}
                        </span>
                        <span className="font-mono text-[11px] text-orbit-text-muted">
                          ({cat.totalCount} {cat.totalCount === 1 ? "task" : "tasks"} · {cat.completedCount} done)
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-orbit-text shrink-0 tabular-nums">
                        {cat.percentageOfTotal}%
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-300`}
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfTotal))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {byPriority.map((item) => {
              const label =
                item.priority === "high"
                  ? "High Priority"
                  : item.priority === "medium"
                  ? "Medium Priority"
                  : "Low Priority";

              const colorClass =
                item.priority === "high"
                  ? "bg-orbit-chart-negative"
                  : item.priority === "medium"
                  ? "bg-orbit-chart-2"
                  : "bg-orbit-chart-3";

              const badgeVariant: "danger" | "warning" | "info" =
                item.priority === "high"
                  ? "danger"
                  : item.priority === "medium"
                  ? "warning"
                  : "info";

              const icon =
                item.priority === "high" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-orbit-chart-negative" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-orbit-text-muted" />
                );

              return (
                <div
                  key={item.priority}
                  className="rounded-lg border border-orbit-border bg-orbit-surface-secondary/40 p-3.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="font-medium text-orbit-text">
                        {label}
                      </span>
                      <Badge variant={badgeVariant}>
                        {item.totalCount} {item.totalCount === 1 ? "task" : "tasks"}
                      </Badge>
                    </div>

                    <span className="font-mono font-semibold text-orbit-text tabular-nums">
                      {item.percentageOfTotal}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percentageOfTotal))}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-orbit-text-muted">
                    <span>{item.completedCount} completed</span>
                    <span>{item.pendingCount} pending</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
