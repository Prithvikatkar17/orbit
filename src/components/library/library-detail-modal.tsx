"use client";

import React from "react";
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
} from "lucide-react";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { getTypeConfig, getStatusConfig } from "./library-card";
import { formatFriendlyDate } from "@/lib/utils/dates";

interface LibraryDetailModalProps {
  entry: LibraryEntry | null;
  collection?: LibraryCollection;
  onClose: () => void;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onStatusChange: (id: string, status: LibraryEntry["status"]) => void;
}

export function LibraryDetailModal({
  entry,
  collection,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStatusChange,
}: LibraryDetailModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin animate-in zoom-in-95 duration-150"
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
              className={`rounded-lg p-2 transition-colors ${
                entry.isFavorite
                  ? "text-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Star
                className={`h-4 w-4 ${entry.isFavorite ? "fill-amber-500" : ""}`}
              />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
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

        {/* File Metadata Banner */}
        {entry.fileMetadata && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            <Paperclip className="h-4 w-4 text-slate-500" />
            <span className="font-semibold">{entry.fileMetadata.fileName}</span>
            <span className="text-slate-400">
              ({(entry.fileMetadata.fileSize / 1024).toFixed(0)} KB · {entry.fileMetadata.fileType})
            </span>
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

        {/* Notes & Summary Section */}
        {entry.notes ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Notes & Summary
            </h4>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {entry.notes}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
            No notes or takeaways recorded yet.
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
              <span>Edit Resource</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

