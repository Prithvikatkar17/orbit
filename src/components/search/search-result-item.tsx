"use client";

import React, { useEffect, useRef } from "react";
import {
  CheckSquare,
  Target,
  FileText,
  BookOpen,
  Paperclip,
  Repeat,
  Calendar,
  Inbox,
  Folder,
  CornerDownLeft,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type {
  SearchResultItem as SearchResultItemType,
  SearchSnippet,
  TextHighlightOffset,
} from "@/lib/services/search-service";

interface SearchResultItemProps {
  item: SearchResultItemType;
  isSelected: boolean;
  onSelect: (item: SearchResultItemType) => void;
  onMouseEnter: () => void;
}

/**
 * Safely renders text with highlighted substrings based on character offsets.
 * Strictly avoids injecting unescaped HTML strings.
 */
function HighlightedText({
  text,
  offsets,
}: {
  text: string;
  offsets?: TextHighlightOffset[];
}) {
  if (!offsets || offsets.length === 0) {
    return <span>{text}</span>;
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  offsets.forEach((interval, i) => {
    // Normal text before match
    if (interval.start > lastIndex) {
      elements.push(
        <span key={`plain-${i}-${lastIndex}`}>
          {text.substring(lastIndex, interval.start)}
        </span>
      );
    }

    // Highlighted match - warm paper editorial highlighter
    elements.push(
      <mark
        key={`mark-${i}-${interval.start}`}
        className="rounded bg-orbit-warning/20 px-0.5 font-semibold text-orbit-text not-italic"
      >
        {text.substring(interval.start, interval.end)}
      </mark>
    );

    lastIndex = interval.end;
  });

  // Remaining normal text
  if (lastIndex < text.length) {
    elements.push(
      <span key={`tail-${lastIndex}`}>{text.substring(lastIndex)}</span>
    );
  }

  return <span>{elements}</span>;
}

/**
 * Safely renders snippet text with highlighted matched portion.
 */
function HighlightedSnippet({ snippet }: { snippet: SearchSnippet }) {
  const before = snippet.text.substring(0, snippet.matchStart);
  const match = snippet.text.substring(snippet.matchStart, snippet.matchEnd);
  const after = snippet.text.substring(snippet.matchEnd);

  return (
    <p className="mt-1 line-clamp-2 text-[11px] font-mono text-orbit-text-muted">
      {before}
      <mark className="rounded bg-orbit-warning/20 px-0.5 font-semibold text-orbit-text not-italic">
        {match}
      </mark>
      {after}
    </p>
  );
}

export function SearchResultItem({
  item,
  isSelected,
  onSelect,
  onMouseEnter,
}: SearchResultItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll into view when selected via arrow keys
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [isSelected]);

  // Module iconography & styling using Quiet Desk semantic palette
  const { icon, badgeVariant, containerBg } = (() => {
    switch (item.module) {
      case "task":
        return {
          icon: <CheckSquare className="h-4 w-4 text-orbit-accent" />,
          badgeVariant: "accent" as BadgeVariant,
          containerBg: "bg-orbit-accent-soft text-orbit-accent",
        };
      case "goal":
        return {
          icon: <Target className="h-4 w-4 text-orbit-warning" />,
          badgeVariant: "warning" as BadgeVariant,
          containerBg: "bg-orbit-warning-soft text-orbit-warning",
        };
      case "note":
        return {
          icon: <FileText className="h-4 w-4 text-orbit-accent-secondary" />,
          badgeVariant: "info" as BadgeVariant,
          containerBg: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
        };
      case "library":
        return {
          icon: <BookOpen className="h-4 w-4 text-orbit-accent" />,
          badgeVariant: "accent" as BadgeVariant,
          containerBg: "bg-orbit-accent-soft text-orbit-accent",
        };
      case "file":
        return {
          icon: <Paperclip className="h-4 w-4 text-orbit-text-secondary" />,
          badgeVariant: "neutral" as BadgeVariant,
          containerBg: "bg-orbit-subtle text-orbit-text-secondary",
        };
      case "habit":
        return {
          icon: <Repeat className="h-4 w-4 text-orbit-accent-secondary" />,
          badgeVariant: "info" as BadgeVariant,
          containerBg: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
        };
      case "event":
        return {
          icon: <Calendar className="h-4 w-4 text-orbit-warning" />,
          badgeVariant: "warning" as BadgeVariant,
          containerBg: "bg-orbit-warning-soft text-orbit-warning",
        };
      case "inbox":
        return {
          icon: <Inbox className="h-4 w-4 text-orbit-text-secondary" />,
          badgeVariant: "neutral" as BadgeVariant,
          containerBg: "bg-orbit-subtle text-orbit-text-secondary",
        };
      case "collection":
        return {
          icon: <Folder className="h-4 w-4 text-orbit-accent-secondary" />,
          badgeVariant: "info" as BadgeVariant,
          containerBg: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
        };
    }
  })();

  const titleHighlight = item.highlights.find((h) => h.field === "title");

  return (
    <button
      ref={itemRef}
      id={`search-option-${item.id}`}
      role="option"
      aria-selected={isSelected}
      type="button"
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      className={`group w-full text-left rounded-lg p-2.5 sm:p-3 min-h-[48px] sm:min-h-[44px] transition-all flex items-start gap-2.5 sm:gap-3 select-none relative focus:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-accent ${
        isSelected
          ? "bg-orbit-surface-secondary border border-orbit-border shadow-orbit-xs"
          : "hover:bg-orbit-subtle/80 border border-transparent"
      }`}
    >
      {/* Left Active Accent Pill */}
      {isSelected && (
        <span
          className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-orbit-accent"
          aria-hidden="true"
        />
      )}

      {/* Icon Capsule */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md mt-0.5 border border-orbit-border/40 transition-colors ${containerBg}`}
      >
        {icon}
      </div>

      {/* Main Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-orbit-text truncate">
            <HighlightedText
              text={item.title}
              offsets={titleHighlight?.offsets}
            />
          </span>

          {item.badge && (
            <Badge variant={badgeVariant} className="capitalize shrink-0">
              {item.badge}
            </Badge>
          )}
        </div>

        {/* Subtitle if present */}
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-orbit-text-secondary truncate">
            {item.subtitle}
          </p>
        )}

        {/* Contextual snippet for matching notes/descriptions */}
        {item.snippet && <HighlightedSnippet snippet={item.snippet} />}
      </div>

      {/* Enter Action Indicator (visible when selected) */}
      <div
        className={`shrink-0 flex items-center gap-1 font-mono text-[11px] font-medium transition-opacity ${
          isSelected
            ? "opacity-100 text-orbit-accent"
            : "opacity-0"
        }`}
      >
        <span className="hidden sm:inline">Open</span>
        <CornerDownLeft className="h-3 w-3" />
      </div>
    </button>
  );
}
