"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Task, TaskSchema } from "@/lib/schemas";
import { normalizeUrl } from "@/lib/utils/dates";

interface TaskModalProps {
  initialTask?: Task | null;
  onClose: () => void;
}

export function TaskModal({ initialTask, onClose }: TaskModalProps) {
  const isEditing = Boolean(initialTask);
  const [title, setTitle] = useState(initialTask?.title || "");
  const [notes, setNotes] = useState(initialTask?.notes || "");
  const [link, setLink] = useState(initialTask?.link || "");
  const [category, setCategory] = useState(initialTask?.category || "task");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(initialTask?.priority || "medium");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || "");
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const nowIso = new Date().toISOString();

    try {
      if (isEditing && initialTask) {
        const updated = TaskSchema.parse({
          ...initialTask,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          category: category.toLowerCase(),
          priority,
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          updatedAt: nowIso,
        });

        await db.tasks.put(updated);
      } else {
        const maxOrderTask = await db.tasks.orderBy("sortOrder").last();
        const nextSortOrder = maxOrderTask ? maxOrderTask.sortOrder + 1 : 0;

        const newTask = TaskSchema.parse({
          id: crypto.randomUUID(),
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          category: category.toLowerCase(),
          priority,
          status: "todo",
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          sortOrder: nextSortOrder,
          tags: [category],
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        await db.tasks.add(newTask);
      }

      onClose();
    } catch (err: unknown) {
      console.error("Save task error:", err);
      setError(err instanceof Error ? err.message : "Validation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEditing ? "Edit Task / Goal" : "Create New Task"}
          </h3>
          <button
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish project roadmap"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Type / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="task">📌 Task</option>
                <option value="goal">🎯 Goal (Milestone)</option>
                <option value="idea">💡 Idea</option>
                <option value="learn">📚 Learn</option>
                <option value="buy">🛒 Buy</option>
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Due Date (Optional)
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
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Link / Reference URL (Optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Notes & Description (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional thoughts or sub-items..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
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
              <span>{isEditing ? "Save Changes" : "Create Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
