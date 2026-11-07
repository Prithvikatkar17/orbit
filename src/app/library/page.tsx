"use client";

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookOpen,
  Plus,
  Search,
  Grid,
  List,
  Star,
  Clock,
  Sparkles,
  FolderPlus,
  GraduationCap,
  X,
} from "lucide-react";
import { db } from "@/lib/db/client";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { useMounted } from "@/lib/utils/dates";
import { LibraryCard } from "@/components/library/library-card";
import { LibraryRow } from "@/components/library/library-row";
import { LibraryEntryModal } from "@/components/library/library-entry-modal";
import { LibraryCollectionModal } from "@/components/library/library-collection-modal";

type ViewMode = "grid" | "list";
type SortOption = "recent" | "viewed" | "alpha" | "rating";
type ActiveSection = "all" | "overview" | "learning" | "favorites";

export default function LibraryPage() {
  const mounted = useMounted();

  // Live queries
  const rawEntries = useLiveQuery(() => db.libraryEntries.toArray(), []);
  const rawCollections = useLiveQuery(
    () => db.libraryCollections.orderBy("sortOrder").toArray(),
    []
  );

  const entries: LibraryEntry[] = useMemo(
    () => (mounted && rawEntries ? rawEntries : []),
    [mounted, rawEntries]
  );
  const collections: LibraryCollection[] = useMemo(
    () => (mounted && rawCollections ? rawCollections : []),
    [mounted, rawCollections]
  );

  const collectionsMap = useMemo(() => {
    const map = new Map<string, LibraryCollection>();
    collections.forEach((c) => map.set(c.id, c));
    return map;
  }, [collections]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LibraryEntry | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<LibraryCollection | null>(null);

  // Derived metrics
  const counts = useMemo(() => {
    let favorites = 0;
    let inProgress = 0;
    let completed = 0;
    let viewed = 0;

    entries.forEach((e) => {
      if (e.isFavorite) favorites++;
      if (e.status === "in_progress") inProgress++;
      if (e.status === "completed") completed++;
      if (e.lastViewedAt) viewed++;
    });

    return {
      total: entries.length,
      favorites,
      inProgress,
      completed,
      viewed,
    };
  }, [entries]);

  // Overview groups (for dashboard view)
  const continueLearningItems = useMemo(
    () =>
      entries
        .filter((e) => e.status === "in_progress")
        .sort((a, b) => (b.lastViewedAt || b.createdAt).localeCompare(a.lastViewedAt || a.createdAt))
        .slice(0, 4),
    [entries]
  );

  const favoriteItems = useMemo(
    () =>
      entries
        .filter((e) => e.isFavorite)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4),
    [entries]
  );

  const recentlyViewedItems = useMemo(
    () =>
      entries
        .filter((e) => Boolean(e.lastViewedAt))
        .sort((a, b) => (b.lastViewedAt || "").localeCompare(a.lastViewedAt || ""))
        .slice(0, 4),
    [entries]
  );

  const recentlyAddedItems = useMemo(
    () =>
      [...entries]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4),
    [entries]
  );

  // Filtered & Sorted items
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Section filter
      if (activeSection === "learning" && entry.status !== "in_progress") return false;
      if (activeSection === "favorites" && !entry.isFavorite) return false;

      // 2. Collection filter
      if (selectedCollectionId !== "all") {
        if (entry.collectionId !== selectedCollectionId) return false;
      }

      // 3. Type filter
      if (selectedType !== "all") {
        if (entry.type !== selectedType) return false;
      }

      // 4. Status filter
      if (selectedStatus !== "all") {
        if (entry.status !== selectedStatus) return false;
      }

      // 5. Search query across title, notes, and tags
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(q);
        const matchesNotes = entry.notes ? entry.notes.toLowerCase().includes(q) : false;
        const matchesTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesLink = entry.link?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesTags && !matchesLink) return false;
      }

      return true;
    });
  }, [entries, activeSection, selectedCollectionId, selectedType, selectedStatus, searchQuery]);

  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];

    if (sortBy === "recent") {
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === "viewed") {
      return list.sort((a, b) => {
        const dateA = a.lastViewedAt || a.createdAt;
        const dateB = b.lastViewedAt || b.createdAt;
        return dateB.localeCompare(dateA);
      });
    } else if (sortBy === "alpha") {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "rating") {
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [filteredEntries, sortBy]);

  // Handlers
  async function handleToggleFavorite(id: string, current: boolean) {
    const nowIso = new Date().toISOString();
    await db.libraryEntries.update(id, {
      isFavorite: !current,
      updatedAt: nowIso,
    });
  }

  async function handleStatusChange(id: string, status: LibraryEntry["status"]) {
    const nowIso = new Date().toISOString();
    await db.libraryEntries.update(id, {
      status,
      completedAt: status === "completed" ? nowIso : undefined,
      updatedAt: nowIso,
    });
  }

  async function handleView(entry: LibraryEntry) {
    const nowIso = new Date().toISOString();
    await db.libraryEntries.update(entry.id, {
      lastViewedAt: nowIso,
      updatedAt: nowIso,
    });
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this resource?")) {
      await db.libraryEntries.delete(id);
    }
  }

  function handleOpenAddModal(colId?: string) {
    setEditingEntry(null);
    if (colId) setSelectedCollectionId(colId);
    setIsEntryModalOpen(true);
  }

  function handleEdit(entry: LibraryEntry) {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  }

  function handleClearFilters() {
    setSearchQuery("");
    setSelectedCollectionId("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setActiveSection("all");
  }

  const isBrowsingAll =
    activeSection !== "overview" ||
    selectedCollectionId !== "all" ||
    selectedType !== "all" ||
    selectedStatus !== "all" ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              📚
            </span>
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
              PERSONAL LIBRARY
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Knowledge & Resources
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Curate bookmarks, videos, notes, articles, and learning materials.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingCollection(null);
              setIsCollectionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <FolderPlus className="h-4 w-4 text-slate-500" />
            <span>New Collection</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveSection("all")}
          className={`rounded-2xl border p-4 text-left shadow-xs transition-all ${
            activeSection === "all"
              ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Resources
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {counts.total}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("learning")}
          className={`rounded-2xl border p-4 text-left shadow-xs transition-all ${
            activeSection === "learning"
              ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Continue Learning
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {counts.inProgress}
            </span>
            <span className="text-xs text-slate-400">in progress</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("favorites")}
          className={`rounded-2xl border p-4 text-left shadow-xs transition-all ${
            activeSection === "favorites"
              ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Favourites
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-500">
              {counts.favorites}
            </span>
            <span className="text-xs text-slate-400">starred</span>
          </div>
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {counts.completed}
            </span>
            <span className="text-xs text-slate-400">finished</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Collections, Search, Filters, Sorting, and View Toggle */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Collections Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setSelectedCollectionId("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCollectionId === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            All Collections
          </button>

          {mounted &&
            collections.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedCollectionId(col.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCollectionId === col.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <span>{col.icon || "📁"}</span>
                <span>{col.name}</span>
              </button>
            ))}

          {mounted && rawCollections !== undefined && collections.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingCollection(null);
                setIsCollectionModalOpen(true);
              }}
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 whitespace-nowrap px-2"
            >
              + Create your first collection
            </button>
          )}
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search library titles, notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters, Sorting, and View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Navigation Section Pill */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeSection === "overview" && !searchQuery
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeSection === "all" || searchQuery
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Items ({mounted ? entries.length : 0})
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="bookmark">🔖 Bookmark</option>
              <option value="video">📹 Video</option>
              <option value="playlist">📑 Playlist</option>
              <option value="article">📰 Article</option>
              <option value="note">📝 Note</option>
              <option value="learn">📚 Course/Learn</option>
              <option value="listen">🎧 Audio</option>
              <option value="file">📎 File</option>
              <option value="buy">🛒 Buy</option>
              <option value="other">📌 Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Status</option>
              <option value="saved">Saved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="recent">Recently Added</option>
              <option value="viewed">Recently Viewed</option>
              <option value="alpha">Alphabetical (A-Z)</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Grid view"
                aria-label="Switch to grid view"
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === "list"
                    ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="List view"
                aria-label="Switch to list view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!mounted ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 px-6 text-center dark:border-slate-800 dark:bg-slate-900 animate-pulse">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="mx-auto mt-4 h-4 w-48 rounded-md bg-slate-100 dark:bg-slate-800" />
          <div className="mx-auto mt-2 h-3 w-64 rounded-md bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : entries.length === 0 ? (
        /* Empty State: Library is completely empty */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60">
            <BookOpen className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            Your personal library is waiting
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Curate articles, videos, bookmarks, and notes. Organize everything into custom collections and track your learning progress.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add your first resource</span>
            </button>
          </div>
        </div>
      ) : isBrowsingAll ? (
        /* Filtered / Browse View */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {sortedEntries.length} of {entries.length} resources
            </span>
            {(searchQuery ||
              selectedCollectionId !== "all" ||
              selectedType !== "all" ||
              selectedStatus !== "all" ||
              activeSection !== "all") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Clear filters
              </button>
            )}
          </div>

          {sortedEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Search className="mx-auto h-8 w-8 text-slate-400" />
              <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                No resources match your filters
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try searching for a different keyword or resetting your filters.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedEntries.map((entry) => (
                <LibraryCard
                  key={entry.id}
                  entry={entry}
                  collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onStatusChange={handleStatusChange}
                  onView={handleView}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry) => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onStatusChange={handleStatusChange}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Overview Dashboard View with 4 Sections */
        <div className="space-y-8">
          {/* Section 1: Continue Learning */}
          {continueLearningItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Continue Learning
                  </h2>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    {counts.inProgress}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("learning")}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View all
                </button>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {continueLearningItems.map((entry) => (
                    <LibraryCard
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {continueLearningItems.map((entry) => (
                    <LibraryRow
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section 2: Favourites */}
          {favoriteItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Favourites
                  </h2>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    {counts.favorites}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("favorites")}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View all
                </button>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {favoriteItems.map((entry) => (
                    <LibraryCard
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteItems.map((entry) => (
                    <LibraryRow
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section 3: Recently Viewed */}
          {recentlyViewedItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Recently Viewed
                  </h2>
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {recentlyViewedItems.map((entry) => (
                    <LibraryCard
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {recentlyViewedItems.map((entry) => (
                    <LibraryRow
                      key={entry.id}
                      entry={entry}
                      collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                      onStatusChange={handleStatusChange}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section 4: Recently Added */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Recently Added
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection("all")}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View all ({entries.length})
              </button>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recentlyAddedItems.map((entry) => (
                  <LibraryCard
                    key={entry.id}
                    entry={entry}
                    collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onStatusChange={handleStatusChange}
                    onView={handleView}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentlyAddedItems.map((entry) => (
                  <LibraryRow
                    key={entry.id}
                    entry={entry}
                    collection={entry.collectionId ? collectionsMap.get(entry.collectionId) : undefined}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onStatusChange={handleStatusChange}
                    onView={handleView}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <LibraryEntryModal
          initialEntry={editingEntry}
          collections={collections}
          defaultCollectionId={selectedCollectionId !== "all" ? selectedCollectionId : undefined}
          onClose={() => {
            setIsEntryModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* Collection Modal */}
      {isCollectionModalOpen && (
        <LibraryCollectionModal
          initialCollection={editingCollection}
          onClose={() => {
            setIsCollectionModalOpen(false);
            setEditingCollection(null);
          }}
        />
      )}
    </div>
  );
}
