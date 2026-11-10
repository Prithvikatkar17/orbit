"use client";

import React, { useState, useMemo, useCallback, Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Flame,
  Sparkles,
  Archive,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Habit } from "@/lib/schemas";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitModal } from "@/components/habits/habit-modal";
import { calculateStreak, useTodayDate } from "@/lib/utils/dates";
import { DeepLinkListener } from "@/components/common/deep-link-listener";

export default function HabitsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);
  const today = useTodayDate();

  // Deep link handler for /habits?habitId={id}
  const handleHabitDeepLink = useCallback(async ({ habitId }: Record<string, string>) => {
    if (!habitId) return;
    try {
      const habit = await db.habits.get(habitId);
      if (habit) {
        // Switch tab if habit is archived
        setActiveTab(habit.isActive ? "active" : "archived");
        setHighlightedHabitId(habit.id);

        // Scroll to habit element
        setTimeout(() => {
          const el = document.getElementById(`habit-${habit.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedHabitId((prev) => (prev === habit.id ? null : prev));
        }, 3000);
      } else {
        console.warn(`[DeepLink] Habit not found: ${habitId}`);
      }
    } catch (err) {
      console.error("[DeepLink] Failed to load habit:", err);
    }
  }, []);

  const rawHabits = useLiveQuery(() => db.habits.orderBy("sortOrder").toArray(), []);
  const habits = useMemo(() => rawHabits ?? [], [rawHabits]);

  const rawLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const allLogs = useMemo(() => rawLogs ?? [], [rawLogs]);

  // Filter habits by active/archived tab
  const displayedHabits = useMemo(() => {
    return habits.filter((h) => (activeTab === "active" ? h.isActive : !h.isActive));
  }, [habits, activeTab]);

  // Summary Metrics
  const stats = useMemo(() => {
    const activeHabits = habits.filter((h) => h.isActive);
    const activeCount = activeHabits.length;

    // Check which active habits are completed today
    let completedToday = 0;
    const todayLogs = new Set(
      allLogs.filter((l) => l.date === today && l.completed).map((l) => l.habitId)
    );

    activeHabits.forEach((h) => {
      if (todayLogs.has(h.id)) {
        completedToday++;
      }
    });

    const completionRate =
      activeCount > 0 ? Math.round((completedToday / activeCount) * 100) : 0;

    // Best streak across active habits
    let bestGlobalStreak = 0;
    activeHabits.forEach((h) => {
      const dates = allLogs
        .filter((l) => l.habitId === h.id && l.completed)
        .map((l) => l.date);
      const { currentStreak, bestStreak } = calculateStreak(dates, h.frequency, h.customDays);
      if (bestStreak > bestGlobalStreak) bestGlobalStreak = bestStreak;
      if (currentStreak > bestGlobalStreak) bestGlobalStreak = currentStreak;
    });

    return {
      activeCount,
      completedToday,
      completionRate,
      bestGlobalStreak,
    };
  }, [habits, allLogs, today]);

  // Edit Habit
  function handleEdit(habit: Habit) {
    setEditingHabit(habit);
    setModalOpen(true);
  }

  // Delete Habit and its logs
  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this habit and all its logged history?")) {
      await db.transaction("rw", [db.habits, db.habitLogs], async () => {
        await db.habitLogs.where("habitId").equals(id).delete();
        await db.habits.delete(id);
      });
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener params={["habitId"]} onDeepLink={handleHabitDeepLink} />
      </Suspense>

      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Habit Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build consistency, build momentum, and visualize your daily progress.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed Today
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.completedToday}
            </span>
            <span className="text-xs text-slate-400">/ {stats.activeCount} active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Today&apos;s Rate
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.completionRate}%
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Best Active Streak
          </div>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-bold text-amber-500">
            <Flame className="h-5 w-5 fill-amber-500" />
            <span>{stats.bestGlobalStreak}d</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Habits
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.activeCount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("active")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === "active"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Active Habits ({habits.filter((h) => h.isActive).length})
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === "archived"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Archived ({habits.filter((h) => !h.isActive).length})
        </button>
      </div>

      {/* Habit Cards List */}
      {displayedHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {activeTab === "archived" ? (
              <Archive className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
            {activeTab === "archived" ? "No archived habits" : "No active habits found"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {activeTab === "archived"
              ? "Habits you archive will appear here."
              : "Create daily routines or habits to start building long-term consistency."}
          </p>
          {activeTab === "active" && (
            <button
              onClick={() => {
                setEditingHabit(null);
                setModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Habit</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isHighlighted={habit.id === highlightedHabitId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Habit Modal */}
      {modalOpen && (
        <HabitModal
          initialHabit={editingHabit}
          onClose={() => {
            setModalOpen(false);
            setEditingHabit(null);
          }}
        />
      )}
    </div>
  );
}
