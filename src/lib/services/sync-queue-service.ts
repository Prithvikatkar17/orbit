import { db, OrbitDatabase } from "../db/client.ts";
import type { SyncQueueItem } from "../schemas/sync-queue.ts";

export interface SyncMutationOptions {
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  entityType:
    | "inbox"
    | "task"
    | "habit"
    | "habitLog"
    | "expense"
    | "calendarEvent"
    | "reminder"
    | "libraryEntry"
    | "libraryCollection"
    | "settings";
  entityId: string;
  database?: OrbitDatabase;
}

export interface SyncMutationResult {
  success: boolean;
  queued: boolean;
}

let isFlushing = false;

export function isQueueFlushing(): boolean {
  return isFlushing;
}

/**
 * Executes a network mutation against the SQLite backend with a 4000ms timeout.
 * If offline, aborted, timed out, network fails, or returns 5xx,
 * the mutation is reliably enqueued into Dexie `syncQueue` for background replay.
 */
export async function syncMutation(options: SyncMutationOptions): Promise<SyncMutationResult> {
  const targetDb = options.database ?? db;

  const serializedBody: string | null =
    options.body === undefined || options.body === null
      ? null
      : typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);

  // Fast-path: if browser reports explicitly offline, enqueue immediately without 4s timeout
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await enqueueMutation(targetDb, options, serializedBody);
    return { success: false, queued: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(options.endpoint, {
      method: options.method,
      headers: serializedBody ? { "Content-Type": "application/json" } : undefined,
      body: serializedBody ?? undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, queued: false };
    }

    if (res.status >= 500) {
      // 5xx Server Error: enqueue for retry
      await enqueueMutation(targetDb, options, serializedBody);
      return { success: false, queued: true };
    }

    // 4xx Client Error: do not enqueue to avoid infinite poisoned queue loop
    console.warn(`[SyncQueue] Client error ${res.status} on ${options.method} ${options.endpoint}`);
    return { success: false, queued: false };
  } catch {
    clearTimeout(timeoutId);
    // Network failure / timeout / fetch abort: enqueue for replay
    await enqueueMutation(targetDb, options, serializedBody);
    return { success: false, queued: true };
  }
}

async function enqueueMutation(
  targetDb: OrbitDatabase,
  options: SyncMutationOptions,
  serializedBody: string | null
): Promise<void> {
  try {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      endpoint: options.endpoint,
      method: options.method,
      body: serializedBody,
      entityType: options.entityType,
      entityId: options.entityId,
      createdAt: Date.now(),
      retryCount: 0,
    };
    await targetDb.syncQueue.add(item);
  } catch (err) {
    console.error("[SyncQueue] Failed to enqueue mutation:", err);
  }
}

/**
 * Flushes all pending mutations in db.syncQueue in strict FIFO order.
 * Guarded by `isFlushing` lock to prevent race conditions.
 * On network/timeout/5xx failure, stops immediately to prevent out-of-order mutations.
 */
export async function flushSyncQueue(
  database: OrbitDatabase = db
): Promise<{ flushed: number; hasMore: boolean }> {
  if (isFlushing) {
    return { flushed: 0, hasMore: true };
  }

  isFlushing = true;
  let flushedCount = 0;
  let hasMore = false;

  try {
    let items: SyncQueueItem[] = [];
    try {
      items = await database.syncQueue.orderBy("seq").toArray();
    } catch {
      items = (await database.syncQueue.toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    }

    if (items.length === 0) {
      return { flushed: 0, hasMore: false };
    }

    for (const item of items) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: item.body ? { "Content-Type": "application/json" } : undefined,
          body: item.body ?? undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Success or 404 on DELETE (already deleted on server)
        if (res.ok || (item.method === "DELETE" && res.status === 404)) {
          if (item.seq !== undefined) {
            await database.syncQueue.delete(item.seq);
          } else {
            await database.syncQueue.where("id").equals(item.id).delete();
          }
          flushedCount++;
        } else if (res.status >= 500) {
          // Server error: increment retryCount and stop FIFO processing
          if (item.seq !== undefined) {
            await database.syncQueue.update(item.seq, { retryCount: (item.retryCount || 0) + 1 });
          }
          hasMore = true;
          break;
        } else {
          // Unrecoverable 4xx client error: remove to avoid poison pill
          console.warn(
            `[SyncQueue] Dropping unrecoverable ${res.status} mutation on ${item.method} ${item.endpoint}`
          );
          if (item.seq !== undefined) {
            await database.syncQueue.delete(item.seq);
          } else {
            await database.syncQueue.where("id").equals(item.id).delete();
          }
        }
      } catch {
        clearTimeout(timeoutId);
        // Network / timeout failure: increment retryCount and break FIFO loop immediately
        if (item.seq !== undefined) {
          await database.syncQueue.update(item.seq, { retryCount: (item.retryCount || 0) + 1 });
        }
        hasMore = true;
        break;
      }
    }
  } finally {
    isFlushing = false;
  }

  return { flushed: flushedCount, hasMore };
}

/**
 * Returns the current number of pending items in the sync queue.
 */
export async function getPendingSyncCount(database: OrbitDatabase = db): Promise<number> {
  try {
    return await database.syncQueue.count();
  } catch {
    return 0;
  }
}
