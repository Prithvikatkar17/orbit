import { z } from "zod";

export const LibraryEntrySchema = z.object({
  id:           z.string().uuid(),
  title:        z.string().min(1).max(500),
  notes:        z.string().max(5000).default(""),
  link:         z.string().url().optional(),
  type:         z.enum(["watch", "read", "listen", "learn", "buy", "other"]).default("other"),
  status:       z.enum(["saved", "in_progress", "completed", "dropped"]).default("saved"),
  rating:       z.number().min(1).max(5).optional(),
  tags:         z.array(z.string()).default([]),
  completedAt:  z.string().datetime().optional(),
  sourceItemId: z.string().uuid().optional(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

