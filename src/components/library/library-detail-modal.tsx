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
import { Button } from "@/components/ui/button";
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
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation & Type Badge */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-orbit-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-orbit-control border px-2.5 py-1 text-xs font-semibold ${typeCfg.colorClass}`}
            >
              <TypeIcon className="h-3.5 w-3.5" />
              <span>{typeCfg.label}</span>
            </span>

            {collection && (
              <span className="inline-flex items-center gap-1.5 rounded-orbit-control bg-orbit-surface-secondary px-2.5 py-1 text-xs font-medium text-orbit-text-secondary">
                <Folder className="h-3.5 w-3.5 text-orbit-text-muted" />
                <span aria-hidden="true">{collection.icon || "📁"}</span>
                <span>{collection.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Toggle Favorite */}
            <button
              type="button"
              onClick={() => onToggleFavorite(entry.id, entry.isFavorite)}
              className={`flex h-10 w-10 items-center justify-center rounded-orbit-control transition-colors ${
                entry.isFavorite
                  ? "bg-orbit-warning-soft text-orbit-warning"
                  : "text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text"
              }`}
              title={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
              aria-label={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
              aria-pressed={entry.isFavorite}
            >
              <Star
                className={`h-4 w-4 ${entry.isFavorite ? "fill-current" : ""}`}
              />
            </button>

            {/* Close Button */}
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <h2 id="library-detail-modal-title" className="font-display text-xl font-semibold text-orbit-text leading-snug [overflow-wrap:anywhere]">
            {entry.title}
          </h2>
        </div>

        {/* Link / URL Banner */}
        {entry.link && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary/70 p-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0 text-orbit-accent" />
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium text-orbit-text truncate">
                  {hostname}
                </p>
                <p className="text-[11px] text-orbit-text-muted [overflow-wrap:anywhere] line-clamp-1">
                  {entry.link}
                </p>
              </div>
            </div>
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-orbit-control bg-orbit-accent px-3 py-1.5 text-xs font-semibold text-orbit-accent-fg shadow-orbit-xs hover:bg-orbit-accent-hover transition-colors shrink-0"
            >
              <span>Open Link</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* File Attachment Card */}
        {entry.fileMetadata && (
          <div className="mt-3 rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-4 w-4 shrink-0 text-orbit-text-muted" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-orbit-text truncate">
                    {entry.fileMetadata.fileName}
                  </p>
                  <p className="font-mono text-[11px] text-orbit-text-muted">
                    {(entry.fileMetadata.fileSize / 1024).toFixed(0)} KB · {entry.fileMetadata.fileType}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Attachment */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isLoadingFile ? (
                  <span className="inline-flex items-center gap-1 text-xs text-orbit-text-muted py-1.5 px-2">
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
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface px-2.5 py-1.5 text-xs font-semibold text-orbit-text hover:bg-orbit-surface-secondary transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview PDF</span>
                      </a>
                    )}
                    <a
                      href={fileUrl}
                      download={entry.fileMetadata.fileName}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-orbit-control bg-orbit-accent px-3 py-1.5 text-xs font-semibold text-orbit-accent-fg shadow-orbit-xs hover:bg-orbit-accent-hover transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                ) : fileLoadError ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orbit-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>File unavailable</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Inline Image Preview */}
            {isImageFile && fileUrl && (
              <div className="mt-2 overflow-hidden rounded-orbit-control border border-orbit-border bg-orbit-surface p-2 text-center">
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
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary/50">
          <div>
            <label className="block text-[11px] font-semibold text-orbit-text-muted uppercase tracking-wider">
              Learning Status
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                value={entry.status}
                onChange={(e) => onStatusChange(entry.id, e.target.value as LibraryEntry["status"])}
                className={`min-h-[34px] rounded-orbit-control px-2.5 py-1.5 text-xs font-semibold border-0 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orbit-ring ${statusCfg.badgeClass}`}
              >
                <option value="saved">Saved (Not Started)</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-orbit-text-muted uppercase tracking-wider">
              Rating
            </label>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    entry.rating && entry.rating >= star
                      ? "fill-orbit-warning text-orbit-warning"
                      : "text-orbit-border-strong"
                  }`}
                />
              ))}
              <span className="ml-1 font-mono text-xs font-semibold text-orbit-text-secondary">
                {entry.rating ? `${entry.rating} / 5` : "Unrated"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Content Section */}
        {entry.notes ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-orbit-text-muted">
              {entry.type === "note" ? "Note Content" : "Notes & Summary"}
            </h4>
            <div
              ref={noteContainerRef}
              tabIndex={focusNote ? 0 : undefined}
              className={`max-h-80 overflow-y-auto rounded-orbit-card border p-4 text-xs leading-relaxed font-sans scrollbar-thin transition-all ${
                focusNote
                  ? "border-orbit-accent ring-2 ring-orbit-ring bg-orbit-accent-soft/25 text-orbit-text"
                  : "border-orbit-border bg-orbit-surface-secondary/45 text-orbit-text"
              }`}
            >
              <MarkdownContent content={entry.notes} />
            </div>
          </div>
        ) : (
          <div
            ref={noteContainerRef}
            className={`mt-4 rounded-orbit-card border border-dashed p-4 text-center text-xs transition-all ${
              focusNote
                ? "border-orbit-accent bg-orbit-accent-soft/25 text-orbit-accent"
                : "border-orbit-border text-orbit-text-muted"
            }`}
          >
            {entry.type === "note" ? "Empty note." : "No notes or takeaways recorded yet."}
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orbit-text-muted">
              <Tag className="h-3.5 w-3.5" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-orbit-control bg-orbit-accent-soft px-2 py-0.5 text-xs font-medium text-orbit-accent"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps & Audit Metadata */}
        <div className="mt-5 pt-4 border-t border-orbit-border grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-orbit-text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Added {formatFriendlyDate(entry.createdAt.slice(0, 10))}</span>
          </div>

          {entry.lastViewedAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Viewed {formatFriendlyDate(entry.lastViewedAt.slice(0, 10))}</span>
            </div>
          )}

          {entry.completedAt && (
            <div className="flex items-center gap-1.5 text-orbit-success">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Completed {formatFriendlyDate(entry.completedAt.slice(0, 10))}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-orbit-border">
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => {
              onClose();
              onDelete(entry.id);
            }}
          >
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
            >
              {entry.type === "note" ? "Edit Note" : "Edit Resource"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
