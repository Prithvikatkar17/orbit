import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateSnoozeTarget,
  snoozeReminder,
} from "../src/lib/services/reminder-service.ts";
import {
  filterCommandPalette,
  COMMAND_PALETTE_ITEMS,
} from "../src/lib/services/command-palette-service.ts";
import {
  CHORD_NAV_MAP,
  shouldIgnoreNavigationChord,
} from "../src/lib/services/navigation-chords-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 16 (Sprint 2): High-Leverage UX Quick Wins Verification", async (t) => {
  await t.test("1. Habit Heatmap Backfilling: onToggleDate, future date protection & accessible button semantics", () => {
    const heatmapPath = path.join(ROOT_DIR, "src", "components", "habits", "heatmap.tsx");
    assert.ok(fs.existsSync(heatmapPath), "heatmap.tsx must exist");
    const heatmapContent = fs.readFileSync(heatmapPath, "utf-8");

    // HeatmapProps supports onToggleDate
    assert.match(heatmapContent, /onToggleDate\?:\s*\(dateStr:\s*string\)\s*=>\s*void/);

    // Uses button semantics with aria-label and aria-pressed
    assert.match(heatmapContent, /type="button"/);
    assert.match(heatmapContent, /aria-label=\{`Toggle habit for \$\{friendlyLabel\}/);
    assert.match(heatmapContent, /aria-pressed=\{day\.isCompleted\}/);

    // Future dates are disabled
    assert.match(heatmapContent, /const isFuture = day\.dateStr > today;/);
    assert.match(heatmapContent, /disabled=\{isFuture/);
    assert.match(heatmapContent, /cursor-not-allowed opacity-40/);

    // HabitCard wires toggleDate to HabitHeatmap
    const habitCardPath = path.join(ROOT_DIR, "src", "components", "habits", "habit-card.tsx");
    const habitCardContent = fs.readFileSync(habitCardPath, "utf-8");
    assert.match(habitCardContent, /onToggleDate=\{toggleDate\}/);
    assert.match(habitCardContent, /async function toggleDate\(dateStr:\s*string\)/);
    assert.match(habitCardContent, /if \(dateStr > today\) return;/);
    assert.match(habitCardContent, /completed:\s*false/);
    assert.match(habitCardContent, /completed:\s*true/);
  });

  await t.test("2. Notification Snooze Presets: 15m, 1h, and Tomorrow 9am local calculations", () => {
    // Fixed reference time: 2026-11-24 14:30:00 local
    const baseTime = new Date(2026, 10, 24, 14, 30, 0, 0).getTime();

    // 15 minutes preset
    const target15m = calculateSnoozeTarget("15m", baseTime);
    assert.equal(target15m.getTime(), baseTime + 15 * 60 * 1000);

    // 1 hour preset
    const target1h = calculateSnoozeTarget("1h", baseTime);
    assert.equal(target1h.getTime(), baseTime + 60 * 60 * 1000);

    // Tomorrow 9am local
    const targetTomorrow9am = calculateSnoozeTarget("tomorrow_9am", baseTime);
    assert.equal(targetTomorrow9am.getFullYear(), 2026);
    assert.equal(targetTomorrow9am.getMonth(), 10);
    assert.equal(targetTomorrow9am.getDate(), 25);
    assert.equal(targetTomorrow9am.getHours(), 9);
    assert.equal(targetTomorrow9am.getMinutes(), 0);
    assert.equal(targetTomorrow9am.getSeconds(), 0);
  });

  await t.test("2b. Notification Snooze: snoozeReminder persists snoozedUntil and dismisses notification", async () => {
    // In-memory Dexie mock simulation
    const mockReminders = new Map();
    const mockNotifications = new Map();

    const mockDb = {
      reminders: {
        update: async (id, updates) => {
          const current = mockReminders.get(id) || {};
          mockReminders.set(id, { ...current, ...updates });
        },
        get: async (id) => mockReminders.get(id),
      },
      notifications: {
        delete: async (id) => {
          mockNotifications.delete(id);
        },
      },
    };

    mockNotifications.set("notif-1", { id: "notif-1", reminderId: "rem-1" });
    mockReminders.set("rem-1", { id: "rem-1", isActive: true });

    const baseMs = 1700000000000;
    const target = await snoozeReminder({
      reminderId: "rem-1",
      notificationId: "notif-1",
      preset: "15m",
      targetDate: new Date(baseMs + 15 * 60 * 1000),
      database: mockDb,
    });

    assert.equal(mockNotifications.has("notif-1"), false, "Notification must be dismissed immediately");
    const updatedReminder = mockReminders.get("rem-1");
    assert.equal(updatedReminder.snoozedUntil, target.toISOString(), "snoozedUntil must be persisted");
  });

  await t.test("3. Calendar Auto-Scroll & Live Current-Time Line", () => {
    // WeekView checks
    const weekViewPath = path.join(ROOT_DIR, "src", "components", "calendar", "week-view.tsx");
    assert.ok(fs.existsSync(weekViewPath), "week-view.tsx must exist");
    const weekViewContent = fs.readFileSync(weekViewPath, "utf-8");

    assert.match(weekViewContent, /gridRef = useRef<HTMLDivElement>\(null\)/);
    assert.match(weekViewContent, /targetHour = isTodayVisible \? Math\.max\(0, currentHour - 1\) : 8;/);
    assert.match(weekViewContent, /gridRef\.current\.scrollTop = targetHour \* 58/);
    assert.match(weekViewContent, /Live Current-Time Indicator on Today Column/);
    assert.match(weekViewContent, /top:\s*`\$\{\(currentMinute \/ 60\) \* 100\}%`/);

    // DayView checks
    const dayViewPath = path.join(ROOT_DIR, "src", "components", "calendar", "day-view.tsx");
    assert.ok(fs.existsSync(dayViewPath), "day-view.tsx must exist");
    const dayViewContent = fs.readFileSync(dayViewPath, "utf-8");

    assert.match(dayViewContent, /timelineRef = useRef<HTMLDivElement>\(null\)/);
    assert.match(dayViewContent, /targetHour = isToday \? Math\.max\(0, currentHour - 1\) : 8;/);
    assert.match(dayViewContent, /timelineRef\.current\.scrollTop = targetHour \* 60/);
    assert.match(dayViewContent, /Live Current-Time Indicator on Today/);
    assert.match(dayViewContent, /top:\s*`\$\{\(currentMinute \/ 60\) \* 100\}%`/);
  });

  await t.test("4. Command Palette Actions ('>') Matching & Registry", () => {
    // Base palette contains navigation, theme personalities, appearance, and vault actions
    assert.ok(COMMAND_PALETTE_ITEMS.length >= 15, "Must have at least 15 commands registered");

    const allCommands = filterCommandPalette(">");
    assert.equal(allCommands.length, COMMAND_PALETTE_ITEMS.length, "'>' alone returns all commands");

    // Theme filter
    const themeCommands = filterCommandPalette("> theme");
    assert.ok(themeCommands.length >= 7, "Must match all 7 theme personalities");
    assert.ok(themeCommands.some((c) => c.id === "theme-archivist"));
    assert.ok(themeCommands.some((c) => c.id === "theme-minimalist"));
    assert.ok(themeCommands.some((c) => c.id === "theme-futuristic"));

    // Dark mode filter
    const darkCommands = filterCommandPalette("> dark");
    assert.ok(darkCommands.some((c) => c.id === "appearance-dark"));

    // Export vault filter
    const exportCommands = filterCommandPalette("> export");
    assert.ok(exportCommands.some((c) => c.id === "data-export-vault"));

    // Navigation filter
    const taskCommands = filterCommandPalette("> tasks");
    assert.ok(taskCommands.some((c) => c.id === "nav-tasks"));

    // Execution callback contract
    let routePushed = "";
    let closed = false;
    const testItem = COMMAND_PALETTE_ITEMS.find((c) => c.id === "nav-tasks");
    testItem.run({
      router: { push: (r) => { routePushed = r; } },
      setThemePersonality: () => {},
      setTheme: () => {},
      closePalette: () => { closed = true; },
    });
    assert.equal(routePushed, "/tasks");
    assert.equal(closed, true);
  });

  await t.test("5. Two-Key Navigation Chords: Map, State Machine & Input Ignore Guard", () => {
    assert.equal(CHORD_NAV_MAP.i, "/inbox");
    assert.equal(CHORD_NAV_MAP.t, "/tasks");
    assert.equal(CHORD_NAV_MAP.h, "/habits");
    assert.equal(CHORD_NAV_MAP.c, "/calendar");
    assert.equal(CHORD_NAV_MAP.l, "/library");
    assert.equal(CHORD_NAV_MAP.d, "/");

    // shouldIgnoreNavigationChord guards
    assert.equal(shouldIgnoreNavigationChord({ tagName: "INPUT", isContentEditable: false }), true);
    assert.equal(shouldIgnoreNavigationChord({ tagName: "TEXTAREA", isContentEditable: false }), true);
    assert.equal(shouldIgnoreNavigationChord({ tagName: "SELECT", isContentEditable: false }), true);
    assert.equal(shouldIgnoreNavigationChord({ tagName: "DIV", isContentEditable: true }), true);
    assert.equal(shouldIgnoreNavigationChord({ tagName: "DIV", isContentEditable: false }), false);
    assert.equal(shouldIgnoreNavigationChord({ tagName: "BODY", isContentEditable: false }), false);
    assert.equal(shouldIgnoreNavigationChord(null), false);

    // Layout mounts NavigationChordsListener
    const layoutPath = path.join(ROOT_DIR, "src", "app", "layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");
    assert.match(layoutContent, /<NavigationChordsListener \/>/);
  });
});
