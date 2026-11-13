"use client";

import React, { useState } from "react";
import { CheckSquare, X, AlertCircle } from "lucide-react";
import { db } from "@/lib/db/client";
import { type Task } from "@/lib/schemas";
import { saveTaskWithSync } from "@/lib/services/task-sync-service";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

interface TaskModalProps {
  initialTask?: Task | null;
  onClose: () => void;
}

export function TaskModal({ initialTask, onClose }: TaskModalProps) {
  const modalRef = useAccessibleModal({ onClose });
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

    try {
      let sortOrder = initialTask?.sortOrder ?? 0;
      if (!isEditing) {
        const maxOrderTask = await db.tasks.orderBy("sortOrder").last();
        sortOrder = maxOrderTask ? maxOrderTask.sortOrder + 1 : 0;
      }

      await saveTaskWithSync({
        taskData: {
          id: isEditing ? initialTask?.id : undefined,
          title,
          notes,
          link,
          category,
          priority,
          status: isEditing ? initialTask?.status : "todo",
          dueDate,
          dueTime,
          sortOrder,
          tags: isEditing ? initialTask?.tags : [category.toLowerCase()],
          sourceItemId: initialTask?.sourceItemId,
          createdAt: initialTask?.createdAt,
        },
        isEditing,
      });

      onClose();
    } catch (err: unknown) {
      console.error("Save task error:", err);
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
        aria-labelledby="task-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="task-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <CheckSquare className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>{isEditing ? "Edit Task / Goal" : "Create New Task"}</span>
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
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish project roadmap"
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2.5 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Type / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
              >
                <option value="task">📌 Task</option>
                <option value="goal">🎯 Goal (Milestone)</option>
                <option value="idea">💡 Idea</option>
                <option value="learn">📚 Learn</option>
                <option value="buy">🛒 Buy</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
              >
              </input>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Time (Optional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Link / Reference URL (Optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Notes & Description (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional thoughts or sub-items..."
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-3 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

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
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
