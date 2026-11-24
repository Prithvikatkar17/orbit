"use client";

import React, { useState, useMemo, useCallback, Suspense, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
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
} from "@/components/ui";
import { PersonalityPageHeader } from "@/components/layout/personality-page-header";
import { flushSyncQueue, syncMutation } from "@/lib/services/sync-queue-service";

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

  // Hydrate habits and logs from SQLite backend on mount (hotspot bridge)
  useEffect(() => {
    let isCancelled = false;
    async function syncHabitsFromSQLite() {
      try {
        await flushSyncQueue();
        const res = await fetch("/api/habits?all=true");
        if (res.ok) {
          const data = await res.json();
          if (data.allHabits && Array.isArray(data.allHabits)) {
            for (const serverHabit of data.allHabits) {
              if (isCancelled) break;
              const existing = await db.habits.get(serverHabit.id);
              if (serverHabit.deletedAt) {
                if (existing) {
                  await db.habits.delete(serverHabit.id);
                }
                continue;
              }
              const serverUpdated = typeof serverHabit.updatedAt === "number"
                ? serverHabit.updatedAt
                : serverHabit.updatedAt ? Date.parse(serverHabit.updatedAt) : (serverHabit.createdAt || 0);
              const existingUpdated = existing
                ? (Date.parse(existing.updatedAt) || Date.parse(existing.createdAt) || 0)
                : -1;
              if (!existing || serverUpdated > existingUpdated) {
                let customDays: number[] = [];
                try {
                  if (serverHabit.customDays) {
                    customDays = JSON.parse(serverHabit.customDays);
                  }
                } catch {
                  // fallback
                }
                await db.habits.put({
                  id: serverHabit.id,
                  title: serverHabit.title,
                  notes: serverHabit.notes || serverHabit.description || "",
                  frequency: serverHabit.frequency || "daily",
                  customDays,
                  color: serverHabit.color || "#10b981",
                  isActive: Boolean(serverHabit.isActive),
                  sortOrder: serverHabit.sortOrder ?? 0,
                  createdAt: new Date(serverHabit.createdAt || Date.now()).toISOString(),
                  updatedAt: new Date(serverUpdated || Date.now()).toISOString(),
                });
              }
            }
          }
          if (data.logs && Array.isArray(data.logs)) {
            for (const serverLog of data.logs) {
              if (isCancelled) break;
              // Deduplicate strictly by (habitId, date) compound key
              const existingLog = await db.habitLogs
                .where("[habitId+date]")
                .equals([serverLog.habitId, serverLog.date])
                .first();

              if (!existingLog) {
                await db.habitLogs.put({
                  id: serverLog.id,
                  habitId: serverLog.habitId,
                  date: serverLog.date,
                  completed: Boolean(serverLog.completed),
                  createdAt: new Date(serverLog.createdAt || Date.now()).toISOString(),
                });
              } else if (existingLog.id !== serverLog.id) {
                // Reconcile client temporary UUID with canonical server UUID
                await db.habitLogs.delete(existingLog.id);
                await db.habitLogs.put({
                  id: serverLog.id,
                  habitId: serverLog.habitId,
                  date: serverLog.date,
                  completed: Boolean(serverLog.completed),
                  createdAt: existingLog.createdAt,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Habits SQLite hydration warning:", err);
      }
    }
    syncHabitsFromSQLite();
    return () => {
      isCancelled = true;
    };
  }, []);

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
    const targetId = deleteTargetId;
    setIsDeleting(true);
    try {
      // Non-blocking optimistic background delete to SQLite backend
      void syncMutation({
        endpoint: `/api/habits?id=${encodeURIComponent(targetId)}`,
        method: "DELETE",
        entityType: "habit",
        entityId: targetId,
      });

      await db.transaction("rw", [db.habits, db.habitLogs], async () => {
        await db.habitLogs.where("habitId").equals(targetId).delete();
        await db.habits.delete(targetId);
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

      {/* Personality Page Header */}
      <PersonalityPageHeader
        moduleIndex="02"
        title="Habits & Rituals"
        subtitle="Daily consistency, cadence streaks, and long-term momentum."
        metrics={[
          { label: "Active", value: stats.activeCount },
          {
            label: "Done Today",
            value: `${stats.completedToday}/${stats.activeCount}`,
            tone: stats.completedToday > 0 ? "accent" : "default",
          },
          { label: "Rate", value: `${stats.completionRate}%` },
          { label: "Best Streak", value: `${stats.bestGlobalStreak}d` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Active / Archived Filter Tabs */}
            <div
              role="tablist"
              aria-label="Habit status views"
              className="inline-flex rounded-orbit-control border border-orbit-border/70 bg-orbit-surface-secondary/70 p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "active"}
                onClick={() => setActiveTab("active")}
                className={`inline-flex min-h-[34px] sm:min-h-[30px] items-center gap-1.5 rounded-[calc(var(--orbit-radius-control)-2px)] px-2.5 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                  activeTab === "active"
                    ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                    : "text-orbit-text-secondary hover:text-orbit-text"
                }`}
              >
                <span>Active</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    activeTab === "active" ? "text-orbit-accent font-bold" : "text-orbit-text-muted"
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
                className={`inline-flex min-h-[34px] sm:min-h-[30px] items-center gap-1.5 rounded-[calc(var(--orbit-radius-control)-2px)] px-2.5 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                  activeTab === "archived"
                    ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                    : "text-orbit-text-secondary hover:text-orbit-text"
                }`}
              >
                <span>Archived</span>
                {archivedHabitsCount > 0 && (
                  <span
                    className={`tabular-nums text-[11px] ${
                      activeTab === "archived" ? "text-orbit-accent font-bold" : "text-orbit-text-muted"
                    }`}
                  >
                    {archivedHabitsCount}
                  </span>
                )}
              </button>
            </div>

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
          </div>
        }
      />

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
