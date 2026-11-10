import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  fetchDashboardSnapshotData,
  deriveDashboardMetrics,
  fetchDatabaseStorageCounts,
  EMPTY_STORAGE_COUNTS,
} from "../src/lib/services/workspace-queries.ts";
import {
  computeNextFocusIndex,
  getFocusableElements,
} from "../src/lib/utils/focus-trap.ts";
import { calculateAnalyticsSnapshot } from "../src/lib/services/analytics-service.ts";

// ---------------------------------------------------------------------------
// 1. Consolidated Dashboard Query Logic
// ---------------------------------------------------------------------------
test("Phase 7E — Consolidated fetchDashboardSnapshotData fetches each table once and derives metrics accurately", async () => {
  const callCounts = { tasks: 0, habits: 0, habitLogs: 0 };
  const todayStr = "2026-11-10";
  const nowIso = "2026-11-10T09:00:00.000Z";

  const mockTasks = [
    {
      id: "t1",
      title: "Due Today Open Task",
      category: "task",
      priority: "high",
      status: "todo",
      dueDate: todayStr,
      sortOrder: 0,
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "t2",
      title: "Future Open Task",
      category: "task",
      priority: "medium",
      status: "in_progress",
      dueDate: "2026-11-15",
      sortOrder: 1,
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "t3",
      title: "Completed Task",
      category: "task",
      priority: "low",
      status: "completed",
      completedAt: nowIso,
      sortOrder: 2,
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const mockHabits = [
    {
      id: "h1",
      title: "Read 20 pages",
      frequency: "daily",
      customDays: [],
      color: "#10b981",
      isActive: true,
      sortOrder: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "h2",
      title: "Archived Habit",
      frequency: "daily",
      customDays: [],
      color: "#6366f1",
      isActive: false,
      sortOrder: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const mockLogs = [
    { id: "l1", habitId: "h1", date: todayStr, completed: true, createdAt: nowIso },
    { id: "l2", habitId: "h1", date: "2026-11-09", completed: true, createdAt: nowIso },
  ];

  const mockDb = {
    tasks: {
      async toArray() {
        callCounts.tasks++;
        return mockTasks;
      },
    },
    habits: {
      async toArray() {
        callCounts.habits++;
        return mockHabits;
      },
    },
    habitLogs: {
      async toArray() {
        callCounts.habitLogs++;
        return mockLogs;
      },
    },
  };

  const snapshotData = await fetchDashboardSnapshotData(mockDb);

  // Must invoke each table exactly once
  assert.deepEqual(callCounts, { tasks: 1, habits: 1, habitLogs: 1 });
  assert.equal(snapshotData.tasks.length, 3);
  assert.equal(snapshotData.habits.length, 2);
  assert.equal(snapshotData.habitLogs.length, 2);

  // Derive HomePage metrics
  const derived = deriveDashboardMetrics(snapshotData, todayStr);
  assert.equal(derived.activeHabits.length, 1);
  assert.equal(derived.activeHabits[0].id, "h1");
  assert.equal(derived.completedTodayHabitIds.size, 1);
  assert.ok(derived.completedTodayHabitIds.has("h1"));
  assert.equal(derived.openTasks.length, 2);
  assert.equal(derived.completedTasks.length, 1);
  assert.equal(derived.dueTodayTasks.length, 1);
  assert.equal(derived.dueTodayTasks[0].id, "t1");

  // Verify WeeklyProgress analytics computes cleanly on the exact same shared snapshot
  const analytics = calculateAnalyticsSnapshot({
    rangeType: "7d",
    tasks: snapshotData.tasks,
    habits: snapshotData.habits,
    habitLogs: snapshotData.habitLogs,
    today: todayStr,
  });
  assert.equal(analytics.tasksCompletedInRange, 1);
});

// ---------------------------------------------------------------------------
// 2. Consolidated Settings Storage Query Logic
// ---------------------------------------------------------------------------
test("Phase 7E — Consolidated fetchDatabaseStorageCounts queries all 9 tables once accurately", async () => {
  const countsMap = {
    items: 4,
    tasks: 12,
    habits: 5,
    habitLogs: 42,
    events: 8,
    reminders: 3,
    libraryEntries: 19,
    libraryCollections: 2,
    libraryFiles: 6,
  };

  const calls = {};
  const mockDb = {};
  for (const [tableName, countVal] of Object.entries(countsMap)) {
    calls[tableName] = 0;
    mockDb[tableName] = {
      async count() {
        calls[tableName]++;
        return countVal;
      },
    };
  }

  const result = await fetchDatabaseStorageCounts(mockDb);

  assert.deepEqual(result, {
    itemsCount: 4,
    tasksCount: 12,
    habitsCount: 5,
    habitLogsCount: 42,
    eventsCount: 8,
    remindersCount: 3,
    libraryCount: 19,
    collectionsCount: 2,
    filesCount: 6,
  });

  // Verify each table was counted exactly once
  for (const tableName of Object.keys(countsMap)) {
    assert.equal(calls[tableName], 1);
  }

  // Verify fallback constant shape
  assert.equal(Object.keys(EMPTY_STORAGE_COUNTS).length, 9);
});

// ---------------------------------------------------------------------------
// 3. Focus Trap & Accessibility Utilities
// ---------------------------------------------------------------------------
test("Phase 7E — computeNextFocusIndex wraps Tab and Shift+Tab cleanly across modal bounds", () => {
  // Empty container
  assert.equal(computeNextFocusIndex(0, -1, false), -1);
  assert.equal(computeNextFocusIndex(0, 0, true), -1);

  // Forward Tab
  assert.equal(computeNextFocusIndex(3, -1, false), 0);
  assert.equal(computeNextFocusIndex(3, 0, false), 1);
  assert.equal(computeNextFocusIndex(3, 1, false), 2);
  assert.equal(computeNextFocusIndex(3, 2, false), 0); // Wrap to first

  // Backward Shift+Tab
  assert.equal(computeNextFocusIndex(3, -1, true), 2);
  assert.equal(computeNextFocusIndex(3, 2, true), 1);
  assert.equal(computeNextFocusIndex(3, 1, true), 0);
  assert.equal(computeNextFocusIndex(3, 0, true), 2); // Wrap to last
});

test("Phase 7E — getFocusableElements filters disabled and aria-hidden elements safely", () => {
  assert.deepEqual(getFocusableElements(null), []);

  const mockElements = [
    {
      hasAttribute: (attr) => attr === "disabled",
      getAttribute: () => null,
    },
    {
      hasAttribute: () => false,
      getAttribute: (attr) => (attr === "aria-hidden" ? "true" : null),
    },
    {
      id: "valid-btn",
      hasAttribute: () => false,
      getAttribute: () => null,
    },
  ];

  const mockContainer = {
    querySelectorAll: () => mockElements,
  };

  const result = getFocusableElements(mockContainer);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "valid-btn");
});

// ---------------------------------------------------------------------------
// 4. Error Boundary Safety & Fallback Contracts
// ---------------------------------------------------------------------------
test("Phase 7E — Route and global error boundaries implement safe reset, navigation, and zero stack leaks", () => {
  const routeErrorPath = path.resolve("src/app/error.tsx");
  const globalErrorPath = path.resolve("src/app/global-error.tsx");

  const routeSource = fs.readFileSync(routeErrorPath, "utf8");
  const globalSource = fs.readFileSync(globalErrorPath, "utf8");

  for (const [name, src] of [
    ["src/app/error.tsx", routeSource],
    ["src/app/global-error.tsx", globalSource],
  ]) {
    assert.ok(src.startsWith('"use client"'), `${name} must be a client component`);
    assert.ok(src.includes('role="alert"'), `${name} must include role="alert"`);
    assert.ok(src.includes("reset()"), `${name} must call reset() on retry action`);
    assert.ok(src.includes('href="/"'), `${name} must include safe navigation back to dashboard /`);

    // Must never leak stack traces or internal message details into rendered UI
    assert.ok(!src.includes("error.stack"), `${name} must not expose error.stack`);
    assert.ok(!src.includes("error.message"), `${name} must not expose error.message in JSX`);

    // Must not introduce risky database or store dependencies
    assert.ok(!src.includes("db/client"), `${name} must not depend on Dexie db`);
    assert.ok(!src.includes("stores/"), `${name} must not depend on Zustand stores`);
  }

  // global-error.tsx must render root <html> and <body>
  assert.ok(globalSource.includes("<html"), "global-error.tsx must render <html>");
  assert.ok(globalSource.includes("<body"), "global-error.tsx must render <body>");
});

// ---------------------------------------------------------------------------
// 5. Modal & Interactive Control Accessibility Contracts
// ---------------------------------------------------------------------------
test("Phase 7E — All dialog modals enforce role=dialog, aria-modal, labelledby, close labels, and focus trap", () => {
  const modalPaths = [
    "src/components/tasks/task-modal.tsx",
    "src/components/habits/habit-modal.tsx",
    "src/components/calendar/event-modal.tsx",
    "src/components/inbox/convert-modal.tsx",
    "src/components/library/library-entry-modal.tsx",
    "src/components/library/library-collection-modal.tsx",
    "src/components/library/library-detail-modal.tsx",
    "src/components/quick-capture-modal.tsx",
  ];

  for (const relPath of modalPaths) {
    const src = fs.readFileSync(path.resolve(relPath), "utf8");
    assert.ok(src.includes('role="dialog"'), `${relPath} missing role="dialog"`);
    assert.ok(src.includes('aria-modal="true"'), `${relPath} missing aria-modal="true"`);
    assert.ok(src.includes("aria-labelledby="), `${relPath} missing aria-labelledby`);
    assert.ok(src.includes("useAccessibleModal"), `${relPath} missing useAccessibleModal hook`);
    assert.ok(src.includes('aria-label="Close modal"'), `${relPath} missing accessible close label`);
  }

  // Verify dashboard toggle buttons include explicit accessible labels
  const dashSrc = fs.readFileSync(path.resolve("src/app/page.tsx"), "utf8");
  assert.ok(dashSrc.includes("aria-pressed={done}"), "Habit checkbox missing aria-pressed");
  assert.ok(dashSrc.includes("as completed"), "Task toggle button missing accessible aria-label");
});

