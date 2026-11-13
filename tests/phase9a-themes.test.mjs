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

