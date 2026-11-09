import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import * as fflate from "fflate";

import {
  BackupPayloadSchema,
  BackupLibraryFileSchema,
  exportFullBackup,
  exportFullBackupZip,
  restoreBackup,
  validateSafeZipPath,
  validateUniqueIds,
  validateBackupArchive,
  fileDataToUint8Array,
} from "../src/lib/services/backup-service.ts";

/**
 * Creates an in-memory mock database conforming to Dexie's API for all 11 tables,
 * supporting transactional rollbacks on failure.
 */
function createMockDatabase(initialData = {}) {
  const tables = {
    items: new Map(),
    tasks: new Map(),
    habits: new Map(),
    habitLogs: new Map(),
    events: new Map(),
    reminders: new Map(),
    libraryEntries: new Map(),
    libraryCollections: new Map(),
    libraryFiles: new Map(),
    categories: new Map(),
    settings: new Map(),
  };

  // Seed initial data
  for (const [tableName, records] of Object.entries(initialData)) {
    if (tables[tableName]) {
      for (const record of records) {
        tables[tableName].set(record.id, { ...record });
      }
    }
  }

  function createTableInterface(name) {
    const store = tables[name];
    return {
      async toArray() {
        return Array.from(store.values()).map((v) => ({ ...v }));
      },
      async bulkPut(records) {
        for (const r of records) {
          store.set(r.id, { ...r });
        }
      },
      async clear() {
        store.clear();
      },
      async count() {
        return store.size;
      },
      async get(id) {
        const val = store.get(id);
        return val ? { ...val } : undefined;
      },
    };
  }

  const mockDb = {
    items: createTableInterface("items"),
    tasks: createTableInterface("tasks"),
    habits: createTableInterface("habits"),
    habitLogs: createTableInterface("habitLogs"),
    events: createTableInterface("events"),
    reminders: createTableInterface("reminders"),
    libraryEntries: createTableInterface("libraryEntries"),
    libraryCollections: createTableInterface("libraryCollections"),
    libraryFiles: createTableInterface("libraryFiles"),
    categories: createTableInterface("categories"),
    settings: createTableInterface("settings"),

    async transaction(mode, tableList, txFunc) {
      // Snapshot state for rollback
      const snapshot = new Map();
      for (const [name, store] of Object.entries(tables)) {
        snapshot.set(name, new Map(store));
      }

      try {
        await txFunc();
      } catch (err) {
        // Rollback on failure
        for (const [name, snapStore] of snapshot.entries()) {
          tables[name].clear();
          for (const [k, v] of snapStore.entries()) {
            tables[name].set(k, v);
          }
        }
        throw err;
      }
    },
  };

  return { mockDb, tables };
}

// ---------------------------------------------------------------------------
// 1. Path Traversal & Zip Slip Prevention Tests
// ---------------------------------------------------------------------------

test("Phase 4E — Schema & Pure Archive Validation Functions", async () => {
  assert.ok(BackupPayloadSchema);
  assert.ok(BackupLibraryFileSchema);

  const { mockDb } = createMockDatabase();
  const fullJson = await exportFullBackup(mockDb);
  assert.equal(fullJson.version, 3);
  assert.ok(Array.isArray(fullJson.libraryFiles));

  const validZip = fflate.zipSync({
    "orbit-data.json": fflate.strToU8(JSON.stringify(fullJson)),
  });
  const unzipped = fflate.unzipSync(validZip);
  const validated = validateBackupArchive(unzipped);
  assert.equal(validated.payload.version, 3);
  assert.equal(validated.reconstructedFiles.length, 0);
});

