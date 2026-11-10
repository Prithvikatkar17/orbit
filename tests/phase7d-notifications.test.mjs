import test from "node:test";
import assert from "node:assert/strict";

import { checkDueReminders, acknowledgeReminder } from "../src/lib/services/reminder-service.ts";
import { useNotificationStore } from "../src/lib/stores/notification-store.ts";
import { BackupPayloadSchema } from "../src/lib/schemas/backup.ts";

/**
 * Helper to create a clean local timestamp (YYYY-MM-DDTHH:mm:ss local time)
 */
function localTimeMs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/**
 * In-memory mock Dexie database supporting events, reminders, notifications,
 * indexed lookups, query instrumentation, and atomic transaction rollbacks.
 */
function createMockNotificationDatabase(initialData = {}) {
  const tables = {
    events: new Map(),
    reminders: new Map(),
    notifications: new Map(),
  };

  const queryCalls = {
    eventsWhereAnyOfIds: [],
    notificationsWhereAnyOfIds: [],
    remindersFilterCalled: false,
  };

  const faults = {
    failNotificationsBulkPut: false,
    failRemindersUpdate: false,
  };

  if (initialData.events) {
    for (const ev of initialData.events) {
      tables.events.set(ev.id, JSON.parse(JSON.stringify(ev)));
    }
  }
  if (initialData.reminders) {
    for (const rem of initialData.reminders) {
      tables.reminders.set(rem.id, JSON.parse(JSON.stringify(rem)));
    }
  }
  if (initialData.notifications) {
    for (const n of initialData.notifications) {
      tables.notifications.set(n.id, JSON.parse(JSON.stringify(n)));
    }
  }

  const mockDb = {
    events: {
      async toArray() {
        return Array.from(tables.events.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      where(field) {
        return {
          anyOf(vals) {
            if (field === "id") {
              queryCalls.eventsWhereAnyOfIds.push([...vals]);
            }
            const valSet = new Set(vals);
            return {
              async toArray() {
                const results = [];
                for (const ev of tables.events.values()) {
                  if (valSet.has(ev[field])) {
                    results.push(JSON.parse(JSON.stringify(ev)));
                  }
                }
                return results;
              },
            };
          },
        };
      },
    },

    reminders: {
      async toArray() {
        return Array.from(tables.reminders.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      filter() {
        queryCalls.remindersFilterCalled = true;
        throw new Error("Unexpected unindexed .filter() scan on reminders");
      },
      async update(id, changes) {
        if (faults.failRemindersUpdate) {
          throw new Error("Simulated failure updating reminders");
        }
        const existing = tables.reminders.get(id);
        if (existing) {
          tables.reminders.set(id, { ...existing, ...changes });
          return 1;
        }
        return 0;
      },
    },

    notifications: {
      async toArray() {
        return Array.from(tables.notifications.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      async get(id) {
        const val = tables.notifications.get(id);
        return val ? JSON.parse(JSON.stringify(val)) : undefined;
      },
      async put(item) {
        tables.notifications.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async bulkPut(items) {
        if (faults.failNotificationsBulkPut) {
          throw new Error("Simulated failure in notifications.bulkPut");
        }
        for (const item of items) {
          tables.notifications.set(item.id, JSON.parse(JSON.stringify(item)));
        }
      },
      async update(id, changes) {
        const existing = tables.notifications.get(id);
        if (existing) {
          tables.notifications.set(id, { ...existing, ...changes });
          return 1;
        }
        return 0;
      },
      async delete(id) {
        tables.notifications.delete(id);
      },
      async clear() {
        tables.notifications.clear();
      },
      where(field) {
        return {
          anyOf(vals) {
            if (field === "id") {
              queryCalls.notificationsWhereAnyOfIds.push([...vals]);
            }
            const valSet = new Set(vals);
            return {
              async toArray() {
                const results = [];
                for (const n of tables.notifications.values()) {
                  if (valSet.has(n[field])) {
                    results.push(JSON.parse(JSON.stringify(n)));
                  }
                }
                return results;
              },
            };
          },
        };
      },
    },

    async transaction(mode, tableList, txFunc) {
      const snapshot = {
        events: new Map(tables.events),
        reminders: new Map(tables.reminders),
        notifications: new Map(tables.notifications),
      };
      try {
        await txFunc();
      } catch (err) {
        tables.events.clear();
        for (const [k, v] of snapshot.events.entries()) tables.events.set(k, v);
        tables.reminders.clear();
        for (const [k, v] of snapshot.reminders.entries()) tables.reminders.set(k, v);
        tables.notifications.clear();
        for (const [k, v] of snapshot.notifications.entries()) tables.notifications.set(k, v);
        throw err;
      }
    },
  };

  return { mockDb, tables, queryCalls, faults };
}

function resetInMemoryNotificationStore() {
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
    isHydrated: false,
  });
}

// ---------------------------------------------------------------------------
// 1. Indexed Reminder Query Behavior & Active Boolean Handling
// ---------------------------------------------------------------------------
test("Phase 7D — Uses indexed queries on events/notifications and filters boolean isActive cleanly", async () => {
  resetInMemoryNotificationStore();
  const activeEventId = crypto.randomUUID();
  const inactiveEventId = crypto.randomUUID();
  const unrelatedEventId = crypto.randomUUID();
  const nowStr = "2026-11-10";
  const nowIso = new Date().toISOString();

  const { mockDb, tables, queryCalls } = createMockNotificationDatabase({
    events: [
      {
        id: activeEventId,
        title: "Active Task Alert",
        type: "general",
        date: nowStr,
        startTime: "10:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: inactiveEventId,
        title: "Paused Alert",
        type: "general",
        date: nowStr,
        startTime: "10:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: unrelatedEventId,
        title: "No Reminder Event",
        type: "general",
        date: nowStr,
        startTime: "10:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: crypto.randomUUID(),
        eventId: activeEventId,
        timing: { type: "at_time" },
        isActive: true, // Stored as JS boolean
        createdAt: nowIso,
      },
      {
        id: crypto.randomUUID(),
        eventId: inactiveEventId,
        timing: { type: "at_time" },
        isActive: false, // Inactive boolean
        createdAt: nowIso,
      },
    ],
  });

  const delivered = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(nowStr, "10:05"),
  });

  assert.equal(queryCalls.remindersFilterCalled, false, "Should not use cursor .filter() scan");
  assert.equal(queryCalls.eventsWhereAnyOfIds.length, 1);
  assert.deepEqual(
    queryCalls.eventsWhereAnyOfIds[0],
    [activeEventId],
    "Should only batch-query events belonging to active reminders"
  );
  assert.equal(queryCalls.notificationsWhereAnyOfIds.length, 1, "Should use indexed lookup for notification dedup");
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].eventTitle, "Active Task Alert");
  assert.equal(tables.notifications.size, 1);
});

// ---------------------------------------------------------------------------
// 2. Notification Persistence After Store Reload (Simulated Browser Refresh)
// ---------------------------------------------------------------------------
test("Phase 7D — Unread notifications survive store reload / browser refresh", async () => {
  resetInMemoryNotificationStore();
  const eventId = crypto.randomUUID();
  const remId = crypto.randomUUID();
  const dateStr = "2026-11-10";
  const nowIso = new Date().toISOString();

  const { mockDb } = createMockNotificationDatabase({
    events: [
      {
        id: eventId,
        title: "Team Standup",
        type: "meeting",
        date: dateStr,
        startTime: "09:30",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: remId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: nowIso,
      },
    ],
  });

  // Trigger reminder
  await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "09:32"),
  });

  assert.equal(useNotificationStore.getState().notifications.length, 1);
  assert.equal(useNotificationStore.getState().unreadCount, 1);

  // Simulate full browser page refresh wiping all in-memory Zustand state
  resetInMemoryNotificationStore();
  assert.equal(useNotificationStore.getState().notifications.length, 0);
  assert.equal(useNotificationStore.getState().unreadCount, 0);

  // App mounts and hydrates from Dexie
  await useNotificationStore.getState().hydrateNotifications(mockDb);

  const hydratedState = useNotificationStore.getState();
  assert.equal(hydratedState.isHydrated, true);
  assert.equal(hydratedState.notifications.length, 1);
  assert.equal(hydratedState.unreadCount, 1);
  assert.equal(hydratedState.notifications[0].eventTitle, "Team Standup");
  assert.equal(hydratedState.notifications[0].read, false);
});

