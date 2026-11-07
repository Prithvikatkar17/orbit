import Dexie, { type EntityTable } from "dexie";
import type {
  Item,
  Task,
  Habit,
  HabitLog,
  Event,
  Reminder,
  LibraryEntry,
  LibraryCollection,
  LibraryFile,
  Category,
  Settings,
} from "@/lib/schemas";

export class OrbitDatabase extends Dexie {
  items!:              EntityTable<Item, "id">;
  tasks!:              EntityTable<Task, "id">;
  habits!:             EntityTable<Habit, "id">;
  habitLogs!:          EntityTable<HabitLog, "id">;
  events!:             EntityTable<Event, "id">;
  reminders!:          EntityTable<Reminder, "id">;
  libraryEntries!:     EntityTable<LibraryEntry, "id">;
  libraryCollections!: EntityTable<LibraryCollection, "id">;
  libraryFiles!:       EntityTable<LibraryFile, "id">;
  categories!:         EntityTable<Category, "id">;
  settings!:           EntityTable<Settings, "id">;

  constructor() {
    super("orbit-db");

    // Version 1: Initial schema
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

    // Version 2: Phase 4 Personal Library upgrades
    // - Multi-entry index on *tags
    // - Indexed isFavorite, collectionId, lastViewedAt
    // - New libraryCollections table
    // - New libraryFiles table for separate binary blob storage
    this.version(2).stores({
      libraryEntries:     "id, type, status, collectionId, isFavorite, lastViewedAt, createdAt, *tags",
      libraryCollections: "id, name, sortOrder, createdAt",
      libraryFiles:       "id, entryId, fileName, fileType, createdAt",
    }).upgrade(async (tx) => {
      // Safe migration: ensure existing library entries populate default fields
      await tx.table("libraryEntries").toCollection().modify((entry: Partial<LibraryEntry>) => {
        if (entry.isFavorite === undefined) entry.isFavorite = false;
        if (!entry.tags) entry.tags = [];
      });
    });
  }
}

export const db = new OrbitDatabase();
