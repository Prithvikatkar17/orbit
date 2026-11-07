import test from "node:test";
import assert from "node:assert/strict";

// We test the exact date utilities and logic used by ORBIT
import {
  getLocalDateString,
  getOffsetDateString,
  parseLocalDate,
  formatFriendlyDate,
  normalizeUrl,
  isScheduledDay,
  getPreviousScheduledDate,
  getWeekMonday,
  calculateStreak,
} from "../src/lib/utils/dates.ts";

import { ItemSchema } from "../src/lib/schemas/item.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { HabitSchema } from "../src/lib/schemas/habit.ts";
import { HabitLogSchema } from "../src/lib/schemas/habit-log.ts";

test("Date Utilities — Local Calendar Integrity", () => {
  const d = new Date(2026, 10, 6); // Nov 6, 2026
  assert.equal(getLocalDateString(d), "2026-11-06");

  const parsed = parseLocalDate("2026-11-06");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 10);
  assert.equal(parsed.getDate(), 6);

  const nextDay = getOffsetDateString(1, parsed);
  assert.equal(nextDay, "2026-11-07");

  const prevDay = getOffsetDateString(-1, parsed);
  assert.equal(prevDay, "2026-11-05");

  // Friendly date formatting
  assert.equal(formatFriendlyDate(getLocalDateString()), "Today");
  assert.equal(formatFriendlyDate(getOffsetDateString(1)), "Tomorrow");
  assert.equal(formatFriendlyDate(getOffsetDateString(-1)), "Yesterday");
  assert.equal(formatFriendlyDate(undefined), "Someday");

  // Month and Leap Year Boundary
  const leapDay = parseLocalDate("2024-02-29");
  assert.equal(getOffsetDateString(1, leapDay), "2024-03-01");
  assert.equal(getOffsetDateString(-1, leapDay), "2024-02-28");

  // Year Boundary
  const newYearEve = parseLocalDate("2026-12-31");
  assert.equal(getOffsetDateString(1, newYearEve), "2027-01-01");
});

test("URL Normalization Utility", () => {
  assert.equal(normalizeUrl(""), undefined);
  assert.equal(normalizeUrl("   "), undefined);
  assert.equal(normalizeUrl("https://example.com"), "https://example.com");
  assert.equal(normalizeUrl("http://example.com"), "http://example.com");
  assert.equal(normalizeUrl("github.com/orbit"), "https://github.com/orbit");
  assert.equal(normalizeUrl("www.google.com"), "https://www.google.com");
});

test("Habit Frequency — Scheduled Days Logic", () => {
  // 2026-11-06 is Friday (day 5)
  // 2026-11-07 is Saturday (day 6)
  // 2026-11-08 is Sunday (day 0)
  // 2026-11-09 is Monday (day 1)

  // Daily
  assert.equal(isScheduledDay("2026-11-06", "daily"), true);
  assert.equal(isScheduledDay("2026-11-07", "daily"), true);

  // Weekdays (Mon-Fri)
  assert.equal(isScheduledDay("2026-11-06", "weekdays"), true); // Friday
  assert.equal(isScheduledDay("2026-11-07", "weekdays"), false); // Saturday
  assert.equal(isScheduledDay("2026-11-08", "weekdays"), false); // Sunday
  assert.equal(isScheduledDay("2026-11-09", "weekdays"), true); // Monday

  // Custom Days: Mon, Wed, Fri [1, 3, 5]
  const mwf = [1, 3, 5];
  assert.equal(isScheduledDay("2026-11-06", "custom", mwf), true); // Friday
  assert.equal(isScheduledDay("2026-11-07", "custom", mwf), false); // Saturday
  assert.equal(isScheduledDay("2026-11-09", "custom", mwf), true); // Monday
  assert.equal(isScheduledDay("2026-11-10", "custom", mwf), false); // Tuesday
});

test("Habit Frequency — Previous Scheduled Date Navigation", () => {
  // On Friday 2026-11-06:
  // Weekdays previous is Thursday
  assert.equal(getPreviousScheduledDate("2026-11-06", "weekdays"), "2026-11-05");
  // On Monday 2026-11-09, weekdays previous is Friday 2026-11-06!
  assert.equal(getPreviousScheduledDate("2026-11-09", "weekdays"), "2026-11-06");

  // Custom Mon, Wed, Fri [1, 3, 5]:
  // Friday previous is Wednesday
  assert.equal(getPreviousScheduledDate("2026-11-06", "custom", [1, 3, 5]), "2026-11-04");
  // Wednesday previous is Monday
  assert.equal(getPreviousScheduledDate("2026-11-04", "custom", [1, 3, 5]), "2026-11-02");
  // Monday previous is Friday of previous week
  assert.equal(getPreviousScheduledDate("2026-11-02", "custom", [1, 3, 5]), "2026-10-30");
});

