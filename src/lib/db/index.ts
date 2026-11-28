import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema.ts";

export function getDbPath(): string {
  return process.env.ORBIT_DB_PATH || "orbit.sqlite";
}

function initializeSqliteSchema(sqliteInstance: Database.Database): void {
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS inbox (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      link TEXT,
      category TEXT DEFAULT 'inbox',
      createdAt INTEGER,
      updatedAt INTEGER,
      deletedAt INTEGER,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      link TEXT,
      category TEXT DEFAULT 'task',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      dueDate TEXT,
      dueTime TEXT,
      completedAt INTEGER,
      sortOrder INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      sourceItemId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      frequency TEXT DEFAULT 'daily',
      customDays TEXT DEFAULT '[]',
      targetCount INTEGER DEFAULT 1,
      color TEXT DEFAULT '#10b981',
      isActive INTEGER DEFAULT 1,
      archived INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS habitLogs (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      createdAt INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS habit_date_unique_idx ON habitLogs (habitId, date);

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amountPaise INTEGER NOT NULL,
      category TEXT NOT NULL,
      paymentMode TEXT NOT NULL DEFAULT 'upi',
      note TEXT,
      date TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS calendarEvents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'general',
      date TEXT NOT NULL,
      startTime TEXT,
      endTime TEXT,
      isAllDay INTEGER DEFAULT 1,
      description TEXT,
      recurrence TEXT DEFAULT '{"rule":"none"}',
      color TEXT,
      sourceItemId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      timing TEXT NOT NULL,
      label TEXT,
      lastNotifiedOccurrenceDate TEXT,
      notifiedAt INTEGER,
      acknowledgedAt INTEGER,
      snoozedUntil INTEGER,
      isActive INTEGER DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS libraryCollections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT '📁',
      isDefault INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS libraryEntries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      link TEXT,
      type TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'saved',
      rating INTEGER,
      tags TEXT DEFAULT '[]',
      isFavorite INTEGER DEFAULT 0,
      collectionId TEXT,
      lastViewedAt INTEGER,
      completedAt INTEGER,
      sourceItemId TEXT,
      fileMetadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS libraryFiles (
      id TEXT PRIMARY KEY,
      entryId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      dataBase64 TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      payloadJson TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

function createSqliteConnection(): Database.Database {
  const dbPath = getDbPath();
  const dir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  initializeSqliteSchema(instance);
  return instance;
}

export const sqlite = globalForDb.sqlite ?? createSqliteConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export * from "./schema.ts";
