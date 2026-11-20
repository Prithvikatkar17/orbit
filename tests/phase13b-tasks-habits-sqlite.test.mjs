import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { tasks, habits, habitLogs } from "../src/lib/db/schema.ts";
import { eq, and } from "drizzle-orm";

const ROOT_DIR = process.cwd();

test("Phase 13B: Tasks & Habits Local SQLite Migration Verification", async (t) => {
  await t.test("src/lib/db/schema.ts defines tasks, habits, and habitLogs tables with required columns", () => {
    const schemaPath = path.join(ROOT_DIR, "src", "lib", "db", "schema.ts");
    assert.ok(fs.existsSync(schemaPath), "src/lib/db/schema.ts must exist");
    const content = fs.readFileSync(schemaPath, "utf-8");

    // Tasks table
    assert.match(content, /sqliteTable\(["']tasks["']/, "must declare tasks table");
    assert.match(content, /text\(["']title["']\)\.notNull\(\)/, "tasks must have title notNull");
    assert.match(content, /text\(["']status["']\)/, "tasks must have status");
    assert.match(content, /text\(["']priority["']\)/, "tasks must have priority");
    assert.match(content, /text\(["']dueDate["']\)/, "tasks must have dueDate");
    assert.match(content, /integer\(["']createdAt["']\)\.notNull\(\)/, "tasks must have createdAt notNull");
    assert.match(content, /integer\(["']updatedAt["']\)\.notNull\(\)/, "tasks must have updatedAt notNull");

    // Habits table
    assert.match(content, /sqliteTable\(["']habits["']/, "must declare habits table");
    assert.match(content, /text\(["']frequency["']\)/, "habits must have frequency");
    assert.match(content, /text\(["']color["']\)/, "habits must have color");
    assert.match(content, /integer\(["']isActive["']/, "habits must have isActive");
    assert.match(content, /integer\(["']archived["']/, "habits must have archived");

    // HabitLogs table
    assert.match(content, /sqliteTable\(\s*["']habitLogs["']/, "must declare habitLogs table");
    assert.match(content, /references\(\(\)\s*=>\s*habits\.id.*cascade/, "habitLogs must reference habits.id with cascade");
    assert.match(content, /uniqueIndex\(["']habit_date_unique_idx["']\)/, "habitLogs must define unique index on (habitId, date)");
  });

  await t.test("API route files exist and export required HTTP handlers", () => {
    const tasksRoute = path.join(ROOT_DIR, "src", "app", "api", "tasks", "route.ts");
    const habitsRoute = path.join(ROOT_DIR, "src", "app", "api", "habits", "route.ts");
    const habitLogRoute = path.join(ROOT_DIR, "src", "app", "api", "habits", "log", "route.ts");

    assert.ok(fs.existsSync(tasksRoute), "src/app/api/tasks/route.ts must exist");
    assert.ok(fs.existsSync(habitsRoute), "src/app/api/habits/route.ts must exist");
    assert.ok(fs.existsSync(habitLogRoute), "src/app/api/habits/log/route.ts must exist");

    const tasksContent = fs.readFileSync(tasksRoute, "utf-8");
    assert.match(tasksContent, /export async function GET/, "tasks route must export GET");
    assert.match(tasksContent, /export async function POST/, "tasks route must export POST");
    assert.match(tasksContent, /export async function PATCH/, "tasks route must export PATCH");
    assert.match(tasksContent, /export async function DELETE/, "tasks route must export DELETE");

    const habitsContent = fs.readFileSync(habitsRoute, "utf-8");
    assert.match(habitsContent, /export async function GET/, "habits route must export GET");
    assert.match(habitsContent, /export async function POST/, "habits route must export POST");
    assert.match(habitsContent, /export async function PATCH/, "habits route must export PATCH");
    assert.match(habitsContent, /export async function DELETE/, "habits route must export DELETE");

    const habitLogContent = fs.readFileSync(habitLogRoute, "utf-8");
    assert.match(habitLogContent, /export async function POST/, "habit log route must export POST");
  });

  await t.test("Physical SQLite tasks CRUD operations persist and query correctly", async () => {
    const dbPath = path.join(ROOT_DIR, "orbit.sqlite");
    assert.ok(fs.existsSync(dbPath), "orbit.sqlite must exist on disk");

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const testDb = drizzle(sqlite, { schema: { tasks, habits, habitLogs } });

    const taskId = `task-test-${Date.now()}-${crypto.randomUUID()}`;
    const nowEpoch = Date.now();

    // 1. Insert task
    await testDb.insert(tasks).values({
      id: taskId,
      title: "Avionics Telemetry Verification Task",
      notes: "Verify sensor calibration",
      category: "task",
      priority: "high",
      status: "todo",
      dueDate: "2026-11-25",
      dueTime: "14:00",
      sortOrder: 1,
      tags: JSON.stringify(["telemetry", "avionics"]),
      createdAt: nowEpoch,
      updatedAt: nowEpoch,
    });

    // 2. Query task
    const fetchedTasks = await testDb
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    assert.equal(fetchedTasks.length, 1);
    assert.equal(fetchedTasks[0].title, "Avionics Telemetry Verification Task");
    assert.equal(fetchedTasks[0].priority, "high");
    assert.equal(fetchedTasks[0].status, "todo");
    assert.equal(fetchedTasks[0].dueDate, "2026-11-25");

    // 3. Update task
    await testDb
      .update(tasks)
      .set({
        status: "completed",
        completedAt: nowEpoch + 5000,
        updatedAt: nowEpoch + 5000,
      })
      .where(eq(tasks.id, taskId));

    const updatedTasks = await testDb
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    assert.equal(updatedTasks[0].status, "completed");
    assert.equal(updatedTasks[0].completedAt, nowEpoch + 5000);

    // 4. Delete task
    await testDb.delete(tasks).where(eq(tasks.id, taskId));
    const afterDelete = await testDb
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    assert.equal(afterDelete.length, 0);

    sqlite.close();
  });

  await t.test("Physical SQLite habits and habitLogs CRUD with toggle and cascade delete", async () => {
    const dbPath = path.join(ROOT_DIR, "orbit.sqlite");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const testDb = drizzle(sqlite, { schema: { tasks, habits, habitLogs } });

    const habitId = `habit-test-${Date.now()}-${crypto.randomUUID()}`;
    const nowEpoch = Date.now();

    // 1. Insert habit
    await testDb.insert(habits).values({
      id: habitId,
      title: "Daily Micro-Drill Protocol",
      notes: "Daily orbital precision exercise",
      description: "Daily orbital precision exercise",
      frequency: "daily",
      customDays: "[]",
      color: "#10b981",
      isActive: true,
      archived: false,
      sortOrder: 0,
      createdAt: nowEpoch,
      updatedAt: nowEpoch,
    });

    const fetchedHabits = await testDb
      .select()
      .from(habits)
      .where(eq(habits.id, habitId));
    assert.equal(fetchedHabits.length, 1);
    assert.equal(fetchedHabits[0].title, "Daily Micro-Drill Protocol");
    assert.equal(fetchedHabits[0].isActive, true);

    // 2. Insert habit log (toggle on)
    const logId = `log-test-${Date.now()}-${crypto.randomUUID()}`;
    const testDate = "2026-11-20";

    await testDb.insert(habitLogs).values({
      id: logId,
      habitId,
      date: testDate,
      completed: true,
      createdAt: nowEpoch,
    });

    const logs = await testDb
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, testDate)));
    assert.equal(logs.length, 1);
    assert.equal(logs[0].completed, true);

    // 3. Unique index test: attempting to insert another log for same habit and date throws
    assert.throws(() => {
      sqlite
        .prepare("INSERT INTO habitLogs (id, habitId, date, completed, createdAt) VALUES (?, ?, ?, ?, ?)")
        .run("dup-id", habitId, testDate, 1, nowEpoch);
    }, /UNIQUE constraint failed/i);

    // 4. Cascade delete: deleting habit cascades to habitLogs
    await testDb.delete(habits).where(eq(habits.id, habitId));

    const remainingHabits = await testDb.select().from(habits).where(eq(habits.id, habitId));
    const remainingLogs = await testDb.select().from(habitLogs).where(eq(habitLogs.habitId, habitId));

    assert.equal(remainingHabits.length, 0);
    assert.equal(remainingLogs.length, 0, "Deleting habit must cascade to delete associated habitLogs");

    sqlite.close();
  });

  await t.test("UI components integrate optimistic background sync for tasks and habits", () => {
    const tasksPageContent = fs.readFileSync(path.join(ROOT_DIR, "src", "app", "tasks", "page.tsx"), "utf-8");
    assert.match(tasksPageContent, /\/api\/tasks/, "Tasks page must fetch from /api/tasks");
    assert.match(tasksPageContent, /PATCH/, "Tasks page must send PATCH on toggle");
    assert.match(tasksPageContent, /DELETE/, "Tasks page must send DELETE on delete");

    const habitsPageContent = fs.readFileSync(path.join(ROOT_DIR, "src", "app", "habits", "page.tsx"), "utf-8");
    assert.match(habitsPageContent, /\/api\/habits/, "Habits page must fetch from /api/habits");

    const habitCardContent = fs.readFileSync(path.join(ROOT_DIR, "src", "components", "habits", "habit-card.tsx"), "utf-8");
    assert.match(habitCardContent, /\/api\/habits\/log/, "HabitCard must toggle via /api/habits/log");
  });
});