// ---------------------------------------------------------------------------
// 3. Mark-as-Read, Mark-All-Read, Dismiss, and Clear Operations
// ---------------------------------------------------------------------------
test("Phase 7D — Mark-as-read, mark-all-read, dismiss, and clear persist across reloads", async () => {
  resetInMemoryNotificationStore();
  const { mockDb, tables } = createMockNotificationDatabase();

  const n1 = {
    id: "notif-1",
    reminderId: "rem-1",
    eventId: "ev-1",
    eventTitle: "First Alert",
    eventType: "general",
    occurrenceDate: "2026-11-10",
    scheduledTime: "10:00",
    isMissed: false,
    deliveredAt: "2026-11-10T10:00:00.000Z",
    read: false,
  };
  const n2 = {
    id: "notif-2",
    reminderId: "rem-2",
    eventId: "ev-2",
    eventTitle: "Second Alert",
    eventType: "deadline",
    occurrenceDate: "2026-11-10",
    scheduledTime: "11:00",
    isMissed: false,
    deliveredAt: "2026-11-10T11:00:00.000Z",
    read: false,
  };

  await useNotificationStore.getState().addNotification(n1, mockDb);
  await useNotificationStore.getState().addNotification(n2, mockDb);
  assert.equal(useNotificationStore.getState().unreadCount, 2);
  assert.equal(tables.notifications.size, 2);

  // Mark one as read
  await useNotificationStore.getState().markAsRead("notif-1", mockDb);
  assert.equal(useNotificationStore.getState().unreadCount, 1);

  // Simulate reload and verify read state persisted
  resetInMemoryNotificationStore();
  await useNotificationStore.getState().hydrateNotifications(mockDb);
  assert.equal(useNotificationStore.getState().unreadCount, 1);
  assert.equal(
    useNotificationStore.getState().notifications.find((n) => n.id === "notif-1")?.read,
    true
  );
  assert.equal(
    useNotificationStore.getState().notifications.find((n) => n.id === "notif-2")?.read,
    false
  );

  // Mark all read
  await useNotificationStore.getState().markAllAsRead(mockDb);
  assert.equal(useNotificationStore.getState().unreadCount, 0);
  assert.equal(tables.notifications.get("notif-2")?.read, true);

  // Dismiss single notification
  await useNotificationStore.getState().dismissNotification("notif-1", mockDb);
  assert.equal(useNotificationStore.getState().notifications.length, 1);
  assert.equal(tables.notifications.size, 1);

  // Clear all
  await useNotificationStore.getState().clearAll(mockDb);
  assert.equal(useNotificationStore.getState().notifications.length, 0);
  assert.equal(useNotificationStore.getState().unreadCount, 0);
  assert.equal(tables.notifications.size, 0);
});

