import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const inbox = sqliteTable("inbox", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  link: text("link"),
  category: text("category").default("inbox"),
  createdAt: integer("createdAt"),
  updatedAt: integer("updatedAt"),
  deletedAt: integer("deletedAt"),
  status: text("status").default("pending"),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  link: text("link"),
  category: text("category").default("task"),
  priority: text("priority").default("medium"),
  status: text("status").default("todo"),
  dueDate: text("dueDate"),
  dueTime: text("dueTime"),
  completedAt: integer("completedAt"),
  sortOrder: integer("sortOrder").default(0),
  tags: text("tags").default("[]"),
  sourceItemId: text("sourceItemId"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"),
  frequency: text("frequency").default("daily"),
  customDays: text("customDays").default("[]"),
  targetCount: integer("targetCount").default(1),
  color: text("color").default("#10b981"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  archived: integer("archived", { mode: "boolean" }).default(false),
  sortOrder: integer("sortOrder").default(0),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt"),
  deletedAt: integer("deletedAt"),
});

export const habitLogs = sqliteTable(
  "habitLogs",
  {
    id: text("id").primaryKey(),
    habitId: text("habitId")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    completed: integer("completed", { mode: "boolean" }).default(true),
    createdAt: integer("createdAt").notNull(),
  },
  (table) => [
    uniqueIndex("habit_date_unique_idx").on(table.habitId, table.date),
  ]
);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  amountPaise: integer("amountPaise").notNull(),
  category: text("category").notNull(),
  paymentMode: text("paymentMode").default("upi").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const calendarEvents = sqliteTable("calendarEvents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").default(""),
  type: text("type").default("general").notNull(),
  date: text("date").notNull(),
  startTime: text("startTime"),
  endTime: text("endTime"),
  isAllDay: integer("isAllDay", { mode: "boolean" }).default(true),
  description: text("description"),
  recurrence: text("recurrence").default('{"rule":"none"}'),
  color: text("color"),
  sourceItemId: text("sourceItemId"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  eventId: text("eventId").notNull(),
  timing: text("timing").notNull(),
  label: text("label"),
  lastNotifiedOccurrenceDate: text("lastNotifiedOccurrenceDate"),
  notifiedAt: integer("notifiedAt"),
  acknowledgedAt: integer("acknowledgedAt"),
  snoozedUntil: integer("snoozedUntil"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const libraryCollections = sqliteTable("libraryCollections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").default("#6366f1"),
  icon: text("icon").default("📁"),
  isDefault: integer("isDefault", { mode: "boolean" }).default(false),
  sortOrder: integer("sortOrder").default(0),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const libraryEntries = sqliteTable("libraryEntries", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").default(""),
  link: text("link"),
  type: text("type").default("other").notNull(),
  status: text("status").default("saved").notNull(),
  rating: integer("rating"),
  tags: text("tags").default("[]"),
  isFavorite: integer("isFavorite", { mode: "boolean" }).default(false),
  collectionId: text("collectionId"),
  lastViewedAt: integer("lastViewedAt"),
  completedAt: integer("completedAt"),
  sourceItemId: text("sourceItemId"),
  fileMetadata: text("fileMetadata"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const libraryFiles = sqliteTable("libraryFiles", {
  id: text("id").primaryKey(),
  entryId: text("entryId").notNull(),
  fileName: text("fileName").notNull(),
  mimeType: text("mimeType").notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  dataBase64: text("dataBase64").notNull(),
  createdAt: integer("createdAt").notNull(),
  deletedAt: integer("deletedAt"),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  payloadJson: text("payloadJson").notNull(),
  updatedAt: integer("updatedAt").notNull(),
});

export type InboxItem = typeof inbox.$inferSelect;
export type NewInboxItem = typeof inbox.$inferInsert;

export type TaskItem = typeof tasks.$inferSelect;
export type NewTaskItem = typeof tasks.$inferInsert;

export type HabitItem = typeof habits.$inferSelect;
export type NewHabitItem = typeof habits.$inferInsert;

export type HabitLogItem = typeof habitLogs.$inferSelect;
export type NewHabitLogItem = typeof habitLogs.$inferInsert;

export type ExpenseItem = typeof expenses.$inferSelect;
export type NewExpenseItem = typeof expenses.$inferInsert;
