import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { inbox } from "../src/lib/db/schema.ts";
import { desc, eq } from "drizzle-orm";

const ROOT_DIR = process.cwd();

test("Phase 13: Local SQLite Backend Migration Verification", async (t) => {
  await t.test("next.config.mjs configures serverExternalPackages with better-sqlite3", () => {
    const configPath = path.join(ROOT_DIR, "next.config.mjs");
    assert.ok(fs.existsSync(configPath), "next.config.mjs must exist");
    const content = fs.readFileSync(configPath, "utf-8");
    assert.match(
      content,
      /serverExternalPackages:\s*\[.*["']better-sqlite3["'].*\]/,
      "next.config.mjs must include better-sqlite3 in serverExternalPackages"
    );
  });

  await t.test("src/lib/db/schema.ts defines inbox table with required columns", () => {
    const schemaPath = path.join(ROOT_DIR, "src", "lib", "db", "schema.ts");
    assert.ok(fs.existsSync(schemaPath), "src/lib/db/schema.ts must exist");
    const content = fs.readFileSync(schemaPath, "utf-8");

    assert.match(content, /sqliteTable\(["']inbox["']/, "must declare inbox table");
    assert.match(content, /text\(["']id["']\)\.primaryKey\(\)/, "must declare id text primary key");
    assert.match(content, /text\(["']title["']\)\.notNull\(\)/, "must declare title text not null");
    assert.match(content, /text\(["']notes["']\)/, "must declare notes text");
    assert.match(content, /text\(["']link["']\)/, "must declare link text");
    assert.match(content, /text\(["']category["']\)/, "must declare category text");
    assert.match(content, /integer\(["']createdAt["']\)/, "must declare createdAt integer");
    assert.match(content, /text\(["']status["']\)/, "must declare status text");
  });

  await t.test("src/lib/db/index.ts initializes better-sqlite3 with WAL mode and Drizzle", () => {
    const indexPath = path.join(ROOT_DIR, "src", "lib", "db", "index.ts");
    assert.ok(fs.existsSync(indexPath), "src/lib/db/index.ts must exist");
    const content = fs.readFileSync(indexPath, "utf-8");

    assert.match(content, /better-sqlite3/, "must import better-sqlite3");
    assert.match(content, /drizzle-orm\/better-sqlite3/, "must import drizzle");
    assert.match(content, /orbit\.sqlite/, "must point to orbit.sqlite");
    assert.match(content, /journal_mode\s*=\s*WAL/i, "must enable WAL mode for multi-connection concurrency");
  });

  await t.test(".gitignore excludes SQLite database files", () => {
    const gitignorePath = path.join(ROOT_DIR, ".gitignore");
    const content = fs.readFileSync(gitignorePath, "utf-8");

    assert.match(content, /\*\.sqlite/, "must ignore *.sqlite");
    assert.match(content, /orbit\.sqlite\*/, "must ignore orbit.sqlite*");
  });

  await t.test("src/app/api/inbox/route.ts implements GET, POST, and DELETE handlers", () => {
    const routePath = path.join(ROOT_DIR, "src", "app", "api", "inbox", "route.ts");
    assert.ok(fs.existsSync(routePath), "src/app/api/inbox/route.ts must exist");
    const content = fs.readFileSync(routePath, "utf-8");

    assert.match(content, /export async function GET/, "must export GET handler");
    assert.match(content, /export async function POST/, "must export POST handler");
    assert.match(content, /export async function DELETE/, "must export DELETE handler");
    assert.match(content, /db\.select\(\)\.from\(inbox\)/, "GET must select from inbox");
    assert.match(content, /db\.insert\(inbox\)\.values/, "POST must insert into inbox");
  });

  await t.test("Physical SQLite database operations persist and query records correctly", async () => {
    const dbPath = path.join(ROOT_DIR, "orbit.sqlite");
    assert.ok(fs.existsSync(dbPath), "orbit.sqlite must exist on disk");

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    const testDb = drizzle(sqlite, { schema: { inbox } });

    const testId = `test-${Date.now()}-${crypto.randomUUID()}`;
    const testTitle = "SQLite Migration Verification Record";
    const testLink = "https://github.com/Prithvikatkar17/orbit";
    const testNotes = "Verified physically in orbit.sqlite";
    const testCreatedAt = Date.now();

    // Insert record
    await testDb.insert(inbox).values({
      id: testId,
      title: testTitle,
      link: testLink,
      notes: testNotes,
      category: "inbox",
      status: "pending",
      createdAt: testCreatedAt,
    });

    // Query record back
    const results = await testDb
      .select()
      .from(inbox)
      .where(eq(inbox.id, testId))
      .orderBy(desc(inbox.createdAt));

    assert.equal(results.length, 1, "Should find the inserted record");
    assert.equal(results[0].id, testId);
    assert.equal(results[0].title, testTitle);
    assert.equal(results[0].link, testLink);
    assert.equal(results[0].notes, testNotes);
    assert.equal(results[0].createdAt, testCreatedAt);

    // Clean up test record
    await testDb.delete(inbox).where(eq(inbox.id, testId));
    sqlite.close();
  });

  await t.test("src/lib/stores/ui-store.ts and QuickCaptureModal connect to /api/inbox", () => {
    const storePath = path.join(ROOT_DIR, "src", "lib", "stores", "ui-store.ts");
    const storeContent = fs.readFileSync(storePath, "utf-8");
    assert.match(storeContent, /\/api\/inbox/, "ui-store must target /api/inbox");
    assert.match(storeContent, /captureInboxItem/, "ui-store must export captureInboxItem");
    assert.match(storeContent, /captureToInbox/, "ui-store must expose captureToInbox");

    const modalPath = path.join(ROOT_DIR, "src", "components", "quick-capture-modal.tsx");
    const modalContent = fs.readFileSync(modalPath, "utf-8");
    assert.match(modalContent, /captureToInbox/, "QuickCaptureModal must invoke captureToInbox");
  });
});
