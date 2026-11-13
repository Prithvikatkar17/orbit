import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("Phase 9D — Settings Theme Preview Cards & System Appearance", async (t) => {
  const settingsPath = path.join(projectRoot, "src/app/settings/page.tsx");
  const settings = fs.readFileSync(settingsPath, "utf-8");

  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  const providerPath = path.join(projectRoot, "src/components/theme-personality-provider.tsx");
  const provider = fs.readFileSync(providerPath, "utf-8");

  await t.test("Settings renders scoped live UI previews for all 7 personalities", () => {
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
        css.includes(`[data-orbit-theme-preview="${theme}"]`),
        `globals.css must define scoped preview selector for ${theme}`
      );
      assert.ok(
        css.includes(`.dark [data-orbit-theme-preview="${theme}"]`),
        `globals.css must define dark mode scoped preview selector for ${theme}`
      );
    }

    assert.ok(settings.includes("data-orbit-theme-preview={meta.id}"), "settings page assigns data-orbit-theme-preview to preview container");
  });

  await t.test("Settings preview cards demonstrate typography, navigation, button, heatmap, and chart", () => {
    assert.ok(settings.includes("ThemeMiniMotif"), "settings page renders ThemeMiniMotif component");
    assert.ok(settings.includes("THEME_SAMPLE_HEADINGS"), "settings page includes distinctive typography headings");
    assert.ok(settings.includes("data-orbit-nav-item"), "preview window renders mini active navigation element");
    assert.ok(settings.includes("orbit-button"), "preview window renders mini action button");
    assert.ok(settings.includes("--orbit-heatmap-"), "preview window renders mini 5-cell heatmap strip");
    assert.ok(settings.includes("--orbit-chart-"), "preview window renders mini 3-bar sparkline chart");
  });

  await t.test("Theme Personality Provider implements rollback on database persistence failure", () => {
    assert.ok(provider.includes("setPersonality(prev)"), "Provider must revert in-memory state on persistence failure");
    assert.ok(provider.includes("document.documentElement.setAttribute(\"data-orbit-theme\", prev)"), "Provider must revert DOM attribute on persistence failure");
    assert.ok(provider.includes("localStorage.setItem(THEME_PERSONALITY_STORAGE_KEY, prev)"), "Provider must revert localStorage on persistence failure");
  });

  await t.test("Settings page handles theme personality selection errors gracefully", () => {
    assert.ok(settings.includes("handleSelectPersonality"), "settings page defines handleSelectPersonality");
    assert.ok(settings.includes("setErrorMessage(\"Failed to save theme personality.\")"), "settings page reports failure to save theme personality");
  });
});

test("Phase 9D — App-Wide Visual Consistency Audit across Modules & Overlays", async (t) => {
  const routes = [
    "src/app/page.tsx",
    "src/app/inbox/page.tsx",
    "src/app/tasks/page.tsx",
    "src/app/habits/page.tsx",
    "src/app/calendar/page.tsx",
    "src/app/library/page.tsx",
    "src/app/insights/page.tsx",
    "src/app/settings/page.tsx",
    "src/app/not-found.tsx",
  ];

  for (const route of routes) {
    await t.test(`Route ${route} avoids legacy colors and uses semantic orbit-* tokens`, () => {
      const src = fs.readFileSync(path.join(projectRoot, route), "utf-8");
      assert.ok(!src.includes("bg-slate-"), `${route} must not contain bg-slate-*`);
      assert.ok(!src.includes("text-slate-"), `${route} must not contain text-slate-*`);
      assert.ok(!src.includes("border-slate-"), `${route} must not contain border-slate-*`);
      assert.ok(!src.includes("bg-indigo-"), `${route} must not contain bg-indigo-*`);
      assert.ok(!src.includes("text-indigo-"), `${route} must not contain text-indigo-*`);
    });
  }

  const overlays = [
    "src/components/ui/confirm-dialog.tsx",
    "src/components/quick-capture-modal.tsx",
    "src/components/tasks/task-modal.tsx",
    "src/components/habits/habit-modal.tsx",
    "src/components/calendar/event-modal.tsx",
    "src/components/inbox/convert-modal.tsx",
    "src/components/library/library-entry-modal.tsx",
    "src/components/library/library-collection-modal.tsx",
    "src/components/library/library-detail-modal.tsx",
    "src/components/search/search-modal.tsx",
  ];

  for (const overlay of overlays) {
    await t.test(`Overlay ${overlay} standardizes on orbit-modal-backdrop and orbit-modal-dialog`, () => {
      const src = fs.readFileSync(path.join(projectRoot, overlay), "utf-8");
      assert.ok(src.includes("orbit-modal-backdrop"), `${overlay} must use orbit-modal-backdrop`);
      assert.ok(src.includes("orbit-modal-dialog"), `${overlay} must use orbit-modal-dialog`);
    });
  }

  await t.test("Event modal has eliminated raw bracketed orbit styles and uses semantic tokens", () => {
    const eventModalSrc = fs.readFileSync(path.join(projectRoot, "src/components/calendar/event-modal.tsx"), "utf-8");
    assert.ok(!eventModalSrc.includes("border-[var(--orbit-border)]"), "event-modal.tsx eliminates raw bracketed border");
    assert.ok(!eventModalSrc.includes("bg-[var(--orbit-surface)]"), "event-modal.tsx eliminates raw bracketed surface");
    assert.ok(eventModalSrc.includes("orbit-input"), "event-modal.tsx adopts orbit-input");
    assert.ok(eventModalSrc.includes("orbit-select"), "event-modal.tsx adopts orbit-select");
  });
});

