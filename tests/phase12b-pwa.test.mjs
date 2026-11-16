import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

test("Phase 12B: PWA Manifest & Metadata Verification", async (t) => {
  await t.test("public/manifest.json exists, is valid JSON, and contains required PWA fields", () => {
    const manifestPath = path.join(ROOT_DIR, "public", "manifest.json");
    assert.ok(fs.existsSync(manifestPath), "public/manifest.json must exist");

    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    assert.equal(manifest.name, "ORBIT Personal Space");
    assert.equal(manifest.short_name, "ORBIT");
    assert.equal(manifest.start_url, "/");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.orientation, "portrait");
    assert.equal(manifest.theme_color, "#03050c");
    assert.equal(manifest.background_color, "#03050c");

    assert.ok(Array.isArray(manifest.icons), "manifest.icons must be an array");
    const icon192 = manifest.icons.find((i) => i.sizes === "192x192");
    const icon512 = manifest.icons.find((i) => i.sizes === "512x512");
    assert.ok(icon192, "manifest must declare 192x192 icon");
    assert.ok(icon512, "manifest must declare 512x512 icon");
  });

  await t.test("public/icons directory contains high-craft PNG and SVG assets", () => {
    const iconsDir = path.join(ROOT_DIR, "public", "icons");
    assert.ok(fs.existsSync(iconsDir), "public/icons must exist");

    const requiredIcons = [
      "icon.svg",
      "icon-192x192.png",
      "icon-512x512.png",
      "apple-touch-icon.png",
    ];

    for (const icon of requiredIcons) {
      const iconPath = path.join(iconsDir, icon);
      assert.ok(fs.existsSync(iconPath), `${icon} must exist in public/icons`);
      const stat = fs.statSync(iconPath);
      assert.ok(stat.size > 500, `${icon} must not be empty or degenerate`);
    }
  });

  await t.test("next.config.mjs integrates @serwist/next with App Router", () => {
    const configPath = path.join(ROOT_DIR, "next.config.mjs");
    assert.ok(fs.existsSync(configPath), "next.config.mjs must exist");

    const content = fs.readFileSync(configPath, "utf-8");
    assert.match(content, /@serwist\/next/);
    assert.match(content, /swSrc:\s*["']src\/app\/sw\.ts["']/);
    assert.match(content, /swDest:\s*["']public\/sw\.js["']/);
  });

  await t.test("src/app/sw.ts configures Serwist offline caching and event listeners", () => {
    const swPath = path.join(ROOT_DIR, "src", "app", "sw.ts");
    assert.ok(fs.existsSync(swPath), "src/app/sw.ts must exist");

    const content = fs.readFileSync(swPath, "utf-8");
    assert.match(content, /import \{ Serwist \} from ["']serwist["']/);
    assert.match(content, /import \{ defaultCache \} from ["']@serwist\/next\/worker["']/);
    assert.match(content, /serwist\.addEventListeners\(\)/);
  });

  await t.test("src/app/layout.tsx exports PWA viewport and metadata links", () => {
    const layoutPath = path.join(ROOT_DIR, "src", "app", "layout.tsx");
    assert.ok(fs.existsSync(layoutPath), "src/app/layout.tsx must exist");

    const content = fs.readFileSync(layoutPath, "utf-8");
    assert.match(content, /manifest:\s*["']\/manifest\.json["']/);
    assert.match(content, /appleWebApp/);
    assert.match(content, /themeColor:\s*["']#03050c["']/);
  });
});
