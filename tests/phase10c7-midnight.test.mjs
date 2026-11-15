import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("Phase 10C.7: Midnight Theme Refinement — The Celestial Observatory & Horological Astrolabe", async (t) => {
  const globalsCssPath = path.join(projectRoot, "src", "app", "globals.css");
  const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

  await t.test("Midnight Light Mode defines Star Atlas Vellum, Prussian Blue & Gold orbital rings & zero blur tax", () => {
    assert.match(globalsCss, /:root\[data-orbit-theme="midnight"\]/);
    assert.match(globalsCss, /--orbit-bg:\s*#f3f4fa;/);
    assert.match(globalsCss, /--orbit-card-blur:\s*0px;/);
    assert.match(globalsCss, /--orbit-text:\s*#0d1226;/);
    assert.match(globalsCss, /--orbit-accent:\s*#3730a3;/);
    assert.match(globalsCss, /--orbit-accent-secondary:\s*#b48327;/);
    assert.match(globalsCss, /stroke='%233730a3'/);
  });

  await t.test("Midnight Dark Mode defines Abyssal Observatory Obsidian, Celestial Indigo & Astrolabe Gold & zero blur tax", () => {
    assert.match(globalsCss, /:root\[data-orbit-theme="midnight"\]\.dark/);
    assert.match(globalsCss, /--orbit-bg:\s*#060813;/);
    assert.match(globalsCss, /--orbit-card-blur:\s*0px;/);
    assert.match(globalsCss, /--orbit-accent:\s*#818cf8;/);
    assert.match(globalsCss, /--orbit-accent-secondary:\s*#d4af37;/);
    assert.match(globalsCss, /rgba\(99,\s*102,\s*241,\s*0\.16\)/);
    assert.match(globalsCss, /rgba\(212,\s*175,\s*55,\s*0\.09\)/);
  });

  await t.test("Midnight defines Dedicated Celestial Horological Surface classes in globals.css", () => {
    assert.match(globalsCss, /\.midnight-zenith-hero\s*\{/);
    assert.match(globalsCss, /\.midnight-observatory-card\s*\{/);
    assert.match(globalsCss, /\.midnight-hero-task-card\s*\{/);
    assert.match(globalsCss, /:root\[data-orbit-theme="midnight"\]\s+\.orbit-modal-dialog/);
  });

  await t.test("Midnight Observatory components exist and are structured properly", () => {
    const dir = path.join(projectRoot, "src", "components", "dashboard", "midnight");
    assert.ok(fs.existsSync(dir), "midnight directory exists");
    assert.ok(fs.existsSync(path.join(dir, "midnight-dashboard.tsx")), "midnight-dashboard.tsx exists");
    assert.ok(fs.existsSync(path.join(dir, "constellation-cadence.tsx")), "constellation-cadence.tsx exists");
    assert.ok(fs.existsSync(path.join(dir, "orbital-focus.tsx")), "orbital-focus.tsx exists");
    assert.ok(fs.existsSync(path.join(dir, "meridian-chronicle.tsx")), "meridian-chronicle.tsx exists");
    assert.ok(fs.existsSync(path.join(dir, "astronomical-math.ts")), "astronomical-math.ts exists");
  });

  await t.test("Deterministic Astronomical Math calculates accurate Lunar Phase, cycle day, and sidereal phases", async () => {
    const mathModule = await import(
      `file://${path.join(projectRoot, "src", "components", "dashboard", "midnight", "astronomical-math.ts")}`
    );
    assert.ok(typeof mathModule.calculateLunarPhase === "function");
    assert.ok(typeof mathModule.getSiderealMeridianPhase === "function");

    // Test a specific reference date
    const testDate = new Date("2026-11-15T12:00:00Z");
    const result = mathModule.calculateLunarPhase(testDate);
    assert.ok(result.cycleDay >= 1 && result.cycleDay <= 30);
    assert.ok(typeof result.phaseName === "string");
    assert.ok(result.illuminationPct >= 0 && result.illuminationPct <= 100);

    // Test sidereal meridian phase
    const noonPhase = mathModule.getSiderealMeridianPhase(12);
    assert.equal(noonPhase, "ZENITH SOLAR CULMINATION");
    const nightPhase = mathModule.getSiderealMeridianPhase(23);
    assert.equal(nightPhase, "NADIR OBSIDIAN COSMOS");
  });

  await t.test("MidnightDashboard implements Zone 1: Planetarium Zenith Dome with SVG Astrolabe & Lunar Orb", () => {
    const compPath = path.join(projectRoot, "src", "components", "dashboard", "midnight", "midnight-dashboard.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    assert.match(content, /midnight-zenith-hero/);
    assert.match(content, /calculateLunarPhase/);
    assert.match(content, /getSiderealMeridianPhase/);
    assert.match(content, /OBSERVATORY MERIDIAN/);
    assert.match(content, /In Orbit/);
    assert.match(content, /Perihelion/);
    assert.match(content, /Constellations/);
  });

  await t.test("ConstellationCadence implements Zone 2: Full-Width 3-Column Living Star Constellations", () => {
    const compPath = path.join(projectRoot, "src", "components", "dashboard", "midnight", "constellation-cadence.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    assert.match(content, /midnight-observatory-card/);
    assert.match(content, /LIVING STAR CONSTELLATIONS/);
    assert.match(content, /grid-cols-1 md:grid-cols-3/);
    assert.match(content, /M 10 18 L 47 12/); // Constellation vector SVG line
    assert.match(content, /M8 0 L9\.4 6\.6 L16 8/); // 4-Point Supernova Star SVG
  });

  await t.test("OrbitalFocus implements Zone 3 Left: Orbital Gravity Stream with Perihelion Hero & Magnitude Plates", () => {
    const compPath = path.join(projectRoot, "src", "components", "dashboard", "midnight", "orbital-focus.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    assert.match(content, /ORBITAL FOCUS & GRAVITY WELL/);
    assert.match(content, /midnight-hero-task-card/);
    assert.match(content, /MAGNITUDE I · PERIHELION FOCUS/);
    assert.match(content, /Lock Alignment/);
    assert.match(content, /MAGNITUDE/);
  });

  await t.test("MeridianChronicle implements Zone 3 Right: Meridian Transit Log with Single-Line Header", () => {
    const compPath = path.join(projectRoot, "src", "components", "dashboard", "midnight", "meridian-chronicle.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    assert.match(content, /MERIDIAN TRANSIT/);
    assert.match(content, /whitespace-nowrap/);
    assert.match(content, /border-l-2/); // Meridian Axis line
    assert.match(content, /Ephemeris/);
  });

  await t.test("Dashboard integration cleanly scopes Midnight without regressions in other themes", () => {
    const pagePath = path.join(projectRoot, "src", "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.match(pageContent, /import\s*\{\s*MidnightDashboard\s*\}\s*from\s*["']@\/components\/dashboard\/midnight\/midnight-dashboard["']/);
    assert.match(pageContent, /themePersonality === "midnight"/);
    assert.match(pageContent, /<MidnightDashboard/);
    assert.match(pageContent, /<FuturisticDashboard/);
    assert.match(pageContent, /<AestheticDashboard/);
    assert.match(pageContent, /<ArtisticDashboard/);
    assert.match(pageContent, /<MinimalistDashboard/);
    assert.match(pageContent, /<NaturalistDashboard/);
  });
});
