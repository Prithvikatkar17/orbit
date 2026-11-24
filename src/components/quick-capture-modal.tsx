"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRight, Star, Zap } from "lucide-react";
import { useUIStore, type QuickCaptureInitialData } from "@/lib/stores/ui-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import {
  ItemSchema,
  HabitSchema,
  LibraryEntrySchema,
  TaskSchema,
  type LibraryEntry,
} from "@/lib/schemas";
import { saveTaskWithSync } from "@/lib/services/task-sync-service";
import { syncMutation } from "@/lib/services/sync-queue-service";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { normalizeUrl } from "@/lib/utils/dates";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { useMounted } from "@/lib/utils/dates";

function getInitialCaptureData(storeData?: QuickCaptureInitialData): QuickCaptureInitialData {
  if (storeData && (storeData.title || storeData.link || storeData.notes || storeData.category)) {
    return storeData;
  }
  if (typeof window !== "undefined") {
    try {
      if (window.location.pathname === "/capture") {
        return storeData ?? {};
      }
      const stored =
        window.sessionStorage.getItem("orbit-share-draft") ||
        window.sessionStorage.getItem("orbit_pending_capture");
      if (stored) {
        window.sessionStorage.removeItem("orbit-share-draft");
        window.sessionStorage.removeItem("orbit_pending_capture");
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return storeData ?? {};
}

function QuickCaptureListener() {
  const { openQuickCapture, closeQuickCapture } = useUIStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (window.location.pathname === "/capture") {
        return;
      }
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const isSharedFlag =
        params.get("shared") === "1" ||
        params.get("quickCapture") === "1" ||
        params.has("capture");

      const storedDraft =
        window.sessionStorage.getItem("orbit-share-draft") ||
        window.sessionStorage.getItem("orbit_pending_capture");

      if (storedDraft) {
        window.sessionStorage.removeItem("orbit-share-draft");
        window.sessionStorage.removeItem("orbit_pending_capture");
        try {
          const parsed = JSON.parse(storedDraft);
          openQuickCapture(parsed);
        } catch {
          openQuickCapture(storedDraft);
        }
      } else if (isSharedFlag) {
        openQuickCapture();
      }

      if (isSharedFlag) {
        const url = new URL(window.location.href);
        url.searchParams.delete("shared");
        url.searchParams.delete("quickCapture");
        url.searchParams.delete("capture");
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
    } catch (err) {
      console.warn("Failed checking pending capture storage:", err);
    }
  }, [openQuickCapture]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+Shift+K / Cmd+Shift+K: Toggle Quick Capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const { quickCaptureOpen: isOpen, openQuickCapture: openQC, closeQuickCapture: closeQC } =
          useUIStore.getState();
        if (isOpen) closeQC();
        else openQC();
      } else if (e.key === "Escape" && useUIStore.getState().quickCaptureOpen) {
        closeQuickCapture();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeQuickCapture]);

  return null;
}

