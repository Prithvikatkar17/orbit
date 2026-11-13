"use client";

import React, { useState, useMemo, useCallback, useSyncExternalStore, Suspense } from "react";
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
  FileText,
  X,
  Edit2,
} from "lucide-react";
import { db } from "@/lib/db/client";
import type { LibraryEntry, LibraryCollection } from "@/lib/schemas";
import { deleteLibraryEntryWithFiles } from "@/lib/services/library-service";
import { useMounted } from "@/lib/utils/dates";
import { LibraryCard, getTypeConfig } from "@/components/library/library-card";
import { LibraryRow } from "@/components/library/library-row";
import { LibraryEntryModal } from "@/components/library/library-entry-modal";
import { LibraryCollectionModal } from "@/components/library/library-collection-modal";
import { LibraryDetailModal } from "@/components/library/library-detail-modal";
import { DeepLinkListener } from "@/components/common/deep-link-listener";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from "@/components/ui";

const VIEW_MODE_STORAGE_KEY = "orbit-library-view-mode";
const VIEW_MODE_EVENT = "orbit-library-view-mode-change";

function subscribeViewMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(VIEW_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(VIEW_MODE_EVENT, callback);
  };
}

function getStoredViewMode(): ViewMode {
  try {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === "grid" || saved === "list") return saved;
  } catch {
    // Ignore storage errors
  }
  return "grid";
}

