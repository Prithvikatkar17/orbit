"use client";

import React, { useState } from "react";
import {
  X,
  FolderPlus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  type LibraryCollection,
  LibraryCollectionSchema,
} from "@/lib/schemas";

interface LibraryCollectionModalProps {
  initialCollection?: LibraryCollection | null;
  onClose: () => void;
  onSaved?: (col: LibraryCollection) => void;
}

const COLLECTION_ICONS = ["📁", "📚", "💻", "💡", "🎬", "🔬", "🎨", "🚀", "🧠", "💼", "🎧", "📖"];
const COLLECTION_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#64748b", // slate
];

export function LibraryCollectionModal({
  initialCollection,
  onClose,
  onSaved,
}: LibraryCollectionModalProps) {
  const isEditing = Boolean(initialCollection);

  const [name, setName] = useState(initialCollection?.name || "");
  const [description, setDescription] = useState(initialCollection?.description || "");
  const [icon, setIcon] = useState(initialCollection?.icon || "📁");
  const [color, setColor] = useState(initialCollection?.color || "#6366f1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const nowIso = new Date().toISOString();
    const id = initialCollection?.id || crypto.randomUUID();

    try {
      const parsed = LibraryCollectionSchema.parse({
        id,
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        isDefault: initialCollection?.isDefault || false,
        sortOrder: initialCollection?.sortOrder || 0,
        createdAt: initialCollection?.createdAt || nowIso,
        updatedAt: nowIso,
      });

      if (isEditing) {
        await db.libraryCollections.put(parsed);
      } else {
        await db.libraryCollections.add(parsed);
      }

      onSaved?.(parsed);
      onClose();
    } catch (err: unknown) {
      console.error("Save collection error:", err);
      setError(err instanceof Error ? err.message : "Validation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialCollection) return;
    if (
      confirm(
        `Are you sure you want to delete collection "${initialCollection.name}"? Entries in this collection will not be deleted.`
      )
    ) {
      // Remove collection reference from entries in this collection
      await db.libraryEntries
        .where("collectionId")
        .equals(initialCollection.id)
        .modify({ collectionId: undefined });

      await db.libraryCollections.delete(initialCollection.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>{isEditing ? "Edit Collection" : "Create Collection"}</span>
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
          {/* Collection Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Collection Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Computer Science, Recipes, Reading List"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Short description of this collection"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Icon
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLLECTION_ICONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-transform ${
                    icon === em
                      ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 scale-110"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Accent Color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110"
                      : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
