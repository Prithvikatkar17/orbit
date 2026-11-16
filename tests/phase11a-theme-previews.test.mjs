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

const SETTINGS_FILE = "src/app/settings/page.tsx";
const PREVIEW_CARD_FILE = "src/components/theme-preview-card.tsx";
const ONBOARDING_FILE = "src/components/onboarding/onboarding-wizard.tsx";
const GLOBALS_CSS = "src/app/globals.css";

// ---------------------------------------------------------------------------
// 1. Unified ThemePersonalityCard Consumption & Deduplication
// ---------------------------------------------------------------------------
test("Phase 11A — Settings and Onboarding both consume unified ThemePersonalityCard", () => {
  const settingsSrc = readSrc(SETTINGS_FILE);
  const onboardingSrc = readSrc(ONBOARDING_FILE);

  // Both consumers import and render ThemePersonalityCard
  assert.match(
    settingsSrc,
    /import\s+.*ThemePersonalityCard.*from\s+["']@\/components\/theme-preview-card["']/,
    "Settings must import ThemePersonalityCard"
  );
  assert.match(
    settingsSrc,
    /<ThemePersonalityCard\b/,
    "Settings must render ThemePersonalityCard directly"
  );

  assert.match(
    onboardingSrc,
    /import\s+.*ThemePersonalityCard.*from\s+["']@\/components\/theme-preview-card["']/,
    "Onboarding must import ThemePersonalityCard"
  );
  assert.match(
    onboardingSrc,
    /<ThemePersonalityCard\b/,
    "Onboarding must render ThemePersonalityCard directly"
  );

  // Settings no longer contains duplicated inline radio cards or duplicate mini motif switch
  assert.doesNotMatch(
    settingsSrc,
    /function\s+ThemeMiniMotif/,
    "Settings must not duplicate ThemeMiniMotif definition"
  );
  assert.doesNotMatch(
    settingsSrc,
    /const\s+THEME_SAMPLE_HEADINGS/,
    "Settings must not duplicate THEME_SAMPLE_HEADINGS definition"
  );
});

// ---------------------------------------------------------------------------
// 2. All 7 Bespoke Architectural Mini-Vignettes in ThemePersonalityCard
// ---------------------------------------------------------------------------
test("Phase 11A — ThemePersonalityCard implements all 7 bespoke architectural mini-vignettes", () => {
  const previewCardSrc = readSrc(PREVIEW_CARD_FILE);

  // Function dispatch exists
  assert.match(previewCardSrc, /function\s+PersonalityVignette/);

  // 1. Archivist: Hunter Green folio, brass filigree, swallowtail silk ribbon in Oxblood Crimson, wax seal, punched cream index card
  assert.match(previewCardSrc, /ArchivistVignette/, "Must define ArchivistVignette");
  assert.match(previewCardSrc, /#1c2e24/, "Archivist must use Hunter Green folio background");
  assert.match(previewCardSrc, /#8b1e2d/, "Archivist must use Oxblood Crimson silk ribbon");
  assert.match(previewCardSrc, /polygon\(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%\)/, "Archivist must have swallowtail ribbon clipPath");
  assert.match(previewCardSrc, /#7f1d1d/, "Archivist must feature stamped wax seal dot");
  assert.match(previewCardSrc, /#f8f5ee/, "Archivist must feature cream index card row");

  // 2. Futuristic: Anodized titanium strip, glowing cyan LED (04 OPEN · 02 TODAY), left cyan border, 7-step hardware sequencer
  assert.match(previewCardSrc, /FuturisticVignette/, "Must define FuturisticVignette");
  assert.match(previewCardSrc, /#00f0ff/, "Futuristic must use glowing cyan accent");
  assert.match(previewCardSrc, /04 OPEN · 02 TODAY/, "Futuristic must feature telemetry readout");
  assert.match(previewCardSrc, /SYS\.01 \/\/ CORE VECTOR/, "Futuristic must feature primary focus vector strip");
  assert.match(previewCardSrc, /grid grid-cols-7/, "Futuristic must feature 7-step hardware sequencer bar");

  // 3. Aesthetic: Warm alabaster surface, Kinfolk serif masthead with double hairline rule, terracotta feature, dotted leader lines
  assert.match(previewCardSrc, /AestheticVignette/, "Must define AestheticVignette");
  assert.match(previewCardSrc, /KINFOLK|K I N F O L K/, "Aesthetic must feature Kinfolk masthead");
  assert.match(previewCardSrc, /EDITION\s+IV/, "Aesthetic must cleanly space EDITION IV");
  assert.match(previewCardSrc, /#c06c52/, "Aesthetic must use terracotta accent");
  assert.match(previewCardSrc, /border-dotted/, "Aesthetic must feature dotted leader lines");
  assert.match(previewCardSrc, /The Quiet Morning Ritual/, "Aesthetic must feature lead feature title");

  // 4. Artistic: Multi-hue watercolor radial wash, Matisse botanical cut-out silhouette, gradient brushstroke line, gouache swatch card + 4 pigment orbs
  assert.match(previewCardSrc, /ArtisticVignette/, "Must define ArtisticVignette");
  assert.match(previewCardSrc, /radial-gradient/, "Artistic must feature watercolor radial wash");
  assert.match(previewCardSrc, /brushstroke-grad/, "Artistic must feature gradient brushstroke line");
  assert.match(previewCardSrc, /Cadmium & Ultramarine/, "Artistic must feature gouache swatch card");
  assert.match(previewCardSrc, /#ef4444.*#f59e0b.*#3b82f6.*#10b981/s, "Artistic must feature 4 blended pigment orbs");

  // 5. Minimalist: Top 2px Signal Orange filament, oversized Swiss 15 lockup, hairline tabular ledger rows, 7 Braun dial ticks
  assert.match(previewCardSrc, /MinimalistVignette/, "Must define MinimalistVignette");
  assert.match(previewCardSrc, /#ff3b00/, "Minimalist must use International Signal Orange");
  assert.match(previewCardSrc, /INDEX \/ 01/, "Minimalist must feature INDEX / 01 heading");
  assert.match(previewCardSrc, /RATIO 20%/, "Minimalist must feature ratio readout");
  assert.match(previewCardSrc, /01 SCHEMATIC REVIEW/, "Minimalist must feature hairline tabular ledger rows");

  // 6. Naturalist: Deep forest Canopy Panorama, Golden Solar Arc + sun orb, Terrarium card + SVG sprout, terracotta clay & moss cards
  assert.match(previewCardSrc, /NaturalistVignette/, "Must define NaturalistVignette");
  assert.match(previewCardSrc, /CANOPY · DAWN/, "Naturalist must feature Canopy Panorama strip");
  assert.match(previewCardSrc, /stroke="#f59e0b"/, "Naturalist must feature Golden Solar Arc");
  assert.match(previewCardSrc, /Perennial Terrarium/, "Naturalist must feature mini Terrarium card");
  assert.match(previewCardSrc, /RED CLAY BED/, "Naturalist must feature Red Clay card");
  assert.match(previewCardSrc, /KYOTO MOSS/, "Naturalist must feature Kyoto Moss card");

  // 7. Midnight: Deep indigo Zenith Dome, concentric gold astrolabe rings + crescent moon, 5-node supernova (✦) constellation vector
  assert.match(previewCardSrc, /MidnightVignette/, "Must define MidnightVignette");
  assert.match(previewCardSrc, /ZENITH 42° · NODAL/, "Midnight must feature Zenith coordinate readout");
  assert.match(previewCardSrc, /#fbbf24/, "Midnight must use gold astrolabe and supernova accents");
  assert.match(previewCardSrc, /CONSTELLATION ✦ APOGEE/, "Midnight must feature transit rail footer");
});

// ---------------------------------------------------------------------------
// 3. Step 3 Dynamic Workspace Specimen in OnboardingWizard
// ---------------------------------------------------------------------------
test("Phase 11A — Onboarding Step 3 implements DynamicWorkspaceSpecimen across all 7 themes", () => {
  const onboardingSrc = readSrc(ONBOARDING_FILE);

  assert.match(
    onboardingSrc,
    /export function DynamicWorkspaceSpecimen/,
    "Must export DynamicWorkspaceSpecimen component"
  );
  assert.match(
    onboardingSrc,
    /<DynamicWorkspaceSpecimen theme=\{selectedPersonality\} \/>/,
    "Step 3 must invoke DynamicWorkspaceSpecimen with selectedPersonality"
  );

  // Each theme branch handles Today's Focus and Daily Routines
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
    assert.match(
      onboardingSrc,
      new RegExp(`case ["']${theme}["']:`),
      `DynamicWorkspaceSpecimen must have case for ${theme}`
    );
  }

  // Contract verification: Step 3 includes core titles required by onboarding contracts
  assert.match(onboardingSrc, /Today's Focus|Today&apos;s Focus/);
  assert.match(onboardingSrc, /Daily Routines/);
});

// ---------------------------------------------------------------------------
// 4. Zero GPU Blur Tax Guardrail (--orbit-card-blur: 0px)
// ---------------------------------------------------------------------------
test("Phase 11A — Zero GPU Blur Tax: preview components avoid backdrop-filter: blur", () => {
  const previewCardSrc = readSrc(PREVIEW_CARD_FILE);
  const onboardingSrc = readSrc(ONBOARDING_FILE);

  assert.doesNotMatch(
    previewCardSrc,
    /backdrop-filter:\s*blur\(/,
    "theme-preview-card.tsx must not use backdrop-filter: blur"
  );
  assert.doesNotMatch(
    previewCardSrc,
    /backdrop-blur-/,
    "theme-preview-card.tsx must not use Tailwind backdrop-blur classes"
  );
  assert.doesNotMatch(
    onboardingSrc,
    /backdrop-filter:\s*blur\(/,
    "onboarding-wizard.tsx must not use inline backdrop-filter: blur"
  );
  assert.doesNotMatch(
    onboardingSrc,
    /backdrop-blur-/,
    "onboarding-wizard.tsx must not leak backdrop-blur classes on modal or headers"
  );

  const css = readSrc(GLOBALS_CSS);
  assert.match(
    css,
    /--orbit-card-blur:\s*0px/,
    "globals.css must enforce --orbit-card-blur: 0px"
  );
  assert.doesNotMatch(
    css,
    /\.orbit-modal-backdrop\s*\{[^}]*backdrop-filter:\s*blur\(/s,
    "globals.css must not use backdrop-filter: blur in orbit-modal-backdrop"
  );
});

// ---------------------------------------------------------------------------
// 5. Phase 10C Architecture Taglines, Descriptions & Palette Swatches Alignment
// ---------------------------------------------------------------------------
test("Phase 11A — Personality taglines, descriptions, and swatches match completed Phase 10C architectures", () => {
  const settingsTs = readSrc("src/lib/schemas/settings.ts");

  const expectedData = [
    {
      id: "archivist",
      tagline: "Bodleian Rare Book Folio & Card Catalog",
      description: "Cotton rag paper, Oxford hunter green, oxblood wax seals, and warm brass hardware.",
      accent: "#1b4332",
    },
    {
      id: "futuristic",
      tagline: "Linear & Hardware Sequencer Console",
      description: "Anodized titanium, telemetry OLED panels, electric signal cyan, and precision amber.",
      accent: "#00f0ff",
    },
    {
      id: "aesthetic",
      tagline: "Kinfolk & Museum Editorial Spread",
      description: "Warm alabaster paper, museum double-hairline rules, terracotta accents, and espresso ink.",
      accent: "#c86d51",
    },
    {
      id: "artistic",
      tagline: "Chromatic Watercolor & Gouache Atelier",
      description: "Cold-pressed watercolor wash, studio gesso, ultramarine pigments, and vermilion coral.",
      accent: "#4f46e5",
    },
    {
      id: "minimalist",
      tagline: "Dieter Rams & Vignelli Architectural Ledger",
      description: "Matte alabaster, pitch black carbon ink, Swiss typography, and Braun signal orange.",
      accent: "#ff3b00",
    },
    {
      id: "naturalist",
      tagline: "Living Biophilic Sanctuary & Terraced Landscape",
      description: "Sunlit limestone, deep canopy forest evergreen, living terrariums, and terracotta clay.",
      accent: "#1b3826",
    },
    {
      id: "midnight",
      tagline: "Celestial Observatory & Horological Astrolabe",
      description: "Cosmic obsidian canvas, astrolabe horological brass, celestial indigo, and starlight vectors.",
      accent: "#818cf8",
    },
  ];

  for (const { id, tagline, description, accent } of expectedData) {
    assert.match(
      settingsTs,
      new RegExp(`id:\\s*["']${id}["'][\\s\\S]*?tagline:\\s*["']${tagline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
      `Tagline for ${id} must match`
    );
    assert.match(
      settingsTs,
      new RegExp(`id:\\s*["']${id}["'][\\s\\S]*?description:\\s*["']${description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
      `Description for ${id} must match`
    );
    assert.match(
      settingsTs,
      new RegExp(`id:\\s*["']${id}["'][\\s\\S]*?accent:\\s*["']${accent}["']`),
      `Accent swatch for ${id} must match`
    );
  }
});

// ---------------------------------------------------------------------------
// 6. Habit Completion Invariant Guard (No 01/00 Impossible States)
// ---------------------------------------------------------------------------
test("Phase 11A — Habit completion count never exceeds active habits or counts orphaned logs", () => {
  const pageSrc = readSrc("src/app/page.tsx");
  const queriesSrc = readSrc("src/lib/services/workspace-queries.ts");
  const futuristicSrc = readSrc("src/components/dashboard/futuristic/futuristic-dashboard.tsx");

  assert.match(
    queriesSrc,
    /activeHabitIdSet\.has\(log\.habitId\)/,
    "workspace-queries.ts must filter habit logs by active habits"
  );

  assert.match(
    pageSrc,
    /Math\.min\(\s*activeHabits\.filter/,
    "page.tsx must clamp habitsCompletedCount to activeHabits length"
  );

  assert.match(
    futuristicSrc,
    /Math\.min\(habitsCompletedCount,\s*habitsTotalCount\)/,
    "futuristic-dashboard.tsx must safely clamp habit counter"
  );
});

// ---------------------------------------------------------------------------
// 5. Accessibility & Zero-Reflow Radiogroup Contracts
// ---------------------------------------------------------------------------
test("Phase 11A — ThemePersonalityCard complies with ARIA and keyboard accessibility standards", () => {
  const previewCardSrc = readSrc(PREVIEW_CARD_FILE);
  const settingsSrc = readSrc(SETTINGS_FILE);

  // Settings declares role="radiogroup" with accessible label
  assert.match(
    settingsSrc,
    /role="radiogroup"/,
    "Settings container must have role='radiogroup'"
  );
  assert.match(
    settingsSrc,
    /aria-label="Theme Personalities"/,
    "Settings container must have accessible aria-label"
  );

  // ThemePersonalityCard declares role="radio", tabIndex, aria-checked, data-theme-option
  assert.match(
    previewCardSrc,
    /role="radio"/,
    "ThemePersonalityCard must declare role='radio'"
  );
  assert.match(
    previewCardSrc,
    /tabIndex=\{0\}/,
    "ThemePersonalityCard must be keyboard focusable (tabIndex={0})"
  );
  assert.match(
    previewCardSrc,
    /aria-checked=\{isSelected\}/,
    "ThemePersonalityCard must declare aria-checked={isSelected}"
  );
  assert.match(
    previewCardSrc,
    /data-theme-option=\{meta\.id\}/,
    "ThemePersonalityCard must set data-theme-option attribute"
  );
  assert.match(
    previewCardSrc,
    /e\.key === "Enter" \|\| e\.key === " "/,
    "ThemePersonalityCard must handle Enter and Space keyboard activation"
  );

  // Active indicator badge
  assert.match(
    previewCardSrc,
    /<Badge variant="accent".*>.*Active.*<\/Badge>/s,
    "ThemePersonalityCard must render Active badge when selected"
  );
});
