import { db, type OrbitDatabase } from "../db/client.ts";
import { syncMutation, flushSyncQueue } from "./sync-queue-service.ts";
import { isStaticPwaMode } from "../config/runtime.ts";
import type { Event } from "../schemas/event.ts";
import type { Reminder } from "../schemas/reminder.ts";
import type { LibraryCollection } from "../schemas/library-collection.ts";
import type { LibraryEntry } from "../schemas/library-entry.ts";
import type { LibraryFile } from "../schemas/library-file.ts";
import type { Settings } from "../schemas/settings.ts";

function toEpochMs(val: unknown): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toIsoString(val: unknown, fallback: string = new Date().toISOString()): string {
  if (typeof val === "number" && Number.isFinite(val)) {
    return new Date(val).toISOString();
  }
  if (typeof val === "string" && val.length > 0) {
    return val;
  }
  return fallback;
}

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  if (val !== null && val !== undefined) {
    return val as T;
  }
  return fallback;
}

/**
 * Reconciles Calendar Events and Reminders from SQLite into Dexie using LWW + soft-delete tombstones.
 */
export async function reconcileCalendarFromSQLite(
  database: OrbitDatabase = db
): Promise<void> {
  if (isStaticPwaMode()) return;
  try {
    await flushSyncQueue(database);

    const [eventsRes, remindersRes] = await Promise.all([
      fetch("/api/calendar/events"),
      fetch("/api/calendar/reminders"),
    ]);

    if (eventsRes.ok) {
      const data = await eventsRes.json();
      if (Array.isArray(data.events)) {
        for (const serverEvent of data.events) {
          const existing = await database.events.get(serverEvent.id);
          if (serverEvent.deletedAt != null) {
            if (existing) {
              await database.events.delete(serverEvent.id);
            }
            continue;
          }

          const serverUpdated =
            toEpochMs(serverEvent.updatedAt) || toEpochMs(serverEvent.createdAt);
          const existingUpdated = existing
            ? toEpochMs(existing.updatedAt) || toEpochMs(existing.createdAt)
            : -1;

          if (!existing || serverUpdated > existingUpdated) {
            const eventRecord: Event = {
              id: serverEvent.id,
              title: serverEvent.title,
              notes: serverEvent.notes || "",
              type: serverEvent.type || "general",
              date: serverEvent.date,
              startTime: serverEvent.startTime || undefined,
              endTime: serverEvent.endTime || undefined,
              isAllDay:
                typeof serverEvent.isAllDay === "boolean"
                  ? serverEvent.isAllDay
                  : true,
              description: serverEvent.description || undefined,
              recurrence: parseJsonSafe(serverEvent.recurrence, { rule: "none" }),
              color: serverEvent.color || undefined,
              sourceItemId: serverEvent.sourceItemId || undefined,
              createdAt: toIsoString(serverEvent.createdAt),
              updatedAt: toIsoString(serverEvent.updatedAt),
            };
            await database.events.put(eventRecord);
          }
        }
      }
    }

    if (remindersRes.ok) {
      const data = await remindersRes.json();
      if (Array.isArray(data.reminders)) {
        for (const serverRem of data.reminders) {
          const existing = await database.reminders.get(serverRem.id);
          if (serverRem.deletedAt != null) {
            if (existing) {
              await database.reminders.delete(serverRem.id);
            }
            continue;
          }

          const serverUpdated =
            toEpochMs(serverRem.updatedAt) || toEpochMs(serverRem.createdAt);
          const existingUpdated = existing
            ? toEpochMs(existing.acknowledgedAt) ||
              toEpochMs(existing.notifiedAt) ||
              toEpochMs(existing.createdAt)
            : -1;

          if (!existing || serverUpdated > existingUpdated) {
            const remRecord: Reminder = {
              id: serverRem.id,
              eventId: serverRem.eventId,
              timing: parseJsonSafe(serverRem.timing, { type: "at_time" }),
              label: serverRem.label || undefined,
              lastNotifiedOccurrenceDate:
                serverRem.lastNotifiedOccurrenceDate || undefined,
              notifiedAt: serverRem.notifiedAt
                ? toIsoString(serverRem.notifiedAt)
                : undefined,
              acknowledgedAt: serverRem.acknowledgedAt
                ? toIsoString(serverRem.acknowledgedAt)
                : undefined,
              snoozedUntil: serverRem.snoozedUntil
                ? toIsoString(serverRem.snoozedUntil)
                : undefined,
              isActive:
                typeof serverRem.isActive === "boolean" ? serverRem.isActive : true,
              createdAt: toIsoString(serverRem.createdAt),
            };
            await database.reminders.put(remRecord);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[VaultSync] Calendar reconciliation skipped:", err);
  }
}

/**
 * Reconciles Library Collections and Entries from SQLite into Dexie using LWW + soft-delete tombstones.
 */
export async function reconcileLibraryFromSQLite(
  database: OrbitDatabase = db
): Promise<void> {
  if (isStaticPwaMode()) return;
  try {
    await flushSyncQueue(database);

    const [colRes, entryRes] = await Promise.all([
      fetch("/api/library/collections"),
      fetch("/api/library/entries"),
    ]);

    if (colRes.ok) {
      const data = await colRes.json();
      if (Array.isArray(data.collections)) {
        for (const serverCol of data.collections) {
          const existing = await database.libraryCollections.get(serverCol.id);
          if (serverCol.deletedAt != null) {
            if (existing) {
              await database.libraryCollections.delete(serverCol.id);
            }
            continue;
          }

          const serverUpdated =
            toEpochMs(serverCol.updatedAt) || toEpochMs(serverCol.createdAt);
          const existingUpdated = existing
            ? toEpochMs(existing.updatedAt) || toEpochMs(existing.createdAt)
            : -1;

          if (!existing || serverUpdated > existingUpdated) {
            const colRecord: LibraryCollection = {
              id: serverCol.id,
              name: serverCol.name,
              description: serverCol.description || "",
              color: serverCol.color || "#6366f1",
              icon: serverCol.icon || "📁",
              isDefault: Boolean(serverCol.isDefault),
              sortOrder: typeof serverCol.sortOrder === "number" ? serverCol.sortOrder : 0,
              createdAt: toIsoString(serverCol.createdAt),
              updatedAt: toIsoString(serverCol.updatedAt),
            };
            await database.libraryCollections.put(colRecord);
          }
        }
      }
    }

    if (entryRes.ok) {
      const data = await entryRes.json();
      if (Array.isArray(data.entries)) {
        for (const serverEntry of data.entries) {
          const existing = await database.libraryEntries.get(serverEntry.id);
          if (serverEntry.deletedAt != null) {
            if (existing) {
              await database.libraryEntries.delete(serverEntry.id);
            }
            continue;
          }

          const serverUpdated =
            toEpochMs(serverEntry.updatedAt) || toEpochMs(serverEntry.createdAt);
          const existingUpdated = existing
            ? toEpochMs(existing.updatedAt) || toEpochMs(existing.createdAt)
            : -1;

          if (!existing || serverUpdated > existingUpdated) {
            const entryRecord: LibraryEntry = {
              id: serverEntry.id,
              title: serverEntry.title,
              notes: serverEntry.notes || "",
              link: serverEntry.link || undefined,
              type: serverEntry.type || "other",
              status: serverEntry.status || "saved",
              rating: typeof serverEntry.rating === "number" ? serverEntry.rating : undefined,
              tags: parseJsonSafe<string[]>(serverEntry.tags, []),
              isFavorite: Boolean(serverEntry.isFavorite),
              collectionId: serverEntry.collectionId || undefined,
              lastViewedAt: serverEntry.lastViewedAt
                ? toIsoString(serverEntry.lastViewedAt)
                : undefined,
              completedAt: serverEntry.completedAt
                ? toIsoString(serverEntry.completedAt)
                : undefined,
              sourceItemId: serverEntry.sourceItemId || undefined,
              fileMetadata: serverEntry.fileMetadata
                ? parseJsonSafe(serverEntry.fileMetadata, undefined)
                : undefined,
              createdAt: toIsoString(serverEntry.createdAt),
              updatedAt: toIsoString(serverEntry.updatedAt),
            };
            await database.libraryEntries.put(entryRecord);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[VaultSync] Library reconciliation skipped:", err);
  }
}

/**
 * Reconciles user_settings from SQLite into Dexie using LWW.
 */
export async function reconcileSettingsFromSQLite(
  database: OrbitDatabase = db
): Promise<void> {
  if (isStaticPwaMode()) return;
  try {
    await flushSyncQueue(database);
    const res = await fetch("/api/settings");
    if (!res.ok) return;

    const data = await res.json();
    const localSettings = await database.settings.get("user_settings");

    if (!data.settings) {
      if (localSettings) {
        void syncMutation({
          endpoint: "/api/settings",
          method: "POST",
          body: localSettings,
          entityType: "settings",
          entityId: "user_settings",
          database,
        });
      }
      return;
    }

    const serverSettings = data.settings as Settings;
    const serverUpdated = toEpochMs(serverSettings.updatedAt);
    const localUpdated = localSettings ? toEpochMs(localSettings.updatedAt) : -1;

    if (!localSettings || serverUpdated > localUpdated) {
      await database.settings.put(serverSettings);
    } else if (localUpdated > serverUpdated) {
      void syncMutation({
        endpoint: "/api/settings",
        method: "POST",
        body: localSettings,
        entityType: "settings",
        entityId: "user_settings",
        database,
      });
    }
  } catch (err) {
    console.warn("[VaultSync] Settings reconciliation skipped:", err);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

/**
 * Uploads a LibraryFile attachment to SQLite `/api/library/files` lazily.
 */
export async function uploadLibraryFileToSQLite(
  fileRecord: LibraryFile
): Promise<boolean> {
  if (isStaticPwaMode()) return false;
  try {
    let buffer: ArrayBuffer;
    if (fileRecord.data instanceof Blob) {
      buffer = await fileRecord.data.arrayBuffer();
    } else if (fileRecord.data instanceof ArrayBuffer) {
      buffer = fileRecord.data;
    } else if (ArrayBuffer.isView(fileRecord.data)) {
      buffer = fileRecord.data.buffer.slice(
        fileRecord.data.byteOffset,
        fileRecord.data.byteOffset + fileRecord.data.byteLength
      ) as ArrayBuffer;
    } else {
      return false;
    }

    const dataBase64 = arrayBufferToBase64(buffer);
    const res = await fetch("/api/library/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: fileRecord.id,
        entryId: fileRecord.entryId,
        fileName: fileRecord.fileName,
        mimeType: fileRecord.fileType,
        sizeBytes: fileRecord.fileSize,
        dataBase64,
        createdAt: fileRecord.createdAt,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[VaultSync] Library file upload failed:", err);
    return false;
  }
}

/**
 * Fetches a LibraryFile lazily from `/api/library/files?id=...` and caches it in local Dexie.
 */
export async function fetchLibraryFileLazily(
  fileId: string,
  database: OrbitDatabase = db
): Promise<LibraryFile | undefined> {
  if (isStaticPwaMode()) return undefined;
  try {
    const res = await fetch(`/api/library/files?id=${encodeURIComponent(fileId)}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    if (!data.file || !data.file.dataBase64) return undefined;

    const blob = base64ToBlob(data.file.dataBase64, data.file.mimeType);
    const record: LibraryFile = {
      id: data.file.id,
      entryId: data.file.entryId,
      fileName: data.file.fileName,
      fileType: data.file.mimeType,
      fileSize: data.file.sizeBytes,
      data: blob,
      createdAt: toIsoString(data.file.createdAt),
    };
    await database.libraryFiles.put(record);
    return record;
  } catch (err) {
    console.warn("[VaultSync] Lazy library file fetch failed:", err);
    return undefined;
  }
}

/**
 * Pushes the current local `user_settings` row to SQLite via syncMutation.
 */
export async function syncSettingsToSQLite(
  database: OrbitDatabase = db
): Promise<void> {
  try {
    const current = await database.settings.get("user_settings");
    if (!current) return;
    void syncMutation({
      endpoint: "/api/settings",
      method: "POST",
      body: current,
      entityType: "settings",
      entityId: "user_settings",
      database,
    });
  } catch (err) {
    console.warn("[VaultSync] Failed to queue settings sync:", err);
  }
}

/**
 * Pushes restored Dexie tables to SQLite after a `.zip` or `.json` backup restore.
 * In `replace` mode, wipes SQLite first (with `X-Orbit-Confirm: reset`) so deleted/old
 * SQLite rows never resurrect during subsequent LWW hydration.
 */
export async function syncRestoredDatabaseToSQLite(
  mode: "replace" | "merge",
  database: OrbitDatabase = db
): Promise<void> {
  if (isStaticPwaMode()) return;
  try {
    if (mode === "replace") {
      await database.syncQueue.clear();
      await fetch("/api/reset", {
        method: "DELETE",
        headers: { "X-Orbit-Confirm": "reset" },
      });
    }

    const [
      items,
      tasks,
      habits,
      habitLogs,
      events,
      reminders,
      collections,
      entries,
      files,
      expenses,
      userSettings,
    ] = await Promise.all([
      database.items.toArray(),
      database.tasks.toArray(),
      database.habits.toArray(),
      database.habitLogs.toArray(),
      database.events.toArray(),
      database.reminders.toArray(),
      database.libraryCollections.toArray(),
      database.libraryEntries.toArray(),
      database.libraryFiles.toArray(),
      database.expenses.toArray(),
      database.settings.get("user_settings"),
    ]);

    for (const item of items) {
      await syncMutation({
        endpoint: "/api/inbox",
        method: "POST",
        body: item,
        entityType: "inbox",
        entityId: item.id,
        database,
      });
    }
    for (const task of tasks) {
      await syncMutation({
        endpoint: "/api/tasks",
        method: "POST",
        body: task,
        entityType: "task",
        entityId: task.id,
        database,
      });
    }
    for (const habit of habits) {
      await syncMutation({
        endpoint: "/api/habits",
        method: "POST",
        body: habit,
        entityType: "habit",
        entityId: habit.id,
        database,
      });
    }
    for (const log of habitLogs) {
      await syncMutation({
        endpoint: "/api/habits/log",
        method: "POST",
        body: { ...log, completed: log.completed ?? true },
        entityType: "habitLog",
        entityId: log.id,
        database,
      });
    }
    for (const event of events) {
      await syncMutation({
        endpoint: "/api/calendar/events",
        method: "POST",
        body: event,
        entityType: "calendarEvent",
        entityId: event.id,
        database,
      });
    }
    for (const rem of reminders) {
      await syncMutation({
        endpoint: "/api/calendar/reminders",
        method: "POST",
        body: rem,
        entityType: "reminder",
        entityId: rem.id,
        database,
      });
    }
    for (const col of collections) {
      await syncMutation({
        endpoint: "/api/library/collections",
        method: "POST",
        body: col,
        entityType: "libraryCollection",
        entityId: col.id,
        database,
      });
    }
    for (const entry of entries) {
      await syncMutation({
        endpoint: "/api/library/entries",
        method: "POST",
        body: entry,
        entityType: "libraryEntry",
        entityId: entry.id,
        database,
      });
    }
    for (const file of files) {
      await uploadLibraryFileToSQLite(file);
    }
    for (const expense of expenses) {
      await syncMutation({
        endpoint: "/api/expenses",
        method: "POST",
        body: expense,
        entityType: "expense",
        entityId: expense.id,
        database,
      });
    }
    if (userSettings) {
      await syncMutation({
        endpoint: "/api/settings",
        method: "POST",
        body: userSettings,
        entityType: "settings",
        entityId: "user_settings",
        database,
      });
    }
  } catch (err) {
    console.warn("[VaultSync] Post-restore SQLite sync encountered an error:", err);
  }
}
