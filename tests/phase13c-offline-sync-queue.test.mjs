import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { SyncQueueItemSchema } from "../src/lib/schemas/sync-queue.ts";
import { OrbitDatabase } from "../src/lib/db/client.ts";
import {
  syncMutation,
  flushSyncQueue,
} from "../src/lib/services/sync-queue-service.ts";

test("Phase 13C: Sync Queue Schema & Dexie Schema Version 4", async (t) => {
  await t.test("1. SyncQueueItemSchema validates valid items and rejects invalid data", () => {
    const validItem = {
      seq: 1,
      id: crypto.randomUUID(),
      endpoint: "/api/tasks",
      method: "POST",
      body: JSON.stringify({ id: "task-1", title: "Test task" }),
      entityType: "task",
      entityId: "task-1",
      createdAt: Date.now(),
      retryCount: 0,
    };

    const parsed = SyncQueueItemSchema.parse(validItem);
    assert.equal(parsed.endpoint, "/api/tasks");
    assert.equal(parsed.method, "POST");
    assert.equal(parsed.entityType, "task");
    assert.equal(parsed.retryCount, 0);

    // Rejects invalid UUID
    assert.throws(() => {
      SyncQueueItemSchema.parse({
        ...validItem,
        id: "not-a-uuid",
      });
    });

    // Rejects invalid method
    assert.throws(() => {
      SyncQueueItemSchema.parse({
        ...validItem,
        method: "PUT",
      });
    });

    // Rejects invalid entityType
    assert.throws(() => {
      SyncQueueItemSchema.parse({
        ...validItem,
        entityType: "unknown",
      });
    });
  });

  await t.test("2. Dexie OrbitDatabase registers version 4 with syncQueue table", () => {
    const dbInstance = new OrbitDatabase();
    assert.ok(dbInstance.verno >= 4, `Expected db version to be >= 4, got ${dbInstance.verno}`);

    const syncTable = dbInstance.table("syncQueue");
    assert.ok(syncTable, "Table syncQueue must exist on db instance");
    assert.equal(syncTable.schema.primKey.name, "seq");
    assert.equal(syncTable.schema.primKey.auto, true, "seq must be auto-increment primary key");

    const indexNames = syncTable.schema.indexes.map((idx) => idx.name);
    assert.ok(indexNames.includes("id"), "id index missing");
    assert.ok(indexNames.includes("createdAt"), "createdAt index missing");
    assert.ok(indexNames.includes("entityType"), "entityType index missing");

    dbInstance.close();
  });
});

test("Phase 13C: syncMutation Offline Enqueueing", async (t) => {
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("1. Returns { success: true, queued: false } when fetch succeeds (200 OK)", async () => {
    const addedItems = [];
    const mockDb = {
      syncQueue: {
        add: async (item) => addedItems.push(item),
        count: async () => addedItems.length,
      },
    };

    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

    const result = await syncMutation({
      endpoint: "/api/tasks",
      method: "POST",
      body: { title: "Online task" },
      entityType: "task",
      entityId: "task-100",
      database: mockDb,
    });

    assert.deepEqual(result, { success: true, queued: false });
    assert.equal(addedItems.length, 0, "No item should be queued on success");
  });

  await t.test("2. Enqueues mutation into syncQueue when network fails (TypeError / offline)", async () => {
    const addedItems = [];
    const mockDb = {
      syncQueue: {
        add: async (item) => addedItems.push(item),
        count: async () => addedItems.length,
      },
    };

    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch (offline hotspot)");
    };

    const result = await syncMutation({
      endpoint: "/api/inbox",
      method: "POST",
      body: { id: "inbox-1", title: "Captured offline" },
      entityType: "inbox",
      entityId: "inbox-1",
      database: mockDb,
    });

    assert.deepEqual(result, { success: false, queued: true });
    assert.equal(addedItems.length, 1, "Failed mutation must be enqueued");
    assert.equal(addedItems[0].endpoint, "/api/inbox");
    assert.equal(addedItems[0].method, "POST");
    assert.equal(addedItems[0].entityType, "inbox");
    assert.equal(addedItems[0].entityId, "inbox-1");
    assert.equal(addedItems[0].retryCount, 0);
  });

  await t.test("3. Enqueues mutation when server returns 5xx error", async () => {
    const addedItems = [];
    const mockDb = {
      syncQueue: {
        add: async (item) => addedItems.push(item),
        count: async () => addedItems.length,
      },
    };

    globalThis.fetch = async () => new Response("Internal Server Error", { status: 502 });

    const result = await syncMutation({
      endpoint: "/api/habits",
      method: "POST",
      body: { id: "habit-1", title: "Daily read" },
      entityType: "habit",
      entityId: "habit-1",
      database: mockDb,
    });

    assert.deepEqual(result, { success: false, queued: true });
    assert.equal(addedItems.length, 1);
    assert.equal(addedItems[0].entityType, "habit");
  });
});

