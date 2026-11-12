import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const CALENDAR_FILES = [
  "src/app/calendar/page.tsx",
  "src/components/calendar/calendar-header.tsx",
  "src/components/calendar/month-view.tsx",
  "src/components/calendar/week-view.tsx",
  "src/components/calendar/day-view.tsx",
  "src/components/calendar/event-details.tsx",
  "src/components/calendar/event-modal.tsx",
  "src/components/reminders/reminder-editor.tsx",
];

// ---------------------------------------------------------------------------
// 1. Quiet Desk & Paper Editorial Token & Primitive Adoption
// ---------------------------------------------------------------------------
test("Phase 8D.1 — Calendar files avoid legacy slate/indigo/rose styling and components use --orbit-* tokens", () => {
  for (const file of CALENDAR_FILES) {
    const src = readSrc(file);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-slate-\d+/, `${file} should not use legacy slate classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-indigo-\d+/, `${file} should not use legacy indigo classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-rose-\d+/, `${file} should not use legacy rose classes`);
    if (file !== "src/app/calendar/page.tsx") {
      assert.match(src, /orbit-/, `${file} should use Quiet Desk orbit-* semantic tokens`);
    }
  }
});

// ---------------------------------------------------------------------------
// 2. Shared UI Primitives & Editorial Typography
// ---------------------------------------------------------------------------
test("Phase 8D.1 — Calendar components adopt shared UI primitives and Newsreader display typography", () => {
  const page = readSrc("src/app/calendar/page.tsx");
  const header = readSrc("src/components/calendar/calendar-header.tsx");
  const monthView = readSrc("src/components/calendar/month-view.tsx");
  const weekView = readSrc("src/components/calendar/week-view.tsx");
  const dayView = readSrc("src/components/calendar/day-view.tsx");
  const details = readSrc("src/components/calendar/event-details.tsx");
  const modal = readSrc("src/components/calendar/event-modal.tsx");

  assert.match(header, /PageHeader/);
  assert.match(header, /SurfaceCard/);
  assert.match(header, /Button/);
  assert.match(header, /font-display/);

  assert.match(page, /SurfaceCard/);
  assert.match(page, /EmptyState/);
  assert.match(page, /selectedDateStr/);

  assert.match(monthView, /SurfaceCard/);
  assert.match(monthView, /font-display/);
  assert.match(weekView, /SurfaceCard/);
  assert.match(weekView, /font-mono/);
  assert.match(dayView, /SurfaceCard/);
  assert.match(dayView, /EmptyState/);
  assert.match(dayView, /Badge/);

  assert.match(details, /ConfirmDialog/);
  assert.match(details, /Badge/);
  assert.match(details, /Button/);
  assert.match(details, /font-display/);

  assert.match(modal, /Button/);
  assert.match(modal, /font-display/);
});

// ---------------------------------------------------------------------------
// 3. Responsive Views & Accessibility Contracts
// ---------------------------------------------------------------------------
test("Phase 8D.1 — Calendar preserves tablist, mobile month agenda, scrollable week grid, and accessible modals", () => {
  const header = readSrc("src/components/calendar/calendar-header.tsx");
  const monthView = readSrc("src/components/calendar/month-view.tsx");
  const weekView = readSrc("src/components/calendar/week-view.tsx");
  const dayView = readSrc("src/components/calendar/day-view.tsx");
  const details = readSrc("src/components/calendar/event-details.tsx");
  const modal = readSrc("src/components/calendar/event-modal.tsx");

  // View switcher tablist
  assert.match(header, /role="tablist"/);
  assert.match(header, /role="tab"/);
  assert.match(header, /aria-selected=/);

  // MonthView mobile dot indicators + selected-day editorial agenda
  assert.match(monthView, /md:hidden/);
  assert.match(monthView, /aria-pressed=/);
  assert.match(monthView, /role="dialog"/);

  // WeekView horizontal scroll container prevents narrow viewport crush
  assert.match(weekView, /overflow-x-auto/);
  assert.match(weekView, /min-w-\[680px\]/);

  // DayView collapsible empty slots + today badge
  assert.match(dayView, /showEmptySlots/);

  // Accessible modals
  for (const dialogSrc of [details, modal]) {
    assert.match(dialogSrc, /role="dialog"/);
    assert.match(dialogSrc, /aria-modal="true"/);
    assert.match(dialogSrc, /max-h-\[90dvh\]/);
    assert.match(dialogSrc, /aria-label="Close modal"/);
  }
});

test("Phase 8D.1 — formatDateDisplay is locale-independent to prevent SSR hydration mismatch", async () => {
  const { formatDateDisplay } = await import("../src/lib/utils/dates.ts");
  assert.equal(formatDateDisplay("2026-11-12"), "Thursday, November 12, 2026");
  assert.equal(formatDateDisplay(""), "");
});
