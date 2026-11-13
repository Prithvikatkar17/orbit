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
import { deleteLibraryCollectionAndCleanReferences } from "@/lib/services/library-service";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalRef = useAccessibleModal({
    paused: showDeleteConfirm || isSubmitting,
    onClose,
  });

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

  async function handleConfirmDelete() {
    if (!initialCollection) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await deleteLibraryCollectionAndCleanReferences(initialCollection.id);
      onClose();
    } catch (err: unknown) {
      console.error("Delete collection error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-collection-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="library-collection-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>{isEditing ? "Edit Collection" : "Create Collection"}</span>
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-orbit-control border border-orbit-danger/20 bg-orbit-danger-soft p-3 text-xs text-orbit-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Collection Name */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Collection Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Computer Science, Recipes, Reading List"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Short description of this collection"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Icon
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLLECTION_ICONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`flex h-9 w-9 items-center justify-center rounded-orbit-control text-base transition-transform ${
                    icon === em
                      ? "ring-2 ring-orbit-accent bg-orbit-accent-soft scale-105"
                      : "hover:bg-orbit-surface-secondary"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Accent Color
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-8 w-8 sm:h-6 sm:w-6 rounded-full transition-transform ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-orbit-text scale-110"
                      : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-orbit-border">
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${initialCollection?.name}"?`}
        description="Entries in this collection will not be deleted, but they will no longer be associated with any collection."
        confirmLabel="Delete Collection"
        danger
        loading={isSubmitting}
      />
    </div>
  );
}
