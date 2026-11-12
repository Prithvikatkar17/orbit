"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  Star,
  Edit2,
  Trash2,
  Paperclip,
  Calendar,
  Clock,
  CheckCircle2,
  Tag,
  Folder,
  Download,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { db } from "@/lib/db/client";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { getTypeConfig, getStatusConfig } from "./library-card";
import { formatFriendlyDate } from "@/lib/utils/dates";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { MarkdownContent } from "./markdown-content";

interface LibraryDetailModalProps {
  entry: LibraryEntry | null;
  collection?: LibraryCollection;
  focusNote?: boolean;
  onClose: () => void;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onStatusChange: (id: string, status: LibraryEntry["status"]) => void;
}

export function LibraryDetailModal({
  entry,
  collection,
  focusNote,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStatusChange,
}: LibraryDetailModalProps) {
  const modalRef = useAccessibleModal({ isOpen: Boolean(entry), onClose });
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);
  const noteContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusNote && noteContainerRef.current) {
      const timer = setTimeout(() => {
        noteContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [focusNote]);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadAttachment() {
      if (!entry?.fileMetadata) {
        setFileUrl(null);
        setFileLoadError(null);
        return;
      }

      setIsLoadingFile(true);
      setFileLoadError(null);

      try {
        let file = await db.libraryFiles.get(entry.fileMetadata.fileId);
        if (!file && entry.id) {
          file = await db.libraryFiles.where("entryId").equals(entry.id).first();
        }

        if (!active) return;

        if (file && file.data) {
          const blob =
            file.data instanceof Blob
              ? file.data
              : new Blob([file.data], { type: file.fileType || entry.fileMetadata.fileType });
          createdUrl = URL.createObjectURL(blob);
          setFileUrl(createdUrl);
        } else {
          setFileLoadError("Attachment file binary is missing from local storage.");
        }
      } catch (err) {
        if (active) {
          console.error("Error loading attachment file:", err);
          setFileLoadError("Could not retrieve attachment from database.");
        }
      } finally {
        if (active) {
          setIsLoadingFile(false);
        }
      }
    }

    loadAttachment();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [entry?.id, entry?.fileMetadata]);

  if (!entry) return null;

  const typeCfg = getTypeConfig(entry.type);
  const statusCfg = getStatusConfig(entry.status);
  const TypeIcon = typeCfg.icon;

  const hostname = entry.link
    ? (() => {
        try {
          return new URL(entry.link).hostname.replace(/^www\./, "");
        } catch {
          return "external link";
        }
      })()
    : null;

  const isImageFile =
    Boolean(entry.fileMetadata?.fileType?.startsWith("image/")) ||
    Boolean(entry.fileMetadata?.fileName?.match(/\.(png|jpe?g|gif|webp|svg)$/i));

  const isPdfFile =
    entry.fileMetadata?.fileType === "application/pdf" ||
    Boolean(entry.fileMetadata?.fileName?.match(/\.pdf$/i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-detail-modal-title"
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl outline-hidden dark:border-slate-800 dark:bg-slate-900 scrollbar-thin animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation & Type Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${typeCfg.colorClass}`}
            >
              <TypeIcon className="h-3.5 w-3.5" />
              <span>{typeCfg.label}</span>
            </span>

            {collection && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Folder className="h-3.5 w-3.5 text-slate-400" />
                <span>{collection.icon || "📁"}</span>
                <span>{collection.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Favorite */}
            <button
              type="button"
              onClick={() => onToggleFavorite(entry.id, entry.isFavorite)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                entry.isFavorite
                  ? "text-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
              aria-label={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
              aria-pressed={entry.isFavorite}
            >
              <Star
                className={`h-4 w-4 ${entry.isFavorite ? "fill-amber-500" : ""}`}
              />
            </button>

            {/* Close Button */}
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <h2 id="library-detail-modal-title" className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
            {entry.title}
          </h2>
        </div>

        {/* Link / URL Banner */}
        {entry.link && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950/60 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2 min-w-0">
              <ExternalLink className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {hostname}
              </span>
            </div>
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-colors shrink-0"
            >
              <span>Open Link</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* File Attachment Card */}
        {entry.fileMetadata && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {entry.fileMetadata.fileName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(entry.fileMetadata.fileSize / 1024).toFixed(0)} KB · {entry.fileMetadata.fileType}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Attachment */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isLoadingFile ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 py-1.5 px-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading...</span>
                  </span>
                ) : fileUrl ? (
                  <>
                    {isPdfFile && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview PDF</span>
                      </a>
                    )}
                    <a
                      href={fileUrl}
                      download={entry.fileMetadata.fileName}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                ) : fileLoadError ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>File unavailable</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Inline Image Preview */}
            {isImageFile && fileUrl && (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt={entry.fileMetadata.fileName}
                  className="max-h-64 mx-auto rounded-md object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* Status, Rating & Progress Row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Learning Status
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                value={entry.status}
                onChange={(e) => onStatusChange(entry.id, e.target.value as LibraryEntry["status"])}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold border-0 cursor-pointer focus:outline-hidden ${statusCfg.badgeClass}`}
              >
                <option value="saved">Saved (Not Started)</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rating
            </label>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    entry.rating && entry.rating >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {entry.rating ? `${entry.rating} / 5` : "Unrated"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Content Section */}
        {entry.notes ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {entry.type === "note" ? "Note Content" : "Notes & Summary"}
            </h4>
            <div
              ref={noteContainerRef}
              tabIndex={focusNote ? 0 : undefined}
              className={`max-h-80 overflow-y-auto rounded-xl border p-4 text-xs leading-relaxed font-sans scrollbar-thin transition-all ${
                focusNote
                  ? "border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/20 text-slate-900 dark:text-slate-100"
                  : "border-slate-100 bg-slate-50/60 text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
              }`}
            >
              <MarkdownContent content={entry.notes} />
            </div>
          </div>
        ) : (
          <div
            ref={noteContainerRef}
            className={`mt-4 rounded-xl border border-dashed p-4 text-center text-xs transition-all ${
              focusNote
                ? "border-indigo-400 bg-indigo-50/20 text-indigo-700 dark:border-indigo-500 dark:text-indigo-300"
                : "border-slate-200 text-slate-400 dark:border-slate-800"
            }`}
          >
            {entry.type === "note" ? "Empty note." : "No notes or takeaways recorded yet."}
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps & Audit Metadata */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Added {formatFriendlyDate(entry.createdAt.slice(0, 10))}</span>
          </div>

          {entry.lastViewedAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Viewed {formatFriendlyDate(entry.lastViewedAt.slice(0, 10))}</span>
            </div>
          )}

          {entry.completedAt && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Completed {formatFriendlyDate(entry.completedAt.slice(0, 10))}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(entry.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>{entry.type === "note" ? "Edit Note" : "Edit Resource"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
