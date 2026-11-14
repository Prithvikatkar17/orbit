import test from "node:test";
import assert from "node:assert/strict";

import {
  executeUniversalSearch,
  warmSearchIndex,
  invalidateSearchCache,
  resetSearchIndex,
  getSearchIndexStats,
  searchIndexedDocs,
  searchAll,
  closeSearchSyncChannelForTest,
} from "../src/lib/services/search-service.ts";

test("Phase 10A: Staged Search — Empty and Whitespace Queries return immediately without loading", async () => {
  resetSearchIndex();

  const res1 = await executeUniversalSearch("");
  assert.equal(res1.totalMatches, 0);
  assert.deepEqual(res1.items, []);
  assert.deepEqual(res1.groups, []);

  const res2 = await executeUniversalSearch("   ");
  assert.equal(res2.totalMatches, 0);
  assert.deepEqual(res2.items, []);

  // warmSearchIndex does not throw in Node mock environment
  await warmSearchIndex(null);
  assert.ok(true, "warmSearchIndex should safely execute without throwing");
});

test("Phase 10A: Staged Search — In-Memory Indexed Search with exact relevance scoring", () => {
  const docs = [
    {
      id: "task-1",
      module: "task",
      title: "Write documentation for ORBIT",
      normTitle: "write documentation for orbit",
      notes: "Explain staged search index and LRU caching mechanisms.",
      normNotes: "explain staged search index and lru caching mechanisms.",
      tags: ["docs", "performance"],
      normTags: ["docs", "performance"],
      updatedAt: "2026-11-14T00:00:00.000Z",
      badge: "Task",
      badgeColor: "indigo",
      route: "/tasks?taskId=task-1",
      originalRecord: { id: "task-1" },
    },
    {
      id: "task-2",
      module: "task",
      title: "Staged Search Performance",
      normTitle: "staged search performance",
      notes: "Optimize Universal Search memory consumption.",
      normNotes: "optimize universal search memory consumption.",
      tags: ["performance"],
      normTags: ["performance"],
      updatedAt: "2026-11-14T00:00:00.000Z",
      badge: "Task",
      badgeColor: "indigo",
      route: "/tasks?taskId=task-2",
      originalRecord: { id: "task-2" },
    },
    {
      id: "entry-1",
      module: "note",
      title: "Architecture Decisions",
      normTitle: "architecture decisions",
      notes: "We decided to avoid loading 10,000 tasks on modal open.",
      normNotes: "we decided to avoid loading 10,000 tasks on modal open.",
      tags: ["arch"],
      normTags: ["arch"],
      updatedAt: "2026-11-10T00:00:00.000Z",
      badge: "Note",
      badgeColor: "purple",
      route: "/library?entryId=entry-1&view=note",
      originalRecord: { id: "entry-1" },
    },
  ];

  // 1. Exact title match should score highest
  const results = searchIndexedDocs("Staged Search Performance", docs);
  assert.equal(results.items[0].id, "task-2");
  assert.ok(results.items[0].score >= 120, "Exact title match should score >= 120");

  // 2. Tag match
  const tagResults = searchIndexedDocs("docs", docs);
  assert.equal(tagResults.totalMatches, 1);
  assert.equal(tagResults.items[0].id, "task-1");

  // 3. Note content match with snippet extraction
  const noteResults = searchIndexedDocs("10,000 tasks", docs);
  assert.equal(noteResults.totalMatches, 1);
  assert.equal(noteResults.items[0].id, "entry-1");
  assert.ok(noteResults.items[0].snippet, "Should extract snippet for note match");
  assert.ok(noteResults.items[0].snippet.text.includes("10,000 tasks"));
});

test("Phase 10A: Staged Search — Module Filter strictly scopes returned items", () => {
  const docs = [
    {
      id: "t-1",
      module: "task",
      title: "Meditation Practice",
      normTitle: "meditation practice",
      tags: [],
      normTags: [],
      badge: "Task",
      badgeColor: "indigo",
      route: "/tasks?taskId=t-1",
      originalRecord: {},
    },
    {
      id: "h-1",
      module: "habit",
      title: "Meditation Daily",
      normTitle: "meditation daily",
      tags: [],
      normTags: [],
      badge: "Habit",
      badgeColor: "violet",
      route: "/habits?habitId=h-1",
      originalRecord: {},
    },
  ];

  // All filter finds both
  const all = searchIndexedDocs("meditation", docs, { moduleFilter: "all" });
  assert.equal(all.totalMatches, 2);

  // Task filter finds only task
  const tasksOnly = searchIndexedDocs("meditation", docs, { moduleFilter: "task" });
  assert.equal(tasksOnly.totalMatches, 1);
  assert.equal(tasksOnly.items[0].module, "task");

  // Habit filter finds only habit
  const habitsOnly = searchIndexedDocs("meditation", docs, { moduleFilter: "habit" });
  assert.equal(habitsOnly.totalMatches, 1);
  assert.equal(habitsOnly.items[0].module, "habit");
});

