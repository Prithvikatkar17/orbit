import { db, type OrbitDatabase } from "../db/client.ts";
import { type Item } from "../schemas/item.ts";
import { TaskSchema } from "../schemas/task.ts";
import { LibraryEntrySchema, type LibraryEntry } from "../schemas/library-entry.ts";
import { normalizeUrl } from "../utils/dates.ts";
import { syncMutation } from "./sync-queue-service.ts";

export type TriageAction = "task" | "library" | "dismiss";

export interface TriageUndoPayload {
  action: TriageAction;
  originalItem: Item;
  createdId?: string;
}

/**
 * Infer library entry type from link URL
 */
function inferLibraryType(link?: string): LibraryEntry["type"] {
  if (!link) return "note";
  const lower = link.toLowerCase();
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com")
  ) {
    return "video";
  }
  return "bookmark";
}

/**
 * Instant 0ms triage: converts an Inbox item to a Task.
 * Optimistically adds the Task to Dexie and removes the Inbox item.
 * Syncs asynchronously via the offline sync queue.
 */
export async function triageToTask(
  item: Item,
  database: OrbitDatabase = db
): Promise<TriageUndoPayload> {
  const existingTasks = await database.tasks.toArray();
  const maxSortOrder =
    existingTasks.length > 0
      ? Math.max(...existingTasks.map((t) => t.sortOrder ?? 0))
      : -1;
  const nextSortOrder = maxSortOrder + 1;

  const nowIso = new Date().toISOString();
  const taskId = crypto.randomUUID();

  const task = TaskSchema.parse({
    id: taskId,
    title: item.title.trim(),
    notes: item.notes ? item.notes.trim() : "",
    link: normalizeUrl(item.link),
    category: "task",
    priority: "medium",
    status: "todo",
    sortOrder: nextSortOrder,
    tags: ["inbox-converted"],
    sourceItemId: item.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 0ms optimistic write to Dexie
  await database.transaction("rw", [database.tasks, database.items], async () => {
    await database.tasks.add(task);
    await database.items.delete(item.id);
  });

  // Asynchronous background sync to SQLite backend via syncMutation
  void syncMutation({
    endpoint: `/api/inbox?id=${encodeURIComponent(item.id)}`,
    method: "DELETE",
    entityType: "inbox",
    entityId: item.id,
    database,
  });

  void syncMutation({
    endpoint: "/api/tasks",
    method: "POST",
    body: {
      id: task.id,
      title: task.title,
      notes: task.notes || null,
      link: task.link || null,
      category: task.category,
      priority: task.priority,
      status: task.status,
      sortOrder: task.sortOrder,
      tags: task.tags,
      sourceItemId: item.id,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    },
    entityType: "task",
    entityId: task.id,
    database,
  });

  return {
    action: "task",
    originalItem: item,
    createdId: task.id,
  };
}

/**
 * Instant 0ms triage: converts an Inbox item to a Library Entry.
 * Optimistically adds the LibraryEntry to Dexie and removes the Inbox item.
 * Syncs asynchronously via the offline sync queue.
 */
export async function triageToLibrary(
  item: Item,
  database: OrbitDatabase = db
): Promise<TriageUndoPayload> {
  const nowIso = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const libraryType = inferLibraryType(item.link);

  const entry = LibraryEntrySchema.parse({
    id: entryId,
    title: item.title.trim(),
    notes: item.notes ? item.notes.trim() : "",
    link: normalizeUrl(item.link),
    type: libraryType,
    status: "saved",
    tags: ["inbox-converted"],
    isFavorite: false,
    sourceItemId: item.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 0ms optimistic write to Dexie
  await database.transaction("rw", [database.libraryEntries, database.items], async () => {
    await database.libraryEntries.add(entry);
    await database.items.delete(item.id);
  });

  // Asynchronous background sync to SQLite backend
  void syncMutation({
    endpoint: `/api/inbox?id=${encodeURIComponent(item.id)}`,
    method: "DELETE",
    entityType: "inbox",
    entityId: item.id,
    database,
  });

  return {
    action: "library",
    originalItem: item,
    createdId: entry.id,
  };
}

/**
 * Instant 0ms triage: dismisses (deletes) an Inbox item.
 * Optimistically removes from Dexie and fires background DELETE.
 */
export async function triageDismiss(
  item: Item,
  database: OrbitDatabase = db
): Promise<TriageUndoPayload> {
  await database.items.delete(item.id);

  void syncMutation({
    endpoint: `/api/inbox?id=${encodeURIComponent(item.id)}`,
    method: "DELETE",
    entityType: "inbox",
    entityId: item.id,
    database,
  });

  return {
    action: "dismiss",
    originalItem: item,
  };
}

/**
 * Undoes a previous triage action, cleanly rolling back any created task or
 * library entry, and restoring the original Inbox item to Dexie & SQLite.
 */
export async function undoTriage(
  payload: TriageUndoPayload,
  database: OrbitDatabase = db
): Promise<void> {
  const { action, originalItem, createdId } = payload;

  // 1. Rollback created entity if applicable
  if (action === "task" && createdId) {
    await database.tasks.delete(createdId);
    void syncMutation({
      endpoint: `/api/tasks?id=${encodeURIComponent(createdId)}`,
      method: "DELETE",
      entityType: "task",
      entityId: createdId,
      database,
    });
  } else if (action === "library" && createdId) {
    await database.libraryEntries.delete(createdId);
  }

  // 2. Restore the original Inbox item in Dexie
  await database.items.put(originalItem);

  // 3. Sync restored item to SQLite backend
  void syncMutation({
    endpoint: "/api/inbox",
    method: "POST",
    body: {
      id: originalItem.id,
      title: originalItem.title,
      notes: originalItem.notes || null,
      link: originalItem.link || null,
      category: originalItem.category,
      status: originalItem.status,
      createdAt:
        typeof originalItem.createdAt === "string"
          ? new Date(originalItem.createdAt).getTime()
          : originalItem.createdAt,
    },
    entityType: "inbox",
    entityId: originalItem.id,
    database,
  });
}
