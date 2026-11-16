import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

test("Phase 12D: Mobile Touch Responsiveness & Capture Handoff Verification", async (t) => {
  await t.test("src/components/mobile-bottom-nav.tsx exists and defines mobile bottom navigation", () => {
    const navPath = path.join(ROOT_DIR, "src", "components", "mobile-bottom-nav.tsx");
    assert.ok(fs.existsSync(navPath), "src/components/mobile-bottom-nav.tsx must exist");

    const content = fs.readFileSync(navPath, "utf-8");
    assert.match(content, /"use client"/);
    assert.match(content, /Home/, "must have Home nav link");
    assert.match(content, /Inbox/, "must have Inbox nav link");
    assert.match(content, /Tasks/, "must have Tasks nav link");
    assert.match(content, /Habits/, "must have Habits nav link");
    assert.match(content, /openQuickCapture/, "must trigger openQuickCapture from Center action button");
    assert.match(content, /safe-area-inset-bottom/, "must respect mobile safe area insets");
    assert.match(content, /backdropFilter:\s*["']none["']/, "must strictly avoid GPU blur");
  });

  await t.test("src/app/layout.tsx mounts MobileBottomNav and provides bottom padding on main", () => {
    const layoutPath = path.join(ROOT_DIR, "src", "app", "layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    assert.match(content, /MobileBottomNav/, "layout must import and mount MobileBottomNav");
    assert.match(content, /pb-24/, "main container must provide pb-24 for mobile navigation bar clearance");
  });

  await t.test("src/components/sidebar.tsx sets pointer-events-none when closed on mobile", () => {
    const sidebarPath = path.join(ROOT_DIR, "src", "components", "sidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");

    assert.match(
      content,
      /pointer-events-none lg:pointer-events-auto/,
      "closed mobile sidebar must explicitly set pointer-events-none"
    );
  });

  await t.test("src/app/globals.css includes mobile touch scroll and inert backdrop safety rules", () => {
    const cssPath = path.join(ROOT_DIR, "src", "app", "globals.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.match(content, /touch-action:\s*pan-y pinch-zoom/, "must enforce pan-y pinch-zoom on mobile");
    assert.match(content, /\.orbit-modal-backdrop\[inert\]/, "must prevent inert backdrops from capturing clicks");
  });

  await t.test("src/app/capture/page.tsx implements multi-layer mobile redirect hardening", () => {
    const capturePath = path.join(ROOT_DIR, "src", "app", "capture", "page.tsx");
    const content = fs.readFileSync(capturePath, "utf-8");

    assert.match(content, /sessionStorage\.setItem/, "must persist to sessionStorage");
    assert.match(content, /orbit_pending_capture/, "must declare or reference orbit_pending_capture storage key");
    assert.match(content, /location\.replace\(['"]\/\?(?:shared=1|quickCapture=1)['"]\)/, "must provide hard fallback redirect");
    assert.match(content, /Continue to Workspace/, "must render manual fallback button for mobile safety");
  });

  await t.test("src/components/quick-capture-modal.tsx listens for pending capture and quickCapture param on mount", () => {
    const modalPath = path.join(ROOT_DIR, "src", "components", "quick-capture-modal.tsx");
    const content = fs.readFileSync(modalPath, "utf-8");

    assert.match(content, /QuickCaptureListener/, "must mount QuickCaptureListener");
    assert.match(content, /sessionStorage\.getItem\(['"]orbit_pending_capture['"]\)/, "must consume sessionStorage pending capture");
    assert.match(content, /quickCapture/, "must consume quickCapture URL parameter");
  });
});
