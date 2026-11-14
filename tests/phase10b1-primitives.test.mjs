import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("Phase 10B.1: Core Primitives Refinement — Button Component & Styling", async (t) => {
  const buttonPath = path.join(projectRoot, "src/components/ui/button.tsx");
  const buttonSrc = fs.readFileSync(buttonPath, "utf-8");
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const cssSrc = fs.readFileSync(cssPath, "utf-8");

  await t.test("Button adopts .orbit-button class and touch-friendly minimum sizes", () => {
    assert.ok(buttonSrc.includes("orbit-button"), "Button must have .orbit-button class");
    assert.ok(buttonSrc.includes("min-h-[40px]"), "Button sm has touch min-height");
    assert.ok(buttonSrc.includes("min-h-[44px]"), "Button md/lg has standard 44px touch min-height");
    assert.ok(buttonSrc.includes("select-none"), "Button prevents text selection during rapid clicks");
    assert.ok(buttonSrc.includes("cursor-pointer"), "Button specifies pointer cursor");
  });

  await t.test("Button defines lightweight spring transitions and active compression", () => {
    assert.ok(
      cssSrc.includes("cubic-bezier(0.16, 1, 0.3, 1)"),
      ".orbit-button must define smooth micro-spring transition curve"
    );
    assert.ok(
      cssSrc.includes(".orbit-button:active:not(:disabled)"),
      ".orbit-button must have default :active:not(:disabled) compression"
    );
  });

  await t.test("Button implements distinctive active, hover, and focus across all 7 themes", () => {
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
        cssSrc.includes(`:root[data-orbit-theme="${theme}"] .orbit-button:active`) ||
          (theme === "archivist" && cssSrc.includes(`:root:not([data-orbit-theme]) .orbit-button:active`)),
        `Must define button :active state for theme "${theme}"`
      );
      assert.ok(
        cssSrc.includes(`:root[data-orbit-theme="${theme}"] .orbit-button:focus-visible`) ||
          (theme === "archivist" && cssSrc.includes(`:root:not([data-orbit-theme]) .orbit-button:focus-visible`)),
        `Must define button :focus-visible state for theme "${theme}"`
      );
    }
  });

  await t.test("Futuristic and Minimalist have high-contrast focus rings", () => {
    assert.ok(
      cssSrc.includes(':root[data-orbit-theme="futuristic"] .orbit-button:focus-visible'),
      "Futuristic has HUD focus glow"
    );
    assert.ok(
      cssSrc.includes(':root[data-orbit-theme="minimalist"] .orbit-button:focus-visible'),
      "Minimalist has crisp high-contrast focus outline"
    );
  });
});

test("Phase 10B.1: Core Primitives Refinement — SurfaceCard Component & Styling", async (t) => {
  const cardPath = path.join(projectRoot, "src/components/ui/surface-card.tsx");
  const cardSrc = fs.readFileSync(cardPath, "utf-8");
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const cssSrc = fs.readFileSync(cssPath, "utf-8");

  await t.test("SurfaceCard adopts .orbit-surface-card and .orbit-card-interactive classes", () => {
    assert.ok(cardSrc.includes("orbit-surface-card"), "SurfaceCard must have .orbit-surface-card base class");
    assert.ok(cardSrc.includes("orbit-card-interactive"), "SurfaceCard interactive has .orbit-card-interactive class");
    assert.ok(cardSrc.includes("focus-visible:outline-2"), "SurfaceCard interactive provides keyboard focus ring");
  });

  await t.test("SurfaceCard implements theme-specific hover and depth across all 7 themes", () => {
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
        cssSrc.includes(`:root[data-orbit-theme="${theme}"] .orbit-card-interactive:hover`) ||
          (theme === "archivist" && cssSrc.includes(`:root:not([data-orbit-theme]) .orbit-card-interactive:hover`)),
        `Must define card hover state for theme "${theme}"`
      );
      assert.ok(
        cssSrc.includes(`:root[data-orbit-theme="${theme}"] .orbit-card-interactive:focus-visible`) ||
          (theme === "archivist" && cssSrc.includes(`:root:not([data-orbit-theme]) .orbit-card-interactive:focus-visible`)),
        `Must define card focus-visible state for theme "${theme}"`
      );
    }
  });

  await t.test("Cards support Dark mode adaptations", () => {
    assert.ok(
      cssSrc.includes('.dark:root[data-orbit-theme="futuristic"] .orbit-card-interactive:hover'),
      "Futuristic card defines dark mode cyan hover glow"
    );
  });
});

test("Phase 10B.1: Core Primitives Refinement — prefers-reduced-motion Support", async (t) => {
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const cssSrc = fs.readFileSync(cssPath, "utf-8");

  await t.test("prefers-reduced-motion suppresses motion transforms and transitions on buttons and cards", () => {
    assert.ok(cssSrc.includes("@media (prefers-reduced-motion: reduce)"), "Must declare prefers-reduced-motion");
    assert.ok(cssSrc.includes(".orbit-button"), "Reduced motion must target .orbit-button");
    assert.ok(cssSrc.includes(".orbit-card-interactive"), "Reduced motion must target .orbit-card-interactive");
    assert.ok(cssSrc.includes(".orbit-surface-card"), "Reduced motion must target .orbit-surface-card");
    assert.ok(cssSrc.includes("transform: none !important"), "Reduced motion must disable transforms");
    assert.ok(cssSrc.includes("transition: none !important"), "Reduced motion must disable transitions");
  });
});
