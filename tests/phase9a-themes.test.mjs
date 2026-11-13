import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("Phase 9A: Settings Schema & Theme Personalities Metadata", async (t) => {
  const settingsModule = await import("../src/lib/schemas/settings.ts");
  const {
    ThemePersonalitySchema,
    DEFAULT_THEME_PERSONALITY,
    THEME_PERSONALITIES,
    SettingsSchema,
  } = settingsModule;

  await t.test("ThemePersonalitySchema validates all 7 personalities", () => {
    const expected = [
      "archivist",
      "futuristic",
      "aesthetic",
      "artistic",
      "minimalist",
      "naturalist",
      "midnight",
    ];

    assert.equal(expected.length, 7);
    for (const key of expected) {
      const res = ThemePersonalitySchema.safeParse(key);
      assert.ok(res.success, `Expected personality "${key}" to be valid`);
      assert.equal(res.data, key);
    }

    const invalid = ThemePersonalitySchema.safeParse("cyberpunk");
    assert.equal(invalid.success, false);
  });

  await t.test("DEFAULT_THEME_PERSONALITY is archivist", () => {
    assert.equal(DEFAULT_THEME_PERSONALITY, "archivist");
  });

  await t.test("THEME_PERSONALITIES contains metadata for all 7 personalities", () => {
    assert.equal(THEME_PERSONALITIES.length, 7);
    const keys = THEME_PERSONALITIES.map((p) => p.id);
    assert.deepEqual(keys.sort(), [
      "aesthetic",
      "archivist",
      "artistic",
      "futuristic",
      "midnight",
      "minimalist",
      "naturalist",
    ]);

    for (const p of THEME_PERSONALITIES) {
      assert.ok(p.name && p.name.length > 0, `Missing name for ${p.id}`);
      assert.ok(p.tagline && p.tagline.length > 0, `Missing tagline for ${p.id}`);
      assert.ok(p.description && p.description.length > 0, `Missing description for ${p.id}`);
      assert.ok(p.swatches.bg, `Missing swatches.bg for ${p.id}`);
      assert.ok(p.swatches.surface, `Missing swatches.surface for ${p.id}`);
      assert.ok(p.swatches.accent, `Missing swatches.accent for ${p.id}`);
      assert.ok(p.swatches.secondary, `Missing swatches.secondary for ${p.id}`);
    }
  });

  await t.test("SettingsSchema defaults themePersonality to archivist when omitted (backward compatibility)", () => {
    const rawData = {
      id: "user_settings",
      updatedAt: new Date().toISOString(),
    };

    const parsed = SettingsSchema.parse(rawData);
    assert.equal(parsed.themePersonality, "archivist");
    assert.equal(parsed.theme, "system");
  });

  await t.test("SettingsSchema accepts explicit themePersonality values", () => {
    const rawData = {
      id: "user_settings",
      themePersonality: "futuristic",
      theme: "dark",
      updatedAt: new Date().toISOString(),
    };

    const parsed = SettingsSchema.parse(rawData);
    assert.equal(parsed.themePersonality, "futuristic");
    assert.equal(parsed.theme, "dark");
  });
});

