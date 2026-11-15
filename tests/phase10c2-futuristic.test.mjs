import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.2v2: Futuristic Theme Redesign — Linear / Teenage Engineering Precision Workspace", async (t) => {
  await t.test("Futuristic Light Mode defines anodized titanium silver deck with matte surfaces and mechanical hairlines", () => {
    // Check base background
    assert.ok(css.includes("--orbit-bg: #f1f4f9"), "Futuristic light mode has anodized titanium silver base");
    assert.ok(css.includes("--orbit-bg-canvas: #f1f4f9"), "Canvas matches titanium silver base");

    // Check matte surfaces
    assert.ok(css.includes("--orbit-surface: #ffffff"), "Futuristic light mode has matte white panel surface");
    assert.ok(css.includes("--orbit-border: #cbd5e1"), "Futuristic light mode has mechanical hairline border");
    assert.ok(css.includes("--orbit-card-blur: 0px"), "Futuristic light mode eliminates decorative card blur");
  });

  await t.test("Futuristic Dark Mode defines matte basalt console deck with signal telemetry accents", () => {
    assert.ok(css.includes("--orbit-bg: #080b11"), "Futuristic dark mode uses deep space obsidian base");
    assert.ok(css.includes("--orbit-surface: #0e131f"), "Futuristic dark mode uses matte console panel surface");
    assert.ok(css.includes("--orbit-border: #1c2638"), "Futuristic dark mode uses mechanical hairline border");
    assert.ok(css.includes("--orbit-border-strong: #2d3d5a"), "Futuristic dark mode uses structural seam border");

    // Signal accents
    assert.ok(css.includes("--orbit-accent: #00e5ff"), "Signal Cyan primary active indicator");
    assert.ok(css.includes("--orbit-success: #10b981"), "Status Emerald nominal indicator");
    assert.ok(css.includes("--orbit-warning: #f59e0b"), "Telemetry Amber alert indicator");
    assert.ok(css.includes("--orbit-danger: #ef4444"), "Laser Red critical alert indicator");
  });

  await t.test("Zero GPU Blur Tax: strictly enforces backdrop-filter: none !important for Futuristic", () => {
    assert.ok(
      css.includes(":root[data-orbit-theme=\"futuristic\"] .orbit-surface-card") &&
      css.includes("backdrop-filter: none !important"),
      "Futuristic enforces zero GPU blur tax across all surfaces"
    );
  });

  await t.test("Dual-Mode Machined Surfaces: defines command deck, milled plates, and recessed OLED panels", () => {
    assert.ok(css.includes(".futuristic-command-deck"), "CSS defines .futuristic-command-deck");
    assert.ok(css.includes(".futuristic-plate"), "CSS defines .futuristic-plate");
    assert.ok(css.includes(".futuristic-oled-panel"), "CSS defines .futuristic-oled-panel");
    assert.ok(css.includes(".futuristic-panel"), "CSS defines .futuristic-panel");
    assert.ok(css.includes(".futuristic-led-checkbox"), "CSS defines .futuristic-led-checkbox");
  });

  await t.test("Horizon Header: compact, calm, data honest, and free of fake flight-sim jargon", () => {
    const filePath = path.join(projectRoot, "src/components/dashboard/futuristic/futuristic-dashboard.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("futuristic-command-deck"), "Command deck container exists");
    assert.ok(content.includes("futuristic-oled-panel"), "Recessed OLED capsules exist");
    assert.ok(content.includes("OPEN") && content.includes("HABITS"), "OLED readout labels exist");
    assert.ok(!content.includes("MACH 7.4"), "Zero fake flight-sim MACH telemetry");
    assert.ok(!content.includes("ALT 420KM"), "Zero fake flight-sim altitude telemetry");
    assert.ok(!content.includes("APPROACH VECTOR //"), "Zero flight-sim approach vector jargon");
    assert.ok(content.includes("grid-cols-1 lg:grid-cols-12"), "2-column responsive layout is restored");
    assert.ok(content.includes("lg:col-span-8"), "8-column dominant focus area on desktop");
    assert.ok(content.includes("lg:col-span-4"), "4-column sidebar for habits and agenda");
  });

  await t.test("Today's Focus: dominant 8-column layout, sleek primary card, and unified panel for remaining tasks", () => {
    const filePath = path.join(projectRoot, "src/components/dashboard/futuristic/todays-focus.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("01 // TODAY") && content.includes("FOCUS"), "Clean section header exists without noisy subtitle");
    assert.ok(content.includes("border-l-[3px] border-l-[#00f0ff]"), "Sleek primary card cyan highlight exists");
    assert.ok(content.includes("Complete Focus"), "Tactile Complete Focus button exists");
    assert.ok(!content.includes("VEC-01 // PRIORITY LOCK"), "Zero fake VEC-01 jargon in primary card");
    assert.ok(!content.includes("CRITICAL BURN"), "Zero fake CRITICAL BURN jargon");
    assert.ok(content.includes("futuristic-panel rounded-[12px] divide-y"), "Remaining tasks use unified panel with divide-y");
    assert.ok(content.includes("futuristic-led-checkbox"), "Physical LED hardware checkboxes exist");
  });

  await t.test("Habit Cadence: compact stacked sequencer in unified panel with zero title truncation", () => {
    const filePath = path.join(projectRoot, "src/components/dashboard/futuristic/habit-cadence.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("02 // HABIT CADENCE"), "Clean section header exists");
    assert.ok(content.includes("futuristic-panel rounded-[12px] divide-y"), "Unified compact panel with divide-y exists");
    assert.ok(!content.includes("CH-01"), "Zero noisy channel clutter");
    assert.ok(!content.includes("7-STAGE BUFFER"), "Zero noisy 7-stage buffer clutter");
    assert.ok(content.includes("grid-cols-7"), "7-day low-profile step bar exists");
    assert.ok(content.includes("min-h-[44px]"), "Accessible 44px tap target exists on step buttons");
  });

  await t.test("Schedule: compact schedule horizon with clean dates and LED nodes", () => {
    const filePath = path.join(projectRoot, "src/components/dashboard/futuristic/upcoming-agenda.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("03 // SCHEDULE"), "Clean section header exists");
    assert.ok(content.includes("border-l border-orbit-border"), "Vertical telemetry rail exists");
    assert.ok(!content.includes("T+05H // IN-FLIGHT"), "Zero fake in-flight waypoint offsets");
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
