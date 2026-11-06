import Dexie, { type EntityTable } from "dexie";
import type {
  Item,
  Task,
  Habit,
  HabitLog,
  Event,
  Reminder,
  LibraryEntry,
  Category,
  Settings,
} from "@/lib/schemas";

export class OrbitDatabase extends Dexie {
  items!:          EntityTable<Item, "id">;
  tasks!:          EntityTable<Task, "id">;
  habits!:         EntityTable<Habit, "id">;
  habitLogs!:      EntityTable<HabitLog, "id">;
  events!:         EntityTable<Event, "id">;
  reminders!:      EntityTable<Reminder, "id">;
  libraryEntries!: EntityTable<LibraryEntry, "id">;
  categories!:     EntityTable<Category, "id">;
  settings!:       EntityTable<Settings, "id">;

  constructor() {
    super("orbit-db");

    this.version(1).stores({
      items:          "id, status, category, priority, createdAt",
      tasks:          "id, status, category, priority, dueDate, sortOrder, createdAt",
      habits:         "id, isActive, sortOrder",
      habitLogs:      "id, habitId, date, [habitId+date]",
      events:         "id, type, date, [date+startTime]",
      reminders:      "id, eventId, isActive, lastNotifiedOccurrenceDate, [eventId+isActive]",
      libraryEntries: "id, type, status, createdAt",
      categories:     "id, module, sortOrder",
      settings:       "id",
    });
  }
}

export const db = new OrbitDatabase();

