import { z } from "zod";

export const ReminderSchema = z.object({
  id:                         z.string().uuid(),
  eventId:                    z.string().uuid(),
  timing:                     z.object({
    type:                     z.enum(["at_time", "before"]),
    offsetMinutes:            z.number().int().min(0).optional(),
  }),
  label:                      z.string().max(100).optional(),
  lastNotifiedOccurrenceDate: z.string().optional(), // "YYYY-MM-DD"
  notifiedAt:                 z.string().datetime().optional(),
  acknowledgedAt:             z.string().datetime().optional(),
  isActive:                   z.boolean().default(true),
  createdAt:                  z.string().datetime(),
});

export type Reminder = z.infer<typeof ReminderSchema>;