const LIBRARY_CATEGORY_TABS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "bookmark", label: "Bookmarks" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Videos" },
  { id: "playlist", label: "Playlists" },
  { id: "note", label: "Notes" },
  { id: "file", label: "Files" },
  { id: "learn", label: "Courses" },
  { id: "listen", label: "Audio" },
];

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

  // UI state (persist viewMode preference safely via useSyncExternalStore)
  const viewMode = useSyncExternalStore<ViewMode>(
    subscribeViewMode,
    getStoredViewMode,
    () => "grid"
  );
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  function handleViewModeChange(next: ViewMode) {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
      window.dispatchEvent(new Event(VIEW_MODE_EVENT));
    } catch {
      // Ignore storage errors
    }
  }

  // Delete confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LibraryEntry | null>(null);
  const [modalInitialType, setModalInitialType] = useState<LibraryEntry["type"] | undefined>(undefined);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const [focusNoteView, setFocusNoteView] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<LibraryCollection | null>(null);

  // Deep link handler for /library?entryId={id}, ?view=note, and ?collectionId={id}
  const handleLibraryDeepLink = useCallback(
    async (params: Record<string, string>) => {
      // 1. Entry / Note deep link
      if (params.entryId) {
        try {
          const entry = await db.libraryEntries.get(params.entryId);
          if (entry) {
            setViewingEntryId(entry.id);
            setFocusNoteView(params.view === "note");
          } else {
            console.warn(`[DeepLink] Library entry not found: ${params.entryId}`);
          }
        } catch (err) {
          console.error("[DeepLink] Failed to load library entry:", err);
        }
      }

      // 2. Collection deep link
      if (params.collectionId) {
        try {
          const col = await db.libraryCollections.get(params.collectionId);
          if (col) {
            setSelectedCollectionId(col.id);
            setActiveSection("all");
          } else {
            console.warn(`[DeepLink] Collection not found: ${params.collectionId}`);
          }
        } catch (err) {
          console.error("[DeepLink] Failed to load collection:", err);
        }
      }
    },
    []
  );

  const viewingEntry = useMemo(
    () => (viewingEntryId ? entries.find((e) => e.id === viewingEntryId) || null : null),
    [viewingEntryId, entries]
  );

  // Derived metrics & per-collection counts
  const counts = useMemo(() => {
    let favorites = 0;
    let inProgress = 0;
    let completed = 0;
    let viewed = 0;
    const byCollection = new Map<string, number>();

    entries.forEach((e) => {
      if (e.isFavorite) favorites++;
      if (e.status === "in_progress") inProgress++;
      if (e.status === "completed") completed++;
      if (e.lastViewedAt) viewed++;
      if (e.collectionId) {
        byCollection.set(e.collectionId, (byCollection.get(e.collectionId) || 0) + 1);
      }
    });

    return {
      total: entries.length,
      favorites,
      inProgress,
      completed,
      viewed,
      byCollection,
    };
  }, [entries]);

  const selectedCollection = useMemo(
    () =>
      selectedCollectionId !== "all"
        ? collectionsMap.get(selectedCollectionId) || null
        : null,
    [selectedCollectionId, collectionsMap]
  );

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

      // 5. Search query across title, notes, tags, link, and attached filename
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(q);
        const matchesNotes = entry.notes ? entry.notes.toLowerCase().includes(q) : false;
        const matchesTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesLink = entry.link?.toLowerCase().includes(q);
        const matchesFile = entry.fileMetadata?.fileName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesTags && !matchesLink && !matchesFile) return false;
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
    setViewingEntryId(entry.id);
  }

  async function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  async function handleConfirmDeleteEntry() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteLibraryEntryWithFiles(deleteTargetId);
      if (viewingEntryId === deleteTargetId) {
        setViewingEntryId(null);
      }
    } catch (err: unknown) {
      console.error("Delete library entry error:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  function handleOpenAddModal(colId?: string, type?: LibraryEntry["type"]) {
    setEditingEntry(null);
    setModalInitialType(type);
    if (colId) setSelectedCollectionId(colId);
    setIsEntryModalOpen(true);
  }

  function handleEdit(entry: LibraryEntry) {
    setEditingEntry(entry);
    setModalInitialType(undefined);
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
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener
          params={["entryId", "view", "collectionId"]}
          onDeepLink={handleLibraryDeepLink}
        />
      </Suspense>

      {/* Page Header */}
      <PageHeader
        eyebrow="PERSONAL LIBRARY"
        icon="📚"
        title="Knowledge & Resources"
        description="Curate bookmarks, videos, notes, articles, and learning materials."
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={<FolderPlus className="h-4 w-4 text-orbit-text-muted" />}
              onClick={() => {
                setEditingCollection(null);
                setIsCollectionModalOpen(true);
              }}
            >
              New Collection
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<FileText className="h-4 w-4 text-orbit-accent" />}
              onClick={() => handleOpenAddModal(undefined, "note")}
              className="border-orbit-accent/25 bg-orbit-accent-soft/60 text-orbit-accent hover:bg-orbit-accent-soft"
            >
              New Note
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => handleOpenAddModal()}
            >
              Add Resource
            </Button>
          </>
        }
      />

      {/* Editorial Archive Summary & Quick Filter Strip */}
      <SurfaceCard variant="tonal" padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "overview", label: "Curated Shelf", count: null },
                { id: "all", label: "All Resources", count: counts.total },
                { id: "learning", label: "In Progress", count: counts.inProgress },
                { id: "favorites", label: "Favourites", count: counts.favorites },
              ] as const
            ).map((tab) => {
              const isSelected = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`inline-flex min-h-[38px] items-center gap-2 rounded-orbit-control px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring ${
                    isSelected
                      ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                      : "text-orbit-text-secondary hover:bg-orbit-surface/60 hover:text-orbit-text"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className="font-mono text-[11px] text-orbit-text-muted tabular-nums">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-orbit-text-muted tabular-nums">
            <span>{counts.completed} completed</span>
            <span aria-hidden="true">·</span>
            <span>{collections.length} {collections.length === 1 ? "collection" : "collections"}</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Control Toolbar: Collections, Categories, Search, Filters, Sorting, and View Toggle */}
      <SurfaceCard padding="sm" className="space-y-3">
        {/* Collections Shelf Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-orbit-border/70">
          <button
            type="button"
            onClick={() => setSelectedCollectionId("all")}
            className={`min-h-[36px] shrink-0 rounded-orbit-control px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCollectionId === "all"
                ? "bg-orbit-text text-orbit-bg shadow-orbit-xs"
                : "text-orbit-text-secondary hover:bg-orbit-surface-secondary hover:text-orbit-text"
            }`}
          >
            All Collections
          </button>

          {mounted &&
            collections.map((col) => {
              const colCount = counts.byCollection.get(col.id) || 0;
              const isSelected = selectedCollectionId === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-orbit-control border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "border-orbit-accent/30 bg-orbit-accent-soft text-orbit-accent shadow-orbit-xs"
                      : "border-transparent text-orbit-text-secondary hover:bg-orbit-surface-secondary hover:text-orbit-text"
                  }`}
                >
                  <span aria-hidden="true">{col.icon || "📁"}</span>
                  <span>{col.name}</span>
                  <span className="font-mono text-[10px] opacity-75 tabular-nums">
                    {colCount}
                  </span>
                </button>
              );
            })}

          {mounted && rawCollections !== undefined && collections.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingCollection(null);
                setIsCollectionModalOpen(true);
              }}
              className="min-h-[36px] text-xs font-medium text-orbit-accent hover:underline whitespace-nowrap px-2"
            >
              + Create your first collection
            </button>
          )}
        </div>

        {/* Category Navigation Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LIBRARY_CATEGORY_TABS.map((cat) => {
            const isSelected = selectedType === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedType(cat.id)}
                className={`min-h-[34px] shrink-0 rounded-orbit-control border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "border-orbit-accent/25 bg-orbit-accent-soft text-orbit-accent font-semibold"
                    : "border-transparent text-orbit-text-secondary hover:bg-orbit-surface-secondary hover:text-orbit-text"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-orbit-text-muted" />
            <input
              type="text"
              placeholder="Search library titles, notes, tags, or links..."
              aria-label="Search library"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[40px] sm:min-h-[36px] w-full rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary pl-10 pr-9 py-2 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-orbit-text-muted hover:text-orbit-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters, Sorting, and View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              aria-label="Filter by progress status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="min-h-[40px] sm:min-h-[36px] rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-2.5 py-1.5 text-xs font-medium text-orbit-text focus:border-orbit-accent focus:outline-hidden"
            >
              <option value="all">All Status</option>
              <option value="saved">Saved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>

            {/* Sort Dropdown */}
            <select
              aria-label="Sort resources"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="min-h-[40px] sm:min-h-[36px] rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-2.5 py-1.5 text-xs font-medium text-orbit-text focus:border-orbit-accent focus:outline-hidden"
            >
              <option value="recent">Recently Added</option>
              <option value="viewed">Recently Viewed</option>
              <option value="alpha">Alphabetical (A-Z)</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary p-0.5">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs"
                    : "text-orbit-text-muted hover:text-orbit-text"
                }`}
                title="Grid view"
                aria-label="Switch to grid view"
                aria-pressed={viewMode === "grid"}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-orbit-surface text-orbit-accent shadow-orbit-xs"
                    : "text-orbit-text-muted hover:text-orbit-text"
                }`}
                title="List view"
                aria-label="Switch to list view"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Curated Collection Header Banner when viewing a specific collection */}
      {mounted && selectedCollection && (
        <SurfaceCard variant="tonal" padding="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-orbit-card border border-orbit-border bg-orbit-surface text-xl shadow-orbit-xs"
                style={{ borderTop: `3px solid ${selectedCollection.color}` }}
              >
                {selectedCollection.icon || "📁"}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-orbit-text [overflow-wrap:anywhere]">
                    {selectedCollection.name}
                  </h2>
                  <Badge variant="neutral">
                    {counts.byCollection.get(selectedCollection.id) || 0}{" "}
                    {(counts.byCollection.get(selectedCollection.id) || 0) === 1
                      ? "resource"
                      : "resources"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-orbit-text-secondary">
                  {selectedCollection.description || "Curated collection shelf"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Edit2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingCollection(selectedCollection);
                  setIsCollectionModalOpen(true);
                }}
              >
                Edit Collection
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => handleOpenAddModal(selectedCollection.id)}
              >
                Add to Collection
              </Button>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* Main Content Area */}
      {!mounted ? (
        <SurfaceCard className="py-16 px-6 text-center animate-pulse">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orbit-surface-secondary" />
          <div className="mx-auto mt-4 h-4 w-48 rounded-md bg-orbit-surface-secondary" />
          <div className="mx-auto mt-2 h-3 w-64 rounded-md bg-orbit-surface-secondary" />
        </SurfaceCard>
      ) : entries.length === 0 ? (
        /* Empty State: Library is completely empty */
        <EmptyState
          eyebrow="CATALOGUE ARCHIVE"
          icon={<BookOpen className="h-6 w-6" />}
          title="Your personal library is waiting"
          description="Curate articles, videos, bookmarks, and notes. Organize everything into custom collections and track your learning progress."
          action={
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => handleOpenAddModal()}
            >
              Add your first resource
            </Button>
          }
        />
      ) : isBrowsingAll ? (
        /* Filtered / Browse View */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-orbit-text-secondary">
            <span>
              Showing <span className="font-mono font-semibold text-orbit-text">{sortedEntries.length}</span> of{" "}
              <span className="font-mono">{entries.length}</span> resources
            </span>
            {(searchQuery ||
              selectedCollectionId !== "all" ||
              selectedType !== "all" ||
              selectedStatus !== "all" ||
              activeSection !== "all") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-orbit-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {sortedEntries.length === 0 ? (
            selectedCollection &&
            (counts.byCollection.get(selectedCollection.id) || 0) === 0 &&
            !searchQuery &&
            selectedType === "all" &&
            selectedStatus === "all" ? (
              <EmptyState
                eyebrow="COLLECTION"
                icon={<span className="text-xl">{selectedCollection.icon || "📁"}</span>}
                title={`${selectedCollection.name} is empty`}
                description="Add your first bookmark, note, article, or file to start curating this collection."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => handleOpenAddModal(selectedCollection.id)}
                    >
                      Add to collection
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      View all resources
                    </Button>
                  </div>
                }
              />
            ) : selectedType !== "all" && !searchQuery ? (
              <EmptyState
                eyebrow="RESOURCE FILTER"
                icon={<BookOpen className="h-6 w-6" />}
                title={`No ${getTypeConfig(selectedType as LibraryEntry["type"]).label.toLowerCase()}s saved yet`}
                description={`Save a ${getTypeConfig(selectedType as LibraryEntry["type"]).label.toLowerCase()} to your archive or switch back to all resource types.`}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        handleOpenAddModal(
                          selectedCollectionId !== "all" ? selectedCollectionId : undefined,
                          selectedType as LibraryEntry["type"]
                        )
                      }
                    >
                      Add {getTypeConfig(selectedType as LibraryEntry["type"]).label}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedType("all")}
                    >
                      Show all types
                    </Button>
                  </div>
                }
              />
            ) : (
              <EmptyState
                eyebrow="SEARCH RESULTS"
                icon={<Search className="h-6 w-6" />}
                title={
                  searchQuery.trim()
                    ? `No results for "${searchQuery.trim()}"`
                    : "No resources match your filters"
                }
                description="Try searching for a different keyword or resetting your active filters."
                action={
                  <Button variant="primary" size="md" onClick={handleClearFilters}>
                    Reset filters
                  </Button>
                }
              />
            )
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
                  <GraduationCap className="h-4 w-4 text-orbit-accent" />
                  <h2 className="font-display text-lg font-semibold text-orbit-text">
                    Continue Learning
                  </h2>
                  <Badge variant="accent">{counts.inProgress}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("learning")}
                  className="text-xs font-semibold text-orbit-accent hover:underline"
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
                  <Star className="h-4 w-4 fill-orbit-warning text-orbit-warning" />
                  <h2 className="font-display text-lg font-semibold text-orbit-text">
                    Favourites
                  </h2>
                  <Badge variant="warning">{counts.favorites}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("favorites")}
                  className="text-xs font-semibold text-orbit-accent hover:underline"
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
                  <Clock className="h-4 w-4 text-orbit-text-muted" />
                  <h2 className="font-display text-lg font-semibold text-orbit-text">
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
                <Sparkles className="h-4 w-4 text-orbit-accent" />
                <h2 className="font-display text-lg font-semibold text-orbit-text">
                  Recently Added
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection("all")}
                className="text-xs font-semibold text-orbit-accent hover:underline"
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

      {/* Detail View Modal */}
      {viewingEntry && (
        <LibraryDetailModal
          entry={viewingEntry}
          collection={viewingEntry.collectionId ? collectionsMap.get(viewingEntry.collectionId) : undefined}
          focusNote={focusNoteView}
          onClose={() => {
            setViewingEntryId(null);
            setFocusNoteView(false);
          }}
          onEdit={(entry) => {
            setViewingEntryId(null);
            setFocusNoteView(false);
            handleEdit(entry);
          }}
          onDelete={(id) => {
            setViewingEntryId(null);
            setFocusNoteView(false);
            handleDelete(id);
          }}
          onToggleFavorite={handleToggleFavorite}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <LibraryEntryModal
          initialEntry={editingEntry}
          initialType={modalInitialType}
          collections={collections}
          defaultCollectionId={selectedCollectionId !== "all" ? selectedCollectionId : undefined}
          onClose={() => {
            setIsEntryModalOpen(false);
            setEditingEntry(null);
            setModalInitialType(undefined);
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

      {/* Delete Entry Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteEntry}
        title="Delete resource?"
        description="This will permanently remove the resource and any attached files."
        confirmLabel="Delete"
        danger
        loading={isDeleting}
      />
    </div>
  );
}