// ---------------------------------------------------------------------------
// 4. Duplicate Prevention Across Repeated Polls
// ---------------------------------------------------------------------------
test("Phase 7D — Prevents duplicate notifications across repeated polls", async () => {
  resetInMemoryNotificationStore();
  const eventId = crypto.randomUUID();
  const remId = crypto.randomUUID();
  const dateStr = "2026-11-10";
  const nowIso = new Date().toISOString();

  const { mockDb, tables } = createMockNotificationDatabase({
    events: [
      {
        id: eventId,
        title: "Medication Reminder",
        type: "personal",
        date: dateStr,
        startTime: "08:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: remId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: nowIso,
      },
    ],
  });

  // Poll 1: triggers
  const firstBatch = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "08:01"),
  });
  assert.equal(firstBatch.length, 1);
  assert.equal(tables.notifications.size, 1);

  // Poll 2 (30 seconds later): skips
  const secondBatch = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "08:01") + 30_000,
  });
  assert.equal(secondBatch.length, 0);
  assert.equal(tables.notifications.size, 1);

  // Poll 3 (even if reminder tracking were reset externally, primary-key dedup blocks duplicates)
  await mockDb.reminders.update(remId, { lastNotifiedOccurrenceDate: undefined });
  const thirdBatch = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "08:02"),
  });
  assert.equal(thirdBatch.length, 0, "Existing persisted notification ID prevents duplicate delivery");
  assert.equal(tables.notifications.size, 1);
});