test("Streak Calculation — Audit Scenarios", () => {
  const today = getLocalDateString();
  const yesterday = getOffsetDateString(-1);
  const twoDaysAgo = getOffsetDateString(-2);
  const threeDaysAgo = getOffsetDateString(-3);

  // Scenario 1: Completed today and yesterday (daily)
  const res1 = calculateStreak([today, yesterday], "daily");
  assert.equal(res1.currentStreak, 2);
  assert.equal(res1.bestStreak, 2);

  // Scenario 2: Completed yesterday but not today (daily — active, ongoing today)
  const res2 = calculateStreak([yesterday, twoDaysAgo], "daily");
  assert.equal(res2.currentStreak, 2);
  assert.equal(res2.bestStreak, 2);

  // Scenario 3: Missed yesterday and today (daily — streak broken)
  const res3 = calculateStreak([twoDaysAgo, threeDaysAgo], "daily");
  assert.equal(res3.currentStreak, 0);
  assert.equal(res3.bestStreak, 2);

  // Scenario 4: Completed only today
  const res4 = calculateStreak([today], "daily");
  assert.equal(res4.currentStreak, 1);
  assert.equal(res4.bestStreak, 1);

  // Scenario 5: Custom Frequency (Mon, Wed, Fri) with valid gaps on unscheduled days
  // Suppose today is Friday 2026-11-06 (or relative offsets):
  // Fri 2026-11-06, Wed 2026-11-04, Mon 2026-11-02
  const mwfLogs = ["2026-11-06", "2026-11-04", "2026-11-02"];
  const res5 = calculateStreak(mwfLogs, "custom", [1, 3, 5]);
  // Tuesday and Thursday were not scheduled, so streak is maintained across them
  assert.equal(res5.bestStreak >= 3, true);

  // Scenario 6: Historical Best Streak Preservation
  // A long streak of 5 days in past, and 1 day current
  const pastStreak = [
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
    "2026-01-05",
    today,
  ];
  const res6 = calculateStreak(pastStreak, "daily");
  assert.equal(res6.currentStreak, 1);
  assert.equal(res6.bestStreak, 5);

  // Scenario 7: Weekly habit with valid gaps between scheduled days
  const thisWeek = getWeekMonday(today);
  const lastWeek = getOffsetDateString(-7, parseLocalDate(thisWeek));
  const twoWeeksAgo = getOffsetDateString(-14, parseLocalDate(thisWeek));
  const res7 = calculateStreak([thisWeek, lastWeek, twoWeeksAgo], "weekly");
  assert.equal(res7.currentStreak, 3);
  assert.equal(res7.bestStreak, 3);
});

test("Heatmap — Exactly 180 Calendar Days Window", () => {
  const today = getLocalDateString();
  const todayDate = parseLocalDate(today);
  const minDateStr = getOffsetDateString(-179, todayDate);

  // Count days from minDateStr to todayDate inclusive
  let count = 0;
  let cur = parseLocalDate(minDateStr);
  while (getLocalDateString(cur) <= today) {
    count++;
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }

  assert.equal(count, 180, "Heatmap window must cover exactly 180 calendar days");
});

test("Zod Schemas — Validation and Contract Integrity", () => {
  const nowIso = new Date().toISOString();

  // Item validation
  const validItem = ItemSchema.parse({
    id: crypto.randomUUID(),
    title: "Test Inbox Item",
    notes: "Notes here",
    link: "https://orbit.app",
    category: "inbox",
    priority: "medium",
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  assert.equal(validItem.title, "Test Inbox Item");

  // Empty title rejection
  assert.throws(() => {
    ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  // Task validation
  const validTask = TaskSchema.parse({
    id: crypto.randomUUID(),
    title: "Launch Project",
    category: "goal",
    priority: "high",
    status: "todo",
    dueDate: "2026-12-31",
    sortOrder: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  assert.equal(validTask.category, "goal");

  // Habit validation
  const validHabit = HabitSchema.parse({
    id: crypto.randomUUID(),
    title: "Morning Routine",
    frequency: "weekdays",
    customDays: [1, 2, 3, 4, 5],
    color: "#6366f1",
    isActive: true,
    sortOrder: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  assert.equal(validHabit.frequency, "weekdays");

  // HabitLog validation
  const validLog = HabitLogSchema.parse({
    id: crypto.randomUUID(),
    habitId: validHabit.id,
    date: "2026-11-06",
    completed: true,
    createdAt: nowIso,
  });
  assert.equal(validLog.date, "2026-11-06");
});
