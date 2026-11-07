"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  Bell,
  Trash2,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Event } from "@/lib/schemas/event";
import { type Reminder } from "@/lib/schemas/reminder";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import { formatDateDisplay } from "@/lib/utils/dates";

interface EventDetailsProps {
  event: Event;
  occurrenceDate?: string;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDeleted: (eventId: string) => void;
}

export function EventDetails({
  event,
  occurrenceDate,
  onClose,
  onEdit,
  onDeleted,
}: EventDetailsProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    db.reminders
      .where("eventId")
      .equals(event.id)
      .toArray()
      .then((items) => {
        if (mounted) {
          setReminders(items);
        }
      })
      .catch((err) => {
        console.error("Failed to load reminders for event:", err);
      });

    return () => {
      mounted = false;
    };
  }, [event.id]);

  const typeConfig = EVENT_TYPE_MAP[event.type] || EVENT_TYPE_MAP.general;
  const displayDate = occurrenceDate || event.date;
  const isRecurring = event.recurrence && event.recurrence.rule !== "none";

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await db.transaction("rw", [db.events, db.reminders], async () => {
        await db.reminders.where("eventId").equals(event.id).delete();
        await db.events.delete(event.id);
      });
      onDeleted(event.id);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to delete event:", err);
      setError("Failed to delete event. Please try again.");
      setIsDeleting(false);
    }
  }

  function formatRecurrenceText(rule: string, endDate?: string) {
    let text = "";
    switch (rule) {
      case "daily":
        text = "Repeats daily";
        break;
      case "weekly":
        text = "Repeats weekly";
        break;
      case "monthly":
        text = "Repeats monthly";
        break;
      case "yearly":
        text = "Repeats yearly";
        break;
      default:
        return "Does not repeat";
    }

    if (endDate) {
      text += ` until ${formatDateDisplay(endDate)}`;
    }
    return text;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.badgeClass}`}
            >
              <span>{typeConfig.icon}</span>
              <span>{typeConfig.label}</span>
            </span>
            {isRecurring && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <Repeat className="h-3 w-3" />
                <span>Recurring</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {event.title}
            </h2>
            {occurrenceDate && occurrenceDate !== event.date && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                Occurrence of {event.recurrence?.rule} event (Original date: {event.date})
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <CalendarIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="font-medium">{formatDateDisplay(displayDate)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                {event.isAllDay
                  ? "All Day"
                  : `${event.startTime || "00:00"} – ${event.endTime || "23:59"}`}
              </span>
            </div>

            {isRecurring && (
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <Repeat className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{formatRecurrenceText(event.recurrence.rule, event.recurrence.endDate)}</span>
              </div>
            )}
          </div>

          {/* Notes / Description */}
          {(event.notes || event.description) && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</h4>
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-700 whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                {event.notes || event.description}
              </div>
            </div>
          )}

          {/* Reminders list */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bell className="h-3 w-3" />
              <span>Reminders ({reminders.length})</span>
            </h4>
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No reminders scheduled for this event.</p>
            ) : (
              <div className="space-y-1.5">
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-indigo-600" : "bg-slate-400"}`} />
                      <span className={r.isActive ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-400 line-through"}>
                        {r.label || (r.timing.type === "at_time" ? "At time of event" : `${r.timing.offsetMinutes || 0}m before`)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete confirmation alert */}
          {showConfirmDelete && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 space-y-2">
              <p className="font-semibold">Are you sure you want to delete this event?</p>
              <p className="text-[11px] opacity-90">
                {isRecurring
                  ? "This will delete the recurring series and all associated reminders."
                  : "This action cannot be undone."}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onEdit(event);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
