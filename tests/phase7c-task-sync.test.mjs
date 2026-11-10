import test from "node:test";
import assert from "node:assert/strict";

import {
  saveTaskWithSync,
  deleteTaskWithCascade,
  toggleTaskCompletionWithSync,
} from "../src/lib/services/task-sync-service.ts";

/**
 * Creates an in-memory mock database conforming to Dexie's API for tasks,
 * events, and reminders tables, supporting atomic transactions and rollbacks.
 */
function createMockSyncDatabase(initialData = {}) {
  const tables = {
    tasks: new Map(),
    events: new Map(),
    reminders: new Map(),
  };

  // Seed initial data
  if (initialData.tasks) {
    for (const t of initialData.tasks) {
      tables.tasks.set(t.id, JSON.parse(JSON.stringify(t)));
    }
  }
  if (initialData.events) {
    for (const e of initialData.events) {
      tables.events.set(e.id, JSON.parse(JSON.stringify(e)));
    }
  }
  if (initialData.reminders) {
    for (const r of initialData.reminders) {
      tables.reminders.set(r.id, JSON.parse(JSON.stringify(r)));
    }
  }

  // Fault injection flags
  const faults = {
    failTasksAdd: false,
    failTasksPut: false,
    failTasksDelete: false,
    failEventsAdd: false,
    failEventsUpdate: false,
    failEventsDelete: false,
    failRemindersAdd: false,
    failRemindersDelete: false,
  };

  const mockDb = {
    tasks: {
      async add(item) {
        if (faults.failTasksAdd) throw new Error("Simulated failure on tasks.add");
        tables.tasks.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async put(item) {
        if (faults.failTasksPut) throw new Error("Simulated failure on tasks.put");
        tables.tasks.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async update(id, changes) {
        const existing = tables.tasks.get(id);
        if (existing) {
          tables.tasks.set(id, { ...existing, ...JSON.parse(JSON.stringify(changes)) });
        }
      },
      async delete(id) {
        if (faults.failTasksDelete) throw new Error("Simulated failure on tasks.delete");
        tables.tasks.delete(id);
      },
      async toArray() {
        return Array.from(tables.tasks.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      async get(id) {
        const val = tables.tasks.get(id);
        return val ? JSON.parse(JSON.stringify(val)) : undefined;
      },
    },

    events: {
      async add(item) {
        if (faults.failEventsAdd) throw new Error("Simulated failure on events.add");
        tables.events.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async update(id, changes) {
        if (faults.failEventsUpdate) throw new Error("Simulated failure on events.update");
        const existing = tables.events.get(id);
        if (existing) {
          tables.events.set(id, { ...existing, ...JSON.parse(JSON.stringify(changes)) });
        }
      },
      async delete(id) {
        if (faults.failEventsDelete) throw new Error("Simulated failure on events.delete");
        tables.events.delete(id);
      },
      async toArray() {
        return Array.from(tables.events.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      async get(id) {
        const val = tables.events.get(id);
        return val ? JSON.parse(JSON.stringify(val)) : undefined;
      },
      filter(predicate) {
        return {
          async toArray() {
            const all = Array.from(tables.events.values());
            return all.filter(predicate).map((v) => JSON.parse(JSON.stringify(v)));
          },
        };
      },
    },

    reminders: {
      async add(item) {
        if (faults.failRemindersAdd) throw new Error("Simulated failure on reminders.add");
        tables.reminders.set(item.id, JSON.parse(JSON.stringify(item)));
        return item.id;
      },
      async update(id, changes) {
        const existing = tables.reminders.get(id);
        if (existing) {
          tables.reminders.set(id, { ...existing, ...changes });
        }
      },
      async delete(id) {
        if (faults.failRemindersDelete) throw new Error("Simulated failure on reminders.delete");
        tables.reminders.delete(id);
      },
      async toArray() {
        return Array.from(tables.reminders.values()).map((v) => JSON.parse(JSON.stringify(v)));
      },
      where(field) {
        return {
          equals(val) {
            return {
              async toArray() {
                const results = [];
                for (const r of tables.reminders.values()) {
                  if (r[field] === val) {
                    results.push(JSON.parse(JSON.stringify(r)));
                  }
                }
                return results;
              },
              async delete() {
                if (faults.failRemindersDelete) throw new Error("Simulated failure on reminders.where.delete");
                let count = 0;
                for (const [k, v] of tables.reminders.entries()) {
                  if (v[field] === val) {
                    tables.reminders.delete(k);
                    count++;
                  }
                }
                return count;
              },
            };
          },
          anyOf(vals) {
            const valSet = new Set(vals);
            return {
              async delete() {
                if (faults.failRemindersDelete) throw new Error("Simulated failure on reminders.where.anyOf.delete");
                let count = 0;
                for (const [k, v] of tables.reminders.entries()) {
                  if (valSet.has(v[field])) {
                    tables.reminders.delete(k);
                    count++;
                  }
                }
                return count;
              },
              async modify(changes) {
                let count = 0;
                for (const [k, v] of tables.reminders.entries()) {
                  if (valSet.has(v[field])) {
                    tables.reminders.set(k, { ...v, ...changes });
                    count++;
                  }
                }
                return count;
              },
            };
          },
        };
      },
    },

    async transaction(mode, tableList, txFunc) {
      // Snapshot state for atomic rollback
      const snapshot = {
        tasks: new Map(tables.tasks),
        events: new Map(tables.events),
        reminders: new Map(tables.reminders),
      };

      try {
        await txFunc();
      } catch (err) {
        // Rollback all tables to pre-transaction state
        tables.tasks.clear();
        for (const [k, v] of snapshot.tasks.entries()) tables.tasks.set(k, v);
        tables.events.clear();
        for (const [k, v] of snapshot.events.entries()) tables.events.set(k, v);
        tables.reminders.clear();
        for (const [k, v] of snapshot.reminders.entries()) tables.reminders.set(k, v);
        throw err;
      }
    },
  };

  return { mockDb, tables, faults };
}

// ---------------------------------------------------------------------------
// 1. Creating a Task with a Due Date and Time
// ---------------------------------------------------------------------------
test("Phase 7C — Creating a task with due date & time creates linked event and reminder", async () => {
  const { mockDb, tables } = createMockSyncDatabase();

  const task = await saveTaskWithSync({
    taskData: {
      title: "File Quarterly Taxes",
      notes: "Prepare invoices and deductions",
      category: "task",
      priority: "high",
      dueDate: "2026-11-20",
      dueTime: "14:30",
    },
    database: mockDb,
  });

  assert.equal(tables.tasks.size, 1);
  assert.equal(tables.events.size, 1);
  assert.equal(tables.reminders.size, 1);

  // Verify task stored
  assert.equal(task.title, "File Quarterly Taxes");
  assert.equal(task.dueDate, "2026-11-20");
  assert.equal(task.dueTime, "14:30");

  // Verify linked event
  const event = Array.from(tables.events.values())[0];
  assert.equal(event.sourceItemId, task.id, "Event sourceItemId must match task.id");
  assert.equal(event.title, "File Quarterly Taxes");
  assert.equal(event.date, "2026-11-20");
  assert.equal(event.startTime, "14:30");
  assert.equal(event.isAllDay, false);
  assert.equal(event.type, "general");

  // Verify linked reminder
  const reminder = Array.from(tables.reminders.values())[0];
  assert.equal(reminder.eventId, event.id, "Reminder eventId must match linked event.id");
  assert.equal(reminder.timing.type, "at_time");
  assert.equal(reminder.isActive, true);
});

// ---------------------------------------------------------------------------
// 2. Updating an Existing Task's Title
// ---------------------------------------------------------------------------
test("Phase 7C — Updating an existing task's title synchronizes with linked event", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Draft Proposal",
        category: "task",
        priority: "medium",
        status: "todo",
        dueDate: "2026-11-25",
        sortOrder: 0,
        tags: ["task"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Draft Proposal",
        notes: "",
        type: "general",
        date: "2026-11-25",
        isAllDay: true,
        recurrence: { rule: "none" },
        sourceItemId: taskId,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  // Update task title
  await saveTaskWithSync({
    taskData: {
      id: taskId,
      title: "Draft Final Architecture Proposal",
      dueDate: "2026-11-25",
    },
    isEditing: true,
    database: mockDb,
  });

  const updatedTask = tables.tasks.get(taskId);
  assert.equal(updatedTask.title, "Draft Final Architecture Proposal");

  const updatedEvent = tables.events.get(eventId);
  assert.ok(updatedEvent);
  assert.equal(updatedEvent.title, "Draft Final Architecture Proposal");
  assert.equal(updatedEvent.date, "2026-11-25");
});

// ---------------------------------------------------------------------------
// 3. Changing Task Due Date and Time
// ---------------------------------------------------------------------------
test("Phase 7C — Changing task due date and time updates event and resets reminder", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Dentist Appointment",
        category: "task",
        priority: "medium",
        status: "todo",
        dueDate: "2026-11-15",
        dueTime: "10:00",
        sortOrder: 0,
        tags: ["task"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Dentist Appointment",
        notes: "",
        type: "general",
        date: "2026-11-15",
        startTime: "10:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        sourceItemId: taskId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminderId,
        eventId,
        timing: { type: "at_time" },
        lastNotifiedOccurrenceDate: "2026-11-15",
        notifiedAt: now,
        isActive: true,
        createdAt: now,
      },
    ],
  });

  // Reschedule to 2026-11-22 at 15:00
  await saveTaskWithSync({
    taskData: {
      id: taskId,
      title: "Dentist Appointment",
      dueDate: "2026-11-22",
      dueTime: "15:00",
    },
    isEditing: true,
    database: mockDb,
  });

  const event = tables.events.get(eventId);
  assert.equal(event.date, "2026-11-22");
  assert.equal(event.startTime, "15:00");
  assert.equal(event.isAllDay, false);

  const reminder = tables.reminders.get(reminderId);
  assert.equal(reminder.lastNotifiedOccurrenceDate, undefined, "Notified date must be reset on reschedule");
  assert.equal(reminder.notifiedAt, undefined);
  assert.equal(reminder.isActive, true);
});

// ---------------------------------------------------------------------------
// 4. Removing Due Date Cleans Up Linked Event & Reminder
// ---------------------------------------------------------------------------
test("Phase 7C — Removing due date removes linked event and reminder", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Backlog Item",
        category: "task",
        priority: "low",
        status: "todo",
        dueDate: "2026-11-12",
        dueTime: "09:00",
        sortOrder: 0,
        tags: ["task"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Backlog Item",
        notes: "",
        type: "general",
        date: "2026-11-12",
        startTime: "09:00",
        isAllDay: false,
        recurrence: { rule: "none" },
        sourceItemId: taskId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminderId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
    ],
  });

  assert.equal(tables.events.size, 1);
  assert.equal(tables.reminders.size, 1);

  // Edit task to remove due date
  await saveTaskWithSync({
    taskData: {
      id: taskId,
      title: "Backlog Item",
      dueDate: undefined,
      dueTime: undefined,
    },
    isEditing: true,
    database: mockDb,
  });

  const updatedTask = tables.tasks.get(taskId);
  assert.equal(updatedTask.dueDate, undefined);
  assert.equal(updatedTask.dueTime, undefined);

  // Event and reminder must be completely removed
  assert.equal(tables.events.size, 0, "Linked event must be removed when due date is cleared");
  assert.equal(tables.reminders.size, 0, "Linked reminder must be removed when due date is cleared");
});

