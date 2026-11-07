import test from "node:test";
import assert from "node:assert/strict";

import {
  isLeapYear,
  getDaysInMonth,
  getOccurrencesForEvent,
  getAllOccurrencesForRange,
  getNextOccurrence,
  getMonthCalendarGrid,
  getWeekDays,
  calculateReminderTriggerTime,
} from "../src/lib/utils/recurrence.ts";

import { EventSchema } from "../src/lib/schemas/event.ts";
import { ReminderSchema } from "../src/lib/schemas/reminder.ts";
import { ItemSchema } from "../src/lib/schemas/item.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { HabitSchema } from "../src/lib/schemas/habit.ts";
import { HabitLogSchema } from "../src/lib/schemas/habit-log.ts";
import { LibraryEntrySchema } from "../src/lib/schemas/library-entry.ts";
import { CategorySchema } from "../src/lib/schemas/category.ts";
import { SettingsSchema } from "../src/lib/schemas/settings.ts";
import { z } from "zod";

const BackupPayloadSchema = z.object({
  version: z.number().int().default(1),
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  events: z.array(EventSchema).default([]),
  reminders: z.array(ReminderSchema).default([]),
  libraryEntries: z.array(LibraryEntrySchema).default([]),
  categories: z.array(CategorySchema).default([]),
  settings: z.array(SettingsSchema).default([]),
});

test("Recurrence Engine — Leap Years & Days in Month", () => {
  assert.equal(isLeapYear(2020), true);
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);

  assert.equal(getDaysInMonth(2024, 2), 29); // Feb in leap year
  assert.equal(getDaysInMonth(2025, 2), 28); // Feb in normal year
  assert.equal(getDaysInMonth(2026, 11), 30); // November
  assert.equal(getDaysInMonth(2026, 10), 31); // October
});

