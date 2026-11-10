import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";
import type { Task } from "../schemas/task.ts";
import type { Habit } from "../schemas/habit.ts";
import type { HabitLog } from "../schemas/habit-log.ts";

export interface DashboardSnapshotData {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export interface DerivedDashboardMetrics {
  activeHabits: Habit[];
  completedTodayHabitIds: Set<string>;
  openTasks: Task[];
  completedTasks: Task[];
  dueTodayTasks: Task[];
}

export interface StorageCounts {
  itemsCount: number;
  tasksCount: number;
  habitsCount: number;
  habitLogsCount: number;
  eventsCount: number;
  remindersCount: number;
  libraryCount: number;
  collectionsCount: number;
  filesCount: number;
}

export const EMPTY_STORAGE_COUNTS: StorageCounts = {
  itemsCount: 0,
  tasksCount: 0,
  habitsCount: 0,
  habitLogsCount: 0,
  eventsCount: 0,
  remindersCount: 0,
  libraryCount: 0,
  collectionsCount: 0,
  filesCount: 0,
};

/**
 * Fetches core dashboard tables in a single batched Promise.all so Dexie
 * tracks all 3 tables under one unified useLiveQuery subscription instead of 6.
 */
export async function fetchDashboardSnapshotData(
  database: OrbitDatabase = defaultDb
): Promise<DashboardSnapshotData> {
  const [tasks, habits, habitLogs] = await Promise.all([
    database.tasks.toArray(),
    database.habits.toArray(),
    database.habitLogs.toArray(),
  ]);

  return { tasks, habits, habitLogs };
}

/**
 * Derives dashboard summary collections deterministically from snapshot data.
 */
export function deriveDashboardMetrics(
  data: DashboardSnapshotData,
  todayStr: string
): DerivedDashboardMetrics {
  const activeHabits = data.habits.filter((h) => h.isActive);
  const completedTodayHabitIds = new Set<string>();

  if (todayStr) {
    for (const log of data.habitLogs) {
      if (log.date === todayStr) {
        completedTodayHabitIds.add(log.habitId);
      }
    }
  }

  const openTasks: Task[] = [];
  const completedTasks: Task[] = [];
  const dueTodayTasks: Task[] = [];

  for (const task of data.tasks) {
    if (task.status === "completed") {
      completedTasks.push(task);
    } else {
      openTasks.push(task);
      if (todayStr && task.dueDate === todayStr) {
        dueTodayTasks.push(task);
      }
    }
  }

  return {
    activeHabits,
    completedTodayHabitIds,
    openTasks,
    completedTasks,
    dueTodayTasks,
  };
}

/**
 * Consolidates all 9 Settings storage counts into a single batched Promise.all
 * so Settings uses 1 Dexie live subscription instead of 9 separate hooks.
 */
export async function fetchDatabaseStorageCounts(
  database: OrbitDatabase = defaultDb
): Promise<StorageCounts> {
  const [
    itemsCount,
    tasksCount,
    habitsCount,
    habitLogsCount,
    eventsCount,
    remindersCount,
    libraryCount,
    collectionsCount,
    filesCount,
  ] = await Promise.all([
    database.items.count(),
    database.tasks.count(),
    database.habits.count(),
    database.habitLogs.count(),
    database.events.count(),
    database.reminders.count(),
    database.libraryEntries.count(),
    database.libraryCollections.count(),
    database.libraryFiles.count(),
  ]);

  return {
    itemsCount,
    tasksCount,
    habitsCount,
    habitLogsCount,
    eventsCount,
    remindersCount,
    libraryCount,
    collectionsCount,
    filesCount,
  };
}

