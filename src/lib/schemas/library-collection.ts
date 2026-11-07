import { z } from "zod";

export const LibraryCollectionSchema = z.object({
  id:          z.string().uuid(),
  name:        z.string().min(1).max(100),
  description: z.string().max(1000).default(""),
  color:       z.string().default("#6366f1"),
  icon:        z.string().max(10).default("📁"),
  isDefault:   z.boolean().default(false),
  sortOrder:   z.number().int().default(0),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
});

export type LibraryCollection = z.infer<typeof LibraryCollectionSchema>;

