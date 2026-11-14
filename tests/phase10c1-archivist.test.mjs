import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.1: Archivist Theme Redesign — Paper Workspace & Frosted Glass", async (t) => {
  await t.test("Archivist Light Mode defines authentic paper background with laid lines and fractal pulp fibers", () => {
    // Check base background
    assert.ok(css.includes("--orbit-bg: #f6f5f1"), "Archivist light mode has warm ivory paper base");
    assert.ok(css.includes("--orbit-bg-canvas: #f6f5f1"), "Canvas matches ivory paper base");

    // Check layered organic paper pattern: desk lighting + laid chain lines + 8px horizontal laid lines + SVG fractal noise
    assert.ok(
      css.includes("radial-gradient(120% 90% at 50% 0%, #faf8f2 0%, #f4efe4 45%"),
      "Archivist light mode includes ambient desk lighting falloff"
    );
    assert.ok(
      css.includes("transparent 95px, rgba(160, 140, 110, 0.04) 95px"),
      "Archivist light mode includes 96px laid chain lines"
    );
    assert.ok(
      css.includes("repeating-linear-gradient(0deg, rgba(165, 145, 115, 0.035) 0px"),
      "Archivist light mode includes single-direction horizontal laid lines"
    );
    assert.ok(
      css.includes("paperNoise"),
      "Archivist light mode includes fractal paper pulp noise"
    );
  });

  await t.test("Archivist Light Mode defines translucent frosted-glass card surfaces, edge light, and solid editorial sidebar", () => {
    // Frosted card surface
    assert.ok(
      css.includes("--orbit-surface: rgba(254, 252, 247, 0.74)"),
      "Archivist light mode defines translucent frosted card surface (74% opacity for true glass)"
    );
    assert.ok(
      css.includes("--orbit-surface-elevated: rgba(255, 254, 250, 0.88)"),
      "Archivist light mode defines elevated translucent surface"
    );
    assert.ok(
      css.includes("--orbit-card-blur: 16px"),
      "Archivist light mode sets 16px diffusion card blur"
    );

    // Illuminated glass top rim & layered shadows
    assert.ok(
      css.includes("inset 0 1px 0 0 rgba(255, 255, 255, 0.9)"),
      "Archivist card shadow defines physical illuminated top glass rim"
    );

    // Solid editorial sidebar
    assert.ok(
      css.includes("--orbit-surface-secondary: #eee8db"),
      "Archivist light mode maintains solid editorial surface for sidebar"
    );
  });

  await t.test("Archivist Dark Mode defines charcoal bound paper background and dark frosted glass", () => {
    assert.ok(css.includes("--orbit-bg: #161613"), "Archivist dark mode uses warm charcoal base");

    // Dark paper pattern
    assert.ok(
      css.includes("radial-gradient(120% 90% at 50% 0%, #23211c 0%, #1a1915 45%"),
      "Archivist dark mode includes dark desk lighting falloff"
    );
    assert.ok(
      css.includes("repeating-linear-gradient(0deg, rgba(210, 195, 165, 0.025) 0px"),
      "Archivist dark mode includes single-direction laid lines"
    );
    assert.ok(
      css.includes("paperNoiseDark"),
      "Archivist dark mode includes dark fractal pulp noise"
    );

    // Dark frosted surfaces
    assert.ok(
      css.includes("--orbit-surface: rgba(28, 26, 22, 0.72)"),
      "Archivist dark mode defines translucent charcoal card surface"
    );
    assert.ok(
      css.includes("--orbit-surface-secondary: #181713"),
      "Archivist dark mode maintains solid charcoal surface for sidebar"
    );
    assert.ok(
      css.includes("inset 0 1px 0 0 rgba(255, 255, 255, 0.16)"),
      "Archivist dark shadow includes illuminated glass rim"
    );
  });

  await t.test("Surface cards and dialogs adopt backdrop-filter and stationery form styles", () => {
    assert.ok(
      css.includes("backdrop-filter: blur(var(--orbit-card-blur, 0px))"),
      ".orbit-surface-card applies backdrop-filter blur dynamically"
    );
    assert.ok(
      css.includes("backdrop-filter: blur(20px) saturate(1.1)"),
      ".orbit-modal-dialog applies 20px frosted backdrop blur"
    );
    assert.ok(
      css.includes("data-orbit-theme=\"archivist\"] input:not([type=\"checkbox\"])"),
      "Archivist defines custom stationery input fills"
    );
  });

  await t.test("Preserves typography and botanical accent identity for Archivist", () => {
    assert.ok(
      css.includes("--orbit-font-display: var(--font-orbit-display-base), Georgia, \"Times New Roman\", serif"),
      "Archivist preserves editorial serif typography"
    );
    assert.ok(
      css.includes("--orbit-accent: #2c5e4f"),
      "Archivist light mode preserves botanical pine accent"
    );
    assert.ok(
      css.includes("--orbit-accent: #6bb39b"),
      "Archivist dark mode preserves sage botanical accent"
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
      css.includes("rgba(212, 93, 121, 0.08)"),
      "Aesthetic retains soft pastel atmospheric mesh"
    );

    // 3. Artistic
    assert.ok(
      css.includes("--orbit-accent: #d97706"),
      "Artistic retains amber pigment accent"
    );

    // 4. Minimalist
    assert.ok(
      css.includes("--orbit-radius-card: 0.125rem"),
      "Minimalist retains hairline Bauhaus card radius"
    );
    assert.ok(
      css.includes("--orbit-border: #e5e5e5"),
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
