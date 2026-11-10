import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";
import { TaskSchema, type Task } from "../schemas/task.ts";
import { EventSchema } from "../schemas/event.ts";
import { ReminderSchema } from "../schemas/reminder.ts";
import { normalizeUrl } from "../utils/dates.ts";

export interface SaveTaskInput {
  taskData: {
    id?: string;
    title: string;
    notes?: string;
    link?: string;
    category?: string;
    priority?: Task["priority"];
    status?: Task["status"];
    dueDate?: string;
    dueTime?: string;
    completedAt?: string;
    sortOrder?: number;
    tags?: string[];
    sourceItemId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  isEditing?: boolean;
  database?: OrbitDatabase;
}

/**
 * Atomically validates and persists a task while synchronizing its linked calendar event
 * and reminder according to business rules:
 * - If dueDate is set: creates or updates a linked event (type='deadline' for goals, 'general' for tasks).
 * - If dueTime is set: creates or updates a reminder linked to the event.
 * - If dueDate is removed: cleans up linked events and reminders.
 * - Prevents duplicate linked events and reminders.
 * - Entire operation is atomic across tasks, events, and reminders tables.
 */
export async function saveTaskWithSync(
  options: SaveTaskInput
): Promise<Task> {
  const {
    taskData,
    isEditing = false,
    database = defaultDb,
  } = options;

  const nowIso = new Date().toISOString();
  const id = taskData.id || crypto.randomUUID();
  const cleanCategory = (taskData.category || "task").toLowerCase();

  // 1. Validate task metadata BEFORE initiating database transaction
  const validatedTask = TaskSchema.parse({
    id,
    title: taskData.title.trim(),
    notes: (taskData.notes || "").trim(),
    link: normalizeUrl(taskData.link),
    category: cleanCategory,
    priority: taskData.priority || "medium",
    status: taskData.status || "todo",
    dueDate: taskData.dueDate || undefined,
    dueTime: taskData.dueTime || undefined,
    completedAt:
      taskData.status === "completed"
        ? taskData.completedAt || nowIso
        : undefined,
    sortOrder: taskData.sortOrder ?? 0,
    tags: taskData.tags || [taskData.category || "task"],
    sourceItemId: taskData.sourceItemId || undefined,
    createdAt: taskData.createdAt || nowIso,
    updatedAt: nowIso,
  });

  // 2. Execute all mutations in an atomic read-write transaction
  await database.transaction(
    "rw",
    [database.tasks, database.events, database.reminders],
    async () => {
      if (isEditing) {
        await database.tasks.put(validatedTask);

        // Find existing events linked to this task
        const linkedEvents = await database.events
          .filter((e) => e.sourceItemId === validatedTask.id)
          .toArray();

        if (validatedTask.dueDate) {
          if (linkedEvents.length > 0) {
            // Update the primary linked event
            const primaryEvent = linkedEvents[0];
            await database.events.update(primaryEvent.id, {
              title: validatedTask.title,
              notes: validatedTask.notes,
              type:
                validatedTask.category === "goal"
                  ? "deadline"
                  : primaryEvent.type === "deadline" && validatedTask.category !== "goal"
                  ? "general"
                  : primaryEvent.type,
              date: validatedTask.dueDate,
              startTime: validatedTask.dueTime || undefined,
              isAllDay: !validatedTask.dueTime,
              updatedAt: nowIso,
            });

            // Clean up any extraneous duplicate linked events
            if (linkedEvents.length > 1) {
              for (const dup of linkedEvents.slice(1)) {
                await database.reminders.where("eventId").equals(dup.id).delete();
                await database.events.delete(dup.id);
              }
            }

            // Sync reminder for the primary event
            const existingReminders = await database.reminders
              .where("eventId")
              .equals(primaryEvent.id)
              .toArray();

            if (validatedTask.dueTime) {
              if (existingReminders.length > 0) {
                // Update primary reminder and clear past notified dates
                await database.reminders.update(existingReminders[0].id, {
                  lastNotifiedOccurrenceDate: undefined,
                  notifiedAt: undefined,
                  isActive: validatedTask.status !== "completed",
                });

                // Clean up any duplicate reminders on this event
                if (existingReminders.length > 1) {
                  for (const dupRem of existingReminders.slice(1)) {
                    await database.reminders.delete(dupRem.id);
                  }
                }
              } else {
                // Create reminder if none exists
                const newReminder = ReminderSchema.parse({
                  id: crypto.randomUUID(),
                  eventId: primaryEvent.id,
                  timing: { type: "at_time" },
                  label: "At time of event",
                  isActive: validatedTask.status !== "completed",
                  createdAt: nowIso,
                });
                await database.reminders.add(newReminder);
              }
            } else {
              // Task has no time: remove at_time reminders
              await database.reminders.where("eventId").equals(primaryEvent.id).delete();
            }
          } else {
            // Task previously had no linked event: create one now
            const eventId = crypto.randomUUID();
            const newEvent = EventSchema.parse({
              id: eventId,
              title: validatedTask.title,
              notes: validatedTask.notes,
              type: validatedTask.category === "goal" ? "deadline" : "general",
              date: validatedTask.dueDate,
              startTime: validatedTask.dueTime || undefined,
              isAllDay: !validatedTask.dueTime,
              recurrence: { rule: "none" },
              sourceItemId: validatedTask.id,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
            await database.events.add(newEvent);

            if (validatedTask.dueTime) {
              const newReminder = ReminderSchema.parse({
                id: crypto.randomUUID(),
                eventId,
                timing: { type: "at_time" },
                label: "At time of event",
                isActive: validatedTask.status !== "completed",
                createdAt: nowIso,
              });
              await database.reminders.add(newReminder);
            }
          }
        } else {
          // Task dueDate removed: clean up any linked events and reminders
          if (linkedEvents.length > 0) {
            const eventIds = linkedEvents.map((e) => e.id);
            await database.reminders.where("eventId").anyOf(eventIds).delete();
            for (const ev of linkedEvents) {
              await database.events.delete(ev.id);
            }
          }
        }
      } else {
        // Creating a new task
        await database.tasks.add(validatedTask);

        if (validatedTask.dueDate) {
          // Prevent duplicate events
          const existingEvents = await database.events
            .filter((e) => e.sourceItemId === validatedTask.id)
            .toArray();

          if (existingEvents.length === 0) {
            const eventId = crypto.randomUUID();
            const newEvent = EventSchema.parse({
              id: eventId,
              title: validatedTask.title,
              notes: validatedTask.notes,
              type: validatedTask.category === "goal" ? "deadline" : "general",
              date: validatedTask.dueDate,
              startTime: validatedTask.dueTime || undefined,
              isAllDay: !validatedTask.dueTime,
              recurrence: { rule: "none" },
              sourceItemId: validatedTask.id,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
            await database.events.add(newEvent);

            if (validatedTask.dueTime) {
              const newReminder = ReminderSchema.parse({
                id: crypto.randomUUID(),
                eventId,
                timing: { type: "at_time" },
                label: "At time of event",
                isActive: validatedTask.status !== "completed",
                createdAt: nowIso,
              });
              await database.reminders.add(newReminder);
            }
          }
        }
      }
    }
  );

  return validatedTask;
}

/**
 * Atomically deletes a task and all its linked events and associated reminders.
 * Guarantees that:
 * - Unrelated calendar events are never deleted.
 * - Reminders of unrelated events are never touched.
 * - If any deletion step fails, the entire transaction rolls back.
 */
export async function deleteTaskWithCascade(
  taskId: string,
  database: OrbitDatabase = defaultDb
): Promise<void> {
  await database.transaction(
    "rw",
    [database.tasks, database.events, database.reminders],
    async () => {
      // 1. Locate all events linked to this task
      const linkedEvents = await database.events
        .filter((e) => e.sourceItemId === taskId)
        .toArray();

      // 2. Cascade delete reminders belonging to those events
      const eventIds = linkedEvents.map((e) => e.id);
      if (eventIds.length > 0) {
        await database.reminders.where("eventId").anyOf(eventIds).delete();
      }

      // 3. Delete the linked events
      for (const ev of linkedEvents) {
        await database.events.delete(ev.id);
      }

      // 4. Delete the task itself
      await database.tasks.delete(taskId);
    }
  );
}

/**
 * Atomically updates a task's completion status and toggles active state of linked reminders.
 */
export async function toggleTaskCompletionWithSync(
  task: Task,
  database: OrbitDatabase = defaultDb
): Promise<Task> {
  const isNowCompleted = task.status !== "completed";
  const nowIso = new Date().toISOString();

  const updatedTask = TaskSchema.parse({
    ...task,
    status: isNowCompleted ? "completed" : "todo",
    completedAt: isNowCompleted ? nowIso : undefined,
    updatedAt: nowIso,
  });

  await database.transaction(
    "rw",
    [database.tasks, database.events, database.reminders],
    async () => {
      await database.tasks.put(updatedTask);

      // Adjust active status on linked reminders
      const linkedEvents = await database.events
        .filter((e) => e.sourceItemId === task.id)
        .toArray();

      const eventIds = linkedEvents.map((e) => e.id);
      if (eventIds.length > 0) {
        await database.reminders
          .where("eventId")
          .anyOf(eventIds)
          .modify({ isActive: !isNowCompleted });
      }
    }
  );

  return updatedTask;
}
