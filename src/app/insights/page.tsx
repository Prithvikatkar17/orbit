"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar } from "lucide-react";
import { db } from "@/lib/db/client";
import type { Task, Habit, HabitLog, Expense } from "@/lib/schemas";
import type { ExpenseCategory, ExpensePaymentMode } from "@/lib/schemas/expense";
import { useMounted, useTodayDate } from "@/lib/utils/dates";
import {
  calculateAnalyticsSnapshot,
  calculateExpenseBreakdown,
  calculateDailyBurnRate,
  type DateRangeType,
} from "@/lib/services/analytics-service";
import { flushSyncQueue } from "@/lib/services/sync-queue-service";
import { isStaticPwaMode } from "@/lib/config/runtime";
import { PersonalityPageHeader } from "@/components/layout/personality-page-header";
import { OverviewCards } from "@/components/insights/overview-cards";
import { ActivityChart } from "@/components/insights/activity-chart";
import { HabitBreakdown } from "@/components/insights/habit-breakdown";
import { TaskDistribution } from "@/components/insights/task-distribution";
import { RecentAccomplishments } from "@/components/insights/recent-accomplishments";
import {
  SpendingBreakdownCard,
  DailyBurnRateCard,
} from "@/components/insights/expense-insights";

const RANGE_OPTIONS: { id: DateRangeType; label: string }[] = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