// ---------------------------------------------------------------------------
// 5. Deleting a Task with Linked Events and Reminders
// ---------------------------------------------------------------------------
test("Phase 7C — Deleting a task deletes linked events and reminders atomically", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Task to Delete",
        category: "task",
        priority: "medium",
        status: "todo",
        dueDate: "2026-11-18",
        sortOrder: 0,
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Task to Delete",
        date: "2026-11-18",
        isAllDay: true,
        recurrence: { rule: "none" },
        sourceItemId: taskId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminderId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
    ],
  });

  assert.equal(tables.tasks.size, 1);
  assert.equal(tables.events.size, 1);
  assert.equal(tables.reminders.size, 1);

  await deleteTaskWithCascade(taskId, mockDb);

  assert.equal(tables.tasks.size, 0, "Task must be deleted");
  assert.equal(tables.events.size, 0, "Linked event must be deleted");
  assert.equal(tables.reminders.size, 0, "Linked reminder must be deleted");
});

// ---------------------------------------------------------------------------
// 6. Deleting a Task Without Linked Events
// ---------------------------------------------------------------------------
test("Phase 7C — Deleting a task without linked events succeeds cleanly", async () => {
  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Simple Task",
        category: "task",
        priority: "low",
        status: "todo",
        sortOrder: 0,
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  assert.equal(tables.tasks.size, 1);

  await deleteTaskWithCascade(taskId, mockDb);

  assert.equal(tables.tasks.size, 0, "Task must be deleted");
  assert.equal(tables.events.size, 0);
  assert.equal(tables.reminders.size, 0);
});

