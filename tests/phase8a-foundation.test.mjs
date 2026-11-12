import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { useUIStore } from "../src/lib/stores/ui-store.ts";

// ---------------------------------------------------------------------------
// 1. Mobile Sidebar Initial State
// ---------------------------------------------------------------------------
test("Phase 8A — Mobile sidebar drawer defaults to closed on initial load", () => {
  const initialState = useUIStore.getState();
  assert.equal(
    initialState.sidebarOpen,
    false,
    "sidebarOpen must default to false so the mobile drawer does not cover the viewport on load"
  );
  assert.equal(initialState.quickCaptureOpen, false);
});

// ---------------------------------------------------------------------------
// 2. Typography & Font Configuration
// ---------------------------------------------------------------------------
test("Phase 8A — Layout loads locally bundled next/font faces and sets theme readiness hook", () => {
  const layoutSrc = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf8");

  assert.ok(layoutSrc.includes('from "next/font/google"'), "Must load fonts via next/font/google");
  assert.ok(layoutSrc.includes("--font-geist-sans"), "Must expose --font-geist-sans");
  assert.ok(layoutSrc.includes("--font-geist-mono"), "Must expose --font-geist-mono");
  assert.ok(
    layoutSrc.includes("--font-orbit-display-base"),
    "Must expose --font-orbit-display-base"
  );
  assert.ok(
    layoutSrc.includes('data-orbit-theme="default"'),
    "Must include data-orbit-theme attribute on <html> for future theme overrides"
  );
});

// ---------------------------------------------------------------------------
// 3. Semantic CSS Tokens & Reduced Motion
// ---------------------------------------------------------------------------
test("Phase 8A — globals.css provides complete semantic tokens and removes Arial fallback", () => {
  const cssSrc = fs.readFileSync(path.resolve("src/app/globals.css"), "utf8");

  assert.ok(!cssSrc.includes("Arial"), "Hardcoded Arial body font override must be removed");

  const requiredTokens = [
    "--orbit-font-display",
    "--orbit-font-sans",
    "--orbit-font-mono",
    "--orbit-bg",
    "--orbit-bg-canvas",
    "--orbit-bg-subtle",
    "--orbit-surface",
    "--orbit-surface-secondary",
    "--orbit-surface-elevated",
    "--orbit-text",
    "--orbit-text-secondary",
    "--orbit-text-muted",
    "--orbit-accent",
    "--orbit-accent-fg",
    "--orbit-accent-soft",
    "--orbit-accent-secondary",
    "--orbit-success",
    "--orbit-warning",
    "--orbit-danger",
    "--orbit-border",
    "--orbit-focus-ring",
    "--orbit-radius-card",
    "--orbit-radius-control",
    "--orbit-shadow-card",
    "--orbit-shadow-elevated",
    "--orbit-chart-1",
    "--orbit-chart-2",
    "--orbit-chart-3",
    "--orbit-transition-fast",
    "--orbit-transition-normal",
  ];

  for (const token of requiredTokens) {
    assert.ok(cssSrc.includes(token), `Missing semantic CSS token: ${token}`);
  }

  assert.ok(
    cssSrc.includes("@media (prefers-reduced-motion: reduce)"),
    "Must respect prefers-reduced-motion"
  );
  assert.ok(cssSrc.includes("@theme inline"), "Must map semantic tokens in Tailwind v4 @theme inline");
});

// ---------------------------------------------------------------------------
// 4. Navigation, Shortcut Labels & Layout Padding Fixes
// ---------------------------------------------------------------------------
test("Phase 8A — Sidebar exposes Search entry points and corrects Quick Capture shortcut label", () => {
  const sidebarSrc = fs.readFileSync(path.resolve("src/components/sidebar.tsx"), "utf8");
  const inboxSrc = fs.readFileSync(path.resolve("src/app/inbox/page.tsx"), "utf8");
  const calendarSrc = fs.readFileSync(path.resolve("src/app/calendar/page.tsx"), "utf8");
  const settingsSrc = fs.readFileSync(path.resolve("src/app/settings/page.tsx"), "utf8");

  assert.ok(sidebarSrc.includes("⌘⇧K"), "Quick Capture button must display ⌘⇧K");
  assert.ok(sidebarSrc.includes("useSearchStore"), "Sidebar must connect to Search store");
  assert.ok(
    sidebarSrc.includes("Open Universal Search"),
    "Sidebar and MobileHeader must provide accessible Universal Search buttons"
  );
  assert.ok(
    !inboxSrc.includes("anytime with ⌘K"),
    "Inbox empty state must not mislabel Quick Capture as ⌘K"
  );
  assert.ok(inboxSrc.includes("⌘⇧K"), "Inbox empty state must show ⌘⇧K");

  assert.ok(
    !calendarSrc.includes("p-4 sm:p-6 lg:p-8"),
    "Calendar page must not duplicate root layout padding"
  );
  assert.ok(
    !settingsSrc.includes("p-4 sm:p-6 pb-16"),
    "Settings page must not duplicate root layout padding"
  );
});