function QuickCaptureDialog() {
  const { quickCaptureOpen, closeQuickCapture, quickCaptureInitialData, captureToInbox } = useUIStore();
  const modalRef = useAccessibleModal({
    isOpen: quickCaptureOpen,
    onClose: closeQuickCapture,
  });

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

  const controlRadiusClass = isMinimalist
    ? "rounded-none"
    : isNaturalist
    ? "rounded-xl"
    : isFuturistic || isArchivist
    ? "rounded-md"
    : "rounded-orbit-control";

  const initialData = getInitialCaptureData(quickCaptureInitialData);
  const [title, setTitle] = useState(initialData.title ?? "");
  const [notes, setNotes] = useState(initialData.notes ?? "");
  const [link, setLink] = useState(initialData.link ?? "");
  const [category, setCategory] = useState(
    initialData.category ?? (initialData.link ? "bookmark" : "inbox")
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  // Library-specific Quick Capture fields
  const [collectionId, setCollectionId] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<LibraryEntry["status"]>("saved");
  const [tagInput, setTagInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const collections = useLiveQuery(
    () => db.libraryCollections.orderBy("sortOrder").toArray(),
    []
  ) ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLibraryCategory = [
    "watch",
    "youtube",
    "learn",
    "buy",
    "bookmark",
    "article",
    "video",
    "playlist",
    "note",
    "file",
    "library",
  ].includes(category.toLowerCase());


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();
    const trimmedTitle = title.trim();
    const trimmedNotes = notes.trim();
    const normalizedLink = normalizeUrl(link);
    const lowerCat = category.toLowerCase();
    const capturePriority = priority;
    const captureDueDate = dueDate;
    const captureDueTime = dueTime;
    const captureCollectionId = collectionId;
    const captureIsFavorite = isFavorite;
    const captureLibraryStatus = libraryStatus;
    const captureTagInput = tagInput;

    // 1. Compute nextSortOrder for tasks
    let nextSortOrder = 0;
    if (!isLibraryCategory && lowerCat !== "inbox" && lowerCat !== "habit") {
      try {
        const existingTasks = await db.tasks.toArray();
        const maxSortOrder =
          existingTasks.length > 0
            ? Math.max(...existingTasks.map((t) => t.sortOrder ?? 0))
            : -1;
        nextSortOrder = maxSortOrder + 1;
      } catch {
        nextSortOrder = 0;
      }
    }

    // 2. Validate with Zod before closing modal or resetting state to prevent data loss
    if (lowerCat === "inbox") {
      const parsed = ItemSchema.safeParse({
        id,
        title: trimmedTitle,
        notes: trimmedNotes,
        link: normalizedLink,
        category: "inbox",
        priority: capturePriority,
        status: "pending",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Validation failed for inbox item");
        setIsSubmitting(false);
        return;
      }
    } else if (lowerCat === "habit") {
      const parsed = HabitSchema.safeParse({
        id,
        title: trimmedTitle,
        notes: trimmedNotes,
        frequency: "daily",
        customDays: [],
        color: "#10b981",
        isActive: true,
        sortOrder: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Validation failed for habit");
        setIsSubmitting(false);
        return;
      }
    } else if (isLibraryCategory) {
      let resolvedType: LibraryEntry["type"] = "other";
      switch (lowerCat) {
        case "bookmark":
        case "library":
          resolvedType = "bookmark";
          break;
        case "video":
        case "youtube":
          resolvedType = "video";
          break;
        case "watch":
          resolvedType = "watch";
          break;
        case "article":
          resolvedType = "article";
          break;
        case "note":
          resolvedType = "note";
          break;
        case "learn":
          resolvedType = "learn";
          break;
        case "buy":
          resolvedType = "buy";
          break;
        case "playlist":
          resolvedType = "playlist";
          break;
        case "file":
          resolvedType = "file";
          break;
        default:
          resolvedType = "other";
          break;
      }

      const tags = captureTagInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (!tags.includes(lowerCat) && lowerCat !== "library") {
        tags.push(lowerCat);
      }

      const parsed = LibraryEntrySchema.safeParse({
        id,
        title: trimmedTitle,
        notes: trimmedNotes,
        link: normalizedLink,
        type: resolvedType,
        status: captureLibraryStatus,
        tags,
        isFavorite: captureIsFavorite,
        collectionId: captureCollectionId || undefined,
        completedAt: captureLibraryStatus === "completed" ? nowIso : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Validation failed for library resource");
        setIsSubmitting(false);
        return;
      }
    } else {
      const parsed = TaskSchema.safeParse({
        id,
        title: trimmedTitle,
        notes: trimmedNotes,
        link: normalizedLink,
        category: lowerCat,
        priority: capturePriority,
        status: "todo",
        dueDate: captureDueDate || undefined,
        dueTime: captureDueTime || undefined,
        sortOrder: nextSortOrder,
        tags: [category],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message || "Validation failed for task");
        setIsSubmitting(false);
        return;
      }
    }

    // 3. Optimistic UI: Immediately close modal and reset form state now that validation passed
    closeQuickCapture();
    setTitle("");
    setNotes("");
    setLink("");
    setDueDate("");
    setDueTime("");
    setCategory("inbox");
    setCollectionId("");
    setIsFavorite(false);
    setLibraryStatus("saved");
    setTagInput("");
    setIsSubmitting(false);

    try {
      if (lowerCat === "inbox") {
        // Dual-write: Instant local Dexie backup
        try {
          const item = ItemSchema.parse({
            id,
            title: trimmedTitle,
            notes: trimmedNotes,
            link: normalizedLink,
            category: "inbox",
            priority: capturePriority,
            status: "pending",
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          void db.items.add(item).catch((err) => {
            console.warn("Optimistic Dexie write error:", err);
          });
        } catch (validationErr) {
          console.warn("ItemSchema validation error:", validationErr);
        }

        // Asynchronous non-blocking SQLite backend sync (fire-and-forget without freezing UI)
        void captureToInbox({
          id,
          title: trimmedTitle,
          notes: trimmedNotes,
          link: normalizedLink,
          category: "inbox",
          priority: capturePriority,
          status: "pending",
        });
      } else if (lowerCat === "habit") {
        void syncMutation({
          endpoint: "/api/habits",
          method: "POST",
          body: {
            id,
            title: trimmedTitle,
            notes: trimmedNotes,
            description: trimmedNotes,
            frequency: "daily",
            customDays: [],
            color: "#10b981",
            isActive: true,
            sortOrder: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          entityType: "habit",
          entityId: id,
        });

        const habit = HabitSchema.parse({
          id,
          title: trimmedTitle,
          notes: trimmedNotes,
          frequency: "daily",
          customDays: [],
          color: "#10b981",
          isActive: true,
          sortOrder: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        void db.habits.add(habit).catch((err) => {
          console.warn("Habit save error:", err);
        });
      } else if (isLibraryCategory) {
        let resolvedType: LibraryEntry["type"] = "other";
        switch (lowerCat) {
          case "bookmark":
          case "library":
            resolvedType = "bookmark";
            break;
          case "video":
          case "youtube":
            resolvedType = "video";
            break;
          case "watch":
            resolvedType = "watch";
            break;
          case "article":
            resolvedType = "article";
            break;
          case "note":
            resolvedType = "note";
            break;
          case "learn":
            resolvedType = "learn";
            break;
          case "buy":
            resolvedType = "buy";
            break;
          case "playlist":
            resolvedType = "playlist";
            break;
          case "file":
            resolvedType = "file";
            break;
          default:
            resolvedType = "other";
            break;
        }

        const tags = captureTagInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!tags.includes(lowerCat) && lowerCat !== "library") {
          tags.push(lowerCat);
        }

        const entry = LibraryEntrySchema.parse({
          id,
          title: trimmedTitle,
          notes: trimmedNotes,
          link: normalizedLink,
          type: resolvedType,
          status: captureLibraryStatus,
          tags,
          isFavorite: captureIsFavorite,
          collectionId: captureCollectionId || undefined,
          completedAt: captureLibraryStatus === "completed" ? nowIso : undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        void db.libraryEntries.add(entry).catch((err) => {
          console.warn("Library entry save error:", err);
        });
      } else {
        // Task / Goal / Idea
        void syncMutation({
          endpoint: "/api/tasks",
          method: "POST",
          body: {
            id,
            title: trimmedTitle,
            notes: trimmedNotes,
            link: normalizedLink,
            category: lowerCat,
            priority: capturePriority,
            status: "todo",
            dueDate: captureDueDate,
            dueTime: captureDueTime,
            sortOrder: nextSortOrder,
            tags: [category],
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          entityType: "task",
          entityId: id,
        });

        void saveTaskWithSync({
          taskData: {
            id,
            title: trimmedTitle,
            notes: trimmedNotes,
            link: normalizedLink,
            category: lowerCat,
            priority: capturePriority,
            status: "todo",
            dueDate: captureDueDate,
            dueTime: captureDueTime,
            sortOrder: nextSortOrder,
            tags: [category],
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        }).catch((err) => {
          console.warn("Task save error:", err);
        });
      }
    } catch (err) {
      console.error("Failed to save capture:", err);
    }
  }

  const QUICK_TYPES: { id: string; label: string; icon: string }[] = [
    { id: "inbox", label: "Inbox", icon: "📥" },
    { id: "task", label: "Task", icon: "📌" },
    { id: "habit", label: "Habit", icon: "🌱" },
    { id: "note", label: "Note", icon: "📝" },
    { id: "bookmark", label: "Resource", icon: "🔖" },
    { id: "goal", label: "Goal", icon: "🎯" },
  ];

  return (
    <div className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-capture-modal-title"
        tabIndex={-1}
        className={`orbit-modal-dialog max-h-[90dvh] w-full max-w-lg overflow-y-auto border bg-orbit-surface p-4 sm:p-6 outline-hidden scrollbar-thin transition-all ${dialogRadiusClass}`}
      >
        {/* 7-Personality Tactile Top Bezel Strips */}
        {mounted && (
          <>
            {isArchivist && (
              <div
                data-testid="quick-capture-bezel-archivist"
                className="relative bg-[#1c2e24] dark:bg-[#15231c] text-[#f4efe4] px-4 py-2 border-b border-[#b89758]/40 flex items-center justify-between select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b89758] border border-[#d4af37]" />
                  <span className="font-mono text-[10px] tracking-widest text-[#d4af37] uppercase font-semibold">
                    EX LIBRIS SCRIPTO // QUICK CAPTURE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-serif italic text-[#e8decb]/80">
                  <span>Folio Scripto</span>
                  <span className="text-[#b89758]">❦</span>
                </div>
              </div>
            )}

            {isFuturistic && (
              <div
                data-testid="quick-capture-bezel-futuristic"
                className="futuristic-command-deck px-4 py-2 border-b border-[#00f0ff]/20 flex items-center justify-between text-[#94a3b8] select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#00f0ff]">
                    SYS.CAPTURE // BUFFER READY
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#64748b]">
                  <span>BUFFER: 0x00A1</span>
                  <span className="text-[#00f0ff]/70 font-mono">⊕</span>
                </div>
              </div>
            )}

            {isAesthetic && (
              <div
                data-testid="quick-capture-bezel-aesthetic"
                className="bg-[#fdfbf7] dark:bg-[#181614] px-4 py-2 border-b border-[#2c2621]/15 dark:border-[#f0eae1]/15 flex items-center justify-between select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <span className="font-serif uppercase text-[9px] tracking-[0.2em] text-[#786c5e] dark:text-[#a89c8e]">
                  SECTION CAPTURE · KINFOLK ARCHIVE
                </span>
                <span className="font-serif italic text-[11px] text-[#c06c52]">Quick Register</span>
              </div>
            )}

            {isArtistic && (
              <div
                data-testid="quick-capture-bezel-artistic"
                className="relative overflow-hidden bg-gradient-to-r from-[#faf6ed] via-[#fff5eb] to-[#f0f4ff] dark:from-[#181615] dark:via-[#1e1b18] dark:to-[#151824] px-4 py-2 border-b border-[#d97706]/30 dark:border-[#d97706]/20 flex items-center justify-between select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#d97706]">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                  <span>ATELIER ORBIT · QUICK CAPTURE</span>
                </div>
                <span className="font-serif italic text-xs text-[#d97706]/80">Composition Buffer</span>
              </div>
            )}

            {isMinimalist && (
              <div data-testid="quick-capture-bezel-minimalist" className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4">
                <div className="w-full h-[2px] bg-[#ff3b00]" />
                <div className="bg-transparent px-4 py-1.5 border-b border-black/15 dark:border-white/15 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff3b00]">
                    <span>SYSTEM CAPTURE // QUICK REGISTER</span>
                  </div>
                  <span className="font-mono text-[9px] text-[#737373] tracking-widest uppercase">
                    BUFFER 01
                  </span>
                </div>
              </div>
            )}

            {isNaturalist && (
              <div
                data-testid="quick-capture-bezel-naturalist"
                className="naturalist-canopy-hero px-4 py-2 border-b border-[#235c3b]/40 flex items-center justify-between text-[#f4efe4] bg-[#0a1811] select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#f59e0b]">
                    CONSERVATORY FIELD LOG // CAPTURE
                  </span>
                </div>
                <span className="text-xs select-none">🌱</span>
              </div>
            )}

            {isMidnight && (
              <div
                data-testid="quick-capture-bezel-midnight"
                className="midnight-zenith-hero px-4 py-2 border-b border-[#1e1b4b] flex items-center justify-between text-[#f8fafc] bg-[#03050c] select-none -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#fbbf24] uppercase">
                  <span className="text-[#fbbf24] select-none">✦</span>
                  <span>OBSERVATORY EPHEMERIS // QUICK LOG</span>
                </div>
                <span className="font-mono text-[9px] text-[#818cf8] tracking-widest uppercase">
                  TELEMETRY 00
                </span>
              </div>
            )}
          </>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
          <h2 id="quick-capture-modal-title" className="font-display text-xl font-medium text-orbit-text flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-orbit-accent" aria-hidden="true" />
            <span>Quick Capture</span>
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeQuickCapture}
            className={`flex h-10 w-10 items-center justify-center text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text transition-colors ${controlRadiusClass}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {formError && (
            <div
              role="alert"
              className="rounded-md bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in"
            >
              {formError}
            </div>
          )}
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="What do you want to remember or do?"
              className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3.5 py-2.5 text-base text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass} ${
                isArchivist
                  ? "font-serif placeholder:font-serif"
                  : isFuturistic
                  ? "font-mono"
                  : isMinimalist
                  ? "font-mono rounded-none"
                  : ""
              }`}
            />
          </div>

          {/* Tactile Entity Type Selector Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-orbit-text-secondary">
                Type
              </label>
              <select
                aria-label="More categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`text-[11px] border border-orbit-border bg-orbit-surface-secondary px-2 py-0.5 text-orbit-text focus:outline-hidden ${controlRadiusClass}`}
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name.toLowerCase()}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_TYPES.map((t) => {
                const isSelected = category.toLowerCase() === t.id;
                const pillClass = isMinimalist
                  ? `rounded-none font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border transition-all ${
                      isSelected
                        ? "bg-[#ff3b00] border-[#ff3b00] text-white font-bold"
                        : "border-black/20 dark:border-white/20 text-orbit-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
                    }`
                  : isNaturalist
                  ? `rounded-full px-3 py-1 text-xs border transition-all ${
                      isSelected
                        ? "bg-[#10b981] border-[#10b981] text-white font-medium shadow-xs"
                        : "border-orbit-border text-orbit-text-secondary hover:bg-orbit-subtle"
                    }`
                  : isFuturistic
                  ? `rounded-sm font-mono text-xs px-2.5 py-1 border transition-all ${
                      isSelected
                        ? "bg-[#00f0ff] border-[#00f0ff] text-[#04111d] font-bold shadow-[0_0_6px_#00f0ff]/40"
                        : "border-[#00f0ff]/30 text-[#94a3b8] hover:text-[#00f0ff]"
                    }`
                  : isArchivist
                  ? `rounded-md font-serif text-xs px-3 py-1 border transition-all ${
                      isSelected
                        ? "bg-[#1b4332] border-[#1b4332] text-[#faf9f5] font-semibold"
                        : "border-[#b89758]/40 text-orbit-text-secondary hover:bg-orbit-subtle"
                    }`
                  : isArtistic
                  ? `rounded-full px-3 py-1 text-xs border transition-all ${
                      isSelected
                        ? "bg-[#d97706] border-[#d97706] text-white font-medium"
                        : "border-orbit-border text-orbit-text-secondary hover:bg-orbit-subtle"
                    }`
                  : isMidnight
                  ? `rounded-md font-mono text-xs px-3 py-1 border transition-all ${
                      isSelected
                        ? "bg-[#818cf8] border-[#818cf8] text-[#03050c] font-semibold"
                        : "border-[#1e1b4b] text-orbit-text-secondary hover:text-[#818cf8]"
                    }`
                  : `rounded-orbit-control px-3 py-1 text-xs font-medium border transition-all ${
                      isSelected
                        ? "bg-orbit-accent border-orbit-accent text-orbit-accent-fg shadow-orbit-xs"
                        : "border-orbit-border text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                    }`;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCategory(t.id)}
                    className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${pillClass}`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Pills (for actionable items) or Collection Selector (for Library items) */}
          {isLibraryCategory ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Collection (Optional)
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
              >
                <option value="">No Collection</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.icon || "📁"} {col.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                Priority
              </label>
              <div className="flex items-center gap-2">
                {(["low", "medium", "high"] as const).map((p) => {
                  const isSelected = priority === p;
                  const label = p.charAt(0).toUpperCase() + p.slice(1);
                  const pClass = isMinimalist
                    ? `rounded-none font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border flex-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? p === "high"
                            ? "bg-[#ff3b00] border-[#ff3b00] text-white font-bold"
                            : "bg-black/10 dark:bg-white/20 border-black/40 dark:border-white/40 text-black dark:text-white font-bold"
                          : "border-black/20 dark:border-white/20 text-neutral-500 hover:bg-black/5"
                      }`
                    : isFuturistic
                    ? `rounded-sm font-mono text-xs px-3 py-1.5 border flex-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? p === "high"
                            ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] font-bold"
                            : p === "medium"
                            ? "bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] font-bold"
                            : "bg-[#00e5a3]/20 border-[#00e5a3] text-[#00e5a3] font-bold"
                          : "border-[#00f0ff]/20 text-[#64748b] hover:text-[#94a3b8]"
                      }`
                    : isArchivist
                    ? `rounded-md font-serif text-xs px-3 py-1.5 border flex-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? p === "high"
                            ? "bg-[#8c2d38]/20 border-[#8c2d38] text-[#8c2d38] dark:text-[#f8e8ea] font-bold"
                            : p === "medium"
                            ? "bg-[#b08938]/20 border-[#b08938] text-[#b08938] font-bold"
                            : "bg-[#1b4332]/20 border-[#1b4332] text-[#1b4332] dark:text-[#faf9f5] font-bold"
                          : "border-[#b89758]/30 text-orbit-text-secondary hover:bg-orbit-subtle"
                      }`
                    : isNaturalist
                    ? `rounded-full text-xs px-3 py-1.5 border flex-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? p === "high"
                            ? "bg-[#ef4444]/20 border-[#ef4444] text-[#991b1b] dark:text-[#fca5a5] font-semibold"
                            : p === "medium"
                            ? "bg-[#f59e0b]/20 border-[#f59e0b] text-[#92400e] dark:text-[#fcd34d] font-semibold"
                            : "bg-[#10b981]/20 border-[#10b981] text-[#065f46] dark:text-[#a7f3d0] font-semibold"
                          : "border-orbit-border text-orbit-text-secondary hover:bg-orbit-subtle"
                      }`
                    : isMidnight
                    ? `rounded-md font-mono text-xs px-3 py-1.5 border flex-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? p === "high"
                            ? "bg-[#ef4444]/20 border-[#ef4444] text-[#f87171] font-bold"
                            : p === "medium"
                            ? "bg-[#fbbf24]/20 border-[#fbbf24] text-[#fbbf24] font-bold"
                            : "bg-[#818cf8]/20 border-[#818cf8] text-[#818cf8] font-bold"
                          : "border-[#1e1b4b] text-orbit-text-secondary hover:text-[#818cf8]"
                      }`
                    : `rounded-orbit-control text-xs px-3 py-1.5 border flex-1 text-center font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-orbit-accent border-orbit-accent text-orbit-accent-fg shadow-orbit-xs"
                          : "border-orbit-border text-orbit-text-secondary hover:bg-orbit-subtle"
                      }`;

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={pClass}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isLibraryCategory && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Status
                </label>
                <select
                  value={libraryStatus}
                  onChange={(e) => setLibraryStatus(e.target.value as LibraryEntry["status"])}
                  className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
                >
                  <option value="saved">Saved (Not Started)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. react, tutorial"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
                />
              </div>
            </div>
          )}

          {!isLibraryCategory && category.toLowerCase() !== "inbox" && category.toLowerCase() !== "habit" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
                  Time (Optional)
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              {isLibraryCategory ? "Resource Link / URL" : "Link / Reference URL (Optional)"}
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className={`w-full border border-orbit-border bg-orbit-surface-secondary px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-orbit-text-secondary">
              {isLibraryCategory ? "Notes & Takeaways (Optional)" : "Notes & Details (Optional)"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isLibraryCategory ? "Notes, thoughts, or key takeaways..." : "Notes or details..."}
              className={`w-full border border-orbit-border bg-orbit-surface-secondary p-3 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors ${controlRadiusClass}`}
            />
          </div>

          {isLibraryCategory && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="quick-capture-favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-4 w-4 rounded-md border-orbit-border bg-orbit-surface text-orbit-accent focus:ring-orbit-ring"
              />
              <label
                htmlFor="quick-capture-favorite"
                className="text-xs font-medium text-orbit-text-secondary cursor-pointer flex items-center gap-1.5 select-none"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isFavorite ? "fill-amber-400 text-amber-400" : "text-orbit-text-muted"
                  }`}
                />
                <span>Mark as Favourite</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-orbit-border">
            <Button
              type="button"
              variant="secondary"
              onClick={closeQuickCapture}
              className={isMinimalist ? "!rounded-none" : ""}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!title.trim() || isSubmitting}
              trailingIcon={<ArrowRight className="h-4 w-4" />}
              className={
                isMinimalist
                  ? "!rounded-none !bg-[#ff3b00] hover:!bg-[#e03400] !text-white font-mono uppercase"
                  : isFuturistic
                  ? "!rounded-sm !bg-[#00f0ff] hover:!bg-[#00d0e0] !text-[#04111d] font-mono uppercase font-bold shadow-[0_0_8px_#00f0ff]/40"
                  : isArchivist
                  ? "!rounded-md !bg-[#1b4332] hover:!bg-[#143326] !text-[#faf9f5] font-serif font-semibold"
                  : isNaturalist
                  ? "!rounded-full !bg-[#10b981] hover:!bg-[#059669] !text-white font-medium"
                  : isArtistic
                  ? "!rounded-full !bg-[#d97706] hover:!bg-[#b45309] !text-white font-serif"
                  : isMidnight
                  ? "!rounded-md !bg-[#818cf8] hover:!bg-[#6366f1] !text-[#03050c] font-semibold"
                  : ""
              }
            >
              Capture
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuickCaptureModal() {
  const { quickCaptureOpen, quickCaptureInitialData } = useUIStore();

  const dialogKey = quickCaptureOpen
    ? `${quickCaptureInitialData?.title ?? ""}-${quickCaptureInitialData?.link ?? ""}-${quickCaptureInitialData?.notes ?? ""}-${quickCaptureInitialData?.category ?? ""}`
    : "closed";

  return (
    <>
      <QuickCaptureListener />
      {quickCaptureOpen && <QuickCaptureDialog key={dialogKey} />}
    </>
  );
}