// ---------------------------------------------------------------------------
// 7. Preserving Unrelated Events and Reminders
// ---------------------------------------------------------------------------
test("Phase 7C — Preserves unrelated calendar events and reminders", async () => {
  const task1Id = crypto.randomUUID();
  const event1Id = crypto.randomUUID();
  const reminder1Id = crypto.randomUUID();

  const task2Id = crypto.randomUUID();
  const event2Id = crypto.randomUUID();
  const reminder2Id = crypto.randomUUID();

  const standaloneEventId = crypto.randomUUID();
  const standaloneReminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: task1Id,
        title: "Target Task",
        category: "task",
        status: "todo",
        dueDate: "2026-11-10",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: task2Id,
        title: "Other Task",
        category: "task",
        status: "todo",
        dueDate: "2026-11-12",
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: event1Id,
        title: "Target Task",
        date: "2026-11-10",
        sourceItemId: task1Id,
        isAllDay: true,
        recurrence: { rule: "none" },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: event2Id,
        title: "Other Task",
        date: "2026-11-12",
        sourceItemId: task2Id,
        isAllDay: true,
        recurrence: { rule: "none" },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: standaloneEventId,
        title: "Dentist Standing Appointment",
        date: "2026-11-30",
        isAllDay: false,
        recurrence: { rule: "none" },
        // No sourceItemId: user-created calendar event
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminder1Id,
        eventId: event1Id,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
      {
        id: reminder2Id,
        eventId: event2Id,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
      {
        id: standaloneReminderId,
        eventId: standaloneEventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
    ],
  });

  // Delete only task 1
  await deleteTaskWithCascade(task1Id, mockDb);

  // Assert task 1 and its items are gone
  assert.equal(tables.tasks.get(task1Id), undefined);
  assert.equal(tables.events.get(event1Id), undefined);
  assert.equal(tables.reminders.get(reminder1Id), undefined);

  // Assert task 2 and its items are 100% INTACT
  assert.ok(tables.tasks.get(task2Id), "Task 2 must be preserved");
  assert.ok(tables.events.get(event2Id), "Event 2 must be preserved");
  assert.ok(tables.reminders.get(reminder2Id), "Reminder 2 must be preserved");

  // Assert standalone calendar event and reminder are 100% INTACT
  assert.ok(tables.events.get(standaloneEventId), "Standalone calendar event must be preserved");
  assert.ok(tables.reminders.get(standaloneReminderId), "Standalone reminder must be preserved");
});

