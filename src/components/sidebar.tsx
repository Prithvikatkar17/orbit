"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Inbox,
  CheckSquare,
  Calendar,
  Repeat,
  BookOpen,
  BarChart2,
  Settings,
  Sun,
  Moon,
  Plus,
  Search,
  Menu,
  X,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useSearchStore } from "@/lib/stores/search-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import { NotificationCenter } from "@/components/reminders/notification-center";
import { useMounted } from "@/lib/utils/dates";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Habits", href: "/habits", icon: Repeat },
  { name: "Library", href: "/library", icon: BookOpen },
  { name: "Insights", href: "/insights", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const mounted = useMounted();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen, openQuickCapture } = useUIStore();
  const openSearch = useSearchStore((s) => s.openSearch);
  const inboxCount = useLiveQuery(() => db.items.where("status").equals("pending").count(), []) ?? 0;
  const libraryCount = useLiveQuery(() => db.libraryEntries.count(), []) ?? 0;

  const [isDesktop, setIsDesktop] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const isDark = (resolvedTheme || theme) === "dark";

  // Track desktop (>= 1024px) breakpoint for drawer inertness & auto-close
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const syncBreakpoint = () => {
      setIsDesktop(media.matches);
      if (media.matches && useUIStore.getState().sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    syncBreakpoint();
    media.addEventListener("change", syncBreakpoint);
    return () => media.removeEventListener("change", syncBreakpoint);
  }, [setSidebarOpen]);

  // Manage drawer focus, Escape key, and focus restoration below 1024px
  useEffect(() => {
    if (isDesktop) {
      wasOpenRef.current = false;
      return;
    }

    if (sidebarOpen) {
      if (!wasOpenRef.current && typeof document !== "undefined") {
        previousFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      wasOpenRef.current = true;

      const frameId = requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setSidebarOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const modalOpened =
        useUIStore.getState().quickCaptureOpen || useSearchStore.getState().isSearchOpen;
      if (!modalOpened) {
        requestAnimationFrame(() => {
          if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
            previousFocusRef.current.focus();
          } else {
            document.getElementById("orbit-mobile-nav-trigger")?.focus();
          }
        });
      }
    }
  }, [sidebarOpen, isDesktop, setSidebarOpen]);

  function handleOpenSearch() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    openSearch();
  }

  function handleOpenQuickCapture() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    openQuickCapture();
  }

  // Only set inert/aria-hidden after mount to prevent SSR/client attribute mismatch
  const isMobileDrawerHidden = mounted && !isDesktop && !sidebarOpen;

  return (
    <>
      {/* Mobile / Tablet Backdrop (< 1024px) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container: slide-over drawer < 1024px, sticky rail >= 1024px */}
      <aside
        aria-label="Workspace sidebar"
        aria-hidden={isMobileDrawerHidden || undefined}
        inert={isMobileDrawerHidden || undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-orbit-border bg-orbit-surface-secondary p-4 transition-[transform,visibility] duration-300 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:visible ${
          sidebarOpen ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 pt-1">
          <Link
            href="/"
            onClick={() => {
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="flex min-h-[44px] items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-orbit-control bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs">
              <span className="font-display text-lg font-semibold">O</span>
            </div>
            <div>
              <span className="font-display text-xl font-semibold tracking-[-0.02em] text-orbit-text">
                ORBIT
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.14em] text-orbit-accent uppercase">
                Personal Space
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text lg:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Global Action Controls: Quick Capture & Search */}
        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={handleOpenQuickCapture}
            title="Quick Capture (Ctrl+Shift+K)"
            className="flex min-h-[44px] w-full items-center justify-between rounded-orbit-control bg-orbit-accent px-3.5 py-2.5 text-sm font-semibold text-orbit-accent-fg shadow-orbit-card transition-all hover:bg-orbit-accent-hover active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add anything</span>
            </span>
            <kbd className="rounded-md bg-black/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orbit-accent-fg/90">
              ⌘⇧K
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleOpenSearch}
            title="Universal Search (Ctrl+K)"
            aria-label="Open Universal Search"
            className="flex min-h-[44px] w-full items-center justify-between rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs font-medium text-orbit-text-secondary transition-colors hover:border-orbit-border-strong hover:text-orbit-text"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-orbit-text-muted" />
              <span>Search ORBIT...</span>
            </span>
            <kbd className="rounded-md border border-orbit-border bg-orbit-surface-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orbit-text-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex min-h-[44px] items-center gap-3 rounded-orbit-control px-3.5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-orbit-surface text-orbit-accent font-semibold shadow-orbit-xs"
                    : "font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-orbit-accent" : "text-orbit-text-muted"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.name === "Inbox" && mounted && inboxCount > 0 && (
                  <span className="rounded-full bg-orbit-accent px-2 py-0.5 text-[10px] font-bold text-orbit-accent-fg shadow-orbit-xs">
                    {inboxCount}
                  </span>
                )}
                {item.name === "Library" && mounted && libraryCount > 0 && (
                  <span className="rounded-full bg-orbit-subtle px-2 py-0.5 text-[10px] font-bold text-orbit-text-secondary">
                    {libraryCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Theme Toggle */}
        <div className="shrink-0 border-t border-orbit-border pt-3">
          <button
            type="button"
            onClick={() => {
              if (mounted) {
                setTheme(isDark ? "light" : "dark");
              }
            }}
            className="flex min-h-[44px] w-full items-center justify-between rounded-orbit-control px-3.5 py-2.5 text-sm font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
            aria-label="Toggle light and dark theme"
          >
            <div className="flex items-center gap-3">
              {!mounted ? (
                <>
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <div className="h-3.5 w-3.5 rounded-full border border-orbit-border-strong" />
                  </div>
                  <span className="text-orbit-text-muted">Theme</span>
                </>
              ) : (
                <>
                  {isDark ? (
                    <Moon className="h-4 w-4 text-orbit-accent shrink-0" />
                  ) : (
                    <Sun className="h-4 w-4 text-orbit-warning shrink-0" />
                  )}
                  <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-orbit-text-muted">Toggle</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader() {
  const { sidebarOpen, toggleSidebar, openQuickCapture } = useUIStore();
  const openSearch = useSearchStore((s) => s.openSearch);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-orbit-border bg-orbit-surface/95 px-2.5 backdrop-blur-xs sm:px-4 lg:hidden">
      <button
        id="orbit-mobile-nav-trigger"
        type="button"
        aria-expanded={sidebarOpen}
        onClick={toggleSidebar}
        className="flex h-11 w-11 items-center justify-center rounded-orbit-control text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
        aria-label="Toggle Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link
        href="/"
        className="flex min-h-[44px] items-center px-2 font-display text-lg font-semibold tracking-[-0.02em] text-orbit-text"
      >
        ORBIT
      </Link>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openSearch()}
          className="flex h-11 w-11 items-center justify-center rounded-orbit-control border border-orbit-border bg-orbit-surface text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
          aria-label="Open Universal Search"
          title="Search ORBIT (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </button>
        <NotificationCenter />
        <button
          type="button"
          onClick={openQuickCapture}
          className="flex h-11 w-11 items-center justify-center rounded-orbit-control bg-orbit-accent text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors"
          aria-label="Quick Add"
          title="Quick Capture (Ctrl+Shift+K)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
