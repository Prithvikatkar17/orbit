"use client";

import React, { useState } from "react";
import { CheckSquare, Repeat, BookOpen, X, ArrowRight } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Item, TaskSchema, HabitSchema, LibraryEntrySchema } from "@/lib/schemas";
import { normalizeUrl } from "@/lib/utils/dates";

interface ConvertModalProps {
  item: Item;
  onClose: () => void;
}

export function ConvertModal({ item, onClose }: ConvertModalProps) {
  const [destination, setDestination] = useState<"task" | "habit" | "library">("task");
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes || "");
  const [link, setLink] = useState(item.link || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(item.priority || "medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [libraryType, setLibraryType] = useState<"watch" | "read" | "listen" | "learn" | "buy" | "other">("watch");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const nowIso = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      if (destination === "task") {
        const task = TaskSchema.parse({
          id: newId,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          category: "task",
          priority,
          status: "todo",
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          sortOrder: 0,
          tags: ["inbox-converted"],
          sourceItemId: item.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Atomic transaction: Add task + Remove or update inbox item
        await db.transaction("rw", [db.tasks, db.items], async () => {
          await db.tasks.add(task);
          await db.items.delete(item.id);
        });
      } else if (destination === "habit") {
        const habit = HabitSchema.parse({
          id: newId,
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

        await db.transaction("rw", [db.habits, db.items], async () => {
          await db.habits.add(habit);
          await db.items.delete(item.id);
        });
      } else if (destination === "library") {
        const entry = LibraryEntrySchema.parse({
          id: newId,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          type: libraryType,
          status: "saved",
          tags: ["inbox-converted"],
          sourceItemId: item.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        await db.transaction("rw", [db.libraryEntries, db.items], async () => {
          await db.libraryEntries.add(entry);
          await db.items.delete(item.id);
        });
      }

      onClose();
    } catch (err: unknown) {
      console.error("Conversion error:", err);
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Process Inbox Item
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Destination selector tabs */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setDestination("task")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              destination === "task"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Task</span>
          </button>
          <button
            type="button"
            onClick={() => setDestination("habit")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              destination === "habit"
                ? "bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Repeat className="h-4 w-4" />
            <span>Habit</span>
          </button>
          <button
            type="button"
            onClick={() => setDestination("library")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              destination === "library"
                ? "bg-white text-purple-600 shadow-xs dark:bg-slate-900 dark:text-purple-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Library</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {destination === "task" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Due Date
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
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {destination === "library" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Library Category
              </label>
              <select
                value={libraryType}
                onChange={(e) => setLibraryType(e.target.value as "watch" | "read" | "listen" | "learn" | "buy" | "other")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="watch">🎬 Watch</option>
                <option value="read">📖 Read</option>
                <option value="listen">🎧 Listen</option>
                <option value="learn">📚 Learn</option>
                <option value="buy">🛒 Buy</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Link (optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <span>Convert to {destination.toUpperCase()}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