// ---------------------------------------------------------------------------
// 8. Preventing Duplicate Events on Multiple Saves / Edits
// ---------------------------------------------------------------------------
test("Phase 7C — Prevents duplicate events across multiple saves", async () => {
  const { mockDb, tables } = createMockSyncDatabase();

  const task = await saveTaskWithSync({
    taskData: {
      title: "Write Release Notes",
      category: "task",
      dueDate: "2026-11-19",
      dueTime: "11:00",
    },
    database: mockDb,
  });

  assert.equal(tables.events.size, 1);
  assert.equal(tables.reminders.size, 1);

  // Edit the task again without changing dueDate
  await saveTaskWithSync({
    taskData: {
      id: task.id,
      title: "Write Release Notes (v2.0)",
      category: "task",
      dueDate: "2026-11-19",
      dueTime: "11:00",
    },
    isEditing: true,
    database: mockDb,
  });

  assert.equal(tables.events.size, 1, "Must maintain exactly 1 event; no duplicates created");
  assert.equal(tables.reminders.size, 1, "Must maintain exactly 1 reminder; no duplicates created");

  const event = Array.from(tables.events.values())[0];
  assert.equal(event.title, "Write Release Notes (v2.0)");
});

// ---------------------------------------------------------------------------
// 9. Transaction Rollback After Simulated Failures
// ---------------------------------------------------------------------------
test("Phase 7C — Deletion rolls back all changes if task deletion fails", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables, faults } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Important Task",
        category: "task",
        dueDate: "2026-11-18",
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Important Task",
        date: "2026-11-18",
        sourceItemId: taskId,
        isAllDay: true,
        recurrence: { rule: "none" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminderId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
    ],
  });

  // Inject failure on tasks.delete
  faults.failTasksDelete = true;

  await assert.rejects(
    async () => {
      await deleteTaskWithCascade(taskId, mockDb);
    },
    /Simulated failure on tasks.delete/
  );

  // Verify all records are still present due to rollback!
  assert.equal(tables.tasks.size, 1, "Task must remain on rollback");
  assert.equal(tables.events.size, 1, "Event must remain on rollback");
  assert.equal(tables.reminders.size, 1, "Reminder must remain on rollback");
});

