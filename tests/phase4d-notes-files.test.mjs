import test from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import {
  LibraryEntrySchema,
  LibraryFileMetadataSchema,
} from "../src/lib/schemas/library-entry.ts";
import {
  LibraryFileSchema,
  validateLibraryFileSize,
  MAX_LIBRARY_FILE_SIZE,
} from "../src/lib/schemas/library-file.ts";

// Dexie OrbitDatabase v2 test definition
class OrbitPhase4DTestDatabase extends Dexie {
  constructor() {
    super("orbit-test-phase4d-schemas");

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

test("Phase 4D — Standalone Note Creation & Markdown Content", () => {
  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();
  const markdownSample = `
# Project Architecture Notes
## Overview
Here is an overview of the system architecture.

- [x] IndexedDB Dexie migration
- [x] Library Core UI
- [ ] File attachment support

> Remember to enforce 20 MB size limits!

\`\`\`typescript
const maxBytes = 20 * 1024 * 1024;
\`\`\`
  `.trim();

  const noteEntry = LibraryEntrySchema.parse({
    id: noteId,
    title: "System Architecture & Specs",
    notes: markdownSample,
    type: "note",
    status: "in_progress",
    tags: ["architecture", "spec", "v2"],
    isFavorite: true,
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(noteEntry.id, noteId);
  assert.equal(noteEntry.type, "note");
  assert.equal(noteEntry.title, "System Architecture & Specs");
  assert.equal(noteEntry.notes, markdownSample);
  assert.equal(noteEntry.link, undefined);
  assert.equal(noteEntry.isFavorite, true);
  assert.deepEqual(noteEntry.tags, ["architecture", "spec", "v2"]);
});

test("Phase 4D — Note Max Length Boundary (50,000 characters)", () => {
  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Valid 50,000 character note
  const valid50kNotes = "A".repeat(50000);
  const validEntry = LibraryEntrySchema.parse({
    id: noteId,
    title: "Large Note",
    notes: valid50kNotes,
    type: "note",
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(validEntry.notes.length, 50000);

  // Exceeding 50,000 characters must fail validation
  const tooLongNotes = "A".repeat(50001);
  assert.throws(
    () => {
      LibraryEntrySchema.parse({
        id: noteId,
        title: "Too Large Note",
        notes: tooLongNotes,
        type: "note",
        createdAt: now,
        updatedAt: now,
      });
    },
    /50000/
  );
});

test("Phase 4D — File Size Validation Boundaries (20 MB limit)", () => {
  assert.equal(MAX_LIBRARY_FILE_SIZE, 20 * 1024 * 1024);

  // Exact 0 bytes
  assert.equal(validateLibraryFileSize(0), true);

  // Valid 10 MB
  assert.equal(validateLibraryFileSize(10 * 1024 * 1024), true);

  // Exact 20 MB (20,971,520 bytes)
  assert.equal(validateLibraryFileSize(20 * 1024 * 1024), true);

  // 20 MB + 1 byte
  assert.equal(validateLibraryFileSize(20 * 1024 * 1024 + 1), false);

  // Negative size
  assert.equal(validateLibraryFileSize(-1), false);
});

test("Phase 4D — LibraryFileSchema Binary Record Validation", () => {
  const fileId = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();

  const fileRecord = LibraryFileSchema.parse({
    id: fileId,
    entryId: entryId,
    fileName: "q4-roadmap.pdf",
    fileType: "application/pdf",
    fileSize: 4500120,
    data: new Uint8Array([1, 2, 3, 4]),
    createdAt: now,
  });

  assert.equal(fileRecord.id, fileId);
  assert.equal(fileRecord.entryId, entryId);
  assert.equal(fileRecord.fileName, "q4-roadmap.pdf");
  assert.equal(fileRecord.fileType, "application/pdf");
  assert.equal(fileRecord.fileSize, 4500120);

  // Must reject files exceeding 20 MB limit
  assert.throws(
    () => {
      LibraryFileSchema.parse({
        id: fileId,
        entryId: entryId,
        fileName: "oversized.zip",
        fileType: "application/zip",
        fileSize: 20 * 1024 * 1024 + 10,
        data: new Uint8Array([]),
        createdAt: now,
      });
    },
    /20 MB/
  );
});

test("Phase 4D — Resource Association with File Metadata", () => {
  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const metadata = LibraryFileMetadataSchema.parse({
    fileId,
    fileName: "ui-mockup.png",
    fileType: "image/png",
    fileSize: 204800,
  });

  const entry = LibraryEntrySchema.parse({
    id: entryId,
    title: "UI Design Document",
    notes: "Attached initial export of layout mockup.",
    type: "file",
    fileMetadata: metadata,
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(entry.fileMetadata?.fileId, fileId);
  assert.equal(entry.fileMetadata?.fileName, "ui-mockup.png");
  assert.equal(entry.fileMetadata?.fileType, "image/png");
  assert.equal(entry.fileMetadata?.fileSize, 204800);

  // Removing attachment should preserve resource
  const detachedEntry = LibraryEntrySchema.parse({
    ...entry,
    fileMetadata: undefined,
    updatedAt: new Date().toISOString(),
  });
  assert.equal(detachedEntry.fileMetadata, undefined);
  assert.equal(detachedEntry.id, entryId);
});

test("Phase 4D — Search Matching Across Notes, Filename, Title, and Tags", () => {
  const entries = [
    LibraryEntrySchema.parse({
      id: crypto.randomUUID(),
      title: "Quarterly Financial Analysis",
      notes: "Spreadsheet contains Q3 and Q4 revenue projections.",
      type: "note",
      tags: ["finance", "planning"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    LibraryEntrySchema.parse({
      id: crypto.randomUUID(),
      title: "System Architecture",
      notes: "Reference diagrams for backend microservices.",
      type: "file",
      fileMetadata: {
        fileId: crypto.randomUUID(),
        fileName: "kubernetes-cluster-diagram.pdf",
        fileType: "application/pdf",
        fileSize: 1024000,
      },
      tags: ["devops", "cloud"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ];

  function matchQuery(entry, q) {
    const term = q.toLowerCase();
    const matchesTitle = entry.title.toLowerCase().includes(term);
    const matchesNotes = entry.notes ? entry.notes.toLowerCase().includes(term) : false;
    const matchesTags = entry.tags?.some((t) => t.toLowerCase().includes(term));
    const matchesLink = entry.link?.toLowerCase().includes(term);
    const matchesFile = entry.fileMetadata?.fileName.toLowerCase().includes(term);
    return Boolean(matchesTitle || matchesNotes || matchesTags || matchesLink || matchesFile);
  }

  // Search by attached filename
  assert.equal(matchQuery(entries[1], "kubernetes"), true);
  assert.equal(matchQuery(entries[0], "kubernetes"), false);

  // Search by markdown note text
  assert.equal(matchQuery(entries[0], "revenue projections"), true);
  assert.equal(matchQuery(entries[1], "revenue projections"), false);

  // Search by tag
  assert.equal(matchQuery(entries[0], "finance"), true);
  assert.equal(matchQuery(entries[1], "cloud"), true);
});

test("Phase 4D — Dexie Database Schema V2 Table Definitions for LibraryFiles", () => {
  const db = new OrbitPhase4DTestDatabase();
  const fileTable = db.table("libraryFiles");
  assert.ok(fileTable, "libraryFiles table required");

  const idxMap = new Map(fileTable.schema.indexes.map((idx) => [idx.name, idx]));
  assert.ok(idxMap.has("entryId"), "entryId index required");
  assert.ok(idxMap.has("fileName"), "fileName index required");
  assert.ok(idxMap.has("fileType"), "fileType index required");
  assert.ok(idxMap.has("createdAt"), "createdAt index required");

  db.close();
});
