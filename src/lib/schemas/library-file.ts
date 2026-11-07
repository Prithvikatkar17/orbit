import { z } from "zod";

export const MAX_LIBRARY_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes

export function validateLibraryFileSize(size: number): boolean {
  return size >= 0 && size <= MAX_LIBRARY_FILE_SIZE;
}

export const LibraryFileSchema = z.object({
  id:        z.string().uuid(),
  entryId:   z.string().uuid(),
  fileName:  z.string().min(1).max(255),
  fileType:  z.string().min(1).max(100),
  fileSize:  z.number().int().nonnegative().max(MAX_LIBRARY_FILE_SIZE, "File size must not exceed 20 MB"),
  data:      z.any(), // Raw Blob, File, ArrayBuffer, or Uint8Array stored in IndexedDB
  createdAt: z.string().datetime(),
});

export type LibraryFile = z.infer<typeof LibraryFileSchema>;

