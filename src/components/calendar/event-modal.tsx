"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Event, EventSchema } from "@/lib/schemas/event";
import { ReminderSchema } from "@/lib/schemas/reminder";
import { EVENT_TYPES } from "@/lib/constants";
import { ReminderEditor, type ReminderDraft } from "@/components/reminders/reminder-editor";
import { getLocalDateString } from "@/lib/utils/dates";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

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
  const modalRef = useAccessibleModal({ onClose });
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
    <div className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="event-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <CalendarIcon className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>{isEditing ? "Edit Event" : "Create Event"}</span>
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-orbit-control border border-orbit-danger/20 bg-orbit-danger-soft p-3 text-xs text-orbit-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Event Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Maya's Birthday, Team Standup, History Assignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="orbit-input mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Event Type & Date Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Event["type"])}
                className="orbit-select mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="orbit-input mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
              />
            </div>
          </div>

          {/* Time & All-Day */}
          <div className="rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orbit-text flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-orbit-text-muted" />
                <span>Time of Day</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-orbit-text-muted">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded accent-orbit-accent h-4 w-4"
                />
                <span>All-day event</span>
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-orbit-text-muted">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="orbit-input mt-1 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-1.5 text-xs text-orbit-text focus:outline-hidden focus:border-orbit-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-orbit-text-muted">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="orbit-input mt-1 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-1.5 text-xs text-orbit-text focus:outline-hidden focus:border-orbit-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurrence Configuration */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Repeat
              </label>
              <select
                value={rule}
                onChange={(e) => setRule(e.target.value as Event["recurrence"]["rule"])}
                className="orbit-select mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
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
                <label className="block text-xs font-semibold text-orbit-text">
                  Ends On (Optional)
                </label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className="orbit-input mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Reminders Section */}
          <div className="rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary/60 p-3.5">
            <ReminderEditor
              reminders={reminders}
              onChange={setReminders}
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Location, video link, agenda, or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="orbit-textarea mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-orbit-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

