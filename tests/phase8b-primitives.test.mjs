import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  canDismissConfirmDialog,
  resolveConfirmDialogConfig,
} from "../src/lib/utils/confirm-dialog.ts";

// ---------------------------------------------------------------------------
// 1. Confirmation Dialog Pure Logic & Loading Lock
// ---------------------------------------------------------------------------
test("Phase 8B — canDismissConfirmDialog blocks dismissal while loading", () => {
  assert.equal(canDismissConfirmDialog(false), true);
  assert.equal(canDismissConfirmDialog(undefined), true);
  assert.equal(canDismissConfirmDialog(true), false);
});

test("Phase 8B — resolveConfirmDialogConfig resolves defaults, variants, and lock flags", () => {
  const standard = resolveConfirmDialogConfig({
    title: "Archive task?",
    description: "You can restore it later.",
  });
  assert.deepEqual(standard, {
    title: "Archive task?",
    description: "You can restore it later.",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    confirmVariant: "primary",
    canDismiss: true,
    isConfirmDisabled: false,
    isCancelDisabled: false,
  });

  const dangerIdle = resolveConfirmDialogConfig({
    title: "Delete habit?",
    danger: true,
  });
  assert.equal(dangerIdle.confirmLabel, "Delete");
  assert.equal(dangerIdle.confirmVariant, "danger");
  assert.equal(dangerIdle.canDismiss, true);

  const dangerLoading = resolveConfirmDialogConfig({
    title: "Delete habit?",
    confirmLabel: "Yes, Delete",
    cancelLabel: "Keep",
    danger: true,
    loading: true,
  });
  assert.equal(dangerLoading.confirmLabel, "Yes, Delete");
  assert.equal(dangerLoading.cancelLabel, "Keep");
  assert.equal(dangerLoading.confirmVariant, "danger");
  assert.equal(dangerLoading.canDismiss, false);
  assert.equal(dangerLoading.isConfirmDisabled, true);
  assert.equal(dangerLoading.isCancelDisabled, true);
});

