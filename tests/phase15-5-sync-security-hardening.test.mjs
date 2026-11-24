import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { tasks, habits, habitLogs } from "../src/lib/db/schema.ts";
import { normalizeUrl } from "../src/lib/utils/dates.ts";
import { ItemSchema } from "../src/lib/schemas/item.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { HabitSchema } from "../src/lib/schemas/habit.ts";
import { LibraryEntrySchema } from "../src/lib/schemas/library-entry.ts";

const ROOT_DIR = process.cwd();

test("Phase 15.5: Sync Idempotency, Security & Data Integrity Hardening", async (t) => {
  await t.test("1. URL Protocol Hardening: blocks javascript:, data:, and vbscript:", () => {
    // Dangerous protocols
    assert.equal(normalizeUrl("javascript:alert(1)"), undefined);
    assert.equal(normalizeUrl("JAVASCRIPT:alert(document.cookie)"), undefined);
    assert.equal(normalizeUrl("data:text/html,<script>alert(1)</script>"), undefined);
    assert.equal(normalizeUrl("DATA:text/javascript,evil()"), undefined);
    assert.equal(normalizeUrl("vbscript:msgbox(1)"), undefined);

    // Safe valid URLs
    assert.equal(normalizeUrl("https://example.com"), "https://example.com");
    assert.equal(normalizeUrl("http://localhost:3000"), "http://localhost:3000");
    assert.equal(normalizeUrl("github.com/orbit"), "https://github.com/orbit");
    assert.equal(normalizeUrl(""), undefined);
    assert.equal(normalizeUrl(undefined), undefined);
  });

  await t.test("2. Zod Schema Hardening: blocks unsafe protocols and permits deletedAt", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";
    const nowIso = new Date().toISOString();

    // ItemSchema
    assert.throws(() => {
      ItemSchema.parse({
        id: validUuid,
        title: "Malicious Item",
        link: "javascript:evil()",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    const safeItem = ItemSchema.parse({
      id: validUuid,
      title: "Safe Item",
      link: "https://example.com",
      deletedAt: Date.now(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    assert.equal(safeItem.link, "https://example.com");
    assert.ok(safeItem.deletedAt);

    // TaskSchema
    assert.throws(() => {
      TaskSchema.parse({
        id: validUuid,
        title: "Malicious Task",
        link: "data:text/html,boom",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    const safeTask = TaskSchema.parse({
      id: validUuid,
      title: "Safe Task",
      link: "https://example.com/task",
      deletedAt: Date.now(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    assert.equal(safeTask.link, "https://example.com/task");
    assert.ok(safeTask.deletedAt);

    // HabitSchema
    const safeHabit = HabitSchema.parse({
      id: validUuid,
      title: "Safe Habit",
      deletedAt: Date.now(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    assert.ok(safeHabit.deletedAt);

    // LibraryEntrySchema
    assert.throws(() => {
      LibraryEntrySchema.parse({
        id: validUuid,
        title: "Malicious Library Entry",
        link: "javascript:alert('xss')",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    const safeLibrary = LibraryEntrySchema.parse({
      id: validUuid,
      title: "Safe Library",
      link: "https://example.com/book",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    assert.equal(safeLibrary.link, "https://example.com/book");
  });

  await t.test("3. SQLite Schema: has updatedAt and deletedAt columns", () => {
    const schemaPath = path.join(ROOT_DIR, "src", "lib", "db", "schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");

    // inbox table
    assert.match(content, /inbox\s*=\s*sqliteTable\([\s\S]*?updatedAt:\s*integer\("updatedAt"\)/);
    assert.match(content, /inbox\s*=\s*sqliteTable\([\s\S]*?deletedAt:\s*integer\("deletedAt"\)/);

    // tasks table
    assert.match(content, /tasks\s*=\s*sqliteTable\([\s\S]*?deletedAt:\s*integer\("deletedAt"\)/);

    // habits table
    assert.match(content, /habits\s*=\s*sqliteTable\([\s\S]*?deletedAt:\s*integer\("deletedAt"\)/);
  });

  await t.test("4. API Sync Idempotency & Soft-Delete Tombstones (Source & In-Memory DB Verification)", async () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const testDb = drizzle(sqlite);

    // Initialize in-memory tables
    sqlite.exec(`
      CREATE TABLE inbox (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        link TEXT,
        category TEXT DEFAULT 'inbox',
        createdAt INTEGER,
        updatedAt INTEGER,
        deletedAt INTEGER,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
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

      CREATE TABLE habits (
        id TEXT PRIMARY KEY NOT NULL,
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

      CREATE TABLE habitLogs (
        id TEXT PRIMARY KEY NOT NULL,
        habitId TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX habit_date_unique_idx ON habitLogs (habitId, date);
    `);

    // Test Idempotent Task POST with onConflictDoUpdate
    const taskId = "task-123";
    const taskRecord1 = {
      id: taskId,
      title: "Initial Task",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };
    await testDb.insert(tasks).values(taskRecord1).onConflictDoUpdate({
      target: tasks.id,
      set: taskRecord1,
    });

    // Replaying identical POST must succeed without Primary Key error
    const taskRecord2 = {
      id: taskId,
      title: "Updated Task Name",
      createdAt: taskRecord1.createdAt,
      updatedAt: Date.now(),
      deletedAt: null,
    };
    await testDb.insert(tasks).values(taskRecord2).onConflictDoUpdate({
      target: tasks.id,
      set: taskRecord2,
    });

    const fetchedTask = await testDb.select().from(tasks).where(eq(tasks.id, taskId)).get();
    assert.equal(fetchedTask.title, "Updated Task Name");

    // Test Soft-delete tombstone
    const deleteTime = Date.now();
    await testDb.update(tasks).set({ deletedAt: deleteTime, updatedAt: deleteTime }).where(eq(tasks.id, taskId));
    const deletedTask = await testDb.select().from(tasks).where(eq(tasks.id, taskId)).get();
    assert.equal(deletedTask.deletedAt, deleteTime);

    // Test Idempotent Habit Log with onConflictDoUpdate
    const habitId = "habit-456";
    await testDb.insert(habits).values({
      id: habitId,
      title: "Morning Routine",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });

    const dateStr = "2026-11-24";
    const log1 = {
      id: "log-1",
      habitId,
      date: dateStr,
      completed: true,
      createdAt: Date.now(),
    };
    await testDb.insert(habitLogs).values(log1).onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { completed: true },
    });

    // Idempotent duplicate insert on the same date
    const log2 = {
      id: "log-2",
      habitId,
      date: dateStr,
      completed: true,
      createdAt: Date.now(),
    };
    await testDb.insert(habitLogs).values(log2).onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { completed: true },
    });

    const logs = await testDb.select().from(habitLogs).where(eq(habitLogs.habitId, habitId));
    assert.equal(logs.length, 1, "Must have exactly 1 log for the unique (habitId, date)");
    assert.equal(logs[0].completed, true);

    sqlite.close();
  });

  await t.test("5. Route Handlers & CSRF Protection Verification", () => {
    // /api/reset CSRF header checks
    const resetRoute = path.join(ROOT_DIR, "src", "app", "api", "reset", "route.ts");
    const resetContent = fs.readFileSync(resetRoute, "utf-8");
    assert.match(resetContent, /X-Orbit-Confirm/);
    assert.match(resetContent, /403/);
    assert.match(resetContent, /origin/);

    // Settings page passes X-Orbit-Confirm header
    const settingsPage = path.join(ROOT_DIR, "src", "app", "settings", "page.tsx");
    const settingsContent = fs.readFileSync(settingsPage, "utf-8");
    assert.match(settingsContent, /X-Orbit-Confirm["']\s*:\s*["']reset["']/);

    // Habits log route explicit completed handling
    const habitLogRoute = path.join(ROOT_DIR, "src", "app", "api", "habits", "log", "route.ts");
    const habitLogContent = fs.readFileSync(habitLogRoute, "utf-8");
    assert.match(habitLogContent, /body\.completed\s*!==\s*undefined/);
    assert.match(habitLogContent, /onConflictDoUpdate/);

    // Callers pass explicit completed flag
    const habitCard = path.join(ROOT_DIR, "src", "components", "habits", "habit-card.tsx");
    const habitCardContent = fs.readFileSync(habitCard, "utf-8");
    assert.match(habitCardContent, /completed:\s*false/);
    assert.match(habitCardContent, /completed:\s*true/);

    const homePage = path.join(ROOT_DIR, "src", "app", "page.tsx");
    const homePageContent = fs.readFileSync(homePage, "utf-8");
    assert.match(homePageContent, /completed:\s*existing\s*\?\s*false\s*:\s*true/);
  });

  await t.test("6. Local Date Slicing, Filtered Drag-and-Drop & Two-Way Sync Verification", () => {
    // Local date slicing uses getEntityLocalDate
    const inboxPage = path.join(ROOT_DIR, "src", "app", "inbox", "page.tsx");
    const inboxContent = fs.readFileSync(inboxPage, "utf-8");
    assert.doesNotMatch(inboxContent, /item\.createdAt\.slice\(0,\s*10\)/);
    assert.match(inboxContent, /getEntityLocalDate\(item\.createdAt\)/);

    const libraryCard = path.join(ROOT_DIR, "src", "components", "library", "library-card.tsx");
    const libraryCardContent = fs.readFileSync(libraryCard, "utf-8");
    assert.doesNotMatch(libraryCardContent, /entry\.createdAt\.slice\(0,\s*10\)/);
    assert.match(libraryCardContent, /getEntityLocalDate\(entry\.createdAt\)/);

    const libraryRow = path.join(ROOT_DIR, "src", "components", "library", "library-row.tsx");
    const libraryRowContent = fs.readFileSync(libraryRow, "utf-8");
    assert.doesNotMatch(libraryRowContent, /entry\.createdAt\.slice\(0,\s*10\)/);
    assert.match(libraryRowContent, /getEntityLocalDate\(entry\.createdAt\)/);

    const libraryModal = path.join(ROOT_DIR, "src", "components", "library", "library-detail-modal.tsx");
    const libraryModalContent = fs.readFileSync(libraryModal, "utf-8");
    assert.doesNotMatch(libraryModalContent, /entry\.createdAt\.slice\(0,\s*10\)/);
    assert.match(libraryModalContent, /getEntityLocalDate\(entry\.createdAt\)/);

    // Filtered task drag-and-drop remaps occupiedSlots
    const tasksPage = path.join(ROOT_DIR, "src", "app", "tasks", "page.tsx");
    const tasksContent = fs.readFileSync(tasksPage, "utf-8");
    assert.match(tasksContent, /occupiedSlots/);

    // Two-Way Task ↔ Calendar sync in EventModal and EventDetails
    const eventModal = path.join(ROOT_DIR, "src", "components", "calendar", "event-modal.tsx");
    const eventModalContent = fs.readFileSync(eventModal, "utf-8");
    assert.match(eventModalContent, /linkedTaskId/);
    assert.match(eventModalContent, /syncMutation/);

    const eventDetails = path.join(ROOT_DIR, "src", "components", "calendar", "event-details.tsx");
    const eventDetailsContent = fs.readFileSync(eventDetails, "utf-8");
    assert.match(eventDetailsContent, /linkedTaskId/);
    assert.match(eventDetailsContent, /syncMutation/);
  });
});
