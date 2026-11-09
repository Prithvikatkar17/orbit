import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveDateRange,
  getDateList,
  getEntityLocalDate,
  getTaskCompletionDate,
  getDailyTaskCompletions,
  getTasksCompletedInRange,
  getDailyHabitCompletions,
  getHabitsCompletedInRange,
  getTaskOverviewMetrics,
  calculateHabitConsistency,
  calculateHabitStreaks,
  isGoalTask,
  getGoalProgress,
  getTaskDistributions,
  calculatePeriodChange,
  getRecentAccomplishments,
  calculateAnalyticsSnapshot,
} from "../src/lib/services/analytics-service.ts";

test("Phase 5A: Date Range Resolution across 7d, 30d, 90d and All Time", () => {
  const today = "2026-11-09";

  // 1. 7-day range
  const range7d = resolveDateRange("7d", { today });
  assert.equal(range7d.type, "7d");
  assert.equal(range7d.endDate, "2026-11-09");
  assert.equal(range7d.startDate, "2026-11-03");
  assert.equal(range7d.daysCount, 7);
  assert.equal(range7d.previousEndDate, "2026-11-02");
  assert.equal(range7d.previousStartDate, "2026-10-27");

  // 2. 30-day range
  const range30d = resolveDateRange("30d", { today });
  assert.equal(range30d.type, "30d");
  assert.equal(range30d.endDate, "2026-11-09");
  assert.equal(range30d.startDate, "2026-10-11");
  assert.equal(range30d.daysCount, 30);
  assert.equal(range30d.previousEndDate, "2026-10-10");
  assert.equal(range30d.previousStartDate, "2026-09-11");

  // 3. 90-day range
  const range90d = resolveDateRange("90d", { today });
  assert.equal(range90d.type, "90d");
  assert.equal(range90d.endDate, "2026-11-09");
  assert.equal(range90d.startDate, "2026-08-12");
  assert.equal(range90d.daysCount, 90);
  assert.equal(range90d.previousEndDate, "2026-08-11");
  assert.equal(range90d.previousStartDate, "2026-05-14");

  // 4. All Time with earliest date
  const rangeAll = resolveDateRange("all", { today, earliestDate: "2026-01-01" });
  assert.equal(rangeAll.type, "all");
  assert.equal(rangeAll.startDate, "2026-01-01");
  assert.equal(rangeAll.endDate, "2026-11-09");
  assert.equal(rangeAll.previousStartDate, null, "All Time must have null previous start date");
  assert.equal(rangeAll.previousEndDate, null, "All Time must have null previous end date");
  assert.ok(rangeAll.daysCount > 300);

  // 5. All Time without earliest date (defaults to today)
  const rangeAllEmpty = resolveDateRange("all", { today });
  assert.equal(rangeAllEmpty.startDate, "2026-11-09");
  assert.equal(rangeAllEmpty.endDate, "2026-11-09");
  assert.equal(rangeAllEmpty.daysCount, 1);
});

test("Phase 5A: getDateList and getEntityLocalDate utilities", () => {
  const dates = getDateList("2026-11-01", "2026-11-05");
  assert.deepEqual(dates, [
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
  ]);

  // Single day
  assert.deepEqual(getDateList("2026-11-09", "2026-11-09"), ["2026-11-09"]);

  // getEntityLocalDate normalization
  assert.equal(getEntityLocalDate("2026-11-09"), "2026-11-09");
  assert.equal(getEntityLocalDate("2026-11-09T14:30:00.000Z").length, 10);
  assert.equal(getEntityLocalDate(undefined).length, 10);
});

