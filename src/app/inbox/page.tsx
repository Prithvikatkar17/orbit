"use client";

import React, { useState, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Item, ItemSchema } from "@/lib/schemas";
import { ConvertModal } from "@/components/inbox/convert-modal";
import { formatFriendlyDate, normalizeUrl } from "@/lib/utils/dates";
import { DeepLinkListener } from "@/components/common/deep-link-listener";

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeConvertItem, setActiveConvertItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newLink, setNewLink] = useState("");
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const items = useLiveQuery(async () => {
    return await db.items.where("status").equals("pending").toArray();
  }, []) ?? [];

  // Filter & sort
  const filteredItems = items
    .filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  async function handleAddInline(e: React.FormEvent) {
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
      setIsAddingInline(false);
    } catch (err) {
      console.error("Failed to add inbox item:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to add inbox item");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this inbox item?")) return;
    await db.items.delete(id);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim()) return;

    setErrorMessage(null);
    try {
      const updated = ItemSchema.parse({
        ...editingItem,
        title: editingItem.title.trim(),
        notes: editingItem.notes?.trim() || "",
        link: normalizeUrl(editingItem.link),
        updatedAt: new Date().toISOString(),
      });

      await db.items.put(updated);
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to update inbox item:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to update item");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener params={["itemId"]} onDeepLink={handleInboxDeepLink} />
      </Suspense>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              📥
            </span>
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
              UNIVERSAL INBOX
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Quick Capture & Triage
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Jot down thoughts, links, and ideas. Process them into tasks, habits, or library items anytime.
          </p>
        </div>

        <button
          onClick={() => setIsAddingInline(!isAddingInline)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Capture Item</span>
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inline Quick Capture Bar */}
      {isAddingInline && (
        <form
          onSubmit={handleAddInline}
          className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20 animate-in fade-in"
        >
          <div className="space-y-3">
            <input
              type="text"
              autoFocus
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What's on your mind? (e.g. Call Alex, Research React 19...)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Optional link (https://...)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes or details..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingInline(false)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Save to Inbox
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inbox items..."
            className="w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredItems.length} unprocessed
          </span>

          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              {search ? "No matching items found" : "Inbox Zero!"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {search
                ? "Try searching for a different keyword."
                : "All items have been processed. Capture anything anytime with ⌘⇧K."}
            </p>
            {!search && (
              <button
                onClick={() => setIsAddingInline(true)}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                + Capture your first thought
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900/60"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 hover:underline dark:bg-indigo-950 dark:text-indigo-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Link</span>
                    </a>
                  )}
                </div>

                {item.notes && (
                  <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {item.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                  <span>Captured {formatFriendlyDate(item.createdAt.slice(0, 10))}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setActiveConvertItem(item)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-transform hover:bg-indigo-700 active:scale-95"
                  title="Convert this item into a task, habit, or library item"
                >
                  <span>Process</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setEditingItem(item)}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="Edit title and notes"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Convert to Task/Habit/Library Modal */}
      {activeConvertItem && (
        <ConvertModal
          item={activeConvertItem}
          onClose={() => setActiveConvertItem(null)}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in">
            <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              Edit Inbox Item
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Link
                </label>
                <input
                  type="url"
                  value={editingItem.link || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, link: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editingItem.notes || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, notes: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
