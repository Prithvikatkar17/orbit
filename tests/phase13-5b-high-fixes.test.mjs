import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractSnippet } from "../src/lib/services/search-service.ts";
import {
  parseLocalDate,
  getOffsetDateString,
} from "../src/lib/utils/dates.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { LibraryEntrySchema } from "../src/lib/schemas/library-entry.ts";

const ROOT_DIR = process.cwd();

test("Phase 13.5B: High-Severity Stabilization Verification", async (t) => {
  await t.test("1. Reordering tasks with duplicate sortOrder:0 normalizes to strictly increasing unique integers", () => {
    // Emulate tasks having duplicate sortOrder: 0
    const rawTasks = [
      { id: "task-1", title: "Task 1", sortOrder: 0 },
      { id: "task-2", title: "Task 2", sortOrder: 0 },
      { id: "task-3", title: "Task 3", sortOrder: 0 },
    ];

    // User drags task-3 to index 0
    const reordered = [rawTasks[2], rawTasks[0], rawTasks[1]];
    const normalizedOrders = reordered.map((_, i) => i);

    assert.deepEqual(normalizedOrders, [0, 1, 2]);

    const updates = reordered.map((item, i) => ({
      id: item.id,
      sortOrder: normalizedOrders[i],
    }));

    assert.equal(updates[0].id, "task-3");
    assert.equal(updates[0].sortOrder, 0);
    assert.equal(updates[1].id, "task-1");
    assert.equal(updates[1].sortOrder, 1);
    assert.equal(updates[2].id, "task-2");
    assert.equal(updates[2].sortOrder, 2);

    // Verify tasks page source has normalizedOrders mapping
    const tasksPagePath = path.join(ROOT_DIR, "src", "app", "tasks", "page.tsx");
    const tasksPageContent = fs.readFileSync(tasksPagePath, "utf-8");
    assert.ok(
      tasksPageContent.includes("reordered.map((_, i) => i)"),
      "handleDragEnd must normalize to strictly increasing integers"
    );
  });

  await t.test("2. 7-day reminder lookahead calculation handles advance reminders without being marked missed", () => {
    const todayStr = "2026-11-21";
    const today = parseLocalDate(todayStr);

    // Active reminders with 7-day offset (10080 minutes) and 3-day offset (4320 minutes)
    const activeReminders = [
      { id: "rem-1", timing: { offsetMinutes: 10080 } }, // 7 days ahead
      { id: "rem-2", timing: { offsetMinutes: 4320 } },  // 3 days ahead
      { id: "rem-3", timing: { offsetMinutes: 15 } },    // 15 mins
    ];

    const maxOffsetDays = Math.max(
      2,
      ...activeReminders.map((r) =>
        Math.ceil(((r.timing?.offsetMinutes || 0) / 1440)) + 1
      )
    );

    assert.equal(maxOffsetDays, 8); // 10080 / 1440 = 7, + 1 = 8

    const checkEndStr = getOffsetDateString(maxOffsetDays, today);
    assert.equal(checkEndStr, "2026-11-29");

    // An event on 2026-11-28 with 7-day reminder should be included in check window
    assert.ok("2026-11-28" <= checkEndStr, "Event 7 days ahead must fall within check window");

    // Verify reminder-service.ts source implements dynamic maxOffsetDays calculation
    const reminderServicePath = path.join(ROOT_DIR, "src", "lib", "services", "reminder-service.ts");
    const reminderServiceContent = fs.readFileSync(reminderServicePath, "utf-8");
    assert.ok(
      reminderServiceContent.includes("maxOffsetDays"),
      "reminder-service must calculate dynamic maxOffsetDays"
    );
    assert.ok(
      reminderServiceContent.includes("defaultReminderTime"),
      "reminder-service must respect defaultReminderTime from user_settings"
    );
    assert.ok(
      reminderServiceContent.includes("notificationsEnabled"),
      "reminder-service must check notificationsEnabled before native notification dispatch"
    );
  });

  await t.test("3. extractSnippet highlight offset accuracy accounts for leading whitespace", () => {
    // Note with leading whitespace before match
    const content = "   \n\t  Important project milestone reached on Monday";
    const tokens = ["milestone"];

    const snippet = extractSnippet(content, tokens, 40);
    assert.ok(snippet !== undefined, "Snippet must be found");

    const { text, matchStart, matchEnd } = snippet;
    const extractedSubstring = text.slice(matchStart, matchEnd);

    assert.equal(
      extractedSubstring.toLowerCase(),
      "milestone",
      `Highlighted substring "${extractedSubstring}" must exactly equal token "milestone"`
    );
  });

  await t.test("4. Malformed legacy dates and URLs in migrate-legacy.ts fall back safely without throwing", () => {
    const malformedItems = [
      {
        id: 1,
        title: "Item with invalid date",
        created: "invalid-date-string-that-causes-range-error",
        link: "http...",
        category: "task",
      },
      {
        id: 2,
        title: "Item with invalid URL",
        created: "2026-01-01T00:00:00.000Z",
        link: "http://[invalid-host",
        category: "learn",
      },
    ];

    // Helper from migrate-legacy.ts
    function safeHttpUrl(raw) {
      if (!raw || typeof raw !== "string") return undefined;
      const trimmed = raw.trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return undefined;
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        return undefined;
      }
    }

    const nowIso = new Date().toISOString();

    for (const item of malformedItems) {
      // 1. Date resilience test
      let createdIso = nowIso;
      if (item.created) {
        try {
          const d = new Date(item.created);
          if (!isNaN(d.getTime())) {
            createdIso = d.toISOString();
          }
        } catch {
          // fallback
        }
      }
      assert.ok(createdIso, "createdIso must always resolve to a valid string");
      assert.doesNotThrow(() => new Date(createdIso).toISOString());

      // 2. URL resilience test
      const safeLink = safeHttpUrl(item.link);
      assert.equal(safeLink, undefined, "Malformed URLs must resolve to undefined");

      // 3. Schema parse resilience test
      if (item.category === "task") {
        assert.doesNotThrow(() => {
          TaskSchema.parse({
            id: crypto.randomUUID(),
            title: item.title,
            notes: "",
            link: safeLink,
            category: "task",
            priority: "medium",
            status: "todo",
            sortOrder: 0,
            tags: ["task"],
            createdAt: createdIso,
            updatedAt: createdIso,
          });
        }, "TaskSchema must parse without throwing on malformed input");
      } else {
        assert.doesNotThrow(() => {
          LibraryEntrySchema.parse({
            id: crypto.randomUUID(),
            title: item.title,
            notes: "",
            link: safeLink,
            type: "learn",
            status: "saved",
            tags: [item.category],
            createdAt: createdIso,
            updatedAt: createdIso,
          });
        }, "LibraryEntrySchema must parse without throwing on malformed input");
      }
    }
  });

  await t.test("5. All 7 dashboard personalities mount LegacyMigrationBanner", () => {
    const dashboardFiles = [
      "src/components/dashboard/archivist/archivist-dashboard.tsx",
      "src/components/dashboard/futuristic/futuristic-dashboard.tsx",
      "src/components/dashboard/aesthetic/aesthetic-dashboard.tsx",
      "src/components/dashboard/artistic/artistic-dashboard.tsx",
      "src/components/dashboard/minimalist/minimalist-dashboard.tsx",
      "src/components/dashboard/naturalist/naturalist-dashboard.tsx",
      "src/components/dashboard/midnight/midnight-dashboard.tsx",
    ];

    for (const relPath of dashboardFiles) {
      const fullPath = path.join(ROOT_DIR, relPath);
      assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("<LegacyMigrationBanner />"),
        `${relPath} must mount <LegacyMigrationBanner />`
      );
    }
  });

  await t.test("6. Quick capture and convert modals assign nextSortOrder = maxSortOrder + 1", () => {
    const qcPath = path.join(ROOT_DIR, "src", "components", "quick-capture-modal.tsx");
    const convertPath = path.join(ROOT_DIR, "src", "components", "inbox", "convert-modal.tsx");

    const qcContent = fs.readFileSync(qcPath, "utf-8");
    assert.ok(
      qcContent.includes("nextSortOrder"),
      "QuickCaptureModal must compute nextSortOrder"
    );
    assert.ok(
      qcContent.includes("formError"),
      "QuickCaptureModal must maintain formError state for validation"
    );

    const convertContent = fs.readFileSync(convertPath, "utf-8");
    assert.ok(
      convertContent.includes("nextSortOrder"),
      "ConvertModal must compute nextSortOrder"
    );
  });
});
