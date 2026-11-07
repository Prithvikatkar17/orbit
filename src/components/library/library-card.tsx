"use client";

import React from "react";
import {
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  Bookmark,
  Video,
  FileText,
  File,
  Headphones,
  BookOpen,
  ShoppingCart,
  Paperclip,
} from "lucide-react";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";

interface LibraryCardProps {
  entry: LibraryEntry;
  collection?: LibraryCollection;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onStatusChange: (id: string, status: LibraryEntry["status"]) => void;
  onView: (entry: LibraryEntry) => void;
}

export function getTypeConfig(type: LibraryEntry["type"]) {
  switch (type) {
    case "video":
    case "watch":
      return {
        label: "Video",
        icon: Video,
        colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
      };
    case "playlist":
      return {
        label: "Playlist",
        icon: Video,
        colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
      };
    case "article":
    case "read":
      return {
        label: "Article",
        icon: FileText,
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
      };
    case "note":
      return {
        label: "Note",
        icon: FileText,
        colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50",
      };
    case "file":
      return {
        label: "File",
        icon: File,
        colorClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      };
    case "listen":
      return {
        label: "Audio",
        icon: Headphones,
        colorClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900/50",
      };
    case "learn":
      return {
        label: "Course",
        icon: BookOpen,
        colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50",
      };
    case "buy":
      return {
        label: "Buy",
        icon: ShoppingCart,
        colorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50",
      };
    case "bookmark":
    default:
      return {
        label: "Bookmark",
        icon: Bookmark,
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
      };
  }
}

export function getStatusConfig(status: LibraryEntry["status"]) {
  switch (status) {
    case "in_progress":
      return {
        label: "In Progress",
        badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
      };
    case "completed":
      return {
        label: "Completed",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "dropped":
      return {
        label: "Dropped",
        badgeClass: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
      };
    case "saved":
    default:
      return {
        label: "Saved",
        badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400",
      };
  }
}

export function LibraryCard({
  entry,
  collection,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStatusChange,
  onView,
}: LibraryCardProps) {
  const typeCfg = getTypeConfig(entry.type);
  const statusCfg = getStatusConfig(entry.status);
  const TypeIcon = typeCfg.icon;

  const hostname = entry.link
    ? (() => {
        try {
          return new URL(entry.link).hostname.replace(/^www\./, "");
        } catch {
          return "link";
        }
      })()
    : null;

  return (
    <div
      onClick={() => onView(entry)}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900/60 cursor-pointer"
    >
      {/* Top Meta Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Type Badge & Collection */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${typeCfg.colorClass}`}
            >
              <TypeIcon className="h-3 w-3" />
              <span>{typeCfg.label}</span>
            </span>

            {collection && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <span>{collection.icon || "📁"}</span>
                <span className="truncate max-w-[100px]">{collection.name}</span>
              </span>
            )}
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.id, entry.isFavorite);
            }}
            className={`rounded-lg p-1.5 transition-colors ${
              entry.isFavorite
                ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
            aria-label="Toggle favourite"
          >
            <Star
              className={`h-4 w-4 ${entry.isFavorite ? "fill-amber-500" : ""}`}
            />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {entry.title}
        </h3>

        {/* Notes preview */}
        {entry.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {entry.notes}
          </p>
        )}

        {/* External Link or File indicator */}
        {entry.link && (
          <div className="pt-0.5">
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onView(entry);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400 truncate max-w-full"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{hostname || entry.link}</span>
            </a>
          </div>
        )}

        {entry.fileMetadata && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Paperclip className="h-3 w-3 text-slate-400" />
            <span className="truncate">{entry.fileMetadata.fileName}</span>
            <span className="text-[10px] text-slate-400">
              ({(entry.fileMetadata.fileSize / 1024).toFixed(0)} KB)
            </span>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {/* Status Dropdown / Cycle button */}
        <select
          value={entry.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(entry.id, e.target.value as LibraryEntry["status"]);
          }}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold border-0 cursor-pointer focus:outline-hidden ${statusCfg.badgeClass}`}
        >
          <option value="saved">Saved</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
        </select>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {entry.rating && (
            <span className="mr-1 text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
              ★ {entry.rating}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit resource"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Delete resource"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
