"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Clock,
  SearchX,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { useSearchStore, type SearchFilterTab } from "@/lib/stores/search-store";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  executeUniversalSearch,
  warmSearchIndex,
  type SearchResultItem as SearchResultItemType,
  type SearchResultsGrouped,
} from "@/lib/services/search-service";
import { SearchResultItem } from "./search-result-item";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { useMounted } from "@/lib/utils/dates";

const FILTER_TABS: { id: SearchFilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "task", label: "Tasks" },
  { id: "goal", label: "Goals" },
  { id: "note", label: "Notes" },
  { id: "library", label: "Library" },
  { id: "file", label: "Files" },
  { id: "habit", label: "Habits" },
  { id: "event", label: "Calendar" },
  { id: "inbox", label: "Inbox" },
  { id: "collection", label: "Collections" },
];

const EMPTY_SEARCH_RESULTS: SearchResultsGrouped = {
  query: "",
  totalMatches: 0,
  items: [],
  groups: [],
};

export function SearchModal() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const { themePersonality } = useThemePersonality();
  const mounted = useMounted();

  const isMinimalist = mounted && themePersonality === "minimalist";
  const isMidnight = mounted && themePersonality === "midnight";
  const isFuturistic = mounted && themePersonality === "futuristic";
  const isArchivist = mounted && themePersonality === "archivist";
  const isNaturalist = mounted && themePersonality === "naturalist";
  const isArtistic = mounted && themePersonality === "artistic";
  const isAesthetic = mounted && themePersonality === "aesthetic";

  const dialogRadiusClass = isMinimalist
    ? "rounded-none border-black/30 dark:border-white/30 shadow-none"
    : isFuturistic
    ? "rounded-[12px] border-[#00f0ff]/30 shadow-orbit-elevated"
    : isArchivist
    ? "rounded-[14px] border-[#b89758]/50 shadow-orbit-elevated"
    : isMidnight
    ? "rounded-[20px] border-[#1e1b4b] shadow-orbit-elevated"
    : isNaturalist || isArtistic
    ? "rounded-[24px] shadow-orbit-elevated"
    : "rounded-2xl border-orbit-border shadow-orbit-elevated";

  const {
    isSearchOpen,
    query,
    activeFilter,
    selectedIndex,
    recentSearches,
    openSearch,
    closeSearch,
    setQuery,
    setActiveFilter,
    setSelectedIndex,
    addRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
  } = useSearchStore();

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [searchResults, setSearchResults] = useState<SearchResultsGrouped>(EMPTY_SEARCH_RESULTS);
  const [selectedRecentIndex, setSelectedRecentIndex] = useState(-1);

  const trimmedQuery = debouncedQuery.trim();
  const activeSearchResults = trimmedQuery ? searchResults : EMPTY_SEARCH_RESULTS;
  const isSearching = Boolean(trimmedQuery && activeSearchResults.query !== trimmedQuery);

  // Save active element when opening and restore upon closing; focus input immediately
  useEffect(() => {
    if (isSearchOpen) {
      if (typeof document !== "undefined") {
        previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      // Non-blocking idle warm-up of staged index
      warmSearchIndex(db).catch(() => {});
    } else {
      previousActiveElementRef.current?.focus?.();
    }
  }, [isSearchOpen]);

  // Debounce query updates (100ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 100);
    return () => clearTimeout(timer);
  }, [query]);

  // Global Keyboard shortcut listener for Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+K / Cmd+K (without Shift): Toggle Universal Search
      if (isModifier && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchOpen = useSearchStore.getState().isSearchOpen;
        const quickCaptureOpen = useUIStore.getState().quickCaptureOpen;

        // If Quick Capture is open, do not open search on top of it
        if (quickCaptureOpen) return;

        if (searchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      // Escape: Close search modal if open
      if (e.key === "Escape" && useSearchStore.getState().isSearchOpen) {
        e.preventDefault();
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch, closeSearch]);

  // Staged query execution: queries only run when search has non-empty input
  useEffect(() => {
    if (!isSearchOpen || !trimmedQuery) {
      return;
    }

    let isMounted = true;

    executeUniversalSearch(
      trimmedQuery,
      {
        moduleFilter: activeFilter,
        limit: 25,
      },
      db
    )
      .then((res) => {
        if (!isMounted) return;
        setSearchResults(res);
      })
      .catch((err) => {
        console.error("Failed to execute universal search:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isSearchOpen, trimmedQuery, activeFilter]);

  const items = activeSearchResults.items;
  const itemsCount = items.length;

  // Selected item reference
  const selectedItem = itemsCount > 0 && selectedIndex < itemsCount ? items[selectedIndex] : null;

  // Navigate to selected result
  function handleSelectResult(item: SearchResultItemType) {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
    closeSearch();
    router.push(item.route);
  }

  // Handle Quick Capture shortcut (Ctrl+N / Cmd+N) or fallback action
  function handleOpenQuickCapture(prefillTitle?: string) {
    closeSearch();
    useUIStore.getState().openQuickCapture();
    if (prefillTitle && typeof window !== "undefined") {
      // Small timeout to allow Quick Capture modal to mount and receive title
      setTimeout(() => {
        const titleInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="What needs to be done"]'
        );
        if (titleInput) {
          titleInput.value = prefillTitle;
          titleInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, 50);
    }
  }

  // Live screen reader announcement
  const announcementText = useMemo(() => {
    if (isSearching && itemsCount === 0) return "Searching across ORBIT...";
    if (!debouncedQuery.trim()) {
      return recentSearches.length > 0
        ? `Ready to search. ${recentSearches.length} recent search${recentSearches.length === 1 ? "" : "es"} available.`
        : "Ready to search across ORBIT.";
    }
    if (itemsCount === 0) return `No results found for ${debouncedQuery}`;
    return `${itemsCount} result${itemsCount === 1 ? "" : "s"} found for ${debouncedQuery}`;
  }, [isSearching, debouncedQuery, itemsCount, recentSearches.length]);

  // Keyboard navigation within search palette
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!debouncedQuery.trim() && recentSearches.length > 0) {
        setSelectedRecentIndex((prev) => (prev + 1) % recentSearches.length);
      } else if (itemsCount > 0) {
        setSelectedIndex((selectedIndex + 1) % itemsCount);
      }
      return;
    }

    // Arrow Up
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!debouncedQuery.trim() && recentSearches.length > 0) {
        setSelectedRecentIndex((prev) => (prev - 1 + recentSearches.length) % recentSearches.length);
      } else if (itemsCount > 0) {
        setSelectedIndex((selectedIndex - 1 + itemsCount) % itemsCount);
      }
      return;
    }

    // Home (jump to first item)
    if (e.key === "Home" && itemsCount > 0) {
      e.preventDefault();
      setSelectedIndex(0);
      return;
    }

    // End (jump to last item)
    if (e.key === "End" && itemsCount > 0) {
      e.preventDefault();
      setSelectedIndex(itemsCount - 1);
      return;
    }

    // PageDown / PageUp
    if (e.key === "PageDown" && itemsCount > 0) {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 5, itemsCount - 1));
      return;
    }
    if (e.key === "PageUp" && itemsCount > 0) {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 5, 0));
      return;
    }

    // Escape: if query has text, clear query; if empty, close search
    if (e.key === "Escape") {
      e.preventDefault();
      if (query.trim().length > 0) {
        setQuery("");
        setSelectedRecentIndex(-1);
      } else {
        closeSearch();
      }
      return;
    }

    // Enter
    if (e.key === "Enter") {
      e.preventDefault();
      if (!debouncedQuery.trim() && selectedRecentIndex >= 0 && selectedRecentIndex < recentSearches.length) {
        setQuery(recentSearches[selectedRecentIndex]);
        setSelectedRecentIndex(-1);
        return;
      }
      if (selectedItem) {
        handleSelectResult(selectedItem);
      } else if (debouncedQuery.trim()) {
        // If no selection but query exists, offer quick capture
        handleOpenQuickCapture(debouncedQuery.trim());
      }
      return;
    }

    // Tab / Shift+Tab: cycle through filter tabs
    if (e.key === "Tab") {
      e.preventDefault();
      const currentIndex = FILTER_TABS.findIndex((t) => t.id === activeFilter);
      const step = e.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + step + FILTER_TABS.length) % FILTER_TABS.length;
      setActiveFilter(FILTER_TABS[nextIndex].id);
      return;
    }

    // Ctrl+N / Cmd+N: open Quick Capture
    const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const isModifier = isMac ? e.metaKey : e.ctrlKey;
    if (isModifier && e.key.toLowerCase() === "n") {
      e.preventDefault();
      handleOpenQuickCapture(query.trim() || undefined);
    }
  }

  if (!isSearchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="orbit-search-modal-heading"
      className="orbit-modal-backdrop fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-3 sm:pt-16 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div
        className={`orbit-modal-dialog w-full max-w-2xl overflow-hidden border bg-orbit-surface transition-all flex flex-col h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[82dvh] ${dialogRadiusClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="orbit-search-modal-heading" className="sr-only">
          Universal Search
        </h2>

        {/* Live Screen Reader Announcement */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcementText}
        </div>

        {/* 7-Personality Tactile Top Bezel Strips */}
        {mounted && (
          <>
            {isArchivist && (
              <div
                data-testid="search-bezel-archivist"
                className="relative bg-[#1c2e24] dark:bg-[#15231c] text-[#f4efe4] px-4 py-2 border-b border-[#b89758]/40 flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b89758] border border-[#d4af37]" />
                  <span className="font-mono text-[10px] tracking-widest text-[#d4af37] uppercase font-semibold">
                    EX LIBRIS INDEX // UNIVERSAL CODEX SEARCH
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-serif italic text-[#e8decb]/80">
                  <span>Folio Codex</span>
                  <span className="text-[#b89758]">❦</span>
                </div>
              </div>
            )}

            {isFuturistic && (
              <div
                data-testid="search-bezel-futuristic"
                className="futuristic-command-deck px-4 py-2 border-b border-[#00f0ff]/20 flex items-center justify-between text-[#94a3b8] select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#00f0ff]">
                    SYS.SEARCH // INDEX READY
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#64748b]">
                  <span>INDEX: 60Hz REALTIME</span>
                  <span className="text-[#00f0ff]/70 font-mono">⊕</span>
                </div>
              </div>
            )}

            {isAesthetic && (
              <div
                data-testid="search-bezel-aesthetic"
                className="bg-[#fdfbf7] dark:bg-[#181614] px-4 py-2 border-b border-[#2c2621]/15 dark:border-[#f0eae1]/15 flex items-center justify-between select-none"
              >
                <span className="font-serif uppercase text-[9px] tracking-[0.2em] text-[#786c5e] dark:text-[#a89c8e]">
                  SECTION SEARCH · KINFOLK ARCHIVE
                </span>
                <span className="font-serif italic text-[11px] text-[#c06c52]">Universal Index</span>
              </div>
            )}

            {isArtistic && (
              <div
                data-testid="search-bezel-artistic"
                className="relative overflow-hidden bg-gradient-to-r from-[#faf6ed] via-[#fff5eb] to-[#f0f4ff] dark:from-[#181615] dark:via-[#1e1b18] dark:to-[#151824] px-4 py-2 border-b border-[#d97706]/30 dark:border-[#d97706]/20 flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#d97706]">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                  <span>ATELIER ORBIT · PALETTE SEARCH</span>
                </div>
                <span className="font-serif italic text-xs text-[#d97706]/80">Chromatic Studio</span>
              </div>
            )}

            {isMinimalist && (
              <div data-testid="search-bezel-minimalist">
                <div className="w-full h-[2px] bg-[#ff3b00]" />
                <div className="bg-transparent px-4 py-1.5 border-b border-black/15 dark:border-white/15 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff3b00]">
                    <span>SYSTEM SEARCH // UNIVERSAL QUERY</span>
                  </div>
                  <span className="font-mono text-[9px] text-[#737373] tracking-widest uppercase">
                    INDEX 01
                  </span>
                </div>
              </div>
            )}

            {isNaturalist && (
              <div
                data-testid="search-bezel-naturalist"
                className="naturalist-canopy-hero px-4 py-2 border-b border-[#235c3b]/40 flex items-center justify-between text-[#f4efe4] bg-[#0a1811] select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#f59e0b]">
                    CONSERVATORY HERBARIUM · INDEX SEARCH
                  </span>
                </div>
                <span className="text-xs select-none">🌱</span>
              </div>
            )}

            {isMidnight && (
              <div
                data-testid="search-bezel-midnight"
                className="midnight-zenith-hero px-4 py-2 border-b border-[#1e1b4b] flex items-center justify-between text-[#f8fafc] bg-[#03050c] select-none"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#fbbf24] uppercase">
                  <span className="text-[#fbbf24] select-none">✦</span>
                  <span>OBSERVATORY EPHEMERIS SEARCH // CELESTIAL INDEX</span>
                </div>
                <span className="font-mono text-[9px] text-[#818cf8] tracking-widest uppercase">
                  SECTOR 00
                </span>
              </div>
            )}
          </>
        )}

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-orbit-border px-3.5 sm:px-4 py-3 sm:py-3.5 bg-orbit-surface">
          <Search className="h-5 w-5 shrink-0 text-orbit-accent" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isSearchOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="orbit-search-results"
            aria-activedescendant={
              selectedItem ? `search-option-${selectedItem.id}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedRecentIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search ORBIT... (e.g. 'planning', '#books', 'gym')"
            className={`flex-1 bg-transparent text-sm sm:text-base text-orbit-text placeholder:text-orbit-text-muted focus:outline-hidden min-w-0 ${
              isArchivist
                ? "font-serif placeholder:font-serif"
                : isFuturistic
                ? "font-mono text-[#00f0ff] placeholder:font-mono placeholder:text-[#00f0ff]/50"
                : isMinimalist
                ? "font-mono rounded-none"
                : "font-normal"
            }`}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedRecentIndex(-1);
                inputRef.current?.focus();
              }}
              className={`flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 sm:p-1 text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors ${
                isMinimalist ? "rounded-none" : "rounded-md"
              }`}
              title="Clear search query"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dismiss button for touch / mobile screens */}
          <button
            type="button"
            onClick={closeSearch}
            className={`sm:hidden flex items-center justify-center min-w-[36px] min-h-[36px] px-2.5 py-1 text-xs font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors ${
              isMinimalist ? "rounded-none" : "rounded-md"
            }`}
            title="Close search"
            aria-label="Close search dialog"
          >
            Done
          </button>

          <div
            className={`hidden sm:flex items-center gap-1 text-[11px] font-mono select-none px-2 py-0.5 border ${
              isMinimalist
                ? "rounded-none border-black/30 dark:border-white/30 text-black dark:text-white bg-transparent"
                : isFuturistic
                ? "rounded border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff]"
                : "rounded border-orbit-border bg-orbit-surface-secondary text-orbit-text-muted"
            }`}
          >
            <span>ESC</span>
          </div>
        </div>

        {/* Aesthetic Kinfolk Signature Double Hairline Rule */}
        {isAesthetic && (
          <div className="border-t border-b border-[#2c2621]/15 dark:border-[#f0eae1]/15 h-[3px] mx-4" />
        )}

        {/* Filter Tabs Bar */}
        <div
          role="tablist"
          aria-label="Filter search results by module"
          className="flex items-center gap-1.5 overflow-x-auto px-3.5 sm:px-4 py-2 border-b border-orbit-border bg-orbit-surface-secondary/40 no-scrollbar"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;

            const tabClass = isMinimalist
              ? `rounded-none font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 transition-all ${
                  isActive
                    ? "bg-[#ff3b00] text-white font-bold"
                    : "text-orbit-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
                }`
              : isNaturalist
              ? `rounded-full px-3 py-1 text-xs transition-all ${
                  isActive
                    ? "bg-[#10b981] text-white shadow-xs font-medium"
                    : "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`
              : isFuturistic
              ? `rounded-sm font-mono text-xs px-2.5 py-1 transition-all ${
                  isActive
                    ? "bg-[#00f0ff] text-[#04111d] font-bold shadow-[0_0_6px_#00f0ff]/50"
                    : "text-[#94a3b8] hover:text-[#00f0ff]"
                }`
              : isArtistic
              ? `rounded-full px-3 py-1 text-xs relative transition-all ${
                  isActive
                    ? "bg-[#d97706] text-white font-medium shadow-xs"
                    : "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`
              : isArchivist
              ? `rounded-md font-serif text-xs px-2.5 py-1 transition-all ${
                  isActive
                    ? "bg-[#1b4332] text-[#faf9f5] font-semibold"
                    : "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`
              : isMidnight
              ? `rounded-md font-mono text-xs px-2.5 py-1 transition-all ${
                  isActive
                    ? "bg-[#818cf8] text-[#03050c] font-semibold"
                    : "text-orbit-text-secondary hover:text-[#818cf8]"
                }`
              : `rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs font-medium"
                    : "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-active={isActive ? "true" : "false"}
                onClick={() => setActiveFilter(tab.id)}
                className={`orbit-filter-tab whitespace-nowrap focus:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-accent relative ${tabClass}`}
              >
                <span>{tab.label}</span>
                {/* Artistic Brushstroke accent under active tab */}
                {isArtistic && isActive && (
                  <svg
                    className="absolute -bottom-1 left-2 right-2 h-1 w-[calc(100%-16px)] pointer-events-none"
                    viewBox="0 0 40 4"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 2 Q 20 0, 39 3"
                      stroke="#d97706"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Results Area */}
        <div
          id="orbit-search-results"
          role="listbox"
          aria-label="Search Results"
          className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 min-h-[160px] max-h-[55vh]"
        >
          {isSearching && itemsCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-orbit-text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orbit-accent border-t-transparent mb-2" />
              <span className="font-mono text-xs text-orbit-text-muted">Searching local records...</span>
            </div>
          ) : !query.trim() ? (
            /* Empty Query State: Recent Searches & Hints */
            <div className="py-2 sm:py-3 px-1 sm:px-2">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-orbit-border">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-orbit-text-muted">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs font-medium text-orbit-text-muted hover:text-orbit-text transition-colors"
                      aria-label="Clear all recent searches"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-1">
                    {recentSearches.map((term, index) => {
                      const isRecentSelected = selectedRecentIndex === index;
                      return (
                        <div
                          key={term}
                          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                            isRecentSelected
                              ? "bg-orbit-surface-secondary border border-orbit-border text-orbit-text shadow-orbit-xs"
                              : "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text border border-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setQuery(term);
                              setSelectedRecentIndex(-1);
                            }}
                            className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                          >
                            <Clock className="h-3.5 w-3.5 text-orbit-text-muted shrink-0" />
                            <span className="truncate">{term}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(term);
                            }}
                            className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1 text-orbit-text-muted hover:text-orbit-danger transition-colors"
                            title={`Remove ${term} from history`}
                            aria-label={`Remove ${term} from search history`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orbit-surface-secondary border border-orbit-border mx-auto text-orbit-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-orbit-text">
                    Universal Search
                  </h3>
                  <p className="mt-1 text-xs text-orbit-text-muted max-w-sm mx-auto">
                    Search across all your tasks, notes, documents, habits, and calendar events.
                  </p>
                </div>
              )}

              {/* Quick Navigation Hint Cards */}
              <div className="mt-4 pt-3 border-t border-orbit-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-orbit-text-muted">
                <div className="rounded-lg border border-orbit-border bg-orbit-surface-secondary/50 p-2.5">
                  <span className="font-semibold text-orbit-text">#tags: </span>
                  Type a tag name to filter tagged resources and tasks.
                </div>
                <div className="rounded-lg border border-orbit-border bg-orbit-surface-secondary/50 p-2.5">
                  <span className="font-semibold text-orbit-text">Ctrl + N: </span>
                  Instantly open Quick Capture from search.
                </div>
              </div>
            </div>
          ) : itemsCount === 0 ? (
            /* No Results State */
            <div className="py-6 px-4">
              <EmptyState
                dashed={false}
                compact
                icon={<SearchX className="h-5 w-5" />}
                eyebrow="SEARCH INDEX"
                title={`No results found for "${debouncedQuery}"`}
                description="Check for typos or try searching with different keywords."
                action={
                  <button
                    type="button"
                    onClick={() => handleOpenQuickCapture(debouncedQuery.trim())}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-1.5 text-xs font-semibold text-orbit-text transition-colors hover:bg-orbit-surface-secondary shadow-orbit-xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-orbit-accent" />
                    <span>Create task &ldquo;{debouncedQuery.trim()}&rdquo;</span>
                    <ArrowRight className="h-3 w-3 ml-0.5 text-orbit-text-muted" />
                  </button>
                }
                secondaryAction={
                  activeFilter !== "all" ? (
                    <button
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-orbit-accent hover:underline px-2"
                    >
                      <span>Search all categories</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            /* Grouped Results Display */
            <div className="space-y-4">
              {searchResults.groups.map((group) => (
                <div key={group.module}>
                  <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-mono font-semibold tracking-wider text-orbit-accent uppercase">
                    <span>{group.label}</span>
                    <Badge variant="neutral">
                      {group.items.length}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const itemIndex = items.findIndex((i) => i.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <SearchResultItem
                          key={item.id}
                          item={item}
                          isSelected={isSelected}
                          onSelect={handleSelectResult}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-orbit-border bg-orbit-surface-secondary/40 px-4 py-2 text-[11px] text-orbit-text-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <kbd
                className={`border bg-orbit-surface px-1.5 py-0.5 font-mono text-[10px] text-orbit-text font-semibold ${
                  isMinimalist
                    ? "rounded-none border-black/30 dark:border-white/30"
                    : isFuturistic
                    ? "rounded border-[#00f0ff]/40 text-[#00f0ff]"
                    : "rounded border-orbit-border"
                }`}
              >
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd
                className={`border bg-orbit-surface px-1.5 py-0.5 font-mono text-[10px] text-orbit-text font-semibold ${
                  isMinimalist
                    ? "rounded-none border-black/30 dark:border-white/30"
                    : isFuturistic
                    ? "rounded border-[#00f0ff]/40 text-[#00f0ff]"
                    : "rounded border-orbit-border"
                }`}
              >
                ↵
              </kbd>
              <span>Open</span>
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd
                className={`border bg-orbit-surface px-1.5 py-0.5 font-mono text-[10px] text-orbit-text font-semibold ${
                  isMinimalist
                    ? "rounded-none border-black/30 dark:border-white/30"
                    : isFuturistic
                    ? "rounded border-[#00f0ff]/40 text-[#00f0ff]"
                    : "rounded border-orbit-border"
                }`}
              >
                Tab
              </kbd>
              <span>Filter</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenQuickCapture(query.trim() || undefined)}
              className="inline-flex items-center gap-1 whitespace-nowrap hover:text-orbit-accent transition-colors"
            >
              <kbd
                className={`border bg-orbit-surface px-1.5 py-0.5 font-mono text-[10px] text-orbit-text font-semibold ${
                  isMinimalist
                    ? "rounded-none border-black/30 dark:border-white/30"
                    : isFuturistic
                    ? "rounded border-[#00f0ff]/40 text-[#00f0ff]"
                    : "rounded border-orbit-border"
                }`}
              >
                Ctrl+N
              </kbd>
              <span>Quick Capture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
