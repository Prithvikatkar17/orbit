import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";
import { type Event } from "../schemas/event.ts";
import { NotificationSchema, type NotificationItem } from "../schemas/notification.ts";
import {
  getOccurrencesForEvent,
  calculateReminderTriggerTime,
} from "../utils/recurrence.ts";
import {
  getLocalDateString,
  getOffsetDateString,
  parseLocalDate,
} from "../utils/dates.ts";
import { useNotificationStore } from "../stores/notification-store.ts";

export { calculateReminderTriggerTime };

export interface CheckDueRemindersOptions {
  database?: OrbitDatabase;
  nowMs?: number;
  rethrowOnError?: boolean;
}

// Concurrency guard to prevent overlapping reminder scans (e.g. setInterval + visibility/focus events)
let inFlightCheckPromise: Promise<NotificationItem[]> | null = null;

/**
 * Checks all active reminders, calculates trigger times, persists notifications atomically
 * with reminder state updates in IndexedDB, and syncs delivered alerts to the notification store.
 */
export async function checkDueReminders(
  options: CheckDueRemindersOptions = {}
): Promise<NotificationItem[]> {
  const isDefaultDb = !options.database;

  // Skip SSR execution when no explicit database instance is provided
  if (isDefaultDb && typeof window === "undefined") {
    return [];
  }

  // Deduplicate concurrent runs against the live database
  if (isDefaultDb && inFlightCheckPromise) {
    return inFlightCheckPromise;
  }

  const executionPromise = runCheckDueReminders(options);

  if (isDefaultDb) {
    inFlightCheckPromise = executionPromise;
    try {
      return await executionPromise;
    } finally {
      inFlightCheckPromise = null;
    }
  }

  return await executionPromise;
}

