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

const SEARCH_MODAL_FILE = "src/components/search/search-modal.tsx";
const SEARCH_ITEM_FILE = "src/components/search/search-result-item.tsx";
const QUICK_CAPTURE_FILE = "src/components/quick-capture-modal.tsx";
const GLOBALS_CSS = "src/app/globals.css";

// ---------------------------------------------------------------------------
// 1. Zero GPU Blur Tax Rule Across All Modals & Scrims
// ---------------------------------------------------------------------------
test("Phase 11C — Zero GPU Blur Tax: No backdrop-blur classes in overlays", () => {
  const searchSrc = readSrc(SEARCH_MODAL_FILE);
  const searchItemSrc = readSrc(SEARCH_ITEM_FILE);
  const quickCaptureSrc = readSrc(QUICK_CAPTURE_FILE);

  assert.ok(
    !searchSrc.includes("backdrop-blur"),
    "search-modal.tsx must not contain any backdrop-blur classes"
  );
  assert.ok(
    !searchItemSrc.includes("backdrop-blur"),
    "search-result-item.tsx must not contain any backdrop-blur classes"
  );
  assert.ok(
    !quickCaptureSrc.includes("backdrop-blur"),
    "quick-capture-modal.tsx must not contain any backdrop-blur classes"
  );
});

test("Phase 11C — Zero GPU Blur Tax: globals.css sets backdrop-filter: none !important on all modals", () => {
  const css = readSrc(GLOBALS_CSS);

  assert.match(
    css,
    /\.orbit-modal-backdrop\s*\{[^}]*backdrop-filter:\s*none\s*!important/s,
    ".orbit-modal-backdrop must enforce backdrop-filter: none !important"
  );

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
      css.includes(`[data-orbit-theme="${theme}"] .orbit-modal-backdrop`),
      `globals.css must define backdrop for '${theme}'`
    );
  }
});

// ---------------------------------------------------------------------------
// 2. Command Palette (SearchModal): 7 Bespoke Architectural Bezel Strips
// ---------------------------------------------------------------------------
test("Phase 11C — Command Palette contains bespoke 7-personality top bezels", () => {
  const searchSrc = readSrc(SEARCH_MODAL_FILE);

  // 1. Archivist: Bound Folio Codex Rubric Bar
  assert.match(
    searchSrc,
    /search-bezel-archivist/,
    "SearchModal must render search-bezel-archivist"
  );
  assert.match(
    searchSrc,
    /EX LIBRIS INDEX \/\/ UNIVERSAL CODEX SEARCH/,
    "Archivist must render EX LIBRIS INDEX rubric bar"
  );
  assert.ok(
    searchSrc.includes("❦"),
    "Archivist must render fleuron mark"
  );

  // 2. Futuristic: Anodized Command Deck with pulsing LED & hex screws
  assert.match(
    searchSrc,
    /search-bezel-futuristic/,
    "SearchModal must render search-bezel-futuristic"
  );
  assert.match(
    searchSrc,
    /SYS\.SEARCH \/\/ INDEX READY/,
    "Futuristic must render SYS.SEARCH // INDEX READY"
  );
  assert.ok(
    searchSrc.includes("⊕"),
    "Futuristic must render hex screw marker ⊕"
  );

  // 3. Aesthetic: Kinfolk Archive Editorial Masthead
  assert.match(
    searchSrc,
    /search-bezel-aesthetic/,
    "SearchModal must render search-bezel-aesthetic"
  );
  assert.match(
    searchSrc,
    /SECTION SEARCH · KINFOLK ARCHIVE/,
    "Aesthetic must render SECTION SEARCH · KINFOLK ARCHIVE"
  );

  // 4. Artistic: Atelier Chromatic Palette Wash Strip
  assert.match(
    searchSrc,
    /search-bezel-artistic/,
    "SearchModal must render search-bezel-artistic"
  );
  assert.match(
    searchSrc,
    /ATELIER ORBIT · PALETTE SEARCH/,
    "Artistic must render ATELIER ORBIT · PALETTE SEARCH"
  );

  // 5. Minimalist: 2px Signal Orange filament & Stark System Query
  assert.match(
    searchSrc,
    /search-bezel-minimalist/,
    "SearchModal must render search-bezel-minimalist"
  );
  assert.match(
    searchSrc,
    /SYSTEM SEARCH \/\/ UNIVERSAL QUERY/,
    "Minimalist must render SYSTEM SEARCH // UNIVERSAL QUERY"
  );
  assert.ok(
    searchSrc.includes("#ff3b00"),
    "Minimalist must include signal orange #ff3b00 filament"
  );

  // 6. Naturalist: Conservatory Herbarium Canopy Bezel
  assert.match(
    searchSrc,
    /search-bezel-naturalist/,
    "SearchModal must render search-bezel-naturalist"
  );
  assert.match(
    searchSrc,
    /CONSERVATORY HERBARIUM · INDEX SEARCH/,
    "Naturalist must render CONSERVATORY HERBARIUM"
  );
  assert.ok(
    searchSrc.includes("🌱"),
    "Naturalist must include botanical sprout marker"
  );

  // 7. Midnight: Celestial Ephemeris Zenith Bezel
  assert.match(
    searchSrc,
    /search-bezel-midnight/,
    "SearchModal must render search-bezel-midnight"
  );
  assert.match(
    searchSrc,
    /OBSERVATORY EPHEMERIS SEARCH \/\/ CELESTIAL INDEX/,
    "Midnight must render OBSERVATORY EPHEMERIS SEARCH"
  );
});

