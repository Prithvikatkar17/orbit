import test from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import {
  LibraryEntrySchema,
  LIBRARY_ENTRY_TYPES,
} from "../src/lib/schemas/library-entry.ts";
import { ItemSchema } from "../src/lib/schemas/item.ts";
import { normalizeUrl } from "../src/lib/utils/dates.ts";

// Dexie OrbitDatabase v2 test definition
class OrbitPhase4CTestDatabase extends Dexie {
  constructor() {
    super("orbit-test-phase4c-schemas");

    this.version(1).stores({
      items:          "id, status, category, priority, createdAt",
      tasks:          "id, status, category, priority, dueDate, sortOrder, createdAt",
      habits:         "id, isActive, sortOrder",
      habitLogs:      "id, habitId, date, [habitId+date]",
      events:         "id, type, date, [date+startTime]",
      reminders:      "id, eventId, isActive, lastNotifiedOccurrenceDate, [eventId+isActive]",
      libraryEntries: "id, type, status, createdAt",
      categories:     "id, module, sortOrder",
      settings:       "id",
    });

    this.version(2).stores({
      libraryEntries:     "id, type, status, collectionId, isFavorite, lastViewedAt, createdAt, *tags",
      libraryCollections: "id, name, sortOrder, createdAt",
      libraryFiles:       "id, entryId, fileName, fileType, createdAt",
    });
  }
}

