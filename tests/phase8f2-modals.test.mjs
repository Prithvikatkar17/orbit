import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const TARGET_FILES = [
  "src/components/tasks/task-modal.tsx",
  "src/components/habits/habit-modal.tsx",
  "src/components/quick-capture-modal.tsx",
  "src/components/inbox/convert-modal.tsx",
];

const fileContents = new Map();
for (const relPath of TARGET_FILES) {
  const fullPath = path.join(projectRoot, relPath);
  fileContents.set(relPath, fs.readFileSync(fullPath, "utf-8"));
}

test("Phase 8F.2 — Zero legacy color utility classes in redesigned modals", () => {
  const legacyPatterns = [
    /\bslate-[a-z0-9-]+/g,
    /\bindigo-[a-z0-9-]+/g,
    /\bviolet-[a-z0-9-]+/g,
    /\bemerald-[a-z0-9-]+/g,
    /\brose-[a-z0-9-]+/g,
    /\bpurple-[a-z0-9-]+/g,
  ];

  const violations = [];
  for (const [relPath, content] of fileContents.entries()) {
    for (const pat of legacyPatterns) {
      const matches = content.match(pat);
      if (matches) {
        violations.push({ file: relPath, pattern: pat.source, matches });
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found legacy color utility classes in target modals: ${JSON.stringify(violations, null, 2)}`
  );
});

test("Phase 8F.2 — Quiet Desk & Paper Editorial design tokens in all 4 modals", () => {
  const requiredTokens = [
    "orbit-surface",
    "orbit-border",
    "orbit-text",
    "orbit-accent",
    "font-display",
  ];

  for (const [relPath, content] of fileContents.entries()) {
    for (const token of requiredTokens) {
      assert.ok(
        content.includes(token),
        `Expected ${relPath} to include design token '${token}'`
      );
    }
  }
});

test("Phase 8F.2 — Shared Button primitive usage across all 4 modals", () => {
  for (const [relPath, content] of fileContents.entries()) {
    assert.ok(
      content.includes(`import { Button } from "@/components/ui/button"`),
      `Expected ${relPath} to import Button from @/components/ui/button`
    );
    assert.ok(
      content.includes("<Button"),
      `Expected ${relPath} to render <Button`
    );
  }
});

test("Phase 8F.2 — Modal accessibility attributes preserved", () => {
  for (const [relPath, content] of fileContents.entries()) {
    assert.ok(
      content.includes('role="dialog"'),
      `Expected ${relPath} to include role="dialog"`
    );
    assert.ok(
      content.includes('aria-modal="true"'),
      `Expected ${relPath} to include aria-modal="true"`
    );
    assert.ok(
      content.includes('aria-labelledby="'),
      `Expected ${relPath} to include aria-labelledby`
    );
    assert.ok(
      content.includes('useAccessibleModal'),
      `Expected ${relPath} to use useAccessibleModal hook`
    );
    assert.ok(
      content.includes('aria-label="Close modal"'),
      `Expected ${relPath} to have accessible close button`
    );
  }
});

test("Phase 8F.2 — Business logic and schema integrity preserved", () => {
  // TaskModal
  const taskModal = fileContents.get("src/components/tasks/task-modal.tsx");
  assert.ok(taskModal.includes("saveTaskWithSync"), "TaskModal must preserve saveTaskWithSync");
  assert.ok(taskModal.includes("db.tasks.orderBy"), "TaskModal must preserve db sort order calculation");

  // HabitModal
  const habitModal = fileContents.get("src/components/habits/habit-modal.tsx");
  assert.ok(habitModal.includes("HabitSchema.parse"), "HabitModal must validate with HabitSchema");
  assert.ok(habitModal.includes("DAYS_OF_WEEK"), "HabitModal must keep DAYS_OF_WEEK");
  assert.ok(habitModal.includes("PRESET_COLORS"), "HabitModal must keep PRESET_COLORS");

  // QuickCaptureModal
  const quickCapture = fileContents.get("src/components/quick-capture-modal.tsx");
  assert.ok(quickCapture.includes("ItemSchema.parse"), "QuickCapture must validate ItemSchema");
  assert.ok(quickCapture.includes("HabitSchema.parse"), "QuickCapture must validate HabitSchema");
  assert.ok(quickCapture.includes("LibraryEntrySchema.parse"), "QuickCapture must validate LibraryEntrySchema");
  assert.ok(quickCapture.includes("saveTaskWithSync"), "QuickCapture must preserve saveTaskWithSync");
  assert.ok(quickCapture.includes("Ctrl+Shift+K"), "QuickCapture must document keyboard shortcut");

  // ConvertModal
  const convertModal = fileContents.get("src/components/inbox/convert-modal.tsx");
  assert.ok(convertModal.includes("saveTaskWithSync"), "ConvertModal must preserve saveTaskWithSync");
  assert.ok(convertModal.includes("HabitSchema.parse"), "ConvertModal must validate HabitSchema");
  assert.ok(convertModal.includes("LibraryEntrySchema.parse"), "ConvertModal must validate LibraryEntrySchema");
  assert.ok(convertModal.includes("db.transaction"), "ConvertModal must preserve atomic db transactions");
});

test("Phase 8F.2 — ConvertModal 320px responsive destination selector optimization", () => {
  const convertModal = fileContents.get("src/components/inbox/convert-modal.tsx");
  // Assert compact grid spacing and truncate for labels
  assert.ok(
    convertModal.includes("grid-cols-3 gap-1"),
    "ConvertModal destination tabs should use gap-1 for narrow viewport support"
  );
  assert.ok(
    convertModal.includes("truncate"),
    "ConvertModal destination tab labels should have truncate for zero overflow"
  );
});