test("Phase 11C — Command Palette adapts typography, filter tabs, and corner geometry", () => {
  const searchSrc = readSrc(SEARCH_MODAL_FILE);

  // Dialog radius adaptation
  assert.match(
    searchSrc,
    /isMinimalist\s*\?\s*["']rounded-none/,
    "Minimalist dialog must have rounded-none"
  );
  assert.match(
    searchSrc,
    /isFuturistic\s*\?\s*["']rounded-\[12px\]/,
    "Futuristic dialog must have rounded-[12px]"
  );
  assert.match(
    searchSrc,
    /isArchivist\s*\?\s*["']rounded-\[14px\]/,
    "Archivist dialog must have rounded-[14px]"
  );

  // Input typography adaptation
  assert.ok(
    searchSrc.includes("isArchivist"),
    "Archivist must apply font-serif to input"
  );
  assert.ok(
    searchSrc.includes("isFuturistic"),
    "Futuristic must apply font-mono to input"
  );

  // Filter tabs adaptation
  assert.ok(
    searchSrc.includes("isNaturalist"),
    "Naturalist must use rounded-full river-stone pill tabs"
  );
  assert.ok(
    searchSrc.includes("isMinimalist"),
    "Minimalist must use rounded-none tabs"
  );
});

test("Phase 11C — SearchResultItem renders midnight starlight marker and personality active pills", () => {
  const itemSrc = readSrc(SEARCH_ITEM_FILE);

  // Midnight starlight marker
  assert.ok(
    itemSrc.includes("✦"),
    "SearchResultItem must render ✦ starlight indicator when selected in midnight theme"
  );
  assert.ok(
    itemSrc.includes("isMidnight"),
    "SearchResultItem must explicitly handle isMidnight"
  );

  // Minimalist razor active pill
  assert.ok(
    itemSrc.includes("isMinimalist"),
    "SearchResultItem must explicitly handle isMinimalist with sharp active indicator"
  );
  assert.ok(
    itemSrc.includes("#ff3b00"),
    "SearchResultItem must use #ff3b00 in minimalist active pill"
  );
});

// ---------------------------------------------------------------------------
// 3. Quick Capture Modal: 7 Bespoke Top Bezels & Tactile Selector Pills
// ---------------------------------------------------------------------------
test("Phase 11C — QuickCaptureModal contains bespoke 7-personality top bezels", () => {
  const quickSrc = readSrc(QUICK_CAPTURE_FILE);

  assert.match(
    quickSrc,
    /quick-capture-bezel-archivist/,
    "QuickCaptureModal must render quick-capture-bezel-archivist"
  );
  assert.match(
    quickSrc,
    /EX LIBRIS SCRIPTO \/\/ QUICK CAPTURE/,
    "Archivist must render EX LIBRIS SCRIPTO"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-futuristic/,
    "QuickCaptureModal must render quick-capture-bezel-futuristic"
  );
  assert.match(
    quickSrc,
    /SYS\.CAPTURE \/\/ BUFFER READY/,
    "Futuristic must render SYS.CAPTURE // BUFFER READY"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-aesthetic/,
    "QuickCaptureModal must render quick-capture-bezel-aesthetic"
  );
  assert.match(
    quickSrc,
    /SECTION CAPTURE · KINFOLK ARCHIVE/,
    "Aesthetic must render SECTION CAPTURE · KINFOLK ARCHIVE"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-artistic/,
    "QuickCaptureModal must render quick-capture-bezel-artistic"
  );
  assert.match(
    quickSrc,
    /ATELIER ORBIT · QUICK CAPTURE/,
    "Artistic must render ATELIER ORBIT · QUICK CAPTURE"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-minimalist/,
    "QuickCaptureModal must render quick-capture-bezel-minimalist"
  );
  assert.match(
    quickSrc,
    /SYSTEM CAPTURE \/\/ QUICK REGISTER/,
    "Minimalist must render SYSTEM CAPTURE // QUICK REGISTER"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-naturalist/,
    "QuickCaptureModal must render quick-capture-bezel-naturalist"
  );
  assert.match(
    quickSrc,
    /CONSERVATORY FIELD LOG \/\/ CAPTURE/,
    "Naturalist must render CONSERVATORY FIELD LOG // CAPTURE"
  );

  assert.match(
    quickSrc,
    /quick-capture-bezel-midnight/,
    "QuickCaptureModal must render quick-capture-bezel-midnight"
  );
  assert.match(
    quickSrc,
    /OBSERVATORY EPHEMERIS \/\/ QUICK LOG/,
    "Midnight must render OBSERVATORY EPHEMERIS // QUICK LOG"
  );
});

test("Phase 11C — QuickCaptureModal contains tactile entity type and priority selector pills", () => {
  const quickSrc = readSrc(QUICK_CAPTURE_FILE);

  // Entity type selector pills
  assert.ok(
    quickSrc.includes("QUICK_TYPES"),
    "QuickCaptureModal must define QUICK_TYPES for tactile pills"
  );
  assert.ok(
    quickSrc.includes("Inbox"),
    "QuickCaptureModal must offer Inbox pill"
  );
  assert.ok(
    quickSrc.includes("Habit"),
    "QuickCaptureModal must offer Habit pill"
  );
  assert.ok(
    quickSrc.includes("Task"),
    "QuickCaptureModal must offer Task pill"
  );

  // Priority selector pills
  assert.ok(
    quickSrc.includes('"low", "medium", "high"'),
    "QuickCaptureModal must iterate over low, medium, high priorities"
  );

  // Theme harmonized submit button
  assert.ok(
    quickSrc.includes("!bg-[#ff3b00]"),
    "Submit button must use signal orange in minimalist"
  );
  assert.ok(
    quickSrc.includes("!bg-[#00f0ff]"),
    "Submit button must use cyan in futuristic"
  );
  assert.ok(
    quickSrc.includes("!bg-[#1b4332]"),
    "Submit button must use hunter green in archivist"
  );
});

// ---------------------------------------------------------------------------
// 4. Accessibility & Dialog Semantics
// ---------------------------------------------------------------------------
test("Phase 11C — Overlays preserve WCAG accessibility semantics", () => {
  const searchSrc = readSrc(SEARCH_MODAL_FILE);
  const quickSrc = readSrc(QUICK_CAPTURE_FILE);

  // Search modal semantics
  assert.match(searchSrc, /role="dialog"/, "SearchModal must have role=dialog");
  assert.match(searchSrc, /aria-modal="true"/, "SearchModal must have aria-modal=true");
  assert.match(searchSrc, /aria-labelledby=/, "SearchModal must have aria-labelledby");
  assert.match(searchSrc, /role="combobox"/, "Search input must have role=combobox");
  assert.match(searchSrc, /role="listbox"/, "Search results must have role=listbox");
  assert.match(searchSrc, /role="tablist"/, "Filter tabs must have role=tablist");

  // Quick capture modal semantics
  assert.match(quickSrc, /role="dialog"/, "QuickCaptureModal must have role=dialog");
  assert.match(quickSrc, /aria-modal="true"/, "QuickCaptureModal must have aria-modal=true");
  assert.match(quickSrc, /aria-labelledby=/, "QuickCaptureModal must have aria-labelledby");
});
