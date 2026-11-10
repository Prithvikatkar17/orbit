"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Habit, HabitSchema } from "@/lib/schemas";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";

interface HabitModalProps {
  initialHabit?: Habit | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f59e0b", // Amber
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-hidden dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between pb-3">
          <h3 id="habit-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {isEditing ? "Edit Habit" : "Create New Habit"}
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Habit Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Read 20 pages, Morning Jog, Meditate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Frequency
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: "daily", label: "Daily" },
                  { id: "weekdays", label: "Weekdays" },
                  { id: "weekly", label: "Weekly" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrequency(f.id)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                    frequency === f.id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days Selector */}
          {frequency === "custom" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Active Days
              </label>
              <div className="flex justify-between gap-1">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = customDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleDay(d.day)}
                      className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Highlight Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : ""
                  }`}
                >
                  {color === c && <Check className="h-4 w-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes or Motivation (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Why this habit matters, rules, or tips..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

