import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const css = fs.readFileSync(globalsCssPath, "utf-8");

test("Phase 10C.5: Minimalist Theme Refinement — The Dieter Rams / Vignelli Architectural Ledger", async (t) => {
  await t.test("Minimalist Light Mode defines Warm Matte Alabaster, Pure Carbon Ink & International Signal Orange", () => {
    // Canvas & Surface
    assert.ok(css.includes("--orbit-bg: #f6f6f3"), "Minimalist light mode has Warm Matte Alabaster base");
    assert.ok(css.includes("--orbit-bg-canvas: #f6f6f3"), "Canvas background set to #f6f6f3");
    assert.ok(css.includes("--orbit-surface: #f6f6f3"), "Minimalist surface matches open matte ledger canvas");
    assert.ok(css.includes("--orbit-surface-secondary: #eeeeea"), "Minimalist subtle hover stone #eeeeea");

    // Primary & Muted Ink
    assert.ok(css.includes("--orbit-text: #111110"), "Pure Carbon Ink #111110");
    assert.ok(css.includes("--orbit-text-muted: #71716b"), "Neutral Graphite Muted Ink #71716b");

    // International Braun Signal Orange
    assert.ok(css.includes("--orbit-accent: #ff3b00"), "International Braun Signal Orange #ff3b00 primary accent");

    // Hairline Rule & Geometry
    assert.ok(css.includes("--orbit-border: #dfdfd9"), "1px solid Razor Hairline #dfdfd9");
    assert.ok(css.includes("--orbit-radius-card: 0px"), "Razor-crisp 0px radius for layout ledger hairlines");
    assert.ok(css.includes("--orbit-radius-control: 0.125rem"), "2px (0.125rem) radius for micro-controls");

    // Zero Drop Shadows & Zero Blur Tax
    assert.ok(css.includes("--orbit-shadow-card: none"), "Zero drop shadows on cards");
    assert.ok(css.includes("--orbit-shadow-elevated: none"), "Zero drop shadows on elevated surfaces");
    assert.ok(
      css.includes(':root[data-orbit-theme="minimalist"]') && css.includes("--orbit-card-blur: 0px"),
      "ZERO backdrop-filter blur tax for high performance"
    );
  });

  await t.test("Minimalist Dark Mode defines Leica Matte Carbon, Anodized Silver-White & Luminous Signal Orange", () => {
    assert.ok(css.includes("--orbit-bg: #0b0b0b"), "Pure Matte Carbon #0b0b0b base in dark mode");
    assert.ok(css.includes("--orbit-text: #f2f2ef"), "Anodized Silver-White #f2f2ef ink in dark mode");
    assert.ok(css.includes("--orbit-border: #222220"), "1px solid Hairline Rule #222220 in dark mode");
    assert.ok(css.includes("--orbit-accent: #ff4500"), "Luminous Signal Orange #ff4500 accent in dark mode");
  });

  await t.test("Minimalist Architectural Ledger components are present and properly structured", () => {
    const dir = path.join(projectRoot, "src/components/dashboard/minimalist");
    assert.ok(fs.existsSync(path.join(dir, "minimalist-dashboard.tsx")), "Minimalist dashboard orchestrator exists");
    assert.ok(fs.existsSync(path.join(dir, "swiss-focus-ledger.tsx")), "Swiss focus ledger component exists");
    assert.ok(fs.existsSync(path.join(dir, "dieter-cadence-strip.tsx")), "Dieter cadence strip component exists");
    assert.ok(fs.existsSync(path.join(dir, "horizon-chronicle.tsx")), "Horizon chronicle component exists");
  });

  await t.test("MinimalistDashboard implements Top Horizon Filament & Swiss Typographic Masthead", () => {
    const dashPath = path.join(projectRoot, "src/components/dashboard/minimalist/minimalist-dashboard.tsx");
    const dashCode = fs.readFileSync(dashPath, "utf-8");

    assert.ok(dashCode.includes("bg-[#ff3b00]"), "Top horizon ratio filament uses Signal Orange #ff3b00");
    assert.ok(dashCode.includes("progressbar"), "Ratio filament implements progressbar accessibility role");
    assert.ok(dashCode.includes("text-6xl md:text-7xl"), "Masthead features massive typographic date numeral");
    assert.ok(dashCode.includes("NEW ENTRY"), "Quick action trigger present");
    assert.ok(!dashCode.includes("01 //") && !dashCode.includes("LOG //"), "No terminal brutalist markers");
  });

  await t.test("SwissFocusLedger implements Open Architectural Ledger with Signal Orange indicators", () => {
    const ledgerPath = path.join(projectRoot, "src/components/dashboard/minimalist/swiss-focus-ledger.tsx");
    const ledgerCode = fs.readFileSync(ledgerPath, "utf-8");

    assert.ok(ledgerCode.includes("01"), "Swiss margin index marker 01 present");
    assert.ok(ledgerCode.includes("FOCUS"), "Section title present");
    assert.ok(ledgerCode.includes("bg-[#ff3b00]"), "Signal Orange dot for active filter and P1/overdue indicators");
    assert.ok(ledgerCode.includes("divide-y divide-orbit-border"), "Flush horizontal ledger rows separated by hairlines");
  });

  await t.test("DieterCadenceStrip implements 7-Day Precision Vertical Dial Ticks", () => {
    const cadencePath = path.join(projectRoot, "src/components/dashboard/minimalist/dieter-cadence-strip.tsx");
    const cadenceCode = fs.readFileSync(cadencePath, "utf-8");

    assert.ok(cadenceCode.includes("CADENCE"), "Cadence section title present");
    assert.ok(cadenceCode.includes("bg-[#ff3b00]"), "Today's tick highlighted in Signal Orange #ff3b00");
    assert.ok(cadenceCode.includes("w-2 h-6"), "Precision vertical dial tick dimensions present");
  });

  await t.test("HorizonChronicle implements Swiss Railway (SBB) Timetable with Signal Micro-Dots", () => {
    const chroniclePath = path.join(projectRoot, "src/components/dashboard/minimalist/horizon-chronicle.tsx");
    const chronicleCode = fs.readFileSync(chroniclePath, "utf-8");

    assert.ok(chronicleCode.includes("03 / HORIZON"), "Horizon header present");
    assert.ok(chronicleCode.includes("TIMETABLE"), "Link to calendar timetable present");
    assert.ok(chronicleCode.includes("bg-[#ff3b00]"), "Signal Orange micro-dot for immediate upcoming event");
  });

  await t.test("Dashboard integration cleanly scopes Minimalist in page.tsx without altering other themes", () => {
    const pagePath = path.join(projectRoot, "src/app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(pageContent.includes("MinimalistDashboard"), "HomePage imports and renders MinimalistDashboard");
    assert.ok(pageContent.includes('themePersonality === "minimalist"'), "HomePage conditionally scopes Minimalist dashboard");
    assert.ok(pageContent.includes('themePersonality === "artistic"'), "Artistic remains cleanly scoped");
    assert.ok(pageContent.includes('themePersonality === "aesthetic"'), "Aesthetic remains cleanly scoped");
    assert.ok(pageContent.includes('themePersonality === "futuristic"'), "Futuristic remains cleanly scoped");
  });

  await t.test("Strict Scope: Archivist, Futuristic, Aesthetic, and Artistic remain completely unharmed", () => {
    // 1. Archivist
    assert.ok(css.includes("--orbit-surface: rgba(254, 252, 247, 0.74)"), "Archivist retains vellum surface");
    assert.ok(css.includes("paperNoise"), "Archivist retains paper pulp noise");

    // 2. Futuristic
    assert.ok(css.includes("--orbit-bg: #080b11"), "Futuristic retains deep space obsidian base");
    assert.ok(css.includes("titaniumNoiseDark"), "Futuristic retains static titanium micro-grain");

    // 3. Aesthetic
    assert.ok(css.includes("--orbit-bg: #faf6f0"), "Aesthetic retains Alabaster Linen base");
    assert.ok(css.includes("--orbit-accent: #c86d51"), "Aesthetic retains Baked Terracotta accent");

    // 4. Artistic
    assert.ok(css.includes("--orbit-bg: #fcf9f4"), "Artistic retains cold-pressed watercolor paper base");
    assert.ok(css.includes("--orbit-accent: #e11d48"), "Artistic retains Rose Vermilion primary pigment");
  });
});
