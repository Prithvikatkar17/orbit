import { z } from "zod";

const MAX_LIBRARY_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes

export const LIBRARY_ENTRY_TYPES = [
  // Legacy types (preserved for 100% backward compatibility)
  "watch",
  "read",
  "listen",
  "learn",
  "buy",
  "other",
  // Phase 4 types
  "bookmark",
  "video",
  "playlist",
  "article",
  "note",
  "file",
] as const;

export const LIBRARY_ENTRY_STATUSES = [
  "saved", // Not Started
  "in_progress", // In Progress
  "completed", // Completed
  "dropped",
] as const;

export const LibraryFileMetadataSchema = z.object({
  fileId:   z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().nonnegative().max(MAX_LIBRARY_FILE_SIZE, "File size must not exceed 20 MB"),
});

export type LibraryFileMetadata = z.infer<typeof LibraryFileMetadataSchema>;

export const LibraryEntrySchema = z.object({
  id:           z.string().uuid(),
  title:        z.string().min(1).max(500),
  notes:        z.string().max(50000).default(""),
  link:         z.string().url().optional(),
  type:         z.enum(LIBRARY_ENTRY_TYPES).default("other"),
  status:       z.enum(LIBRARY_ENTRY_STATUSES).default("saved"),
  rating:       z.number().min(1).max(5).optional(),
  tags:         z.array(z.string()).default([]),
  isFavorite:   z.boolean().default(false),
  collectionId: z.string().uuid().optional(),
  lastViewedAt: z.string().datetime().optional(),
  completedAt:  z.string().datetime().optional(),
  sourceItemId: z.string().uuid().optional(),
  fileMetadata: LibraryFileMetadataSchema.optional(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;