test("Phase 4C — Create Resource with Full Metadata across Modern Types", () => {
  const now = new Date().toISOString();
  const collectionId = crypto.randomUUID();

  // Test creation across all 12 supported resource types
  for (const type of LIBRARY_ENTRY_TYPES) {
    const entryId = crypto.randomUUID();
    const entry = LibraryEntrySchema.parse({
      id: entryId,
      title: `Resource: ${type}`,
      notes: `Detailed notes for ${type} resource with markdown support.`,
      link: normalizeUrl(type === "note" ? undefined : `https://example.com/${type}`),
      type,
      status: "in_progress",
      rating: 4,
      tags: [type, "featured", "phase4c"],
      isFavorite: true,
      collectionId,
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(entry.id, entryId);
    assert.equal(entry.type, type);
    assert.equal(entry.status, "in_progress");
    assert.equal(entry.isFavorite, true);
    assert.equal(entry.collectionId, collectionId);
    assert.equal(entry.rating, 4);
    assert.deepEqual(entry.tags, [type, "featured", "phase4c"]);
  }
});

test("Phase 4C — View Resource and LastViewedAt Tracking", () => {
  const createdDate = "2026-11-01T10:00:00.000Z";
  const id = crypto.randomUUID();

  const entry = LibraryEntrySchema.parse({
    id,
    title: "Deep Dive into TypeScript 5",
    type: "article",
    status: "saved",
    createdAt: createdDate,
    updatedAt: createdDate,
  });

  assert.equal(entry.lastViewedAt, undefined);

  // Simulate view action
  const viewTimestamp = new Date().toISOString();
  const viewedEntry = LibraryEntrySchema.parse({
    ...entry,
    lastViewedAt: viewTimestamp,
    updatedAt: viewTimestamp,
  });

  assert.equal(viewedEntry.lastViewedAt, viewTimestamp);
  assert.equal(viewedEntry.updatedAt, viewTimestamp);
  assert.equal(viewedEntry.createdAt, createdDate);
});

test("Phase 4C — Edit Resource Metadata, Collection Assignment and Tags", () => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const original = LibraryEntrySchema.parse({
    id,
    title: "Initial Draft Title",
    notes: "Short initial notes",
    type: "bookmark",
    status: "saved",
    tags: ["draft"],
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  });

  // Perform Edit
  const newCollectionId = crypto.randomUUID();
  const editedTime = new Date().toISOString();
  const edited = LibraryEntrySchema.parse({
    ...original,
    title: "Updated Final Title",
    notes: "Expanded key takeaways and extensive summary notes.",
    type: "learn",
    status: "in_progress",
    rating: 5,
    collectionId: newCollectionId,
    tags: ["draft", "finalized", "typescript"],
    isFavorite: true,
    updatedAt: editedTime,
  });

  assert.equal(edited.title, "Updated Final Title");
  assert.equal(edited.type, "learn");
  assert.equal(edited.status, "in_progress");
  assert.equal(edited.rating, 5);
  assert.equal(edited.collectionId, newCollectionId);
  assert.equal(edited.isFavorite, true);
  assert.deepEqual(edited.tags, ["draft", "finalized", "typescript"]);
});

test("Phase 4C — Quick Capture Integration for Library Resources", () => {
  const now = new Date().toISOString();
  const collectionId = crypto.randomUUID();

  // Test capture with collection, tags, favourite, and status
  const quickCapturedEntry = LibraryEntrySchema.parse({
    id: crypto.randomUUID(),
    title: "Quick Captured Video Tutorial",
    notes: "Found during research session via Ctrl+K",
    link: normalizeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ"),
    type: "video",
    status: "in_progress",
    collectionId,
    tags: ["video", "research", "quick-capture"],
    isFavorite: true,
    createdAt: now,
    updatedAt: now,
  });

  assert.ok(quickCapturedEntry);
  assert.equal(quickCapturedEntry.title, "Quick Captured Video Tutorial");
  assert.equal(quickCapturedEntry.type, "video");
  assert.equal(quickCapturedEntry.collectionId, collectionId);
  assert.equal(quickCapturedEntry.isFavorite, true);
  assert.equal(quickCapturedEntry.status, "in_progress");
  assert.ok(quickCapturedEntry.tags.includes("quick-capture"));
});

test("Phase 4C — Inbox Item Conversion to Library Entry Contract", () => {
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();

  // 1. Initial pending inbox item
  const inboxItem = ItemSchema.parse({
    id: itemId,
    title: "Interesting Machine Learning Article",
    notes: "Saved from mobile browser",
    link: normalizeUrl("https://example.com/ml-article"),
    category: "inbox",
    priority: "medium",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  // 2. Convert to Library entry
  const targetCollectionId = crypto.randomUUID();
  const libraryEntryId = crypto.randomUUID();
  const convertedEntry = LibraryEntrySchema.parse({
    id: libraryEntryId,
    title: inboxItem.title,
    notes: inboxItem.notes,
    link: inboxItem.link,
    type: "article",
    status: "saved",
    collectionId: targetCollectionId,
    tags: ["inbox-converted", "ai", "machine-learning"],
    isFavorite: true,
    sourceItemId: inboxItem.id,
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(convertedEntry.title, "Interesting Machine Learning Article");
  assert.equal(convertedEntry.type, "article");
  assert.equal(convertedEntry.collectionId, targetCollectionId);
  assert.equal(convertedEntry.isFavorite, true);
  assert.equal(convertedEntry.sourceItemId, itemId);
  assert.ok(convertedEntry.tags.includes("inbox-converted"));
});

test("Phase 4C — Status Transitions and CompletedAt Lifecycle", () => {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // 1. Created as saved
  const savedEntry = LibraryEntrySchema.parse({
    id,
    title: "Rust Language Book",
    type: "learn",
    status: "saved",
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(savedEntry.status, "saved");
  assert.equal(savedEntry.completedAt, undefined);

  // 2. Transition to in_progress
  const inProgressTime = new Date().toISOString();
  const inProgressEntry = LibraryEntrySchema.parse({
    ...savedEntry,
    status: "in_progress",
    updatedAt: inProgressTime,
  });
  assert.equal(inProgressEntry.status, "in_progress");
  assert.equal(inProgressEntry.completedAt, undefined);

  // 3. Transition to completed -> completedAt populated
  const completedTime = new Date().toISOString();
  const completedEntry = LibraryEntrySchema.parse({
    ...inProgressEntry,
    status: "completed",
    completedAt: completedTime,
    updatedAt: completedTime,
  });
  assert.equal(completedEntry.status, "completed");
  assert.equal(completedEntry.completedAt, completedTime);

  // 4. Transition back to in_progress -> completedAt cleared
  const resumedEntry = LibraryEntrySchema.parse({
    ...completedEntry,
    status: "in_progress",
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
  });
  assert.equal(resumedEntry.status, "in_progress");
  assert.equal(resumedEntry.completedAt, undefined);
});

test("Phase 4C — Database Schema Verification for V2 Indexes", () => {
  const db = new OrbitPhase4CTestDatabase();
  const table = db.table("libraryEntries");
  assert.ok(table);

  const idxMap = new Map(table.schema.indexes.map((idx) => [idx.name, idx]));
  assert.ok(idxMap.has("type"), "type index required");
  assert.ok(idxMap.has("status"), "status index required");
  assert.ok(idxMap.has("collectionId"), "collectionId index required");
  assert.ok(idxMap.has("isFavorite"), "isFavorite index required");
  assert.ok(idxMap.has("lastViewedAt"), "lastViewedAt index required");
  assert.ok(idxMap.has("createdAt"), "createdAt index required");
  assert.ok(idxMap.has("tags"), "tags multi-entry index required");
  assert.ok(idxMap.get("tags")?.multi, "tags index must be multi (*tags)");

  db.close();
});
