"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, CheckSquare, Repeat, Plus, CloudOff } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import { useMounted } from "@/lib/utils/dates";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { flushSyncQueue } from "@/lib/services/sync-queue-service";

export function MobileBottomNav() {
  const pathname = usePathname();
  const mounted = useMounted();
  const { openQuickCapture } = useUIStore();
  const { themePersonality } = useThemePersonality();

  const inboxCount = useLiveQuery(
    () => db.items.where("status").equals("pending").count(),
    []
  ) ?? 0;
  const pendingSyncCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;

  const isMinimalist = mounted && themePersonality === "minimalist";
  const isFuturistic = mounted && themePersonality === "futuristic";
  const isArchivist = mounted && themePersonality === "archivist";

  const NAV_LINKS = [
    { name: "Home", href: "/", icon: Home },
    { name: "Inbox", href: "/inbox", icon: Inbox, count: inboxCount },
    { name: "Capture", isAction: true },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Habits", href: "/habits", icon: Repeat },
  ];

  return (
    <>
    <nav
      aria-label="Mobile Bottom Navigation"
      className={`fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-orbit-border bg-orbit-surface px-1 lg:hidden select-none ${
        isMinimalist
          ? "border-black/20 dark:border-white/20"
          : isFuturistic
          ? "border-[#00f0ff]/20 bg-[#05080e]/95"
          : isArchivist
          ? "border-[#b89758]/30 bg-[#fbf7ee]/95 dark:bg-[#1a1612]/95"
          : ""
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      {NAV_LINKS.map((item) => {
        if (item.isAction) {
          return (
            <button
              key="quick-capture-button"
              type="button"
              onClick={openQuickCapture}
              title="Quick Capture (+)"
              aria-label="Quick Capture"
              className="group flex flex-col items-center justify-center -mt-4 min-h-[44px] min-w-[44px] px-2 touch-manipulation active:scale-95 transition-transform"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center bg-orbit-accent text-orbit-accent-fg shadow-orbit-card transition-all group-hover:bg-orbit-accent-hover ${
                  isMinimalist
                    ? "rounded-none border border-black dark:border-white"
                    : isFuturistic
                    ? "rounded-xl border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    : isArchivist
                    ? "rounded-full border border-[#b89758]/60"
                    : "rounded-full"
                }`}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="mt-0.5 text-[9px] font-semibold tracking-wider text-orbit-text-muted uppercase">
                Add
              </span>
            </button>
          );
        }

        const Icon = item.icon!;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);

        return (
          <Link
            key={item.href}
            href={item.href!}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-1 touch-manipulation transition-colors ${
              active
                ? isFuturistic
                  ? "text-[#00f0ff] font-semibold"
                  : isArchivist
                  ? "text-[#b89758] font-semibold"
                  : "text-orbit-accent font-semibold"
                : "text-orbit-text-muted hover:text-orbit-text"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="h-5 w-5" />
              {item.count !== undefined && mounted && item.count > 0 && (
                <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orbit-accent px-1 text-[9px] font-bold text-orbit-accent-fg shadow-xs">
                  {item.count > 99 ? "99+" : item.count}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 ${
                active ? "font-semibold" : "font-normal text-orbit-text-muted"
              } ${isFuturistic ? "font-mono" : ""}`}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
    {mounted && pendingSyncCount > 0 && (
      <div className="fixed bottom-16 inset-x-0 z-30 flex justify-center pointer-events-none lg:hidden pb-1">
        <button
          type="button"
          onClick={() => void flushSyncQueue()}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-orbit-warning/40 bg-orbit-surface px-3 py-1 text-[11px] font-medium text-orbit-warning shadow-md hover:bg-orbit-subtle transition-colors"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
          title="Click to sync offline changes"
        >
          <CloudOff className="h-3 w-3" />
          <span>{pendingSyncCount} pending</span>
        </button>
      </div>
    )}
    </>
  );
}
