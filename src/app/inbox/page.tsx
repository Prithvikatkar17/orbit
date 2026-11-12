"use client";

import React, { useState, useCallback, useRef, useMemo, Suspense } from "react";
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
  Inbox as InboxIcon,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Item, ItemSchema } from "@/lib/schemas";
import { ConvertModal } from "@/components/inbox/convert-modal";
import { formatFriendlyDate, normalizeUrl } from "@/lib/utils/dates";
import { DeepLinkListener } from "@/components/common/deep-link-listener";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  SurfaceCard,
  Textarea,
} from "@/components/ui";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";

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
    onClose: isSubmitting ? () => {} : onClose,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
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
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  async function handleSaveEdit(updated: Item) {
    await db.items.put(updated);
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

      {/* Header */}
      <PageHeader
        eyebrow="UNIVERSAL INBOX"
        icon={<InboxIcon className="h-4 w-4" />}
        title="Collect & Triage"
        description="Drop fleeting thoughts, links, and ideas here. Organize them into tasks, habits, or library resources when ready."
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
                    className={`h-3.5 w-3.5 transition-transform ${
                      showCaptureDetails ? "rotate-180" : ""
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
                  className={`min-h-[40px] sm:min-h-[32px] rounded-lg px-3 py-1.5 sm:py-1 text-xs font-semibold transition-all ${
                    active
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
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        hasLink
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
                        Captured {formatFriendlyDate(item.createdAt.slice(0, 10))}
                      </p>
                    </div>
                  </div>

                  {/* Triage & Item Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => setActiveConvertItem(item)}
                      title="Convert this item into a task, habit, or library item"
                      className="min-h-[40px] sm:min-h-[32px] text-orbit-accent border-orbit-accent/25 bg-orbit-accent-soft/50 hover:bg-orbit-accent-soft"
                    >
                      Process
                    </Button>

                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
                      title="Edit title and notes"
                      aria-label={`Edit "${item.title}"`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-danger-soft hover:text-orbit-danger transition-colors"
                      title="Delete item"
                      aria-label={`Delete "${item.title}"`}
                    >
                      <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
