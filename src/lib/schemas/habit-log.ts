import { z } from "zod";

export const HabitLogSchema = z.object({
  id:        z.string().uuid(),
  habitId:   z.string().uuid(),
  date:      z.string(), // "YYYY-MM-DD"
  completed: z.boolean().default(true),
  createdAt: z.string().datetime(),
});

export type HabitLog = z.infer<typeof HabitLogSchema>;

