"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Wallet,
  IndianRupee,
  Plus,
  Trash2,
  Edit3,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  PieChart,
  Target,
  Calendar as CalendarIcon,
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  type Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_MODES,
  CATEGORY_METADATA,
  formatINR,
  parseINRToPaise,
  type ExpenseCategory,
  type ExpensePaymentMode,
} from "@/lib/schemas/expense";
import { useTodayDate, getLocalDateString } from "@/lib/utils/dates";
import { flushSyncQueue, syncMutation } from "@/lib/services/sync-queue-service";
import { syncSettingsToSQLite } from "@/lib/services/vault-sync-service";
import { PersonalityPageHeader } from "@/components/layout/personality-page-header";
import { ExpenseModal } from "@/components/expenses/expense-modal";

export default function ExpensesPage() {
  const todayStr = useTodayDate();

  // Selected Month State: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Quick-Log Input State
  const [amountInput, setAmountInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>("food");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<ExpensePaymentMode>("upi");
  const [noteInput, setNoteInput] = useState("");
  const [dateInput, setDateInput] = useState(todayStr || getLocalDateString());
  const [logError, setLogError] = useState<string | null>(null);

  // Budget Editing State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Expense Modal State (for editing)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Dexie Live Queries
  const rawExpenses = useLiveQuery(() => db.expenses.toArray(), []);
  const expenses = useMemo(() => rawExpenses ?? [], [rawExpenses]);

  const userSettings = useLiveQuery(() => db.settings.get("user_settings"), []);
  const monthlyBudgetPaise = userSettings?.monthlyExpenseBudgetPaise ?? null;

  // Flush-Before-Hydrate from SQLite backend on mount
  useEffect(() => {
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
              if (serverItem.deletedAt) {
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
        console.error("[ExpensesPage] Hydration sync error:", err);
      }
    }
    syncExpensesFromSQLite();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Filter expenses for currently selected month
  const monthExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(selectedMonth))
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
      });
  }, [expenses, selectedMonth]);

  // Calculated Metrics
  const todaySpendPaise = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amountPaise, 0);
  }, [expenses, todayStr]);

  const monthSpendPaise = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amountPaise, 0);
  }, [monthExpenses]);

  // Top Category for the selected month
  const topCategoryInfo = useMemo(() => {
    if (monthExpenses.length === 0) return null;
    const catTotals: Record<string, number> = {};
    for (const e of monthExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amountPaise;
    }
    let topCat: ExpenseCategory = "food";
    let maxSpend = -1;
    for (const [cat, total] of Object.entries(catTotals)) {
      if (total > maxSpend) {
        maxSpend = total;
        topCat = cat as ExpenseCategory;
      }
    }
    return { category: topCat, amountPaise: maxSpend };
  }, [monthExpenses]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(year, month, 1);
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const formattedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
      new Date(year, month - 1, 1)
    );
  }, [selectedMonth]);

  // Quick-Log Handler (0ms optimistic write)
  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseINRToPaise(amountInput);
    if (paise <= 0) {
      setLogError("Enter a valid amount greater than ₹0");
      return;
    }
    const logDate = dateInput || todayStr || getLocalDateString();
    setLogError(null);

    const now = Date.now();
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amountPaise: paise,
      category: selectedCategory,
      paymentMode: selectedPaymentMode,
      note: noteInput.trim() || null,
      date: logDate,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    // 0ms Optimistic Dexie write
    await db.expenses.put(newExpense);

    // Reset inputs
    setAmountInput("");
    setNoteInput("");

    // Background idempotent SQLite sync
    void syncMutation({
      endpoint: "/api/expenses",
      method: "POST",
      entityType: "expense",
      entityId: newExpense.id,
      body: newExpense,
    });
  };

  // Delete Expense Handler
  const handleDeleteExpense = async (id: string) => {
    // 0ms Optimistic delete from Dexie
    await db.expenses.delete(id);

    // Background sync soft-delete
    void syncMutation({
      endpoint: `/api/expenses?id=${encodeURIComponent(id)}`,
      method: "DELETE",
      entityType: "expense",
      entityId: id,
    });
  };

  // Edit Expense Save Handler
  const handleSaveEditedExpense = async (updated: Expense) => {
    // 0ms Optimistic Dexie update
    await db.expenses.put(updated);

    // Background sync update
    void syncMutation({
      endpoint: "/api/expenses",
      method: "PATCH",
      entityType: "expense",
      entityId: updated.id,
      body: updated,
    });
  };

  // Save Monthly Budget Handler
  const handleSaveBudget = async () => {
    const parsedPaise = parseINRToPaise(budgetInput);
    try {
      const existing = await db.settings.get("user_settings");
      if (existing) {
        await db.settings.update("user_settings", {
          monthlyExpenseBudgetPaise: parsedPaise > 0 ? parsedPaise : null,
          updatedAt: new Date().toISOString(),
        });
        void syncSettingsToSQLite();
      }
    } catch (err) {
      console.error("[ExpensesPage] Failed to save budget:", err);
    }
    setIsEditingBudget(false);
  };

  // Group month expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: { date: string; items: Expense[]; subtotalPaise: number }[] = [];
    const groupMap = new Map<string, Expense[]>();

    for (const exp of monthExpenses) {
      const list = groupMap.get(exp.date) || [];
      list.push(exp);
      groupMap.set(exp.date, list);
    }

    // Sort dates descending
    const sortedDates = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a));
    for (const date of sortedDates) {
      const items = groupMap.get(date)!;
      const subtotalPaise = items.reduce((sum, item) => sum + item.amountPaise, 0);
      groups.push({ date, items, subtotalPaise });
    }

    return groups;
  }, [monthExpenses]);

  // Friendly date title helper
  const getGroupDateTitle = (dateStr: string) => {
    if (dateStr === todayStr) return "Today";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      yesterday.getFullYear() === y &&
      yesterday.getMonth() === m - 1 &&
      yesterday.getDate() === d
    ) {
      return "Yesterday";
    }
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(dateObj);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (monthExpenses.length === 0) return;
    const headers = ["Date", "Category", "Payment Mode", "Note", "Amount (INR)"];
    const rows = monthExpenses.map((e) => [
      e.date,
      CATEGORY_METADATA[e.category]?.label || e.category,
      e.paymentMode.toUpperCase(),
      `"${(e.note || "").replace(/"/g, '""')}"`,
      (e.amountPaise / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orbit-expenses-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Budget progress calculations
  const budgetPercentage =
    monthlyBudgetPaise && monthlyBudgetPaise > 0
      ? Math.min(100, Math.round((monthSpendPaise / monthlyBudgetPaise) * 100))
      : 0;

  const isBudgetWarning = budgetPercentage >= 80 && budgetPercentage < 100;
  const isBudgetExceeded =
    monthlyBudgetPaise && monthlyBudgetPaise > 0 && monthSpendPaise >= monthlyBudgetPaise;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <PersonalityPageHeader
        moduleIndex="07"
        title="Expenses"
        subtitle="Zero-drift daily expense tracker, budget pacing, and spending ledger"
        metrics={[
          { label: "Today's Spend", value: formatINR(todaySpendPaise), tone: "accent" },
          { label: "This Month", value: formatINR(monthSpendPaise) },
          {
            label: "Monthly Budget",
            value: monthlyBudgetPaise ? formatINR(monthlyBudgetPaise) : "Unset",
            tone: isBudgetExceeded ? "urgent" : "default",
          },
        ]}
      />

      {/* 3-Second Quick-Log Bar */}
      <section
        aria-label="Quick Log Expense"
        className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-4 sm:p-5 shadow-orbit-card space-y-4"
        style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-orbit-accent" />
            <h2 className="text-sm font-semibold text-orbit-text tracking-wide uppercase">
              Quick Log Expense
            </h2>
          </div>
          <span className="text-[11px] text-orbit-text-muted">Instant 0ms Save</span>
        </div>

        <form onSubmit={handleQuickLog} className="space-y-3.5">
          {logError && (
            <div className="rounded-orbit-control bg-orbit-danger/10 border border-orbit-danger/30 p-2.5 text-xs text-orbit-danger">
              {logError}
            </div>
          )}

          {/* Amount and Note Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-orbit-text-muted select-none">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setLogError(null);
                }}
                placeholder="Amount (e.g. 150)"
                className="w-full min-h-[44px] rounded-orbit-control border border-orbit-border bg-orbit-bg pl-8 pr-3 py-2 text-base font-semibold text-orbit-text placeholder:text-orbit-text-muted focus:outline-none focus:border-orbit-accent"
              />
            </div>

            <div className="sm:col-span-5">
              <input
                type="text"
                maxLength={160}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Note (e.g. Chai, Metro, Groceries)"
                className="w-full min-h-[44px] rounded-orbit-control border border-orbit-border bg-orbit-bg px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:outline-none focus:border-orbit-accent"
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full min-h-[44px] rounded-orbit-control border border-orbit-border bg-orbit-bg px-3 py-2 text-xs sm:text-sm text-orbit-text focus:outline-none focus:border-orbit-accent"
              />
            </div>
          </div>

          {/* Category Chips and Payment Mode Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Category Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                const meta = CATEGORY_METADATA[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 min-h-[44px] px-3 rounded-orbit-control border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-orbit-accent bg-orbit-accent text-orbit-accent-fg shadow-xs font-semibold"
                        : "border-orbit-border bg-orbit-surface text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                    }`}
                  >
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Payment Mode and Add Button */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-orbit-control border border-orbit-border bg-orbit-bg p-0.5">
                {EXPENSE_PAYMENT_MODES.map((mode) => {
                  const isSelected = selectedPaymentMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedPaymentMode(mode)}
                      className={`min-h-[40px] px-3 rounded-orbit-control text-xs font-semibold uppercase tracking-wider transition-all ${
                        isSelected
                          ? "bg-orbit-surface text-orbit-accent shadow-xs border border-orbit-border"
                          : "text-orbit-text-muted hover:text-orbit-text"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-orbit-control bg-orbit-accent text-orbit-accent-fg text-sm font-semibold hover:bg-orbit-accent-hover transition-colors flex items-center justify-center gap-1.5 shadow-orbit-control active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Log</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Summary Cards & Monthly Budget Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Spend */}
        <div
          className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-4 shadow-orbit-card"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between text-orbit-text-muted text-xs">
            <span>Today&apos;s Spend</span>
            <TrendingDown className="h-4 w-4 text-orbit-accent" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-orbit-text">
            {formatINR(todaySpendPaise)}
          </div>
          <p className="mt-1 text-[11px] text-orbit-text-muted">
            {expenses.filter((e) => e.date === todayStr).length} transactions logged today
          </p>
        </div>

        {/* This Month's Spend */}
        <div
          className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-4 shadow-orbit-card"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between text-orbit-text-muted text-xs">
            <span>This Month&apos;s Spend</span>
            <CalendarIcon className="h-4 w-4 text-orbit-text-muted" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-orbit-text">
            {formatINR(monthSpendPaise)}
          </div>
          <p className="mt-1 text-[11px] text-orbit-text-muted">
            {monthExpenses.length} transactions in {formattedMonthLabel}
          </p>
        </div>

        {/* Top Category */}
        <div
          className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-4 shadow-orbit-card"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between text-orbit-text-muted text-xs">
            <span>Top Category</span>
            <PieChart className="h-4 w-4 text-orbit-text-muted" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-orbit-text flex items-center gap-2">
            {topCategoryInfo ? (
              <>
                <span>{CATEGORY_METADATA[topCategoryInfo.category]?.label}</span>
                <span className="text-sm font-normal text-orbit-text-muted">
                  ({formatINR(topCategoryInfo.amountPaise)})
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
          <p className="mt-1 text-[11px] text-orbit-text-muted">
            Highest expense category this month
          </p>
        </div>
      </div>

      {/* Monthly Budget Progress Bar */}
      <section
        aria-label="Monthly Budget Pacing"
        className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-4 sm:p-5 shadow-orbit-card space-y-3"
        style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orbit-accent" />
            <h3 className="text-sm font-semibold text-orbit-text">
              Monthly Budget Progress
            </h3>
            {isBudgetExceeded ? (
              <span className="rounded-full bg-orbit-danger/10 border border-orbit-danger/30 px-2 py-0.5 text-[10px] font-semibold text-orbit-danger">
                Exceeded
              </span>
            ) : isBudgetWarning ? (
              <span className="rounded-full bg-orbit-warning/10 border border-orbit-warning/30 px-2 py-0.5 text-[10px] font-semibold text-orbit-warning">
                80% Reached
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {isEditingBudget ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 15000"
                  className="min-h-[36px] w-28 rounded-orbit-control border border-orbit-border bg-orbit-bg px-2.5 text-xs text-orbit-text focus:outline-none focus:border-orbit-accent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="min-h-[36px] px-3 rounded-orbit-control bg-orbit-accent text-orbit-accent-fg text-xs font-semibold hover:bg-orbit-accent-hover transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="min-h-[36px] px-2.5 rounded-orbit-control border border-orbit-border text-xs text-orbit-text-secondary hover:bg-orbit-subtle transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-orbit-text">
                  {formatINR(monthSpendPaise)}{" "}
                  <span className="text-orbit-text-muted font-normal">
                    / {monthlyBudgetPaise ? formatINR(monthlyBudgetPaise) : "No Budget"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput(
                      monthlyBudgetPaise ? (monthlyBudgetPaise / 100).toString() : ""
                    );
                    setIsEditingBudget(true);
                  }}
                  className="min-h-[36px] px-2.5 rounded-orbit-control border border-orbit-border text-xs font-medium text-orbit-text-secondary hover:text-orbit-text hover:bg-orbit-subtle transition-colors flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{monthlyBudgetPaise ? "Edit Budget" : "Set Budget"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar Container */}
        {monthlyBudgetPaise && monthlyBudgetPaise > 0 ? (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-orbit-subtle overflow-hidden border border-orbit-border">
              <div
                className={`h-full transition-all duration-300 ${
                  isBudgetExceeded
                    ? "bg-orbit-danger"
                    : isBudgetWarning
                    ? "bg-orbit-warning"
                    : "bg-orbit-accent"
                }`}
                style={{ width: `${Math.min(100, budgetPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-orbit-text-muted">
              <span>{budgetPercentage}% of monthly allowance spent</span>
              <span>
                {formatINR(Math.max(0, monthlyBudgetPaise - monthSpendPaise))} remaining
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-orbit-text-muted italic">
            Set a monthly budget to track spending pace and receive 80% limit warnings.
          </p>
        )}
      </section>

      {/* Daily Grouped Ledger Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-orbit-control border border-orbit-border bg-orbit-surface p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-orbit-control text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-subtle transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-semibold text-orbit-text min-w-[120px] text-center">
              {formattedMonthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-orbit-control text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-subtle transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={monthExpenses.length === 0}
          className="flex min-h-[44px] items-center justify-center gap-2 px-3.5 rounded-orbit-control border border-orbit-border bg-orbit-surface text-xs font-semibold text-orbit-text-secondary hover:text-orbit-text hover:bg-orbit-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Download monthly ledger as CSV"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Daily Grouped Ledger */}
      {groupedExpenses.length === 0 ? (
        <div
          className="rounded-orbit-panel border border-dashed border-orbit-border bg-orbit-surface/50 p-8 text-center space-y-2"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <Wallet className="h-8 w-8 text-orbit-text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-orbit-text">
            No expenses logged for {formattedMonthLabel}
          </h3>
          <p className="text-xs text-orbit-text-muted max-w-sm mx-auto">
            Log your daily chai, metro, meals, and bills using the quick-log bar above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedExpenses.map((group) => (
            <div
              key={group.date}
              className="rounded-orbit-panel border border-orbit-border bg-orbit-surface shadow-orbit-card overflow-hidden"
              style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
            >
              {/* Date Group Heading */}
              <div className="flex items-center justify-between border-b border-orbit-border bg-orbit-subtle/50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-orbit-text uppercase tracking-wider">
                    {getGroupDateTitle(group.date)}
                  </span>
                  <span className="text-[11px] text-orbit-text-muted">
                    {group.date}
                  </span>
                </div>
                <div className="text-xs font-bold text-orbit-text font-display">
                  {formatINR(group.subtotalPaise)}
                </div>
              </div>

              {/* Transactions List */}
              <div className="divide-y divide-orbit-border">
                {group.items.map((item) => {
                  const meta = CATEGORY_METADATA[item.category];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-orbit-subtle/30 transition-colors gap-3"
                    >
                      {/* Left: Category Badge, Note, Payment Mode */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-orbit-control text-[11px] font-semibold text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: meta?.color || "#64748b" }}
                        >
                          {meta?.label || item.category}
                        </span>

                        <div className="min-w-0 flex-1">
                          {item.note ? (
                            <p className="text-xs sm:text-sm font-medium text-orbit-text truncate">
                              {item.note}
                            </p>
                          ) : (
                            <p className="text-xs text-orbit-text-muted italic">
                              No description
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-block rounded-xs bg-orbit-bg border border-orbit-border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-orbit-text-muted">
                              {item.paymentMode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm sm:text-base font-semibold font-display text-orbit-text">
                          {formatINR(item.amountPaise)}
                        </span>

                        <div className="flex items-center gap-1 pl-2">
                          <button
                            type="button"
                            onClick={() => setEditingExpense(item)}
                            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-orbit-control text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-subtle transition-colors"
                            aria-label="Edit expense"
                            title="Edit expense"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.id)}
                            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-orbit-control text-orbit-text-muted hover:text-orbit-danger hover:bg-orbit-danger/10 transition-colors"
                            aria-label="Delete expense"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Expense Modal */}
      <ExpenseModal
        isOpen={!!editingExpense}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleSaveEditedExpense}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
}
