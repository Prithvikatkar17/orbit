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
    // Dynamically compute lookahead window from active reminders' max offset days
    // so 3-day and 7-day advance reminders (offsetMinutes: 4320 or 10080) fire on time.
    const maxOffsetDays = Math.max(
      2,
      ...activeReminders.map((r) =>
        Math.ceil(((r.timing as { offsetMinutes?: number }).offsetMinutes || 0) / 1440) + 1
      )
    );
    // Check past 7 days to maxOffsetDays ahead to catch missed reminders and early offsets
    const checkStartStr = getOffsetDateString(-7, parseLocalDate(todayStr));
    const checkEndStr = getOffsetDateString(maxOffsetDays, parseLocalDate(todayStr));

    // 2. Load user settings to respect defaultReminderTime and notificationsEnabled
    const userSettings = typeof database.settings?.get === "function"
      ? await database.settings.get("user_settings")
      : null;
    const defaultReminderTime = userSettings?.defaultReminderTime || "09:00";
    const notificationsEnabled = userSettings?.notificationsEnabled ?? true;

    // Batch-load only referenced events using primary key index
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

      // If reminder is snoozed until a future time, skip it until snoozedUntil has passed!
      const isSnoozed = Boolean(reminder.snoozedUntil);
      let snoozePassed = false;
      if (isSnoozed && reminder.snoozedUntil) {
        const snoozeMs = Date.parse(reminder.snoozedUntil);
        if (!isNaN(snoozeMs)) {
          if (snoozeMs > now) {
            continue; // Still snoozed, waiting for snooze target
          }
          snoozePassed = true; // Snooze target has arrived!
        }
      }

      // Fast path for non-recurring events already notified for their sole occurrence date
      if (
        !snoozePassed &&
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
          !snoozePassed &&
          reminder.lastNotifiedOccurrenceDate &&
          occ.occurrenceDate <= reminder.lastNotifiedOccurrenceDate
        ) {
          continue;
        }

        const triggerTimestamp = snoozePassed && reminder.snoozedUntil
          ? Date.parse(reminder.snoozedUntil)
          : calculateReminderTriggerTime(
              event,
              occ.occurrenceDate,
              reminder,
              defaultReminderTime
            );

        // If trigger time is still in the future, it is waiting
        if (triggerTimestamp > now) {
          continue;
        }

        // Trigger time is due (now or past). Determine if missed (> 15 minutes late)
        const isMissed = !snoozePassed && now - triggerTimestamp > 15 * 60 * 1000;
        const notificationId = snoozePassed && reminder.snoozedUntil
          ? `${reminder.id}-${occ.occurrenceDate}-snoozed-${Date.parse(reminder.snoozedUntil)}`
          : `${reminder.id}-${occ.occurrenceDate}`;

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
            snoozedUntil: undefined,
          });
        }
      }
    );

    // 5. Sync committed notifications to in-memory Zustand store
    useNotificationStore
      .getState()
      .receivePersistedNotifications(notificationsToPersist);

    // 6. Dispatch native browser notifications when permitted, enabled in settings, and app is backgrounded
    if (
      notificationsEnabled &&
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

export type SnoozePreset = "15m" | "1h" | "tomorrow_9am";

/**
 * Calculates target timestamp for snooze presets:
 * - 15m: Date.now() + 15m
 * - 1h: Date.now() + 1h
 * - tomorrow_9am: local tomorrow at 09:00:00
 */
export function calculateSnoozeTarget(
  preset: SnoozePreset,
  fromMs: number = Date.now()
): Date {
  if (preset === "15m") {
    return new Date(fromMs + 15 * 60 * 1000);
  }
  if (preset === "1h") {
    return new Date(fromMs + 60 * 60 * 1000);
  }
  // tomorrow_9am: local tomorrow at 09:00:00
  const d = new Date(fromMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9, 0, 0, 0);
}

export interface SnoozeReminderOptions {
  reminderId: string;
  notificationId?: string;
  preset?: SnoozePreset;
  targetDate?: Date;
  database?: OrbitDatabase;
}

/**
 * Snoozes a reminder alert:
 * 1. Dismisses the active notification immediately so it leaves the alert panel in 0ms.
 * 2. Persists snoozedUntil on the reminder in Dexie so runCheckDueReminders re-fires at the target time.
 */
export async function snoozeReminder(
  options: SnoozeReminderOptions
): Promise<Date> {
  const database = options.database || defaultDb;
  const target =
    options.targetDate || calculateSnoozeTarget(options.preset || "15m");
  const targetIso = target.toISOString();

  // 1. Dismiss active notification from store and db.notifications
  if (options.notificationId) {
    try {
      await useNotificationStore
        .getState()
        .dismissNotification(options.notificationId, database);
    } catch {
      try {
        await database.notifications.delete(options.notificationId);
      } catch {}
    }
  }

  // 2. Persist snoozedUntil on reminder
  await database.reminders.update(options.reminderId, {
    snoozedUntil: targetIso,
  });

  return target;
}