test("Phase 9A: CSS Design Tokens in globals.css", async (t) => {
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  const personalities = [
    "archivist",
    "futuristic",
    "aesthetic",
    "artistic",
    "minimalist",
    "naturalist",
    "midnight",
  ];

  await t.test("globals.css defines all 7 theme personalities in light mode", () => {
    for (const p of personalities) {
      const pattern = new RegExp(`data-orbit-theme=["']${p}["']`);
      assert.ok(
        pattern.test(css),
        `globals.css must contain data-orbit-theme selector for "${p}"`
      );
    }
  });

  await t.test("globals.css defines dark mode variants for all 7 personalities", () => {
    for (const p of personalities) {
      const pattern = new RegExp(
        `data-orbit-theme=["']${p}["']\\]\\.dark|data-orbit-theme=["']${p}["']\\] \\.dark`
      );
      assert.ok(
        pattern.test(css),
        `globals.css must contain dark mode selector for "${p}"`
      );
    }
  });

  await t.test("Essential semantic tokens are defined for each theme personality", () => {
    const requiredTokens = [
      "--orbit-bg",
      "--orbit-surface",
      "--orbit-surface-secondary",
      "--orbit-surface-elevated",
      "--orbit-text",
      "--orbit-text-secondary",
      "--orbit-text-muted",
      "--orbit-accent",
      "--orbit-accent-hover",
      "--orbit-accent-fg",
      "--orbit-accent-soft",
      "--orbit-accent-secondary",
      "--orbit-accent-secondary-soft",
      "--orbit-border",
      "--orbit-border-strong",
      "--orbit-focus-ring",
      "--orbit-success",
      "--orbit-warning",
      "--orbit-danger",
    ];

    for (const token of requiredTokens) {
      assert.ok(
        css.includes(token),
        `globals.css must define token "${token}"`
      );
    }
  });

  await t.test("Distinct geometry and visual identity tokens are defined across personalities", () => {
    // Assert distinct radii per personality
    assert.ok(css.includes("--orbit-radius-card: 0.375rem"), "Futuristic defines 0.375rem sharp card radius");
    assert.ok(css.includes("--orbit-radius-card: 0.125rem"), "Minimalist defines 0.125rem hairline Bauhaus card radius");
    assert.ok(css.includes("--orbit-radius-card: 1.25rem"), "Aesthetic defines 1.25rem pillowy card radius");
    assert.ok(css.includes("--orbit-radius-card: 1rem"), "Naturalist defines 1rem organic card radius");
    assert.ok(css.includes("--orbit-radius-card: 0.75rem"), "Archivist defines 0.75rem editorial card radius");

    // Assert atmospheric patterns
    assert.ok(css.includes("--orbit-bg-pattern"), "globals.css defines --orbit-bg-pattern atmospheric treatments");
    assert.ok(css.includes("--orbit-card-blur"), "globals.css defines --orbit-card-blur glassmorphic tokens");
    assert.ok(css.includes("[data-orbit-nav-item]"), "globals.css defines personality navigation treatments");
  });

  await t.test("Phase 9B.2: Visualisation and Chart Design Tokens are defined across all 7 personalities", () => {
    const vizTokens = [
      "--orbit-chart-1",
      "--orbit-chart-2",
      "--orbit-chart-3",
      "--orbit-chart-4",
      "--orbit-chart-5",
      "--orbit-chart-positive",
      "--orbit-chart-neutral",
      "--orbit-chart-negative",
      "--orbit-chart-grid",
      "--orbit-chart-axis",
      "--orbit-chart-tooltip-bg",
      "--orbit-chart-tooltip-border",
      "--orbit-chart-tooltip-text",
      "--orbit-progress-track",
      "--orbit-progress-fill",
      "--orbit-chart-highlight",
      "--orbit-heatmap-0",
      "--orbit-heatmap-1",
      "--orbit-heatmap-2",
      "--orbit-heatmap-3",
      "--orbit-heatmap-4",
    ];

    for (const token of vizTokens) {
      assert.ok(
        css.includes(token),
        `globals.css must define visualisation token "${token}"`
      );
    }
  });

  await t.test("Phase 9B.3: EmptyState component defines distinctive motifs across all 7 theme personalities", () => {
    const emptyStatePath = path.join(projectRoot, "src/components/ui/empty-state.tsx");
    const emptyStateSrc = fs.readFileSync(emptyStatePath, "utf-8");

    const expectedMotifs = [
      "orbit-empty-motif-archivist",
      "orbit-empty-motif-futuristic",
      "orbit-empty-motif-aesthetic",
      "orbit-empty-motif-artistic",
      "orbit-empty-motif-minimalist",
      "orbit-empty-motif-naturalist",
      "orbit-empty-motif-midnight",
    ];

    for (const motif of expectedMotifs) {
      assert.ok(
        emptyStateSrc.includes(motif),
        `empty-state.tsx must include motif class "${motif}"`
      );
      assert.ok(
        css.includes(motif),
        `globals.css must define display rules for motif class "${motif}"`
      );
    }

    assert.ok(emptyStateSrc.includes("orbit-empty-aura"), "empty-state.tsx defines atmospheric aura backdrop");
    assert.ok(emptyStateSrc.includes("orbit-empty-badge"), "empty-state.tsx defines eyebrow badge support");

    // Verify module integrations across all 8 modules
    const searchModalSrc = fs.readFileSync(path.join(projectRoot, "src/components/search/search-modal.tsx"), "utf-8");
    assert.ok(searchModalSrc.includes("<EmptyState"), "search-modal.tsx integrates EmptyState");
    assert.ok(searchModalSrc.includes('eyebrow="SEARCH INDEX"'), "search-modal.tsx includes SEARCH INDEX eyebrow");

    const taskDistSrc = fs.readFileSync(path.join(projectRoot, "src/components/insights/task-distribution.tsx"), "utf-8");
    assert.ok(taskDistSrc.includes("<EmptyState"), "task-distribution.tsx integrates EmptyState");
    assert.ok(taskDistSrc.includes('eyebrow="ALLOCATION"'), "task-distribution.tsx includes ALLOCATION eyebrow");

    const habitBreakdownSrc = fs.readFileSync(path.join(projectRoot, "src/components/insights/habit-breakdown.tsx"), "utf-8");
    assert.ok(habitBreakdownSrc.includes("<EmptyState"), "habit-breakdown.tsx integrates EmptyState");
    assert.ok(habitBreakdownSrc.includes('eyebrow="CADENCE"'), "habit-breakdown.tsx includes CADENCE eyebrow");

    const recentAccSrc = fs.readFileSync(path.join(projectRoot, "src/components/insights/recent-accomplishments.tsx"), "utf-8");
    assert.ok(recentAccSrc.includes("<EmptyState"), "recent-accomplishments.tsx integrates EmptyState");
    assert.ok(recentAccSrc.includes('eyebrow="MILESTONES"'), "recent-accomplishments.tsx includes MILESTONES eyebrow");

    const dashboardSrc = fs.readFileSync(path.join(projectRoot, "src/app/page.tsx"), "utf-8");
    assert.ok(dashboardSrc.includes('eyebrow="MOMENTUM"'), "page.tsx defines MOMENTUM eyebrow");
    assert.ok(dashboardSrc.includes('eyebrow="DAILY RHYTHM"'), "page.tsx defines DAILY RHYTHM eyebrow");

    const inboxSrc = fs.readFileSync(path.join(projectRoot, "src/app/inbox/page.tsx"), "utf-8");
    assert.ok(inboxSrc.includes("<EmptyState"), "inbox/page.tsx integrates EmptyState");

    const tasksSrc = fs.readFileSync(path.join(projectRoot, "src/app/tasks/page.tsx"), "utf-8");
    assert.ok(tasksSrc.includes('eyebrow="WORK STREAM"'), "tasks/page.tsx defines WORK STREAM eyebrow");

    const habitsSrc = fs.readFileSync(path.join(projectRoot, "src/app/habits/page.tsx"), "utf-8");
    assert.ok(habitsSrc.includes('eyebrow="DAILY CADENCE"'), "habits/page.tsx defines DAILY CADENCE eyebrow");

    const calSrc = fs.readFileSync(path.join(projectRoot, "src/app/calendar/page.tsx"), "utf-8");
    assert.ok(calSrc.includes('eyebrow="SCHEDULE HORIZON"'), "calendar/page.tsx defines SCHEDULE HORIZON eyebrow");

    const librarySrc = fs.readFileSync(path.join(projectRoot, "src/app/library/page.tsx"), "utf-8");
    assert.ok(librarySrc.includes('eyebrow="CATALOGUE ARCHIVE"'), "library/page.tsx defines CATALOGUE ARCHIVE eyebrow");
  });
});

