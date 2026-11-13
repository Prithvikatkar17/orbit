import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const SETTINGS_FILE = "src/app/settings/page.tsx";

// ---------------------------------------------------------------------------
// 1. Quiet Desk & Paper Editorial Token & Legacy Class Removal
// ---------------------------------------------------------------------------
test("Phase 8F.1 — Settings page avoids legacy slate/indigo/violet/emerald/rose styling and uses orbit-* tokens", () => {
  const src = readSrc(SETTINGS_FILE);
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-slate-\d+/, "Settings should not use legacy slate classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-indigo-\d+/, "Settings should not use legacy indigo classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-violet-\d+/, "Settings should not use legacy violet classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-emerald-\d+/, "Settings should not use legacy emerald classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-rose-\d+/, "Settings should not use legacy rose classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-purple-\d+/, "Settings should not use legacy purple classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-cyan-\d+/, "Settings should not use legacy cyan classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-teal-\d+/, "Settings should not use legacy teal classes");
  assert.doesNotMatch(src, /\b(?:bg|text|border|ring)-blue-\d+/, "Settings should not use legacy blue classes");

  assert.match(src, /orbit-accent/, "Settings should use Quiet Desk orbit-accent token");
  assert.match(src, /orbit-surface/, "Settings should use Quiet Desk orbit-surface token");
  assert.match(src, /orbit-border/, "Settings should use Quiet Desk orbit-border token");
  assert.match(src, /orbit-danger/, "Settings should use Quiet Desk orbit-danger token");
});

// ---------------------------------------------------------------------------
// 2. Shared UI Primitives & Editorial Typography
// ---------------------------------------------------------------------------
test("Phase 8F.1 — Settings adopts PageHeader, SurfaceCard, Button, Badge, and Newsreader display typography", () => {
  const src = readSrc(SETTINGS_FILE);

  assert.match(src, /PageHeader/);
  assert.match(src, /SurfaceCard/);
  assert.match(src, /Button/);
  assert.match(src, /Badge/);
  assert.match(src, /ConfirmDialog/);

  assert.match(src, /font-display/);
  assert.match(src, /font-mono/);
});

// ---------------------------------------------------------------------------
// 3. Functional Preservation & Storage Contracts
// ---------------------------------------------------------------------------
test("Phase 8F.1 — Settings preserves theme selection, calendar preferences, backup/restore, and reset logic", () => {
  const src = readSrc(SETTINGS_FILE);

  assert.match(src, /useTheme/);
  assert.match(src, /downloadBackupZip/);
  assert.match(src, /downloadBackupFile/);
  assert.match(src, /restoreBackup/);
  assert.match(src, /fetchDatabaseStorageCounts/);
  assert.match(src, /handleResetDatabase/);
  assert.match(src, /requestNotificationPermission/);
  assert.match(src, /user_settings/);
});

