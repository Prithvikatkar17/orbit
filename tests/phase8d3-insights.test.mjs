import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateAnalyticsSnapshot } from "../src/lib/services/analytics-service.ts";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const INSIGHTS_FILES = [
  "src/app/insights/page.tsx",
  "src/components/insights/overview-cards.tsx",
  "src/components/insights/activity-chart.tsx",
  "src/components/insights/habit-breakdown.tsx",
  "src/components/insights/task-distribution.tsx",
  "src/components/insights/recent-accomplishments.tsx",
];

// ---------------------------------------------------------------------------
// 1. Quiet Desk & Paper Editorial Token & Legacy Class Removal
// ---------------------------------------------------------------------------
test("Phase 8D.3 — Insights files avoid legacy slate/indigo/violet styling and use orbit-* tokens", () => {
  for (const file of INSIGHTS_FILES) {
    const src = readSrc(file);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-slate-\d+/, `${file} should not use legacy slate classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-indigo-\d+/, `${file} should not use legacy indigo classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-violet-\d+/, `${file} should not use legacy violet classes`);
    assert.match(src, /orbit-/, `${file} should use Quiet Desk orbit-* semantic tokens`);
  }
});

// ---------------------------------------------------------------------------
// 2. Shared UI Primitives & Editorial Typography
// ---------------------------------------------------------------------------
test("Phase 8D.3 — Insights adopts shared UI primitives, PageHeader, SurfaceCard, Badge, and Newsreader/Geist typography", () => {
  const page = readSrc("src/app/insights/page.tsx");
  const overview = readSrc("src/components/insights/overview-cards.tsx");
  const chart = readSrc("src/components/insights/activity-chart.tsx");
  const habits = readSrc("src/components/insights/habit-breakdown.tsx");
  const tasks = readSrc("src/components/insights/task-distribution.tsx");
  const recent = readSrc("src/components/insights/recent-accomplishments.tsx");

  // Page level
  assert.match(page, /PageHeader/);
  assert.match(page, /INSIGHTS & ANALYTICS/);
  assert.match(page, /Personal Insights/);

  // SurfaceCard usage
  assert.match(overview, /SurfaceCard/);
  assert.match(chart, /SurfaceCard/);
  assert.match(habits, /SurfaceCard/);
  assert.match(tasks, /SurfaceCard/);
  assert.match(recent, /SurfaceCard/);

  // Typography
  assert.match(overview, /font-display/);
  assert.match(overview, /font-mono/);
  assert.match(chart, /font-display/);
  assert.match(chart, /font-mono/);
  assert.match(habits, /font-display/);
  assert.match(habits, /font-mono/);
  assert.match(tasks, /font-display/);
  assert.match(tasks, /font-mono/);
  assert.match(recent, /font-display/);
  assert.match(recent, /font-mono/);

  // Badges
  assert.match(overview, /Badge/);
  assert.match(habits, /Badge/);
  assert.match(tasks, /Badge/);
  assert.match(recent, /Badge/);
});

// ---------------------------------------------------------------------------
// 3. Overview Cards Narrative Summary & Metric Definitions
// ---------------------------------------------------------------------------
test("Phase 8D.3 — OverviewCards contains narrative summary strip and 5 key metric cards", () => {
  const overview = readSrc("src/components/insights/overview-cards.tsx");

  assert.match(overview, /Tasks Completed/);
  assert.match(overview, /Pending Tasks/);
  assert.match(overview, /Completion Rate/);
  assert.match(overview, /Overdue Tasks/);
  assert.match(overview, /Habit Consistency/);
  assert.match(overview, /Rhythm & Output/);
});

// ---------------------------------------------------------------------------
// 4. Analytics Engine Integrity & Snapshot Verification
// ---------------------------------------------------------------------------
test("Phase 8D.3 — calculateAnalyticsSnapshot preserves pure calculation logic", () => {
  const dummyTasks = [
    {
      id: "task-1",
      title: "Write documentation",
      status: "completed",
      priority: "high",
      category: "work",
      completedAt: "2026-11-10T10:00:00.000Z",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-10T10:00:00.000Z",
    },
    {
      id: "task-2",
      title: "Review PRs",
      status: "todo",
      priority: "medium",
      category: "work",
      dueDate: "2026-11-05", // overdue relative to 2026-11-13
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "task-3",
      title: "Plan sprint",
      status: "todo",
      priority: "low",
      category: "planning",
      dueDate: "2026-11-20",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
    },
  ];

  const dummyHabits = [
    {
      id: "habit-1",
      title: "Morning Run",
      frequency: "daily",
      isActive: true,
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
    },
  ];

  const dummyLogs = [
    {
      id: "log-1",
      habitId: "habit-1",
      date: "2026-11-12",
      completed: true,
      completedAt: "2026-11-12T07:00:00.000Z",
      createdAt: "2026-11-12T07:00:00.000Z",
    },
  ];

  const snapshot = calculateAnalyticsSnapshot({
    rangeType: "30d",
    tasks: dummyTasks,
    habits: dummyHabits,
    habitLogs: dummyLogs,
    today: "2026-11-13",
    accomplishmentLimit: 10,
  });

  assert.equal(snapshot.taskOverview.completedTasks, 1);
  assert.equal(snapshot.taskOverview.pendingTasks, 2);
  assert.equal(snapshot.taskOverview.overdueTasks, 1);
  assert.equal(snapshot.taskOverview.completionRate, 33.3);
  assert.ok(snapshot.dailyTaskCompletions.length > 0);
  assert.ok(snapshot.dailyHabitCompletions.length > 0);
  assert.equal(snapshot.distributions.byPriority.length, 3);
  assert.equal(snapshot.distributions.byCategory.length, 2);
  assert.equal(snapshot.recentAccomplishments.length, 1);
  assert.equal(snapshot.recentAccomplishments[0].title, "Write documentation");
});