// ---------------------------------------------------------------------------
// 2. Browser Native confirm() / window.confirm() Elimination
// ---------------------------------------------------------------------------
test("Phase 8B — Zero window.confirm or browser confirm() calls remain in src/", () => {
  const srcRoot = path.resolve("src");
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
  }

  walk(srcRoot);

  const offenders = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    if (/(^|[^a-zA-Z0-9_])(window\.)?confirm\s*\(/m.test(content)) {
      offenders.push(path.relative(srcRoot, filePath));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Found forbidden native confirm() calls in: ${offenders.join(", ")}`
  );
});

// ---------------------------------------------------------------------------
// 3. ConfirmDialog & UI Primitives Accessibility and Token Contracts
// ---------------------------------------------------------------------------
test("Phase 8B — ConfirmDialog implements accessible alertdialog, focus lock, and safe Cancel order", () => {
  const src = fs.readFileSync(path.resolve("src/components/ui/confirm-dialog.tsx"), "utf8");

  assert.ok(src.includes('role="alertdialog"'), "Must use alertdialog role");
  assert.ok(src.includes('aria-modal="true"'), "Must mark alertdialog as modal");
  assert.ok(src.includes("aria-labelledby={titleId}"), "Must link title with aria-labelledby");
  assert.ok(src.includes("aria-describedby={resolved.description ? descId : undefined}"), "Must link description");
  assert.ok(src.includes("useAccessibleModal"), "Must use shared useAccessibleModal hook");
  assert.ok(src.includes("canDismissConfirmDialog(loading)"), "Must guard backdrop clicks during loading");
  assert.ok(src.includes("resolved.canDismiss ? onClose : () => {}"), "Must guard Escape during loading");

  // Cancel must precede Confirm in DOM order so auto-focus lands on safe Cancel action
  const cancelIdx = src.indexOf("{resolved.cancelLabel}");
  const confirmIdx = src.indexOf("{resolved.confirmLabel}");
  assert.ok(cancelIdx > -1 && confirmIdx > -1 && cancelIdx < confirmIdx, "Cancel button should appear before Confirm button in tab order");
});

test("Phase 8B — UI primitives follow Phase 8A --orbit-* semantic design tokens", () => {
  const primitiveFiles = [
    "src/components/ui/button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/surface-card.tsx",
    "src/components/ui/page-header.tsx",
    "src/components/ui/empty-state.tsx",
    "src/components/ui/form-field.tsx",
    "src/components/ui/confirm-dialog.tsx",
  ];

  for (const relPath of primitiveFiles) {
    const src = fs.readFileSync(path.resolve(relPath), "utf8");
    assert.ok(
      src.includes("orbit-"),
      `${relPath} must use semantic ORBIT design tokens (--orbit-* / *-orbit-*)`
    );
  }

  const buttonSrc = fs.readFileSync(path.resolve("src/components/ui/button.tsx"), "utf8");
  assert.ok(buttonSrc.includes("aria-busy={loading || undefined}"), "Button must expose aria-busy during loading");
  assert.ok(buttonSrc.includes("focus-visible:ring-2"), "Button must provide visible keyboard focus ring");
});

// ---------------------------------------------------------------------------
// 4. Inbox Modal & Nested Dialog Focus Management
// ---------------------------------------------------------------------------
test("Phase 8B — Inbox EditModal uses shared modal accessibility pattern and preserves fields", () => {
  const inboxSrc = fs.readFileSync(path.resolve("src/app/inbox/page.tsx"), "utf8");

  assert.ok(inboxSrc.includes("useAccessibleModal"), "EditInboxModal must use useAccessibleModal");
  assert.ok(inboxSrc.includes('role="dialog"'), "EditInboxModal must declare role=dialog");
  assert.ok(inboxSrc.includes('aria-modal="true"'), "EditInboxModal must declare aria-modal=true");
  assert.ok(inboxSrc.includes("ItemSchema.parse"), "EditInboxModal must preserve Zod ItemSchema validation");
  assert.ok(inboxSrc.includes("inbox-edit-title") && inboxSrc.includes("inbox-edit-link") && inboxSrc.includes("inbox-edit-notes"), "EditInboxModal must preserve Title, Link, Notes fields");
  assert.ok(inboxSrc.includes("<ConfirmDialog"), "Inbox page must use ConfirmDialog");
});

test("Phase 8B — LibraryCollectionModal pauses parent focus trap while nested ConfirmDialog is open", () => {
  const hookSrc = fs.readFileSync(path.resolve("src/lib/hooks/use-accessible-modal.ts"), "utf8");
  const modalSrc = fs.readFileSync(path.resolve("src/components/library/library-collection-modal.tsx"), "utf8");

  assert.ok(hookSrc.includes("paused?: boolean"), "useAccessibleModal must support paused option");
  assert.ok(hookSrc.includes("if (pausedRef.current) return;"), "useAccessibleModal must skip key handling when paused");
  assert.ok(modalSrc.includes("paused: showDeleteConfirm || isSubmitting"), "LibraryCollectionModal must pause parent modal keys while ConfirmDialog or delete is active");
});

// ---------------------------------------------------------------------------
// 5. Adoption Across Pages
// ---------------------------------------------------------------------------
test("Phase 8B — Shared ConfirmDialog and primitives are adopted in Inbox, Habits, Tasks, Library, and Settings", () => {
  const targets = [
    "src/app/inbox/page.tsx",
    "src/app/habits/page.tsx",
    "src/app/tasks/page.tsx",
    "src/app/library/page.tsx",
    "src/app/settings/page.tsx",
  ];

  for (const relPath of targets) {
    const src = fs.readFileSync(path.resolve(relPath), "utf8");
    assert.ok(src.includes("<ConfirmDialog"), `${relPath} must use <ConfirmDialog>`);
    assert.ok(src.includes("<PageHeader"), `${relPath} must adopt <PageHeader>`);
  }
});

