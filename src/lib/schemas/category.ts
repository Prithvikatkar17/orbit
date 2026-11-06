import { z } from "zod";

export const CategorySchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1).max(100),
  icon:      z.string().max(10).default("📋"),
  color:     z.string().default("#6366f1"),
  module:    z.enum(["task", "habit", "library", "event", "all"]).default("all"),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
});

export type Category = z.infer<typeof CategorySchema>;

