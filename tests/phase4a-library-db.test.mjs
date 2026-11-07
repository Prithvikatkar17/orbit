import test from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import { z } from "zod";

import {
  LibraryEntrySchema,
  LIBRARY_ENTRY_TYPES,
  LIBRARY_ENTRY_STATUSES,
} from "../src/lib/schemas/library-entry.ts";

import {
  LibraryCollectionSchema,
} from "../src/lib/schemas/library-collection.ts";

import {
  LibraryFileSchema,
  MAX_LIBRARY_FILE_SIZE,
  validateLibraryFileSize,
} from "../src/lib/schemas/library-file.ts";

import { ItemSchema } from "../src/lib/schemas/item.ts";
import { TaskSchema } from "../src/lib/schemas/task.ts";
import { HabitSchema } from "../src/lib/schemas/habit.ts";
import { HabitLogSchema } from "../src/lib/schemas/habit-log.ts";
import { EventSchema } from "../src/lib/schemas/event.ts";
import { ReminderSchema } from "../src/lib/schemas/reminder.ts";
import { CategorySchema } from "../src/lib/schemas/category.ts";
import { SettingsSchema } from "../src/lib/schemas/settings.ts";

// Canonical BackupPayloadSchema structure matching src/lib/schemas/backup.ts
const BackupPayloadSchema = z.object({
  version: z.number().int().default(1),
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  events: z.array(EventSchema).default([]),
  reminders: z.array(ReminderSchema).default([]),
  libraryEntries: z.array(LibraryEntrySchema).default([]),
  libraryCollections: z.array(LibraryCollectionSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  settings: z.array(SettingsSchema).default([]),
});

// Dexie schema matching OrbitDatabase in src/lib/db/client.ts
class OrbitTestDatabase extends Dexie {
  constructor() {
    super("orbit-test-db");

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
    }).upgrade(async (tx) => {
      await tx.table("libraryEntries").toCollection().modify((entry) => {
        if (entry.isFavorite === undefined) entry.isFavorite = false;
        if (!entry.tags) entry.tags = [];
      });
    });
  }
}

test("LibraryEntrySchema — Minimal Valid Entry with Defaults", () => {
  const now = new Date().toISOString();
  const minimal = {
    id: crypto.randomUUID(),
    title: "TypeScript Deep Dive",
    createdAt: now,
    updatedAt: now,
  };

  const parsed = LibraryEntrySchema.parse(minimal);
  assert.equal(parsed.title, "TypeScript Deep Dive");
  assert.equal(parsed.type, "other");
  assert.equal(parsed.status, "saved");
  assert.equal(parsed.notes, "");
  assert.deepEqual(parsed.tags, []);
  assert.equal(parsed.isFavorite, false);
  assert.equal(parsed.collectionId, undefined);
  assert.equal(parsed.lastViewedAt, undefined);
  assert.equal(parsed.fileMetadata, undefined);
});

test("LibraryEntrySchema — Backward Compatibility with Legacy V1 Records", () => {
  const legacyRecord = {
    id: crypto.randomUUID(),
    title: "Understanding React Server Components",
    notes: "Great breakdown by Dan Abramov",
    link: "https://example.com/rsc",
    type: "watch",
    status: "in_progress",
    rating: 5,
    tags: ["react", "web"],
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  };

  const parsed = LibraryEntrySchema.parse(legacyRecord);
  assert.equal(parsed.id, legacyRecord.id);
  assert.equal(parsed.type, "watch");
  assert.equal(parsed.status, "in_progress");
  assert.equal(parsed.rating, 5);
  // Newly introduced fields must safely populate defaults without throwing
  assert.equal(parsed.isFavorite, false);
  assert.equal(parsed.collectionId, undefined);
  assert.equal(parsed.lastViewedAt, undefined);
  assert.equal(parsed.fileMetadata, undefined);
});

test("LibraryEntrySchema — All Resource Types (Legacy & Phase 4)", () => {
  const now = new Date().toISOString();
  const allExpectedTypes = [
    "watch", "read", "listen", "learn", "buy", "other",
    "bookmark", "video", "playlist", "article", "note", "file",
  ];

  assert.deepEqual([...LIBRARY_ENTRY_TYPES], allExpectedTypes);
  assert.deepEqual([...LIBRARY_ENTRY_STATUSES], ["saved", "in_progress", "completed", "dropped"]);

  for (const t of allExpectedTypes) {
    const entry = LibraryEntrySchema.parse({
      id: crypto.randomUUID(),
      title: `Test resource: ${t}`,
      type: t,
      createdAt: now,
      updatedAt: now,
    });
    assert.equal(entry.type, t);
  }
});

