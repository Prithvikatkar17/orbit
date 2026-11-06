import { z } from "zod";

export const ItemSchema = z.object({
  id:          z.string().uuid(),
  title:       z.string().min(1).max(500),
  notes:       z.string().max(5000).default(""),
  link:        z.string().url().optional(),
  category:    z.string().default("inbox"),
  priority:    z.enum(["low", "medium", "high"]).default("medium"),
  status:      z.enum(["pending", "processed", "archived"]).default("pending"),
  processedTo: z.object({
    type:      z.enum(["task", "habit", "event", "library"]),
    id:        z.string().uuid(),
  }).optional(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
});

export type Item = z.infer<typeof ItemSchema>;