test("Phase 10A: Staged Search — Bounded Top-25 Winner Maintenance at Scale", () => {
  // Generate 500 matching items with varying scores
  const docs = Array.from({ length: 500 }, (_, i) => ({
    id: `item-${i}`,
    module: "task",
    title: `Task ${i} - Common Search Token`,
    normTitle: `task ${i} - common search token`,
    tags: [],
    normTags: [],
    updatedAt: `2026-11-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    badge: "Task",
    badgeColor: "indigo",
    route: `/tasks?taskId=item-${i}`,
    originalRecord: {},
  }));

  const res = searchIndexedDocs("common", docs, { limit: 25 });
  assert.equal(res.totalMatches, 500, "Must report accurate totalMatches count");
  assert.equal(res.items.length, 25, "Must strictly bound items to limit");

  // Verify sort order
  for (let i = 0; i < res.items.length - 1; i++) {
    const a = res.items[i];
    const b = res.items[i + 1];
    assert.ok(
      a.score >= b.score,
      `Item at ${i} (score: ${a.score}) must have >= score than item at ${i + 1} (score: ${b.score})`
    );
  }
});

test("Phase 10A: Cache Invalidation & Stats Lifecycle", () => {
  resetSearchIndex();
  let stats = getSearchIndexStats();
  assert.equal(stats.entryCount, 0);
  assert.equal(stats.dirtyTables.length, 6);

  invalidateSearchCache(["tasks"]);
  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"));

  // Verify searchAll backward-compatibility
  const legacyData = {
    tasks: [{ id: "t-legacy", title: "Legacy Task", status: "todo", priority: "medium", category: "work", createdAt: "2026-11-01" }],
  };
  const legacyRes = searchAll("legacy", legacyData, { limit: 10 });
  assert.equal(legacyRes.totalMatches, 1);
  assert.equal(legacyRes.items[0].id, "t-legacy");
});

test("Phase 10A Verification: LRU Query Cache strictly bounds to 50 items and normalizes queries", async () => {
  resetSearchIndex();

  // Create a mock database with 1 task
  const mockTasks = [
    {
      id: "task-lru-1",
      title: "Deep Focus Session",
      category: "work",
      priority: "high",
      tags: ["focus"],
      createdAt: "2026-11-14T00:00:00.000Z",
    },
  ];

  const mockDb = {
    tasks: {
      toArray: async () => [...mockTasks],
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // 1. First search warms index and caches result
  const res1 = await executeUniversalSearch("focus", {}, mockDb);
  assert.equal(res1.totalMatches, 1);

  let stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 1);

  // 2. Normalized query hits cache without loading
  const resNorm = await executeUniversalSearch("   FOCUS    ", {}, mockDb);
  assert.equal(resNorm.totalMatches, 1);
  stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 1, "Normalized whitespace/casing query must hit cache");

  // 3. Module filter isolation: different filter creates separate cache entry
  const resFiltered = await executeUniversalSearch("focus", { moduleFilter: "task" }, mockDb);
  assert.equal(resFiltered.totalMatches, 1);
  stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 2, "Module filter must isolate cache entry");

  // Filter for 'event' yields 0 matches and isolated entry
  const resEvent = await executeUniversalSearch("focus", { moduleFilter: "event" }, mockDb);
  assert.equal(resEvent.totalMatches, 0);
  stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 3);

  // 4. Fill cache with 50+ queries to verify LRU capacity capping at 50
  for (let i = 0; i < 60; i++) {
    await executeUniversalSearch(`query-${i}`, {}, mockDb);
  }

  stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 50, "Query cache must strictly cap at MAX_QUERY_CACHE_SIZE (50)");

  // 5. Invalidation purges query cache
  invalidateSearchCache(["tasks"]);
  stats = getSearchIndexStats();
  assert.equal(stats.queryCacheSize, 0, "Invalidation must immediately purge query cache");
});

test("Phase 10A Verification: Dexie Lifecycle Hooks & Method Interception (bulkPut, bulkDelete, clear)", async () => {
  resetSearchIndex();

  const hookEvents = [];
  const registeredHooks = {};

  const mockTable = {
    hook: (event, fn) => {
      registeredHooks[event] = fn;
    },
    clear: async () => {
      hookEvents.push("clear_called");
    },
    bulkPut: async (items) => {
      hookEvents.push(`bulkPut_${items.length}`);
    },
    bulkAdd: async (items) => {
      hookEvents.push(`bulkAdd_${items.length}`);
    },
    bulkDelete: async (keys) => {
      hookEvents.push(`bulkDelete_${keys.length}`);
    },
    toArray: async () => [],
  };

  const mockDb = {
    tasks: mockTable,
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // Import registerSearchDatabaseHooks
  const { registerSearchDatabaseHooks } = await import("../src/lib/services/search-service.ts");
  registerSearchDatabaseHooks(mockDb, true);

  // Verify Dexie hooks registered
  assert.ok(typeof registeredHooks.creating === "function", "Must register creating hook");
  assert.ok(typeof registeredHooks.updating === "function", "Must register updating hook");
  assert.ok(typeof registeredHooks.deleting === "function", "Must register deleting hook");

  // 1. Simulating Dexie creating hook (add/put)
  resetSearchIndex();
  let stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"));

  // Clear dirty state by syncing
  await executeUniversalSearch("test", {}, mockDb);
  stats = getSearchIndexStats();
  assert.equal(stats.dirtyTables.includes("tasks"), false, "Tasks should be clean after sync");

  // Fire creating hook
  registeredHooks.creating();
  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"), "Creating hook must mark tasks dirty");

  // Sync again
  await executeUniversalSearch("test", {}, mockDb);
  assert.equal(getSearchIndexStats().dirtyTables.includes("tasks"), false);

  // 2. Simulating table.clear() (e.g. backup replace or settings reset)
  await mockTable.clear();
  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"), "table.clear() must mark table dirty");
  assert.ok(hookEvents.includes("clear_called"));

  // Sync again
  await executeUniversalSearch("test", {}, mockDb);
  assert.equal(getSearchIndexStats().dirtyTables.includes("tasks"), false);

  // 3. Simulating table.bulkPut() (e.g. backup import)
  await mockTable.bulkPut([{ id: "t1" }, { id: "t2" }]);
  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"), "bulkPut must mark table dirty");

  // 4. Simulating table.bulkDelete()
  await executeUniversalSearch("test", {}, mockDb);
  await mockTable.bulkDelete(["t1"]);
  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"), "bulkDelete must mark table dirty");
});

test("Phase 10A Verification: Concurrency & Mutex (no redundant IndexedDB reads)", async () => {
  resetSearchIndex();

  let toArrayCallCount = 0;
  const mockDb = {
    tasks: {
      toArray: async () => {
        toArrayCallCount++;
        // Small delay to simulate async IndexedDB
        await new Promise((r) => setTimeout(r, 20));
        return [{ id: "t-1", title: "Concurrent Task", createdAt: "2026-11-14T00:00:00.000Z" }];
      },
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // Launch 5 simultaneous search requests at the exact same time
  const [r1, r2, r3, r4, r5] = await Promise.all([
    executeUniversalSearch("concurrent", {}, mockDb),
    executeUniversalSearch("concurrent", {}, mockDb),
    executeUniversalSearch("concurrent", {}, mockDb),
    executeUniversalSearch("concurrent", {}, mockDb),
    executeUniversalSearch("concurrent", {}, mockDb),
  ]);

  assert.equal(r1.totalMatches, 1);
  assert.equal(r2.totalMatches, 1);
  assert.equal(r3.totalMatches, 1);
  assert.equal(r4.totalMatches, 1);
  assert.equal(r5.totalMatches, 1);

  // Exactly 1 toArray() execution occurred across all 5 concurrent calls
  assert.equal(toArrayCallCount, 1, "Concurrent sync calls must reuse in-flight promise and read DB only once");
});

test("Phase 10A Verification: Updates occurring during index construction are never lost", async () => {
  resetSearchIndex();

  let readCount = 0;
  const currentItems = [{ id: "t-initial", title: "Initial Task", createdAt: "2026-11-14T00:00:00.000Z" }];

  const mockDb = {
    tasks: {
      toArray: async () => {
        readCount++;
        if (readCount === 1) {
          // While the first read is in-flight, simulate a mutation (user adds a new task)
          await new Promise((r) => setTimeout(r, 10));
          currentItems.push({ id: "t-added-during-read", title: "Added During Sync", createdAt: "2026-11-14T00:00:00.000Z" });
          invalidateSearchCache(["tasks"]);
          return currentItems.slice(0, 1); // Returns only initial task
        }
        return [...currentItems]; // Second read returns both tasks
      },
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  const res = await executeUniversalSearch("during", {}, mockDb);
  assert.equal(res.totalMatches, 1, "Must pick up the item added during sync");
  assert.equal(res.items[0].id, "t-added-during-read");
  assert.equal(readCount, 2, "Must perform a follow-up sync when mutation occurred during read");
});

test("Phase 10A Verification: Deleted records disappear immediately", async () => {
  resetSearchIndex();

  let currentTasks = [
    { id: "t-keep", title: "Keep this task", createdAt: "2026-11-14T00:00:00.000Z" },
    { id: "t-delete", title: "Delete this task", createdAt: "2026-11-14T00:00:00.000Z" },
  ];

  const mockDb = {
    tasks: {
      toArray: async () => [...currentTasks],
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // 1. Initial search finds both
  const res1 = await executeUniversalSearch("task", {}, mockDb);
  assert.equal(res1.totalMatches, 2);

  // 2. Record is deleted and cache is invalidated
  currentTasks = currentTasks.filter((t) => t.id !== "t-delete");
  invalidateSearchCache(["tasks"]);

  // 3. Next search immediately reflects deletion
  const res2 = await executeUniversalSearch("task", {}, mockDb);
  assert.equal(res2.totalMatches, 1);
  assert.equal(res2.items[0].id, "t-keep");

  // Querying specifically for deleted task yields 0
  const resDeleted = await executeUniversalSearch("delete", {}, mockDb);
  assert.equal(resDeleted.totalMatches, 0);
});

test("Phase 10A Verification: Multi-Tab Synchronization via BroadcastChannel", async () => {
  if (typeof BroadcastChannel === "undefined") {
    return; // Node versions without BroadcastChannel skip
  }

  resetSearchIndex();

  // Create mock DB
  const mockDb = {
    tasks: {
      toArray: async () => [{ id: "t-1", title: "Tab Sync Task", createdAt: "2026-11-14T00:00:00.000Z" }],
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // Warm local cache
  await executeUniversalSearch("tab", {}, mockDb);
  let stats = getSearchIndexStats();
  assert.ok(stats.isWarm, "Local cache should be warm");
  assert.equal(stats.queryCacheSize, 1);

  // Simulate a separate browser tab sending an invalidation message over the channel
  const otherTabChannel = new BroadcastChannel("orbit_search_sync_channel");

  otherTabChannel.postMessage({
    type: "invalidate",
    tables: ["tasks"],
    senderId: "other_tab_999",
  });

  // Small delay for microtask broadcast dispatch
  await new Promise((r) => setTimeout(r, 25));

  stats = getSearchIndexStats();
  assert.ok(stats.dirtyTables.includes("tasks"), "Other tab's invalidate message must mark tasks dirty in current tab");
  assert.equal(stats.queryCacheSize, 0, "Other tab's invalidate message must purge current tab's query cache");

  // Simulate a separate browser tab sending a reset message
  otherTabChannel.postMessage({
    type: "reset",
    senderId: "other_tab_999",
  });

  await new Promise((r) => setTimeout(r, 25));
  stats = getSearchIndexStats();
  assert.equal(stats.entryCount, 0, "Other tab's reset message must clear current tab's entryCount");
  assert.equal(stats.dirtyTables.length, 6, "All 6 tables must be marked dirty");

  otherTabChannel.close();
});

test("Phase 10A Verification: Failed IndexedDB reads recover gracefully", async () => {
  resetSearchIndex();

  let shouldFail = true;
  const mockDb = {
    tasks: {
      toArray: async () => {
        if (shouldFail) {
          throw new Error("QuotaExceededError: Database disk is full");
        }
        return [{ id: "t-recovered", title: "Recovered Task", createdAt: "2026-11-14T00:00:00.000Z" }];
      },
    },
    libraryEntries: { toArray: async () => [] },
    habits: { toArray: async () => [] },
    events: { toArray: async () => [] },
    items: { toArray: async () => [] },
    libraryCollections: { toArray: async () => [] },
  };

  // 1. Initial failed read throws
  await assert.rejects(
    async () => {
      await executeUniversalSearch("recovered", {}, mockDb);
    },
    { message: /QuotaExceededError/ }
  );

  // Verify index was not marked initialized
  let stats = getSearchIndexStats();
  assert.equal(stats.isWarm, false);
  assert.ok(stats.dirtyTables.includes("tasks"));

  // 2. Database recovers; next search succeeds seamlessly
  shouldFail = false;
  const res = await executeUniversalSearch("recovered", {}, mockDb);
  assert.equal(res.totalMatches, 1);
  assert.equal(res.items[0].id, "t-recovered");

  stats = getSearchIndexStats();
  assert.ok(stats.isWarm, "Index should be warm after recovery");
  closeSearchSyncChannelForTest();
});