test("Phase 4E — Path Traversal & Zip Slip Security Validation", () => {
  // Valid paths
  assert.doesNotThrow(() => validateSafeZipPath("orbit-data.json"));
  assert.doesNotThrow(() => validateSafeZipPath("attachments/"));
  assert.doesNotThrow(() => validateSafeZipPath("attachments/6b85e136-1234-4567-89ab-cdef01234567"));

  // Malicious / Unsafe paths
  assert.throws(
    () => validateSafeZipPath("../evil.sh"),
    /directory traversal/i
  );
  assert.throws(
    () => validateSafeZipPath("attachments/../../etc/passwd"),
    /directory traversal/i
  );
  assert.throws(
    () => validateSafeZipPath("/root/script.js"),
    /absolute path/i
  );
  assert.throws(
    () => validateSafeZipPath("C:\\Windows\\System32\\calc.exe"),
    /absolute path/i
  );
  assert.throws(
    () => validateSafeZipPath("unexpected_file.txt"),
    /unexpected file/i
  );
  assert.throws(
    () => validateSafeZipPath("attachments/nested/file.txt"),
    /invalid attachment path/i
  );
});

// ---------------------------------------------------------------------------
// 2. Duplicate ID Validation Tests
// ---------------------------------------------------------------------------

test("Phase 4E — Duplicate Primary Key ID Rejection", () => {
  const validRecords = [
    { id: "id-1", title: "Task 1" },
    { id: "id-2", title: "Task 2" },
  ];
  assert.doesNotThrow(() => validateUniqueIds("tasks", validRecords));

  const duplicateRecords = [
    { id: "id-dup", title: "Task 1" },
    { id: "id-dup", title: "Task 2" },
  ];
  assert.throws(
    () => validateUniqueIds("tasks", duplicateRecords),
    /duplicate id detected in table 'tasks'/i
  );
});

// ---------------------------------------------------------------------------
// 3. V1 and V2 Legacy JSON Backward Compatibility Tests
// ---------------------------------------------------------------------------

test("Phase 4E — Legacy V1 JSON Restore Compatibility (No Collections, No Files)", async () => {
  const legacyV1 = {
    version: 1,
    exportedAt: "2026-11-06T12:00:00.000Z",
    items: [{ id: crypto.randomUUID(), title: "Inbox 1", status: "pending", category: "work", priority: "medium", createdAt: "2026-11-06T12:00:00.000Z", updatedAt: "2026-11-06T12:00:00.000Z" }],
    tasks: [{ id: crypto.randomUUID(), title: "Task 1", status: "todo", category: "work", priority: "high", sortOrder: 0, createdAt: "2026-11-06T12:00:00.000Z", updatedAt: "2026-11-06T12:00:00.000Z" }],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [{
      id: crypto.randomUUID(),
      title: "Book",
      type: "article",
      status: "saved",
      notes: "Interesting book",
      tags: ["tech"],
      createdAt: "2026-11-06T12:00:00.000Z",
      updatedAt: "2026-11-06T12:00:00.000Z",
    }],
    categories: [],
    settings: [],
  };

  const { mockDb, tables } = createMockDatabase();
  const stats = await restoreBackup(legacyV1, "replace", {}, mockDb);

  assert.equal(stats.items, 1);
  assert.equal(stats.tasks, 1);
  assert.equal(stats.libraryEntries, 1);
  assert.equal(stats.libraryCollections, 0); // Defaults to empty array
  assert.equal(stats.libraryFiles, 0); // Defaults to empty array
  assert.equal(tables.items.size, 1);
  assert.equal(tables.tasks.size, 1);
  assert.equal(tables.libraryEntries.size, 1);
});

