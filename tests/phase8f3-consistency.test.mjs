import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const TARGET_FILES = [
  "src/components/reminders/notification-center.tsx",
  "src/components/legacy-migration-banner.tsx",
  "src/lib/constants.ts",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/not-found.tsx",
];

const fileContents = new Map();
for (const relPath of TARGET_FILES) {
  const fullPath = path.join(projectRoot, relPath);
  fileContents.set(relPath, fs.readFileSync(fullPath, "utf-8"));
}

test("Phase 8F.3 — Zero legacy color utility classes in targeted files", () => {
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
    `Found legacy color utility classes in target files: ${JSON.stringify(violations, null, 2)}`
  );
});

test("Phase 8F.3 — Quiet Desk & Paper Editorial design tokens in targeted components", () => {
  // Excluding global-error which must be self-contained and inline/hex-fallback resilient
  const appTargetFiles = [
    "src/components/reminders/notification-center.tsx",
    "src/components/legacy-migration-banner.tsx",
    "src/app/error.tsx",
    "src/app/not-found.tsx",
  ];

  for (const relPath of appTargetFiles) {
    const content = fileContents.get(relPath);
    assert.ok(
      content.includes("orbit-"),
      `Expected ${relPath} to include semantic orbit-* design tokens`
    );
  }
});

test("Phase 8F.3 — NotificationCenter preservation & semantic styling", () => {
  const content = fileContents.get("src/components/reminders/notification-center.tsx");
  assert.ok(content.includes("useNotificationStore"), "Must use useNotificationStore");
  assert.ok(content.includes("acknowledgeReminder"), "Must preserve acknowledgeReminder");
  assert.ok(content.includes("requestNotificationPermission"), "Must preserve requestNotificationPermission");
  assert.ok(content.includes("EVENT_TYPE_MAP"), "Must use EVENT_TYPE_MAP");
  assert.ok(content.includes("createPortal"), "Must preserve createPortal flyout");
  assert.ok(content.includes("updatePosition"), "Must preserve viewport-aware position update");
  assert.ok(content.includes("bg-orbit-surface"), "Must use bg-orbit-surface");
  assert.ok(content.includes("border-orbit-border"), "Must use border-orbit-border");
});

test("Phase 8F.3 — LegacyMigrationBanner preservation & paper styling", () => {
  const content = fileContents.get("src/components/legacy-migration-banner.tsx");
  assert.ok(content.includes("detectLegacyData"), "Must preserve detectLegacyData");
  assert.ok(content.includes("analyzeLegacyData"), "Must preserve analyzeLegacyData");
  assert.ok(content.includes("executeLegacyMigration"), "Must preserve executeLegacyMigration");
  assert.ok(content.includes("Dismiss migration banner"), "Must provide dismiss action");
  assert.ok(content.includes("useAccessibleModal"), "Must use useAccessibleModal");
  assert.ok(content.includes("rounded-orbit-card"), "Must use rounded-orbit-card");
});

test("Phase 8F.3 — Constants preservation & semantic badge classes", () => {
  const content = fileContents.get("src/lib/constants.ts");
  assert.ok(content.includes("DEFAULT_CATEGORIES"), "Must preserve DEFAULT_CATEGORIES");
  assert.ok(content.includes("CATEGORY_ICONS"), "Must preserve CATEGORY_ICONS");
  assert.ok(content.includes("EVENT_TYPES"), "Must preserve EVENT_TYPES");
  assert.ok(content.includes("EVENT_TYPE_MAP"), "Must preserve EVENT_TYPE_MAP");
  assert.ok(content.includes("MAX_LIBRARY_FILE_SIZE"), "Must preserve MAX_LIBRARY_FILE_SIZE");
  assert.ok(content.includes("bg-orbit-accent-soft"), "Must use semantic badgeClass in EVENT_TYPE_MAP");
  assert.ok(content.includes("bg-orbit-danger-soft"), "Must use semantic badgeClass in EVENT_TYPE_MAP");
  assert.ok(content.includes("bg-orbit-success-soft"), "Must use semantic badgeClass in EVENT_TYPE_MAP");
});

test("Phase 8F.3 — Error Boundaries & Not-Found page integrity", () => {
  // error.tsx
  const errorContent = fileContents.get("src/app/error.tsx");
  assert.ok(errorContent.includes("reset()"), "error.tsx must provide reset recovery");
  assert.ok(errorContent.includes('role="alert"'), "error.tsx must provide role='alert'");
  assert.ok(errorContent.includes("font-display"), "error.tsx must use Newsreader font-display");
  assert.ok(errorContent.includes("Back to Dashboard"), "error.tsx must provide Back to Dashboard");

  // global-error.tsx
  const globalError = fileContents.get("src/app/global-error.tsx");
  assert.ok(globalError.includes("<html"), "global-error.tsx must be self-contained with <html>");
  assert.ok(globalError.includes("<body"), "global-error.tsx must be self-contained with <body>");
  assert.ok(globalError.includes("reset()"), "global-error.tsx must call reset()");
  assert.ok(globalError.includes('href="/"'), "global-error.tsx must offer return to dashboard");

  // not-found.tsx
  const notFound = fileContents.get("src/app/not-found.tsx");
  assert.ok(notFound.includes("404 — Page Not Found"), "not-found.tsx must indicate 404");
  assert.ok(notFound.includes("font-display"), "not-found.tsx must use font-display");
  assert.ok(notFound.includes('href="/"'), "not-found.tsx must have link to dashboard");
  assert.ok(notFound.includes("/tasks"), "not-found.tsx must have quick navigation links");
});

