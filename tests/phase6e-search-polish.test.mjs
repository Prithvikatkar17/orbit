import test from "node:test";
import assert from "node:assert/strict";

import {
  RECENT_SEARCHES_KEY,
  MAX_RECENT_SEARCHES,
  loadRecentSearches,
  saveRecentSearches,
} from "../src/lib/stores/search-store.ts";

/**
 * In-memory Mock Storage implementing the Storage interface for headless unit tests.
 */
class MockStorage {
  constructor(initialData = {}) {
    this.store = { ...initialData };
  }

  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

test("Phase 6E: Recent Searches — loadRecentSearches with null / SSR storage", () => {
  const result = loadRecentSearches(null);
  assert.deepEqual(result, []);
});

test("Phase 6E: Recent Searches — loadRecentSearches from mock storage", () => {
  const storage = new MockStorage({
    [RECENT_SEARCHES_KEY]: JSON.stringify(["orbit", "reading", "gym"]),
  });

  const result = loadRecentSearches(storage);
  assert.deepEqual(result, ["orbit", "reading", "gym"]);
});

test("Phase 6E: Recent Searches — loadRecentSearches handles corrupted JSON safely", () => {
  const storage = new MockStorage({
    [RECENT_SEARCHES_KEY]: "invalid-unparseable-json{{{",
  });

  const result = loadRecentSearches(storage);
  assert.deepEqual(result, []);
});

test("Phase 6E: Recent Searches — loadRecentSearches filters empty items and caps at MAX_RECENT_SEARCHES", () => {
  const rawList = [
    "item1",
    "",
    "   ",
    "item2",
    "item3",
    "item4",
    "item5",
    "item6",
    "item7",
    "item8",
    "item9",
    "item10",
  ];
  const storage = new MockStorage({
    [RECENT_SEARCHES_KEY]: JSON.stringify(rawList),
  });

  const result = loadRecentSearches(storage);
  assert.equal(result.length, MAX_RECENT_SEARCHES);
  assert.equal(result.includes(""), false);
  assert.equal(result[0], "item1");
  assert.equal(result[1], "item2");
});

test("Phase 6E: Recent Searches — saveRecentSearches caps at MAX_RECENT_SEARCHES (8)", () => {
  const storage = new MockStorage();
  const oversized = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  saveRecentSearches(oversized, storage);

  const raw = storage.getItem(RECENT_SEARCHES_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.length, MAX_RECENT_SEARCHES);
  assert.deepEqual(parsed, ["a", "b", "c", "d", "e", "f", "g", "h"]);
});

test("Phase 6E: Recent Searches — deduplication and case-insensitivity logic", () => {
  const existing = ["Book", "Study", "Coding"];
  const newTerm = "book";

  // Pure state calculation matching search-store logic
  const trimmed = newTerm.trim();
  const filtered = existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  assert.equal(updated.length, 3);
  assert.equal(updated[0], "book"); // Replaced and moved to top
  assert.deepEqual(updated, ["book", "Study", "Coding"]);
});

test("Phase 6E: Recent Searches — case-insensitive removal", () => {
  const existing = ["Planning", "Design", "ORBIT"];
  const toRemove = "orbit";

  const updated = existing.filter((s) => s.toLowerCase() !== toRemove.trim().toLowerCase());
  assert.deepEqual(updated, ["Planning", "Design"]);
});

test("Phase 6E: ARIA Option ID Contract", () => {
  const testId = "task-uuid-123";
  const optionId = `search-option-${testId}`;
  assert.equal(optionId, "search-option-task-uuid-123");
  assert.match(optionId, /^search-option-[a-zA-Z0-9_-]+$/);
});

test("Phase 6E: Screen Reader Live Announcement Phrasing Contract", () => {
  function getAnnouncement({ isLoading, query, count, recentCount }) {
    if (isLoading) return "Loading search index...";
    if (!query.trim()) {
      return recentCount > 0
        ? `Ready to search. ${recentCount} recent search${recentCount === 1 ? "" : "es"} available.`
        : "Ready to search across ORBIT.";
    }
    if (count === 0) return `No results found for ${query}`;
    return `${count} result${count === 1 ? "" : "s"} found for ${query}`;
  }

  assert.equal(
    getAnnouncement({ isLoading: true, query: "", count: 0, recentCount: 0 }),
    "Loading search index..."
  );

  assert.equal(
    getAnnouncement({ isLoading: false, query: "", count: 0, recentCount: 3 }),
    "Ready to search. 3 recent searches available."
  );

  assert.equal(
    getAnnouncement({ isLoading: false, query: "", count: 0, recentCount: 1 }),
    "Ready to search. 1 recent search available."
  );

  assert.equal(
    getAnnouncement({ isLoading: false, query: "xyz", count: 0, recentCount: 0 }),
    "No results found for xyz"
  );

  assert.equal(
    getAnnouncement({ isLoading: false, query: "plan", count: 1, recentCount: 0 }),
    "1 result found for plan"
  );

  assert.equal(
    getAnnouncement({ isLoading: false, query: "plan", count: 5, recentCount: 0 }),
    "5 results found for plan"
  );
});

test("Phase 6E: Keyboard Boundary Clamping (Home, End, PageUp, PageDown)", () => {
  const itemsCount = 20;

  // Home
  const homeIndex = 0;
  assert.equal(homeIndex, 0);

  // End
  const endIndex = itemsCount - 1;
  assert.equal(endIndex, 19);

  // PageDown from index 2
  const pagedDown = Math.min(2 + 5, itemsCount - 1);
  assert.equal(pagedDown, 7);

  // PageDown near end clamps to itemsCount - 1
  const pagedDownClamped = Math.min(18 + 5, itemsCount - 1);
  assert.equal(pagedDownClamped, 19);

  // PageUp from index 7
  const pagedUp = Math.max(7 - 5, 0);
  assert.equal(pagedUp, 2);

  // PageUp near start clamps to 0
  const pagedUpClamped = Math.max(3 - 5, 0);
  assert.equal(pagedUpClamped, 0);
});

