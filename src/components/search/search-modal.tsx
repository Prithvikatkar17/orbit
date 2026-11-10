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
  searchAll,
  type SearchDataSources,
  type SearchResultItem as SearchResultItemType,
} from "@/lib/services/search-service";
import { SearchResultItem } from "./search-result-item";

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

export function SearchModal() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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
  const [snapshot, setSnapshot] = useState<SearchDataSources | null>(null);

  const isLoadingSnapshot = isSearchOpen && snapshot === null;

  // Debounce query updates (120ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);
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

  // Fetch in-memory snapshot when modal opens; discard on unmount/close cleanup.
  // NEVER loads libraryFiles.data binary Blobs.
  useEffect(() => {
    if (!isSearchOpen) return;

    let isMounted = true;

    Promise.all([
      db.tasks.toArray(),
      db.libraryEntries.toArray(),
      db.habits.toArray(),
      db.events.toArray(),
      db.items.toArray(),
      db.libraryCollections.toArray(),
    ])
      .then(([tasks, libraryEntries, habits, events, items, collections]) => {
        if (!isMounted) return;
        setSnapshot({
          tasks,
          libraryEntries,
          habits,
          events,
          items,
          collections,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch search snapshot:", err);
      });

    // Auto-focus search input upon opening
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      isMounted = false;
      setSnapshot(null);
    };
  }, [isSearchOpen]);

  // Execute in-memory search across snapshot
  const searchResults = useMemo(() => {
    if (!snapshot || !debouncedQuery.trim()) {
      return { query: debouncedQuery, totalMatches: 0, items: [], groups: [] };
    }
    return searchAll(debouncedQuery, snapshot, {
      moduleFilter: activeFilter,
      limit: 25,
    });
  }, [snapshot, debouncedQuery, activeFilter]);

  const items = searchResults.items;
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

  // Keyboard navigation within search palette
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (itemsCount > 0) {
        setSelectedIndex((selectedIndex + 1) % itemsCount);
      }
      return;
    }

    // Arrow Up
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (itemsCount > 0) {
        setSelectedIndex((selectedIndex - 1 + itemsCount) % itemsCount);
      }
      return;
    }

    // Enter
    if (e.key === "Enter") {
      e.preventDefault();
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
      aria-label="Universal Search"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
          <Search className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search ORBIT... (e.g. 'planning', '#books', 'gym')"
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden dark:text-white dark:placeholder-slate-500"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            <span>ESC</span>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-[160px] max-h-[55vh]">
          {isLoadingSnapshot ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
              <span className="text-xs">Loading records...</span>
            </div>
          ) : !query.trim() ? (
            /* Empty Query State: Recent Searches & Hints */
            <div className="py-3 px-2">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-1">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setQuery(term)}
                          className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                        >
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{term}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecentSearch(term)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                          title="Remove from history"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Sparkles className="mx-auto h-7 w-7 text-indigo-500/70" />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Universal Search
                  </p>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    Search across all your tasks, notes, documents, habits, and calendar events.
                  </p>
                </div>
              )}

              {/* Quick Navigation Hint Cards */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/30 p-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">#tags: </span>
                  Type a tag name to filter tagged resources and tasks.
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/30 p-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Ctrl + N: </span>
                  Instantly open Quick Capture from search.
                </div>
              </div>
            </div>
          ) : itemsCount === 0 ? (
            /* No Results State */
            <div className="py-10 text-center">
              <SearchX className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No results found for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Check for typos or try searching with different keywords.
              </p>

              {/* Quick Capture action button */}
              <button
                type="button"
                onClick={() => handleOpenQuickCapture(debouncedQuery.trim())}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create task &ldquo;{debouncedQuery.trim()}&rdquo;</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          ) : (
            /* Grouped Results Display */
            <div className="space-y-4">
              {searchResults.groups.map((group) => (
                <div key={group.module}>
                  <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <span>{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {group.items.length}
                    </span>
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
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">
                ↵
              </kbd>
              <span>Open</span>
            </span>
            <span className="inline-flex items-center gap-1 hidden sm:inline-flex">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">
                Tab
              </kbd>
              <span>Filter</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenQuickCapture(query.trim() || undefined)}
              className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">
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
