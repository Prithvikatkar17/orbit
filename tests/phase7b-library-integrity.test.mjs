import test from "node:test";
import assert from "node:assert/strict";

import {
  saveLibraryEntryWithAttachment,
  deleteLibraryEntryWithFiles,
  deleteLibraryCollectionAndCleanReferences,
} from "../src/lib/services/library-service.ts";

/**
 * Creates an in-memory mock database conforming to Dexie's API for library tables,
 * supporting atomic transactional rollbacks on failure.
 */
function createMockLibraryDatabase(initialData = {}) {
  const tables = {
    libraryEntries: new Map(),
    libraryFiles: new Map(),
    libraryCollections: new Map(),
  };

  // Seed initial data
  if (initialData.libraryEntries) {
    for (const entry of initialData.libraryEntries) {
      tables.libraryEntries.set(entry.id, JSON.parse(JSON.stringify(entry)));
    }
  }
  if (initialData.libraryFiles) {
    for (const file of initialData.libraryFiles) {
      tables.libraryFiles.set(file.id, { ...file });
    }
  }
  if (initialData.libraryCollections) {
    for (const col of initialData.libraryCollections) {
      tables.libraryCollections.set(col.id, { ...col });
    }
  }

  // Fault injection flags
  const faults = {
    failEntriesAdd: false,
    failEntriesPut: false,
    failEntriesDelete: false,
    failFilesPut: false,
    failFilesDelete: false,
    failCollectionsDelete: false,
  };

  const mockDb = {
    libraryEntries: {
      async add(item) {
        if (faults.failEntriesAdd) {
          throw new Error("Simulated storage failure on libraryEntries.add");
        }
        tables.libraryEntries.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async put(item) {
        if (faults.failEntriesPut) {
          throw new Error("Simulated storage failure on libraryEntries.put");
        }
        tables.libraryEntries.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async delete(id) {
        if (faults.failEntriesDelete) {
          throw new Error("Simulated storage failure on libraryEntries.delete");
        }
        tables.libraryEntries.delete(id);
      },
      async toArray() {
        return Array.from(tables.libraryEntries.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      async get(id) {
        const val = tables.libraryEntries.get(id);
        return val ? JSON.parse(JSON.stringify(val)) : undefined;
      },
      where(field) {
        return {
          equals(val) {
            return {
              async delete() {
                let deletedCount = 0;
                for (const [k, v] of tables.libraryEntries.entries()) {
                  if (v[field] === val) {
                    tables.libraryEntries.delete(k);
                    deletedCount++;
                  }
                }
                return deletedCount;
              },
              async modify(changeCallback) {
                let count = 0;
                for (const [k, v] of tables.libraryEntries.entries()) {
                  if (v[field] === val) {
                    const cloned = JSON.parse(JSON.stringify(v));
                    changeCallback(cloned);
                    tables.libraryEntries.set(k, cloned);
                    count++;
                  }
                }
                return count;
              },
            };
          },
        };
      },
    },

    libraryFiles: {
      async put(item) {
        if (faults.failFilesPut) {
          throw new Error("Simulated storage failure on libraryFiles.put");
        }
        tables.libraryFiles.set(item.id, { ...item });
        return item.id;
      },
      async delete(id) {
        if (faults.failFilesDelete) {
          throw new Error("Simulated storage failure on libraryFiles.delete");
        }
        tables.libraryFiles.delete(id);
      },
      async toArray() {
        return Array.from(tables.libraryFiles.values()).map((v) => ({ ...v }));
      },
      async get(id) {
        const val = tables.libraryFiles.get(id);
        return val ? { ...val } : undefined;
      },
      where(field) {
        return {
          equals(val) {
            return {
              async delete() {
                if (faults.failFilesDelete) {
                  throw new Error("Simulated storage failure on libraryFiles.where.delete");
                }
                let deletedCount = 0;
                for (const [k, v] of tables.libraryFiles.entries()) {
                  if (v[field] === val) {
                    tables.libraryFiles.delete(k);
                    deletedCount++;
                  }
                }
                return deletedCount;
              },
            };
          },
        };
      },
    },

    libraryCollections: {
      async add(item) {
        tables.libraryCollections.set(item.id, { ...item });
        return item.id;
      },
      async put(item) {
        tables.libraryCollections.set(item.id, { ...item });
        return item.id;
      },
      async delete(id) {
        if (faults.failCollectionsDelete) {
          throw new Error("Simulated storage failure on libraryCollections.delete");
        }
        tables.libraryCollections.delete(id);
      },
      async toArray() {
        return Array.from(tables.libraryCollections.values()).map((v) => ({ ...v }));
      },
      async get(id) {
        const val = tables.libraryCollections.get(id);
        return val ? { ...val } : undefined;
      },
    },

    async transaction(mode, tableList, txFunc) {
      // Snapshot state for atomic rollback
      const snapshot = {
        libraryEntries: new Map(tables.libraryEntries),
        libraryFiles: new Map(tables.libraryFiles),
        libraryCollections: new Map(tables.libraryCollections),
      };

      try {
        await txFunc();
      } catch (err) {
        // Rollback all tables to pre-transaction snapshot on failure
        tables.libraryEntries.clear();
        for (const [k, v] of snapshot.libraryEntries.entries()) {
          tables.libraryEntries.set(k, v);
        }
        tables.libraryFiles.clear();
        for (const [k, v] of snapshot.libraryFiles.entries()) {
          tables.libraryFiles.set(k, v);
        }
        tables.libraryCollections.clear();
        for (const [k, v] of snapshot.libraryCollections.entries()) {
          tables.libraryCollections.set(k, v);
        }
        throw err;
      }
    },
  };

  return { mockDb, tables, faults };
}

// ---------------------------------------------------------------------------
// 1. Invalid Entry Validation Does Not Create a File Record
// ---------------------------------------------------------------------------
test("Phase 7B — Invalid entry validation does not create a file record", async () => {
  const { mockDb, tables } = createMockLibraryDatabase();

  const mockFile = {
    name: "document.pdf",
    type: "application/pdf",
    size: 1024 * 50,
  };

  // Attempt to save entry with invalid URL schema
  await assert.rejects(
    async () => {
      await saveLibraryEntryWithAttachment({
        entryData: {
          title: "Invalid URL Resource",
          link: "not-a-valid-url-at-all",
          type: "bookmark",
        },
        attachedFile: mockFile,
        database: mockDb,
      });
    },
    (err) => {
      // Must be a Zod validation error or URL validation error
      return err.name === "ZodError" || /url/i.test(err.message);
    }
  );

  // Assert that ZERO records exist in libraryFiles and libraryEntries
  assert.equal(tables.libraryFiles.size, 0, "No file records should be created on validation failure");
  assert.equal(tables.libraryEntries.size, 0, "No entry records should be created on validation failure");
});

// ---------------------------------------------------------------------------
// 2. Failed Entry Creation Rolls Back File Storage
// ---------------------------------------------------------------------------
test("Phase 7B — Failed entry creation rolls back file storage", async () => {
  const { mockDb, tables, faults } = createMockLibraryDatabase();

  const mockFile = {
    name: "spec.pdf",
    type: "application/pdf",
    size: 2048,
  };

  // Inject failure on libraryEntries.add inside the transaction
  faults.failEntriesAdd = true;

  await assert.rejects(
    async () => {
      await saveLibraryEntryWithAttachment({
        entryData: {
          title: "Valid Title",
          notes: "Valid notes content",
          type: "file",
        },
        attachedFile: mockFile,
        database: mockDb,
      });
    },
    /Simulated storage failure on libraryEntries.add/
  );

  // Assert that the file write that occurred during the transaction was rolled back!
  assert.equal(
    tables.libraryFiles.size,
    0,
    "Binary file record must be rolled back and deleted if entry storage fails"
  );
  assert.equal(tables.libraryEntries.size, 0, "Entry table must be empty");
});

// ---------------------------------------------------------------------------
// 3. Entry Deletion Removes Associated Files
// ---------------------------------------------------------------------------
test("Phase 7B — Entry deletion removes associated files atomically", async () => {
  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockLibraryDatabase({
    libraryEntries: [
      {
        id: entryId,
        title: "Architecture Guide",
        notes: "Detailed architecture design notes",
        type: "file",
        status: "saved",
        tags: ["architecture"],
        isFavorite: false,
        fileMetadata: {
          fileId,
          fileName: "guide.pdf",
          fileType: "application/pdf",
          fileSize: 4096,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryFiles: [
      {
        id: fileId,
        entryId,
        fileName: "guide.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        data: new Uint8Array([1, 2, 3, 4]),
        createdAt: now,
      },
    ],
  });

  assert.equal(tables.libraryEntries.size, 1);
  assert.equal(tables.libraryFiles.size, 1);

  // Delete the entry
  await deleteLibraryEntryWithFiles(entryId, mockDb);

  assert.equal(tables.libraryEntries.size, 0, "Library entry must be deleted");
  assert.equal(tables.libraryFiles.size, 0, "Associated library file must be deleted");
});

// ---------------------------------------------------------------------------
// 4. Failed Deletion Rolls Back All Changes
// ---------------------------------------------------------------------------
test("Phase 7B — Failed deletion rolls back all changes", async () => {
  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables, faults } = createMockLibraryDatabase({
    libraryEntries: [
      {
        id: entryId,
        title: "Critical Spec",
        notes: "Important notes",
        type: "file",
        status: "saved",
        tags: [],
        isFavorite: false,
        fileMetadata: {
          fileId,
          fileName: "spec.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryFiles: [
      {
        id: fileId,
        entryId,
        fileName: "spec.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        data: new Uint8Array([5, 6, 7]),
        createdAt: now,
      },
    ],
  });

  // Inject failure on libraryEntries.delete (after files deletion)
  faults.failEntriesDelete = true;

  await assert.rejects(
    async () => {
      await deleteLibraryEntryWithFiles(entryId, mockDb);
    },
    /Simulated storage failure on libraryEntries.delete/
  );

  // Verify transaction rolled back: file must still exist and entry must still exist!
  assert.equal(tables.libraryEntries.size, 1, "Library entry must remain intact on rollback");
  assert.equal(tables.libraryFiles.size, 1, "Library file must remain intact on rollback");
  assert.equal(tables.libraryFiles.get(fileId)?.id, fileId);
});

// ---------------------------------------------------------------------------
// 5. Collection Deletion Removes References but Preserves Entries
// ---------------------------------------------------------------------------
test("Phase 7B — Collection deletion removes references but preserves entries", async () => {
  const col1Id = crypto.randomUUID();
  const col2Id = crypto.randomUUID();
  const entry1Id = crypto.randomUUID();
  const entry2Id = crypto.randomUUID();
  const entry3Id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockLibraryDatabase({
    libraryCollections: [
      {
        id: col1Id,
        name: "Design Systems",
        description: "UI Components and guidelines",
        color: "#6366f1",
        icon: "🎨",
        isDefault: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: col2Id,
        name: "Backend Architecture",
        description: "Databases and distributed systems",
        color: "#10b981",
        icon: "💻",
        isDefault: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryEntries: [
      {
        id: entry1Id,
        title: "Tailwind CSS v4 Docs",
        notes: "Key updates in Tailwind v4 engine",
        type: "bookmark",
        status: "saved",
        rating: 5,
        tags: ["css", "design"],
        isFavorite: true,
        collectionId: col1Id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: entry2Id,
        title: "Radix UI Primitives",
        notes: "Accessible unstyled components",
        type: "article",
        status: "in_progress",
        rating: 4,
        tags: ["a11y", "react"],
        isFavorite: false,
        collectionId: col1Id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: entry3Id,
        title: "PostgreSQL Indexing",
        notes: "B-Tree and GiST deep dive",
        type: "read",
        status: "saved",
        tags: ["database"],
        isFavorite: false,
        collectionId: col2Id,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  assert.equal(tables.libraryCollections.size, 2);
  assert.equal(tables.libraryEntries.size, 3);

  // Delete Collection 1
  await deleteLibraryCollectionAndCleanReferences(col1Id, mockDb);

  // Verify Collection 1 was deleted and Collection 2 remains
  assert.equal(tables.libraryCollections.size, 1);
  assert.equal(tables.libraryCollections.get(col1Id), undefined);
  assert.ok(tables.libraryCollections.get(col2Id), "Collection 2 must remain");

  // Verify ALL 3 entries are STILL PRESERVED
  assert.equal(tables.libraryEntries.size, 3, "Deleting collection must NEVER delete entries");

  // Verify Entry 1 had its collectionId cleanly removed while all metadata is preserved
  const updatedEntry1 = tables.libraryEntries.get(entry1Id);
  assert.ok(updatedEntry1);
  assert.equal(updatedEntry1.title, "Tailwind CSS v4 Docs");
  assert.equal(updatedEntry1.notes, "Key updates in Tailwind v4 engine");
  assert.equal(updatedEntry1.rating, 5);
  assert.deepEqual(updatedEntry1.tags, ["css", "design"]);
  assert.equal(updatedEntry1.isFavorite, true);
  assert.equal(updatedEntry1.collectionId, undefined, "collectionId must be removed cleanly");

  // Verify Entry 2 had its collectionId cleanly removed
  const updatedEntry2 = tables.libraryEntries.get(entry2Id);
  assert.ok(updatedEntry2);
  assert.equal(updatedEntry2.collectionId, undefined, "collectionId must be removed cleanly");

  // Verify Entry 3 in Collection 2 remains completely untouched
  const updatedEntry3 = tables.libraryEntries.get(entry3Id);
  assert.ok(updatedEntry3);
  assert.equal(updatedEntry3.collectionId, col2Id, "Unrelated collectionId must not be changed");
});

// ---------------------------------------------------------------------------
// 6. Entries Without Attachments Work Correctly
// ---------------------------------------------------------------------------
test("Phase 7B — Entries without attachments work correctly (save and delete)", async () => {
  const { mockDb, tables } = createMockLibraryDatabase();

  // Part A: Create entry without attachment
  const saved = await saveLibraryEntryWithAttachment({
    entryData: {
      title: "Clean Note Without Files",
      notes: "Just pure text note",
      type: "note",
      status: "saved",
      tags: ["text"],
    },
    attachedFile: null,
    database: mockDb,
  });

  assert.ok(saved.id);
  assert.equal(saved.title, "Clean Note Without Files");
  assert.equal(saved.fileMetadata, undefined);
  assert.equal(tables.libraryEntries.size, 1);
  assert.equal(tables.libraryFiles.size, 0, "No file records created for entry without attachment");

  // Part B: Delete entry without attachment
  await deleteLibraryEntryWithFiles(saved.id, mockDb);

  assert.equal(tables.libraryEntries.size, 0, "Entry deleted cleanly");
  assert.equal(tables.libraryFiles.size, 0, "File table remains empty without errors");
});

// ---------------------------------------------------------------------------
// 7. File Replacement Cleans Up Old Attachment Atomically
// ---------------------------------------------------------------------------
test("Phase 7B — File replacement deletes old attachment and persists new attachment atomically", async () => {
  const entryId = crypto.randomUUID();
  const oldFileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockLibraryDatabase({
    libraryEntries: [
      {
        id: entryId,
        title: "Report",
        notes: "Quarterly report",
        type: "file",
        status: "saved",
        tags: [],
        isFavorite: false,
        fileMetadata: {
          fileId: oldFileId,
          fileName: "v1.pdf",
          fileType: "application/pdf",
          fileSize: 1000,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryFiles: [
      {
        id: oldFileId,
        entryId,
        fileName: "v1.pdf",
        fileType: "application/pdf",
        fileSize: 1000,
        data: new Uint8Array([1]),
        createdAt: now,
      },
    ],
  });

  const newMockFile = {
    name: "v2.pdf",
    type: "application/pdf",
    size: 2000,
  };

  const updated = await saveLibraryEntryWithAttachment({
    entryData: {
      id: entryId,
      title: "Report v2",
      notes: "Updated quarterly report",
      type: "file",
      status: "completed",
    },
    attachedFile: newMockFile,
    existingFileMetadata: {
      fileId: oldFileId,
      fileName: "v1.pdf",
      fileType: "application/pdf",
      fileSize: 1000,
    },
    isEditing: true,
    database: mockDb,
  });

  assert.equal(tables.libraryFiles.size, 1, "Old file must be deleted; only 1 file record should exist");
  const storedFile = Array.from(tables.libraryFiles.values())[0];
  assert.notEqual(storedFile.id, oldFileId, "New file must have a different ID");
  assert.equal(storedFile.fileName, "v2.pdf");
  assert.equal(updated.fileMetadata?.fileId, storedFile.id);
});

// ---------------------------------------------------------------------------
// 8. File Removal Removes File Attachment Atomically
// ---------------------------------------------------------------------------
test("Phase 7B — File removal removes attachment and updates entry metadata atomically", async () => {
  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockLibraryDatabase({
    libraryEntries: [
      {
        id: entryId,
        title: "Paper",
        notes: "Research paper",
        type: "file",
        status: "saved",
        tags: [],
        isFavorite: false,
        fileMetadata: {
          fileId,
          fileName: "paper.pdf",
          fileType: "application/pdf",
          fileSize: 5000,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryFiles: [
      {
        id: fileId,
        entryId,
        fileName: "paper.pdf",
        fileType: "application/pdf",
        fileSize: 5000,
        data: new Uint8Array([1, 2]),
        createdAt: now,
      },
    ],
  });

  assert.equal(tables.libraryFiles.size, 1);

  const updated = await saveLibraryEntryWithAttachment({
    entryData: {
      id: entryId,
      title: "Paper (notes only)",
      type: "note",
      status: "saved",
    },
    attachedFile: null,
    existingFileMetadata: {
      fileId,
      fileName: "paper.pdf",
      fileType: "application/pdf",
      fileSize: 5000,
    },
    isRemovingFile: true,
    isEditing: true,
    database: mockDb,
  });

  assert.equal(tables.libraryFiles.size, 0, "File record must be removed");
  assert.equal(updated.fileMetadata, undefined, "Entry fileMetadata must be cleared");
});

// ---------------------------------------------------------------------------
// 9. File Exceeding 20MB Boundary is Rejected Before Touching Storage
// ---------------------------------------------------------------------------
test("Phase 7B — File exceeding 20 MB is rejected before touching storage", async () => {
  const { mockDb, tables } = createMockLibraryDatabase();

  const oversizedFile = {
    name: "huge-video.mp4",
    type: "video/mp4",
    size: 20 * 1024 * 1024 + 1, // 20 MB + 1 byte
  };

  await assert.rejects(
    async () => {
      await saveLibraryEntryWithAttachment({
        entryData: {
          title: "Oversized Resource",
          type: "video",
        },
        attachedFile: oversizedFile,
        database: mockDb,
      });
    },
    /exceeds the maximum 20 MB size limit/
  );

  assert.equal(tables.libraryFiles.size, 0, "No file stored");
  assert.equal(tables.libraryEntries.size, 0, "No entry stored");
});