async function runCheckDueReminders(
  options: CheckDueRemindersOptions
): Promise<NotificationItem[]> {
  const database = options.database || defaultDb;

  try {
    // 1. Load reminders using a single batch getAll() request rather than cursor .filter().
    // Note: ReminderSchema stores `isActive` as a JavaScript boolean (`true`/`false`),
    // which is excluded from IndexedDB index keys per W3C IndexedDB spec §2.13.
    // Querying .where("isActive").equals(1) would return 0 rows, and .equals(true) throws DataError.
    const allReminders = await database.reminders.toArray();
    const activeReminders = allReminders.filter((r) => Boolean(r.isActive));
    if (activeReminders.length === 0) {
      return [];
    }

    const now = options.nowMs ?? Date.now();
    const nowDate = new Date(now);
    const todayStr = getLocalDateString(nowDate);
    // Check past 7 days to 2 days ahead to catch missed reminders and early offsets
    const checkStartStr = getOffsetDateString(-7, parseLocalDate(todayStr));
    const checkEndStr = getOffsetDateString(2, parseLocalDate(todayStr));

    // 2. Batch-load only referenced events using primary key index
    const eventIds = Array.from(new Set(activeReminders.map((r) => r.eventId)));
    const events = await database.events.where("id").anyOf(eventIds).toArray();
    const eventMap = new Map<string, Event>();
    for (const ev of events) {
      eventMap.set(ev.id, ev);
    }

    interface PendingDelivery {
      notification: NotificationItem;
      event: Event;
      label?: string;
    }

    const candidates: PendingDelivery[] = [];

    for (const reminder of activeReminders) {
      const event = eventMap.get(reminder.eventId);
      if (!event) continue;

      // Fast path for non-recurring events already notified for their sole occurrence date
      if (
        event.recurrence.rule === "none" &&
        reminder.lastNotifiedOccurrenceDate &&
        event.date <= reminder.lastNotifiedOccurrenceDate
      ) {
        continue;
      }

      // Find occurrences within the check window
      const occurrences = getOccurrencesForEvent(event, checkStartStr, checkEndStr);

      for (const occ of occurrences) {
        // Chronological deduplication: skip any occurrence already delivered or older than lastNotifiedOccurrenceDate
        if (
          reminder.lastNotifiedOccurrenceDate &&
          occ.occurrenceDate <= reminder.lastNotifiedOccurrenceDate
        ) {
          continue;
        }

        const triggerTimestamp = calculateReminderTriggerTime(
          event,
          occ.occurrenceDate,
          reminder
        );

        // If trigger time is still in the future, it is waiting
        if (triggerTimestamp > now) {
          continue;
        }

        // Trigger time is due (now or past). Determine if missed (> 15 minutes late)
        const isMissed = now - triggerTimestamp > 15 * 60 * 1000;
        const notificationId = `${reminder.id}-${occ.occurrenceDate}`;

        const notificationItem = NotificationSchema.parse({
          id: notificationId,
          reminderId: reminder.id,
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.type,
          occurrenceDate: occ.occurrenceDate,
          scheduledTime: event.isAllDay ? "All Day" : event.startTime || "09:00",
          isMissed,
          deliveredAt: new Date(now).toISOString(),
          read: false,
        });

        candidates.push({
          notification: notificationItem,
          event,
          label: reminder.label,
        });
      }
    }

    if (candidates.length === 0) {
      return [];
    }

    // 3. Deduplicate against persisted notifications table using primary key index
    const candidateIds = candidates.map((c) => c.notification.id);
    const existingNotifs = await database.notifications
      .where("id")
      .anyOf(candidateIds)
      .toArray();
    const existingIdSet = new Set(existingNotifs.map((n) => n.id));

    const toDeliver = candidates.filter(
      (c) => !existingIdSet.has(c.notification.id)
    );

    if (toDeliver.length === 0) {
      return [];
    }

    // Track the latest occurrence date per reminder for atomic update
    const latestOccurrenceByReminder = new Map<string, string>();
    for (const item of toDeliver) {
      const remId = item.notification.reminderId;
      const occDate = item.notification.occurrenceDate;
      const currentLatest = latestOccurrenceByReminder.get(remId);
      if (!currentLatest || occDate > currentLatest) {
        latestOccurrenceByReminder.set(remId, occDate);
      }
    }

    const notificationsToPersist = toDeliver.map((d) => d.notification);
    const nowIso = new Date(now).toISOString();

    // 4. Atomic transaction: persist notifications AND update reminder tracking state together.
    // If either fails, both roll back so notifications are never lost or prematurely marked delivered.
    await database.transaction(
      "rw",
      [database.reminders, database.notifications],
      async () => {
        await database.notifications.bulkPut(notificationsToPersist);

        for (const [remId, latestOccDate] of latestOccurrenceByReminder.entries()) {
          await database.reminders.update(remId, {
            notifiedAt: nowIso,
            lastNotifiedOccurrenceDate: latestOccDate,
          });
        }
      }
    );

    // 5. Sync committed notifications to in-memory Zustand store
    useNotificationStore
      .getState()
      .receivePersistedNotifications(notificationsToPersist);

    // 6. Dispatch native browser notifications when permitted and app is backgrounded
    if (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      for (const { notification, event, label } of toDeliver) {
        try {
          new Notification(
            notification.isMissed ? `Missed: ${event.title}` : event.title,
            {
              body: `${event.isAllDay ? "All Day" : event.startTime} • ${
                label || "Event Reminder"
              }`,
              icon: "/favicon.ico",
            }
          );
        } catch {
          // Browser notification blocked or unsupported in environment; persistent in-app notification still succeeded
        }
      }
    }

    return notificationsToPersist;
  } catch (err) {
    console.error("Error checking reminders:", err);
    if (options.rethrowOnError) {
      throw err;
    }
    return [];
  }
}

/**
 * Acknowledges a reminder, recording the user's explicit action timestamp.
 */
export async function acknowledgeReminder(
  reminderId: string,
  database: OrbitDatabase = defaultDb
): Promise<void> {
  try {
    await database.reminders.update(reminderId, {
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to acknowledge reminder:", err);
  }
}

/**
 * Requests browser notification permission safely.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
