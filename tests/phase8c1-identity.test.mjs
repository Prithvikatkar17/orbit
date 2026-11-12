import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Color Identity & Token Mapping
// ---------------------------------------------------------------------------
test("Phase 8C.1 — globals.css replaces cool slate/indigo SaaS defaults with Quiet Desk & Paper Editorial tokens", () => {
  const css = readSrc("src/app/globals.css");

  assert.ok(css.includes("#f6f5f1"), "Light canvas should use warm paper #f6f5f1");
  assert.ok(css.includes("#2c5e4f"), "Light primary accent should use botanical pine #2c5e4f");
  assert.ok(css.includes("#161613"), "Dark canvas should use warm charcoal #161613");
  assert.ok(css.includes("#6bb39b"), "Dark primary accent should use soft sage #6bb39b");

  assert.ok(!css.includes("#4f46e5"), "Legacy indigo accent #4f46e5 should be removed");
  assert.ok(!css.includes("#020617"), "Legacy cool dark slate #020617 should be removed");

  assert.ok(
    css.includes("--color-orbit-ring: var(--orbit-focus-ring)"),
    "Tailwind @theme inline must map --color-orbit-ring to --orbit-focus-ring"
  );
  assert.ok(
    css.includes("--color-orbit-danger-fg: var(--orbit-danger-fg)"),
    "Tailwind @theme inline must map --color-orbit-danger-fg"
  );
});

// ---------------------------------------------------------------------------
// 2. Editorial Typography
// ---------------------------------------------------------------------------
test("Phase 8C.1 — RootLayout configures Newsreader editorial display font via next/font/google", () => {
  const layout = readSrc("src/app/layout.tsx");
  const css = readSrc("src/app/globals.css");

  assert.ok(layout.includes("Newsreader"), "RootLayout should import Newsreader display font");
  assert.ok(
    layout.includes('variable: "--font-orbit-display-base"'),
    "Newsreader should bind to --font-orbit-display-base"
  );
  assert.ok(
    css.includes('Georgia, "Times New Roman", serif'),
    "--orbit-font-display should include editorial serif fallbacks"
  );
});

// ---------------------------------------------------------------------------
// 3. Surface System & Shared Primitives
// ---------------------------------------------------------------------------
test("Phase 8C.1 — SurfaceCard provides outlined, elevated, tonal, and flat variants", () => {
  const surfaceCard = readSrc("src/components/ui/surface-card.tsx");
  const index = readSrc("src/components/ui/index.ts");

  for (const variant of ['"outlined"', '"elevated"', '"tonal"', '"flat"']) {
    assert.ok(
      surfaceCard.includes(variant),
      `SurfaceCard must define ${variant} surface variant`
    );
  }
  assert.ok(
    surfaceCard.includes("React.forwardRef"),
    "SurfaceCard must preserve forwardRef support"
  );
  assert.ok(
    index.includes("SurfaceCardVariant"),
    "UI barrel should export SurfaceCardVariant type"
  );
});

test("Phase 8C.1 — Shared UI primitives and Sidebar avoid legacy color literals and fix focus ring usage", () => {
  const sharedFiles = [
    "src/components/ui/button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/surface-card.tsx",
    "src/components/ui/page-header.tsx",
    "src/components/ui/empty-state.tsx",
    "src/components/ui/form-field.tsx",
    "src/components/ui/confirm-dialog.tsx",
    "src/components/sidebar.tsx",
  ];

  const legacyPattern = /\b(?:bg|text|border|ring)-(?:slate|indigo|rose|amber|emerald)-\d{2,3}\b/;
  for (const relPath of sharedFiles) {
    const content = readSrc(relPath);
    assert.equal(
      legacyPattern.test(content),
      false,
      `${relPath} should not contain hardcoded slate/indigo/rose/amber/emerald classes`
    );
  }

  const button = readSrc("src/components/ui/button.tsx");
  assert.ok(
    button.includes("focus-visible:ring-orbit-ring"),
    "Button should use mapped focus-visible:ring-orbit-ring token"
  );
  assert.ok(
    button.includes("text-orbit-danger-fg"),
    "Danger button should use --orbit-danger-fg token for light/dark AA contrast"
  );
});

