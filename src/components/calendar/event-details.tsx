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
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

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

  const modalRef = useAccessibleModal({
    onClose,
    paused: showConfirmDelete,
  });

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
      setShowConfirmDelete(false);
      onDeleted(event.id);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to delete event:", err);
      setError("Failed to delete event. Please try again.");
      setIsDeleting(false);
      setShowConfirmDelete(false);
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
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-details-title"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden rounded-orbit-card border border-orbit-border bg-orbit-surface-elevated shadow-orbit-elevated outline-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-orbit-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={event.type === "deadline" ? "danger" : "neutral"}>
                <span aria-hidden="true">{typeConfig.icon}</span>
                <span>{typeConfig.label}</span>
              </Badge>
              {isRecurring && (
                <Badge variant="accent">
                  <Repeat className="h-3 w-3" />
                  <span>Recurring</span>
                </Badge>
              )}
            </div>
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {error && (
              <div className="flex items-center gap-2 rounded-orbit-control bg-orbit-danger-soft p-3 text-xs text-orbit-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <h2
                id="event-details-title"
                className="font-display text-xl font-semibold leading-snug text-orbit-text [overflow-wrap:anywhere]"
              >
                {event.title}
              </h2>
              {occurrenceDate && occurrenceDate !== event.date && (
                <p className="mt-1 text-xs text-orbit-accent">
                  Occurrence of {event.recurrence?.rule} event (Original date: {event.date})
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-2 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-3.5">
              <div className="flex items-center gap-2.5 text-sm text-orbit-text">
                <CalendarIcon className="h-4 w-4 shrink-0 text-orbit-accent" />
                <span className="font-medium">{formatDateDisplay(displayDate)}</span>
              </div>
              <div className="flex items-center gap-2.5 font-mono text-xs text-orbit-text-secondary">
                <Clock className="h-3.5 w-3.5 shrink-0 text-orbit-text-muted" />
                <span>
                  {event.isAllDay
                    ? "All Day"
                    : `${event.startTime || "00:00"} – ${event.endTime || "23:59"}`}
                </span>
              </div>

              {isRecurring && (
                <div className="flex items-center gap-2.5 border-t border-orbit-border pt-2 text-xs text-orbit-text-secondary">
                  <Repeat className="h-3.5 w-3.5 shrink-0 text-orbit-text-muted" />
                  <span>{formatRecurrenceText(event.recurrence.rule, event.recurrence.endDate)}</span>
                </div>
              )}
            </div>

            {/* Notes / Description */}
            {(event.notes || event.description) && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold tracking-wider text-orbit-text-muted uppercase">
                  Notes
                </h4>
                <div className="[overflow-wrap:anywhere] rounded-orbit-control border border-orbit-border bg-orbit-surface p-3 text-xs leading-relaxed text-orbit-text-secondary whitespace-pre-wrap">
                  {event.notes || event.description}
                </div>
              </div>
            )}

            {/* Reminders list */}
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-orbit-text-muted uppercase">
                <Bell className="h-3 w-3" />
                <span>Reminders ({reminders.length})</span>
              </h4>
              {reminders.length === 0 ? (
                <p className="text-xs italic text-orbit-text-muted">
                  No reminders scheduled for this event.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            r.isActive ? "bg-orbit-accent" : "bg-orbit-text-muted"
                          }`}
                        />
                        <span
                          className={
                            r.isActive
                              ? "font-medium text-orbit-text"
                              : "line-through text-orbit-text-muted"
                          }
                        >
                          {r.label ||
                            (r.timing.type === "at_time"
                              ? "At time of event"
                              : `${r.timing.offsetMinutes || 0}m before`)}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-orbit-text-muted">
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orbit-border bg-orbit-surface-secondary/70 p-3.5">
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setShowConfirmDelete(true)}
              className="text-orbit-danger hover:bg-orbit-danger-soft hover:text-orbit-danger"
            >
              Delete
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  onEdit(event);
                  onClose();
                }}
              >
                Edit
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete event?"
        description={
          isRecurring
            ? "This will delete the recurring series and all associated reminders."
            : "This event and its reminders will be permanently removed."
        }
        confirmLabel="Delete Event"
        danger
        loading={isDeleting}
      />
    </>
  );
}