test("Recurrence Engine — Non-Recurring Events", () => {
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Team Sync",
    type: "meeting",
    date: "2026-11-10",
    isAllDay: false,
    startTime: "10:00",
    endTime: "11:00",
    recurrence: { rule: "none" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  // When date is inside window
  const inWindow = getOccurrencesForEvent(event, "2026-11-01", "2026-11-30");
  assert.equal(inWindow.length, 1);
  assert.equal(inWindow[0].occurrenceDate, "2026-11-10");
  assert.equal(inWindow[0].isOccurrence, false);

  // When date is outside window
  const outWindow = getOccurrencesForEvent(event, "2026-12-01", "2026-12-31");
  assert.equal(outWindow.length, 0);
});

test("Recurrence Engine — Daily Recurrence", () => {
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Daily Standup",
    type: "meeting",
    date: "2026-11-01",
    isAllDay: false,
    startTime: "09:30",
    recurrence: { rule: "daily" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  const occurrences = getOccurrencesForEvent(event, "2026-11-01", "2026-11-05");
  assert.equal(occurrences.length, 5);
  assert.equal(occurrences[0].occurrenceDate, "2026-11-01");
  assert.equal(occurrences[0].isOccurrence, false); // initial date
  assert.equal(occurrences[1].occurrenceDate, "2026-11-02");
  assert.equal(occurrences[1].isOccurrence, true);
  assert.equal(occurrences[4].occurrenceDate, "2026-11-05");
});

test("Recurrence Engine — Weekly Recurrence", () => {
  // 2026-11-06 is a Friday
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Weekly Review",
    type: "general",
    date: "2026-11-06",
    isAllDay: true,
    recurrence: { rule: "weekly" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  const occurrences = getOccurrencesForEvent(event, "2026-11-01", "2026-11-30");
  // Fridays in Nov 2026: Nov 6, Nov 13, Nov 20, Nov 27
  assert.equal(occurrences.length, 4);
  assert.equal(occurrences[0].occurrenceDate, "2026-11-06");
  assert.equal(occurrences[1].occurrenceDate, "2026-11-13");
  assert.equal(occurrences[2].occurrenceDate, "2026-11-20");
  assert.equal(occurrences[3].occurrenceDate, "2026-11-27");
});

test("Recurrence Engine — Monthly Recurrence with 31st Day Clamping", () => {
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Monthly Rent & Utility Audit",
    type: "personal",
    date: "2026-08-31", // 31st day
    isAllDay: true,
    recurrence: { rule: "monthly" },
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };

  const occurrences = getOccurrencesForEvent(event, "2026-09-01", "2026-11-30");
  // Sept has 30 days -> clamped to 2026-09-30
  // Oct has 31 days  -> 2026-10-31
  // Nov has 30 days  -> clamped to 2026-11-30
  assert.equal(occurrences.length, 3);
  assert.equal(occurrences[0].occurrenceDate, "2026-09-30");
  assert.equal(occurrences[1].occurrenceDate, "2026-10-31");
  assert.equal(occurrences[2].occurrenceDate, "2026-11-30");
});

test("Recurrence Engine — Yearly Recurrence & Leap Year Birthday Clamping", () => {
  // Birthday born on Leap Day Feb 29, 2024
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Alex Leap Day Birthday",
    type: "birthday",
    date: "2024-02-29",
    isAllDay: true,
    recurrence: { rule: "yearly" },
    createdAt: "2024-02-29T00:00:00.000Z",
    updatedAt: "2024-02-29T00:00:00.000Z",
  };

  const occurrences = getOccurrencesForEvent(event, "2025-01-01", "2028-12-31");
  // 2025: non-leap -> clamped to Feb 28
  // 2026: non-leap -> clamped to Feb 28
  // 2027: non-leap -> clamped to Feb 28
  // 2028: leap year -> Feb 29!
  assert.equal(occurrences.length, 4);
  assert.equal(occurrences[0].occurrenceDate, "2025-02-28");
  assert.equal(occurrences[1].occurrenceDate, "2026-02-28");
  assert.equal(occurrences[2].occurrenceDate, "2027-02-28");
  assert.equal(occurrences[3].occurrenceDate, "2028-02-29");
});

test("Recurrence Engine — End Date Termination", () => {
  const event = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Semester Class",
    type: "assignment",
    date: "2026-09-01",
    isAllDay: false,
    startTime: "14:00",
    recurrence: {
      rule: "weekly",
      endDate: "2026-10-15", // stops in mid-October
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  const occurrences = getOccurrencesForEvent(event, "2026-09-01", "2026-12-31");
  // Must not have occurrences past 2026-10-15
  assert.ok(occurrences.length > 0);
  for (const occ of occurrences) {
    assert.ok(occ.occurrenceDate <= "2026-10-15");
  }
});

test("Recurrence Engine — getMonthCalendarGrid Structure", () => {
  // November 2026 starts on Sunday (Nov 1, 2026)
  const gridMon = getMonthCalendarGrid(2026, 11, "2026-11-06", "monday");
  assert.ok(gridMon.length === 35 || gridMon.length === 42);

  // Today marker
  const todayCell = gridMon.find((c) => c.dateStr === "2026-11-06");
  assert.ok(todayCell);
  assert.equal(todayCell.isToday, true);
  assert.equal(todayCell.isCurrentMonth, true);

  // Check Sunday week start
  const gridSun = getMonthCalendarGrid(2026, 11, "2026-11-06", "sunday");
  assert.ok(gridSun.length === 35 || gridSun.length === 42);
  assert.equal(gridSun[0].dateStr, "2026-11-01"); // Nov 1 is Sunday
});

test("Recurrence Engine — getWeekDays", () => {
  const days = getWeekDays("2026-11-06", "2026-11-06", "monday");
  assert.equal(days.length, 7);
  // Nov 6, 2026 is Friday -> Monday is Nov 2, Sunday is Nov 8
  assert.equal(days[0].dateStr, "2026-11-02");
  assert.equal(days[4].dateStr, "2026-11-06");
  assert.equal(days[4].isToday, true);
  assert.equal(days[6].dateStr, "2026-11-08");
});

test("Recurrence Engine — getAllOccurrencesForRange & getNextOccurrence", () => {
  const event1 = {
    id: "e1",
    title: "Morning Standup",
    type: "meeting",
    date: "2026-11-02",
    isAllDay: false,
    startTime: "09:00",
    recurrence: { rule: "daily" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
  const event2 = {
    id: "e2",
    title: "All Day Conference",
    type: "general",
    date: "2026-11-02",
    isAllDay: true,
    recurrence: { rule: "none" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  const rangeOccurrences = getAllOccurrencesForRange([event1, event2], "2026-11-02", "2026-11-03");
  assert.equal(rangeOccurrences.length, 3);
  // All day event should be sorted first on 2026-11-02
  assert.equal(rangeOccurrences[0].event.isAllDay, true);
  assert.equal(rangeOccurrences[0].occurrenceDate, "2026-11-02");

  // Next occurrence lookup
  const nextOcc = getNextOccurrence(event1, "2026-11-05");
  assert.equal(nextOcc, "2026-11-05");
});

test("Reminder Engine — Trigger Time Calculations", () => {
  const timedEvent = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Client Presentation",
    type: "meeting",
    date: "2026-11-10",
    isAllDay: false,
    startTime: "14:30",
    recurrence: { rule: "none" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  // 15 minutes before 14:30 -> 14:15
  const reminder15m = {
    id: "r1",
    eventId: timedEvent.id,
    timing: { type: "before", offsetMinutes: 15 },
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  const triggerTime15m = calculateReminderTriggerTime(timedEvent, "2026-11-10", reminder15m);
  const triggerDate15m = new Date(triggerTime15m);
  assert.equal(triggerDate15m.getHours(), 14);
  assert.equal(triggerDate15m.getMinutes(), 15);

  // All-day event: default 09:00, 1 day (1440m) before -> Nov 9 at 09:00
  const allDayEvent = {
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Mom's Birthday",
    type: "birthday",
    date: "2026-11-10",
    isAllDay: true,
    recurrence: { rule: "yearly" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  const reminder1DayBefore = {
    id: "r2",
    eventId: allDayEvent.id,
    timing: { type: "before", offsetMinutes: 1440 },
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  const triggerTime1Day = calculateReminderTriggerTime(allDayEvent, "2026-11-10", reminder1DayBefore, "09:00");
  const triggerDate1Day = new Date(triggerTime1Day);
  assert.equal(triggerDate1Day.getDate(), 9);
  assert.equal(triggerDate1Day.getHours(), 9);
  assert.equal(triggerDate1Day.getMinutes(), 0);
});

test("Zod Schemas — Event and Reminder Validation", () => {
  const validEvent = EventSchema.parse({
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    title: "Exam Final Project",
    type: "assignment",
    date: "2026-11-20",
    isAllDay: false,
    startTime: "10:00",
    endTime: "12:00",
    recurrence: { rule: "none" },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  });
  assert.equal(validEvent.type, "assignment");

  const validReminder = ReminderSchema.parse({
    id: "e44d32e9-4e76-476b-944a-d68a2bfdfb30",
    eventId: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
    timing: { type: "before", offsetMinutes: 30 },
    label: "30 minutes before",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
  });
  assert.equal(validReminder.isActive, true);
  assert.equal(validReminder.timing.offsetMinutes, 30);
});

test("Backup & Restore — BackupPayloadSchema Structure (All 9 Tables)", () => {
  const payload = {
    version: 1,
    exportedAt: "2026-11-06T12:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [
      {
        id: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
        title: "Anniversary Dinner",
        notes: "",
        type: "anniversary",
        date: "2026-11-25",
        isAllDay: false,
        startTime: "19:00",
        endTime: "21:00",
        recurrence: { rule: "yearly" },
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    reminders: [
      {
        id: "e44d32e9-4e76-476b-944a-d68a2bfdfb30",
        eventId: "e44d32e9-4e76-476b-944a-d68a2bfdfb29",
        timing: { type: "before", offsetMinutes: 60 },
        label: "1 hour before",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    libraryEntries: [],
    categories: [],
    settings: [],
  };

  const parsed = BackupPayloadSchema.parse(payload);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.reminders.length, 1);
  assert.equal(parsed.reminders[0].eventId, "e44d32e9-4e76-476b-944a-d68a2bfdfb29");
});
