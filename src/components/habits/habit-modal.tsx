"use client";

import React, { useState } from "react";
import { X, Check, Flame, AlertCircle } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Habit, HabitSchema } from "@/lib/schemas";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

interface HabitModalProps {
  initialHabit?: Habit | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#10b981", // Emerald / Mint
  "#06b6d4", // Cyan / Mineral
  "#3b82f6", // Blue / Sky
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f59e0b", // Amber / Warm ochre
];

const DAYS_OF_WEEK = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

export function HabitModal({ initialHabit, onClose }: HabitModalProps) {
  const modalRef = useAccessibleModal({ onClose });
  const isEditing = Boolean(initialHabit);
  const [title, setTitle] = useState(initialHabit?.title || "");
  const [notes, setNotes] = useState(initialHabit?.notes || "");
  const [frequency, setFrequency] = useState<"daily" | "weekdays" | "weekly" | "custom">(
    initialHabit?.frequency || "daily"
  );
  const [customDays, setCustomDays] = useState<number[]>(initialHabit?.customDays || [1, 2, 3, 4, 5]);
  const [color, setColor] = useState(initialHabit?.color || "#10b981");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      setCustomDays([...customDays, day].sort());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const nowIso = new Date().toISOString();

    try {
      if (isEditing && initialHabit) {
        const updated = HabitSchema.parse({
          ...initialHabit,
          title: title.trim(),
          notes: notes.trim(),
          frequency,
          customDays: frequency === "custom" ? customDays : [],
          color,
          updatedAt: nowIso,
        });

        await db.habits.put(updated);
      } else {
        const maxOrder = await db.habits.orderBy("sortOrder").last();
        const nextOrder = maxOrder ? maxOrder.sortOrder + 1 : 0;

        const newHabit = HabitSchema.parse({
          id: crypto.randomUUID(),
          title: title.trim(),
          notes: notes.trim(),
          frequency,
          customDays: frequency === "custom" ? customDays : [],
          color,
          isActive: true,
          sortOrder: nextOrder,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        await db.habits.add(newHabit);
      }

      onClose();
    } catch (err: unknown) {
      console.error("Save habit error:", err);
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
        aria-labelledby="habit-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="habit-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <Flame className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>{isEditing ? "Edit Habit" : "Create New Habit"}</span>
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-orbit-card border border-orbit-danger/30 bg-orbit-danger/10 p-3 text-xs text-orbit-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Habit Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Read 20 pages, Morning Walk, Meditate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2.5 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1.5">
              {(
                [
                  { id: "daily", label: "Daily" },
                  { id: "weekdays", label: "Weekdays" },
                  { id: "weekly", label: "Weekly" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((f) => {
                const isActive = frequency === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`min-h-[40px] rounded-orbit-control border py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "border-orbit-accent bg-orbit-accent text-orbit-accent-fg font-semibold shadow-orbit-xs"
                        : "border-orbit-border bg-orbit-surface-secondary text-orbit-text-secondary hover:text-orbit-text hover:bg-orbit-surface"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Days Selector */}
          {frequency === "custom" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Active Days
              </label>
              <div className="flex flex-wrap gap-1.5 sm:justify-between">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = customDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleDay(d.day)}
                      className={`min-h-[40px] min-w-[40px] flex-1 sm:flex-none sm:w-9 rounded-orbit-control text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs font-semibold"
                          : "border border-orbit-border bg-orbit-surface-secondary text-orbit-text-secondary hover:bg-orbit-surface hover:text-orbit-text"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Highlight Color
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Select color ${c}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-9 w-9 sm:h-7 sm:w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-orbit-accent ring-offset-2 ring-offset-orbit-surface" : ""
                  }`}
                >
                  {color === c && <Check className="h-4 w-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Notes or Motivation (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Why this habit matters, rules, or tips..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-3 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-orbit-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || !title.trim()}
            >
              {isEditing ? "Save Changes" : "Create Habit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
