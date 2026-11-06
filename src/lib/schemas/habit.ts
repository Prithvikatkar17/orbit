import { z } from "zod";

export const HabitSchema = z.object({
  id:         z.string().uuid(),
  title:      z.string().min(1).max(500),
  notes:      z.string().max(5000).default(""),
  frequency:  z.enum(["daily", "weekdays", "weekly", "custom"]).default("daily"),
  customDays: z.array(z.number().min(0).max(6)).default([]), // 0=Sun, 6=Sat
  color:      z.string().default("#10b981"),
  isActive:   z.boolean().default(true),
  sortOrder:  z.number().int().default(0),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
});

export type Habit = z.infer<typeof HabitSchema>;

