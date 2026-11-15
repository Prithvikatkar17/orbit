import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.2: Futuristic Theme Redesign — Holographic Command Deck", async (t) => {
  await t.test("Futuristic Light Mode defines silver-white holographic deck with photonic illumination and coordinate grid", () => {
    // Check base background
    assert.ok(css.includes("--orbit-bg: #f3f6fa"), "Futuristic light mode has silver-white base");
    assert.ok(css.includes("--orbit-bg-canvas: #f3f6fa"), "Canvas matches silver-white base");

    // Check layered photonic pattern: cyan/violet lighting + technical coordinate grid
    assert.ok(
      css.includes("radial-gradient(110% 70% at 50% 0%, rgba(2, 132, 199, 0.08)"),
      "Futuristic light mode includes photonic cyan ambient beam"
    );
    assert.ok(
      css.includes("radial-gradient(85% 55% at 85% 12%, rgba(124, 58, 237, 0.05)"),
      "Futuristic light mode includes violet tactical reflection"
    );
    assert.ok(
      css.includes("linear-gradient(180deg, #f8fafc 0%, #edf3f9 100%)"),
      "Futuristic light mode includes silver-white deck gradient"
    );
    assert.ok(
      css.includes("radial-gradient(rgba(2, 132, 199, 0.12) 1px, transparent 1px)"),
      "Futuristic light mode includes coordinate point vertices"
    );
  });

  await t.test("Futuristic Dark Mode defines deep obsidian command deck with cyan/violet ambient lighting and tactical telemetry grid", () => {
    assert.ok(css.includes("--orbit-bg: #07090e"), "Futuristic dark mode uses deep obsidian base");

    // Dark ambient lighting and telemetry grid
    assert.ok(
      css.includes("radial-gradient(100% 70% at 20% 0%, rgba(0, 240, 255, 0.09)"),
      "Futuristic dark mode includes cyan tactical spotlight"
    );
    assert.ok(
      css.includes("radial-gradient(90% 60% at 85% 15%, rgba(168, 85, 247, 0.08)"),
      "Futuristic dark mode includes violet telemetry emitter"
    );
    assert.ok(
      css.includes("radial-gradient(130% 90% at 50% 20%, rgba(11, 17, 32, 0.65)"),
      "Futuristic dark mode includes obsidian spatial falloff"
    );
    assert.ok(
      css.includes("radial-gradient(rgba(0, 240, 255, 0.12) 1px, transparent 1px)"),
      "Futuristic dark mode includes telemetry grid coordinate points"
    );
  });

  await t.test("Translucent holographic glass surfaces define 16px blur, cyan/violet specular edge reflections, and floating shadows", () => {
    // Light mode surfaces
    assert.ok(
      css.includes("--orbit-surface: rgba(255, 255, 255, 0.78)"),
      "Futuristic light mode defines translucent silver glass (78% opacity)"
    );
    assert.ok(
      css.includes("inset -1px -1px 0 0 rgba(124, 58, 237, 0.14)"),
      "Futuristic light mode defines violet edge reflection"
    );

    // Dark mode surfaces
    assert.ok(
      css.includes("--orbit-surface: rgba(10, 16, 28, 0.72)"),
      "Futuristic dark mode defines translucent obsidian holographic glass (72% opacity)"
    );
    assert.ok(
      css.includes("inset 0 1px 0 0 rgba(0, 240, 255, 0.65)"),
      "Futuristic dark mode card defines cyan specular top rim"
    );
    assert.ok(
      css.includes("inset -1px -1px 0 0 rgba(168, 85, 247, 0.28)"),
      "Futuristic dark mode card defines violet edge reflection"
    );
    assert.ok(
      css.includes("--orbit-card-blur: 16px"),
      "Futuristic defines 16px holographic blur diffusion"
    );
  });

  await t.test("Holographic command deck modal dialog and backdrop define telemetry grid and frosted diffusion", () => {
    assert.ok(
      css.includes(":root[data-orbit-theme=\"futuristic\"] .orbit-modal-dialog"),
      "Defines dedicated holographic dialog for Futuristic"
    );
    assert.ok(
      css.includes(".dark:root[data-orbit-theme=\"futuristic\"] .orbit-modal-dialog"),
      "Defines dark holographic dialog with cyan rim and violet reflection"
    );
    assert.ok(
      css.includes(".dark:root[data-orbit-theme=\"futuristic\"] .orbit-modal-backdrop"),
      "Defines dark tactical backdrop with coordinate grid"
    );
  });

  await t.test("Form controls define precision technical terminals with sharp radii and telemetry focus glow", () => {
    assert.ok(
      css.includes(":root[data-orbit-theme=\"futuristic\"] input:not([type=\"checkbox\"])"),
      "Defines dedicated Futuristic form control styles"
    );
    assert.ok(
      css.includes(".dark:root[data-orbit-theme=\"futuristic\"] input:not([type=\"checkbox\"])"),
      "Defines dark technical data terminal styling"
    );
  });

  await t.test("Navigation items feature holographic shelf gradient and glowing cyan beacon", () => {
    assert.ok(
      css.includes("[data-orbit-theme=\"futuristic\"] [data-orbit-nav-item][data-active=\"true\"]"),
      "Defines holographic active nav shelf"
    );
    assert.ok(
      css.includes("linear-gradient(90deg, rgba(0, 240, 255, 0.14)"),
      "Defines dark mode holographic shelf gradient"
    );
  });

  await t.test("Strict Scope: Archivist and the other five theme personalities remain completely unchanged", () => {
    // 1. Archivist
    assert.ok(
      css.includes("--orbit-surface: rgba(254, 252, 247, 0.74)"),
      "Archivist retains ivory vellum surface"
    );
    assert.ok(
      css.includes("paperNoise"),
      "Archivist retains paper pulp noise"
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