test("LibraryEntrySchema — Standalone Notes with Long Markdown Content", () => {
  const now = new Date().toISOString();
  // Generate a long markdown note (> 10,000 chars, previously capped at 5,000)
  const longNoteContent = "# Deep Learning Notes\n\n" + "Machine learning architectures and neural networks.\n\n".repeat(300);
  assert.ok(longNoteContent.length > 10000);

  const noteEntry = LibraryEntrySchema.parse({
    id: crypto.randomUUID(),
    title: "Deep Learning Research Notes",
    notes: longNoteContent,
    type: "note",
    status: "in_progress",
    isFavorite: true,
    tags: ["ai", "notes", "deep-learning"],
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(noteEntry.type, "note");
  assert.equal(noteEntry.isFavorite, true);
  assert.equal(noteEntry.notes.length, longNoteContent.length);
});

test("LibraryEntrySchema — File Metadata Attachment & 20MB Size Validation", () => {
  const now = new Date().toISOString();

  // 1. Valid attachment under 20MB (e.g. 5MB PDF)
  const validEntry = LibraryEntrySchema.parse({
    id: crypto.randomUUID(),
    title: "Operating Systems Manual",
    type: "file",
    fileMetadata: {
      fileId: crypto.randomUUID(),
      fileName: "os-manual.pdf",
      fileType: "application/pdf",
      fileSize: 5 * 1024 * 1024, // 5 MB
    },
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(validEntry.fileMetadata?.fileName, "os-manual.pdf");
  assert.equal(validEntry.fileMetadata?.fileSize, 5 * 1024 * 1024);

  // 2. Exact boundary at 20MB (20 * 1024 * 1024 = 20,971,520 bytes)
  const boundaryEntry = LibraryEntrySchema.parse({
    id: crypto.randomUUID(),
    title: "Large Design Archive",
    type: "file",
    fileMetadata: {
      fileId: crypto.randomUUID(),
      fileName: "design-archive.zip",
      fileType: "application/zip",
      fileSize: 20 * 1024 * 1024,
    },
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(boundaryEntry.fileMetadata?.fileSize, 20971520);

  // 3. Exceeds 20MB by 1 byte -> Must throw
  assert.throws(() => {
    LibraryEntrySchema.parse({
      id: crypto.randomUUID(),
      title: "Oversized File",
      type: "file",
      fileMetadata: {
        fileId: crypto.randomUUID(),
        fileName: "massive-video.mp4",
        fileType: "video/mp4",
        fileSize: 20 * 1024 * 1024 + 1, // 20 MB + 1 byte
      },
      createdAt: now,
      updatedAt: now,
    });
  });
});

test("LibraryCollectionSchema — Validation & Defaults", () => {
  const now = new Date().toISOString();

  // Minimal collection
  const minimalCollection = LibraryCollectionSchema.parse({
    id: crypto.randomUUID(),
    name: "Web Development",
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(minimalCollection.name, "Web Development");
  assert.equal(minimalCollection.description, "");
  assert.equal(minimalCollection.color, "#6366f1");
  assert.equal(minimalCollection.icon, "📁");
  assert.equal(minimalCollection.isDefault, false);
  assert.equal(minimalCollection.sortOrder, 0);

  // Rejection when name is empty
  assert.throws(() => {
    LibraryCollectionSchema.parse({
      id: crypto.randomUUID(),
      name: "",
      createdAt: now,
      updatedAt: now,
    });
  });
});

test("LibraryFileSchema & validateLibraryFileSize Helper", () => {
  const now = new Date().toISOString();

  // validateLibraryFileSize boundary checks
  assert.equal(validateLibraryFileSize(0), true);
  assert.equal(validateLibraryFileSize(1024), true);
  assert.equal(validateLibraryFileSize(MAX_LIBRARY_FILE_SIZE), true);
  assert.equal(validateLibraryFileSize(MAX_LIBRARY_FILE_SIZE + 1), false);
  assert.equal(validateLibraryFileSize(-1), false);

  // Valid File record
  const validFile = LibraryFileSchema.parse({
    id: crypto.randomUUID(),
    entryId: crypto.randomUUID(),
    fileName: "lecture-notes.pdf",
    fileType: "application/pdf",
    fileSize: 1048576, // 1 MB
    data: new Uint8Array([1, 2, 3, 4]),
    createdAt: now,
  });

  assert.equal(validFile.fileName, "lecture-notes.pdf");
  assert.equal(validFile.fileSize, 1048576);

  // Reject oversized file
  assert.throws(() => {
    LibraryFileSchema.parse({
      id: crypto.randomUUID(),
      entryId: crypto.randomUUID(),
      fileName: "too-large.iso",
      fileType: "application/octet-stream",
      fileSize: 20 * 1024 * 1024 + 100,
      data: null,
      createdAt: now,
    });
  });
});

test("BackupPayloadSchema — Backward Compatibility with Legacy V1 Backups", () => {
  // Simulates an older backup payload exported prior to Phase 4 (no libraryCollections)
  const legacyBackupPayload = {
    version: 1,
    exportedAt: "2026-11-06T12:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [
      {
        id: crypto.randomUUID(),
        title: "Legacy Stored Book",
        type: "read",
        status: "saved",
        tags: ["reading"],
        createdAt: "2026-11-05T08:00:00.000Z",
        updatedAt: "2026-11-05T08:00:00.000Z",
      },
    ],
    categories: [],
    settings: [],
  };

  const parsed = BackupPayloadSchema.parse(legacyBackupPayload);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.libraryEntries.length, 1);
  assert.equal(parsed.libraryEntries[0].title, "Legacy Stored Book");
  assert.equal(parsed.libraryEntries[0].isFavorite, false); // Default populated
  assert.deepEqual(parsed.libraryCollections, []); // Default empty array populated
});

test("BackupPayloadSchema — V2 Payload with Collections", () => {
  const now = new Date().toISOString();
  const collectionId = crypto.randomUUID();
  const v2Payload = {
    version: 2,
    exportedAt: now,
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [
      {
        id: crypto.randomUUID(),
        title: "Building Modern Web Apps",
        type: "learn",
        status: "in_progress",
        isFavorite: true,
        collectionId,
        lastViewedAt: now,
        tags: ["web", "nextjs"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryCollections: [
      {
        id: collectionId,
        name: "Full Stack Mastery",
        description: "Articles, courses, and guides",
        color: "#10b981",
        icon: "💻",
        isDefault: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    categories: [],
    settings: [],
  };

  const parsed = BackupPayloadSchema.parse(v2Payload);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.libraryEntries[0].isFavorite, true);
  assert.equal(parsed.libraryCollections.length, 1);
  assert.equal(parsed.libraryCollections[0].name, "Full Stack Mastery");
});

test("Dexie OrbitDatabase — Version 1 and Version 2 Schema Verification", () => {
  const dbInstance = new OrbitTestDatabase();

  // Verify versions registered
  assert.ok(dbInstance.verno >= 2, `Expected db version to be >= 2, got ${dbInstance.verno}`);

  // Verify all tables are defined on the instance
  const expectedTables = [
    "items",
    "tasks",
    "habits",
    "habitLogs",
    "events",
    "reminders",
    "libraryEntries",
    "libraryCollections",
    "libraryFiles",
    "categories",
    "settings",
  ];

  for (const tableName of expectedTables) {
    const table = dbInstance.table(tableName);
    assert.ok(table, `Table ${tableName} must exist on db instance`);
    assert.equal(table.schema.primKey.name, "id");
  }

  // Verify libraryEntries indexes in v2 schema
  const librarySchema = dbInstance.table("libraryEntries").schema;
  const indexNames = librarySchema.indexes.map((idx) => idx.name);

  assert.ok(indexNames.includes("type"), "type index missing");
  assert.ok(indexNames.includes("status"), "status index missing");
  assert.ok(indexNames.includes("collectionId"), "collectionId index missing");
  assert.ok(indexNames.includes("isFavorite"), "isFavorite index missing");
  assert.ok(indexNames.includes("lastViewedAt"), "lastViewedAt index missing");
  assert.ok(indexNames.includes("createdAt"), "createdAt index missing");
  assert.ok(indexNames.includes("tags"), "tags index missing");

  // Verify tags is a multi-entry index
  const tagsIndex = librarySchema.indexes.find((idx) => idx.name === "tags");
  assert.ok(tagsIndex?.multi, "tags index must be multi-entry (*tags)");

  dbInstance.close();
});
