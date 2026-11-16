import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function readSrc(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const HEADER_FILE = "src/components/layout/personality-page-header.tsx";
const TASKS_FILE = "src/app/tasks/page.tsx";
const HABITS_FILE = "src/app/habits/page.tsx";
const CALENDAR_HEADER_FILE = "src/components/calendar/calendar-header.tsx";
const INBOX_FILE = "src/app/inbox/page.tsx";
const LIBRARY_FILE = "src/app/library/page.tsx";
const INSIGHTS_FILE = "src/app/insights/page.tsx";
const GLOBALS_CSS = "src/app/globals.css";

// ---------------------------------------------------------------------------
// 1. PersonalityPageHeader Architecture & Motif Integrity
// ---------------------------------------------------------------------------
test("Phase 11B — PersonalityPageHeader exports all 7 bespoke architectural motifs", () => {
  const headerSrc = readSrc(HEADER_FILE);

  assert.match(
    headerSrc,
    /export\s+function\s+PersonalityPageHeader/,
    "PersonalityPageHeader component must be exported"
  );

  // Check support for all 7 personalities
  const themes = [
    "archivist",
    "futuristic",
    "aesthetic",
    "artistic",
    "minimalist",
    "naturalist",
    "midnight",
  ];
  for (const theme of themes) {
    assert.ok(
      headerSrc.includes(`"${theme}"`) || headerSrc.includes(`'${theme}'`),
      `PersonalityPageHeader must explicitly handle theme '${theme}'`
    );
  }
});

test("Phase 11B — PersonalityPageHeader contains bespoke architectural physics per personality", () => {
  const headerSrc = readSrc(HEADER_FILE);

  // 1. Archivist: Bodleian Rare Book Folio with filigrees, fleuron, brass plates
  assert.match(
    headerSrc,
    /archivist-folio-hero/,
    "Archivist must render archivist-folio-hero"
  );
  assert.match(
    headerSrc,
    /EX LIBRIS ORBIT/,
    "Archivist must render EX LIBRIS ORBIT gold-leaf eyebrow"
  );
  assert.ok(
    headerSrc.includes("❦"),
    "Archivist must render curatorial fleuron mark"
  );

  // 2. Futuristic: Orbital Avionics Command Deck with hex screws, LED, OLED capsules
  assert.match(
    headerSrc,
    /futuristic-command-deck/,
    "Futuristic must render futuristic-command-deck"
  );
  assert.match(
    headerSrc,
    /SYS\.MODULE/,
    "Futuristic must render SYS.MODULE avionics eyebrow"
  );
  assert.ok(
    headerSrc.includes("⊕"),
    "Futuristic must render hex screw corner fasteners"
  );

  // 3. Aesthetic: Kinfolk editorial masthead with hairline rules & edition numbering
  assert.match(
    headerSrc,
    /EDITION NO\./,
    "Aesthetic must render EDITION NO. editorial eyebrow"
  );
  assert.match(
    headerSrc,
    /border-t.*border-b/,
    "Aesthetic must render double hairline rule borders"
  );

  // 4. Artistic: Chromatic studio banner with watercolor wash and Matisse silhouette
  assert.match(
    headerSrc,
    /ATELIER ORBIT/,
    "Artistic must render ATELIER ORBIT eyebrow"
  );
  assert.match(
    headerSrc,
    /<svg.*Matisse|viewBox="0 0 100 100"/,
    "Artistic must render organic Matisse cutout silhouette SVG"
  );

  // 5. Minimalist: Massimo Vignelli open-ledger with 2px International Signal Orange filament
  assert.match(
    headerSrc,
    /#ff3b00/,
    "Minimalist must feature 2px International Signal Orange (#ff3b00) filament"
  );
  assert.match(
    headerSrc,
    /tabular-nums/,
    "Minimalist must render tabular numerals"
  );

  // 6. Naturalist: Botanical conservatory canopy hero with fern / solar watermark
  assert.match(
    headerSrc,
    /naturalist-canopy-hero/,
    "Naturalist must render naturalist-canopy-hero"
  );
  assert.match(
    headerSrc,
    /CONSERVATORY/,
    "Naturalist must render CONSERVATORY phenology eyebrow"
  );

  // 7. Midnight: Deep indigo celestial observatory with astrolabe declination rings
  assert.match(
    headerSrc,
    /midnight-zenith-hero/,
    "Midnight must render midnight-zenith-hero"
  );
  assert.match(
    headerSrc,
    /OBSERVATORY SECTOR/,
    "Midnight must render OBSERVATORY SECTOR horological gold eyebrow"
  );
});

// ---------------------------------------------------------------------------
// 2. Integration Across All 6 Secondary Routes
// ---------------------------------------------------------------------------
test("Phase 11B — All 6 secondary routes consume PersonalityPageHeader with correct module indices", () => {
  const routes = [
    { file: TASKS_FILE, index: "01", title: "Tasks & Execution" },
    { file: HABITS_FILE, index: "02", title: "Habits & Rituals" },
    { file: CALENDAR_HEADER_FILE, index: "03", title: "Calendar & Horizon" },
    { file: INBOX_FILE, index: "04", title: "Inbox & Triage" },
    { file: LIBRARY_FILE, index: "05", title: "Library & Notes" },
    { file: INSIGHTS_FILE, index: "06", title: "Insights & Telemetry" },
  ];

  for (const { file, index, title } of routes) {
    const src = readSrc(file);
    assert.match(
      src,
      /import\s+.*PersonalityPageHeader.*from\s+["']@\/components\/layout\/personality-page-header["']/,
      `${file} must import PersonalityPageHeader`
    );
    assert.match(
      src,
      new RegExp(`moduleIndex=["']${index}["']`),
      `${file} must render PersonalityPageHeader with moduleIndex="${index}"`
    );
    assert.match(
      src,
      new RegExp(`title=["']${title}["']`),
      `${file} must render PersonalityPageHeader with title="${title}"`
    );
  }
});

// ---------------------------------------------------------------------------
// 3. Strict Zero GPU Blur Tax Rule Enforcement
// ---------------------------------------------------------------------------
test("Phase 11B — No backdrop-blur-* utility classes exist across src/ (Zero GPU Blur Tax)", () => {
  function scanDir(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, fileList);
      } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allFiles = scanDir(path.join(projectRoot, "src"));
  const violations = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    // Match backdrop-blur-(xs|sm|md|lg|xl|2xl|3xl|\[.*\]) but allow backdrop-blur-none
    const matches = content.match(/backdrop-blur-(?:xs|sm|md|lg|xl|2xl|3xl|\[(?!0px)[^\]]+\])/g);
    if (matches) {
      violations.push(`${path.relative(projectRoot, filePath)}: ${matches.join(", ")}`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found backdrop-blur violations violating Zero GPU Blur Tax:\n${violations.join("\n")}`
  );
});

// ---------------------------------------------------------------------------
// 4. Minimalist Open-Ledger Surface Card Physics & Deduplicated Telemetry
// ---------------------------------------------------------------------------
test("Phase 11B — Minimalist theme enforces open-ledger 0px shadow, sharp 0px corners, and 1px hairline border", () => {
  const css = readSrc(GLOBALS_CSS);
  const headerSrc = readSrc(HEADER_FILE);

  assert.match(
    css,
    /\[data-orbit-theme="minimalist"\].*\.orbit-surface-card[\s\S]*box-shadow:\s*none\s*!important/,
    "Minimalist theme must enforce box-shadow: none !important on .orbit-surface-card"
  );
  assert.match(
    css,
    /\[data-orbit-theme="minimalist"\].*\.orbit-surface-card[\s\S]*border:\s*1px\s*solid/,
    "Minimalist theme must enforce 1px solid hairline border on .orbit-surface-card"
  );
  assert.match(
    css,
    /\[data-orbit-theme="minimalist"\].*\.orbit-surface-card[\s\S]*border-radius:\s*0px\s*!important/,
    "Minimalist theme must enforce border-radius: 0px !important on .orbit-surface-card"
  );

  // Minimalist header must be unboxed open-canvas
  assert.match(
    headerSrc,
    /data-personality-header="minimalist"[\s\S]*bg-transparent[\s\S]*border-x-0/,
    "Minimalist header must be unboxed open canvas with bg-transparent and border-x-0"
  );
});

test("Phase 11B — Secondary pages eliminate redundant telemetry bars", () => {
  const habitsSrc = readSrc(HABITS_FILE);
  const overviewSrc = readSrc("src/components/insights/overview-cards.tsx");
  const librarySrc = readSrc(LIBRARY_FILE);

  // Habits: no duplicate completed today text strip
  assert.doesNotMatch(
    habitsSrc,
    /completed today.*daily rate.*Best streak/s,
    "Habits page must not repeat telemetry in a redundant sub-bar"
  );
  assert.match(
    habitsSrc,
    /<PersonalityPageHeader[\s\S]*actions=\{[\s\S]*Active[\s\S]*Archived/,
    "Habits page must house the Active/Archived pill switcher cleanly in header actions"
  );

  // Insights: no duplicate middle banner
  assert.doesNotMatch(
    overviewSrc,
    /Rhythm & Output/,
    "OverviewCards must eliminate redundant Rhythm & Output middle banner"
  );

  // Library: merged into single control card
  assert.doesNotMatch(
    librarySrc,
    /<SurfaceCard[^>]*variant="tonal"[^>]*>[\s\S]*Curated Shelf/,
    "Library must not stack a separate tonal card for the view strip"
  );
});

// ---------------------------------------------------------------------------
// 5. Color Harmony & WCAG Contrast in Secondary Modules
// ---------------------------------------------------------------------------
test("Phase 11B — Habit accent colors harmonize with theme personalities and enforce WCAG contrast", () => {
  const habitCardSrc = readSrc("src/components/habits/habit-card.tsx");
  const colorHarmonySrc = readSrc("src/lib/utils/color-harmony.ts");

  // Verify color harmony utility exports
  assert.match(
    colorHarmonySrc,
    /export\s+function\s+getHarmonizedHabitColor/,
    "color-harmony.ts must export getHarmonizedHabitColor"
  );
  assert.match(
    colorHarmonySrc,
    /export\s+function\s+getContrastTextColor/,
    "color-harmony.ts must export getContrastTextColor"
  );
  assert.match(
    colorHarmonySrc,
    /export\s+function\s+isLightHexColor/,
    "color-harmony.ts must export isLightHexColor"
  );

  // HabitCard must consume the harmonizer
  assert.match(
    habitCardSrc,
    /getHarmonizedHabitColor\(\s*habit\.color/,
    "HabitCard must harmonize habit.color with active theme personality"
  );
  assert.match(
    habitCardSrc,
    /getContrastTextColor\(\s*harmonizedColor\s*\)/,
    "HabitCard must calculate contrast text color for buttons"
  );
});
