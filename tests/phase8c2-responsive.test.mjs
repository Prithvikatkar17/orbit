import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

// ---------------------------------------------------------------------------
// 1. App Shell & Mobile Navigation Accessibility
// ---------------------------------------------------------------------------
test("Phase 8C.2 — Sidebar switches to lg: (1024px) sticky desktop layout and inert closed drawer", () => {
  const sidebar = readSrc("src/components/sidebar.tsx");
  const layout = readSrc("src/app/layout.tsx");

  assert.match(sidebar, /lg:sticky/);
  assert.match(sidebar, /lg:h-screen/);
  assert.match(sidebar, /lg:hidden/);
  assert.match(sidebar, /matchMedia\("\(min-width: 1024px\)"\)/);
  assert.match(sidebar, /inert=\{isMobileDrawerHidden \|\| undefined\}/);
  assert.match(sidebar, /aria-hidden=\{isMobileDrawerHidden \|\| undefined\}/);
  assert.match(sidebar, /invisible lg:visible/);
  assert.match(sidebar, /e\.key === "Escape"/);
  assert.match(sidebar, /closeButtonRef/);

  assert.match(layout, /min-w-0/);
  assert.match(layout, /@container/);
});

// ---------------------------------------------------------------------------
// 2. Touch Targets & Hover-Only Anti-Pattern Fixes
// ---------------------------------------------------------------------------
test("Phase 8C.2 — Touch targets meet 40-44px hit sizing and actions are not hidden on touch screens", () => {
  const sidebar = readSrc("src/components/sidebar.tsx");
  const notifications = readSrc("src/components/reminders/notification-center.tsx");
  const home = readSrc("src/app/page.tsx");
  const taskItem = readSrc("src/components/tasks/sortable-task-item.tsx");
  const habitCard = readSrc("src/components/habits/habit-card.tsx");
  const button = readSrc("src/components/ui/button.tsx");

  assert.match(sidebar, /min-h-\[44px\]/);
  assert.match(notifications, /h-11 w-11/);
  assert.match(home, /h-11 w-11/);
  assert.match(home, /min-h-\[44px\]/);

  // Row actions must stay visible on non-hover touch devices via @media(hover:hover)
  assert.match(taskItem, /h-11 w-11/);
  assert.match(taskItem, /\[@media\(hover:hover\)\]:opacity-0/);
  assert.doesNotMatch(taskItem, /\bsm:opacity-0\b/);

  assert.match(habitCard, /min-h-\[44px\]/);
  assert.match(habitCard, /\[@media\(hover:hover\)\]:group-hover:opacity-100/);
  assert.doesNotMatch(habitCard, /\bsm:opacity-75\b/);

  assert.match(button, /min-h-\[40px\]/);
  assert.match(button, /min-h-\[44px\]/);
});

// ---------------------------------------------------------------------------
// 3. Modal Responsiveness & Dynamic Viewport Height
// ---------------------------------------------------------------------------
test("Phase 8C.2 — Modals use dynamic viewport max-height, scroll internally, and stack narrow grids", () => {
  const modalPaths = [
    "src/components/ui/confirm-dialog.tsx",
    "src/components/tasks/task-modal.tsx",
    "src/components/habits/habit-modal.tsx",
    "src/components/inbox/convert-modal.tsx",
    "src/components/quick-capture-modal.tsx",
    "src/components/calendar/event-modal.tsx",
    "src/components/library/library-entry-modal.tsx",
    "src/components/library/library-detail-modal.tsx",
    "src/components/library/library-collection-modal.tsx",
    "src/components/legacy-migration-banner.tsx",
  ];

  for (const modalPath of modalPaths) {
    const content = readSrc(modalPath);
    assert.match(
      content,
      /max-h-\[90dvh\]/,
      `${modalPath} should constrain max-h-[90dvh]`
    );
    assert.match(
      content,
      /overflow-y-auto/,
      `${modalPath} should scroll internally on small screens`
    );
  }

  const searchModal = readSrc("src/components/search/search-modal.tsx");
  assert.match(searchModal, /max-h-\[92dvh\]/);

  const stackedFormModals = [
    "src/components/tasks/task-modal.tsx",
    "src/components/inbox/convert-modal.tsx",
    "src/components/quick-capture-modal.tsx",
    "src/components/calendar/event-modal.tsx",
    "src/components/library/library-entry-modal.tsx",
  ];

  for (const modalPath of stackedFormModals) {
    const content = readSrc(modalPath);
    assert.match(
      content,
      /grid-cols-1[^"]*sm:grid-cols-2/,
      `${modalPath} should stack 2-column form grids on narrow viewports`
    );
  }

  const habitModal = readSrc("src/components/habits/habit-modal.tsx");
  assert.match(habitModal, /grid-cols-2[^"]*sm:grid-cols-4/);
  assert.match(habitModal, /flex-wrap/);

  const collectionModal = readSrc("src/components/library/library-collection-modal.tsx");
  assert.match(collectionModal, /flex-wrap items-center/);
});

// ---------------------------------------------------------------------------
// 4. Container Queries, Wrapping & Non-Overflowing Habit Heatmap
// ---------------------------------------------------------------------------
test("Phase 8C.2 — Widgets adopt container queries, safe text wrapping, and non-overflowing default heatmap", () => {
  const weekly = readSrc("src/components/dashboard/weekly-progress.tsx");
  const tasksPage = readSrc("src/app/tasks/page.tsx");
  const taskItem = readSrc("src/components/tasks/sortable-task-item.tsx");
  const inboxPage = readSrc("src/app/inbox/page.tsx");
  const habitCard = readSrc("src/components/habits/habit-card.tsx");
  const heatmap = readSrc("src/components/habits/heatmap.tsx");

  assert.match(weekly, /@container/);
  assert.match(weekly, /@lg:grid-cols-12/);
  assert.match(weekly, /@\[340px\]:grid-cols-2/);

  assert.match(tasksPage, /overflow-x-auto/);
  assert.match(tasksPage, /grid-cols-2 gap-2 sm:flex/);

  assert.match(taskItem, /\[overflow-wrap:anywhere\]/);
  assert.match(inboxPage, /\[overflow-wrap:anywhere\]/);
  assert.match(inboxPage, /max-h-\[90dvh\]/);

  assert.match(habitCard, /@container/);
  assert.match(habitCard, /@\[560px\]:flex-row/);
  assert.match(habitCard, /\[overflow-wrap:anywhere\]/);

  assert.match(heatmap, /Last 28 Days/);
  assert.match(heatmap, /aria-expanded=\{expanded\}/);
  assert.match(heatmap, /180-day view/);
  assert.match(heatmap, /Compact 28d view/);
  assert.match(heatmap, /grid-cols-\[repeat\(14,minmax\(0,1fr\)\)\]/);
});

