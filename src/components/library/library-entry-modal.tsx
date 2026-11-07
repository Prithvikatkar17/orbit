"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  Star,
  AlertCircle,
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  type LibraryEntry,
  LibraryEntrySchema,
  type LibraryCollection,
} from "@/lib/schemas";
import { normalizeUrl } from "@/lib/utils/dates";

interface LibraryEntryModalProps {
  initialEntry?: LibraryEntry | null;
  collections: LibraryCollection[];
  defaultCollectionId?: string;
  onClose: () => void;
  onSaved?: (entry: LibraryEntry) => void;
}

export function LibraryEntryModal({
  initialEntry,
  collections,
  defaultCollectionId,
  onClose,
  onSaved,
}: LibraryEntryModalProps) {
  const isEditing = Boolean(initialEntry);

  const [title, setTitle] = useState(initialEntry?.title || "");
  const [type, setType] = useState<LibraryEntry["type"]>(initialEntry?.type || "bookmark");
  const [link, setLink] = useState(initialEntry?.link || "");
  const [collectionId, setCollectionId] = useState<string>(
    initialEntry?.collectionId || defaultCollectionId || ""
  );
  const [status, setStatus] = useState<LibraryEntry["status"]>(initialEntry?.status || "saved");
  const [rating, setRating] = useState<number | undefined>(initialEntry?.rating);
  const [notes, setNotes] = useState(initialEntry?.notes || "");
  const [tagInput, setTagInput] = useState(initialEntry?.tags?.join(", ") || "");
  const [isFavorite, setIsFavorite] = useState(initialEntry?.isFavorite || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const nowIso = new Date().toISOString();
    const id = initialEntry?.id || crypto.randomUUID();

    // Process comma-separated tags
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      const parsedEntry = LibraryEntrySchema.parse({
        id,
        title: title.trim(),
        notes: notes.trim(),
        link: normalizeUrl(link),
        type,
        status,
        rating: rating || undefined,
        tags,
        isFavorite,
        collectionId: collectionId || undefined,
        lastViewedAt: initialEntry?.lastViewedAt,
        completedAt:
          status === "completed"
            ? initialEntry?.completedAt || nowIso
            : undefined,
        sourceItemId: initialEntry?.sourceItemId,
        fileMetadata: initialEntry?.fileMetadata,
        createdAt: initialEntry?.createdAt || nowIso,
        updatedAt: nowIso,
      });

      if (isEditing) {
        await db.libraryEntries.put(parsedEntry);
      } else {
        await db.libraryEntries.add(parsedEntry);
      }

      onSaved?.(parsedEntry);
      onClose();
    } catch (err: unknown) {
      console.error("Save library entry error:", err);
      setError(err instanceof Error ? err.message : "Validation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>{isEditing ? "Edit Resource" : "Add Resource"}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Resource title, video heading, or note topic"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Type & Collection Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resource Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LibraryEntry["type"])}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="bookmark">🔖 Bookmark</option>
                <option value="video">📹 Video</option>
                <option value="playlist">📑 Playlist</option>
                <option value="article">📰 Article</option>
                <option value="note">📝 Standalone Note</option>
                <option value="learn">📚 Course / Learning</option>
                <option value="listen">🎧 Audio / Podcast</option>
                <option value="file">📎 File Document</option>
                <option value="buy">🛒 Product to Buy</option>
                <option value="other">📌 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Collection
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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

          {/* URL / Link (Optional for notes/files) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              URL / Link
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=... or https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Status & Rating Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Learning Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LibraryEntry["status"])}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="saved">Saved (Not Started)</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rating
              </label>
              <div className="mt-1 flex items-center gap-1.5 h-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? undefined : star)}
                    className="p-1 text-slate-300 hover:text-amber-400 focus:outline-hidden transition-colors"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        rating && rating >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="ml-1 text-[11px] font-semibold text-slate-400">
                    ({rating}/5)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. react, tutorial, design, research"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Notes / Thoughts (supports up to 50k chars for markdown notes) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes & Summary
              </label>
              <span className="text-[10px] text-slate-400">
                {notes.length} / 50,000
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Key insights, summaries, thoughts, or standalone note content..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white leading-relaxed resize-y"
            />
          </div>

          {/* Favorite checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="favorite-toggle"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="favorite-toggle"
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

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
