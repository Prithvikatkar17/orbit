import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { tasks, habits, habitLogs } from "../src/lib/db/schema.ts";
import { eq, and } from "drizzle-orm";
import {
  parseLocalDate,
  getOffsetDateString,
} from "../src/lib/utils/dates.ts";

const ROOT_DIR = process.cwd();

test("Phase 13.5A: Critical Stabilization Verification", async (t) => {
  await t.test("1. Archivist Habit Grid UTC+ timezone offset calculations are pure local date operations", () => {
    // Test date utility functions
    const testDate = parseLocalDate("2026-11-20");
    assert.equal(testDate.getFullYear(), 2026);
    assert.equal(testDate.getMonth(), 10); // November is 10 (0-indexed)
    assert.equal(testDate.getDate(), 20);

    // Negative offsets (past 7 days)
    assert.equal(getOffsetDateString(0, testDate), "2026-11-20");
    assert.equal(getOffsetDateString(-1, testDate), "2026-11-19");
    assert.equal(getOffsetDateString(-2, testDate), "2026-11-18");
    assert.equal(getOffsetDateString(-3, testDate), "2026-11-17");
    assert.equal(getOffsetDateString(-4, testDate), "2026-11-16");
    assert.equal(getOffsetDateString(-5, testDate), "2026-11-15");
    assert.equal(getOffsetDateString(-6, testDate), "2026-11-14");

    // Positive offset
    assert.equal(getOffsetDateString(1, testDate), "2026-11-21");

    // Verify source code of lectionary-cadence.tsx does not use ISO string split or T00:00:00 drift patterns
    const lectionaryPath = path.join(
      ROOT_DIR,
      "src",
      "components",
      "dashboard",
      "archivist",
      "lectionary-cadence.tsx"
    );
    assert.ok(fs.existsSync(lectionaryPath), "lectionary-cadence.tsx must exist");
    const lectionaryContent = fs.readFileSync(lectionaryPath, "utf-8");

    assert.ok(
      lectionaryContent.includes("parseLocalDate"),
      "lectionary-cadence.tsx must use parseLocalDate"
    );
    assert.ok(
      lectionaryContent.includes("getOffsetDateString"),
      "lectionary-cadence.tsx must use getOffsetDateString"
    );
    assert.ok(
      !lectionaryContent.includes('new Date(todayStr + "T00:00:00")'),
      "lectionary-cadence.tsx must NOT parse with T00:00:00 to avoid UTC+ drift"
    );
    assert.ok(
      !lectionaryContent.includes('.toISOString().split("T")[0]'),
      "lectionary-cadence.tsx must NOT use toISOString().split('T') for local date math"
    );
  });

  await t.test("2. Past-day habit cadence buttons forward target dateStr to onToggleHabit", () => {
    const futuristicCadence = path.join(
      ROOT_DIR,
      "src",
      "components",
      "dashboard",
      "futuristic",
      "habit-cadence.tsx"
    );
    const constellationCadence = path.join(
      ROOT_DIR,
      "src",
      "components",
      "dashboard",
      "midnight",
      "constellation-cadence.tsx"
    );
    const mainPage = path.join(ROOT_DIR, "src", "app", "page.tsx");

    const futContent = fs.readFileSync(futuristicCadence, "utf-8");
    assert.match(
      futContent,
      /onToggleHabit:\s*\(habitId:\s*string,\s*dateStr\?:\s*string\)\s*=>/
    );
    assert.match(
      futContent,
      /onToggleHabit\(habit\.id,\s*dateStr\)/,
      "futuristic cadence must forward dateStr to onToggleHabit"
    );

    const constContent = fs.readFileSync(constellationCadence, "utf-8");
    assert.match(
      constContent,
      /onToggleHabit:\s*\(habitId:\s*string,\s*dateStr\?:\s*string\)\s*=>/
    );
    assert.match(
      constContent,
      /onToggleHabit\(habit\.id,\s*day\.dateStr\)/,
      "constellation cadence must forward day.dateStr to onToggleHabit"
    );

    const pageContent = fs.readFileSync(mainPage, "utf-8");
    assert.match(
      pageContent,
      /(?:async\s+function\s+toggleHabit|const\s+toggleHabit\s*=\s*async)\s*\(\s*habitId:\s*string,\s*dateStr\?:\s*string\s*\)/,
      "page.tsx must define toggleHabit accepting optional dateStr"
    );
    assert.match(
      pageContent,
      /const targetDate = dateStr \|\| todayStr;/,
      "page.tsx must toggle targetDate defaulting to todayStr"
    );
    assert.match(
      pageContent,
      /fetch\("\/api\/habits\/log",\s*\{\s*method:\s*"POST"/,
      "page.tsx must sync habit toggle to /api/habits/log"
    );
  });

  await t.test("3. Habit logs honor custom client UUID and prevent duplicate entries for (habitId, date)", async () => {
    const dbPath = path.join(ROOT_DIR, "orbit.sqlite");
    assert.ok(fs.existsSync(dbPath), "orbit.sqlite must exist");

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const testDb = drizzle(sqlite, { schema: { habits, habitLogs } });

    const habitId = `habit-custom-id-${Date.now()}-${crypto.randomUUID()}`;
    const clientLogId = `client-log-uuid-${Date.now()}-${crypto.randomUUID()}`;
    const dateStr = "2026-11-20";

    // Insert test habit
    await testDb.insert(habits).values({
      id: habitId,
      title: "Test UUID Habit",
      frequency: "daily",
      targetCount: 1,
      color: "#3b82f6",
      isActive: true,
      archived: false,
      createdAt: Date.now(),
    });

    // Insert habit log with client specified UUID
    await testDb.insert(habitLogs).values({
      id: clientLogId,
      habitId,
      date: dateStr,
      completed: true,
      createdAt: Date.now(),
    });

    const inserted = await testDb
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, dateStr)));

    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].id, clientLogId, "Habit log must persist the exact client UUID");

    // Verify unique index enforcement on (habitId, date)
    assert.throws(() => {
      sqlite
        .prepare(
          "INSERT INTO habitLogs (id, habitId, date, completed, createdAt) VALUES (?, ?, ?, ?, ?)"
        )
        .run("duplicate-log-id", habitId, dateStr, 1, Date.now());
    }, /UNIQUE constraint failed/);

    // Clean up
    await testDb.delete(habits).where(eq(habits.id, habitId));
    sqlite.close();
  });

  await t.test("4. Clearing optional fields via PATCH correctly sets null in SQLite tasks", async () => {
    const dbPath = path.join(ROOT_DIR, "orbit.sqlite");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const testDb = drizzle(sqlite, { schema: { tasks } });

    const taskId = `task-clear-test-${Date.now()}-${crypto.randomUUID()}`;
    const now = Date.now();

    // Insert task with optional fields populated
    await testDb.insert(tasks).values({
      id: taskId,
      title: "Task with optional fields",
      notes: "Some notes",
      link: "https://example.com",
      dueDate: "2026-11-30",
      dueTime: "12:00",
      completedAt: now,
      status: "completed",
      priority: "high",
      createdAt: now,
      updatedAt: now,
    });

    let row = (await testDb.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    assert.equal(row.notes, "Some notes");
    assert.equal(row.link, "https://example.com");
    assert.equal(row.dueDate, "2026-11-30");
    assert.equal(row.dueTime, "12:00");
    assert.equal(row.status, "completed");

    // Emulate PATCH with cleared optional fields
    await testDb
      .update(tasks)
      .set({
        notes: null,
        link: null,
        dueDate: null,
        dueTime: null,
        completedAt: null,
        status: "todo",
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId));

    row = (await testDb.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    assert.equal(row.notes, null, "notes must be cleared to null");
    assert.equal(row.link, null, "link must be cleared to null");
    assert.equal(row.dueDate, null, "dueDate must be cleared to null");
    assert.equal(row.dueTime, null, "dueTime must be cleared to null");
    assert.equal(row.completedAt, null, "completedAt must be cleared to null");
    assert.equal(row.status, "todo");

    // Clean up
    await testDb.delete(tasks).where(eq(tasks.id, taskId));
    sqlite.close();
  });

  await t.test("5. Reset endpoint (DELETE /api/reset) and PATCH /api/inbox are properly defined", () => {
    const resetRoute = path.join(ROOT_DIR, "src", "app", "api", "reset", "route.ts");
    assert.ok(fs.existsSync(resetRoute), "src/app/api/reset/route.ts must exist");
    const resetContent = fs.readFileSync(resetRoute, "utf-8");
    assert.match(resetContent, /export async function DELETE/, "reset route must export DELETE");
    assert.match(resetContent, /db\.delete\(habitLogs\)/, "must delete habitLogs");
    assert.match(resetContent, /db\.delete\(habits\)/, "must delete habits");
    assert.match(resetContent, /db\.delete\(tasks\)/, "must delete tasks");
    assert.match(resetContent, /db\.delete\(inbox\)/, "must delete inbox");

    const inboxRoute = path.join(ROOT_DIR, "src", "app", "api", "inbox", "route.ts");
    const inboxContent = fs.readFileSync(inboxRoute, "utf-8");
    assert.match(inboxContent, /export async function PATCH/, "inbox route must export PATCH");
  });

  await t.test("6. ThemePersonalityProvider separates DOM sync and mount-only Dexie hydration", () => {
    const themeProviderPath = path.join(
      ROOT_DIR,
      "src",
      "components",
      "theme-personality-provider.tsx"
    );
    assert.ok(fs.existsSync(themeProviderPath), "theme-personality-provider.tsx must exist");
    const content = fs.readFileSync(themeProviderPath, "utf-8");

    // Check for separate useEffects
    assert.match(
      content,
      /(?:React\.)?useEffect\(\(\)\s*=>\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-orbit-theme",\s*personality\);[\s\S]*?\},\s*\[personality\]\)/,
      "must sync data-orbit-theme in a dedicated useEffect([personality])"
    );

    assert.match(
      content,
      /let cancelled = false;/,
      "mount hydration must use cancelled guard flag"
    );
    assert.match(
      content,
      /db\.settings\.get\("user_settings"\)/,
      "must query db.settings for user_settings on mount"
    );
  });
});
