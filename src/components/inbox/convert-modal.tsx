"use client";

import React, { useState } from "react";
import { CheckSquare, Repeat, BookOpen, X, ArrowRight, Star, AlertCircle, Sparkles } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import {
  type Item,
  HabitSchema,
  LibraryEntrySchema,
  type LibraryEntry,
} from "@/lib/schemas";
import { saveTaskWithSync } from "@/lib/services/task-sync-service";
import { normalizeUrl } from "@/lib/utils/dates";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

interface ConvertModalProps {
  item: Item;
  onClose: () => void;
}

export function ConvertModal({ item, onClose }: ConvertModalProps) {
  const modalRef = useAccessibleModal({ onClose });
  const [destination, setDestination] = useState<"task" | "habit" | "library">("task");
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes || "");
  const [link, setLink] = useState(item.link || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(item.priority || "medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  // Library-specific convert fields
  const [libraryType, setLibraryType] = useState<LibraryEntry["type"]>("bookmark");
  const [collectionId, setCollectionId] = useState("");
  const [libraryStatus, setLibraryStatus] = useState<LibraryEntry["status"]>("saved");
  const [libraryTags, setLibraryTags] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const collections = useLiveQuery(
    () => db.libraryCollections.orderBy("sortOrder").toArray(),
    []
  ) ?? [];

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
        // Atomic transaction: Add task with sync + Remove inbox item
        await db.transaction("rw", [db.tasks, db.events, db.reminders, db.items], async () => {
          await saveTaskWithSync({
            taskData: {
              id: newId,
              title: title.trim(),
              notes: notes.trim(),
              link,
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
            },
          });
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
        const tags = libraryTags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!tags.includes("inbox-converted")) {
          tags.push("inbox-converted");
        }

        const entry = LibraryEntrySchema.parse({
          id: newId,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          type: libraryType,
          status: libraryStatus,
          tags,
          isFavorite,
          collectionId: collectionId || undefined,
          completedAt: libraryStatus === "completed" ? nowIso : undefined,
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
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-modal-title"
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="convert-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>Process Inbox Item</span>
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

        {/* Destination selector tabs - Optimized for compact screens like 320px */}
        <div className="mt-4 mb-4 grid grid-cols-3 gap-1 rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary/70 p-1">
          {(
            [
              { id: "task", label: "Task", icon: CheckSquare },
              { id: "habit", label: "Habit", icon: Repeat },
              { id: "library", label: "Library", icon: BookOpen },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const isActive = destination === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDestination(id)}
                className={`flex min-h-[40px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-orbit-control px-2 py-1.5 text-xs transition-all ${
                  isActive
                    ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs font-semibold"
                    : "text-orbit-text-secondary hover:text-orbit-text hover:bg-orbit-surface"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-orbit-card border border-orbit-danger/30 bg-orbit-danger/10 p-3 text-xs text-orbit-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2.5 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          {destination === "task" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                />
              </div>
            </div>
          )}

          {destination === "library" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                    Resource Type
                  </label>
                  <select
                    value={libraryType}
                    onChange={(e) => setLibraryType(e.target.value as LibraryEntry["type"])}
                    className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                  >
                    <option value="bookmark">🔖 Bookmark</option>
                    <option value="video">📹 Video</option>
                    <option value="playlist">📑 Playlist</option>
                    <option value="article">📰 Article</option>
                    <option value="note">📝 Note</option>
                    <option value="learn">📚 Course / Learn</option>
                    <option value="listen">🎧 Audio</option>
                    <option value="buy">🛒 Buy</option>
                    <option value="file">📎 File</option>
                    <option value="watch">🎬 Watch</option>
                    <option value="other">📌 Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                    Collection (Optional)
                  </label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                  >
                    <option value="">No Collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.icon || "📁"} {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                    Learning Status
                  </label>
                  <select
                    value={libraryStatus}
                    onChange={(e) => setLibraryStatus(e.target.value as LibraryEntry["status"])}
                    className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                  >
                    <option value="saved">Saved (Not Started)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. react, tutorial"
                    value={libraryTags}
                    onChange={(e) => setLibraryTags(e.target.value)}
                    className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="convert-library-favorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="h-4 w-4 rounded-md border-orbit-border bg-orbit-surface text-orbit-accent focus:ring-orbit-ring"
                />
                <label
                  htmlFor="convert-library-favorite"
                  className="text-xs font-medium text-orbit-text-secondary cursor-pointer flex items-center gap-1.5 select-none"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      isFavorite ? "fill-amber-400 text-amber-400" : "text-orbit-text-muted"
                    }`}
                  />
                  <span>Mark as Favourite</span>
                </label>
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Link (Optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
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
              trailingIcon={<ArrowRight className="h-4 w-4" />}
            >
              Convert to {destination === "task" ? "Task" : destination === "habit" ? "Habit" : "Library"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