// ---------------------------------------------------------------------------
// 5. Atomic Rollback When Notification or Reminder Writes Fail
// ---------------------------------------------------------------------------
test("Phase 7D — Rolls back atomically on failure and recovers on next poll without losing notification", async () => {
  resetInMemoryNotificationStore();
  const eventId = crypto.randomUUID();
  const remId = crypto.randomUUID();
  const dateStr = "2026-11-10";
  const nowIso = new Date().toISOString();

  const { mockDb, tables, faults } = createMockNotificationDatabase({
    events: [
      {
        id: eventId,
        title: "Critical Deadline",
        type: "deadline",
        date: dateStr,
        startTime: "17:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: remId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: nowIso,
      },
    ],
  });

  // Inject fault on reminder state update (happens after notifications.bulkPut inside tx)
  faults.failRemindersUpdate = true;

  await assert.rejects(
    async () => {
      await checkDueReminders({
        database: mockDb,
        nowMs: localTimeMs(dateStr, "17:01"),
        rethrowOnError: true,
      });
    },
    /Simulated failure updating reminders/
  );

  // Both notifications table and reminder state must have rolled back!
  assert.equal(tables.notifications.size, 0, "Notification insert must roll back on failure");
  assert.equal(
    tables.reminders.get(remId)?.lastNotifiedOccurrenceDate,
    undefined,
    "lastNotifiedOccurrenceDate must not advance when transaction fails"
  );
  assert.equal(useNotificationStore.getState().notifications.length, 0, "Store must remain untouched");

  // Recover: clear fault and run next poll
  faults.failRemindersUpdate = false;
  const recovered = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "17:02"),
  });

  assert.equal(recovered.length, 1, "Notification must recover cleanly without being lost");
  assert.equal(tables.notifications.size, 1);
  assert.equal(tables.reminders.get(remId)?.lastNotifiedOccurrenceDate, dateStr);
  assert.equal(useNotificationStore.getState().notifications.length, 1);
});