test("Phase 13C: flushSyncQueue FIFO Replay & Ordering Safety", async (t) => {
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("1. Replays items in strict sequential FIFO order and deletes on success", async () => {
    const queue = [
      {
        seq: 1,
        id: crypto.randomUUID(),
        endpoint: "/api/tasks",
        method: "POST",
        body: JSON.stringify({ id: "t1", title: "Task 1" }),
        entityType: "task",
        entityId: "t1",
        createdAt: 1000,
        retryCount: 0,
      },
      {
        seq: 2,
        id: crypto.randomUUID(),
        endpoint: "/api/tasks",
        method: "PATCH",
        body: JSON.stringify({ id: "t1", status: "completed" }),
        entityType: "task",
        entityId: "t1",
        createdAt: 2000,
        retryCount: 0,
      },
    ];

    const deletedSeqs = [];
    const replayedCalls = [];

    const mockDb = {
      syncQueue: {
        orderBy: () => ({
          toArray: async () => [...queue],
        }),
        delete: async (seq) => {
          deletedSeqs.push(seq);
          const idx = queue.findIndex((item) => item.seq === seq);
          if (idx !== -1) queue.splice(idx, 1);
        },
        update: async () => {},
        count: async () => queue.length,
      },
    };

    globalThis.fetch = async (url, options) => {
      replayedCalls.push({ url, method: options.method, body: options.body });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const flushResult = await flushSyncQueue(mockDb);

    assert.equal(flushResult.flushed, 2);
    assert.equal(flushResult.hasMore, false);
    assert.deepEqual(deletedSeqs, [1, 2]);
    assert.equal(replayedCalls.length, 2);
    assert.equal(replayedCalls[0].method, "POST");
    assert.equal(replayedCalls[1].method, "PATCH");
  });

  await t.test("2. DELETE returning 404 is treated as resolved and deleted from queue", async () => {
    const queue = [
      {
        seq: 10,
        id: crypto.randomUUID(),
        endpoint: "/api/inbox?id=missing-item",
        method: "DELETE",
        body: null,
        entityType: "inbox",
        entityId: "missing-item",
        createdAt: 1000,
        retryCount: 0,
      },
    ];

    const deletedSeqs = [];

    const mockDb = {
      syncQueue: {
        orderBy: () => ({
          toArray: async () => [...queue],
        }),
        delete: async (seq) => {
          deletedSeqs.push(seq);
          const idx = queue.findIndex((item) => item.seq === seq);
          if (idx !== -1) queue.splice(idx, 1);
        },
        update: async () => {},
        count: async () => queue.length,
      },
    };

    globalThis.fetch = async () => new Response("Not Found", { status: 404 });

    const flushResult = await flushSyncQueue(mockDb);
    assert.equal(flushResult.flushed, 1);
    assert.deepEqual(deletedSeqs, [10]);
  });

  await t.test("3. Mid-queue failure stops FIFO immediately and preserves subsequent items", async () => {
    const queue = [
      {
        seq: 1,
        id: crypto.randomUUID(),
        endpoint: "/api/tasks",
        method: "POST",
        body: JSON.stringify({ id: "t1" }),
        entityType: "task",
        entityId: "t1",
        createdAt: 1000,
        retryCount: 0,
      },
      {
        seq: 2,
        id: crypto.randomUUID(),
        endpoint: "/api/tasks",
        method: "PATCH",
        body: JSON.stringify({ id: "t1", title: "Updated" }),
        entityType: "task",
        entityId: "t1",
        createdAt: 2000,
        retryCount: 0,
      },
      {
        seq: 3,
        id: crypto.randomUUID(),
        endpoint: "/api/tasks",
        method: "DELETE",
        body: null,
        entityType: "task",
        entityId: "t1",
        createdAt: 3000,
        retryCount: 0,
      },
    ];

    const deletedSeqs = [];
    const updatedItems = [];
    const attemptedUrls = [];

    const mockDb = {
      syncQueue: {
        orderBy: () => ({
          toArray: async () => [...queue],
        }),
        delete: async (seq) => {
          deletedSeqs.push(seq);
        },
        update: async (seq, changes) => {
          updatedItems.push({ seq, changes });
        },
        count: async () => queue.length,
      },
    };

    globalThis.fetch = async (url) => {
      attemptedUrls.push(url);
      if (attemptedUrls.length === 1) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      // Item 2 fails due to network loss
      throw new TypeError("Hotspot disconnected");
    };

    const flushResult = await flushSyncQueue(mockDb);

    assert.equal(flushResult.flushed, 1, "Only item 1 should be marked flushed");
    assert.equal(flushResult.hasMore, true, "hasMore should be true when queue stopped early");
    assert.deepEqual(deletedSeqs, [1], "Only item 1 should be deleted");
    assert.equal(updatedItems.length, 1, "Item 2 should have retryCount incremented");
    assert.equal(updatedItems[0].seq, 2);
    assert.equal(updatedItems[0].changes.retryCount, 1);
    assert.equal(attemptedUrls.length, 2, "Item 3 must never be attempted after item 2 failed");
  });
});

test("Phase 13C: Component Wiring & Flush-Before-Hydrate Verification", () => {
  const inboxPageSrc = fs.readFileSync(path.resolve("src/app/inbox/page.tsx"), "utf8");
  const tasksPageSrc = fs.readFileSync(path.resolve("src/app/tasks/page.tsx"), "utf8");
  const habitsPageSrc = fs.readFileSync(path.resolve("src/app/habits/page.tsx"), "utf8");
  const layoutSrc = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf8");
  const sidebarSrc = fs.readFileSync(path.resolve("src/components/sidebar.tsx"), "utf8");
  const mobileNavSrc = fs.readFileSync(path.resolve("src/components/mobile-bottom-nav.tsx"), "utf8");

  // 1. Flush before hydrate in Inbox, Tasks, Habits
  assert.ok(
    inboxPageSrc.includes("await flushSyncQueue();\n        const res = await fetch(\"/api/inbox\");"),
    "InboxPage must call await flushSyncQueue() before fetch('/api/inbox')"
  );

  assert.ok(
    tasksPageSrc.includes("await flushSyncQueue();\n        const res = await fetch(\"/api/tasks\");"),
    "TasksPage must call await flushSyncQueue() before fetch('/api/tasks')"
  );

  assert.ok(
    habitsPageSrc.includes("await flushSyncQueue();\n        const res = await fetch(\"/api/habits?all=true\");"),
    "HabitsPage must call await flushSyncQueue() before fetch('/api/habits?all=true')"
  );

  // 2. Layout mounts SyncQueueListener
  assert.ok(
    layoutSrc.includes("<SyncQueueListener />"),
    "Root layout must mount SyncQueueListener"
  );

  // 3. Sidebar and Mobile Nav zero-GPU-blur pending sync badge
  assert.ok(
    sidebarSrc.includes("pendingSyncCount > 0"),
    "Sidebar must render sync indicator when pendingSyncCount > 0"
  );
  assert.ok(
    sidebarSrc.includes('backdropFilter: "none"'),
    "Sidebar sync indicator must specify backdropFilter: none"
  );

  assert.ok(
    mobileNavSrc.includes("pendingSyncCount > 0"),
    "MobileBottomNav must render sync indicator when pendingSyncCount > 0"
  );
  assert.ok(
    mobileNavSrc.includes('backdropFilter: "none"'),
    "MobileBottomNav sync indicator must specify backdropFilter: none"
  );
});
