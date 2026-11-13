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
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from "@/components/ui";

export default function HabitsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);
  const today = useTodayDate();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  async function handleConfirmDeleteHabit() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await db.transaction("rw", [db.habits, db.habitLogs], async () => {
        await db.habitLogs.where("habitId").equals(deleteTargetId).delete();
        await db.habits.delete(deleteTargetId);
      });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  const activeHabitsCount = habits.filter((h) => h.isActive).length;
  const archivedHabitsCount = habits.filter((h) => !h.isActive).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener params={["habitId"]} onDeepLink={handleHabitDeepLink} />
      </Suspense>

      {/* Top Banner */}
      <PageHeader
        eyebrow="DAILY RHYTHM"
        title="Habits"
        description="Steady routines, gentle streaks, and your 180-day rhythm."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingHabit(null);
              setModalOpen(true);
            }}
          >
            New Habit
          </Button>
        }
      />

      {/* Cohesive Momentum Strip + Segmented Filter */}
      <SurfaceCard padding="none" className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Today's momentum summary */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-orbit-text tabular-nums">
                {stats.completedToday} of {stats.activeCount} completed today
              </span>
              <span className="text-xs font-medium text-orbit-accent tabular-nums">
                {stats.completionRate}% daily rate
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-orbit-text-secondary tabular-nums">
                <Flame className="h-3.5 w-3.5 text-orbit-warning" />
                Best streak: {stats.bestGlobalStreak}d
              </span>
            </div>
            <div className="h-1.5 max-w-md overflow-hidden rounded-full bg-orbit-subtle">
              <div
                className="h-full rounded-full bg-orbit-accent transition-all duration-500"
                style={{ width: `${Math.min(100, stats.completionRate)}%` }}
              />
            </div>
          </div>

          {/* Segmented Active / Archived Tabs */}
          <div
            role="tablist"
            aria-label="Habit status views"
            className="inline-flex self-start rounded-orbit-control bg-orbit-surface-secondary p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              className={`inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-[calc(var(--orbit-radius-control)-2px)] px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                activeTab === "active"
                  ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                  : "text-orbit-text-secondary hover:text-orbit-text"
              }`}
            >
              <span>Active</span>
              <span
                className={`tabular-nums ${
                  activeTab === "active" ? "text-orbit-accent" : "text-orbit-text-muted"
                }`}
              >
                {activeHabitsCount}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "archived"}
              onClick={() => setActiveTab("archived")}
              className={`inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-[calc(var(--orbit-radius-control)-2px)] px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                activeTab === "archived"
                  ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                  : "text-orbit-text-secondary hover:text-orbit-text"
              }`}
            >
              <span>Archived</span>
              <span
                className={`tabular-nums ${
                  activeTab === "archived" ? "text-orbit-accent" : "text-orbit-text-muted"
                }`}
              >
                {archivedHabitsCount}
              </span>
            </button>
          </div>
        </div>
      </SurfaceCard>

      {/* Habit Cards List */}
      {displayedHabits.length === 0 ? (
        <EmptyState
          eyebrow="DAILY CADENCE"
          icon={activeTab === "archived" ? <Archive className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          title={activeTab === "archived" ? "No archived habits" : "No active habits yet"}
          description={
            activeTab === "archived"
              ? "Habits you archive will appear here."
              : "Create daily routines or habits to start building steady consistency."
          }
          action={
            activeTab === "active" ? (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingHabit(null);
                  setModalOpen(true);
                }}
              >
                Create Habit
              </Button>
            ) : undefined
          }
        />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteHabit}
        title="Delete habit?"
        description="This will permanently delete the habit and all its logged history. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={isDeleting}
      />
    </div>
  );
}