test("Phase 9A: Layout & Pre-hydration Flash Prevention", async (t) => {
  const layoutPath = path.join(projectRoot, "src/app/layout.tsx");
  const layout = fs.readFileSync(layoutPath, "utf-8");

  await t.test("layout.tsx includes ThemePersonalityProvider", () => {
    assert.ok(
      layout.includes("ThemePersonalityProvider"),
      "layout.tsx must wrap application in ThemePersonalityProvider"
    );
  });

  await t.test("layout.tsx includes pre-hydration synchronous theme script to prevent flash", () => {
    assert.ok(
      layout.includes("orbit-theme-personality"),
      "layout.tsx must read orbit-theme-personality in pre-hydration script"
    );
    assert.ok(
      layout.includes("data-orbit-theme"),
      "layout.tsx must set data-orbit-theme attribute synchronously"
    );
  });
});

test("Phase 9A: Settings Page Theme Integration", async (t) => {
  const settingsPath = path.join(projectRoot, "src/app/settings/page.tsx");
  const settings = fs.readFileSync(settingsPath, "utf-8");

  await t.test("settings page consumes useThemePersonality", () => {
    assert.ok(
      settings.includes("useThemePersonality"),
      "settings page must consume useThemePersonality hook"
    );
    assert.ok(
      settings.includes("setThemePersonality"),
      "settings page must provide setThemePersonality"
    );
  });

  await t.test("settings page renders 7 theme personality options", () => {
    assert.ok(
      settings.includes("THEME_PERSONALITIES"),
      "settings page must map over THEME_PERSONALITIES"
    );
    assert.ok(
      settings.includes("data-theme-option"),
      "settings page should provide testable data-theme-option attributes"
    );
  });

  await t.test("Theme Personality and Appearance Mode remain independent sections", () => {
    assert.ok(
      settings.includes("Theme Personality"),
      "settings page must have Theme Personality section"
    );
    assert.ok(
      settings.includes("Appearance Mode"),
      "settings page must have distinct Appearance Mode section"
    );
  });
});