test("Phase 4E — Legacy V2 JSON Restore Compatibility (With Collections)", async () => {
  const colId = crypto.randomUUID();
  const legacyV2 = {
    version: 2,
    exportedAt: "2026-11-07T12:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryCollections: [{
      id: colId,
      name: "Research",
      icon: "🔬",
      color: "#6366f1",
      sortOrder: 0,
      createdAt: "2026-11-07T12:00:00.000Z",
      updatedAt: "2026-11-07T12:00:00.000Z",
    }],
    libraryEntries: [{
      id: crypto.randomUUID(),
      title: "AI Papers",
      type: "note",
      status: "in_progress",
      collectionId: colId,
      isFavorite: true,
      notes: "# Notes on LLMs",
      tags: ["ai"],
      createdAt: "2026-11-07T12:00:00.000Z",
      updatedAt: "2026-11-07T12:00:00.000Z",
    }],
    categories: [],
    settings: [],
  };

  const { mockDb, tables } = createMockDatabase();
  const stats = await restoreBackup(legacyV2, "replace", {}, mockDb);

  assert.equal(stats.libraryCollections, 1);
  assert.equal(stats.libraryEntries, 1);
  assert.equal(stats.libraryFiles, 0);
  assert.equal(tables.libraryCollections.get(colId)?.name, "Research");
});

// ---------------------------------------------------------------------------
// 4. Legacy JSON Replace All Warning & File Protection Tests
// ---------------------------------------------------------------------------

test("Phase 4E — Legacy JSON Replace All Warning Protects Existing Attachments", async () => {
  const existingFileId = crypto.randomUUID();
  const initialData = {
    libraryFiles: [{
      id: existingFileId,
      entryId: crypto.randomUUID(),
      fileName: "important_receipt.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      data: new Uint8Array([1, 2, 3]),
      createdAt: "2026-11-07T00:00:00.000Z",
    }],
  };

  const { mockDb, tables } = createMockDatabase(initialData);

  const jsonBackup = {
    version: 2,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [],
    libraryCollections: [],
    categories: [],
    settings: [],
  };

  // Calling restore in 'replace' mode without confirmation MUST throw and protect existing files
  await assert.rejects(
    async () => {
      await restoreBackup(jsonBackup, "replace", { confirmFileDeletion: false }, mockDb);
    },
    /JSON backups do not contain binary attachments.*Explicit confirmation is required/i
  );

  // Existing file MUST be untouched!
  assert.equal(tables.libraryFiles.size, 1);
  assert.ok(tables.libraryFiles.has(existingFileId));

  // If user explicitly confirms deletion:
  const stats = await restoreBackup(jsonBackup, "replace", { confirmFileDeletion: true }, mockDb);
  assert.equal(stats.libraryFiles, 0);
  assert.equal(tables.libraryFiles.size, 0); // Cleared as confirmed
});

