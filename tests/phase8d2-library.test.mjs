import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

const LIBRARY_FILES = [
  "src/app/library/page.tsx",
  "src/components/library/library-card.tsx",
  "src/components/library/library-row.tsx",
  "src/components/library/library-detail-modal.tsx",
  "src/components/library/library-entry-modal.tsx",
  "src/components/library/library-collection-modal.tsx",
  "src/components/library/markdown-content.tsx",
];

// ---------------------------------------------------------------------------
// 1. Quiet Desk & Paper Editorial Token & Legacy Class Removal
// ---------------------------------------------------------------------------
test("Phase 8D.2 — Library files avoid legacy slate/indigo/rose styling and use orbit-* tokens", () => {
  for (const file of LIBRARY_FILES) {
    const src = readSrc(file);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-slate-\d+/, `${file} should not use legacy slate classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-indigo-\d+/, `${file} should not use legacy indigo classes`);
    assert.doesNotMatch(src, /\b(?:bg|text|border)-rose-\d+/, `${file} should not use legacy rose classes`);
    assert.match(src, /orbit-/, `${file} should use Quiet Desk orbit-* semantic tokens`);
  }
});

// ---------------------------------------------------------------------------
// 2. Shared UI Primitives & Editorial Typography
// ---------------------------------------------------------------------------
test("Phase 8D.2 — Library adopts shared UI primitives and Newsreader/Geist Mono typography", () => {
  const page = readSrc("src/app/library/page.tsx");
  const card = readSrc("src/components/library/library-card.tsx");
  const row = readSrc("src/components/library/library-row.tsx");
  const detail = readSrc("src/components/library/library-detail-modal.tsx");
  const entryModal = readSrc("src/components/library/library-entry-modal.tsx");
  const colModal = readSrc("src/components/library/library-collection-modal.tsx");
  const md = readSrc("src/components/library/markdown-content.tsx");

  assert.match(page, /PageHeader/);
  assert.match(page, /SurfaceCard/);
  assert.match(page, /EmptyState/);
  assert.match(page, /Badge/);
  assert.match(page, /Button/);
  assert.match(page, /ConfirmDialog/);
  assert.match(page, /font-display/);

  assert.match(card, /SurfaceCard/);
  assert.match(card, /font-display/);
  assert.match(card, /font-mono/);

  assert.match(row, /SurfaceCard/);
  assert.match(row, /font-display/);
  assert.match(row, /font-mono/);

  assert.match(detail, /Button/);
  assert.match(detail, /font-display/);
  assert.match(detail, /font-mono/);

  assert.match(entryModal, /Button/);
  assert.match(entryModal, /font-display/);
  assert.match(colModal, /Button/);
  assert.match(colModal, /ConfirmDialog/);
  assert.match(colModal, /font-display/);
  assert.match(md, /font-display/);
});

// ---------------------------------------------------------------------------
// 3. Library UX, View Persistence & Accessibility Contracts
// ---------------------------------------------------------------------------
test("Phase 8D.2 — Library preserves viewMode persistence, curated collections, and accessible modals", () => {
  const page = readSrc("src/app/library/page.tsx");
  const detail = readSrc("src/components/library/library-detail-modal.tsx");
  const entryModal = readSrc("src/components/library/library-entry-modal.tsx");
  const colModal = readSrc("src/components/library/library-collection-modal.tsx");

  assert.match(page, /orbit-library-view-mode/);
  assert.match(page, /LIBRARY_CATEGORY_TABS/);
  assert.match(page, /selectedCollection/);
  assert.match(page, /Edit Collection/);

  for (const dialogSrc of [detail, entryModal, colModal]) {
    assert.match(dialogSrc, /role="dialog"/);
    assert.match(dialogSrc, /aria-modal="true"/);
    assert.match(dialogSrc, /max-h-\[90dvh\]/);
    assert.match(dialogSrc, /aria-label="Close modal"/);
  }
});

