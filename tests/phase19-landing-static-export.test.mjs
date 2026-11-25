import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isStaticPwaMode } from "../src/lib/config/runtime.ts";
import {
  syncMutation,
  flushSyncQueue,
} from "../src/lib/services/sync-queue-service.ts";
import {
  reconcileCalendarFromSQLite,
  reconcileLibraryFromSQLite,
  reconcileSettingsFromSQLite,
} from "../src/lib/services/vault-sync-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 19: /welcome Landing Page & Cloudflare Static PWA Build Verification", async (t) => {
  await t.test("1. isStaticPwaMode() toggles cleanly and short-circuits /api/* sync calls", async () => {
    const prevMode = process.env.NEXT_PUBLIC_STATIC_MODE;
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("fetch must not be called in Static PWA mode");
    };

    try {
      delete process.env.NEXT_PUBLIC_STATIC_MODE;
      assert.equal(isStaticPwaMode(), false);

      process.env.NEXT_PUBLIC_STATIC_MODE = "true";
      assert.equal(isStaticPwaMode(), true);

      const syncRes = await syncMutation({
        endpoint: "/api/tasks",
        method: "POST",
        body: { id: "t-1", title: "Offline task" },
        entityType: "task",
        entityId: "t-1",
      });
      assert.deepEqual(syncRes, { success: true, queued: false });

      const flushRes = await flushSyncQueue();
      assert.deepEqual(flushRes, { flushed: 0, hasMore: false });

      await reconcileCalendarFromSQLite();
      await reconcileLibraryFromSQLite();
      await reconcileSettingsFromSQLite();

      assert.equal(fetchCalled, false, "Static PWA mode must never issue /api/* network fetches");
    } finally {
      globalThis.fetch = originalFetch;
      if (prevMode === undefined) {
        delete process.env.NEXT_PUBLIC_STATIC_MODE;
      } else {
        process.env.NEXT_PUBLIC_STATIC_MODE = prevMode;
      }
    }
  });

  await t.test("2. /welcome landing page implements Zero GPU Blur, 7-theme switcher & PWA install flow", () => {
    const welcomePath = path.join(ROOT_DIR, "src", "app", "welcome", "page.tsx");
    assert.ok(fs.existsSync(welcomePath), "src/app/welcome/page.tsx must exist");
    const content = fs.readFileSync(welcomePath, "utf-8");

    assert.match(content, /Your Local-First Personal OS\. Zero Cloud\. Zero Subscriptions\./);
    assert.match(content, /useThemePersonality/);
    assert.match(content, /THEME_PERSONALITIES/);
    assert.match(content, /beforeinstallprompt/);
    assert.match(content, /github\.com\/Prithvikatkar17\/orbit\/releases/);
    assert.match(content, /backdropFilter:\s*"none"/);
  });

  await t.test("3. Workspace chrome bypasses rendering on /welcome while preserving layout", () => {
    const sidebarContent = fs.readFileSync(
      path.join(ROOT_DIR, "src", "components", "sidebar.tsx"),
      "utf-8"
    );
    const bottomNavContent = fs.readFileSync(
      path.join(ROOT_DIR, "src", "components", "mobile-bottom-nav.tsx"),
      "utf-8"
    );
    const onboardingContent = fs.readFileSync(
      path.join(ROOT_DIR, "src", "components", "onboarding", "onboarding-wizard.tsx"),
      "utf-8"
    );

    assert.match(sidebarContent, /pathname\?\.startsWith\("\/welcome"\)/);
    assert.match(bottomNavContent, /pathname\?\.startsWith\("\/welcome"\)/);
    assert.match(onboardingContent, /pathname\?\.startsWith\("\/welcome"\)/);
  });

  await t.test("4. Dual build pipeline: next.config.mjs, scripts/build-static.mjs & package.json", () => {
    const nextConfig = fs.readFileSync(path.join(ROOT_DIR, "next.config.mjs"), "utf-8");
    assert.match(nextConfig, /ORBIT_STATIC_EXPORT === "1"/);
    assert.match(nextConfig, /output:\s*"export"/);
    assert.match(nextConfig, /unoptimized:\s*true/);
    assert.match(nextConfig, /trailingSlash:\s*true/);

    const scriptPath = path.join(ROOT_DIR, "scripts", "build-static.mjs");
    assert.ok(fs.existsSync(scriptPath), "scripts/build-static.mjs must exist");
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");
    assert.match(scriptContent, /\.orbit-static-api-backup/);
    assert.match(scriptContent, /ORBIT_STATIC_EXPORT:\s*"1"/);
    assert.match(scriptContent, /NEXT_PUBLIC_STATIC_MODE:\s*"true"/);
    assert.match(scriptContent, /finally\s*\{[\s\S]*restoreApiDir\(\)/);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8")
    );
    assert.equal(pkg.scripts["build:static"], "node scripts/build-static.mjs");
  });
});
