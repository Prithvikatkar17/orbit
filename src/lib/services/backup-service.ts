import * as fflate from "fflate";
import { db, type OrbitDatabase } from "../db/client.ts";
import {
  BackupPayloadSchema,
  type BackupPayload,
  BackupLibraryFileSchema,
  type BackupLibraryFile,
} from "../schemas/backup.ts";
import {
  MAX_LIBRARY_FILE_SIZE,
  type LibraryFile,
} from "../schemas/library-file.ts";

export {
  BackupPayloadSchema,
  type BackupPayload,
  BackupLibraryFileSchema,
  type BackupLibraryFile,
};

export interface RestoreOptions {
  /**
   * Required confirmation to allow a legacy JSON restore to clear
   * existing binary attachments when in "replace" mode.
   * If false or omitted, attempting to replace existing attachments with
   * a JSON backup will throw an error to prevent accidental data loss.
   */
  confirmFileDeletion?: boolean;
}

export interface RestoreStats {
  items: number;
  tasks: number;
  habits: number;
  habitLogs: number;
  events: number;
  reminders: number;
  libraryEntries: number;
  libraryCollections: number;
  libraryFiles: number;
  categories: number;
  settings: number;
}

/**
 * Converts various binary attachment representations (Blob, File, ArrayBuffer, Uint8Array)
 * into a pure Uint8Array for ZIP compression and validation.
 */
export async function fileDataToUint8Array(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const ab = await data.arrayBuffer();
    return new Uint8Array(ab);
  }
  if (
    data &&
    typeof data === "object" &&
    "buffer" in data &&
    data.buffer instanceof ArrayBuffer
  ) {
    const d = data as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number };
    return new Uint8Array(d.buffer, d.byteOffset || 0, d.byteLength || d.buffer.byteLength);
  }
  throw new Error("Unsupported binary attachment data type in database");
}

/**
 * Validates file path inside ZIP archive to prevent directory traversal (Zip Slip),
 * absolute paths, and unexpected root entries.
 */
export function validateSafeZipPath(path: string): void {
  if (!path || typeof path !== "string") {
    throw new Error("Invalid archive entry path");
  }
  if (path.includes("\0")) {
    throw new Error(`Unsafe archive path: null byte detected in '${path}'`);
  }
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path)) {
    throw new Error(`Unsafe archive path: absolute path detected '${path}'`);
  }
  const parts = path.split(/[\/\\]/);
  for (const part of parts) {
    if (part === "..") {
      throw new Error(`Unsafe archive path: directory traversal detected in '${path}'`);
    }
  }
  // Allow directory entries ending with /
  if (path.endsWith("/") || path.endsWith("\\")) {
    return;
  }
  // Valid files are "orbit-data.json" or "attachments/<fileId>"
  if (path === "orbit-data.json") {
    return;
  }
  if (path.startsWith("attachments/")) {
    const fileId = path.slice("attachments/".length);
    if (!fileId || fileId.includes("/") || fileId.includes("\\")) {
      throw new Error(`Invalid attachment path inside archive: '${path}'`);
    }
    return;
  }
  throw new Error(`Unexpected file inside backup archive: '${path}'`);
}

/**
 * Ensures records in a backup table array have unique IDs, preventing duplicate primary keys.
 */
export function validateUniqueIds<T extends { id: string }>(
  tableName: string,
  records: T[]
): void {
  const seenIds = new Set<string>();
  for (const record of records) {
    if (!record.id) {
      throw new Error(`Missing record ID in table '${tableName}'`);
    }
    if (seenIds.has(record.id)) {
      throw new Error(
        `Duplicate ID detected in table '${tableName}': '${record.id}'`
      );
    }
    seenIds.add(record.id);
  }
}

/**
 * Exports all 11 Dexie tables to a complete JSON object.
 * Binary `.data` payloads from `libraryFiles` are omitted from the JSON
 * and represented as clean metadata records.
 */
