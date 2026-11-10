"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRight, Star } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-capture-modal-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-hidden dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" aria-hidden="true">
              ⚡
            </span>
            <h2 id="quick-capture-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Quick Capture
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
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
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {isLibraryCategory ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Collection (Optional)
                </label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
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
            )}
          </div>

          {isLibraryCategory && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Status
                </label>
                <select
                  value={libraryStatus}
                  onChange={(e) => setLibraryStatus(e.target.value as LibraryEntry["status"])}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="saved">Saved (Not Started)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. react, tutorial"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {!isLibraryCategory && category.toLowerCase() !== "inbox" && category.toLowerCase() !== "habit" && (
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
          )}

          <div>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={isLibraryCategory ? "Resource Link / URL (e.g. https://...)" : "Add Link / URL (optional)"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
          </div>

          <div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isLibraryCategory ? "Notes, thoughts, or key takeaways..." : "Notes or details..."}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
          </div>

          {isLibraryCategory && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="quick-capture-favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="quick-capture-favorite"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-400"
                  }`}
                />
                <span>Mark as Favourite</span>
              </label>
            </div>
          )}

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
