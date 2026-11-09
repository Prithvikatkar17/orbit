"use client";

import React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  Clock,
  Repeat,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { LegacyMigrationBanner } from "@/components/legacy-migration-banner";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events";
import { WeeklyProgressWidget } from "@/components/dashboard/weekly-progress";
import { CATEGORY_ICONS } from "@/lib/constants";
import { useTodayDate } from "@/lib/utils/dates";

export default function HomePage() {
  const { openQuickCapture } = useUIStore();
  const todayStr = useTodayDate();

  // Live queries from Dexie
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const habits = useLiveQuery(() => db.habits.filter((h) => h.isActive).toArray()) ?? [];
  const todayLogs = useLiveQuery(
    () => (todayStr ? db.habitLogs.where("date").equals(todayStr).toArray() : []),
    [todayStr]
  ) ?? [];

  const completedTodayHabitIds = new Set(todayLogs.map((l) => l.habitId));

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const dueTodayTasks = openTasks.filter((t) => t.dueDate === todayStr);

  async function toggleHabit(habitId: string) {
    if (!todayStr) return;
    const existing = await db.habitLogs
      .where("[habitId+date]")
      .equals([habitId, todayStr])
      .first();

    if (existing) {
      await db.habitLogs.delete(existing.id);
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        habitId,
        date: todayStr,
        completed: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function toggleTask(task: typeof tasks[0]) {
    const isDone = task.status === "completed";
    await db.tasks.update(task.id, {
      status: isDone ? "todo" : "completed",
      completedAt: isDone ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Migration Alert from Everything-List */}
      <LegacyMigrationBanner />

      {/* Hero Welcome Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
            PERSONAL DASHBOARD
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-white">
            Welcome to ORBIT
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your personal space. Everything in place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openQuickCapture}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Capture</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Open Tasks
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {openTasks.length}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Due Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {dueTodayTasks.length}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Habits Done Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {todayLogs.length} / {habits.length}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Completed Tasks
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {completedTasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Due Today & Recent Tasks */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Today&apos;s Focus
              </h2>
            </div>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {openTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/80" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  All clear! No open tasks.
                </p>
                <button
                  onClick={openQuickCapture}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  + Add a new task
                </button>
              </div>
            ) : (
              openTasks.slice(0, 5).map((task) => {
                const icon = CATEGORY_ICONS[task.category] || "📌";
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/60 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                  >
                    <button
                      onClick={() => toggleTask(task)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 transition-colors hover:border-indigo-600 dark:border-slate-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        <span className="mr-1.5">{icon}</span>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Due {task.dueDate} {task.dueTime ? `· ${task.dueTime}` : ""}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === "high"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : task.priority === "low"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Daily Habits & Routines */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Routines
              </h2>
            </div>
            <Link
              href="/habits"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>Heatmap view</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {habits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <Repeat className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No habits set up yet.
                </p>
                <button
                  onClick={openQuickCapture}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  + Create your first daily routine
                </button>
              </div>
            ) : (
              habits.map((habit) => {
                const done = completedTodayHabitIds.has(habit.id);
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/60 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleHabit(habit.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                          done
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 hover:border-emerald-600 dark:border-slate-600"
                        }`}
                      >
                        {done && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <span
                        className={`text-sm font-semibold ${
                          done
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        🌱 {habit.title}
                      </span>
                    </div>

                    <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {done ? "Completed today" : "Tap to complete"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Weekly Progress & Insights Preview */}
      <WeeklyProgressWidget />

      {/* Upcoming Events (7 Days) Widget */}
      <UpcomingEventsWidget />

      {/* Local-First Privacy Callout Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Local-First & Private:</strong> ORBIT operates 100% in your
          browser. Your data is stored locally in IndexedDB and never leaves your
          device without your explicit action.
        </span>
      </div>
    </div>
  );
}