test("Phase 5A: Task Completion Date extraction and fallback", () => {
  // 1. Regular completed task with completedAt
  const taskWithCompletedAt = {
    id: "t1",
    status: "completed",
    completedAt: "2026-11-08T14:30:00.000Z",
    updatedAt: "2026-11-08T15:00:00.000Z",
  };
  const d1 = getTaskCompletionDate(taskWithCompletedAt);
  assert.ok(d1?.startsWith("2026-11-08"));

  // 2. Missing completedAt, falls back to updatedAt
  const taskWithFallback = {
    id: "t2",
    status: "completed",
    completedAt: undefined,
    updatedAt: "2026-11-07T10:00:00.000Z",
  };
  const d2 = getTaskCompletionDate(taskWithFallback);
  assert.ok(d2?.startsWith("2026-11-07"));

  // 3. Direct YYYY-MM-DD string
  const taskDirectDate = {
    id: "t3",
    status: "completed",
    completedAt: "2026-11-06",
    updatedAt: "2026-11-06T12:00:00.000Z",
  };
  assert.equal(getTaskCompletionDate(taskDirectDate), "2026-11-06");

  // 4. Non-completed task returns null even if updatedAt exists
  const openTask = {
    id: "t4",
    status: "todo",
    completedAt: undefined,
    updatedAt: "2026-11-09T08:00:00.000Z",
  };
  assert.equal(getTaskCompletionDate(openTask), null);

  // 5. In-progress task returns null
  const inProgressTask = {
    id: "t5",
    status: "in_progress",
    completedAt: undefined,
    updatedAt: "2026-11-09T08:00:00.000Z",
  };
  assert.equal(getTaskCompletionDate(inProgressTask), null);
});

