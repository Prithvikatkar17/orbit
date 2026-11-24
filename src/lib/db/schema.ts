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
