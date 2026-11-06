import { z } from "zod";

export const TaskSchema = z.object({
  id:           z.string().uuid(),
  title:        z.string().min(1).max(500),
  notes:        z.string().max(5000).default(""),
  link:         z.string().url().optional(),
  category:     z.string().default("task"), // "task", "goal", "idea", etc.
  priority:     z.enum(["low", "medium", "high"]).default("medium"),
  status:       z.enum(["todo", "in_progress", "completed", "archived"]).default("todo"),
  dueDate:      z.string().optional(), // "YYYY-MM-DD"
  dueTime:      z.string().optional(), // "HH:mm"
  completedAt:  z.string().datetime().optional(),
  sortOrder:    z.number().int().default(0),
  tags:         z.array(z.string()).default([]),
  sourceItemId: z.string().uuid().optional(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

