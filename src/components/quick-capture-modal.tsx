"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRight, Star, Zap } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import {
  ItemSchema,
  HabitSchema,
  LibraryEntrySchema,
  type LibraryEntry,
} from "@/lib/schemas";
import { saveTaskWithSync } from "@/lib/services/task-sync-service";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { normalizeUrl } from "@/lib/utils/dates";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

export function QuickCaptureModal() {
  const { quickCaptureOpen, closeQuickCapture } = useUIStore();
  const modalRef = useAccessibleModal({
    isOpen: quickCaptureOpen,
    onClose: closeQuickCapture,
  });
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("inbox");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  // Library-specific Quick Capture fields
  const [collectionId, setCollectionId] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<LibraryEntry["status"]>("saved");
  const [tagInput, setTagInput] = useState("");

  const collections = useLiveQuery(
    () => db.libraryCollections.orderBy("sortOrder").toArray(),
    []
  ) ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLibraryCategory = [
    "watch",
    "youtube",
    "learn",
    "buy",
    "bookmark",
    "article",
    "video",
    "playlist",
    "note",
    "file",
    "library",
  ].includes(category.toLowerCase());

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+Shift+K / Cmd+Shift+K: Toggle Quick Capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
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

      if (lowerCat === "inbox") {
        // Pure capture into items table
        const item = ItemSchema.parse({
          id,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          category: "inbox",
          priority,
          status: "pending",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await db.items.add(item);
      } else if (lowerCat === "habit") {
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
      } else if (isLibraryCategory) {
        let resolvedType: LibraryEntry["type"] = "other";
        switch (lowerCat) {
          case "bookmark":
          case "library":
            resolvedType = "bookmark";
            break;
          case "video":
          case "youtube":
            resolvedType = "video";
            break;
          case "watch":
            resolvedType = "watch";
            break;
          case "article":
            resolvedType = "article";
            break;
          case "note":
            resolvedType = "note";
            break;
          case "learn":
            resolvedType = "learn";
            break;
          case "buy":
            resolvedType = "buy";
            break;
          case "playlist":
            resolvedType = "playlist";
            break;
          case "file":
            resolvedType = "file";
            break;
          default:
            resolvedType = "other";
            break;
        }

        const tags = tagInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!tags.includes(lowerCat) && lowerCat !== "library") {
          tags.push(lowerCat);
        }

        const entry = LibraryEntrySchema.parse({
          id,
          title: title.trim(),
          notes: notes.trim(),
          link: normalizeUrl(link),
          type: resolvedType,
          status: libraryStatus,
          tags,
          isFavorite,
          collectionId: collectionId || undefined,
          completedAt: libraryStatus === "completed" ? nowIso : undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await db.libraryEntries.add(entry);
      } else {
        // Task / Goal / Idea
        await saveTaskWithSync({
          taskData: {
            id,
            title,
            notes,
            link,
            category: lowerCat,
            priority,
            status: "todo",
            dueDate,
            dueTime,
            sortOrder: 0,
            tags: [category],
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        });
      }

      // Reset form & close
      setTitle("");
      setNotes("");
      setLink("");
      setDueDate("");
      setDueTime("");
      setCategory("inbox");
      setCollectionId("");
      setIsFavorite(false);
      setLibraryStatus("saved");
      setTagInput("");
      closeQuickCapture();
    } catch (err) {
      console.error("Failed to save capture:", err);
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
        aria-labelledby="quick-capture-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h2 id="quick-capture-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>Quick Capture</span>
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeQuickCapture}
            className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to remember or do?"
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2.5 text-base text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {isLibraryCategory ? (
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
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            )}
          </div>

          {isLibraryCategory && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Status
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
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
                />
              </div>
            </div>
          )}

          {!isLibraryCategory && category.toLowerCase() !== "inbox" && category.toLowerCase() !== "habit" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Date (Optional)
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
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              {isLibraryCategory ? "Resource Link / URL" : "Link / Reference URL (Optional)"}
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
              {isLibraryCategory ? "Notes & Takeaways (Optional)" : "Notes & Details (Optional)"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isLibraryCategory ? "Notes, thoughts, or key takeaways..." : "Notes or details..."}
              className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-3 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
          </div>

          {isLibraryCategory && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="quick-capture-favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-4 w-4 rounded-md border-orbit-border bg-orbit-surface text-orbit-accent focus:ring-orbit-ring"
              />
              <label
                htmlFor="quick-capture-favorite"
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
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-orbit-border">
            <Button
              type="button"
              variant="secondary"
              onClick={closeQuickCapture}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!title.trim() || isSubmitting}
              trailingIcon={<ArrowRight className="h-4 w-4" />}
            >
              Capture
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
