import { z } from "zod";

export const SyncQueueItemSchema = z.object({
  seq: z.number().int().positive().optional(),
  id: z.string().uuid(),
  endpoint: z.string().min(1),
  method: z.enum(["POST", "PATCH", "DELETE"]),
  body: z.string().nullable().optional(),
  entityType: z.enum([
    "inbox",
    "task",
    "habit",
    "habitLog",
    "expense",
    "calendarEvent",
    "reminder",
    "libraryEntry",
    "libraryCollection",
    "settings",
  ]),
  entityId: z.string().min(1),
  createdAt: z.number().int(),
  retryCount: z.number().int().default(0),
});

export type SyncQueueItem = z.infer<typeof SyncQueueItemSchema>;
