import { z } from "zod";
import { ItemSchema } from "./item";
import { TaskSchema } from "./task";
import { HabitSchema } from "./habit";
import { HabitLogSchema } from "./habit-log";
import { EventSchema } from "./event";
import { ReminderSchema } from "./reminder";
import { LibraryEntrySchema } from "./library-entry";
import { LibraryCollectionSchema } from "./library-collection";
import { CategorySchema } from "./category";
import { SettingsSchema } from "./settings";

export const BackupPayloadSchema = z.object({
  version: z.number().int().default(1),
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  events: z.array(EventSchema).default([]),
  reminders: z.array(ReminderSchema).default([]),
  libraryEntries: z.array(LibraryEntrySchema).default([]),
  libraryCollections: z.array(LibraryCollectionSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  settings: z.array(SettingsSchema).default([]),
});

export type BackupPayload = z.infer<typeof BackupPayloadSchema>;
