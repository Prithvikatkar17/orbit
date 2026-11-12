import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const PHASE_8C_FILES = [
  "src/app/page.tsx",
  "src/components/dashboard/weekly-progress.tsx",
  "src/components/dashboard/upcoming-events.tsx",
  "src/app/tasks/page.tsx",
  "src/components/tasks/sortable-task-item.tsx",
  "src/app/inbox/page.tsx",
  "src/app/habits/page.tsx",
  "src/components/habits/habit-card.tsx",
  "src/components/habits/heatmap.tsx",
];

// ---------------------------------------------------------------------------
// 1. Semantic Token Usage & Removal of Generic Palette Classes
// ---------------------------------------------------------------------------
test("Phase 8C — Redesigned workspace pages and widgets avoid hardcoded slate/indigo/rose palette classes", () => {
  const legacyPalettePattern =
    /\b(?:bg|text|border|ring)-(?:slate|indigo|rose)-\d{2,3}\b/;

  const offenders = [];
  for (const relPath of PHASE_8C_FILES) {
    const content = readSrc(relPath);
    const match = content.match(legacyPalettePattern);
    if (match) {
      offenders.push(`${relPath}: matched "${match[0]}"`);
    }
  }

  assert.deepEqual(offenders, [], `Found legacy color classes:\n${offenders.join("\n")}`);
});

test("Phase 8C — Core redesigned files adopt Phase 8A semantic ORBIT tokens", () => {
  for (const relPath of PHASE_8C_FILES) {
    const content = readSrc(relPath);
    assert.ok(
      content.includes("orbit-"),
      `${relPath} should use semantic orbit-* tokens or CSS variables`
    );
  }
});

// ---------------------------------------------------------------------------
// 2. Dashboard Calm Briefing & Hydration Safety
// ---------------------------------------------------------------------------
test("Phase 8C — Dashboard gates dynamic greeting/date with useMounted and avoids 4-card KPI grid", () => {
  const dashboard = readSrc("src/app/page.tsx");

  assert.ok(
    dashboard.includes("useMounted"),
    "Dashboard should use useMounted() to guard time/date greeting hydration"
  );
  assert.ok(
    dashboard.includes("aria-pressed={done}") && dashboard.includes("as completed"),
    "Dashboard habit checklist should preserve accessibility attributes"
  );
  assert.ok(
    !dashboard.includes("sm:grid-cols-4") && !dashboard.includes("lg:grid-cols-4"),
    "Dashboard should replace the 4-card KPI grid with a calm summary strip"
  );
  assert.ok(
    dashboard.includes("SurfaceCard") && dashboard.includes("EmptyState"),
    "Dashboard should compose shared Phase 8B UI primitives"
  );
});

test("Phase 8C — Dashboard widgets use semantic ORBIT tokens and primitives", () => {
  const weekly = readSrc("src/components/dashboard/weekly-progress.tsx");
  const upcoming = readSrc("src/components/dashboard/upcoming-events.tsx");

  assert.ok(
    weekly.includes("var(--orbit-") && weekly.includes("SurfaceCard"),
    "WeeklyProgressWidget should use var(--orbit-*) CSS variables and SurfaceCard"
  );
  assert.ok(
    upcoming.includes("SurfaceCard") && upcoming.includes("EmptyState"),
    "UpcomingEventsWidget should use SurfaceCard and EmptyState"
  );
});

// ---------------------------------------------------------------------------
// 3. Tasks & Goals Redesign
// ---------------------------------------------------------------------------
test("Phase 8C — Tasks page uses PageHeader, unified SurfaceCard toolbar, EmptyState, and no 4-card KPI grid", () => {
  const tasksPage = readSrc("src/app/tasks/page.tsx");
  const taskItem = readSrc("src/components/tasks/sortable-task-item.tsx");

  assert.ok(tasksPage.includes("<PageHeader"), "Tasks page should use PageHeader");
  assert.ok(tasksPage.includes("<EmptyState"), "Tasks page should use EmptyState");
  assert.ok(tasksPage.includes("<ConfirmDialog"), "Tasks page should preserve ConfirmDialog");
  assert.ok(
    !tasksPage.includes("sm:grid-cols-4") && !tasksPage.includes("lg:grid-cols-4"),
    "Tasks page should not render a generic 4-card KPI grid"
  );
  assert.ok(
    taskItem.includes("SurfaceCard") && taskItem.includes("Badge"),
    "SortableTaskItem should use SurfaceCard and Badge primitives"
  );
});

// ---------------------------------------------------------------------------
// 4. Universal Inbox Redesign
// ---------------------------------------------------------------------------
test("Phase 8C — Inbox page preserves ⌘⇧K shortcut, accessible modals, and semantic design", () => {
  const inbox = readSrc("src/app/inbox/page.tsx");

  assert.ok(inbox.includes("<PageHeader"), "Inbox should use PageHeader");
  assert.ok(inbox.includes("<SurfaceCard"), "Inbox should use SurfaceCard");
  assert.ok(inbox.includes("<EmptyState"), "Inbox should use EmptyState");
  assert.ok(inbox.includes("<ConfirmDialog"), "Inbox should use ConfirmDialog");
  assert.ok(inbox.includes("⌘⇧K"), "Inbox empty state should advertise ⌘⇧K shortcut");
  assert.ok(
    inbox.includes("useAccessibleModal"),
    "Inbox edit modal should preserve accessible modal handling"
  );
});

// ---------------------------------------------------------------------------
// 5. Habits Redesign & Accessibility
// ---------------------------------------------------------------------------
test("Phase 8C — Habits page uses momentum summary, accessible tablist, and no 4-card KPI grid", () => {
  const habitsPage = readSrc("src/app/habits/page.tsx");
  const habitCard = readSrc("src/components/habits/habit-card.tsx");

  assert.ok(habitsPage.includes("<PageHeader"), "Habits page should use PageHeader");
  assert.ok(habitsPage.includes("<SurfaceCard"), "Habits page should use SurfaceCard");
  assert.ok(habitsPage.includes("<EmptyState"), "Habits page should use EmptyState");
  assert.ok(habitsPage.includes("<ConfirmDialog"), "Habits page should preserve ConfirmDialog");
  assert.ok(
    !habitsPage.includes("sm:grid-cols-4") && !habitsPage.includes("lg:grid-cols-4"),
    "Habits page should replace the 4-card KPI grid with a unified momentum strip"
  );
  assert.ok(
    habitsPage.includes('role="tablist"') &&
      habitsPage.includes('role="tab"') &&
      habitsPage.includes("aria-selected={activeTab ==="),
    "Habits active/archived tabs should use accessible tablist semantics"
  );
  assert.ok(
    habitCard.includes("aria-pressed={isCompletedToday}") &&
      habitCard.includes("aria-label={`Edit ${habit.title}`}") &&
      habitCard.includes("aria-label={`Delete ${habit.title}`}"),
    "HabitCard should expose aria-pressed and accessible action labels"
  );
});