test("Phase 9C: Personality-Specific Interactive Components System", async (t) => {
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  await t.test("globals.css defines interactive component rules across all personalities", () => {
    const requiredRules = [
      ".orbit-modal-backdrop",
      ".orbit-modal-dialog",
      ".orbit-button",
      ".orbit-input",
      ".orbit-textarea",
      ".orbit-select",
      ".orbit-card-interactive",
      ".orbit-notification-panel",
      ".orbit-notification-dot",
      ".orbit-search-item",
      ".orbit-filter-tab",
    ];

    for (const rule of requiredRules) {
      assert.ok(
        css.includes(rule),
        `globals.css must define interactive component class "${rule}"`
      );
    }
  });

  await t.test("Shared UI components adopt interactive classes", () => {
    const buttonSrc = fs.readFileSync(path.join(projectRoot, "src/components/ui/button.tsx"), "utf-8");
    assert.ok(buttonSrc.includes("orbit-button"), "button.tsx adopts orbit-button");

    const surfaceCardSrc = fs.readFileSync(path.join(projectRoot, "src/components/ui/surface-card.tsx"), "utf-8");
    assert.ok(surfaceCardSrc.includes("orbit-card-interactive"), "surface-card.tsx adopts orbit-card-interactive");

    const formFieldSrc = fs.readFileSync(path.join(projectRoot, "src/components/ui/form-field.tsx"), "utf-8");
    assert.ok(formFieldSrc.includes("orbit-input"), "form-field.tsx adopts orbit-input");
    assert.ok(formFieldSrc.includes("orbit-textarea"), "form-field.tsx adopts orbit-textarea");
    assert.ok(formFieldSrc.includes("orbit-select"), "form-field.tsx adopts orbit-select");

    const confirmSrc = fs.readFileSync(path.join(projectRoot, "src/components/ui/confirm-dialog.tsx"), "utf-8");
    assert.ok(confirmSrc.includes("orbit-modal-backdrop"), "confirm-dialog.tsx adopts orbit-modal-backdrop");
    assert.ok(confirmSrc.includes("orbit-modal-dialog"), "confirm-dialog.tsx adopts orbit-modal-dialog");

    const notifSrc = fs.readFileSync(path.join(projectRoot, "src/components/reminders/notification-center.tsx"), "utf-8");
    assert.ok(notifSrc.includes("orbit-notification-panel"), "notification-center.tsx adopts orbit-notification-panel");
    assert.ok(notifSrc.includes("orbit-notification-dot"), "notification-center.tsx adopts orbit-notification-dot");

    const searchSrc = fs.readFileSync(path.join(projectRoot, "src/components/search/search-modal.tsx"), "utf-8");
    assert.ok(searchSrc.includes("orbit-modal-backdrop"), "search-modal.tsx adopts orbit-modal-backdrop");
    assert.ok(searchSrc.includes("orbit-modal-dialog"), "search-modal.tsx adopts orbit-modal-dialog");
    assert.ok(searchSrc.includes("orbit-filter-tab"), "search-modal.tsx adopts orbit-filter-tab");

    const searchItemSrc = fs.readFileSync(path.join(projectRoot, "src/components/search/search-result-item.tsx"), "utf-8");
    assert.ok(searchItemSrc.includes("orbit-search-item"), "search-result-item.tsx adopts orbit-search-item");
  });

  await t.test("Application modals adopt standardized orbit-modal-backdrop and orbit-modal-dialog", () => {
    const modals = [
      "src/components/quick-capture-modal.tsx",
      "src/components/tasks/task-modal.tsx",
      "src/components/habits/habit-modal.tsx",
      "src/components/calendar/event-modal.tsx",
      "src/components/inbox/convert-modal.tsx",
      "src/components/library/library-entry-modal.tsx",
      "src/components/library/library-collection-modal.tsx",
      "src/components/library/library-detail-modal.tsx",
    ];

    for (const modalRelPath of modals) {
      const modalSrc = fs.readFileSync(path.join(projectRoot, modalRelPath), "utf-8");
      assert.ok(
        modalSrc.includes("orbit-modal-backdrop"),
        `${modalRelPath} must include "orbit-modal-backdrop"`
      );
      assert.ok(
        modalSrc.includes("orbit-modal-dialog"),
        `${modalRelPath} must include "orbit-modal-dialog"`
      );
    }
  });
});


