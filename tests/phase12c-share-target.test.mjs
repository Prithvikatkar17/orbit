import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseShareTargetDraft } from "../src/lib/stores/ui-store.ts";

const ROOT_DIR = process.cwd();

test("Phase 12C: Web Share Target API Verification", async (t) => {
  await t.test("public/manifest.json registers share_target correctly", () => {
    const manifestPath = path.join(ROOT_DIR, "public", "manifest.json");
    assert.ok(fs.existsSync(manifestPath), "public/manifest.json must exist");

    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    assert.ok(manifest.share_target, "manifest must declare share_target");
    assert.equal(manifest.share_target.action, "/capture");
    assert.equal(manifest.share_target.method, "GET");
    assert.deepEqual(manifest.share_target.params, {
      title: "title",
      text: "text",
      url: "url",
    });
  });

  await t.test("src/app/capture/page.tsx is authored with Client Component and Suspense", () => {
    const capturePath = path.join(ROOT_DIR, "src", "app", "capture", "page.tsx");
    assert.ok(fs.existsSync(capturePath), "src/app/capture/page.tsx must exist");

    const content = fs.readFileSync(capturePath, "utf-8");
    assert.match(content, /"use client"/, "must be a Client Component");
    assert.match(content, /<Suspense/, "must wrap logic in Suspense boundary");
    assert.match(content, /useSearchParams/, "must extract params using useSearchParams");
    assert.match(content, /openQuickCapture/, "must hand off payload to openQuickCapture");
    assert.match(content, /router\.replace\(['"]\/(?:\?(?:shared=1|quickCapture=1))?['"]\)/, "must redirect to Home dashboard");
    assert.match(content, /PENDING_CAPTURE_STORAGE_KEY|sessionStorage/, "must persist payload to sessionStorage");
    assert.match(content, /location\.replace/, "must support hard fallback redirect on mobile");
    assert.match(content, /Continue to Workspace/, "must render manual fallback action button");
    assert.match(content, /INITIALIZING CAPTURE/, "must provide sleek loading view");
  });

  await t.test("parseShareTargetDraft correctly handles Android and mobile share payloads", () => {
    // 1. YouTube style: Title in text + URL
    const ytPayload = parseShareTargetDraft(
      "Awesome Architecture Talk\nhttps://youtu.be/test1234"
    );
    assert.equal(ytPayload.title, "Awesome Architecture Talk");
    assert.equal(ytPayload.link, "https://youtu.be/test1234");
    assert.equal(ytPayload.notes, "");

    // 2. Browser article style: Clean URL
    const urlPayload = parseShareTargetDraft("https://github.com/Prithvikatkar17/orbit");
    assert.equal(urlPayload.link, "https://github.com/Prithvikatkar17/orbit");
    assert.equal(urlPayload.title, "github.com");

    // 3. Multi-line note style: First line title, rest notes
    const notePayload = parseShareTargetDraft(
      "Meeting with Design Council\nReviewed typography and micro-interactions\nZero blur tax confirmed"
    );
    assert.equal(notePayload.title, "Meeting with Design Council");
    assert.match(notePayload.notes ?? "", /Reviewed typography and micro-interactions/);
    assert.match(notePayload.notes ?? "", /Zero blur tax confirmed/);
    assert.equal(notePayload.link, "");

    // 4. Empty string
    const emptyPayload = parseShareTargetDraft("");
    assert.deepEqual(emptyPayload, {});
  });
});