export async function exportFullBackup(
  dbInstance: OrbitDatabase = db
): Promise<BackupPayload> {
  const [
    items,
    tasks,
    habits,
    habitLogs,
    events,
    reminders,
    libraryEntries,
    libraryCollections,
    rawLibraryFiles,
    categories,
    settings,
  ] = await Promise.all([
    dbInstance.items.toArray(),
    dbInstance.tasks.toArray(),
    dbInstance.habits.toArray(),
    dbInstance.habitLogs.toArray(),
    dbInstance.events.toArray(),
    dbInstance.reminders.toArray(),
    dbInstance.libraryEntries.toArray(),
    dbInstance.libraryCollections.toArray(),
    dbInstance.libraryFiles.toArray(),
    dbInstance.categories.toArray(),
    dbInstance.settings.toArray(),
  ]);

  const libraryFiles: BackupLibraryFile[] = rawLibraryFiles.map((f) => ({
    id: f.id,
    entryId: f.entryId,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    createdAt: f.createdAt,
  }));

  const payload: BackupPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    items,
    tasks,
    habits,
    habitLogs,
    events,
    reminders,
    libraryEntries,
    libraryCollections,
    libraryFiles,
    categories,
    settings,
  };

  return BackupPayloadSchema.parse(payload);
}

/**
 * Packages all 11 Dexie tables into a ZIP archive:
 * - `orbit-data.json`: Validated database records and library attachment metadata.
 * - `attachments/<fileId>`: Pure binary files without Base64 encoding.
 */
