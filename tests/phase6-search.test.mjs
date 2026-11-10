import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeQuery,
  tokenizeQuery,
  isWithinLastDays,
  findMatchOffsets,
  extractSnippet,
  scoreSearchItem,
  searchAll,
} from "../src/lib/services/search-service.ts";

test("Phase 6B: Query Normalization and Tokenization", () => {
  assert.equal(normalizeQuery("  Hello   World  "), "hello world");
  assert.deepEqual(tokenizeQuery("  Launch  ORBIT  v1.0  "), ["launch", "orbit", "v1.0"]);
  assert.deepEqual(tokenizeQuery(""), []);
  assert.deepEqual(tokenizeQuery("   "), []);
  // Preserves symbols like #tags and +
  assert.deepEqual(tokenizeQuery("#urgent c++ .NET"), ["#urgent", "c++", ".net"]);
});

test("Phase 6B: Match Highlighting Character Offsets", () => {
  const text = "Orbit is an offline-first system for orbit users.";
  const tokens = ["orbit"];
  const offsets = findMatchOffsets(text, tokens);

  assert.equal(offsets.length, 2);
  assert.deepEqual(offsets[0], { start: 0, end: 5 });
  assert.deepEqual(offsets[1], { start: 37, end: 42 });

  // Multiple overlapping tokens should merge gracefully
  const merged = findMatchOffsets("Launch Orbit Platform", ["orbit", "orbit plat"]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], { start: 7, end: 17 });
});

test("Phase 6B: Snippet Extraction with Context and Safe Offsets", () => {
  const content =
    "In the early days of personal software development, the concept of offline-first architecture emerged as a solution to intermittent connectivity. Local databases like Dexie ensure complete autonomy.";
  const snippet = extractSnippet(content, ["offline-first"], 30);

  assert.ok(snippet);
  assert.ok(snippet.text.includes("offline-first"));
  assert.ok(snippet.hasLeadingEllipsis, "Should have leading ellipsis");
  assert.ok(snippet.hasTrailingEllipsis, "Should have trailing ellipsis");
  assert.ok(snippet.text.startsWith("..."));
  assert.ok(snippet.text.endsWith("..."));

  // Check offset accuracy
  const slice = snippet.text.substring(snippet.matchStart, snippet.matchEnd);
  assert.equal(slice.toLowerCase(), "offline-first");

  // Handles long Markdown note (50,000 characters) safely
  const padding = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(700);
  const largeNote = `${padding} SPECIAL_KEYWORD_MATCH ${padding}`;
  assert.ok(largeNote.length > 40000);

  const t0 = performance.now();
  const largeSnippet = extractSnippet(largeNote, ["special_keyword_match"], 40);
  const t1 = performance.now();

  assert.ok(t1 - t0 < 50, "Large markdown extraction must be instantaneous (<50ms)");
  assert.ok(largeSnippet);
  assert.ok(largeSnippet.text.includes("SPECIAL_KEYWORD_MATCH"));
});

