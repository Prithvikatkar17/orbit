import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const inbox = sqliteTable("inbox", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  link: text("link"),
  category: text("category").default("inbox"),
  createdAt: integer("createdAt"),
  status: text("status").default("pending"),
});

export type InboxItem = typeof inbox.$inferSelect;
export type NewInboxItem = typeof inbox.$inferInsert;
