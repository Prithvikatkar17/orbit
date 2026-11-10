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

    // Highlighted match
    elements.push(
      <mark
        key={`mark-${i}-${interval.start}`}
        className="rounded bg-amber-200/90 px-0.5 font-bold text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 not-italic"
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
    <p className="mt-1 line-clamp-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
      {before}
      <mark className="rounded bg-amber-200/90 px-0.5 font-bold text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 not-italic">
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

  // Module iconography & styling
  const { icon, badgeClass, containerBg } = (() => {
    switch (item.module) {
      case "task":
        return {
          icon: <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
          badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
          containerBg: "bg-indigo-50/50 dark:bg-indigo-950/30",
        };
      case "goal":
        return {
          icon: <Target className="h-4 w-4 text-pink-600 dark:text-pink-400" />,
          badgeClass: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
          containerBg: "bg-pink-50/50 dark:bg-pink-950/30",
        };
      case "note":
        return {
          icon: <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
          badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
          containerBg: "bg-purple-50/50 dark:bg-purple-950/30",
        };
      case "library":
        return {
          icon: <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
          containerBg: "bg-emerald-50/50 dark:bg-emerald-950/30",
        };
      case "file":
        return {
          icon: <Paperclip className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
          containerBg: "bg-amber-50/50 dark:bg-amber-950/30",
        };
      case "habit":
        return {
          icon: <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
          badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
          containerBg: "bg-violet-50/50 dark:bg-violet-950/30",
        };
      case "event":
        return {
          icon: <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
          badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
          containerBg: "bg-blue-50/50 dark:bg-blue-950/30",
        };
      case "inbox":
        return {
          icon: <Inbox className="h-4 w-4 text-slate-600 dark:text-slate-400" />,
          badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          containerBg: "bg-slate-100/50 dark:bg-slate-800/30",
        };
      case "collection":
        return {
          icon: <Folder className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
          badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
          containerBg: "bg-cyan-50/50 dark:bg-cyan-950/30",
        };
    }
  })();

  const titleHighlight = item.highlights.find((h) => h.field === "title");

  return (
    <button
      ref={itemRef}
      type="button"
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      className={`group w-full text-left rounded-xl p-3 transition-colors flex items-start gap-3 select-none ${
        isSelected
          ? "bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-500/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      {/* Icon Capsule */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-colors ${containerBg}`}
      >
        {icon}
      </div>

      {/* Main Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            <HighlightedText
              text={item.title}
              offsets={titleHighlight?.offsets}
            />
          </span>

          {item.badge && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 ${badgeClass}`}
            >
              {item.badge}
            </span>
          )}
        </div>

        {/* Subtitle if present */}
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {item.subtitle}
          </p>
        )}

        {/* Contextual snippet for matching notes/descriptions */}
        {item.snippet && <HighlightedSnippet snippet={item.snippet} />}
      </div>

      {/* Enter Action Indicator (visible when selected) */}
      <div
        className={`shrink-0 flex items-center gap-1 text-[11px] font-medium transition-opacity ${
          isSelected
            ? "opacity-100 text-indigo-600 dark:text-indigo-400"
            : "opacity-0"
        }`}
      >
        <span className="hidden sm:inline">Open</span>
        <CornerDownLeft className="h-3 w-3" />
      </div>
    </button>
  );
}

