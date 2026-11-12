"use client";

import React from "react";
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

  const isDark = (resolvedTheme || theme) === "dark";

  function handleOpenSearch() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    openSearch();
  }

  function handleOpenQuickCapture() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    openQuickCapture();
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-orbit-border bg-orbit-surface-secondary p-4 transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 pt-2">
          <Link href="/" className="flex items-center gap-2.5">
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

          <div className="flex items-center gap-1.5">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text md:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Global Action Controls: Quick Capture & Search */}
        <div className="mb-5 space-y-2">
          <button
            type="button"
            onClick={handleOpenQuickCapture}
            title="Quick Capture (Ctrl+Shift+K)"
            className="flex w-full items-center justify-between rounded-orbit-control bg-orbit-accent px-3.5 py-2.5 text-sm font-semibold text-orbit-accent-fg shadow-orbit-card transition-all hover:bg-orbit-accent-hover active:scale-[0.98]"
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
            className="flex w-full items-center justify-between rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2 text-xs font-medium text-orbit-text-secondary transition-colors hover:border-orbit-border-strong hover:text-orbit-text"
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
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Primary navigation">
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
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 rounded-orbit-control px-3.5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-orbit-surface text-orbit-accent font-semibold shadow-orbit-xs"
                    : "font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
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
        <div className="border-t border-orbit-border pt-3">
          <button
            type="button"
            onClick={() => {
              if (mounted) {
                setTheme(isDark ? "light" : "dark");
              }
            }}
            className="flex w-full items-center justify-between rounded-orbit-control px-3.5 py-2.5 text-sm font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
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
  const { toggleSidebar, openQuickCapture } = useUIStore();
  const openSearch = useSearchStore((s) => s.openSearch);

  return (
    <header className="flex h-14 items-center justify-between border-b border-orbit-border bg-orbit-surface px-4 md:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
        aria-label="Toggle Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-[-0.02em] text-orbit-text"
      >
        ORBIT
      </Link>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => openSearch()}
          className="flex h-9 w-9 items-center justify-center rounded-orbit-control border border-orbit-border bg-orbit-surface text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
          aria-label="Open Universal Search"
          title="Search ORBIT (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </button>
        <NotificationCenter />
        <button
          type="button"
          onClick={openQuickCapture}
          className="flex h-9 w-9 items-center justify-center rounded-orbit-control bg-orbit-accent text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors"
          aria-label="Quick Add"
          title="Quick Capture (Ctrl+Shift+K)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