test("Phase 4E — Legacy JSON Merge Mode Keeps Existing Attachments Intact", async () => {
  const existingFileId = crypto.randomUUID();
  const initialData = {
    libraryFiles: [{
      id: existingFileId,
      entryId: crypto.randomUUID(),
      fileName: "contract.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      data: new Uint8Array([4, 5, 6]),
      createdAt: "2026-11-07T00:00:00.000Z",
    }],
  };

  const { mockDb, tables } = createMockDatabase(initialData);

  const jsonBackup = {
    version: 2,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [{ id: crypto.randomUUID(), title: "New Item", status: "pending", category: "general", priority: "low", createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [],
    libraryCollections: [],
    categories: [],
    settings: [],
  };

  // Merge mode does NOT delete libraryFiles and requires no confirmation
  const stats = await restoreBackup(jsonBackup, "merge", {}, mockDb);
  assert.equal(stats.items, 1);
  assert.equal(tables.items.size, 1);
  assert.equal(tables.libraryFiles.size, 1);
  assert.ok(tables.libraryFiles.has(existingFileId));
});

// ---------------------------------------------------------------------------
// 5. ZIP Export & Restore with Binary Attachments Tests
// ---------------------------------------------------------------------------

test("Phase 4E — Full ZIP Export and Restore with Binary Attachments", async () => {
  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const binaryPayload = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // %PDF-1.5

  const initialData = {
    items: [{ id: crypto.randomUUID(), title: "Read paper", status: "pending", category: "learning", priority: "medium", createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
    tasks: [{ id: crypto.randomUUID(), title: "Finish Phase 4E", status: "in_progress", category: "work", priority: "high", sortOrder: 0, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [{
      id: entryId,
      title: "Deep Learning Specification",
      type: "file",
      status: "saved",
      notes: "Comprehensive ML architecture reference.",
      tags: ["ml", "pdf"],
      fileMetadata: {
        fileId,
        fileName: "specification.pdf",
        fileType: "application/pdf",
        fileSize: binaryPayload.length,
      },
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    }],
    libraryCollections: [],
    libraryFiles: [{
      id: fileId,
      entryId,
      fileName: "specification.pdf",
      fileType: "application/pdf",
      fileSize: binaryPayload.length,
      data: binaryPayload,
      createdAt: "2026-11-08T00:00:00.000Z",
    }],
    categories: [],
    settings: [],
  };

  const { mockDb: exportDb } = createMockDatabase(initialData);

  // 1. Export to ZIP
  const { zipBytes, fileName, payload, filesCount } = await exportFullBackupZip(exportDb);

  assert.ok(zipBytes instanceof Uint8Array);
  assert.ok(zipBytes.length > 0);
  assert.match(fileName, /^orbit-backup-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.equal(filesCount, 1);
  assert.equal(payload.version, 3);
  assert.equal(payload.libraryFiles.length, 1);

  // 2. Unzip and verify structure
  const unzipped = fflate.unzipSync(zipBytes);
  assert.ok("orbit-data.json" in unzipped);
  assert.ok(`attachments/${fileId}` in unzipped);

  // Verify binary bit-for-bit match (no Base64 corruption)
  const extractedBytes = unzipped[`attachments/${fileId}`];
  assert.deepEqual(Array.from(extractedBytes), Array.from(binaryPayload));

  // 3. Restore to a fresh database
  const { mockDb: restoreDb, tables: restoredTables } = createMockDatabase();
  const stats = await restoreBackup(zipBytes, "replace", {}, restoreDb);

  assert.equal(stats.items, 1);
  assert.equal(stats.tasks, 1);
  assert.equal(stats.libraryEntries, 1);
  assert.equal(stats.libraryFiles, 1);

  assert.equal(restoredTables.libraryEntries.size, 1);
  assert.equal(restoredTables.libraryFiles.size, 1);

  const restoredFile = restoredTables.libraryFiles.get(fileId);
  assert.ok(restoredFile);
  assert.equal(restoredFile.fileName, "specification.pdf");
  assert.equal(restoredFile.fileType, "application/pdf");
  assert.equal(restoredFile.fileSize, binaryPayload.length);

  // Reconstructed data is a Blob with matching byte contents
  const blobBytes = await fileDataToUint8Array(restoredFile.data);
  assert.deepEqual(Array.from(blobBytes), Array.from(binaryPayload));
});

test("Phase 4E — Multiple Binary Attachments & Empty Attachment Handling", async () => {
  // Case A: Multiple attachments
  const entry1 = crypto.randomUUID();
  const entry2 = crypto.randomUUID();
  const file1 = crypto.randomUUID();
  const file2 = crypto.randomUUID();

  const bytes1 = new Uint8Array([10, 20, 30, 40]);
  const bytes2 = new Uint8Array([50, 60, 70, 80, 90]);

  const multiData = {
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [
      { id: entry1, title: "Doc 1", type: "file", status: "saved", notes: "", fileMetadata: { fileId: file1, fileName: "d1.pdf", fileType: "application/pdf", fileSize: 4 }, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" },
      { id: entry2, title: "Doc 2", type: "file", status: "saved", notes: "", fileMetadata: { fileId: file2, fileName: "d2.png", fileType: "image/png", fileSize: 5 }, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" },
    ],
    libraryCollections: [],
    libraryFiles: [
      { id: file1, entryId: entry1, fileName: "d1.pdf", fileType: "application/pdf", fileSize: 4, data: bytes1, createdAt: "2026-11-08T00:00:00.000Z" },
      { id: file2, entryId: entry2, fileName: "d2.png", fileType: "image/png", fileSize: 5, data: bytes2, createdAt: "2026-11-08T00:00:00.000Z" },
    ],
    categories: [],
    settings: [],
  };

  const { mockDb: multiDb } = createMockDatabase(multiData);
  const { zipBytes: multiZip } = await exportFullBackupZip(multiDb);

  const { mockDb: restoreMultiDb, tables: multiTables } = createMockDatabase();
  const statsMulti = await restoreBackup(multiZip, "replace", {}, restoreMultiDb);
  assert.equal(statsMulti.libraryFiles, 2);
  assert.equal(multiTables.libraryFiles.size, 2);

  // Case B: Zero attachments
  const emptyData = {
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [],
    libraryCollections: [],
    libraryFiles: [],
    categories: [],
    settings: [],
  };
  const { mockDb: emptyDb } = createMockDatabase(emptyData);
  const { zipBytes: emptyZip, filesCount } = await exportFullBackupZip(emptyDb);
  assert.equal(filesCount, 0);

  const { mockDb: restoreEmptyDb, tables: emptyTables } = createMockDatabase();
  const statsEmpty = await restoreBackup(emptyZip, "replace", {}, restoreEmptyDb);
  assert.equal(statsEmpty.libraryFiles, 0);
  assert.equal(emptyTables.libraryFiles.size, 0);
});

// ---------------------------------------------------------------------------
// 6. Validation Rejection & Transaction Atomicity (No Partial Restores)
// ---------------------------------------------------------------------------

test("Phase 4E — Rejects Archive With Missing Attachment Binary and Leaves DB Untouched", async () => {
  const existingId = crypto.randomUUID();
  const { mockDb, tables } = createMockDatabase({
    tasks: [{ id: existingId, title: "Original Task", status: "todo", category: "work", priority: "low", sortOrder: 0, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
  });

  const entryId = crypto.randomUUID();
  const missingFileId = crypto.randomUUID();

  // ZIP payload listing a file in metadata that does NOT exist in attachments/
  const badPayload = {
    version: 3,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [{ id: crypto.randomUUID(), title: "Corrupt Import Task", status: "todo", category: "work", priority: "high", sortOrder: 0, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [{
      id: entryId,
      title: "Missing Attachment Resource",
      type: "file",
      status: "saved",
      notes: "",
      fileMetadata: { fileId: missingFileId, fileName: "missing.pdf", fileType: "application/pdf", fileSize: 100 },
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    }],
    libraryCollections: [],
    libraryFiles: [{
      id: missingFileId,
      entryId,
      fileName: "missing.pdf",
      fileType: "application/pdf",
      fileSize: 100,
      createdAt: "2026-11-08T00:00:00.000Z",
    }],
    categories: [],
    settings: [],
  };

  // ZIP does NOT include attachments/<missingFileId>
  const badZip = fflate.zipSync({
    "orbit-data.json": fflate.strToU8(JSON.stringify(badPayload)),
  });

  await assert.rejects(
    async () => {
      await restoreBackup(badZip, "replace", {}, mockDb);
    },
    /Missing binary attachment in archive/i
  );

  // Original task MUST still exist in database!
  assert.equal(tables.tasks.size, 1);
  assert.ok(tables.tasks.has(existingId));
  assert.equal(tables.tasks.get(existingId)?.title, "Original Task");
});

test("Phase 4E — Rejects Archive With Attachment Size Mismatch and Leaves DB Untouched", async () => {
  const existingId = crypto.randomUUID();
  const { mockDb, tables } = createMockDatabase({
    items: [{ id: existingId, title: "Original Inbox Item", status: "pending", category: "general", priority: "low", createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" }],
  });

  const entryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();

  const payload = {
    version: 3,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [{
      id: entryId,
      title: "Mismatched File",
      type: "file",
      status: "saved",
      notes: "",
      fileMetadata: { fileId, fileName: "data.bin", fileType: "application/octet-stream", fileSize: 999 },
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    }],
    libraryCollections: [],
    libraryFiles: [{
      id: fileId,
      entryId,
      fileName: "data.bin",
      fileType: "application/octet-stream",
      fileSize: 999, // Metadata says 999 bytes
      createdAt: "2026-11-08T00:00:00.000Z",
    }],
    categories: [],
    settings: [],
  };

  // Archive only contains 3 bytes instead of 999
  const badZip = fflate.zipSync({
    "orbit-data.json": fflate.strToU8(JSON.stringify(payload)),
    [`attachments/${fileId}`]: new Uint8Array([1, 2, 3]),
  });

  await assert.rejects(
    async () => {
      await restoreBackup(badZip, "replace", {}, mockDb);
    },
    /Attachment size mismatch/i
  );

  // Original data untouched!
  assert.equal(tables.items.size, 1);
  assert.ok(tables.items.has(existingId));
});

test("Phase 4E — Rejects Malformed ZIP Archive and Leaves DB Untouched", async () => {
  const existingId = crypto.randomUUID();
  const { mockDb, tables } = createMockDatabase({
    habits: [{ id: existingId, title: "Daily Reading", frequency: "daily", sortOrder: 0, isActive: true, createdAt: "2026-11-08T00:00:00.000Z" }],
  });

  // Random non-zip bytes starting with PK header but corrupted
  const corruptBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x99, 0x99, 0x99]);

  await assert.rejects(
    async () => {
      await restoreBackup(corruptBytes, "replace", {}, mockDb);
    },
    /Failed to decompress ZIP archive/i
  );

  // Original habit remains
  assert.equal(tables.habits.size, 1);
  assert.ok(tables.habits.has(existingId));
});

test("Phase 4E — Rejects ZIP With Duplicate IDs and Leaves DB Untouched", async () => {
  const dupId = crypto.randomUUID();
  const payload = {
    version: 3,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [
      { id: dupId, title: "Task A", status: "todo", category: "work", priority: "low", sortOrder: 0, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" },
      { id: dupId, title: "Task B", status: "todo", category: "work", priority: "low", sortOrder: 1, createdAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-08T00:00:00.000Z" },
    ],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [],
    libraryCollections: [],
    libraryFiles: [],
    categories: [],
    settings: [],
  };

  const badZip = fflate.zipSync({
    "orbit-data.json": fflate.strToU8(JSON.stringify(payload)),
  });

  const { mockDb, tables } = createMockDatabase();
  await assert.rejects(
    async () => {
      await restoreBackup(badZip, "replace", {}, mockDb);
    },
    /Duplicate ID detected in table 'tasks'/i
  );

  assert.equal(tables.tasks.size, 0);
});

test("Phase 4E — Sanitizes Dangling Collection References Safely", async () => {
  const entryId = crypto.randomUUID();
  const danglingColId = crypto.randomUUID(); // Not in libraryCollections array

  const payload = {
    version: 3,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [{
      id: entryId,
      title: "Resource with Missing Collection",
      type: "note",
      status: "saved",
      collectionId: danglingColId,
      notes: "",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    }],
    libraryCollections: [], // Empty
    libraryFiles: [],
    categories: [],
    settings: [],
  };

  const zip = fflate.zipSync({
    "orbit-data.json": fflate.strToU8(JSON.stringify(payload)),
  });

  const { mockDb, tables } = createMockDatabase();
  const stats = await restoreBackup(zip, "replace", {}, mockDb);

  assert.equal(stats.libraryEntries, 1);
  const restoredEntry = tables.libraryEntries.get(entryId);
  assert.ok(restoredEntry);
  // collectionId must be safely sanitized to undefined rather than dangling
  assert.equal(restoredEntry.collectionId, undefined);
});
