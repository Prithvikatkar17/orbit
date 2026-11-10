import { z } from "zod";
import { ItemSchema } from "./item.ts";
import { TaskSchema } from "./task.ts";
import { HabitSchema } from "./habit.ts";
import { HabitLogSchema } from "./habit-log.ts";
import { EventSchema } from "./event.ts";
import { ReminderSchema } from "./reminder.ts";
import { NotificationSchema } from "./notification.ts";
import { LibraryEntrySchema } from "./library-entry.ts";
import { LibraryCollectionSchema } from "./library-collection.ts";
import { MAX_LIBRARY_FILE_SIZE } from "./library-file.ts";
import { CategorySchema } from "./category.ts";
import { SettingsSchema } from "./settings.ts";

export const BackupLibraryFileSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_LIBRARY_FILE_SIZE, "File size must not exceed 20 MB"),
  createdAt: z.string().datetime(),
});

export type BackupLibraryFile = z.infer<typeof BackupLibraryFileSchema>;

export const BackupPayloadSchema = z.object({
  version: z.number().int().default(1),
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  events: z.array(EventSchema).default([]),
  reminders: z.array(ReminderSchema).default([]),
  notifications: z.array(NotificationSchema).default([]),
  libraryEntries: z.array(LibraryEntrySchema).default([]),
  libraryCollections: z.array(LibraryCollectionSchema).default([]),
  libraryFiles: z.array(BackupLibraryFileSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  settings: z.array(SettingsSchema).default([]),
});

export type BackupPayload = z.infer<typeof BackupPayloadSchema>;
