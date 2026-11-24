import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  triageToTask,
  triageToLibrary,
  triageDismiss,
  undoTriage,
} from "../src/lib/services/inbox-triage-service.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { LibraryEntrySchema } from "../src/lib/schemas/library-entry.ts";
import { ItemSchema } from "../src/lib/schemas/item.ts";

function createMockDatabase(initialData = {}) {
  const itemsMap = new Map((initialData.items || []).map((i) => [i.id, i]));
  const tasksMap = new Map((initialData.tasks || []).map((t) => [t.id, t]));
  const libraryMap = new Map((initialData.libraryEntries || []).map((l) => [l.id, l]));
  const syncQueueList = [];

  const db = {
    items: {
      get: async (id) => itemsMap.get(id),
      put: async (item) => {
        itemsMap.set(item.id, item);
      },
      add: async (item) => {
        itemsMap.set(item.id, item);
      },
      delete: async (id) => {
        itemsMap.delete(id);
      },
      toArray: async () => Array.from(itemsMap.values()),
    },
    tasks: {
      get: async (id) => tasksMap.get(id),
      put: async (task) => {
        tasksMap.set(task.id, task);
      },
      add: async (task) => {
        tasksMap.set(task.id, task);
      },
      delete: async (id) => {
        tasksMap.delete(id);
      },
      toArray: async () => Array.from(tasksMap.values()),
    },
    libraryEntries: {
      get: async (id) => libraryMap.get(id),
      put: async (entry) => {
        libraryMap.set(entry.id, entry);
      },
      add: async (entry) => {
        libraryMap.set(entry.id, entry);
      },
      delete: async (id) => {
        libraryMap.delete(id);
      },
      toArray: async () => Array.from(libraryMap.values()),
    },
    syncQueue: {
      add: async (item) => {
        syncQueueList.push(item);
      },
      toArray: async () => [...syncQueueList],
      count: async () => syncQueueList.length,
    },
    transaction: async (mode, tables, fn) => {
      return await fn();
    },
    _syncQueueList: syncQueueList,
  };

  return db;
}

test("Phase 14: triageToTask logic & sync queueing", async (t) => {
  const originalFetch = globalThis.fetch;
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("Creates task with maxSortOrder + 1 and removes inbox item", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Review architecture document",
      notes: "Focus on section 3 data models",
      link: "https://example.com/doc",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const existingTask = {
      id: crypto.randomUUID(),
      title: "Existing Task",
      sortOrder: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockDb = createMockDatabase({
      items: [item],
      tasks: [existingTask],
    });

    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options.method, body: options.body });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const undoPayload = await triageToTask(item, mockDb);

    assert.equal(undoPayload.action, "task");
    assert.equal(undoPayload.originalItem.id, item.id);
    assert.ok(undoPayload.createdId, "createdId must be returned");

    // Item must be removed from items table
    const storedItem = await mockDb.items.get(item.id);
    assert.equal(storedItem, undefined, "Item must be removed from inbox");

    // Task must be added with sortOrder = 5
    const storedTask = await mockDb.tasks.get(undoPayload.createdId);
    assert.ok(storedTask, "Task must be written to tasks table");
    assert.equal(storedTask.title, "Review architecture document");
    assert.equal(storedTask.notes, "Focus on section 3 data models");
    assert.equal(storedTask.sortOrder, 5, "Sort order must be maxSortOrder + 1 (4 + 1 = 5)");
    assert.equal(storedTask.sourceItemId, item.id);
    assert.equal(storedTask.status, "todo");
    assert.deepEqual(storedTask.tags, ["inbox-converted"]);

    // Schema validation
    assert.doesNotThrow(() => TaskSchema.parse(storedTask));

    // Verify background sync calls
    const inboxDeleteCall = fetchCalls.find(
      (c) => c.url.includes("/api/inbox") && c.method === "DELETE"
    );
    assert.ok(inboxDeleteCall, "Must dispatch DELETE /api/inbox");

    const taskPostCall = fetchCalls.find(
      (c) => c.url === "/api/tasks" && c.method === "POST"
    );
    assert.ok(taskPostCall, "Must dispatch POST /api/tasks");
    const parsedBody = JSON.parse(taskPostCall.body);
    assert.equal(parsedBody.id, storedTask.id);
    assert.equal(parsedBody.sortOrder, 5);
  });
});

test("Phase 14: triageToLibrary logic & type inference", async (t) => {
  const originalFetch = globalThis.fetch;
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("Infers bookmark for general URL and removes inbox item", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Interesting article on distributed systems",
      notes: "Check out chapter 2",
      link: "https://martinfowler.com/articles/patterns-of-distributed-systems/",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockDb = createMockDatabase({ items: [item] });

    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options.method });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const undoPayload = await triageToLibrary(item, mockDb);

    assert.equal(undoPayload.action, "library");
    assert.equal(undoPayload.originalItem.id, item.id);

    const storedItem = await mockDb.items.get(item.id);
    assert.equal(storedItem, undefined);

    const storedEntry = await mockDb.libraryEntries.get(undoPayload.createdId);
    assert.ok(storedEntry);
    assert.equal(storedEntry.type, "bookmark");
    assert.equal(storedEntry.status, "saved");
    assert.equal(storedEntry.title, item.title);
    assert.equal(storedEntry.sourceItemId, item.id);

    assert.doesNotThrow(() => LibraryEntrySchema.parse(storedEntry));

    const deleteCall = fetchCalls.find(
      (c) => c.url.includes("/api/inbox") && c.method === "DELETE"
    );
    assert.ok(deleteCall, "Must dispatch DELETE /api/inbox");
  });

  await t.test("Infers video for YouTube URL", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Keynote Talk",
      link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockDb = createMockDatabase({ items: [item] });
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

    const undoPayload = await triageToLibrary(item, mockDb);
    const storedEntry = await mockDb.libraryEntries.get(undoPayload.createdId);
    assert.equal(storedEntry.type, "video");
  });

  await t.test("Infers note when link is omitted", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Random thought on database transactions",
      notes: "ACID vs BASE tradeoffs",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockDb = createMockDatabase({ items: [item] });
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

    const undoPayload = await triageToLibrary(item, mockDb);
    const storedEntry = await mockDb.libraryEntries.get(undoPayload.createdId);
    assert.equal(storedEntry.type, "note");
  });
});

