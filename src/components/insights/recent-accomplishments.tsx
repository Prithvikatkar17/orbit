"use client";

import React from "react";
import { Sparkles, CheckCircle2, Target, Calendar } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";
import type { AccomplishmentItem } from "@/lib/services/analytics-service";
import { formatFriendlyDate } from "@/lib/utils/dates";

interface RecentAccomplishmentsProps {
  accomplishments: AccomplishmentItem[];
}

export function RecentAccomplishments({
  accomplishments,
}: RecentAccomplishmentsProps) {
  return (
    <SurfaceCard padding="md">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-4 border-b border-orbit-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-warning">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Recent Accomplishments
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Milestones, completed goals, and key tasks
            </p>
          </div>
        </div>
        <Badge variant="neutral">
          {accomplishments.length} completed
        </Badge>
      </div>

      {/* Content */}
      <div className="mt-4">
        {accomplishments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orbit-border bg-orbit-surface-secondary/40 py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-orbit-text-muted/50" />
            <p className="mt-2 text-sm font-medium text-orbit-text">
              No accomplishments in this period
            </p>
            <p className="mt-1 text-xs text-orbit-text-muted">
              Complete tasks and reach your goals to see them celebrated here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-orbit-border/60">
            {accomplishments.map((item) => {
              const isGoal = item.type === "goal";
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0 hover:bg-orbit-surface-secondary/40 px-2 rounded-lg transition-colors"
                >
                  {/* Left: Checkmark, Title, Type */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-success">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-orbit-text truncate">
                          {item.title}
                        </span>
                        {isGoal && (
                          <Badge variant="accent" className="gap-1">
                            <Target className="h-2.5 w-2.5" />
                            <span>Goal</span>
                          </Badge>
                        )}
                        {item.priority === "high" && (
                          <Badge variant="danger">
                            High
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Completion Date */}
                  <div className="flex items-center gap-1.5 font-mono text-xs text-orbit-text-muted sm:shrink-0 pl-10 sm:pl-0">
                    <Calendar className="h-3 w-3 text-orbit-text-muted/70" />
                    <span>{formatFriendlyDate(item.completedDate)}</span>
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
