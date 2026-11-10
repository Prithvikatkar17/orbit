import { create } from "zustand";
import type { SearchModuleType } from "@/lib/services/search-service";

export type SearchFilterTab = "all" | SearchModuleType;

export const RECENT_SEARCHES_KEY = "orbit:recent_searches";
export const MAX_RECENT_SEARCHES = 8;

export function loadRecentSearches(storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .slice(0, MAX_RECENT_SEARCHES);
    }
  } catch {
    // Ignore storage quota or corrupted JSON
  }
  return [];
}

export function saveRecentSearches(items: string[], storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null): void {
  if (!storage) return;
  try {
    storage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore storage quota or blocked errors
  }
}

interface SearchState {
  isSearchOpen: boolean;
  query: string;
  activeFilter: SearchFilterTab;
  selectedIndex: number;
  recentSearches: string[];

  // Actions
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setActiveFilter: (filter: SearchFilterTab) => void;
  setSelectedIndex: (index: number) => void;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  removeRecentSearch: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  query: "",
  activeFilter: "all",
  selectedIndex: 0,
  recentSearches: [],

  openSearch: (initialQuery = "") => {
    set({
      isSearchOpen: true,
      query: initialQuery,
      selectedIndex: 0,
      recentSearches: loadRecentSearches(),
    });
  },

  closeSearch: () => {
    set({
      isSearchOpen: false,
      query: "",
      selectedIndex: 0,
    });
  },

  setQuery: (query: string) => {
    set({
      query,
      selectedIndex: 0, // Reset selection when query changes
    });
  },

  setActiveFilter: (activeFilter: SearchFilterTab) => {
    set({
      activeFilter,
      selectedIndex: 0, // Reset selection when filter changes
    });
  },

  setSelectedIndex: (selectedIndex: number) => {
    set({ selectedIndex });
  },

  addRecentSearch: (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    set((state) => {
      const filtered = state.recentSearches.filter(
        (s) => s.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return { recentSearches: updated };
    });
  },

  clearRecentSearches: () => {
    saveRecentSearches([]);
    set({ recentSearches: [] });
  },

  removeRecentSearch: (term: string) => {
    const trimmed = term.trim().toLowerCase();
    set((state) => {
      const updated = state.recentSearches.filter(
        (s) => s.toLowerCase() !== trimmed
      );
      saveRecentSearches(updated);
      return { recentSearches: updated };
    });
  },
}));

