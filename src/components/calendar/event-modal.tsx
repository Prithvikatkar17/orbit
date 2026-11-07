"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Event, EventSchema } from "@/lib/schemas/event";
import { ReminderSchema } from "@/lib/schemas/reminder";
import { EVENT_TYPES } from "@/lib/constants";
import { ReminderEditor, type ReminderDraft } from "@/components/reminders/reminder-editor";
import { getLocalDateString } from "@/lib/utils/dates";

interface EventModalProps {
  initialEvent?: Event | null;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSaved?: (event: Event) => void;
}

export function EventModal({
  initialEvent,
  initialDate,
  initialTime,
  onClose,
  onSaved,
}: EventModalProps) {
  const isEditing = Boolean(initialEvent);
  const todayStr = getLocalDateString();

  const [title, setTitle] = useState(initialEvent?.title || "");
  const [type, setType] = useState<Event["type"]>(initialEvent?.type || "general");
  const [date, setDate] = useState(initialEvent?.date || initialDate || todayStr);
  const [isAllDay, setIsAllDay] = useState(
    initialEvent ? initialEvent.isAllDay : !initialTime
  );
  const [startTime, setStartTime] = useState(
    initialEvent?.startTime || initialTime || "09:00"
  );
  const [endTime, setEndTime] = useState(initialEvent?.endTime || "10:00");
  const [rule, setRule] = useState<Event["recurrence"]["rule"]>(
    initialEvent?.recurrence?.rule || "none"
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    initialEvent?.recurrence?.endDate || ""
  );
  const [notes, setNotes] = useState(initialEvent?.notes || "");
  const [reminders, setReminders] = useState<ReminderDraft[]>(() =>
    initialEvent
      ? []
      : [
          {
            id: crypto.randomUUID(),
            timing: { type: "at_time", offsetMinutes: 0 },
            label: "At time of event",
            isActive: true,
          },
        ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing reminders if editing
  useEffect(() => {
    if (!initialEvent) return;

    let isMounted = true;
    db.reminders
      .where("eventId")
      .equals(initialEvent.id)
      .toArray()
      .then((items) => {
        if (!isMounted) return;
        setReminders(
          items.map((r) => ({
            id: r.id,
            timing: r.timing,
            label: r.label || "Reminder",
            isActive: r.isActive,
          }))
        );
      })
      .catch((err) => console.error("Error loading reminders:", err));

    return () => {
      isMounted = false;
    };
  }, [initialEvent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const nowIso = new Date().toISOString();
    const eventId = initialEvent?.id || crypto.randomUUID();

    try {
      const parsedEvent = EventSchema.parse({
        id: eventId,
        title: title.trim(),
        notes: notes.trim(),
        description: notes.trim(),
        type,
        date,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        recurrence: {
          rule,
          endDate: recurrenceEndDate || undefined,
        },
        sourceItemId: initialEvent?.sourceItemId,
        createdAt: initialEvent?.createdAt || nowIso,
        updatedAt: nowIso,
      });

      const parsedReminders = reminders.map((r) =>
        ReminderSchema.parse({
          id: r.id || crypto.randomUUID(),
          eventId,
          timing: r.timing,
          label: r.label,
          isActive: r.isActive,
          createdAt: nowIso,
        })
      );

      // Atomic write
      await db.transaction("rw", [db.events, db.reminders], async () => {
        await db.events.put(parsedEvent);
        // Replace reminders for this event
        await db.reminders.where("eventId").equals(eventId).delete();
        for (const rem of parsedReminders) {
          await db.reminders.add(rem);
        }
      });

      onSaved?.(parsedEvent);
      onClose();
    } catch (err: unknown) {
      console.error("Save event error:", err);
      setError(err instanceof Error ? err.message : "Validation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>{isEditing ? "Edit Event" : "Create Event"}</span>
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Event Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Maya's Birthday, Team Standup, History Assignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Event Type & Date Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Event["type"])}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Time & All-Day */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Time of Day</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>All-day event</span>
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurrence Configuration */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Repeat
              </label>
              <select
                value={rule}
                onChange={(e) => setRule(e.target.value as Event["recurrence"]["rule"])}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly (Birthdays/Anniversaries)</option>
              </select>
            </div>

            {rule !== "none" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ends On (Optional)
                </label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Reminders Section */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <ReminderEditor
              reminders={reminders}
              onChange={setReminders}
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Location, video link, agenda, or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