test("Phase 6B: Weighted Relevance Scoring Hierarchy", () => {
  const currentDate = "2026-11-09";

  // 1. Exact title match (+100 + 20 word boundary = 120)
  const exact = scoreSearchItem({
    title: "Gym",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z", // old, no recency
  });
  assert.equal(exact.score, 120);

  // 2. Prefix title match (+50 + 20 word boundary = 70)
  const prefix = scoreSearchItem({
    title: "Gym Workout Routine",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(prefix.score, 70);

  // 3. Partial / non-prefix title match (+20 word boundary)
  const partial = scoreSearchItem({
    title: "Morning Gym Session",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(partial.score, 20);

  // 4. Exact tag match (+30)
  const tagMatch = scoreSearchItem({
    title: "Fitness Plan",
    tags: ["gym", "health"],
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(tagMatch.score, 30);

  // 5. URL or Filename match (+25)
  const urlMatch = scoreSearchItem({
    title: "Fitness Plan",
    url: "https://gym-exercises.org",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(urlMatch.score, 25);

  const fileMatch = scoreSearchItem({
    title: "Fitness Plan",
    fileName: "gym-schedule.pdf",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(fileMatch.score, 25);

  // 6. Notes only match (+10)
  const notesMatch = scoreSearchItem({
    title: "Daily Tasks",
    notes: "Remember to visit the gym today.",
    query: "gym",
    tokens: ["gym"],
    currentDate,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(notesMatch.score, 10);

  // Hierarchy validation
  assert.ok(exact.score > prefix.score);
  assert.ok(prefix.score > tagMatch.score);
  assert.ok(tagMatch.score > urlMatch.score);
  assert.ok(urlMatch.score > partial.score);
  assert.ok(partial.score > notesMatch.score);
});

test("Phase 6B: Recency Boost (+5 for records within 7 days)", () => {
  const currentDate = "2026-11-09";

  // Verify isWithinLastDays utility
  assert.equal(isWithinLastDays("2026-11-08T10:00:00.000Z", 7, currentDate), true);
  assert.equal(isWithinLastDays("2026-10-15T10:00:00.000Z", 7, currentDate), false);
  assert.equal(isWithinLastDays(undefined, 7, currentDate), false);

  const recentItem = scoreSearchItem({
    title: "Quarterly Review",
    query: "quarterly",
    tokens: ["quarterly"],
    updatedAt: "2026-11-08T10:00:00.000Z", // 1 day ago -> within 7 days
    currentDate,
  });

  const olderItem = scoreSearchItem({
    title: "Quarterly Review",
    query: "quarterly",
    tokens: ["quarterly"],
    updatedAt: "2026-10-15T10:00:00.000Z", // 25 days ago -> outside 7 days
    currentDate,
  });

  assert.equal(recentItem.score, olderItem.score + 5, "Recent item should get +5 boost");
});

test("Phase 6B: Multi-token Queries require all tokens across fields", () => {
  // Query: "orbit architecture"
  const tokens = ["orbit", "architecture"];

  // Item A: has "orbit" in title, "architecture" in notes -> MATCHES
  const itemA = scoreSearchItem({
    title: "Orbit System",
    notes: "System architecture and guidelines.",
    query: "orbit architecture",
    tokens,
  });
  assert.equal(itemA.isMatch, true);

  // Item B: has "orbit" in title, but no "architecture" anywhere -> DOES NOT MATCH
  const itemB = scoreSearchItem({
    title: "Orbit System",
    notes: "General user manual.",
    query: "orbit architecture",
    tokens,
  });
  assert.equal(itemB.isMatch, false);
  assert.equal(itemB.score, 0);
});

test("Phase 6B: Search across All Entity Types (Tasks, Notes, Files, Habits, Events, Inbox, Collections)", () => {
  const dataSources = {
    tasks: [
      {
        id: "t1",
        title: "Deploy Orbit v1",
        category: "task",
        priority: "high",
        status: "todo",
        sortOrder: 0,
        tags: ["deploy", "v1"],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "g1",
        title: "Achieve Orbit Financial Independence",
        category: "goal",
        priority: "high",
        status: "in_progress",
        sortOrder: 0,
        tags: ["goal", "finance"],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    libraryEntries: [
      {
        id: "n1",
        title: "Orbit Architectural Notes",
        notes: "Detailed documentation of Orbit Dexie storage.",
        type: "note",
        status: "saved",
        isFavorite: false,
        tags: ["docs"],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "f1",
        title: "Orbit Technical Specification",
        type: "file",
        status: "saved",
        isFavorite: false,
        fileMetadata: {
          fileId: "00000000-0000-0000-0000-000000000001",
          fileName: "orbit-spec.pdf",
          fileType: "application/pdf",
          fileSize: 10240,
        },
        tags: [],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    habits: [
      {
        id: "h1",
        title: "Orbit Meditation Habit",
        notes: "Daily mindfulness for Orbit team.",
        frequency: "daily",
        customDays: [],
        color: "#10b981",
        isActive: true,
        sortOrder: 0,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    events: [
      {
        id: "e1",
        title: "Orbit Launch Event",
        notes: "Live demo of Orbit features.",
        date: "2026-11-20",
        startTime: "10:00",
        isAllDay: false,
        type: "milestone",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    items: [
      {
        id: "i1",
        title: "Orbit feedback from user",
        notes: "Check offline persistence in Orbit.",
        status: "pending",
        category: "inbox",
        priority: "medium",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    collections: [
      {
        id: "c1",
        name: "Orbit Core Documentation",
        description: "Official guides for Orbit.",
        sortOrder: 0,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
  };

  const results = searchAll("orbit", dataSources);
  assert.equal(results.totalMatches, 8);
  assert.equal(results.items.length, 8);

  // Check module group presence
  const groupModules = results.groups.map((g) => g.module);
  assert.ok(groupModules.includes("task"));
  assert.ok(groupModules.includes("goal"));
  assert.ok(groupModules.includes("note"));
  assert.ok(groupModules.includes("file"));
  assert.ok(groupModules.includes("habit"));
  assert.ok(groupModules.includes("event"));
  assert.ok(groupModules.includes("inbox"));
  assert.ok(groupModules.includes("collection"));
});

test("Phase 6B: Module Filtering and Result Limits", () => {
  const dataSources = {
    tasks: [
      { id: "t1", title: "Test Alpha", category: "task", priority: "medium", status: "todo", sortOrder: 0, tags: [], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
      { id: "t2", title: "Test Beta", category: "task", priority: "medium", status: "todo", sortOrder: 1, tags: [], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
      { id: "t3", title: "Test Gamma", category: "task", priority: "medium", status: "todo", sortOrder: 2, tags: [], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
    ],
    habits: [
      { id: "h1", title: "Test Habit", frequency: "daily", customDays: [], color: "#10b981", isActive: true, sortOrder: 0, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" },
    ],
  };

  // Filter only habits
  const habitOnly = searchAll("test", dataSources, { moduleFilter: "habit" });
  assert.equal(habitOnly.totalMatches, 1);
  assert.equal(habitOnly.items[0].module, "habit");
  assert.equal(habitOnly.groups.length, 1);
  assert.equal(habitOnly.groups[0].module, "habit");

  // Limit results to 2
  const limited = searchAll("test", dataSources, { limit: 2 });
  assert.equal(limited.totalMatches, 4);
  assert.equal(limited.items.length, 2);
});

test("Phase 6B: Deterministic Ranking and Stable Tie-Breaking", () => {
  const dataSources = {
    tasks: [
      // Same title, same score -> broken by updatedAt descending
      { id: "t-old", title: "Same Title", category: "task", priority: "medium", status: "todo", sortOrder: 0, tags: [], createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
      { id: "t-new", title: "Same Title", category: "task", priority: "medium", status: "todo", sortOrder: 0, tags: [], createdAt: "2026-10-10T00:00:00.000Z", updatedAt: "2026-10-10T00:00:00.000Z" },
      // Same score, same updatedAt -> broken by alphabetical title
      { id: "t-z", title: "Zebra Task", category: "task", priority: "medium", status: "todo", sortOrder: 0, tags: ["common"], createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
      { id: "t-a", title: "Apple Task", category: "task", priority: "medium", status: "todo", sortOrder: 0, tags: ["common"], createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
    ],
  };

  const results = searchAll("Same Title", dataSources);
  assert.equal(results.items[0].id, "t-new", "More recently updated item wins tie");
  assert.equal(results.items[1].id, "t-old");

  const commonResults = searchAll("common", dataSources);
  assert.equal(commonResults.items[0].id, "t-a", "Alphabetical title wins tie");
  assert.equal(commonResults.items[1].id, "t-z");
});

test("Phase 6B: Special Characters, Regex Symbols, and Unicode", () => {
  const dataSources = {
    tasks: [
      {
        id: "t-special",
        title: "Task with [regex] (symbols) & C++",
        category: "task",
        priority: "medium",
        status: "todo",
        sortOrder: 0,
        tags: ["c++", "#v1.0"],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "t-unicode",
        title: "Café München Meetup 🌱",
        category: "task",
        priority: "low",
        status: "todo",
        sortOrder: 0,
        tags: ["travel"],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
  };

  // Regex special characters in query: [regex]
  const regexSearch = searchAll("[regex]", dataSources);
  assert.equal(regexSearch.totalMatches, 1);
  assert.equal(regexSearch.items[0].id, "t-special");

  // Symbols in query: C++
  const symbolSearch = searchAll("c++", dataSources);
  assert.equal(symbolSearch.totalMatches, 1);
  assert.equal(symbolSearch.items[0].id, "t-special");

  // Unicode case-insensitive: café
  const unicodeSearch = searchAll("café", dataSources);
  assert.equal(unicodeSearch.totalMatches, 1);
  assert.equal(unicodeSearch.items[0].id, "t-unicode");

  const emojiSearch = searchAll("🌱", dataSources);
  assert.equal(emojiSearch.totalMatches, 1);
  assert.equal(emojiSearch.items[0].id, "t-unicode");
});

test("Phase 6B: Empty Queries and Empty Datasets", () => {
  // Empty queries
  assert.deepEqual(searchAll("", {}), { query: "", totalMatches: 0, items: [], groups: [] });
  assert.deepEqual(searchAll("   ", {}), { query: "", totalMatches: 0, items: [], groups: [] });

  // Empty datasets with query
  const emptyRes = searchAll("anything", {});
  assert.equal(emptyRes.totalMatches, 0);
  assert.equal(emptyRes.items.length, 0);
  assert.equal(emptyRes.groups.length, 0);
});
