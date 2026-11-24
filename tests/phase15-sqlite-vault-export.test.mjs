import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { sqlite } from "../src/lib/db/index.ts";

test("Phase 15: Safe SQLite Snapshot Generation & Integrity", async (t) => {
  await t.test("1. sqlite.backup creates a valid single-file snapshot with SQLite format 3 magic header", async () => {
    const tempPath = path.join(
      os.tmpdir(),
      `orbit-test-backup-${Date.now()}-${crypto.randomUUID()}.sqlite`
    );

    try {
      // WAL-safe atomic online backup
      await sqlite.backup(tempPath);

      assert.ok(fs.existsSync(tempPath), "Temp backup file must exist on disk");

      const fileBuffer = await fs.promises.readFile(tempPath);
      assert.ok(fileBuffer.length > 0, "Backup file size must be greater than 0");

      // Verify standard SQLite 3 binary header: "SQLite format 3\0"
      const magicHeader = fileBuffer.subarray(0, 16).toString("utf8");
      assert.equal(
        magicHeader,
        "SQLite format 3\0",
        "Backup file must start with valid SQLite format 3 magic header"
      );

      // Verify the backup can be opened independently and queried
      const backupDb = new Database(tempPath);
      backupDb.pragma("query_only = ON");
      const tables = backupDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      assert.ok(tables.length > 0, "Backup database must contain tables");
      backupDb.close();
    } finally {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    }

    // Verify temp file is cleaned up
    assert.equal(fs.existsSync(tempPath), false, "Temp backup file must be unlinked");
  });

  await t.test("2. orbit.sqlite on disk has valid metadata and active WAL mode", () => {
    const dbPath = path.resolve("orbit.sqlite");
    assert.ok(fs.existsSync(dbPath), "orbit.sqlite must exist on disk");

    const stats = fs.statSync(dbPath);
    assert.ok(stats.size > 0, "orbit.sqlite size must be > 0 bytes");

    // Verify journal_mode pragma returns wal
    const journalMode = sqlite.pragma("journal_mode", { simple: true });
    assert.equal(journalMode.toLowerCase(), "wal", "Database must operate in WAL journal mode");
  });
});

test("Phase 15: Backup Route Implementation Verification", () => {
  const routePath = path.resolve("src/app/api/backup/sqlite/route.ts");
  assert.ok(fs.existsSync(routePath), "src/app/api/backup/sqlite/route.ts must exist");
  const routeSrc = fs.readFileSync(routePath, "utf8");

  // 1. Dynamic route export
  assert.ok(
    routeSrc.includes('export const dynamic = "force-dynamic"'),
    "Route must export dynamic = force-dynamic"
  );

  // 2. Export handlers
  assert.ok(
    routeSrc.includes("export async function GET"),
    "Route must export GET handler"
  );
  assert.ok(
    routeSrc.includes("export async function HEAD"),
    "Route must export HEAD handler"
  );

  // 3. Metadata query handling
  assert.ok(
    routeSrc.includes('searchParams.get("meta") === "1"'),
    "Route must support ?meta=1 query"
  );
  assert.ok(
    routeSrc.includes("sizeBytes"),
    "Meta response must return sizeBytes"
  );
  assert.ok(
    routeSrc.includes("wal: true"),
    "Meta response must return wal status"
  );

  // 4. Safe backup & headers
  assert.ok(
    routeSrc.includes("sqlite.backup(tempPath)"),
    "Route must invoke sqlite.backup for atomic WAL-safe snapshot"
  );
  assert.ok(
    routeSrc.includes('application/vnd.sqlite3'),
    "Route must return Content-Type: application/vnd.sqlite3"
  );
  assert.ok(
    routeSrc.includes("Content-Disposition"),
    "Route must set Content-Disposition attachment header"
  );
  assert.ok(
    routeSrc.includes('Cache-Control": "no-store, max-age=0'),
    "Route must set Cache-Control no-store"
  );

  // 5. Cleanup in finally block
  assert.ok(
    routeSrc.includes("finally"),
    "Route must have a finally block for temp file cleanup"
  );
  assert.ok(
    routeSrc.includes("unlink(tempPath)"),
    "Route must unlink tempPath in finally block"
  );
});

test("Phase 15: Settings Page SQLite Data Vault Card Verification", () => {
  const settingsSrc = fs.readFileSync(path.resolve("src/app/settings/page.tsx"), "utf8");

  // 1. Vault Card UI exists
  assert.ok(
    settingsSrc.includes("SQLite Data Vault"),
    "Settings must feature dedicated SQLite Data Vault card"
  );
  assert.ok(
    settingsSrc.includes("WAL Active"),
    "Settings must display WAL Active badge"
  );
  assert.ok(
    settingsSrc.includes("Download orbit.sqlite"),
    "Settings must offer Download orbit.sqlite button"
  );

  // 2. Live metadata fetching
  assert.ok(
    settingsSrc.includes('fetch("/api/backup/sqlite?meta=1")'),
    "Settings must fetch metadata via /api/backup/sqlite?meta=1"
  );

  // 3. Flush-before-download order of operations
  assert.ok(
    settingsSrc.includes("await flushSyncQueue()"),
    "Settings must invoke await flushSyncQueue() before generating SQLite backup"
  );

  // 4. Touch target compliance (minimum 44px)
  assert.ok(
    settingsSrc.includes('className="min-h-[44px]"'),
    "Download button must have min-h-[44px] touch target"
  );

  // 5. Zero GPU Blur Tax compliance
  assert.ok(
    !settingsSrc.includes("backdrop-blur"),
    "Settings page must avoid backdrop-blur classes"
  );
});