test("Phase 14: triageDismiss logic", async (t) => {
  const originalFetch = globalThis.fetch;
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("Deletes item from Dexie and dispatches DELETE /api/inbox", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Disposable link",
      category: "inbox",
      priority: "low",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockDb = createMockDatabase({ items: [item] });
    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options.method });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const undoPayload = await triageDismiss(item, mockDb);

    assert.equal(undoPayload.action, "dismiss");
    assert.equal(undoPayload.originalItem.id, item.id);

    const stored = await mockDb.items.get(item.id);
    assert.equal(stored, undefined);

    const deleteCall = fetchCalls.find(
      (c) => c.url.includes("/api/inbox") && c.method === "DELETE"
    );
    assert.ok(deleteCall);
  });
});

test("Phase 14: undoTriage rollback execution", async (t) => {
  const originalFetch = globalThis.fetch;
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("Rolls back task triage: deletes created task and restores inbox item", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Mistakenly triaged task",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const taskId = crypto.randomUUID();
    const createdTask = {
      id: taskId,
      title: item.title,
      sourceItemId: item.id,
      sortOrder: 1,
    };

    // Current state: item is triaged (task exists, inbox item is gone)
    const mockDb = createMockDatabase({
      items: [],
      tasks: [createdTask],
    });

    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options.method, body: options.body });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await undoTriage(
      {
        action: "task",
        originalItem: item,
        createdId: taskId,
      },
      mockDb
    );

    // Task must be deleted
    assert.equal(await mockDb.tasks.get(taskId), undefined);

    // Inbox item must be restored
    const restored = await mockDb.items.get(item.id);
    assert.ok(restored);
    assert.equal(restored.title, "Mistakenly triaged task");

    // Sync mutations
    const taskDeleteCall = fetchCalls.find(
      (c) => c.url.includes(`/api/tasks?id=${taskId}`) && c.method === "DELETE"
    );
    assert.ok(taskDeleteCall, "Must dispatch DELETE for created task");

    const inboxPostCall = fetchCalls.find(
      (c) => c.url === "/api/inbox" && c.method === "POST"
    );
    assert.ok(inboxPostCall, "Must dispatch POST to re-create inbox item");
  });

  await t.test("Rolls back library triage: deletes created library entry and restores inbox item", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Mistakenly triaged library item",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const entryId = crypto.randomUUID();
    const createdEntry = {
      id: entryId,
      title: item.title,
      sourceItemId: item.id,
    };

    const mockDb = createMockDatabase({
      items: [],
      libraryEntries: [createdEntry],
    });

    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

    await undoTriage(
      {
        action: "library",
        originalItem: item,
        createdId: entryId,
      },
      mockDb
    );

    assert.equal(await mockDb.libraryEntries.get(entryId), undefined);
    assert.ok(await mockDb.items.get(item.id));
  });

  await t.test("Rolls back dismiss: restores inbox item and dispatches POST /api/inbox", async () => {
    const item = ItemSchema.parse({
      id: crypto.randomUUID(),
      title: "Accidentally dismissed thought",
      category: "inbox",
      priority: "medium",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockDb = createMockDatabase({ items: [] });
    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options.method });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await undoTriage({ action: "dismiss", originalItem: item }, mockDb);

    assert.ok(await mockDb.items.get(item.id));
    assert.ok(fetchCalls.some((c) => c.url === "/api/inbox" && c.method === "POST"));
  });
});

test("Phase 14: UI Component Verification & Zero GPU Blur Tax", () => {
  const inboxPageSrc = fs.readFileSync(path.resolve("src/app/inbox/page.tsx"), "utf8");

  // 1. One-click triage action buttons exist
  assert.ok(
    inboxPageSrc.includes('onClick={() => triggerTriage("task", item)}'),
    "Must have one-click task triage button"
  );
  assert.ok(
    inboxPageSrc.includes('onClick={() => triggerTriage("library", item)}'),
    "Must have one-click library triage button"
  );
  assert.ok(
    inboxPageSrc.includes('onClick={() => triggerTriage("dismiss", item)}'),
    "Must have one-click dismiss button"
  );

  // 2. Mobile touch target compliance (min-h-[44px] min-w-[44px])
  assert.ok(
    inboxPageSrc.includes("min-h-[44px] min-w-[44px]"),
    "One-click action buttons must satisfy mobile 44x44px touch targets"
  );

  // 3. Zero-GPU-Blur Undo Toast
  assert.ok(
    inboxPageSrc.includes('backdropFilter: "none"'),
    "Undo toast must specify backdropFilter: none"
  );
  assert.ok(
    inboxPageSrc.includes('WebkitBackdropFilter: "none"'),
    "Undo toast must specify WebkitBackdropFilter: none"
  );
  assert.ok(
    inboxPageSrc.includes("bottom-20 lg:bottom-6"),
    "Undo toast must be positioned above mobile bottom nav bar (bottom-20)"
  );
  assert.ok(
    inboxPageSrc.includes("handleUndo"),
    "Undo toast must connect to handleUndo handler"
  );
  assert.ok(
    inboxPageSrc.includes("4500"),
    "Undo toast auto-dismiss timer must be configured to 4500ms"
  );
});
