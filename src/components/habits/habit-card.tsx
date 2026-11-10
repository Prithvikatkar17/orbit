"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Flame,
  Trophy,
  Check,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Habit, HabitLogSchema } from "@/lib/schemas";
import { HabitHeatmap } from "@/components/habits/heatmap";
import { calculateStreak, useTodayDate } from "@/lib/utils/dates";

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  isHighlighted?: boolean;
}

export function HabitCard({ habit, onEdit, onDelete, isHighlighted }: HabitCardProps) {
  const today = useTodayDate();

  // Reactive query for logs belonging to this habit
  const rawLogs = useLiveQuery(
    () => db.habitLogs.where("habitId").equals(habit.id).toArray(),
    [habit.id]
  );
  const logs = useMemo(() => rawLogs ?? [], [rawLogs]);

  const completedDates = useMemo(() => {
    return new Set(logs.filter((l) => l.completed).map((l) => l.date));
  }, [logs]);

  const isCompletedToday = completedDates.has(today);

  const { currentStreak, bestStreak } = useMemo(() => {
    return calculateStreak(Array.from(completedDates), habit.frequency, habit.customDays);
  }, [completedDates, habit.frequency, habit.customDays]);

  // Toggle today's completion
  async function toggleToday() {
    if (isCompletedToday) {
      // Find and delete the log for today
      const todayLog = logs.find((l) => l.date === today && l.completed);
      if (todayLog) {
        await db.habitLogs.delete(todayLog.id);
      }
    } else {
      // Add log for today
      const newLog = HabitLogSchema.parse({
        id: crypto.randomUUID(),
        habitId: habit.id,
        date: today,
        completed: true,
        createdAt: new Date().toISOString(),
      });
      await db.habitLogs.add(newLog);
    }
  }

  // Toggle archive status
  async function toggleArchive() {
    await db.habits.update(habit.id, {
      isActive: !habit.isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  const frequencyLabel =
    habit.frequency === "daily"
      ? "Daily"
      : habit.frequency === "weekdays"
      ? "Mon - Fri"
      : habit.frequency === "weekly"
      ? "Weekly"
      : "Custom Days";

  return (
    <div
      id={`habit-${habit.id}`}
      className={`rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 dark:bg-slate-900 ${
        isHighlighted
          ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950 border-indigo-400 dark:border-indigo-500 shadow-md"
          : habit.isActive
          ? "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          : "border-slate-200/60 bg-slate-50/50 opacity-70 dark:border-slate-800/60 dark:bg-slate-900/40"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {habit.title}
              </h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {frequencyLabel}
              </span>
              {!habit.isActive && (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  Archived
                </span>
              )}
            </div>
            {habit.notes && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {habit.notes}
              </p>
            )}
          </div>
        </div>

        {/* Streaks and Today Button */}
        <div className="flex items-center gap-3">
          {/* Current Streak */}
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: `${habit.color}15`,
              color: habit.color,
            }}
            title="Current consecutive streak"
          >
            <Flame className="h-4 w-4" />
            <span>{currentStreak}d streak</span>
          </div>

          {/* Best Streak */}
          <div
            className="hidden items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 md:flex"
            title="All-time best streak"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Best: {bestStreak}d</span>
          </div>

          {/* Today Checkmark Button */}
          <button
            type="button"
            onClick={toggleToday}
            style={
              isCompletedToday
                ? { backgroundColor: habit.color, borderColor: habit.color }
                : undefined
            }
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-xs ${
              isCompletedToday
                ? "text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-md ${
                isCompletedToday ? "bg-white/20" : "border border-slate-300 dark:border-slate-600"
              }`}
            >
              {isCompletedToday && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
            <span>{isCompletedToday ? "Done Today" : "Mark Today"}</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(habit)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              title="Edit habit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={toggleArchive}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              title={habit.isActive ? "Archive habit" : "Unarchive habit"}
            >
              {habit.isActive ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              title="Delete habit"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 180-Day Heatmap */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <HabitHeatmap
          completedDates={completedDates}
          color={habit.color}
          today={today}
        />
      </div>
    </div>
  );
}