test("Phase 5A: Daily task and habit aggregations with zero-padding", () => {
  const startDate = "2026-11-05";
  const endDate = "2026-11-08";

  const tasks = [
    {
      id: "t1",
      title: "Task 1",
      category: "task",
      priority: "medium",
      status: "completed",
      completedAt: "2026-11-05",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
    {
      id: "t2",
      title: "Task 2",
      category: "task",
      priority: "high",
      status: "completed",
      completedAt: "2026-11-05",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
    {
      id: "t3",
      title: "Task 3",
      category: "task",
      priority: "low",
      status: "completed",
      completedAt: "2026-11-07",
      createdAt: "2026-11-07T00:00:00.000Z",
      updatedAt: "2026-11-07T00:00:00.000Z",
    },
    {
      id: "t4",
      title: "Task 4 (Outside range)",
      category: "task",
      priority: "medium",
      status: "completed",
      completedAt: "2026-11-10",
      createdAt: "2026-11-10T00:00:00.000Z",
      updatedAt: "2026-11-10T00:00:00.000Z",
    },
  ];

  const dailyTasks = getDailyTaskCompletions(tasks, startDate, endDate);
  assert.equal(dailyTasks.length, 4);
  assert.deepEqual(dailyTasks, [
    { date: "2026-11-05", count: 2 },
    { date: "2026-11-06", count: 0 }, // zero-padded
    { date: "2026-11-07", count: 1 },
    { date: "2026-11-08", count: 0 }, // zero-padded
  ]);

  const tasksInRange = getTasksCompletedInRange(tasks, startDate, endDate);
  assert.equal(tasksInRange, 3);

  // Habit logs aggregation
  const habitLogs = [
    { id: "l1", habitId: "h1", date: "2026-11-05", completed: true, createdAt: "2026-11-05T08:00:00.000Z" },
    { id: "l2", habitId: "h2", date: "2026-11-05", completed: true, createdAt: "2026-11-05T09:00:00.000Z" },
    { id: "l3", habitId: "h1", date: "2026-11-05", completed: true, createdAt: "2026-11-05T10:00:00.000Z" }, // duplicate log on same day
    { id: "l4", habitId: "h1", date: "2026-11-08", completed: true, createdAt: "2026-11-08T08:00:00.000Z" },
    { id: "l5", habitId: "h1", date: "2026-11-07", completed: false, createdAt: "2026-11-07T08:00:00.000Z" }, // uncompleted
  ];

  const dailyHabits = getDailyHabitCompletions(habitLogs, startDate, endDate);
  assert.deepEqual(dailyHabits, [
    { date: "2026-11-05", count: 2 }, // h1 and h2 unique
    { date: "2026-11-06", count: 0 },
    { date: "2026-11-07", count: 0 }, // uncompleted ignored
    { date: "2026-11-08", count: 1 },
  ]);

  assert.equal(getHabitsCompletedInRange(habitLogs, startDate, endDate), 3);
});

test("Phase 5A: Task Overview Metrics and Archived Task Exclusion", () => {
  const today = "2026-11-09";

  const tasks = [
    { id: "1", title: "Done", status: "completed", priority: "medium", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
    { id: "2", title: "Done 2", status: "completed", priority: "high", createdAt: "2026-11-02T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z" },
    { id: "3", title: "Overdue", status: "todo", dueDate: "2026-11-05", priority: "high", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
    { id: "4", title: "Due Today", status: "in_progress", dueDate: "2026-11-09", priority: "medium", createdAt: "2026-11-05T00:00:00.000Z", updatedAt: "2026-11-05T00:00:00.000Z" },
    { id: "5", title: "Upcoming", status: "todo", dueDate: "2026-11-15", priority: "low", createdAt: "2026-11-05T00:00:00.000Z", updatedAt: "2026-11-05T00:00:00.000Z" },
    { id: "6", title: "Someday", status: "todo", priority: "low", createdAt: "2026-11-05T00:00:00.000Z", updatedAt: "2026-11-05T00:00:00.000Z" },
    // Archived tasks - MUST be completely excluded from metrics and completion rate
    { id: "7", title: "Archived Todo", status: "archived", dueDate: "2026-11-01", priority: "medium", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
    { id: "8", title: "Archived Other", status: "archived", priority: "high", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
  ];

  const metrics = getTaskOverviewMetrics(tasks, today);
  assert.equal(metrics.totalTasks, 6, "Total tasks excludes archived");
  assert.equal(metrics.completedTasks, 2);
  assert.equal(metrics.pendingTasks, 4);
  assert.equal(metrics.overdueTasks, 1);
  assert.equal(metrics.dueTodayTasks, 1);
  assert.equal(metrics.upcomingTasks, 1);
  assert.equal(metrics.somedayTasks, 1);
  // Completion rate: 2 / 6 = 33.3%
  assert.equal(metrics.completionRate, 33.3);

  // Zero denominator check
  const zeroMetrics = getTaskOverviewMetrics([], today);
  assert.equal(zeroMetrics.totalTasks, 0);
  assert.equal(zeroMetrics.completionRate, 0);
  assert.equal(Number.isNaN(zeroMetrics.completionRate), false);

  // All archived tasks check
  const allArchived = getTaskOverviewMetrics([
    { id: "a1", title: "Archived", status: "archived", priority: "low", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
  ], today);
  assert.equal(allArchived.totalTasks, 0);
  assert.equal(allArchived.completionRate, 0);
});

test("Phase 5A: Habit Creation Date Boundaries & Daily, Weekday, Weekly, Custom schedules", () => {
  const startDate = "2026-11-02"; // Monday
  const endDate = "2026-11-08";   // Sunday (Full 7-day week)

  const habits = [
    // 1. Daily habit created prior to window
    {
      id: "h-daily",
      title: "Daily Meditation",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    // 2. Daily habit created mid-window on Thursday Nov 5
    {
      id: "h-mid-window",
      title: "New Daily Journal",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
    // 3. Weekday habit created prior to window
    {
      id: "h-weekdays",
      title: "Morning Standup",
      frequency: "weekdays",
      customDays: [],
      isActive: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    // 4. Custom habit (Tue, Thu = [2, 4])
    {
      id: "h-custom",
      title: "Gym Workout",
      frequency: "custom",
      customDays: [2, 4],
      isActive: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    // 5. Weekly habit
    {
      id: "h-weekly",
      title: "Weekly Review",
      frequency: "weekly",
      customDays: [],
      isActive: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    // 6. Habit created in the future (after window)
    {
      id: "h-future",
      title: "Future Goal",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-11-15T00:00:00.000Z",
      updatedAt: "2026-11-15T00:00:00.000Z",
    },
  ];

  const habitLogs = [
    // Daily: completed 5 of 7 days
    { id: "l1", habitId: "h-daily", date: "2026-11-02", completed: true, createdAt: "2026-11-02T08:00:00.000Z" },
    { id: "l2", habitId: "h-daily", date: "2026-11-03", completed: true, createdAt: "2026-11-03T08:00:00.000Z" },
    { id: "l3", habitId: "h-daily", date: "2026-11-04", completed: true, createdAt: "2026-11-04T08:00:00.000Z" },
    { id: "l4", habitId: "h-daily", date: "2026-11-05", completed: true, createdAt: "2026-11-05T08:00:00.000Z" },
    { id: "l5", habitId: "h-daily", date: "2026-11-06", completed: true, createdAt: "2026-11-06T08:00:00.000Z" },

    // Mid-window habit (created Nov 5): completed Nov 5 and Nov 6 (2 out of 4 scheduled days: Nov 5, 6, 7, 8)
    // Also simulate a rogue log from Nov 4 (before creation): must not be counted
    { id: "l6", habitId: "h-mid-window", date: "2026-11-04", completed: true, createdAt: "2026-11-04T08:00:00.000Z" },
    { id: "l7", habitId: "h-mid-window", date: "2026-11-05", completed: true, createdAt: "2026-11-05T08:00:00.000Z" },
    { id: "l8", habitId: "h-mid-window", date: "2026-11-06", completed: true, createdAt: "2026-11-06T08:00:00.000Z" },

    // Weekdays habit: 5 scheduled days (Nov 2, 3, 4, 5, 6), completed 4 of them
    { id: "l9", habitId: "h-weekdays", date: "2026-11-02", completed: true, createdAt: "2026-11-02T08:00:00.000Z" },
    { id: "l10", habitId: "h-weekdays", date: "2026-11-03", completed: true, createdAt: "2026-11-03T08:00:00.000Z" },
    { id: "l11", habitId: "h-weekdays", date: "2026-11-04", completed: true, createdAt: "2026-11-04T08:00:00.000Z" },
    { id: "l12", habitId: "h-weekdays", date: "2026-11-05", completed: true, createdAt: "2026-11-05T08:00:00.000Z" },

    // Custom habit (Tue Nov 3 and Thu Nov 5): completed both (2 of 2)
    { id: "l13", habitId: "h-custom", date: "2026-11-03", completed: true, createdAt: "2026-11-03T08:00:00.000Z" },
    { id: "l14", habitId: "h-custom", date: "2026-11-05", completed: true, createdAt: "2026-11-05T08:00:00.000Z" },

    // Weekly habit: 1 scheduled week, completed on Nov 4 (1 of 1)
    { id: "l15", habitId: "h-weekly", date: "2026-11-04", completed: true, createdAt: "2026-11-04T08:00:00.000Z" },
  ];

  const result = calculateHabitConsistency({
    habits,
    habitLogs,
    startDate,
    endDate,
  });

  // Future habit should be excluded because createdAt > endDate
  assert.equal(result.habits.length, 5);

  const dailyMetric = result.habits.find((h) => h.habitId === "h-daily");
  assert.equal(dailyMetric.scheduledCount, 7);
  assert.equal(dailyMetric.completedCount, 5);
  assert.equal(dailyMetric.consistencyRate, 71.4);

  const midWindowMetric = result.habits.find((h) => h.habitId === "h-mid-window");
  // Nov 5 to Nov 8 = 4 days
  assert.equal(midWindowMetric.scheduledCount, 4);
  assert.equal(midWindowMetric.completedCount, 2);
  assert.equal(midWindowMetric.consistencyRate, 50.0);

  const weekdayMetric = result.habits.find((h) => h.habitId === "h-weekdays");
  assert.equal(weekdayMetric.scheduledCount, 5);
  assert.equal(weekdayMetric.completedCount, 4);
  assert.equal(weekdayMetric.consistencyRate, 80.0);

  const customMetric = result.habits.find((h) => h.habitId === "h-custom");
  assert.equal(customMetric.scheduledCount, 2);
  assert.equal(customMetric.completedCount, 2);
  assert.equal(customMetric.consistencyRate, 100.0);

  const weeklyMetric = result.habits.find((h) => h.habitId === "h-weekly");
  assert.equal(weeklyMetric.scheduledCount, 1);
  assert.equal(weeklyMetric.completedCount, 1);
  assert.equal(weeklyMetric.consistencyRate, 100.0);

  // Overall: (5 + 2 + 4 + 2 + 1) / (7 + 4 + 5 + 2 + 1) = 14 / 19 = 73.7%
  assert.equal(result.totalScheduled, 19);
  assert.equal(result.totalCompleted, 14);
  assert.equal(result.consistencyRate, 73.7);
});

test("Phase 5A: Historically relevant Inactive Habits calculation", () => {
  const habits = [
    {
      id: "h-active",
      title: "Active Habit",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
    {
      id: "h-archived-old",
      title: "Former Habit",
      frequency: "daily",
      customDays: [],
      isActive: false, // Inactive / archived
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
  ];

  const habitLogs = [
    { id: "l1", habitId: "h-archived-old", date: "2026-11-01", completed: true, createdAt: "2026-11-01T00:00:00.000Z" },
    { id: "l2", habitId: "h-archived-old", date: "2026-11-02", completed: true, createdAt: "2026-11-02T00:00:00.000Z" },
    { id: "l3", habitId: "h-active", date: "2026-11-01", completed: true, createdAt: "2026-11-01T00:00:00.000Z" },
  ];

  // Include inactive by default
  const withInactive = calculateHabitConsistency({
    habits,
    habitLogs,
    startDate: "2026-11-01",
    endDate: "2026-11-02",
    includeInactive: true,
  });
  assert.equal(withInactive.habits.length, 2);
  const former = withInactive.habits.find((h) => h.habitId === "h-archived-old");
  assert.equal(former.isActive, false);
  assert.equal(former.completedCount, 2);
  assert.equal(former.consistencyRate, 100);

  // If explicitly excluded
  const withoutInactive = calculateHabitConsistency({
    habits,
    habitLogs,
    startDate: "2026-11-01",
    endDate: "2026-11-02",
    includeInactive: false,
  });
  assert.equal(withoutInactive.habits.length, 1);
  assert.equal(withoutInactive.habits[0].habitId, "h-active");
});

test("Phase 5A: Habit Streaks Calculation using calculateStreak()", () => {
  const habits = [
    {
      id: "h1",
      title: "Reading",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
    {
      id: "h2",
      title: "Coding",
      frequency: "daily",
      customDays: [],
      isActive: true,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
  ];

  const habitLogs = [
    { id: "l1", habitId: "h1", date: "2026-11-01", completed: true, createdAt: "2026-11-01T00:00:00.000Z" },
    { id: "l2", habitId: "h1", date: "2026-11-02", completed: true, createdAt: "2026-11-02T00:00:00.000Z" },
    { id: "l3", habitId: "h1", date: "2026-11-03", completed: true, createdAt: "2026-11-03T00:00:00.000Z" },
    { id: "l4", habitId: "h2", date: "2026-11-01", completed: true, createdAt: "2026-11-01T00:00:00.000Z" },
  ];

  const streakMetrics = calculateHabitStreaks(habits, habitLogs);
  assert.equal(streakMetrics.habits.length, 2);
  const h1Metric = streakMetrics.habits.find((h) => h.habitId === "h1");
  assert.equal(h1Metric.bestStreak, 3);
  assert.ok(streakMetrics.bestAllTimeStreak >= 3);
  assert.equal(streakMetrics.bestAllTimeHabit?.habitId, "h1");
});

test("Phase 5A: Period-over-period percentage changes and edge cases", () => {
  // 1. All Time has null previous
  const allTimeComp = calculatePeriodChange(42, null);
  assert.equal(allTimeComp.current, 42);
  assert.equal(allTimeComp.previous, null);
  assert.equal(allTimeComp.absoluteChange, null);
  assert.equal(allTimeComp.percentageChange, null);
  assert.equal(allTimeComp.trend, "none");

  // 2. Both zero
  const zeroComp = calculatePeriodChange(0, 0);
  assert.equal(zeroComp.percentageChange, 0);
  assert.equal(zeroComp.trend, "neutral");

  // 3. Growth from zero
  const fromZero = calculatePeriodChange(5, 0);
  assert.equal(fromZero.absoluteChange, 5);
  assert.equal(fromZero.percentageChange, 100);
  assert.equal(fromZero.trend, "up");

  // 4. Drop to zero
  const toZero = calculatePeriodChange(0, 10);
  assert.equal(toZero.absoluteChange, -10);
  assert.equal(toZero.percentageChange, -100);
  assert.equal(toZero.trend, "down");

  // 5. Normal growth
  const normalGrowth = calculatePeriodChange(15, 10);
  assert.equal(normalGrowth.absoluteChange, 5);
  assert.equal(normalGrowth.percentageChange, 50);
  assert.equal(normalGrowth.trend, "up");

  // 6. Normal decline
  const normalDecline = calculatePeriodChange(8, 10);
  assert.equal(normalDecline.absoluteChange, -2);
  assert.equal(normalDecline.percentageChange, -20);
  assert.equal(normalDecline.trend, "down");
});

test("Phase 5A: Goal Progress and Category/Priority Distributions", () => {
  const tasks = [
    // Goal via category
    {
      id: "g1",
      title: "Launch Orbit v1",
      category: "goal",
      priority: "high",
      status: "completed",
      completedAt: "2026-11-05T00:00:00.000Z",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
    // Goal via tag
    {
      id: "g2",
      title: "Read 10 Books",
      category: "learning",
      tags: ["goal", "books"],
      priority: "medium",
      status: "in_progress",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
    // Archived goal - MUST be excluded
    {
      id: "g3",
      title: "Abandoned Goal",
      category: "goal",
      priority: "low",
      status: "archived",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
    // Regular task
    {
      id: "t1",
      title: "Buy groceries",
      category: "personal",
      priority: "low",
      status: "todo",
      createdAt: "2026-11-02T00:00:00.000Z",
      updatedAt: "2026-11-02T00:00:00.000Z",
    },
  ];

  // 1. Goal test
  assert.equal(isGoalTask(tasks[0]), true);
  assert.equal(isGoalTask(tasks[1]), true);
  assert.equal(isGoalTask(tasks[3]), false);

  const goalMetrics = getGoalProgress(tasks);
  assert.equal(goalMetrics.totalGoals, 2, "Archived goal must be excluded");
  assert.equal(goalMetrics.completedGoals, 1);
  assert.equal(goalMetrics.pendingGoals, 1);
  assert.equal(goalMetrics.progressPercentage, 50.0);

  // 2. Distributions test (excludes archived g3)
  const dist = getTaskDistributions(tasks);
  assert.equal(dist.totalEligibleTasks, 3);

  // Check category counts
  const goalCat = dist.byCategory.find((c) => c.category === "Goal");
  assert.equal(goalCat.totalCount, 1);
  assert.equal(goalCat.completedCount, 1);
  assert.equal(goalCat.percentageOfTotal, 33.3);

  // Check priority counts
  const highPrio = dist.byPriority.find((p) => p.priority === "high");
  assert.equal(highPrio.totalCount, 1);
  assert.equal(highPrio.completedCount, 1);
  assert.equal(highPrio.percentageOfTotal, 33.3);

  const lowPrio = dist.byPriority.find((p) => p.priority === "low");
  assert.equal(lowPrio.totalCount, 1);
  assert.equal(lowPrio.pendingCount, 1);
});

test("Phase 5A: Recent Accomplishments sorting and date filtering", () => {
  const tasks = [
    {
      id: "t1",
      title: "Older task",
      status: "completed",
      completedAt: "2026-11-01T10:00:00.000Z",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "t2",
      title: "Newer goal",
      category: "goal",
      status: "completed",
      completedAt: "2026-11-05T15:00:00.000Z",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-05T15:00:00.000Z",
    },
    {
      id: "t3",
      title: "Not completed",
      status: "todo",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
  ];

  // All completed, ordered descending
  const acc = getRecentAccomplishments(tasks);
  assert.equal(acc.length, 2);
  assert.equal(acc[0].id, "t2", "Newest accomplishment must be first");
  assert.equal(acc[0].type, "goal");
  assert.equal(acc[1].id, "t1");
  assert.equal(acc[1].type, "task");

  // Date range filtered
  const filtered = getRecentAccomplishments(tasks, 10, {
    startDate: "2026-11-03",
    endDate: "2026-11-06",
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "t2");
});

test("Phase 5A: Analytics Snapshot separate metrics and zero activity", () => {
  const emptySnapshot = calculateAnalyticsSnapshot({
    rangeType: "7d",
    tasks: [],
    habits: [],
    habitLogs: [],
    today: "2026-11-09",
  });

  assert.equal(emptySnapshot.tasksCompletedInRange, 0);
  assert.equal(emptySnapshot.habitsCompletedInRange, 0);
  assert.equal(emptySnapshot.taskOverview.totalTasks, 0);
  assert.equal(emptySnapshot.taskOverview.completionRate, 0);
  assert.equal(emptySnapshot.habitConsistency.consistencyRate, 0);
  assert.equal(emptySnapshot.goalProgress.progressPercentage, 0);
  assert.equal(emptySnapshot.dailyTaskCompletions.length, 7);
  assert.equal(emptySnapshot.dailyHabitCompletions.length, 7);
  assert.equal(emptySnapshot.recentAccomplishments.length, 0);

  // Check strict separation: no combined score field
  assert.equal("productivityScore" in emptySnapshot, false);
  assert.equal("combinedScore" in emptySnapshot, false);
});
