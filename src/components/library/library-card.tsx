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
  ListVideo,
} from "lucide-react";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { formatFriendlyDate } from "@/lib/utils/dates";
import { SurfaceCard } from "@/components/ui/surface-card";

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
        colorClass:
          "border-orbit-danger/20 bg-orbit-danger-soft/75 text-orbit-danger",
        accentBorder: "var(--orbit-danger)",
      };
    case "playlist":
      return {
        label: "Playlist",
        icon: ListVideo,
        colorClass:
          "border-orbit-warning/25 bg-orbit-warning-soft/80 text-orbit-warning",
        accentBorder: "var(--orbit-warning)",
      };
    case "article":
    case "read":
      return {
        label: "Article",
        icon: FileText,
        colorClass:
          "border-orbit-success/25 bg-orbit-success-soft/80 text-orbit-success",
        accentBorder: "var(--orbit-success)",
      };
    case "note":
      return {
        label: "Note",
        icon: FileText,
        colorClass:
          "border-orbit-accent/25 bg-orbit-accent-soft text-orbit-accent",
        accentBorder: "var(--orbit-accent)",
      };
    case "file":
      return {
        label: "File",
        icon: File,
        colorClass:
          "border-orbit-border-strong bg-orbit-surface-secondary text-orbit-text-secondary",
        accentBorder: "var(--orbit-border-strong)",
      };
    case "listen":
      return {
        label: "Audio",
        icon: Headphones,
        colorClass:
          "border-orbit-accent-secondary/25 bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
        accentBorder: "var(--orbit-accent-secondary)",
      };
    case "learn":
      return {
        label: "Course",
        icon: BookOpen,
        colorClass:
          "border-orbit-accent/25 bg-orbit-accent-soft/80 text-orbit-accent",
        accentBorder: "var(--orbit-accent)",
      };
    case "buy":
      return {
        label: "Buy",
        icon: ShoppingCart,
        colorClass:
          "border-orbit-warning/25 bg-orbit-warning-soft/75 text-orbit-warning",
        accentBorder: "var(--orbit-warning)",
      };
    case "bookmark":
    default:
      return {
        label: "Bookmark",
        icon: Bookmark,
        colorClass:
          "border-orbit-accent-secondary/25 bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
        accentBorder: "var(--orbit-accent-secondary)",
      };
  }
}

export function getStatusConfig(status: LibraryEntry["status"]) {
  switch (status) {
    case "in_progress":
      return {
        label: "In Progress",
        badgeClass: "bg-orbit-accent-soft text-orbit-accent",
      };
    case "completed":
      return {
        label: "Completed",
        badgeClass: "bg-orbit-success-soft text-orbit-success",
      };
    case "dropped":
      return {
        label: "Dropped",
        badgeClass: "bg-orbit-surface-secondary text-orbit-text-muted",
      };
    case "saved":
    default:
      return {
        label: "Saved",
        badgeClass: "bg-orbit-subtle text-orbit-text-secondary",
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
  const isNote = entry.type === "note";

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
    <SurfaceCard
      interactive
      padding="md"
      onClick={() => onView(entry)}
      className="group flex h-full cursor-pointer flex-col justify-between transition-all hover:border-orbit-border-strong"
      style={{ borderTop: `3px solid ${typeCfg.accentBorder}` }}
    >
      {/* Top Meta Bar */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-orbit-control border px-2 py-0.5 text-[11px] font-semibold ${typeCfg.colorClass}`}
            >
              <TypeIcon className="h-3 w-3 shrink-0" />
              <span>{typeCfg.label}</span>
            </span>

            {collection && (
              <span className="inline-flex max-w-[140px] items-center gap-1 rounded-orbit-control bg-orbit-surface-secondary px-2 py-0.5 text-[11px] font-medium text-orbit-text-secondary">
                <span aria-hidden="true">{collection.icon || "📁"}</span>
                <span className="truncate">{collection.name}</span>
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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-orbit-control transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring ${
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
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-semibold leading-snug text-orbit-text line-clamp-2 [overflow-wrap:anywhere] group-hover:text-orbit-accent transition-colors">
          {entry.title}
        </h3>

        {/* Notes preview (editorial excerpt style for standalone notes) */}
        {entry.notes && (
          <p
            className={`text-xs leading-relaxed text-orbit-text-secondary line-clamp-2 [overflow-wrap:anywhere] ${
              isNote
                ? "border-l-2 border-orbit-accent/35 pl-2.5 italic"
                : ""
            }`}
          >
            {entry.notes}
          </p>
        )}

        {/* External Link or File indicator */}
        {entry.link && (
          <div className="min-w-0 pt-0.5">
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onView(entry);
              }}
              className="inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] font-medium text-orbit-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{hostname || entry.link}</span>
            </a>
          </div>
        )}

        {entry.fileMetadata && (
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-orbit-surface-secondary/70 px-2.5 py-1.5 text-[11px] text-orbit-text-secondary">
            <Paperclip className="h-3 w-3 shrink-0 text-orbit-text-muted" />
            <span className="truncate font-medium">{entry.fileMetadata.fileName}</span>
            <span className="shrink-0 font-mono text-[10px] text-orbit-text-muted tabular-nums">
              {(entry.fileMetadata.fileSize / 1024).toFixed(0)} KB
            </span>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {entry.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-orbit-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-orbit-text-secondary [overflow-wrap:anywhere]"
              >
                #{tag}
              </span>
            ))}
            {entry.tags.length > 4 && (
              <span className="px-1 py-0.5 font-mono text-[10px] text-orbit-text-muted">
                +{entry.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-orbit-border pt-3 text-xs">
        <div className="flex items-center gap-2">
          <select
            aria-label="Reading or watching progress"
            value={entry.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(entry.id, e.target.value as LibraryEntry["status"]);
            }}
            className={`min-h-[32px] cursor-pointer rounded-orbit-control border-0 px-2 py-1 text-[11px] font-semibold focus:outline-hidden focus:ring-2 focus:ring-orbit-ring ${statusCfg.badgeClass}`}
          >
            <option value="saved">Saved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <span className="font-mono text-[10px] text-orbit-text-muted tabular-nums">
            {formatFriendlyDate(entry.createdAt.slice(0, 10))}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {entry.rating && (
            <span className="mr-1.5 font-mono text-[11px] font-semibold text-orbit-warning tabular-nums">
              ★ {entry.rating}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-surface-secondary hover:text-orbit-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring"
            title="Edit resource"
            aria-label="Edit resource"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted transition-colors hover:bg-orbit-danger-soft hover:text-orbit-danger focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring"
            title="Delete resource"
            aria-label="Delete resource"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}
