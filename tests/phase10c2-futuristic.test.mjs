import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.2: Futuristic Theme Redesign — The Monolithic Avionics Console", async (t) => {
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

  await t.test("Minimalist Industrial Dashboard components are present and properly structured", () => {
    const dir = path.join(projectRoot, "src/components/dashboard/futuristic");
    assert.ok(fs.existsSync(path.join(dir, "futuristic-dashboard.tsx")), "Futuristic dashboard orchestrator exists");
    assert.ok(fs.existsSync(path.join(dir, "todays-focus.tsx")), "Today's focus component exists");
    assert.ok(fs.existsSync(path.join(dir, "habit-cadence.tsx")), "Habit cadence component exists");
    assert.ok(fs.existsSync(path.join(dir, "upcoming-agenda.tsx")), "Upcoming agenda component exists");
  });

  await t.test("Dashboard integration cleanly scopes Futuristic without affecting other themes", () => {
    const pagePath = path.join(projectRoot, "src/app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(pageContent.includes("FuturisticDashboard"), "HomePage renders FuturisticDashboard when theme is futuristic");
    assert.ok(pageContent.includes("themePersonality === \"futuristic\""), "HomePage conditionally scopes Futuristic dashboard");
  });

  await t.test("Tactile Matte Hardware: defines static SVG noise overlay and multi-layered inset depth", () => {
    // Zero GPU Tax static grain
    assert.ok(css.includes("titaniumNoiseLight"), "Light mode defines static titanium noise overlay");
    assert.ok(css.includes("titaniumNoiseDark"), "Dark mode defines static titanium noise overlay");

    // Machined depth with inset shadows
    assert.ok(css.includes(".futuristic-panel"), "CSS defines .futuristic-panel for machined faceplates");
    assert.ok(css.includes(".futuristic-row"), "CSS defines .futuristic-row for recessed task rows");
    assert.ok(css.includes("box-shadow:"), "CSS defines multi-layered box-shadows");

    // Physical Hardware LED switches
    assert.ok(css.includes(".futuristic-led-checkbox"), "CSS defines .futuristic-led-checkbox");
    assert.ok(css.includes(".futuristic-spark-toggle"), "CSS defines .futuristic-spark-toggle");
    assert.ok(css.includes("#00f0ff"), "CSS defines high-contrast stark cyan for active LED switches");

    // Micro-interactions: strictly transform and opacity, 150ms bezier, no width/height/padding animations
    assert.ok(css.includes("150ms cubic-bezier(0.4, 0, 0.2, 1)"), "Micro-interactions use tight 150ms cubic-bezier transitions");
    assert.ok(!css.includes("transition: width"), "No width transition to prevent layout reflows");
    assert.ok(!css.includes("transition: height"), "No height transition to prevent layout reflows");
    assert.ok(!css.includes("transition: padding"), "No padding transition to prevent layout reflows");
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