// ---------------------------------------------------------------------------
// 6. Recurring Reminder Behavior Across Days
// ---------------------------------------------------------------------------
test("Phase 7D — Recurring daily reminder triggers per occurrence date without looping older window dates", async () => {
  resetInMemoryNotificationStore();
  const eventId = crypto.randomUUID();
  const remId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const { mockDb, tables } = createMockNotificationDatabase({
    events: [
      {
        id: eventId,
        title: "Daily Stretch",
        type: "personal",
        date: "2026-11-08",
        startTime: "09:00",
        isAllDay: false,
        recurrence: { rule: "daily" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: remId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: nowIso,
      },
    ],
  });

  // Day 2 (2026-11-09 09:05): catches missed Day 1 (Nov 8) + Day 2 (Nov 9)
  const day2Deliveries = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs("2026-11-09", "09:05"),
  });

  assert.equal(day2Deliveries.length, 2);
  assert.equal(day2Deliveries[0].occurrenceDate, "2026-11-08");
  assert.equal(day2Deliveries[0].isMissed, true);
  assert.equal(day2Deliveries[1].occurrenceDate, "2026-11-09");
  assert.equal(day2Deliveries[1].isMissed, false);
  assert.equal(tables.reminders.get(remId)?.lastNotifiedOccurrenceDate, "2026-11-09");

  // Repeat poll 5 minutes later: must NOT re-trigger Nov 8 or Nov 9!
  const repeatPoll = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs("2026-11-09", "09:10"),
  });
  assert.equal(repeatPoll.length, 0);

  // Day 3 (2026-11-10 09:05): only Nov 10 triggers!
  const day3Deliveries = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs("2026-11-10", "09:05"),
  });
  assert.equal(day3Deliveries.length, 1);
  assert.equal(day3Deliveries[0].occurrenceDate, "2026-11-10");
  assert.equal(tables.reminders.get(remId)?.lastNotifiedOccurrenceDate, "2026-11-10");
  assert.equal(tables.notifications.size, 3);
});

// ---------------------------------------------------------------------------
// 7. Multiple Reminders Associated With One Event
// ---------------------------------------------------------------------------
test("Phase 7D — Handles multiple reminders associated with one event independently", async () => {
  resetInMemoryNotificationStore();
  const eventId = crypto.randomUUID();
  const remBeforeId = crypto.randomUUID();
  const remAtTimeId = crypto.randomUUID();
  const dateStr = "2026-11-10";
  const nowIso = new Date().toISOString();

  const { mockDb, tables } = createMockNotificationDatabase({
    events: [
      {
        id: eventId,
        title: "Board Presentation",
        type: "meeting",
        date: dateStr,
        startTime: "14:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    reminders: [
      {
        id: remBeforeId,
        eventId,
        timing: { type: "before", offsetMinutes: 30 }, // triggers 13:30
        label: "30 mins before",
        isActive: true,
        createdAt: nowIso,
      },
      {
        id: remAtTimeId,
        eventId,
        timing: { type: "at_time" }, // triggers 14:00
        label: "At time of event",
        isActive: true,
        createdAt: nowIso,
      },
    ],
  });

  // Check at 13:35 -> only "30 mins before" is due
  const firstWave = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "13:35"),
  });
  assert.equal(firstWave.length, 1);
  assert.equal(firstWave[0].reminderId, remBeforeId);
  assert.equal(tables.notifications.size, 1);

  // Check at 14:02 -> only "At time of event" is due now
  const secondWave = await checkDueReminders({
    database: mockDb,
    nowMs: localTimeMs(dateStr, "14:02"),
  });
  assert.equal(secondWave.length, 1);
  assert.equal(secondWave[0].reminderId, remAtTimeId);
  assert.equal(tables.notifications.size, 2);
  assert.equal(useNotificationStore.getState().unreadCount, 2);

  // Acknowledge one reminder
  await acknowledgeReminder(remBeforeId, mockDb);
  assert.ok(tables.reminders.get(remBeforeId)?.acknowledgedAt);
  assert.equal(tables.reminders.get(remAtTimeId)?.acknowledgedAt, undefined);
});

// ---------------------------------------------------------------------------
// 8. BackupPayloadSchema Compatibility with Notifications
// ---------------------------------------------------------------------------
test("Phase 7D — BackupPayloadSchema defaults notifications cleanly for backward compatibility", () => {
  const legacyPayload = {
    version: 2,
    exportedAt: "2026-11-08T00:00:00.000Z",
    items: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    reminders: [],
    libraryEntries: [],
    libraryCollections: [],
    libraryFiles: [],
    categories: [],
    settings: [],
  };

  const parsed = BackupPayloadSchema.parse(legacyPayload);
  assert.deepEqual(parsed.notifications, []);
});

