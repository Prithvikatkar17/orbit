"use client";

import React, { useState, useCallback, useRef, useMemo, Suspense, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  X,
  Link2,
  FileText,
  ChevronDown,
  CheckSquare,
  BookOpen,
  Archive,
  RotateCcw,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Item, ItemSchema } from "@/lib/schemas";
import { ConvertModal } from "@/components/inbox/convert-modal";
import { formatFriendlyDate, normalizeUrl } from "@/lib/utils/dates";
import { getEntityLocalDate } from "@/lib/services/analytics-service";
import { DeepLinkListener } from "@/components/common/deep-link-listener";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  SurfaceCard,
  Textarea,
} from "@/components/ui";
import { PersonalityPageHeader } from "@/components/layout/personality-page-header";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { flushSyncQueue, syncMutation } from "@/lib/services/sync-queue-service";
import { isStaticPwaMode } from "@/lib/config/runtime";
import {
  triageToTask,
  triageToLibrary,
  triageDismiss,
  undoTriage,
  type TriageUndoPayload,
} from "@/lib/services/inbox-triage-service";

function getDisplayHost(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Inline edit modal — uses shared modal accessibility & UI primitives
// ---------------------------------------------------------------------------
interface EditInboxModalProps {
  item: Item;
  onClose: () => void;
  onSave: (updated: Item) => Promise<void>;
}

function EditInboxModal({ item, onClose, onSave }: EditInboxModalProps) {
  const [editingItem, setEditingItem] = useState<Item>(item);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useAccessibleModal({
    onClose: isSubmitting ? () => { } : onClose,
  });

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem.title.trim() || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = ItemSchema.parse({
        ...editingItem,
        title: editingItem.title.trim(),
        notes: editingItem.notes?.trim() || "",
        link: normalizeUrl(editingItem.link),
        updatedAt: new Date().toISOString(),
      });
      await onSave(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-inbox-modal-title"
        tabIndex={-1}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-orbit-card border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <h3 id="edit-inbox-modal-title" className="font-display text-base font-bold text-orbit-text">
            Edit Inbox Item
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-orbit-control bg-orbit-danger-soft p-3 text-xs text-orbit-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <FormField label="Title" htmlFor="inbox-edit-title" required>
            <Input
              id="inbox-edit-title"
              type="text"
              required
              autoFocus
              value={editingItem.title}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
            />
          </FormField>
          <FormField label="Link" htmlFor="inbox-edit-link">
            <Input
              id="inbox-edit-link"
              type="url"
              value={editingItem.link || ""}
              onChange={(e) => setEditingItem({ ...editingItem, link: e.target.value })}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Notes" htmlFor="inbox-edit-notes">
            <Textarea
              id="inbox-edit-notes"
              rows={3}
              value={editingItem.notes || ""}
              onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
              placeholder="Additional details..."
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={!editingItem.title.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type InboxTypeFilter = "all" | "links" | "thoughts";

// ---------------------------------------------------------------------------
// InboxPage
// ---------------------------------------------------------------------------
export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InboxTypeFilter>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeConvertItem, setActiveConvertItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newLink, setNewLink] = useState("");
  const [showCaptureDetails, setShowCaptureDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // One-click triage & undo state
  const [undoPayload, setUndoPayload] = useState<TriageUndoPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTriage = useCallback(
    async (action: "task" | "library" | "dismiss", item: Item) => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }

      let payload: TriageUndoPayload;
      let msg = "";

      if (action === "task") {
        payload = await triageToTask(item);
        msg = `Converted "${item.title}" to Task`;
      } else if (action === "library") {
        payload = await triageToLibrary(item);
        msg = `Saved "${item.title}" to Library`;
      } else {
        payload = await triageDismiss(item);
        msg = `Dismissed "${item.title}"`;
      }

      setUndoPayload(payload);
      setToastMessage(msg);

      undoTimerRef.current = setTimeout(() => {
        setUndoPayload(null);
        setToastMessage(null);
      }, 4500);
    },
    []
  );

  const handleUndo = useCallback(async () => {
    if (!undoPayload) return;
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const toUndo = undoPayload;
    setUndoPayload(null);
    setToastMessage(null);
    await undoTriage(toUndo);
  }, [undoPayload]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Deep link handler for /inbox?itemId={id}
  const handleInboxDeepLink = useCallback(async ({ itemId }: Record<string, string>) => {
    if (!itemId) return;
    try {
      const item = await db.items.get(itemId);
      if (item) {
        setEditingItem(item);
      } else {
        console.warn(`[DeepLink] Inbox item not found: ${itemId}`);
      }
    } catch (err) {
      console.error("[DeepLink] Failed to load inbox item:", err);
    }
  }, []);

  // Live query for items with status 'pending'
  const rawItems = useLiveQuery(async () => {
    return await db.items.where("status").equals("pending").toArray();
  }, []);
  const items = useMemo(() => rawItems ?? [], [rawItems]);

  // Synchronize items from SQLite server on mount (multi-device hotspot bridge)
  useEffect(() => {
    if (isStaticPwaMode()) return;
    let isCancelled = false;
    async function syncFromSQLiteServer() {
      try {
        await flushSyncQueue();
        const res = await fetch("/api/inbox");
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            for (const serverItem of data.items) {
              if (isCancelled) break;
              const existing = await db.items.get(serverItem.id);
              if (serverItem.deletedAt) {
                if (existing) {
                  await db.items.delete(serverItem.id);
                }
                continue;
              }
              const serverUpdated = typeof serverItem.updatedAt === "number"
                ? serverItem.updatedAt
                : serverItem.updatedAt ? Date.parse(serverItem.updatedAt) : (serverItem.createdAt || 0);
              const existingUpdated = existing
                ? (Date.parse(existing.updatedAt) || Date.parse(existing.createdAt) || 0)
                : -1;
              if (!existing || serverUpdated > existingUpdated) {
                await db.items.put({
                  id: serverItem.id,
                  title: serverItem.title,
                  notes: serverItem.notes || "",
                  link: serverItem.link || undefined,
                  category: serverItem.category || "inbox",
                  priority: "medium",
                  status: serverItem.status || "pending",
                  createdAt: new Date(serverItem.createdAt || Date.now()).toISOString(),
                  updatedAt: new Date(serverUpdated || Date.now()).toISOString(),
                });
              }
            }
          }
        }
      } catch {
        // Offline or server route loading
      }
    }
    syncFromSQLiteServer();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Filter & sort
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (typeFilter === "links" && !item.link) return false;
        if (typeFilter === "thoughts" && Boolean(item.link)) return false;

        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          (item.link && item.link.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [items, typeFilter, search, sortOrder]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setErrorMessage(null);
    try {
      const nowIso = new Date().toISOString();
      const item = ItemSchema.parse({
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        notes: newNotes.trim(),
        link: normalizeUrl(newLink),
        category: "inbox",
        priority: "medium",
        status: "pending",
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await db.items.add(item);

      // Persist to SQLite backend with offline queue fallback
      void syncMutation({
        endpoint: "/api/inbox",
        method: "POST",
        body: {
          id: item.id,
          title: item.title,
          notes: item.notes,
          link: item.link,
          category: item.category,
          status: item.status,
          createdAt: Date.now(),
        },
        entityType: "inbox",
        entityId: item.id,
      });

      setNewTitle("");
      setNewNotes("");
      setNewLink("");
      setShowCaptureDetails(false);
    } catch (err) {
      console.error("Failed to add inbox item:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to add inbox item");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await db.items.delete(deleteTargetId);
      void syncMutation({
        endpoint: `/api/inbox?id=${encodeURIComponent(deleteTargetId)}`,
        method: "DELETE",
        entityType: "inbox",
        entityId: deleteTargetId,
      });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  async function handleSaveEdit(updated: Item) {
    await db.items.put(updated);
    // Non-blocking optimistic background sync to SQLite backend
    void syncMutation({
      endpoint: "/api/inbox",
      method: "PATCH",
      body: {
        id: updated.id,
        title: updated.title,
        notes: updated.notes || null,
        link: updated.link || null,
        category: updated.category,
        status: updated.status,
      },
      entityType: "inbox",
      entityId: updated.id,
    });
  }

  function focusQuickCapture() {
    captureInputRef.current?.focus();
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener params={["itemId"]} onDeepLink={handleInboxDeepLink} />
      </Suspense>

      {/* Personality Page Header */}
      <PersonalityPageHeader
        moduleIndex="04"
        title="Inbox & Triage"
        subtitle="Unsorted captures, links, and notes awaiting organization."
        metrics={[
          {
            label: "Pending",
            value: items.length,
            tone: items.length > 0 ? "accent" : "default",
          },
        ]}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={focusQuickCapture}
          >
            New Thought
          </Button>
        }
      />

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-orbit-control border border-orbit-danger/30 bg-orbit-danger-soft px-4 py-3 text-xs font-semibold text-orbit-danger"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Always-Ready Lightweight Quick Capture Composer */}
      <SurfaceCard className="p-3.5 sm:p-4">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={captureInputRef}
              type="text"
              required
              aria-label="Capture a thought or link"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Capture a thought, link, or idea… (press Enter to save)"
              className="flex-1 py-2 text-sm"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                trailingIcon={
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showCaptureDetails ? "rotate-180" : ""
                      }`}
                  />
                }
                onClick={() => setShowCaptureDetails((prev) => !prev)}
              >
                Details
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!newTitle.trim()}
              >
                Save
              </Button>
            </div>
          </div>

          {showCaptureDetails && (
            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 animate-in fade-in duration-150">
              <Input
                type="url"
                aria-label="Optional link"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Optional URL (https://...)"
                className="py-2 text-xs"
              />
              <Input
                type="text"
                aria-label="Optional notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional context or notes..."
                className="py-2 text-xs"
              />
            </div>
          )}
        </form>
      </SurfaceCard>

      {/* Search, Filter & Sort Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Filter inbox by item type"
            className="inline-flex items-center gap-1 rounded-orbit-control bg-orbit-subtle p-1"
          >
            {(
              [
                { id: "all", label: "All" },
                { id: "thoughts", label: "Thoughts" },
                { id: "links", label: "Links" },
              ] as const
            ).map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`min-h-[40px] sm:min-h-[32px] rounded-lg px-3 py-1.5 sm:py-1 text-xs font-semibold transition-all ${active
                      ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                      : "text-orbit-text-secondary hover:text-orbit-text"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-medium text-orbit-text-muted">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 sm:max-w-md sm:justify-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-orbit-text-muted" />
            <input
              type="search"
              aria-label="Search inbox items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inbox..."
              className="min-h-[40px] sm:min-h-[34px] w-full rounded-orbit-control border border-orbit-border bg-orbit-surface py-1.5 pr-3 pl-8.5 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:outline-hidden transition-colors"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowUpDown className="h-3.5 w-3.5" />}
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="h-10 sm:h-8 shrink-0"
          >
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      {/* Items Stream */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          eyebrow={search || typeFilter !== "all" ? "FILTER RESULT" : "CAPTURE DISPATCH"}
          title={search || typeFilter !== "all" ? "No matching items" : "Inbox Zero"}
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your search or type filter."
              : "All items have been processed. Capture anything anytime with ⌘⇧K."
          }
          action={
            search || typeFilter !== "all" ? (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={focusQuickCapture}
              >
                Capture your first thought
              </Button>
            )
          }
        />
      ) : (
        <SurfaceCard className="overflow-hidden">
          <ul className="divide-y divide-orbit-border">
            {filteredItems.map((item) => {
              const host = getDisplayHost(item.link);
              const hasLink = Boolean(item.link);

              return (
                <li
                  key={item.id}
                  className="group flex flex-col justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-orbit-surface-secondary/70 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${hasLink
                          ? "bg-orbit-accent-secondary-soft text-orbit-accent-secondary"
                          : "bg-orbit-subtle text-orbit-text-muted"
                        }`}
                      aria-hidden
                    >
                      {hasLink ? <Link2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="[overflow-wrap:anywhere] text-sm font-semibold text-orbit-text">
                          {item.title}
                        </h4>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:opacity-80"
                          >
                            <Badge variant="info">
                              <ExternalLink className="h-2.5 w-2.5" />
                              {host || "Link"}
                            </Badge>
                          </a>
                        )}
                      </div>

                      {item.notes && (
                        <p className="line-clamp-2 [overflow-wrap:anywhere] text-xs leading-relaxed text-orbit-text-muted">
                          {item.notes}
                        </p>
                      )}

                      <p className="text-[11px] font-medium text-orbit-text-muted">
                        Captured {formatFriendlyDate(getEntityLocalDate(item.createdAt))}
                      </p>
                    </div>
                  </div>

                  {/* One-Click Triage Action Bar & Item Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                    {/* One-Click: Task */}
                    <button
                      type="button"
                      onClick={() => triggerTriage("task", item)}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2.5 items-center justify-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface text-xs font-medium text-orbit-text-secondary hover:border-orbit-accent hover:bg-orbit-accent-soft hover:text-orbit-accent transition-colors"
                      title="One-click: Convert to Task"
                      aria-label={`Convert "${item.title}" to task`}
                    >
                      <CheckSquare className="h-4 w-4 shrink-0 text-orbit-accent" />
                      <span className="hidden sm:inline">Task</span>
                    </button>

                    {/* One-Click: Library */}
                    <button
                      type="button"
                      onClick={() => triggerTriage("library", item)}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2.5 items-center justify-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface text-xs font-medium text-orbit-text-secondary hover:border-orbit-accent-secondary hover:bg-orbit-accent-secondary-soft hover:text-orbit-accent-secondary transition-colors"
                      title="One-click: Save to Library"
                      aria-label={`Save "${item.title}" to library`}
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-orbit-accent-secondary" />
                      <span className="hidden sm:inline">Library</span>
                    </button>

                    {/* One-Click: Dismiss */}
                    <button
                      type="button"
                      onClick={() => triggerTriage("dismiss", item)}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2.5 items-center justify-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface text-xs font-medium text-orbit-text-muted hover:border-orbit-danger/40 hover:bg-orbit-danger-soft hover:text-orbit-danger transition-colors"
                      title="One-click: Dismiss item"
                      aria-label={`Dismiss "${item.title}"`}
                    >
                      <Archive className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Dismiss</span>
                    </button>

                    {/* Separator */}
                    <div className="hidden sm:block h-4 w-[1px] bg-orbit-border mx-0.5" aria-hidden />

                    {/* Custom Convert Modal Trigger */}
                    <Button
                      variant="secondary"
                      size="sm"
                      trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => setActiveConvertItem(item)}
                      title="Custom convert (with schedule or habit options)"
                      className="min-h-[44px] sm:min-h-[32px] text-xs text-orbit-accent border-orbit-accent/25 bg-orbit-accent-soft/50 hover:bg-orbit-accent-soft"
                    >
                      Process...
                    </Button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
                      title="Edit title and notes"
                      aria-label={`Edit "${item.title}"`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-danger-soft hover:text-orbit-danger transition-colors"
                      title="Permanently delete item"
                      aria-label={`Delete "${item.title}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SurfaceCard>
      )}

      {/* Convert to Task/Habit/Library Modal */}
      {activeConvertItem && (
        <ConvertModal
          item={activeConvertItem}
          onClose={() => setActiveConvertItem(null)}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditInboxModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete inbox item?"
        description="This item will be permanently removed."
        confirmLabel="Delete"
        danger
        loading={isDeleting}
      />

      {/* Zero-GPU-Blur Undo Toast */}
      {toastMessage && undoPayload && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-3 px-4 py-2.5 rounded-orbit-control border border-orbit-border bg-orbit-surface text-orbit-text shadow-orbit-elevated max-w-sm sm:max-w-md w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <span className="truncate text-xs font-medium text-orbit-text">
            {toastMessage}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1.5 rounded-md bg-orbit-accent px-2.5 py-1 text-xs font-semibold text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setToastMessage(null);
                setUndoPayload(null);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
              aria-label="Dismiss undo notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
