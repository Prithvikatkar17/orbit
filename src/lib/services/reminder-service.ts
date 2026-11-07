import { db } from "../db/client";
import { type Event } from "../schemas/event";
import {
  getOccurrencesForEvent,
  calculateReminderTriggerTime,
} from "../utils/recurrence";
import {
  getLocalDateString,
  getOffsetDateString,
  parseLocalDate,
} from "../utils/dates";
import { useNotificationStore, type NotificationItem } from "../stores/notification-store";

export { calculateReminderTriggerTime };

/**
 * Checks all active reminders, calculates trigger times, delivers due notifications,
 * and tracks delivery state in IndexedDB.
 */
export async function checkDueReminders(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const activeReminders = await db.reminders
      .filter((r) => Boolean(r.isActive))
      .toArray();
    if (!activeReminders || activeReminders.length === 0) return;

    const now = Date.now();
    const todayStr = getLocalDateString();
    // Check past 7 days to tomorrow to catch missed reminders and early offsets
    const checkStartStr = getOffsetDateString(-7, parseLocalDate(todayStr));
    const checkEndStr = getOffsetDateString(2, parseLocalDate(todayStr));

    // Batch load events
    const eventIds = Array.from(new Set(activeReminders.map((r) => r.eventId)));
    const events = await db.events.where("id").anyOf(eventIds).toArray();
    const eventMap = new Map<string, Event>();
    for (const ev of events) {
      eventMap.set(ev.id, ev);
    }

    for (const reminder of activeReminders) {
      const event = eventMap.get(reminder.eventId);
      if (!event) continue;

      // Find occurrences within the check window
      const occurrences = getOccurrencesForEvent(event, checkStartStr, checkEndStr);

      for (const occ of occurrences) {
        // If already notified for this exact occurrence date, skip
        if (reminder.lastNotifiedOccurrenceDate === occ.occurrenceDate) {
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

        // Trigger time is in the past or right now
        // Determine if it was missed while app was closed (> 15 minutes late)
        const isMissed = now - triggerTimestamp > 15 * 60 * 1000;
        const notificationId = `${reminder.id}-${occ.occurrenceDate}`;

        const notificationItem: NotificationItem = {
          id: notificationId,
          reminderId: reminder.id,
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.type,
          occurrenceDate: occ.occurrenceDate,
          scheduledTime: event.isAllDay ? "All Day" : event.startTime || "09:00",
          isMissed,
          deliveredAt: new Date().toISOString(),
          read: false,
        };

        // Add to In-App Notification Store
        useNotificationStore.getState().addNotification(notificationItem);

        // Show native browser notification if permitted
        if (
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.visibilityState !== "visible"
        ) {
          try {
            new Notification(isMissed ? `Missed: ${event.title}` : event.title, {
              body: `${event.isAllDay ? "All Day" : event.startTime} • ${
                reminder.label || "Event Reminder"
              }`,
              icon: "/favicon.ico",
            });
          } catch {
            // Notification failed or blocked
          }
        }

        // Update reminder delivery timestamp in database (do NOT set acknowledgedAt)
        await db.reminders.update(reminder.id, {
          notifiedAt: new Date().toISOString(),
          lastNotifiedOccurrenceDate: occ.occurrenceDate,
        });
      }
    }
  } catch (err) {
    console.error("Error checking reminders:", err);
  }
}

/**
 * Acknowledges a reminder, recording the user's explicit action timestamp.
 */
export async function acknowledgeReminder(reminderId: string): Promise<void> {
  try {
    await db.reminders.update(reminderId, {
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to acknowledge reminder:", err);
  }
}

/**
 * Requests browser notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
}
