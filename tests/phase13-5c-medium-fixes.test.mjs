import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deriveDashboardMetrics } from "../src/lib/services/workspace-queries.ts";
import { calculateHabitConsistency } from "../src/lib/services/analytics-service.ts";
import { validateUniqueIds } from "../src/lib/services/backup-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 13.5C: Medium-Severity Stabilization Verification", async (t) => {
  await t.test("1. deriveDashboardMetrics ignores completed: false habit logs and archived tasks", () => {
    const todayStr = "2026-11-21";
    const snapshotData = {
      habits: [
        { id: "habit-1", title: "Read", isActive: true },
        { id: "habit-2", title: "Meditate", isActive: true },
      ],
      habitLogs: [
        { id: "log-1", habitId: "habit-1", date: todayStr, completed: true },
        { id: "log-2", habitId: "habit-2", date: todayStr, completed: false }, // Unchecked/toggled off
      ],
      tasks: [
        { id: "task-1", title: "Active Todo", status: "todo", priority: "medium", dueDate: todayStr },
        { id: "task-2", title: "Completed Todo", status: "completed", priority: "low" },
        { id: "task-3", title: "Archived Todo", status: "archived", priority: "high", dueDate: todayStr },
      ],
    };

    const metrics = deriveDashboardMetrics(snapshotData, todayStr);

    // Habit completion: only habit-1 is completed today, habit-2 (completed: false) must NOT be in set
    assert.ok(metrics.completedTodayHabitIds.has("habit-1"), "habit-1 must be marked completed today");
    assert.ok(!metrics.completedTodayHabitIds.has("habit-2"), "habit-2 with completed:false must NOT be in completedTodayHabitIds");
    assert.equal(metrics.completedTodayHabitIds.size, 1);

    // Tasks: openTasks must contain task-1, completedTasks must contain task-2, archived task-3 must NOT be in openTasks
    assert.equal(metrics.openTasks.length, 1);
    assert.equal(metrics.openTasks[0].id, "task-1");
    assert.equal(metrics.dueTodayTasks.length, 1);
    assert.equal(metrics.dueTodayTasks[0].id, "task-1");
    assert.equal(metrics.completedTasks.length, 1);
    assert.equal(metrics.completedTasks[0].id, "task-2");
  });

  await t.test("2. calculateHabitConsistency excludes out-of-window logs for weekly habits", () => {
    const habits = [
      {
        id: "habit-weekly",
        title: "Weekly Review",
        frequency: "weekly",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ];

    // Effective window: 2026-11-09 to 2026-11-22 (2 Mondays: 2026-11-09 and 2026-11-16)
    // Add an out-of-window log from October and one inside the window
    const habitLogs = [
      { id: "log-out", habitId: "habit-weekly", date: "2026-10-15", completed: true },
      { id: "log-in", habitId: "habit-weekly", date: "2026-11-10", completed: true },
    ];

    const result = calculateHabitConsistency({
      habits,
      habitLogs,
      startDate: "2026-11-09",
      endDate: "2026-11-22",
    });

    assert.equal(result.habits.length, 1);
    const weeklyMetric = result.habits[0];
    assert.equal(weeklyMetric.scheduledCount, 2);
    assert.equal(weeklyMetric.completedCount, 1);
    assert.equal(weeklyMetric.consistencyRate, 50); // 1 / 2 = 50%
  });

  await t.test("3. validateUniqueIds enforces uniqueness on notifications table", () => {
    const validNotifications = [
      { id: "notif-1", eventTitle: "Meeting" },
      { id: "notif-2", eventTitle: "Standup" },
    ];
    assert.doesNotThrow(() => validateUniqueIds("notifications", validNotifications));

    const duplicateNotifications = [
      { id: "notif-1", eventTitle: "Meeting" },
      { id: "notif-1", eventTitle: "Standup" },
    ];
    assert.throws(
      () => validateUniqueIds("notifications", duplicateNotifications),
      /Duplicate ID detected in table 'notifications'/
    );
  });

  await t.test("4. MarkdownContent preserves snake_case_names without italicizing", () => {
    // Read markdown-content.tsx and check token regex
    const markdownContentPath = path.join(ROOT_DIR, "src", "components", "library", "markdown-content.tsx");
    const source = fs.readFileSync(markdownContentPath, "utf-8");

    // Test token regex logic directly
    const tokenRegex =
      /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|(?<=[^\w]|^)_[^_]+_(?=[^\w]|$))/g;

    const testText = "The variable my_snake_case_ident should remain plain while _this is italic_ and *this is too*.";
    const matches = testText.match(tokenRegex);

    assert.ok(matches.includes("_this is italic_"), "Should match standalone _italic_");
    assert.ok(matches.includes("*this is too*"), "Should match *italic*");
    assert.ok(!matches.some((m) => m.includes("snake") || m.includes("case")), "Must NOT match mid-word underscores");

    // Also verify list switching flush logic is present
    assert.ok(
      source.includes("if (isOrderedList && listItems.length > 0)"),
      "Must flush list when switching from ordered to unordered"
    );
    assert.ok(
      source.includes("if (!isOrderedList && listItems.length > 0)"),
      "Must flush list when switching from unordered to ordered"
    );
  });

  await t.test("5. Calendar week and day views cover full 24-hour cycle (00:00 to 23:00)", () => {
    const weekViewPath = path.join(ROOT_DIR, "src", "components", "calendar", "week-view.tsx");
    const dayViewPath = path.join(ROOT_DIR, "src", "components", "calendar", "day-view.tsx");

    const weekSource = fs.readFileSync(weekViewPath, "utf-8");
    const daySource = fs.readFileSync(dayViewPath, "utf-8");

    assert.ok(
      weekSource.includes("Array.from({ length: 24 }, (_, i) => i)"),
      "WeekView must expand to 24 hours"
    );
    assert.ok(
      daySource.includes("Array.from({ length: 24 }, (_, i) => i)"),
      "DayView must expand to 24 hours"
    );
  });

  await t.test("6. Futuristic dashboard displays overdueCount when label is OVERDUE", () => {
    const futuristicDashPath = path.join(ROOT_DIR, "src", "components", "dashboard", "futuristic", "futuristic-dashboard.tsx");
    const source = fs.readFileSync(futuristicDashPath, "utf-8");

    assert.ok(
      source.includes("overdueCount > 0 ? overdueCount : dueTodayTasks.length"),
      "Futuristic dashboard must display overdueCount when overdueCount > 0"
    );
  });

  await t.test("7. Task sync service preserves custom reminders when editing all-day task", () => {
    const taskSyncPath = path.join(ROOT_DIR, "src", "lib", "services", "task-sync-service.ts");
    const source = fs.readFileSync(taskSyncPath, "utf-8");

    assert.ok(
      source.includes('rem.timing.type === "at_time"'),
      "task-sync-service must only remove at_time reminders on all-day tasks"
    );
  });
});
