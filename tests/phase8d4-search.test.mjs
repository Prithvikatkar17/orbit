import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { searchAll } from "../src/lib/services/search-service.ts";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const SEARCH_FILES = [
  "src/components/search/search-modal.tsx",
  "src/components/search/search-result-item.tsx",
];

// ---------------------------------------------------------------------------
// 1. Quiet Desk & Paper Editorial Token & Legacy Class Removal
// ---------------------------------------------------------------------------
test("Phase 8D.4 — Universal Search files avoid legacy slate/indigo/violet styling and use orbit-* tokens", () => {
  for (const file of SEARCH_FILES) {
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
test("Phase 8D.4 — Search adopts Badge, Newsreader display typography, and Geist Mono", () => {
  const modal = readSrc("src/components/search/search-modal.tsx");
  const item = readSrc("src/components/search/search-result-item.tsx");

  assert.match(modal, /Badge/);
  assert.match(modal, /font-display/);
  assert.match(modal, /font-mono/);

  assert.match(item, /Badge/);
  assert.match(item, /font-mono/);
});

// ---------------------------------------------------------------------------
// 3. Accessibility Contracts Preservation
// ---------------------------------------------------------------------------
test("Phase 8D.4 — Search preserves ARIA roles, combobox, listbox, option, and active-descendant contracts", () => {
  const modal = readSrc("src/components/search/search-modal.tsx");
  const item = readSrc("src/components/search/search-result-item.tsx");

  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /role="combobox"/);
  assert.match(modal, /role="listbox"/);
  assert.match(modal, /aria-activedescendant/);
  assert.match(modal, /role="status"/);
  assert.match(modal, /aria-live="polite"/);

  assert.match(item, /role="option"/);
  assert.match(item, /id=\{`search-option-\$\{item\.id\}`\}/);
  assert.match(item, /aria-selected=\{isSelected\}/);
});

// ---------------------------------------------------------------------------
// 4. Search Service Integrity Preservation
// ---------------------------------------------------------------------------
test("Phase 8D.4 — searchAll preserves multi-module search ranking and highlight structures", () => {
  const data = {
    tasks: [
      {
        id: "task-101",
        title: "Paper Editorial Redesign",
        description: "Modernize styling and typography for ORBIT",
        status: "todo",
        priority: "high",
        category: "design",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-10T00:00:00.000Z",
      },
    ],
    habits: [
      {
        id: "habit-201",
        title: "Daily Journaling",
        frequency: "daily",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-10T00:00:00.000Z",
      },
    ],
  };

  const results = searchAll("editorial", data, { moduleFilter: "all", limit: 10 });
  assert.equal(results.totalMatches, 1);
  assert.equal(results.items[0].id, "task-101");
  assert.equal(results.items[0].module, "task");
  assert.ok(results.items[0].highlights.length > 0);
  assert.equal(results.groups.length, 1);
  assert.equal(results.groups[0].module, "task");
});

