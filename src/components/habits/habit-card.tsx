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
import { Badge, SurfaceCard } from "@/components/ui";

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
    <SurfaceCard
      id={`habit-${habit.id}`}
      padding="md"
      className={`@container group transition-all duration-300 ${
        isHighlighted
          ? "border-orbit-accent ring-2 ring-orbit-accent ring-offset-2 ring-offset-orbit-surface shadow-orbit-elevated"
          : habit.isActive
          ? "hover:border-orbit-border-strong"
          : "bg-orbit-surface-secondary opacity-75"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col gap-3 @[560px]:flex-row @[560px]:items-center @[560px]:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-orbit-border"
            style={{ backgroundColor: habit.color }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="[overflow-wrap:anywhere] text-base font-semibold tracking-tight text-orbit-text">
                {habit.title}
              </h3>
              <span className="text-xs font-medium text-orbit-text-muted">
                · {frequencyLabel}
              </span>
              {!habit.isActive && <Badge variant="warning">Archived</Badge>}
            </div>
            {habit.notes && (
              <p className="[overflow-wrap:anywhere] mt-1 text-xs leading-relaxed text-orbit-text-secondary">
                {habit.notes}
              </p>
            )}
          </div>
        </div>

        {/* Streaks and Today Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Current Streak */}
          <div
            className="inline-flex items-center gap-1.5 rounded-orbit-control px-2.5 py-1 text-xs font-semibold tabular-nums"
            style={{
              backgroundColor: `${habit.color}18`,
              color: habit.color,
            }}
            title="Current consecutive streak"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{currentStreak}d streak</span>
          </div>

          {/* Best Streak (quiet inline label) */}
          <div
            className="hidden items-center gap-1 text-xs font-medium text-orbit-text-muted tabular-nums @[560px]:inline-flex"
            title="All-time best streak"
          >
            <Trophy className="h-3.5 w-3.5 text-orbit-warning" />
            <span>Best {bestStreak}d</span>
          </div>

          {/* Today Checkmark Button */}
          <button
            type="button"
            onClick={toggleToday}
            aria-pressed={isCompletedToday}
            style={
              isCompletedToday
                ? { backgroundColor: habit.color, borderColor: habit.color }
                : undefined
            }
            className={`inline-flex min-h-[44px] sm:min-h-[38px] items-center gap-2 rounded-orbit-control border px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-surface ${
              isCompletedToday
                ? "text-white shadow-orbit-xs"
                : "border-orbit-border-strong bg-orbit-surface text-orbit-text hover:bg-orbit-surface-secondary"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded ${
                isCompletedToday
                  ? "bg-white/25"
                  : "border border-orbit-border-strong"
              }`}
            >
              {isCompletedToday && <Check className="h-3 w-3 stroke-[3]" />}
            </span>
            <span>{isCompletedToday ? "Done today" : "Mark today"}</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-75 [@media(hover:hover)]:transition-opacity [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(habit)}
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring"
              title="Edit habit"
              aria-label={`Edit ${habit.title}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleArchive}
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring"
              title={habit.isActive ? "Archive habit" : "Unarchive habit"}
              aria-label={
                habit.isActive
                  ? `Archive ${habit.title}`
                  : `Unarchive ${habit.title}`
              }
            >
              {habit.isActive ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(habit.id)}
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-danger-soft hover:text-orbit-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring"
              title="Delete habit"
              aria-label={`Delete ${habit.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="mt-4 border-t border-orbit-border pt-4">
        <HabitHeatmap
          completedDates={completedDates}
          color={habit.color}
          today={today}
        />
      </div>
    </SurfaceCard>
  );
}
