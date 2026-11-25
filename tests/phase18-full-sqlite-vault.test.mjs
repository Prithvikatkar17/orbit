import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SyncQueueItemSchema } from "../src/lib/schemas/sync-queue.ts";
import {
  reconcileCalendarFromSQLite,
  reconcileLibraryFromSQLite,
  reconcileSettingsFromSQLite,
} from "../src/lib/services/vault-sync-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 18: Full SQLite Data Vault Migration Verification", async (t) => {
  await t.test("1. Drizzle SQLite schema & SyncQueueItemSchema include all vault tables", () => {
    const schemaPath = path.join(ROOT_DIR, "src", "lib", "db", "schema.ts");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    for (const table of [
      "calendarEvents",
      "reminders",
      "libraryCollections",
      "libraryEntries",
      "libraryFiles",
      "settings",
    ]) {
      assert.match(
        schemaContent,
        new RegExp(`export const ${table} = sqliteTable\\("${table}"`),
        `Schema must define ${table}`
      );
    }

    for (const entityType of [
      "calendarEvent",
      "reminder",
      "libraryEntry",
      "libraryCollection",
      "settings",
    ]) {
      const parsed = SyncQueueItemSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        endpoint: "/api/test",
        method: "POST",
        entityType,
        entityId: "entity-1",
        createdAt: Date.now(),
      });
      assert.equal(parsed.entityType, entityType);
    }
  });

  await t.test("2. API routes implement idempotent onConflictDoUpdate, LWW & soft-delete tombstones", () => {
    const routes = [
      "src/app/api/calendar/events/route.ts",
      "src/app/api/calendar/reminders/route.ts",
      "src/app/api/library/collections/route.ts",
      "src/app/api/library/entries/route.ts",
    ];

    for (const rel of routes) {
      const fullPath = path.join(ROOT_DIR, rel);
      assert.ok(fs.existsSync(fullPath), `${rel} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.match(content, /onConflictDoUpdate/);
      assert.match(content, /deletedAt:\s*now/);
      assert.match(content, /export async function GET/);
      assert.match(content, /export async function POST/);
      assert.match(content, /export async function PATCH/);
      assert.match(content, /export async function DELETE/);
    }

    // Lazy library files route
    const filesRoute = fs.readFileSync(
      path.join(ROOT_DIR, "src/app/api/library/files/route.ts"),
      "utf-8"
    );
    assert.match(filesRoute, /url\.searchParams\.get\("id"\)/);
    assert.match(filesRoute, /onConflictDoUpdate/);

    // Entries GET must NOT return dataBase64 blobs
    const entriesRoute = fs.readFileSync(
      path.join(ROOT_DIR, "src/app/api/library/entries/route.ts"),
      "utf-8"
    );
    assert.doesNotMatch(entriesRoute, /dataBase64/);

    // Settings route LWW check
    const settingsRoute = fs.readFileSync(
      path.join(ROOT_DIR, "src/app/api/settings/route.ts"),
      "utf-8"
    );
    assert.match(settingsRoute, /existing\.updatedAt > incomingUpdatedAt/);
    assert.match(settingsRoute, /onConflictDoUpdate/);
  });

  await t.test("3. /api/reset preserves CSRF guard and clears all SQLite vault tables", () => {
    const resetContent = fs.readFileSync(
      path.join(ROOT_DIR, "src/app/api/reset/route.ts"),
      "utf-8"
    );
    assert.match(resetContent, /X-Orbit-Confirm/);
    for (const table of [
      "libraryFiles",
      "libraryEntries",
      "libraryCollections",
      "reminders",
      "calendarEvents",
      "settings",
      "expenses",
      "habitLogs",
      "habits",
      "tasks",
      "inbox",
    ]) {
      assert.match(
        resetContent,
        new RegExp(`await db\\.delete\\(${table}\\)`),
        `/api/reset must delete ${table}`
      );
    }
  });

  await t.test("4. LWW hydration purges tombstoned Calendar & Library records and reconciles Settings", async () => {
    const eventsStore = new Map([
      ["ev-deleted", { id: "ev-deleted", title: "Old", updatedAt: "2026-11-25T10:00:00.000Z" }],
      ["ev-stale", { id: "ev-stale", title: "Local Stale", updatedAt: "2026-11-25T10:00:00.000Z" }],
    ]);
    const remindersStore = new Map([
      ["rem-deleted", { id: "rem-deleted", eventId: "ev-deleted", createdAt: "2026-11-25T10:00:00.000Z" }],
    ]);
    const collectionsStore = new Map();
    const entriesStore = new Map([
      ["lib-deleted", { id: "lib-deleted", title: "Deleted Note", updatedAt: "2026-11-25T10:00:00.000Z" }],
    ]);
    const settingsStore = new Map([
      ["user_settings", { id: "user_settings", theme: "light", updatedAt: "2026-11-25T10:00:00.000Z" }],
    ]);

    const makeTable = (store) => ({
      get: async (id) => store.get(id),
      put: async (item) => { store.set(item.id, item); },
      delete: async (id) => { store.delete(id); },
    });

    const mockDb = {
      events: makeTable(eventsStore),
      reminders: makeTable(remindersStore),
      libraryCollections: makeTable(collectionsStore),
      libraryEntries: makeTable(entriesStore),
      settings: makeTable(settingsStore),
      syncQueue: {
        orderBy: () => ({ toArray: async () => [] }),
        toArray: async () => [],
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url === "/api/calendar/events") {
        return new Response(
          JSON.stringify({
            success: true,
            events: [
              { id: "ev-deleted", deletedAt: Date.now(), updatedAt: Date.now() },
              {
                id: "ev-stale",
                title: "Server Newer",
                date: "2026-11-26",
                createdAt: Date.parse("2026-11-25T10:00:00.000Z"),
                updatedAt: Date.parse("2026-11-25T12:00:00.000Z"),
                deletedAt: null,
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url === "/api/calendar/reminders") {
        return new Response(
          JSON.stringify({
            success: true,
            reminders: [
              { id: "rem-deleted", eventId: "ev-deleted", deletedAt: Date.now(), updatedAt: Date.now() },
            ],
          }),
          { status: 200 }
        );
      }
      if (url === "/api/library/collections") {
        return new Response(
          JSON.stringify({
            success: true,
            collections: [
              {
                id: "col-1",
                name: "Reading",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deletedAt: null,
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url === "/api/library/entries") {
        return new Response(
          JSON.stringify({
            success: true,
            entries: [
              { id: "lib-deleted", deletedAt: Date.now(), updatedAt: Date.now() },
            ],
          }),
          { status: 200 }
        );
      }
      if (url === "/api/settings") {
        return new Response(
          JSON.stringify({
            success: true,
            settings: {
              id: "user_settings",
              theme: "dark",
              themePersonality: "midnight",
              updatedAt: "2026-11-25T12:00:00.000Z",
            },
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    };

    try {
      await reconcileCalendarFromSQLite(mockDb);
      assert.equal(eventsStore.has("ev-deleted"), false, "Tombstoned event must be purged from Dexie");
      assert.equal(remindersStore.has("rem-deleted"), false, "Tombstoned reminder must be purged from Dexie");
      assert.equal(eventsStore.get("ev-stale").title, "Server Newer", "LWW must update stale local event");

      await reconcileLibraryFromSQLite(mockDb);
      assert.equal(entriesStore.has("lib-deleted"), false, "Tombstoned library entry must be purged");
      assert.equal(collectionsStore.get("col-1").name, "Reading");

      await reconcileSettingsFromSQLite(mockDb);
      assert.equal(settingsStore.get("user_settings").theme, "dark");
      assert.equal(settingsStore.get("user_settings").themePersonality, "midnight");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
