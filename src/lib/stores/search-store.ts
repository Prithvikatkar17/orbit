import { create } from "zustand";
import type { SearchModuleType } from "@/lib/services/search-service";

export type SearchFilterTab = "all" | SearchModuleType;

const RECENT_SEARCHES_KEY = "orbit:recent_searches";
const MAX_RECENT_SEARCHES = 8;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, MAX_RECENT_SEARCHES);
    }
  } catch {
    // Ignore storage quota or blocked errors
  }
  return [];
}

function saveRecentSearches(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
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
    set((state) => {
      const updated = state.recentSearches.filter((s) => s !== term);
      saveRecentSearches(updated);
      return { recentSearches: updated };
    });
  },
}));

