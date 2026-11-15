import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.6: Naturalist Theme Refinement — The Living Biophilic Sanctuary & Terraced Landscape", async (t) => {
  await t.test("Naturalist Light Mode defines Sand & Limestone Canvas, Topographic Contour SVG & Canopy Washes", () => {
    // Canvas & Topographic Contours
    assert.ok(css.includes("--orbit-bg: #f2ede2"), "Naturalist light mode canvas is Sunlit Sand & Limestone #f2ede2");
    assert.ok(css.includes("--orbit-bg-canvas: #f2ede2"), "Canvas background set to #f2ede2");
    assert.ok(css.includes("stroke='%233b5e45'"), "Topographic elevation contour line SVG pattern present in light mode");
    assert.ok(css.includes("rgba(217, 148, 65, 0.16)"), "Golden-hour canopy sunlight radial wash present");
    assert.ok(css.includes("rgba(45, 90, 68, 0.12)"), "Cool moss stream radial wash present");

    // Surfaces & Accents
    assert.ok(css.includes("--orbit-surface: #faf8f2"), "Limestone & Linen surface #faf8f2");
    assert.ok(css.includes("--orbit-text: #1b2e22"), "Deep Forest Loam #1b2e22 primary ink");
    assert.ok(css.includes("--orbit-accent: #2e593d"), "Eucalyptus Canopy Green #2e593d primary accent");
    assert.ok(css.includes("--orbit-accent-secondary: #b85a3a"), "Warm Terracotta Clay #b85a3a secondary accent");
    assert.ok(css.includes("--orbit-accent-tertiary: #d99b3b"), "Golden Amber Honey #d99b3b tertiary accent");

    // Zero Blur Tax
    assert.ok(
      css.includes(':root[data-orbit-theme="naturalist"]') && css.includes("--orbit-card-blur: 0px"),
      "Naturalist maintains ZERO blur tax for peak performance"
    );
  });

  await t.test("Naturalist Dark Mode defines Deep Forest Peat, Bioluminescent Moss & Emerald Contours", () => {
    assert.ok(css.includes("--orbit-bg: #09110d"), "Deep Forest Floor #09110d dark canvas");
    assert.ok(css.includes("stroke='%236ea87f'"), "Dark emerald topographic elevation contour line SVG present");
    assert.ok(css.includes("--orbit-text: #e7eee9"), "Birch Bark Parchment #e7eee9 ink in dark mode");
    assert.ok(css.includes("--orbit-accent: #68a87b"), "Luminous Fern Sage #68a87b primary accent in dark mode");
    assert.ok(css.includes("--orbit-accent-secondary: #d97757"), "Warm Terracotta Clay #d97757 secondary accent in dark mode");
  });

  await t.test("Naturalist defines Biophilic Multi-Material Earth Surface classes in globals.css", () => {
    assert.ok(css.includes(".naturalist-canopy-hero"), ".naturalist-canopy-hero lush pavilion class defined");
    assert.ok(css.includes("#1b3826"), "Canopy hero defines deep lush green gradient in light mode");
    assert.ok(css.includes(".naturalist-clay-card"), ".naturalist-clay-card terracotta surface defined");
    assert.ok(css.includes(".naturalist-moss-card"), ".naturalist-moss-card sage/moss surface defined");
    assert.ok(css.includes(".naturalist-limestone-card"), ".naturalist-limestone-card warm limestone surface defined");
    assert.ok(
      css.includes(':root[data-orbit-theme="naturalist"] .orbit-modal-backdrop') &&
        css.includes("backdrop-filter: none !important"),
      "Modal backdrop has ZERO backdrop-filter blur"
    );
  });

  await t.test("Naturalist Biophilic Sanctuary components exist and are structured properly", () => {
    const dir = path.join(projectRoot, "src/components/dashboard/naturalist");
    assert.ok(fs.existsSync(path.join(dir, "naturalist-dashboard.tsx")), "Naturalist dashboard orchestrator exists");
    assert.ok(fs.existsSync(path.join(dir, "perennial-garden.tsx")), "Perennial garden component exists");
    assert.ok(fs.existsSync(path.join(dir, "herbarium-specimens.tsx")), "Herbarium specimens component exists");
    assert.ok(fs.existsSync(path.join(dir, "solar-horizon.tsx")), "Solar horizon component exists");
  });

  await t.test("NaturalistDashboard implements Stratum 1: The Lush Conservatory Panorama & Golden Solar Arc", () => {
    const dashPath = path.join(projectRoot, "src/components/dashboard/naturalist/naturalist-dashboard.tsx");
    const dashCode = fs.readFileSync(dashPath, "utf-8");

    assert.ok(dashCode.includes("naturalist-canopy-hero"), "Stratum 1 wraps in lush .naturalist-canopy-hero pavilion");
    assert.ok(dashCode.includes("strokeDasharray"), "Golden Celestial Solar Arc present");
    assert.ok(dashCode.includes("sunPosition"), "Dynamic celestial sun position calculated from hour");
    assert.ok(dashCode.includes("CONSERVATORY"), "Elevation & solar cycle eyebrow present");
    assert.ok(dashCode.includes("Cultivating"), "Cultivating specimen counter in ecosystem pill strip");
    assert.ok(dashCode.includes("Ripe / Today"), "Ripe / Today counter present");
    assert.ok(dashCode.includes("Perennials"), "Perennials counter present");
  });

  await t.test("PerennialGarden implements Stratum 2: Full-Width 3-Column Living Terrarium Vessels with Dynamic Plant Cloches", () => {
    const gardenPath = path.join(projectRoot, "src/components/dashboard/naturalist/perennial-garden.tsx");
    const gardenCode = fs.readFileSync(gardenPath, "utf-8");

    assert.ok(gardenCode.includes("LIVING PERENNIAL TERRARIUMS"), "Stratum 2 section title present");
    assert.ok(gardenCode.includes("grid-cols-1 md:grid-cols-3"), "Full-width 3-column terrarium planter layout present");
    assert.ok(gardenCode.includes("PlantClocheIllustration"), "Dynamic living SVG plant growth illustration component present");
    assert.ok(gardenCode.includes("cloche") || gardenCode.includes("Cloche"), "Glass cloche / terracotta pot SVG artwork present");
    assert.ok(gardenCode.includes("bg-[#2d5a40]"), "Lush green pebble stepping stones for completed days");
    assert.ok(gardenCode.includes("border-[#c86446]"), "Terracotta seed stone for today's active target");
  });

  await t.test("HerbariumSpecimens implements Stratum 3 Left: The Terraced Earth Courtyard with Feature Pavilion & 2-Col Bento", () => {
    const specimensPath = path.join(projectRoot, "src/components/dashboard/naturalist/herbarium-specimens.tsx");
    const specimensCode = fs.readFileSync(specimensPath, "utf-8");

    assert.ok(specimensCode.includes("THE TERRACED COURTYARD & CULTIVATION"), "Section header present");
    assert.ok(specimensCode.includes("RIPE FOR HARVEST · PRIMARY CULTIVATION"), "Primary feature focus card badge present");
    assert.ok(specimensCode.includes("Harvest / Complete"), "River-Stone completion pill button present");
    assert.ok(specimensCode.includes("grid-cols-1 md:grid-cols-2"), "2-column bento courtyard present below primary focus");
    assert.ok(specimensCode.includes("naturalist-clay-card"), "Terracotta clay card variant present");
    assert.ok(specimensCode.includes("naturalist-moss-card"), "Sage moss card variant present");
    assert.ok(specimensCode.includes("naturalist-limestone-card"), "Limestone card variant present");
    assert.ok(!specimensCode.includes("SPECIMEN NO. 01"), "Discarded textbook labeling in favor of biophilic badges");
  });

  await t.test("SolarHorizon implements Stratum 3 Right: The Winding Trail with Single-Line Header", () => {
    const horizonPath = path.join(projectRoot, "src/components/dashboard/naturalist/solar-horizon.tsx");
    const horizonCode = fs.readFileSync(horizonPath, "utf-8");

    assert.ok(horizonCode.includes("TRAIL HORIZON"), "Trail horizon section title present");
    assert.ok(horizonCode.includes("whitespace-nowrap"), "Header constrained to single crisp line");
    assert.ok(horizonCode.includes("naturalist-moss-card"), "Rich moss surface card present");
    assert.ok(horizonCode.includes("border-l-2"), "Continuous vertical trail path present");
    assert.ok(horizonCode.includes("Morning Sun"), "Solar phase calculation present");
  });

  await t.test("Dashboard integration cleanly scopes Naturalist without regressions in other themes", () => {
    const pagePath = path.join(projectRoot, "src/app/page.tsx");
    const pageCode = fs.readFileSync(pagePath, "utf-8");

    assert.ok(pageCode.includes("NaturalistDashboard"), "HomePage imports NaturalistDashboard");
    assert.ok(pageCode.includes('themePersonality === "naturalist"'), "HomePage conditionally scopes Naturalist dashboard");
    assert.ok(pageCode.includes('themePersonality === "minimalist"'), "Minimalist remains cleanly scoped");
    assert.ok(pageCode.includes('themePersonality === "artistic"'), "Artistic remains cleanly scoped");
    assert.ok(pageCode.includes('themePersonality === "aesthetic"'), "Aesthetic remains cleanly scoped");
    assert.ok(pageCode.includes('themePersonality === "futuristic"'), "Futuristic remains cleanly scoped");
  });
});
