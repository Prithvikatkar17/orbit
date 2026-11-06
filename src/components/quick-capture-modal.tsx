"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRight, Tag, AlertCircle } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { db } from "@/lib/db/client";
import { ItemSchema, TaskSchema, HabitSchema, LibraryEntrySchema } from "@/lib/schemas";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export function QuickCaptureModal() {
  const { quickCaptureOpen, closeQuickCapture } = useUIStore();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("task");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const { quickCaptureOpen, openQuickCapture, closeQuickCapture } =
          useUIStore.getState();
        if (quickCaptureOpen) closeQuickCapture();
        else openQuickCapture();
      } else if (e.key === "Escape" && useUIStore.getState().quickCaptureOpen) {
        closeQuickCapture();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeQuickCapture]);

  if (!quickCaptureOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      const lowerCat = category.toLowerCase();

      if (lowerCat === "habit") {
        const habit = HabitSchema.parse({
          id,
          title: title.trim(),
          notes: notes.trim(),
          frequency: "daily",
          customDays: [],
          color: "#10b981",
          isActive: true,
          sortOrder: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await db.habits.add(habit);
      } else if (["watch", "youtube", "learn", "buy"].includes(lowerCat)) {
        const entry = LibraryEntrySchema.parse({
          id,
          title: title.trim(),
          notes: notes.trim(),
          link: link.trim() || undefined,
          type: lowerCat === "youtube" ? "watch" : (lowerCat as "watch" | "learn" | "buy"),
          status: "saved",
          tags: [category],
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await db.libraryEntries.add(entry);
      } else {
        // Task / Goal / Idea
        const task = TaskSchema.parse({
          id,
          title: title.trim(),
          notes: notes.trim(),
          link: link.trim() || undefined,
          category: lowerCat,
          priority,
          status: "todo",
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          sortOrder: 0,
          tags: [category],
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await db.tasks.add(task);

        // If it has date & time, schedule an event/reminder
        if (dueDate) {
          const eventId = crypto.randomUUID();
          await db.events.add({
            id: eventId,
            title: title.trim(),
            notes: notes.trim(),
            type: lowerCat === "goal" ? "deadline" : "general",
            date: dueDate,
            startTime: dueTime || undefined,
            isAllDay: !dueTime,
            recurrence: { rule: "none" },
            sourceItemId: id,
            createdAt: nowIso,
            updatedAt: nowIso,
          });

          if (dueTime) {
            await db.reminders.add({
              id: crypto.randomUUID(),
              eventId,
              timing: { type: "at_time" },
              label: "At time of event",
              lastNotifiedOccurrenceDate: undefined,
              notifiedAt: undefined,
              acknowledgedAt: undefined,
              isActive: true,
              createdAt: nowIso,
            });
          }
        }
      }

      // Reset form & close
      setTitle("");
      setNotes("");
      setLink("");
      setDueDate("");
      setDueTime("");
      closeQuickCapture();
    } catch (err) {
      console.error("Failed to save capture:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              ⚡
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Quick Capture
            </h2>
          </div>
          <button
            onClick={closeQuickCapture}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to remember or do?"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Time (Optional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Add Link / URL (optional)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
          </div>

          <div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes or details..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeQuickCapture}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
            >
              <span>Capture</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

