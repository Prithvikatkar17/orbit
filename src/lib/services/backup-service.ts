import { db } from "../db/client";
import {
  BackupPayloadSchema,
  type BackupPayload,
} from "../schemas/backup";

export { BackupPayloadSchema, type BackupPayload };

/**
 * Exports all 9 Dexie tables to a complete JSON object.
 */
export async function exportFullBackup(): Promise<BackupPayload> {
  const [
    items,
    tasks,
    habits,
    habitLogs,
    events,
    reminders,
    libraryEntries,
    categories,
    settings,
  ] = await Promise.all([
    db.items.toArray(),
    db.tasks.toArray(),
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.events.toArray(),
    db.reminders.toArray(),
    db.libraryEntries.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ]);

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    tasks,
    habits,
    habitLogs,
    events,
    reminders,
    libraryEntries,
    categories,
    settings,
  };

  // Validate outgoing payload
  return BackupPayloadSchema.parse(payload);
}

/**
 * Downloads the exported JSON backup as a file in the browser.
 */
export async function downloadBackupFile(): Promise<void> {
  const backup = await exportFullBackup();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `orbit-backup-${dateStr}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface RestoreStats {
  items: number;
  tasks: number;
  habits: number;
  habitLogs: number;
  events: number;
  reminders: number;
  libraryEntries: number;
  categories: number;
  settings: number;
}

/**
 * Restores data from a parsed backup with full Zod validation and transactional safety.
 * Mode "replace": Clears existing data before writing.
 * Mode "merge": Upserts records by primary key without deleting unreferenced data.
 */
export async function restoreBackup(
  rawData: unknown,
  mode: "replace" | "merge" = "replace"
): Promise<RestoreStats> {
  // Validate incoming structure
  const parsed = BackupPayloadSchema.parse(rawData);

  const stats: RestoreStats = {
    items: parsed.items.length,
    tasks: parsed.tasks.length,
    habits: parsed.habits.length,
    habitLogs: parsed.habitLogs.length,
    events: parsed.events.length,
    reminders: parsed.reminders.length,
    libraryEntries: parsed.libraryEntries.length,
    categories: parsed.categories.length,
    settings: parsed.settings.length,
  };

  await db.transaction(
    "rw",
    [
      db.items,
      db.tasks,
      db.habits,
      db.habitLogs,
      db.events,
      db.reminders,
      db.libraryEntries,
      db.categories,
      db.settings,
    ],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.items.clear(),
          db.tasks.clear(),
          db.habits.clear(),
          db.habitLogs.clear(),
          db.events.clear(),
          db.reminders.clear(),
          db.libraryEntries.clear(),
          db.categories.clear(),
          db.settings.clear(),
        ]);
      }

      await Promise.all([
        db.items.bulkPut(parsed.items),
        db.tasks.bulkPut(parsed.tasks),
        db.habits.bulkPut(parsed.habits),
        db.habitLogs.bulkPut(parsed.habitLogs),
        db.events.bulkPut(parsed.events),
        db.reminders.bulkPut(parsed.reminders),
        db.libraryEntries.bulkPut(parsed.libraryEntries),
        db.categories.bulkPut(parsed.categories),
        db.settings.bulkPut(parsed.settings),
      ]);
    }
  );

  return stats;
}