// ---------------------------------------------------------------------------
// 10. Toggling Task Completion Synchronizes Reminder Active State
// ---------------------------------------------------------------------------
test("Phase 7C — Toggling task completion updates status and deactivates/reactivates reminders", async () => {
  const taskId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { mockDb, tables } = createMockSyncDatabase({
    tasks: [
      {
        id: taskId,
        title: "Review PR",
        category: "task",
        status: "todo",
        dueDate: "2026-11-10",
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: eventId,
        title: "Review PR",
        date: "2026-11-10",
        sourceItemId: taskId,
        isAllDay: true,
        recurrence: { rule: "none" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: reminderId,
        eventId,
        timing: { type: "at_time" },
        isActive: true,
        createdAt: now,
      },
    ],
  });

  const task = tables.tasks.get(taskId);

  // 1. Mark completed
  const completedTask = await toggleTaskCompletionWithSync(task, mockDb);
  assert.equal(completedTask.status, "completed");
  assert.ok(completedTask.completedAt);

  // Reminder must now be deactivated
  const deactivatedReminder = tables.reminders.get(reminderId);
  assert.equal(deactivatedReminder.isActive, false, "Reminder must be deactivated when task completed");

  // 2. Re-open task (mark todo)
  const reopenedTask = await toggleTaskCompletionWithSync(completedTask, mockDb);
  assert.equal(reopenedTask.status, "todo");
  assert.equal(reopenedTask.completedAt, undefined);

  // Reminder must now be reactivated
  const reactivatedReminder = tables.reminders.get(reminderId);
  assert.equal(reactivatedReminder.isActive, true, "Reminder must be reactivated when task reopened");
});
