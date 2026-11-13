"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  Star,
  AlertCircle,
  Paperclip,
  Upload,
  Eye,
  Edit3,
  FileText,
  Trash2,
} from "lucide-react";
import {
  type LibraryEntry,
  type LibraryCollection,
} from "@/lib/schemas";
import { validateLibraryFileSize } from "@/lib/schemas/library-file";
import { saveLibraryEntryWithAttachment } from "@/lib/services/library-service";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";

interface LibraryEntryModalProps {
  initialEntry?: LibraryEntry | null;
  initialType?: LibraryEntry["type"];
  collections: LibraryCollection[];
  defaultCollectionId?: string;
  onClose: () => void;
  onSaved?: (entry: LibraryEntry) => void;
}

export function LibraryEntryModal({
  initialEntry,
  initialType,
  collections,
  defaultCollectionId,
  onClose,
  onSaved,
}: LibraryEntryModalProps) {
  const modalRef = useAccessibleModal({ onClose });
  const isEditing = Boolean(initialEntry);

  const [title, setTitle] = useState(initialEntry?.title || "");
  const [type, setType] = useState<LibraryEntry["type"]>(
    initialEntry?.type || initialType || "bookmark"
  );
  const [link, setLink] = useState(initialEntry?.link || "");
  const [collectionId, setCollectionId] = useState<string>(
    initialEntry?.collectionId || defaultCollectionId || ""
  );
  const [status, setStatus] = useState<LibraryEntry["status"]>(initialEntry?.status || "saved");
  const [rating, setRating] = useState<number | undefined>(initialEntry?.rating);
  const [notes, setNotes] = useState(initialEntry?.notes || "");
  const [notesTab, setNotesTab] = useState<"edit" | "preview">("edit");
  const [tagInput, setTagInput] = useState(initialEntry?.tags?.join(", ") || "");
  const [isFavorite, setIsFavorite] = useState(initialEntry?.isFavorite || false);

  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const existingFileMetadata = initialEntry?.fileMetadata;
  const [isRemovingFile, setIsRemovingFile] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateLibraryFileSize(file.size)) {
      setError(`File "${file.name}" exceeds the maximum 20 MB size limit.`);
      return;
    }

    setError(null);
    setAttachedFile(file);
    setIsRemovingFile(false);

    // If title is empty, suggest from filename
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
    }

    // Default type to file if on bookmark or general
    if (type === "bookmark" || type === "other") {
      setType("file");
    }
  }

  function handleRemoveFile() {
    setAttachedFile(null);
    if (existingFileMetadata) {
      setIsRemovingFile(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // Process comma-separated tags
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      const parsedEntry = await saveLibraryEntryWithAttachment({
        entryData: {
          id: initialEntry?.id,
          title: title.trim(),
          notes: notes.trim(),
          link: link.trim() ? link : undefined,
          type,
          status,
          rating: rating || undefined,
          tags,
          isFavorite,
          collectionId: collectionId || undefined,
          lastViewedAt: initialEntry?.lastViewedAt,
          completedAt: initialEntry?.completedAt,
          sourceItemId: initialEntry?.sourceItemId,
          createdAt: initialEntry?.createdAt,
        },
        attachedFile,
        existingFileMetadata,
        isRemovingFile,
        isEditing,
      });

      onSaved?.(parsedEntry);
      onClose();
    } catch (err: unknown) {
      console.error("Save library entry error:", err);
      setError(err instanceof Error ? err.message : "Validation or storage error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isNoteType = type === "note";
  const activeAttachment = attachedFile
    ? {
        name: attachedFile.name,
        size: attachedFile.size,
        type: attachedFile.type || "file",
        isNew: true,
      }
    : existingFileMetadata && !isRemovingFile
    ? {
        name: existingFileMetadata.fileName,
        size: existingFileMetadata.fileSize,
        type: existingFileMetadata.fileType,
        isNew: false,
      }
    : null;

  return (
    <div className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-entry-modal-title"
        tabIndex={-1}
        className="orbit-modal-dialog max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h3 id="library-entry-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2">
            {isNoteType ? (
              <FileText className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            ) : (
              <BookOpen className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            )}
            <span>
              {isEditing
                ? isNoteType
                  ? "Edit Note"
                  : "Edit Resource"
                : isNoteType
                ? "Create Standalone Note"
                : "Add Resource"}
            </span>
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
          <div className="mt-3 flex items-center gap-2 rounded-orbit-control border border-orbit-danger/20 bg-orbit-danger-soft p-3 text-xs text-orbit-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              {isNoteType ? "Note Title *" : "Title *"}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder={
                isNoteType
                  ? "e.g. System Architecture Guidelines, Book Summary, Project Ideas"
                  : "Resource title, video heading, or bookmark name"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Type & Collection Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Resource Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LibraryEntry["type"])}
                className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
              >
                <option value="bookmark">🔖 Bookmark</option>
                <option value="note">📝 Standalone Note</option>
                <option value="article">📰 Article</option>
                <option value="video">📹 Video</option>
                <option value="playlist">📑 Playlist</option>
                <option value="learn">📚 Course / Learning</option>
                <option value="listen">🎧 Audio / Podcast</option>
                <option value="file">📎 File Document</option>
                <option value="buy">🛒 Product to Buy</option>
                <option value="other">📌 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Collection
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
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

          {/* URL / Link (Optional for notes and files) */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              {isNoteType ? "External Reference Link (Optional)" : "URL / Link"}
            </label>
            <input
              type="text"
              placeholder={
                isNoteType
                  ? "https://... (optional reference link for this note)"
                  : "https://youtube.com/watch?v=... or https://example.com"
              }
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* File Attachment Section */}
          <div className="rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary/55 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-orbit-text">
                <Paperclip className="h-3.5 w-3.5 text-orbit-accent" />
                <span>File Attachment (Max 20 MB)</span>
              </label>
              <span className="text-[10px] text-orbit-text-muted">
                PDF, images, docs, archives
              </span>
            </div>

            {activeAttachment ? (
              <div className="flex items-center justify-between gap-3 rounded-orbit-control border border-orbit-border bg-orbit-surface p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orbit-accent-soft text-orbit-accent">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-orbit-text">
                      {activeAttachment.name}
                    </p>
                    <p className="font-mono text-[10px] text-orbit-text-muted">
                      {(activeAttachment.size / 1024).toFixed(0)} KB {activeAttachment.isNew ? "· Newly selected" : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-danger-soft hover:text-orbit-danger transition-colors"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-orbit-control border border-dashed border-orbit-border-strong bg-orbit-surface py-3 px-4 text-center cursor-pointer hover:border-orbit-accent transition-colors">
                <Upload className="h-5 w-5 text-orbit-text-muted mb-1" />
                <span className="text-xs font-semibold text-orbit-accent">
                  Choose a file to attach
                </span>
                <span className="text-[10px] text-orbit-text-muted mt-0.5">
                  Stored directly in local IndexedDB (up to 20 MB)
                </span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.doc,.docx,.txt,.md,.json,.csv,.xlsx,.zip"
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Status & Rating Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Learning Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LibraryEntry["status"])}
                className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-xs text-orbit-text focus:border-orbit-accent focus:outline-hidden"
              >
                <option value="saved">Saved (Not Started)</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-orbit-text">
                Rating
              </label>
              <div className="mt-1.5 flex items-center gap-1.5 h-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} out of 5`}
                    onClick={() => setRating(rating === star ? undefined : star)}
                    className="p-1 text-orbit-border-strong hover:text-orbit-warning focus:outline-hidden transition-colors"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        rating && rating >= star
                          ? "fill-orbit-warning text-orbit-warning"
                          : "text-orbit-border-strong"
                      }`}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="ml-1 font-mono text-[11px] font-semibold text-orbit-text-muted">
                    ({rating}/5)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-orbit-text">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. react, architecture, guide, ideas"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mt-1.5 w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden"
            />
          </div>

          {/* Notes & Markdown Area (Supports up to 50k characters with Edit & Preview) */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-orbit-text">
                {isNoteType ? "Note Content (Markdown supported) *" : "Notes & Summary (Markdown supported)"}
              </label>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-orbit-text-muted">
                  {notes.length.toLocaleString()} / 50,000
                </span>

                {/* Edit / Preview Tabs */}
                <div className="flex items-center rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-0.5">
                  <button
                    type="button"
                    onClick={() => setNotesTab("edit")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      notesTab === "edit"
                        ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs"
                        : "text-orbit-text-secondary hover:text-orbit-text"
                    }`}
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesTab("preview")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      notesTab === "preview"
                        ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs"
                        : "text-orbit-text-secondary hover:text-orbit-text"
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            </div>

            {notesTab === "edit" ? (
              <textarea
                rows={isNoteType ? 8 : 4}
                placeholder={
                  isNoteType
                    ? "# Notes Header\n\nWrite detailed notes using Markdown.\n- Supports **bold**, *italic*, bullet points\n- Code blocks with ```\n- Task lists with - [ ]"
                    : "Key takeaways, summaries, thoughts, or review notes (Markdown supported)..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2.5 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden leading-relaxed resize-y font-sans"
              />
            ) : (
              <div className="min-h-28 max-h-72 overflow-y-auto rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary/50 p-4 text-xs">
                {notes.trim() ? (
                  <MarkdownContent content={notes} />
                ) : (
                  <p className="text-orbit-text-muted italic">No notes written yet. Switch to Edit to write notes.</p>
                )}
              </div>
            )}
          </div>

          {/* Favorite checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="favorite-toggle"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="h-4 w-4 rounded-md accent-[var(--orbit-accent)]"
            />
            <label
              htmlFor="favorite-toggle"
              className="text-xs font-medium text-orbit-text cursor-pointer flex items-center gap-1.5"
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  isFavorite ? "fill-orbit-warning text-orbit-warning" : "text-orbit-text-muted"
                }`}
              />
              <span>Mark as Favourite</span>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-orbit-border">
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
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : isNoteType
                ? "Save Note"
                : "Add Resource"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
