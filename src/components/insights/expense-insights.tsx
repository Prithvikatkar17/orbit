"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Wallet, Flame, TrendingUp, Plus, ArrowUpRight } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type ExpenseBreakdownResult,
  type DailyBurnRateResult,
  type DailyBurnRatePoint,
} from "@/lib/services/analytics-service";
import { CATEGORY_METADATA, formatINR } from "@/lib/schemas/expense";
import { useUIStore } from "@/lib/stores/ui-store";
import { parseLocalDate } from "@/lib/utils/dates";

function formatShortDay(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export interface SpendingBreakdownCardProps {
  breakdown: ExpenseBreakdownResult;
  rangeLabel: string;
}

export function SpendingBreakdownCard({
  breakdown,
  rangeLabel,
}: SpendingBreakdownCardProps) {
  const { openQuickCapture } = useUIStore();
  const activeCategories = useMemo(
    () => breakdown.byCategory.filter((c) => c.count > 0),
    [breakdown.byCategory]
  );

  return (
    <SurfaceCard
      padding="md"
      className="flex flex-col h-full"
      style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orbit-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight truncate">
              Spending Breakdown
            </h2>
            <p className="text-xs text-orbit-text-muted truncate">
              {rangeLabel} · {breakdown.count}{" "}
              {breakdown.count === 1 ? "transaction" : "transactions"}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-display text-lg font-bold text-orbit-text tabular-nums">
            {formatINR(breakdown.totalPaise)}
          </div>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-orbit-accent hover:underline"
          >
            <span>Open Ledger</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="mt-4 flex-1">
        {breakdown.count === 0 ? (
          <EmptyState
            compact
            dashed
            icon={<Wallet className="h-5 w-5" />}
            eyebrow="SPENDING"
            title="No expenses in this period"
            description="Log your daily spends to track category allocation and payment modes."
            action={
              <button
                type="button"
                onClick={() => openQuickCapture({ defaultTab: "expense" })}
                className="inline-flex items-center gap-1.5 min-h-[38px] rounded-orbit-control bg-orbit-accent px-3.5 py-1.5 text-xs font-semibold text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Expense</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-3.5">
            {activeCategories.map((cat) => {
              const meta = CATEGORY_METADATA[cat.category];
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta?.color || "#64748b" }}
                      />
                      <span className="font-medium text-orbit-text truncate">
                        {meta?.label || cat.category}
                      </span>
                      <span className="font-mono text-[11px] text-orbit-text-muted">
                        ({cat.count})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-semibold text-orbit-text">
                        {formatINR(cat.totalPaise)}
                      </span>
                      <span className="font-mono text-[11px] text-orbit-text-muted w-11 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                        backgroundColor: meta?.color || "#64748b",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Mode Footer Strip */}
      <div className="mt-5 pt-3 border-t border-orbit-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-orbit-text-muted">
          Payment Split
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {breakdown.byPaymentMode.map((mode) => (
            <span
              key={mode.paymentMode}
              className="inline-flex items-center gap-1 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-2 py-0.5 text-[11px] font-medium text-orbit-text-secondary tabular-nums"
            >
              <span className="font-bold uppercase text-orbit-text">
                {mode.paymentMode}
              </span>
              <span>{mode.percentage}%</span>
              <span className="text-orbit-text-muted">
                ({formatINR(mode.totalPaise)})
              </span>
            </span>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}

export interface DailyBurnRateCardProps {
  burnRate: DailyBurnRateResult;
  budgetPaise?: number | null;
  rangeLabel: string;
}

export function DailyBurnRateCard({
  burnRate,
  budgetPaise,
  rangeLabel,
}: DailyBurnRateCardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DailyBurnRatePoint | null>(null);

  const visibleSeries = useMemo(() => {
    // Keep chart readable for "all" time ranges while preserving full-window metrics
    return burnRate.series.length > 60
      ? burnRate.series.slice(-60)
      : burnRate.series;
  }, [burnRate.series]);

  const maxDayPaise = useMemo(() => {
    const maxSpend = visibleSeries.reduce(
      (max, p) => (p.totalPaise > max ? p.totalPaise : max),
      0
    );
    return Math.max(maxSpend, burnRate.avgDailyPaise, 100);
  }, [visibleSeries, burnRate.avgDailyPaise]);

  const avgLinePercent = Math.min(
    100,
    Math.max(0, Math.round((burnRate.avgDailyPaise / maxDayPaise) * 100))
  );

  const isProjectedOverBudget =
    Boolean(budgetPaise && budgetPaise > 0) &&
    burnRate.projectedTotalPaise > (budgetPaise ?? 0);

  const isActualOverBudget =
    Boolean(budgetPaise && budgetPaise > 0) &&
    burnRate.totalPaise >= (budgetPaise ?? 0);

  const isNearBudget =
    Boolean(budgetPaise && budgetPaise > 0) &&
    !isProjectedOverBudget &&
    burnRate.projectedTotalPaise >= (budgetPaise ?? 0) * 0.8;

  return (
    <SurfaceCard
      padding="md"
      className="flex flex-col h-full"
      style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orbit-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Flame className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight truncate">
              Daily Burn-Rate
            </h2>
            <p className="text-xs text-orbit-text-muted truncate">
              {rangeLabel} · {burnRate.elapsedDays}{" "}
              {burnRate.elapsedDays === 1 ? "day" : "days"} elapsed
            </p>
          </div>
        </div>

        {/* Budget Pacing Badge */}
        <div className="shrink-0">
          {budgetPaise && budgetPaise > 0 ? (
            <Badge
              variant={
                isActualOverBudget || isProjectedOverBudget
                  ? "danger"
                  : isNearBudget
                  ? "warning"
                  : "success"
              }
            >
              {isActualOverBudget
                ? `Over Budget (${burnRate.budgetUsedPercent ?? 100}%)`
                : isProjectedOverBudget
                ? "Pace Exceeds Budget"
                : `${burnRate.budgetUsedPercent ?? 0}% of Budget`}
            </Badge>
          ) : (
            <Badge variant="neutral">No Budget Set</Badge>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted">
            Avg / Day
          </div>
          <div className="mt-1 font-display text-base font-bold text-orbit-text tabular-nums">
            {formatINR(burnRate.avgDailyPaise)}
          </div>
        </div>

        <div className="rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-2.5">
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted">
            <TrendingUp className="h-3 w-3" />
            <span>Projected</span>
          </div>
          <div
            className={`mt-1 font-display text-base font-bold tabular-nums ${
              isProjectedOverBudget
                ? "text-orbit-danger"
                : isNearBudget
                ? "text-orbit-warning"
                : "text-orbit-text"
            }`}
          >
            {formatINR(burnRate.projectedTotalPaise)}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted">
            Monthly Budget
          </div>
          <div className="mt-1 font-display text-base font-bold text-orbit-text tabular-nums">
            {budgetPaise && budgetPaise > 0 ? formatINR(budgetPaise) : "Unset"}
          </div>
        </div>
      </div>

      {/* Daily Bar Chart */}
      <div className="mt-4 flex-1 flex flex-col justify-end">
        <div className="flex items-center justify-between text-[11px] text-orbit-text-muted mb-2 min-h-[18px]">
          <span>
            {hoveredPoint
              ? `${formatShortDay(hoveredPoint.date)} · ${formatINR(hoveredPoint.totalPaise)}`
              : "Hover or focus any bar to inspect daily spend"}
          </span>
          <span className="font-mono text-[10px]">
            Avg: {formatINR(burnRate.avgDailyPaise)}
          </span>
        </div>

        <div
          className="relative h-40 w-full rounded-orbit-control border border-orbit-border bg-orbit-bg px-2 pt-3 pb-2 flex items-end gap-1"
          role="img"
          aria-label={`Daily burn-rate chart for ${rangeLabel}`}
        >
          {/* Dashed Average Reference Line */}
          {burnRate.avgDailyPaise > 0 && (
            <div
              className="pointer-events-none absolute inset-x-2 border-t border-dashed border-orbit-accent/70 z-10"
              style={{ bottom: `calc(${avgLinePercent}% * 0.85 + 8px)` }}
              aria-hidden="true"
            />
          )}

          {visibleSeries.map((point) => {
            const heightPct =
              point.totalPaise > 0
                ? Math.max(4, Math.round((point.totalPaise / maxDayPaise) * 100))
                : 0;
            const tooltipLabel = `${formatShortDay(point.date)} · ${formatINR(point.totalPaise)}`;
            const isAboveAvg =
              burnRate.avgDailyPaise > 0 && point.totalPaise > burnRate.avgDailyPaise;

            return (
              <button
                key={point.date}
                type="button"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(point)}
                onBlur={() => setHoveredPoint(null)}
                title={tooltipLabel}
                aria-label={tooltipLabel}
                className="group relative flex-1 h-full flex items-end justify-center focus:outline-none"
              >
                <div
                  className={`w-full max-w-[14px] rounded-t-xs transition-all ${
                    point.totalPaise === 0
                      ? "h-[2px] bg-orbit-border/50"
                      : isAboveAvg
                      ? "bg-orbit-warning group-hover:opacity-85 group-focus:ring-2 group-focus:ring-orbit-accent"
                      : "bg-orbit-accent group-hover:opacity-85 group-focus:ring-2 group-focus:ring-orbit-accent"
                  }`}
                  style={point.totalPaise > 0 ? { height: `${heightPct}%` } : undefined}
                />
              </button>
            );
          })}
        </div>

        {visibleSeries.length > 0 && (
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-orbit-text-muted">
            <span>{formatShortDay(visibleSeries[0].date)}</span>
            <span>{formatShortDay(visibleSeries[visibleSeries.length - 1].date)}</span>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
