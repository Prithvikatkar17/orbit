import { z } from "zod";

export const NotificationSchema = z.object({
  id:             z.string().min(1),
  reminderId:     z.string().min(1),
  eventId:        z.string().min(1),
  eventTitle:     z.string().min(1).max(500),
  eventType:      z.string().default("general"),
  occurrenceDate: z.string(), // "YYYY-MM-DD"
  scheduledTime:  z.string(),
  isMissed:       z.boolean().default(false),
  deliveredAt:    z.string().datetime(),
  read:           z.boolean().default(false),
});

export type NotificationItem = z.infer<typeof NotificationSchema>;