export async function exportFullBackupZip(
  dbInstance: OrbitDatabase = db
): Promise<{
  zipBytes: Uint8Array;
  fileName: string;
  payload: BackupPayload;
  filesCount: number;
}> {
  const payload = await exportFullBackup(dbInstance);
  const rawLibraryFiles = await dbInstance.libraryFiles.toArray();

  const zipEntries: Record<string, Uint8Array> = {
    "orbit-data.json": fflate.strToU8(JSON.stringify(payload, null, 2)),
  };

  for (const file of rawLibraryFiles) {
    const fileBytes = await fileDataToUint8Array(file.data);
    zipEntries[`attachments/${file.id}`] = fileBytes;
  }

  const zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
    fflate.zip(zipEntries, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `orbit-backup-${dateStr}.zip`;

  return {
    zipBytes,
    fileName,
    payload,
    filesCount: rawLibraryFiles.length,
  };
}

/**
 * Downloads the full ZIP archive containing all 11 tables and binary attachments.
 */
export async function downloadBackupZip(
  dbInstance: OrbitDatabase = db
): Promise<void> {
  const { zipBytes, fileName } = await exportFullBackupZip(dbInstance);
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([zipBytes as unknown as BlobPart], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a data-only JSON backup file (legacy/lightweight format).
 */
export async function downloadBackupFile(
  dbInstance: OrbitDatabase = db
): Promise<void> {
  const backup = await exportFullBackup(dbInstance);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `orbit-backup-${dateStr}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates the unzipped contents of a backup archive against all schemas,
 * safety constraints, size limits, and referential integrity rules.
 * Returns parsed payload and reconstituted LibraryFile records.
 */
export function validateBackupArchive(unzipped: fflate.Unzipped): {
  payload: BackupPayload;
  reconstructedFiles: LibraryFile[];
} {
  // 1. Validate all entry paths for traversal or unexpected files
  const paths = Object.keys(unzipped);
  for (const path of paths) {
    validateSafeZipPath(path);
  }

  // 2. Validate existence of orbit-data.json
  if (!("orbit-data.json" in unzipped)) {
    throw new Error("Invalid backup archive: missing 'orbit-data.json'");
  }

  // 3. Parse JSON and validate against schema
  let rawJson: unknown;
  try {
    const jsonStr = fflate.strFromU8(unzipped["orbit-data.json"]);
    rawJson = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Invalid 'orbit-data.json' inside archive: ${
        err instanceof Error ? err.message : "JSON parse error"
      }`
    );
  }

  const payload = BackupPayloadSchema.parse(rawJson);

  // 4. Duplicate ID checks across all tables
  validateUniqueIds("items", payload.items);
  validateUniqueIds("tasks", payload.tasks);
  validateUniqueIds("habits", payload.habits);
  validateUniqueIds("habitLogs", payload.habitLogs);
  validateUniqueIds("events", payload.events);
  validateUniqueIds("reminders", payload.reminders);
  validateUniqueIds("libraryEntries", payload.libraryEntries);
  validateUniqueIds("libraryCollections", payload.libraryCollections);
  validateUniqueIds("libraryFiles", payload.libraryFiles);
  validateUniqueIds("categories", payload.categories);
  validateUniqueIds("settings", payload.settings);

  // 5. Attachment binaries validation
  for (const meta of payload.libraryFiles) {
    const filePath = `attachments/${meta.id}`;
    if (!(filePath in unzipped)) {
      throw new Error(
        `Missing binary attachment in archive for file '${meta.fileName}' (ID: ${meta.id})`
      );
    }
    const fileBytes = unzipped[filePath];
    if (fileBytes.length !== meta.fileSize) {
      throw new Error(
        `Attachment size mismatch for '${meta.fileName}': metadata specifies ${meta.fileSize} bytes, archive contains ${fileBytes.length} bytes`
      );
    }
    if (meta.fileSize > MAX_LIBRARY_FILE_SIZE) {
      throw new Error(
        `Attachment '${meta.fileName}' exceeds maximum allowed size of 20 MB`
      );
    }
  }

  // 6. Ensure no unreferenced attachments exist in the archive
  for (const path of paths) {
    if (path.startsWith("attachments/") && !path.endsWith("/")) {
      const fileId = path.slice("attachments/".length);
      if (!payload.libraryFiles.some((f) => f.id === fileId)) {
        throw new Error(
          `Unreferenced binary attachment found in archive: '${path}'`
        );
      }
    }
  }

  // 7. Referential check: library resources referencing attachments
  const fileIds = new Set(payload.libraryFiles.map((f) => f.id));
  for (const entry of payload.libraryEntries) {
    if (entry.fileMetadata?.fileId) {
      if (!fileIds.has(entry.fileMetadata.fileId)) {
        throw new Error(
          `Library resource '${entry.title}' references attachment '${entry.fileMetadata.fileName}' (ID: ${entry.fileMetadata.fileId}), which is missing from the archive`
        );
      }
    }
  }

  // 8. Reconstruct binary LibraryFile records with Blob data
  const reconstructedFiles: LibraryFile[] = payload.libraryFiles.map((meta) => {
    const fileBytes = unzipped[`attachments/${meta.id}`];
    const blob = new Blob([fileBytes as unknown as BlobPart], {
      type: meta.fileType,
    });
    return {
      id: meta.id,
      entryId: meta.entryId,
      fileName: meta.fileName,
      fileType: meta.fileType,
      fileSize: meta.fileSize,
      data: blob,
      createdAt: meta.createdAt,
    };
  });

  return { payload, reconstructedFiles };
}

/**
 * Restores data from a backup archive (ZIP) or legacy JSON backup with full
 * validation, referential safety, and atomic database execution.
 *
 * Supports input as File, Blob, ArrayBuffer, Uint8Array, JSON string, or parsed object.
 */
export async function restoreBackup(
  rawDataOrFile: unknown,
  mode: "replace" | "merge" = "replace",
  options: RestoreOptions = {},
  dbInstance: OrbitDatabase = db
): Promise<RestoreStats> {
  // Normalize input into bytes or parsed JSON
  let bytes: Uint8Array | null = null;
  let rawJson: unknown = null;

  if (typeof Blob !== "undefined" && rawDataOrFile instanceof Blob) {
    const ab = await rawDataOrFile.arrayBuffer();
    bytes = new Uint8Array(ab);
  } else if (rawDataOrFile instanceof ArrayBuffer) {
    bytes = new Uint8Array(rawDataOrFile);
  } else if (rawDataOrFile instanceof Uint8Array) {
    bytes = rawDataOrFile;
  } else if (typeof rawDataOrFile === "string") {
    try {
      rawJson = JSON.parse(rawDataOrFile);
    } catch (err) {
      throw new Error(
        `Failed to parse backup JSON: ${
          err instanceof Error ? err.message : "Invalid JSON string"
        }`
      );
    }
  } else if (typeof rawDataOrFile === "object" && rawDataOrFile !== null) {
    rawJson = rawDataOrFile;
  } else {
    throw new Error("Unsupported backup data type for restore");
  }

  // Check if bytes represent a ZIP archive (magic bytes 0x50 0x4B)
  const isZip =
    bytes !== null &&
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4B;

  if (isZip && bytes !== null) {
    // -------------------------------------------------------------
    // ZIP RESTORE PATH
    // -------------------------------------------------------------
    let unzipped: fflate.Unzipped;
    try {
      unzipped = fflate.unzipSync(bytes);
    } catch (err) {
      throw new Error(
        `Failed to decompress ZIP archive: ${
          err instanceof Error ? err.message : "Malformed archive"
        }`
      );
    }

    // Complete archive validation (rejects invalid paths, duplicate IDs, missing binaries)
    const { payload, reconstructedFiles } = validateBackupArchive(unzipped);

    // Sanitize dangling collection references in libraryEntries
    const collectionIds = new Set(payload.libraryCollections.map((c) => c.id));
    if (mode === "replace") {
      for (const entry of payload.libraryEntries) {
        if (entry.collectionId && !collectionIds.has(entry.collectionId)) {
          entry.collectionId = undefined;
        }
      }
    } else {
      // In merge mode, collection might already exist in the database
      const existingCollections = await dbInstance.libraryCollections.toArray();
      const allKnownCollections = new Set([
        ...collectionIds,
        ...existingCollections.map((c) => c.id),
      ]);
      for (const entry of payload.libraryEntries) {
        if (entry.collectionId && !allKnownCollections.has(entry.collectionId)) {
          entry.collectionId = undefined;
        }
      }
    }

    const stats: RestoreStats = {
      items: payload.items.length,
      tasks: payload.tasks.length,
      habits: payload.habits.length,
      habitLogs: payload.habitLogs.length,
      events: payload.events.length,
      reminders: payload.reminders.length,
      libraryEntries: payload.libraryEntries.length,
      libraryCollections: payload.libraryCollections.length,
      libraryFiles: reconstructedFiles.length,
      categories: payload.categories.length,
      settings: payload.settings.length,
    };

    // Atomic Dexie transaction restoring all 11 tables
    await dbInstance.transaction(
      "rw",
      [
        dbInstance.items,
        dbInstance.tasks,
        dbInstance.habits,
        dbInstance.habitLogs,
        dbInstance.events,
        dbInstance.reminders,
        dbInstance.libraryEntries,
        dbInstance.libraryCollections,
        dbInstance.libraryFiles,
        dbInstance.categories,
        dbInstance.settings,
      ],
      async () => {
        if (mode === "replace") {
          await Promise.all([
            dbInstance.items.clear(),
            dbInstance.tasks.clear(),
            dbInstance.habits.clear(),
            dbInstance.habitLogs.clear(),
            dbInstance.events.clear(),
            dbInstance.reminders.clear(),
            dbInstance.libraryEntries.clear(),
            dbInstance.libraryCollections.clear(),
            dbInstance.libraryFiles.clear(),
            dbInstance.categories.clear(),
            dbInstance.settings.clear(),
          ]);
        }

        await Promise.all([
          dbInstance.items.bulkPut(payload.items),
          dbInstance.tasks.bulkPut(payload.tasks),
          dbInstance.habits.bulkPut(payload.habits),
          dbInstance.habitLogs.bulkPut(payload.habitLogs),
          dbInstance.events.bulkPut(payload.events),
          dbInstance.reminders.bulkPut(payload.reminders),
          dbInstance.libraryEntries.bulkPut(payload.libraryEntries),
          dbInstance.libraryCollections.bulkPut(payload.libraryCollections),
          dbInstance.libraryFiles.bulkPut(reconstructedFiles),
          dbInstance.categories.bulkPut(payload.categories),
          dbInstance.settings.bulkPut(payload.settings),
        ]);
      }
    );

    return stats;
  }

  // ---------------------------------------------------------------
  // LEGACY JSON RESTORE PATH (V1 and V2 Backups)
  // ---------------------------------------------------------------
  if (rawJson === null && bytes !== null) {
    const text = fflate.strFromU8(bytes);
    try {
      rawJson = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Failed to parse backup JSON: ${
          err instanceof Error ? err.message : "Invalid JSON"
        }`
      );
    }
  }

  const parsed = BackupPayloadSchema.parse(rawJson);

  // Validate duplicate IDs in all arrays
  validateUniqueIds("items", parsed.items);
  validateUniqueIds("tasks", parsed.tasks);
  validateUniqueIds("habits", parsed.habits);
  validateUniqueIds("habitLogs", parsed.habitLogs);
  validateUniqueIds("events", parsed.events);
  validateUniqueIds("reminders", parsed.reminders);
  validateUniqueIds("libraryEntries", parsed.libraryEntries);
  validateUniqueIds("libraryCollections", parsed.libraryCollections);
  validateUniqueIds("categories", parsed.categories);
  validateUniqueIds("settings", parsed.settings);

  // Protect against silent deletion of existing attachments
  const existingFilesCount = await dbInstance.libraryFiles.count();
  if (
    mode === "replace" &&
    existingFilesCount > 0 &&
    !options.confirmFileDeletion
  ) {
    throw new Error(
      `JSON backups do not contain binary attachments. Restoring in 'Replace All' mode will delete ${existingFilesCount} existing attachment(s). Explicit confirmation is required.`
    );
  }

  const stats: RestoreStats = {
    items: parsed.items.length,
    tasks: parsed.tasks.length,
    habits: parsed.habits.length,
    habitLogs: parsed.habitLogs.length,
    events: parsed.events.length,
    reminders: parsed.reminders.length,
    libraryEntries: parsed.libraryEntries.length,
    libraryCollections: parsed.libraryCollections.length,
    libraryFiles: 0,
    categories: parsed.categories.length,
    settings: parsed.settings.length,
  };

  await dbInstance.transaction(
    "rw",
    [
      dbInstance.items,
      dbInstance.tasks,
      dbInstance.habits,
      dbInstance.habitLogs,
      dbInstance.events,
      dbInstance.reminders,
      dbInstance.libraryEntries,
      dbInstance.libraryCollections,
      dbInstance.libraryFiles,
      dbInstance.categories,
      dbInstance.settings,
    ],
    async () => {
      if (mode === "replace") {
        const clears = [
          dbInstance.items.clear(),
          dbInstance.tasks.clear(),
          dbInstance.habits.clear(),
          dbInstance.habitLogs.clear(),
          dbInstance.events.clear(),
          dbInstance.reminders.clear(),
          dbInstance.libraryEntries.clear(),
          dbInstance.libraryCollections.clear(),
          dbInstance.categories.clear(),
          dbInstance.settings.clear(),
        ];
        // Only clear libraryFiles if explicit confirmation was provided
        if (options.confirmFileDeletion) {
          clears.push(dbInstance.libraryFiles.clear());
        }
        await Promise.all(clears);
      }

      await Promise.all([
        dbInstance.items.bulkPut(parsed.items),
        dbInstance.tasks.bulkPut(parsed.tasks),
        dbInstance.habits.bulkPut(parsed.habits),
        dbInstance.habitLogs.bulkPut(parsed.habitLogs),
        dbInstance.events.bulkPut(parsed.events),
        dbInstance.reminders.bulkPut(parsed.reminders),
        dbInstance.libraryEntries.bulkPut(parsed.libraryEntries),
        dbInstance.libraryCollections.bulkPut(parsed.libraryCollections),
        dbInstance.categories.bulkPut(parsed.categories),
        dbInstance.settings.bulkPut(parsed.settings),
      ]);
    }
  );

  return stats;
}
