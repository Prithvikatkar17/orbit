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
import { db } from "@/lib/db/client";
import {
  type LibraryEntry,
  LibraryEntrySchema,
  type LibraryCollection,
} from "@/lib/schemas";
import { validateLibraryFileSize } from "@/lib/schemas/library-file";
import { normalizeUrl } from "@/lib/utils/dates";
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

    const nowIso = new Date().toISOString();
    const id = initialEntry?.id || crypto.randomUUID();

    // Process comma-separated tags
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      // 1. Handle file attachment in Dexie libraryFiles table
      let resolvedFileMetadata = isRemovingFile ? undefined : existingFileMetadata;

      if (attachedFile) {
        const fileId = crypto.randomUUID();
        resolvedFileMetadata = {
          fileId,
          fileName: attachedFile.name,
          fileType: attachedFile.type || "application/octet-stream",
          fileSize: attachedFile.size,
        };

        // Binary storage into libraryFiles table
        await db.libraryFiles.put({
          id: fileId,
          entryId: id,
          fileName: attachedFile.name,
          fileType: attachedFile.type || "application/octet-stream",
          fileSize: attachedFile.size,
          data: attachedFile,
          createdAt: nowIso,
        });
      } else if (isRemovingFile && initialEntry?.id) {
        await db.libraryFiles.where("entryId").equals(initialEntry.id).delete();
      }

      // 2. Validate and persist library entry metadata
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
        fileMetadata: resolvedFileMetadata,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {isNoteType ? (
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
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

          {/* URL / Link (Optional for notes and files) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* File Attachment Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>File Attachment (Max 20 MB)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                PDF, images, docs, archives
              </span>
            </div>

            {activeAttachment ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {activeAttachment.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(activeAttachment.size / 1024).toFixed(0)} KB {activeAttachment.isNew ? "· Newly selected" : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  title="Remove attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-3 px-4 text-center cursor-pointer hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900/60 transition-colors">
                <Upload className="h-5 w-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Choose a file to attach
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
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
              placeholder="e.g. react, architecture, guide, ideas"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Notes & Markdown Area (Supports up to 50k characters with Edit & Preview) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isNoteType ? "Note Content (Markdown supported) *" : "Notes & Summary (Markdown supported)"}
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {notes.length.toLocaleString()} / 50,000
                </span>

                {/* Edit / Preview Tabs */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setNotesTab("edit")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      notesTab === "edit"
                        ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
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
                        ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white leading-relaxed resize-y font-sans"
              />
            ) : (
              <div className="min-h-28 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                {notes.trim() ? (
                  <MarkdownContent content={notes} />
                ) : (
                  <p className="text-slate-400 italic">No notes written yet. Switch to Edit to write notes.</p>
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
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : isNoteType
                ? "Save Note"
                : "Add Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
