import { db } from "@/lib/db/client";
import {
  TaskSchema,
  HabitSchema,
  HabitLogSchema,
  LibraryEntrySchema,
  EventSchema,
  ReminderSchema,
  type Task,
  type Habit,
  type HabitLog,
  type LibraryEntry,
  type Event,
  type Reminder,
} from "@/lib/schemas";

export interface LegacyTask {
  id: number;
  title: string;
  category: string;
  priority?: string;
  repeat?: string;
  date?: string;
  time?: string;
  link?: string;
  notes?: string;
  completed?: boolean;
  history?: string[];
  created?: string;
  notified?: boolean;
  lastCompletedDate?: string;
}

export interface MigrationPreview {
  totalLegacyItems: number;
  tasksToImport: number;
  habitsToImport: number;
  habitLogsToImport: number;
  libraryToImport: number;
  eventsToImport: number;
  remindersToImport: number;
  duplicatesCount: number;
  validationErrors: Array<{ id: number; title: string; issue: string }>;
}

export function detectLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("everythingTasks");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function getLegacyTasks(): LegacyTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("everythingTasks") || "[]";
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function isDaily(task: LegacyTask): boolean {
  return String(task?.repeat || "").toLowerCase().trim() === "daily";
}

function isHabit(task: LegacyTask): boolean {
  return isDaily(task) || String(task?.category || "").toLowerCase().trim() === "habit";
}

function isLibraryCategory(cat: string): cat is "watch" | "learn" | "buy" {
  const c = cat.toLowerCase();
  return c === "watch" || c === "youtube" || c === "learn" || c === "buy";
}

export async function analyzeLegacyData(): Promise<MigrationPreview> {
  const legacy = getLegacyTasks();
  const existingTasks = await db.tasks.toArray();
  const existingHabits = await db.habits.toArray();
  const existingLibrary = await db.libraryEntries.toArray();

  const existingTitles = new Set([
    ...existingTasks.map((t) => `${t.title}::${t.createdAt}`),
    ...existingHabits.map((h) => `${h.title}::${h.createdAt}`),
    ...existingLibrary.map((l) => `${l.title}::${l.createdAt}`),
  ]);

  const preview: MigrationPreview = {
    totalLegacyItems: legacy.length,
    tasksToImport: 0,
    habitsToImport: 0,
    habitLogsToImport: 0,
    libraryToImport: 0,
    eventsToImport: 0,
    remindersToImport: 0,
    duplicatesCount: 0,
    validationErrors: [],
  };

  for (const item of legacy) {
    if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
      preview.validationErrors.push({
        id: item.id || 0,
        title: item.title || "(Untitled)",
        issue: "Item title is missing or empty.",
      });
      continue;
    }

    const createdIso = item.created ? new Date(item.created).toISOString() : new Date().toISOString();
    const signature = `${item.title.trim()}::${createdIso}`;

    if (existingTitles.has(signature)) {
      preview.duplicatesCount++;
      continue;
    }

    if (isHabit(item)) {
      preview.habitsToImport++;
      const dates = new Set(item.history || []);
      if (item.lastCompletedDate) dates.add(item.lastCompletedDate);
      preview.habitLogsToImport += dates.size;
    } else if (isLibraryCategory(item.category || "")) {
      preview.libraryToImport++;
    } else {
      preview.tasksToImport++;
      if (item.date) {
        preview.eventsToImport++;
        if (item.time) preview.remindersToImport++;
      }
    }
  }

  return preview;
}

