import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.4: Artistic Theme Redesign — The Chromatic Watercolor & Gouache Atelier", async (t) => {
  await t.test("Artistic Light Mode defines Cold-Pressed Watercolor Paper and Multi-Stop Gradients", () => {
    // Canvas & Surface
    assert.ok(css.includes("--orbit-bg: #fcf9f4"), "Artistic light mode has cold-pressed watercolor paper base");
    assert.ok(css.includes("--orbit-surface: #ffffff"), "Artistic light mode uses warm ivory watercolor board");

    // Primary Pigments
    assert.ok(css.includes("--orbit-accent: #e11d48"), "Rose Vermilion primary pigment accent");
    assert.ok(css.includes("--orbit-accent-secondary: #4338ca") || css.includes("--orbit-accent-secondary: #4f46e5"), "Ultramarine secondary accent");
    assert.ok(css.includes("--orbit-warning: #f59e0b"), "Golden Amber tertiary pigment accent");

    // Geometry, Chromatic Shadows & Zero GPU Blur
    assert.ok(css.includes("--orbit-radius-card: 1.5rem"), "Organic 1.5rem (24px) card radius");
    assert.ok(css.includes("rgba(120, 70, 140, 0.08)"), "Multi-toned chromatic ambient shadow");
    assert.ok(
      css.includes(':root[data-orbit-theme="artistic"]') && css.includes("--orbit-card-blur: 0px"),
      "ZERO backdrop-filter blur tax for high performance"
    );
  });

  await t.test("Artistic Dark Mode defines Deep Indigo-Plum Oil Canvas with Luminous Glazes", () => {
    assert.ok(css.includes("--orbit-bg: #110f18"), "Artistic dark mode uses deep indigo-plum oil canvas base");
    assert.ok(css.includes("--orbit-surface: #1b1726"), "Artistic dark mode uses velvety plum-slate surface");
    assert.ok(css.includes("--orbit-accent: #fb7185"), "Sunset Rose Coral dark accent");
    assert.ok(css.includes("--orbit-accent-secondary: #818cf8"), "Luminous Iris dark secondary accent");
  });

  await t.test("Painterly Atelier components are present and properly structured", () => {
    const dir = path.join(projectRoot, "src/components/dashboard/artistic");
    assert.ok(fs.existsSync(path.join(dir, "artistic-dashboard.tsx")), "Artistic dashboard orchestrator exists");
    assert.ok(fs.existsSync(path.join(dir, "studio-pinboard.tsx")), "Studio pinboard component exists");
    assert.ok(fs.existsSync(path.join(dir, "bauhaus-cadence.tsx")), "Bauhaus cadence matrix component exists");
    assert.ok(fs.existsSync(path.join(dir, "atelier-schedule.tsx")), "Atelier schedule component exists");
  });

  await t.test("ArtisticDashboard implements Chromatic Hero Banner with Matisse Cutouts & Brushstroke Flourish", () => {
    const dashPath = path.join(projectRoot, "src/components/dashboard/artistic/artistic-dashboard.tsx");
    const dashCode = fs.readFileSync(dashPath, "utf-8");

    assert.ok(dashCode.includes("brushstroke-artistic"), "Hand-drawn brushstroke flourish gradient present");
    assert.ok(dashCode.includes("rounded-[28px]"), "Hero banner features generous 28px radius");
    assert.ok(dashCode.includes("New Canvas"), "Pill button trigger present");
    assert.ok(!dashCode.includes("//"), "No terminal slashes in banner");
  });

  await t.test("StudioPinboard implements 2-column Gallery Wall with Chromatic Wash Bands", () => {
    const pinboardPath = path.join(projectRoot, "src/components/dashboard/artistic/studio-pinboard.tsx");
    const pinboardCode = fs.readFileSync(pinboardPath, "utf-8");

    assert.ok(pinboardCode.includes("grid-cols-1 md:grid-cols-2"), "Pinboard arranges tasks in 2-column gallery wall");
    assert.ok(pinboardCode.includes("Works on the Easel"), "Expressive section title present");
    assert.ok(pinboardCode.includes("rounded-[22px]"), "Pantone art cards feature 22px radius");
    assert.ok(!pinboardCode.includes("01 //"), "No terminal headers");
  });

  await t.test("BauhausCadence implements Daily Color Rituals with 7-Day Droplets", () => {
    const cadencePath = path.join(projectRoot, "src/components/dashboard/artistic/bauhaus-cadence.tsx");
    const cadenceCode = fs.readFileSync(cadencePath, "utf-8");

    assert.ok(cadenceCode.includes("Daily Color Rituals"), "Section title present");
    assert.ok(cadenceCode.includes("rounded-full"), "Droplets rendered as circular swatches");
    assert.ok(cadenceCode.includes("ROW_GRADIENTS"), "Multi-hue watercolor gradient spectra defined");
    assert.ok(!cadenceCode.includes("02 //"), "No terminal headers");
  });

  await t.test("AtelierSchedule implements Studio Hours & Critique with Pigment Ribbons", () => {
    const schedulePath = path.join(projectRoot, "src/components/dashboard/artistic/atelier-schedule.tsx");
    const scheduleCode = fs.readFileSync(schedulePath, "utf-8");

    assert.ok(scheduleCode.includes("Studio Hours"), "Schedule section header present");
    assert.ok(scheduleCode.includes("rounded-full bg-gradient-to-b"), "Vertical blended pigment ribbon present");
    assert.ok(!scheduleCode.includes("03 //"), "No terminal headers");
  });

  await t.test("Dashboard integration cleanly scopes Artistic in page.tsx without altering other themes", () => {
    const pagePath = path.join(projectRoot, "src/app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(pageContent.includes("ArtisticDashboard"), "HomePage imports and renders ArtisticDashboard");
    assert.ok(pageContent.includes('themePersonality === "artistic"'), "HomePage conditionally scopes Artistic dashboard");
    assert.ok(pageContent.includes('themePersonality === "aesthetic"'), "Aesthetic remains cleanly scoped");
    assert.ok(pageContent.includes('themePersonality === "futuristic"'), "Futuristic remains cleanly scoped");
  });

  await t.test("Strict Scope: Archivist, Futuristic, and Aesthetic remain completely unharmed", () => {
    // 1. Archivist
    assert.ok(css.includes("--orbit-surface: rgba(254, 252, 247, 0.74)"), "Archivist retains vellum surface");
    assert.ok(css.includes("paperNoise"), "Archivist retains paper pulp noise");

    // 2. Futuristic
    assert.ok(css.includes("--orbit-bg: #080b11"), "Futuristic retains deep space obsidian base");
    assert.ok(css.includes("titaniumNoiseDark"), "Futuristic retains static titanium micro-grain");

    // 3. Aesthetic
    assert.ok(css.includes("--orbit-bg: #faf6f0"), "Aesthetic retains Alabaster Linen base");
    assert.ok(css.includes("--orbit-accent: #c86d51"), "Aesthetic retains Baked Terracotta accent");
  });
});
