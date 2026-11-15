import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const pageTsxPath = path.join(projectRoot, "src/app/page.tsx");
const css = fs.readFileSync(globalsCssPath, "utf-8");
const pageSrc = fs.readFileSync(pageTsxPath, "utf-8");

test("Phase 10C.1v2: Archivist Theme Redesign — The Bodleian Rare Book Folio & Curatorial Card Catalog", async (t) => {
  await t.test("Archivist Light Mode defines authentic cotton rag paper background with laid lines and warm candlelit radiance", () => {
    assert.ok(css.includes("--orbit-bg: #f4eee1"), "Archivist light mode has aged cotton rag paper base");
    assert.ok(css.includes("--orbit-bg-canvas: #f4eee1"), "Canvas matches aged cotton rag paper base");

    // Check layered organic laid paper pattern & warm candlelit washes
    assert.ok(
      css.includes("radial-gradient(120% 90% at 50% 0%, #faf6ee 0%, #f4eee1 45%"),
      "Archivist light mode includes warm candlelit vignette falloff"
    );
    assert.ok(
      css.includes("repeating-linear-gradient(0deg, rgba(95, 75, 50, 0.03) 0px"),
      "Archivist light mode includes horizontal laid paper lines"
    );
    assert.ok(
      css.includes("paperNoise"),
      "Archivist light mode preserves authentic paper pulp noise"
    );
  });

  await t.test("Archivist Dark Mode defines roasted walnut and old leather background with candlelit amber washes", () => {
    assert.ok(css.includes("--orbit-bg: #110e0c"), "Archivist dark mode uses deep roasted walnut base");
    assert.ok(css.includes("--orbit-bg-canvas: #110e0c"), "Canvas matches roasted walnut base");

    assert.ok(
      css.includes("radial-gradient(120% 90% at 50% 0%, #1d1713 0%, #16120f 45%"),
      "Archivist dark mode includes candlelit amber falloff"
    );
    assert.ok(
      css.includes("rgba(197, 150, 75, 0.08)"),
      "Archivist dark mode includes warm candlelit amber radiance"
    );
    assert.ok(
      css.includes("paperNoiseDark"),
      "Archivist dark mode preserves dark paper pulp noise"
    );
  });

  await t.test("Zero GPU Blur Tax is strictly enforced across all Archivist surfaces and dialogs", () => {
    assert.ok(
      css.includes("--orbit-card-blur: 0px"),
      "Archivist enforces 0px decorative card blur"
    );
    assert.ok(
      css.includes(':root[data-orbit-theme="archivist"] .orbit-surface-card'),
      "Archivist scopes surface card overrides"
    );
    assert.ok(
      css.includes(':root[data-orbit-theme="archivist"] .archivist-folio-hero'),
      "Archivist scopes folio hero overrides"
    );
    assert.ok(
      css.includes(':root[data-orbit-theme="archivist"] .archivist-catalog-card'),
      "Archivist scopes catalog card overrides"
    );
    assert.ok(
      css.includes("backdrop-filter: none !important"),
      "Archivist forces backdrop-filter: none !important for zero blur tax"
    );
  });

  await t.test("Archivist defines bespoke bookbinding folio hero and vintage library catalog card classes", () => {
    assert.ok(
      css.includes(".archivist-folio-hero"),
      "globals.css defines .archivist-folio-hero class"
    );
    assert.ok(
      css.includes("#163024 0%, #1f4232 55%"),
      ".archivist-folio-hero defines Oxford Hunter Green & aged book cloth gradient in light mode"
    );
    assert.ok(
      css.includes("#1b1310 0%, #241a15 55%"),
      ".archivist-folio-hero defines gilded oxblood & hunter leather in dark mode"
    );
    assert.ok(
      css.includes(".archivist-catalog-card"),
      "globals.css defines .archivist-catalog-card class"
    );
    assert.ok(
      css.includes("#fdfaf3 0%, #f7f1e3 100%"),
      ".archivist-catalog-card defines cream archival card stock gradient"
    );
    assert.ok(
      css.includes("#1b1613 0%, #15110e 100%"),
      ".archivist-catalog-card defines dark vellum and mahogany folio in dark mode"
    );
  });

  await t.test("Dedicated Archivist Dashboard component suite exists and is integrated into page.tsx", () => {
    const archivistDir = path.join(projectRoot, "src/components/dashboard/archivist");
    assert.ok(fs.existsSync(path.join(archivistDir, "archivist-dashboard.tsx")), "archivist-dashboard.tsx exists");
    assert.ok(fs.existsSync(path.join(archivistDir, "lectionary-cadence.tsx")), "lectionary-cadence.tsx exists");
    assert.ok(fs.existsSync(path.join(archivistDir, "manuscript-focus.tsx")), "manuscript-focus.tsx exists");
    assert.ok(fs.existsSync(path.join(archivistDir, "annals-chronicle.tsx")), "annals-chronicle.tsx exists");
    assert.ok(fs.existsSync(path.join(archivistDir, "archival-math.ts")), "archival-math.ts exists");

    assert.ok(
      pageSrc.includes('import { ArchivistDashboard } from "@/components/dashboard/archivist/archivist-dashboard"'),
      "src/app/page.tsx imports ArchivistDashboard"
    );
    assert.ok(
      pageSrc.includes('if (mounted && themePersonality === "archivist")'),
      "src/app/page.tsx mounts ArchivistDashboard when themePersonality === 'archivist'"
    );
  });

  await t.test("Archival Math provides deterministic liturgical and codex computations", async () => {
    const math = await import("../src/components/dashboard/archivist/archival-math.ts");
    assert.equal(typeof math.getDayOfYear, "function");
    assert.equal(typeof math.toRomanNumeral, "function");
    assert.equal(typeof math.getCanonicalHour, "function");
    assert.equal(typeof math.numberToWord, "function");

    assert.equal(math.toRomanNumeral(1), "I");
    assert.equal(math.toRomanNumeral(4), "IV");
    assert.equal(math.toRomanNumeral(26), "XXVI");

    const canonical10 = math.getCanonicalHour("10:00");
    assert.ok(canonical10.secular.includes("Morning Reading"));

    const canonical14 = math.getCanonicalHour("14:00");
    assert.ok(canonical14.secular.includes("Afternoon Scriptorium"));

    const canonical19 = math.getCanonicalHour("19:00");
    assert.ok(canonical19.secular.includes("Evening Illumination") || canonical19.liturgical.includes("Vespers"));
  });

  await t.test("Preserves typography and distinct palette identity for Archivist", () => {
    assert.ok(
      css.includes("--orbit-font-display: var(--font-orbit-display-base), Georgia, \"Times New Roman\", serif"),
      "Archivist preserves editorial serif typography"
    );
    assert.ok(
      css.includes("--orbit-accent: #1b4332"),
      "Archivist light mode defines Oxford Botanical Green accent"
    );
    assert.ok(
      css.includes("--orbit-accent-secondary: #8c2d38"),
      "Archivist light mode defines Rubricated Oxblood Crimson secondary accent"
    );
    assert.ok(
      css.includes("--orbit-accent: #52b788"),
      "Archivist dark mode defines luminous botanical sage accent"
    );
    assert.ok(
      css.includes("--orbit-danger: #c94a58"),
      "Archivist dark mode defines crimson wax danger color"
    );
  });

  await t.test("Strict Scope: The other six theme personalities remain completely unchanged", () => {
    // 1. Futuristic
    assert.ok(
      css.includes("--orbit-radius-card: 0.375rem"),
      "Futuristic retains sharp card radius"
    );
    assert.ok(
      css.includes("rgba(0, 240, 255, 0.12)"),
      "Futuristic retains cyan cyber grid atmospheric pattern"
    );

    // 2. Aesthetic
    assert.ok(
      css.includes("--orbit-radius-card: 1.25rem"),
      "Aesthetic retains pillowy card radius"
    );
    assert.ok(
      css.includes("rgba(214, 158, 126, 0.08)") || css.includes("rgba(212, 93, 121, 0.08)"),
      "Aesthetic retains warm editorial wash"
    );

    // 3. Artistic
    assert.ok(
      css.includes("--orbit-accent: #1d4ed8") || css.includes("--orbit-accent: #d97706") || css.includes("--orbit-accent: #e11d48"),
      "Artistic retains pigment accent"
    );

    // 4. Minimalist
    assert.ok(
      css.includes("--orbit-radius-card: 0px") || css.includes("--orbit-radius-card: 0.125rem"),
      "Minimalist retains hairline Bauhaus card radius"
    );
    assert.ok(
      css.includes("--orbit-border: #dfdfd9") || css.includes("--orbit-border: #e5e5e5"),
      "Minimalist retains crisp monochrome border"
    );

    // 5. Naturalist
    assert.ok(
      css.includes("--orbit-radius-card: 1rem"),
      "Naturalist retains organic card radius"
    );
    assert.ok(
      css.includes("rgba(35, 92, 59, 0.05)"),
      "Naturalist retains forest canopy ambient pattern"
    );

    // 6. Midnight
    assert.ok(
      css.includes("--orbit-radius-card: 0.875rem"),
      "Midnight retains cosmic card radius"
    );
    assert.ok(
      css.includes("rgba(129, 140, 248, 0.16)"),
      "Midnight retains nebula radial atmospheric pattern"
    );
  });
});
