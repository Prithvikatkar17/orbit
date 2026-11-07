"use client";

import React from "react";
import {
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  Paperclip,
} from "lucide-react";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { getTypeConfig, getStatusConfig } from "./library-card";
import { formatFriendlyDate } from "@/lib/utils/dates";

interface LibraryRowProps {
  entry: LibraryEntry;
  collection?: LibraryCollection;
  onEdit: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onStatusChange: (id: string, status: LibraryEntry["status"]) => void;
  onView: (entry: LibraryEntry) => void;
}

export function LibraryRow({
  entry,
  collection,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStatusChange,
  onView,
}: LibraryRowProps) {
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
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-indigo-300 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900/60 cursor-pointer"
    >
      {/* Left Column: Icon, Title, Link, Collection */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Type Icon Badge */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${typeCfg.colorClass}`}
          title={typeCfg.label}
        >
          <TypeIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {entry.title}
            </h4>

            {collection && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <span>{collection.icon || "📁"}</span>
                <span className="truncate max-w-[90px]">{collection.name}</span>
              </span>
            )}

            {entry.fileMetadata && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{entry.fileMetadata.fileName}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(entry);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400 truncate max-w-[200px]"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{hostname || entry.link}</span>
              </a>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
                {entry.tags.length > 3 && (
                  <span className="text-[9px] text-slate-400">
                    +{entry.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status, Favorite, Added date, Action icons */}
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        {/* Status Dropdown */}
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

        {entry.rating && (
          <span className="text-[11px] font-bold text-amber-500">
            ★ {entry.rating}
          </span>
        )}

        {/* Favorite Star Button */}
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
        >
          <Star className={`h-4 w-4 ${entry.isFavorite ? "fill-amber-500" : ""}`} />
        </button>

        {/* Date stamp */}
        <span className="hidden md:inline-block text-[11px] text-slate-400 min-w-[70px] text-right">
          {formatFriendlyDate(entry.createdAt.slice(0, 10))}
        </span>

        {/* Edit and Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit"
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
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