export default function InsightsPage() {
  const mounted = useMounted();
  const todayStr = useTodayDate();
  const [rangeType, setRangeType] = useState<DateRangeType>("30d");

  // Reactive Dexie queries
  const rawTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const rawHabits = useLiveQuery(() => db.habits.toArray(), []);
  const rawHabitLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const rawExpenses = useLiveQuery(() => db.expenses.toArray(), []);
  const userSettings = useLiveQuery(() => db.settings.get("user_settings"), []);

  // Flush-Before-Hydrate for Expenses so recent mobile spends appear immediately
  useEffect(() => {
    if (isStaticPwaMode()) return;
    let isCancelled = false;
    async function syncExpensesFromSQLite() {
      try {
        await flushSyncQueue();
        const res = await fetch("/api/expenses");
        if (res.ok) {
          const data = await res.json();
          if (data.expenses && Array.isArray(data.expenses)) {
            for (const serverItem of data.expenses) {
              if (isCancelled) break;
              const existing = await db.expenses.get(serverItem.id);
              if (serverItem.deletedAt != null) {
                if (existing) {
                  await db.expenses.delete(serverItem.id);
                }
                continue;
              }
              const serverUpdated =
                typeof serverItem.updatedAt === "number"
                  ? serverItem.updatedAt
                  : serverItem.createdAt || 0;
              const existingUpdated = existing?.updatedAt || 0;

              if (!existing || serverUpdated > existingUpdated) {
                await db.expenses.put({
                  id: serverItem.id,
                  amountPaise: serverItem.amountPaise,
                  category: serverItem.category as ExpenseCategory,
                  paymentMode: (serverItem.paymentMode as ExpensePaymentMode) || "upi",
                  note: serverItem.note || null,
                  date: serverItem.date,
                  createdAt: serverItem.createdAt,
                  updatedAt: serverItem.updatedAt,
                  deletedAt: serverItem.deletedAt || null,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("[InsightsPage] Expense hydration sync error:", err);
      }
    }
    syncExpensesFromSQLite();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Hydration-safe memoized arrays
  const tasks: Task[] = useMemo(
    () => (mounted && rawTasks ? rawTasks : []),
    [mounted, rawTasks]
  );
  const habits: Habit[] = useMemo(
    () => (mounted && rawHabits ? rawHabits : []),
    [mounted, rawHabits]
  );
  const habitLogs: HabitLog[] = useMemo(
    () => (mounted && rawHabitLogs ? rawHabitLogs : []),
    [mounted, rawHabitLogs]
  );
  const expenses: Expense[] = useMemo(
    () => (mounted && rawExpenses ? rawExpenses : []),
    [mounted, rawExpenses]
  );
  const monthlyBudgetPaise = mounted ? (userSettings?.monthlyExpenseBudgetPaise ?? null) : null;

  // Pure analytics snapshot calculation
  const snapshot = useMemo(() => {
    if (!mounted || !rawTasks || !rawHabits || !rawHabitLogs) {
      return null;
    }
    return calculateAnalyticsSnapshot({
      rangeType,
      tasks,
      habits,
      habitLogs,
      today: todayStr || undefined,
      accomplishmentLimit: 20,
    });
  }, [
    mounted,
    rawTasks,
    rawHabits,
    rawHabitLogs,
    rangeType,
    tasks,
    habits,
    habitLogs,
    todayStr,
  ]);

  const expenseAnalytics = useMemo(() => {
    if (!snapshot) return null;
    const breakdown = calculateExpenseBreakdown(
      expenses,
      snapshot.range.startDate,
      snapshot.range.endDate
    );
    const burnRate = calculateDailyBurnRate(
      expenses,
      snapshot.range.startDate,
      snapshot.range.endDate,
      monthlyBudgetPaise,
      todayStr || undefined
    );
    return { breakdown, burnRate };
  }, [snapshot, expenses, monthlyBudgetPaise, todayStr]);

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.id === rangeType)?.label || rangeType;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Personality Page Header with Date Range Selector */}
      <PersonalityPageHeader
        moduleIndex="06"
        title="Insights & Telemetry"
        subtitle="Velocity reflection, habit consistency, and weekly momentum."
        metrics={[
          { label: "Range", value: rangeType.toUpperCase() },
          { label: "Tasks Done", value: snapshot?.tasksCompletedInRange ?? 0 },
          {
            label: "Consistency",
            value: `${snapshot?.habitConsistency.consistencyRate ?? 0}%`,
            tone: "accent",
          },
        ]}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-orbit-border bg-orbit-surface p-1 shadow-orbit-xs">
            <Calendar className="ml-2 mr-1 h-3.5 w-3.5 text-orbit-text-muted shrink-0" />
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRangeType(opt.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  rangeType === opt.id
                    ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs font-semibold"
                    : "text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-surface-secondary/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Loading Skeleton */}
      {!snapshot ? (
        <div className="space-y-6">
          <div className="h-24 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="h-36 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 sm:col-span-2 lg:col-span-7" />
            <div className="h-36 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 sm:col-span-2 lg:col-span-5" />
            <div className="h-32 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 sm:col-span-1 lg:col-span-4" />
            <div className="h-32 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 sm:col-span-1 lg:col-span-4" />
            <div className="h-32 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 sm:col-span-2 lg:col-span-4" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-72 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 lg:col-span-12" />
            <div className="h-80 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 lg:col-span-7" />
            <div className="h-80 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 lg:col-span-5" />
            <div className="h-64 rounded-xl bg-orbit-surface-secondary/70 animate-pulse border border-orbit-border/60 lg:col-span-12" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Overview Cards (Editorial Strip + Hero & Supporting Bento Grid) */}
          <OverviewCards snapshot={snapshot} />

          {/* Section 2: Analytics Workspace Bento Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Activity Chart: Prominent Visual Time-Series Area */}
            <div className="lg:col-span-12">
              <ActivityChart
                dailyTaskCompletions={snapshot.dailyTaskCompletions}
                dailyHabitCompletions={snapshot.dailyHabitCompletions}
                dateRangeType={
                  RANGE_OPTIONS.find((o) => o.id === rangeType)?.label || rangeType
                }
              />
            </div>

            {/* Habit Breakdown: Deeper Habit Cadence & Streaks */}
            <div className="lg:col-span-7 flex flex-col">
              <HabitBreakdown
                habitConsistency={snapshot.habitConsistency}
                habitStreaks={snapshot.habitStreaks}
              />
            </div>

            {/* Task Distribution: Categorical & Priority Allocations */}
            <div className="lg:col-span-5 flex flex-col">
              <TaskDistribution distributions={snapshot.distributions} />
            </div>

            {/* Expense Insights: Spending Breakdown & Daily Burn-Rate */}
            {expenseAnalytics && (
              <>
                <div className="lg:col-span-6 flex flex-col">
                  <SpendingBreakdownCard
                    breakdown={expenseAnalytics.breakdown}
                    rangeLabel={rangeLabel}
                  />
                </div>
                <div className="lg:col-span-6 flex flex-col">
                  <DailyBurnRateCard
                    burnRate={expenseAnalytics.burnRate}
                    budgetPaise={monthlyBudgetPaise}
                    rangeLabel={rangeLabel}
                  />
                </div>
              </>
            )}

            {/* Recent Accomplishments: Full-Width Milestone Ledger */}
            <div className="lg:col-span-12">
              <RecentAccomplishments
                accomplishments={snapshot.recentAccomplishments}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
