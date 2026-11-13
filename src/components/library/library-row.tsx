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
import { SurfaceCard } from "@/components/ui/surface-card";

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
    <SurfaceCard
      interactive
      padding="sm"
      onClick={() => onView(entry)}
      className="group flex cursor-pointer flex-col gap-3 transition-all hover:border-orbit-border-strong md:flex-row md:items-center md:justify-between"
    >
      {/* Left Column: Icon, Title, Link, Collection */}
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-orbit-control border ${typeCfg.colorClass}`}
          title={typeCfg.label}
        >
          <TypeIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-sm font-semibold text-orbit-text [overflow-wrap:anywhere] group-hover:text-orbit-accent transition-colors">
              {entry.title}
            </h4>

            {collection && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-orbit-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-orbit-text-secondary">
                <span aria-hidden="true">{collection.icon || "📁"}</span>
                <span className="max-w-[110px] truncate">{collection.name}</span>
              </span>
            )}

            {entry.fileMetadata && (
              <span className="inline-flex min-w-0 items-center gap-1 font-mono text-[10px] text-orbit-text-muted">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="max-w-[140px] truncate">{entry.fileMetadata.fileName}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-orbit-text-secondary">
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(entry);
                }}
                className="inline-flex max-w-[240px] items-center gap-1 font-mono text-[11px] font-medium text-orbit-accent hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{hostname || entry.link}</span>
              </a>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-orbit-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-orbit-text-secondary"
                  >
                    #{tag}
                  </span>
                ))}
                {entry.tags.length > 3 && (
                  <span className="font-mono text-[10px] text-orbit-text-muted">
                    +{entry.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status, Favorite, Added date, Action icons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orbit-border/60 pt-2 md:border-t-0 md:pt-0 md:justify-end shrink-0">
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

          {entry.rating && (
            <span className="font-mono text-[11px] font-semibold text-orbit-warning tabular-nums">
              ★ {entry.rating}
            </span>
          )}

          <span className="hidden font-mono text-[11px] text-orbit-text-muted tabular-nums lg:inline">
            {formatFriendlyDate(entry.createdAt.slice(0, 10))}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.id, entry.isFavorite);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-orbit-control transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring ${
              entry.isFavorite
                ? "bg-orbit-warning-soft text-orbit-warning"
                : "text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text"
            }`}
            title={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
            aria-label={entry.isFavorite ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={entry.isFavorite}
          >
            <Star className={`h-4 w-4 ${entry.isFavorite ? "fill-current" : ""}`} />
          </button>

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
