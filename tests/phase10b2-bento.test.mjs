import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Dashboard Bento Grid Composition (src/app/page.tsx)
// ---------------------------------------------------------------------------
test("Phase 10B.2 — Dashboard implements responsive Bento Grid layout with visual hierarchy", () => {
  const page = readSrc("src/app/page.tsx");

  // Grid container structure: 1 col on mobile, 2 col on tablet, 12 col on desktop
  assert.match(
    page,
    /grid grid-cols-1.*md:grid-cols-2.*lg:grid-cols-12/,
    "Dashboard must compose a responsive 12-column Bento Grid on desktop and 2-column on tablet"
  );

  // Varied card sizes and visual hierarchy
  assert.match(
    page,
    /lg:col-span-7.*Today's Focus|Today's Focus.*lg:col-span-7|lg:col-span-7.*xl:col-span-7.*Today's Focus/s,
    "Today's Focus tile must have prominent visual width (7 cols) in the Bento Grid"
  );
  assert.match(
    page,
    /lg:col-span-5.*Daily Routines|Daily Routines.*lg:col-span-5|lg:col-span-5.*xl:col-span-5.*Daily Routines/s,
    "Daily Routines tile must balance the row with 5 cols in the Bento Grid"
  );
  assert.match(
    page,
    /WeeklyProgressWidget/,
    "WeeklyProgressWidget must be rendered in the Bento Grid"
  );
  assert.match(
    page,
    /UpcomingEventsWidget/,
    "UpcomingEventsWidget must be rendered in the Bento Grid"
  );

  // Quick actions easy to reach
  assert.match(page, /openSearch/, "Dashboard must provide one-click Search access");
  assert.match(page, /openQuickCapture/, "Dashboard must provide one-click Quick Capture access");
  assert.match(page, /\/inbox/, "Dashboard must provide direct Inbox navigation");

  // Preserves essential contract assertions
  assert.match(page, /useMounted/, "Must preserve useMounted hydration guard");
  assert.match(page, /aria-pressed=\{done\}/, "Must preserve accessible habit toggle state");
  assert.match(page, /as completed/, "Must preserve accessible task completion label");
  assert.doesNotMatch(page, /sm:grid-cols-4|lg:grid-cols-4/, "Must not restore legacy 4-card KPI grid");
  assert.match(page, /SurfaceCard/, "Must use shared SurfaceCard primitive");
  assert.match(page, /EmptyState/, "Must use shared EmptyState primitive");
});

// ---------------------------------------------------------------------------
// 2. Insights Overview Cards Bento Grid (src/components/insights/overview-cards.tsx)
// ---------------------------------------------------------------------------
test("Phase 10B.2 — Insights OverviewCards implements asymmetric Bento layout for metrics", () => {
  const overview = readSrc("src/components/insights/overview-cards.tsx");

  // Bento container
  assert.match(
    overview,
    /grid grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-12/,
    "Overview cards must use a 12-column Bento Grid layout"
  );

  // Hero primary cards (Tasks Completed & Habit Consistency)
  assert.match(
    overview,
    /lg:col-span-7.*Tasks Completed|Tasks Completed.*lg:col-span-7/s,
    "Tasks Completed must be a hero tile spanning 7 columns"
  );
  assert.match(
    overview,
    /lg:col-span-5.*Habit Consistency|Habit Consistency.*lg:col-span-5/s,
    "Habit Consistency must be a hero tile spanning 5 columns"
  );

  // Supporting compact cards (Completion Rate, Pending Tasks, Overdue Tasks)
  assert.match(
    overview,
    /lg:col-span-4.*Completion Rate|Completion Rate.*lg:col-span-4/s,
    "Completion Rate must be a compact supporting tile spanning 4 columns"
  );
  assert.match(
    overview,
    /lg:col-span-4.*Pending Tasks|Pending Tasks.*lg:col-span-4/s,
    "Pending Tasks must be a compact supporting tile spanning 4 columns"
  );
  assert.match(
    overview,
    /lg:col-span-4.*Overdue Tasks|Overdue Tasks.*lg:col-span-4/s,
    "Overdue Tasks must be a compact supporting tile spanning 4 columns"
  );

  // Narrative summary strip
  assert.match(overview, /Rhythm & Output/, "Must preserve Rhythm & Output summary strip");
  assert.match(overview, /font-display/, "Must preserve editorial display typography");
  assert.match(overview, /font-mono/, "Must preserve tabular mono figures");
});

// ---------------------------------------------------------------------------
// 3. Insights Workspace Bento Composition (src/app/insights/page.tsx)
// ---------------------------------------------------------------------------
test("Phase 10B.2 — Insights Page composes an engaging Bento Grid analytics workspace", () => {
  const page = readSrc("src/app/insights/page.tsx");

  // 12-column Bento grid for analytics charts and breakdowns
  assert.match(
    page,
    /grid grid-cols-1 gap-6 lg:grid-cols-12/,
    "Insights workspace must organize sections into a 12-column Bento Grid"
  );

  // Visual areas: large chart + asymmetric breakdown + full-width accomplishments
  assert.match(
    page,
    /lg:col-span-12.*ActivityChart|ActivityChart.*lg:col-span-12/s,
    "ActivityChart must occupy full 12 columns for clear time-series visualization"
  );
  assert.match(
    page,
    /lg:col-span-7.*HabitBreakdown|HabitBreakdown.*lg:col-span-7/s,
    "HabitBreakdown must occupy 7 columns for multi-habit list and streak meters"
  );
  assert.match(
    page,
    /lg:col-span-5.*TaskDistribution|TaskDistribution.*lg:col-span-5/s,
    "TaskDistribution must occupy 5 columns for compact distribution metrics"
  );
  assert.match(
    page,
    /lg:col-span-12.*RecentAccomplishments|RecentAccomplishments.*lg:col-span-12/s,
    "RecentAccomplishments must span 12 columns for milestone ledger"
  );

  // Loading skeleton matches the Bento composition
  assert.match(
    page,
    /animate-pulse.*lg:col-span-7|lg:col-span-7.*animate-pulse/,
    "Skeleton must match Bento proportions (7 cols)"
  );
  assert.match(
    page,
    /animate-pulse.*lg:col-span-5|lg:col-span-5.*animate-pulse/,
    "Skeleton must match Bento proportions (5 cols)"
  );
});

// ---------------------------------------------------------------------------
// 4. Accessibility, Touch Targets & Zero Legacy Color Leakage
// ---------------------------------------------------------------------------
test("Phase 10B.2 — Bento components maintain touch targets, semantic tokens, and no legacy colors", () => {
  const page = readSrc("src/app/page.tsx");
  const overview = readSrc("src/components/insights/overview-cards.tsx");
  const insightsPage = readSrc("src/app/insights/page.tsx");

  for (const [name, content] of [
    ["page.tsx", page],
    ["overview-cards.tsx", overview],
    ["insights/page.tsx", insightsPage],
  ]) {
    assert.doesNotMatch(content, /\b(?:bg|text|border)-(?:slate|indigo|violet)-\d{2,3}\b/, `${name} must not contain legacy color classes`);
    assert.match(content, /orbit-/, `${name} must use semantic orbit-* tokens`);
  }

  // Dashboard habit toggle touch target
  assert.match(
    page,
    /min-h-\[44px\]/,
    "Dashboard habit items must guarantee minimum 44px touch target height"
  );
});
