import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";
import {
  LibraryEntrySchema,
  LibraryFileMetadataSchema,
  type LibraryEntry,
  type LibraryFileMetadata,
} from "../schemas/library-entry.ts";
import {
  LibraryFileSchema,
  type LibraryFile,
  validateLibraryFileSize,
} from "../schemas/library-file.ts";
import { normalizeUrl } from "../utils/dates.ts";

export interface SaveLibraryEntryInput {
  entryData: {
    id?: string;
    title: string;
    notes?: string;
    link?: string;
    type?: LibraryEntry["type"];
    status?: LibraryEntry["status"];
    rating?: number;
    tags?: string[];
    isFavorite?: boolean;
    collectionId?: string;
    lastViewedAt?: string;
    completedAt?: string;
    sourceItemId?: string;
    createdAt?: string;
  };
  attachedFile?: File | Blob | null;
  attachedFileName?: string;
  attachedFileType?: string;
  attachedFileSize?: number;
  existingFileMetadata?: LibraryFileMetadata;
  isRemovingFile?: boolean;
  isEditing?: boolean;
  database?: OrbitDatabase;
}

/**
 * Atomically validates and persists a library entry and its associated file attachment.
 * Guarantees that:
 * 1. Zod validation completes before any database mutation.
 * 2. Attachment creation and entry storage occur inside one atomic read-write transaction.
 * 3. Any validation or storage failure rolls back all changes without leaving orphaned binary records.
 */
export async function saveLibraryEntryWithAttachment(
  options: SaveLibraryEntryInput
): Promise<LibraryEntry> {
  const {
    entryData,
    attachedFile,
    attachedFileName,
    attachedFileType,
    attachedFileSize,
    existingFileMetadata,
    isRemovingFile = false,
    isEditing = false,
    database = defaultDb,
  } = options;

  const nowIso = new Date().toISOString();
  const id = entryData.id || crypto.randomUUID();

  // 1. Process file metadata and binary file record
  let resolvedFileMetadata: LibraryFileMetadata | undefined = isRemovingFile
    ? undefined
    : existingFileMetadata;
  let fileRecord: LibraryFile | null = null;

  if (attachedFile) {
    const rawName =
      attachedFileName ||
      ("name" in attachedFile && typeof attachedFile.name === "string"
        ? attachedFile.name
        : "attachment");
    const rawType =
      attachedFileType ||
      attachedFile.type ||
      "application/octet-stream";
    const rawSize = attachedFileSize ?? attachedFile.size;

    if (!validateLibraryFileSize(rawSize)) {
      throw new Error(`File "${rawName}" exceeds the maximum 20 MB size limit.`);
    }

    const fileId = crypto.randomUUID();

    resolvedFileMetadata = LibraryFileMetadataSchema.parse({
      fileId,
      fileName: rawName,
      fileType: rawType,
      fileSize: rawSize,
    });

    fileRecord = LibraryFileSchema.parse({
      id: fileId,
      entryId: id,
      fileName: rawName,
      fileType: rawType,
      fileSize: rawSize,
      data: attachedFile,
      createdAt: nowIso,
    });
  }

  // 2. Validate library entry metadata BEFORE initiating any database transaction
  const parsedEntry = LibraryEntrySchema.parse({
    id,
    title: entryData.title.trim(),
    notes: (entryData.notes || "").trim(),
    link: normalizeUrl(entryData.link),
    type: entryData.type || "other",
    status: entryData.status || "saved",
    rating: entryData.rating || undefined,
    tags: entryData.tags || [],
    isFavorite: Boolean(entryData.isFavorite),
    collectionId: entryData.collectionId || undefined,
    lastViewedAt: entryData.lastViewedAt,
    completedAt:
      entryData.status === "completed"
        ? entryData.completedAt || nowIso
        : undefined,
    sourceItemId: entryData.sourceItemId,
    fileMetadata: resolvedFileMetadata,
    createdAt: entryData.createdAt || nowIso,
    updatedAt: nowIso,
  });

  // 3. Atomically persist attachment and entry inside a single transaction
  await database.transaction(
    "rw",
    [database.libraryEntries, database.libraryFiles],
    async () => {
      if (fileRecord) {
        // Clean up any existing file for this entry (e.g. when replacing an attachment)
        await database.libraryFiles.where("entryId").equals(id).delete();
        await database.libraryFiles.put(fileRecord);
      } else if (isRemovingFile) {
        await database.libraryFiles.where("entryId").equals(id).delete();
      }

      if (isEditing) {
        await database.libraryEntries.put(parsedEntry);
      } else {
        await database.libraryEntries.add(parsedEntry);
      }
    }
  );

  return parsedEntry;
}

/**
 * Atomically deletes a library entry and all its associated file attachments.
 * If either operation fails, the entire transaction rolls back.
 */
export async function deleteLibraryEntryWithFiles(
  entryId: string,
  database: OrbitDatabase = defaultDb
): Promise<void> {
  await database.transaction(
    "rw",
    [database.libraryEntries, database.libraryFiles],
    async () => {
      await database.libraryFiles.where("entryId").equals(entryId).delete();
      await database.libraryEntries.delete(entryId);
    }
  );
}

/**
 * Atomically deletes a library collection and cleans collectionId references from all entries.
 * Entries in the collection are preserved; only their collectionId property is removed.
 * If either operation fails, the entire transaction rolls back.
 */
export async function deleteLibraryCollectionAndCleanReferences(
  collectionId: string,
  database: OrbitDatabase = defaultDb
): Promise<void> {
  await database.transaction(
    "rw",
    [database.libraryCollections, database.libraryEntries],
    async () => {
      // Cleanly remove collection reference from all member entries
      await database.libraryEntries
        .where("collectionId")
        .equals(collectionId)
        .modify((entry) => {
          delete (entry as { collectionId?: string }).collectionId;
        });

      await database.libraryCollections.delete(collectionId);
    }
  );
}