export async function executeLegacyMigration(): Promise<{
  importedTasks: number;
  importedHabits: number;
  importedLogs: number;
  importedLibrary: number;
  importedEvents: number;
  importedReminders: number;
}> {
  const legacy = getLegacyTasks();

  const tasksToAdd: Task[] = [];
  const habitsToAdd: Habit[] = [];
  const logsToAdd: HabitLog[] = [];
  const libraryToAdd: LibraryEntry[] = [];
  const eventsToAdd: Event[] = [];
  const remindersToAdd: Reminder[] = [];

  const existingTasks = await db.tasks.toArray();
  const existingHabits = await db.habits.toArray();
  const existingLibrary = await db.libraryEntries.toArray();

  const existingTitles = new Set([
    ...existingTasks.map((t) => `${t.title}::${t.createdAt}`),
    ...existingHabits.map((h) => `${h.title}::${h.createdAt}`),
    ...existingLibrary.map((l) => `${l.title}::${l.createdAt}`),
  ]);

  const now = new Date();
  const nowIso = now.toISOString();

  for (const item of legacy) {
    const title = item.title?.trim();
    if (!title) continue;

    const createdIso = item.created ? new Date(item.created).toISOString() : nowIso;
    const signature = `${title}::${createdIso}`;
    if (existingTitles.has(signature)) continue;

    const rawPriority = (item.priority || "medium").toLowerCase();
    const priority = rawPriority === "high" || rawPriority === "low" ? rawPriority : "medium";

    if (isHabit(item)) {
      const habitId = crypto.randomUUID();
      const habit: Habit = HabitSchema.parse({
        id: habitId,
        title,
        notes: item.notes || "",
        frequency: "daily",
        customDays: [],
        color: "#10b981",
        isActive: true,
        sortOrder: 0,
        createdAt: createdIso,
        updatedAt: createdIso,
      });
      habitsToAdd.push(habit);

      const historyDates = new Set(item.history || []);
      if (item.lastCompletedDate) historyDates.add(item.lastCompletedDate);

      for (const d of historyDates) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          logsToAdd.push(
            HabitLogSchema.parse({
              id: crypto.randomUUID(),
              habitId,
              date: d,
              completed: true,
              createdAt: `${d}T12:00:00.000Z`,
            })
          );
        }
      }
    } else if (isLibraryCategory(item.category || "")) {
      const rawCat = (item.category || "").toLowerCase();
      const type = rawCat === "youtube" ? "watch" : (rawCat as "watch" | "learn" | "buy");

      libraryToAdd.push(
        LibraryEntrySchema.parse({
          id: crypto.randomUUID(),
          title,
          notes: item.notes || "",
          link: item.link && item.link.startsWith("http") ? item.link : undefined,
          type: type || "other",
          status: item.completed ? "completed" : "saved",
          tags: [item.category],
          createdAt: createdIso,
          updatedAt: createdIso,
        })
      );
    } else {
      const taskId = crypto.randomUUID();
      const rawCat = (item.category || "task").toLowerCase();

      tasksToAdd.push(
        TaskSchema.parse({
          id: taskId,
          title,
          notes: item.notes || "",
          link: item.link && item.link.startsWith("http") ? item.link : undefined,
          category: rawCat === "goal" ? "goal" : rawCat === "idea" ? "idea" : "task",
          priority,
          status: item.completed ? "completed" : "todo",
          dueDate: item.date || undefined,
          dueTime: item.time || undefined,
          completedAt: item.completed ? createdIso : undefined,
          sortOrder: 0,
          tags: [item.category || "task"],
          createdAt: createdIso,
          updatedAt: createdIso,
        })
      );

      // If item has a date, also mirror to events & reminders
      if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        const eventId = crypto.randomUUID();
        eventsToAdd.push(
          EventSchema.parse({
            id: eventId,
            title,
            notes: item.notes || "",
            type: rawCat === "goal" ? "deadline" : "general",
            date: item.date,
            startTime: item.time || undefined,
            isAllDay: !item.time,
            recurrence: { rule: "none" },
            sourceItemId: taskId,
            createdAt: createdIso,
            updatedAt: createdIso,
          })
        );

        if (item.time) {
          const isDelivered = item.notified === true;
          remindersToAdd.push(
            ReminderSchema.parse({
              id: crypto.randomUUID(),
              eventId,
              timing: { type: "at_time" },
              label: "At time of event",
              lastNotifiedOccurrenceDate: isDelivered ? item.date : undefined,
              notifiedAt: undefined,
              acknowledgedAt: undefined,
              isActive: true,
              createdAt: createdIso,
            })
          );
        }
      }
    }
  }

  // Atomic Dexie transaction across all tables
  await db.transaction(
    "rw",
    [db.tasks, db.habits, db.habitLogs, db.libraryEntries, db.events, db.reminders],
    async () => {
      if (tasksToAdd.length) await db.tasks.bulkAdd(tasksToAdd);
      if (habitsToAdd.length) await db.habits.bulkAdd(habitsToAdd);
      if (logsToAdd.length) await db.habitLogs.bulkAdd(logsToAdd);
      if (libraryToAdd.length) await db.libraryEntries.bulkAdd(libraryToAdd);
      if (eventsToAdd.length) await db.events.bulkAdd(eventsToAdd);
      if (remindersToAdd.length) await db.reminders.bulkAdd(remindersToAdd);
    }
  );

  return {
    importedTasks: tasksToAdd.length,
    importedHabits: habitsToAdd.length,
    importedLogs: logsToAdd.length,
    importedLibrary: libraryToAdd.length,
    importedEvents: eventsToAdd.length,
    importedReminders: remindersToAdd.length,
  };
}

export function clearLegacyLocalStorage(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("everythingTasks");
  }
}

