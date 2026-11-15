import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.3: Aesthetic Theme Redesign — The Kinfolk / Museum Editorial Spread", async (t) => {
  await t.test("Aesthetic Light Mode defines Warm Alabaster Linen and Pure Warm Ivory elevated surfaces", () => {
    // Canvas background
    assert.ok(css.includes("--orbit-bg: #faf6f0"), "Aesthetic light mode has warm alabaster linen base");
    assert.ok(css.includes("--orbit-bg-canvas: #faf6f0"), "Canvas matches alabaster linen base");

    // Elevated surface for hero cards and ritual tiles
    assert.ok(css.includes("--orbit-surface: #fffdf9"), "Aesthetic light mode uses pure warm ivory surface");

    // Accents
    assert.ok(css.includes("--orbit-accent: #c86d51"), "Baked Terracotta primary accent");
    assert.ok(css.includes("--orbit-accent-secondary: #5c6f58"), "Muted Sage Olive secondary accent");
    assert.ok(css.includes("--orbit-success: #5c6f58"), "Muted Sage Olive success/ritual completion");

    // Geometry & Blur
    assert.ok(css.includes("--orbit-radius-card: 1.25rem"), "Pillowy 1.25rem card geometry");
    assert.ok(
      css.includes(':root[data-orbit-theme="aesthetic"]') && css.includes("--orbit-card-blur: 0px"),
      "ZERO backdrop-filter blur tax for high performance"
    );
  });

  await t.test("Aesthetic Dark Mode defines Velvet Nocturne Catalog with Deep Roasted Espresso", () => {
    assert.ok(css.includes("--orbit-bg: #141110"), "Aesthetic dark mode uses deep roasted espresso base");
    assert.ok(css.includes("--orbit-surface: #1e1917"), "Aesthetic dark mode uses warm dark umber surface");
    assert.ok(css.includes("--orbit-accent: #d98266"), "Warm Terracotta Clay dark accent");
    assert.ok(css.includes("--orbit-accent-secondary: #7a9175"), "Soft Sage dark secondary accent");
  });

  await t.test("Museum Editorial Spread components are present and properly structured", () => {
    const dir = path.join(projectRoot, "src/components/dashboard/aesthetic");
    assert.ok(fs.existsSync(path.join(dir, "aesthetic-dashboard.tsx")), "Aesthetic dashboard orchestrator exists");
    assert.ok(fs.existsSync(path.join(dir, "rituals-cadence.tsx")), "Rituals cadence component exists");
    assert.ok(fs.existsSync(path.join(dir, "curated-focus.tsx")), "Curated focus component exists");
    assert.ok(fs.existsSync(path.join(dir, "editorial-agenda.tsx")), "Editorial agenda component exists");
  });

  await t.test("CuratedFocus implements Lead Feature hero card and Table of Contents with dotted leader lines", () => {
    const focusPath = path.join(projectRoot, "src/components/dashboard/aesthetic/curated-focus.tsx");
    const focusCode = fs.readFileSync(focusPath, "utf-8");

    // Lead feature isolation
    assert.ok(focusCode.includes("leadTask"), "CuratedFocus isolates the top priority lead task");
    assert.ok(focusCode.includes("LEAD FOCUS"), "Hero card renders lead focus headline");

    // Table of contents for remaining tasks
    assert.ok(focusCode.includes("remainingTasks"), "CuratedFocus processes remaining tasks in table of contents");
    assert.ok(focusCode.includes("border-dotted"), "Editorial index features dotted leader lines");
    assert.ok(focusCode.includes("INDEX OF INTENTIONS"), "Editorial index header is rendered");
  });

  await t.test("RitualsCadence implements 7-day organic circular stone cadence strip", () => {
    const ritualsPath = path.join(projectRoot, "src/components/dashboard/aesthetic/rituals-cadence.tsx");
    const ritualsCode = fs.readFileSync(ritualsPath, "utf-8");

    assert.ok(ritualsCode.includes("rounded-full"), "Ritual day stones use organic circular styling");
    assert.ok(ritualsCode.includes("rhythmText"), "Streak formatted as day rhythm");
    assert.ok(ritualsCode.includes("I. DAILY RITUALS"), "Section header label present");
  });

  await t.test("AestheticDashboard dynamic prose respects Data Honesty without synthetic hardcoded quotes", () => {
    const dashPath = path.join(projectRoot, "src/components/dashboard/aesthetic/aesthetic-dashboard.tsx");
    const dashCode = fs.readFileSync(dashPath, "utf-8");

    assert.ok(dashCode.includes("numberToWord"), "Helper converts numbers into prose words");
    assert.ok(dashCode.includes("narrativeSummary"), "Summary dynamically derives from open and overdue counts");
    assert.ok(!dashCode.includes("Patience and craft in equal measure"), "No hardcoded synthetic quotes");
  });

  await t.test("Dashboard integration cleanly scopes Aesthetic in page.tsx without altering other themes", () => {
    const pagePath = path.join(projectRoot, "src/app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(pageContent.includes("AestheticDashboard"), "HomePage imports and renders AestheticDashboard");
    assert.ok(pageContent.includes('themePersonality === "aesthetic"'), "HomePage conditionally scopes Aesthetic dashboard");
    assert.ok(pageContent.includes('themePersonality === "futuristic"'), "Futuristic remains cleanly scoped");
  });

  await t.test("Strict Scope: Archivist, Futuristic and other themes remain completely unharmed", () => {
    // 1. Archivist
    assert.ok(css.includes("--orbit-surface: rgba(254, 252, 247, 0.74)"), "Archivist retains vellum surface");
    assert.ok(css.includes("paperNoise"), "Archivist retains paper pulp noise");

    // 2. Futuristic
    assert.ok(css.includes("--orbit-bg: #080b11"), "Futuristic retains deep space obsidian base");
    assert.ok(css.includes("titaniumNoiseDark"), "Futuristic retains static titanium micro-grain");
    assert.ok(css.includes(".futuristic-led-checkbox"), "Futuristic retains LED hardware switches");

    // 3. Minimalist
    assert.ok(css.includes("--orbit-radius-card: 0px") || css.includes("--orbit-radius-card: 0.125rem"), "Minimalist retains Bauhaus card radius");

    // 4. Naturalist
    assert.ok(css.includes("--orbit-radius-card: 1rem"), "Naturalist retains organic card radius");

    // 5. Midnight
    assert.ok(css.includes("--orbit-radius-card: 0.875rem"), "Midnight retains cosmic card radius");
  });
});
