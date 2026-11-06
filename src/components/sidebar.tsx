"use client";

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
  Menu,
  X,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";

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
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen, openQuickCapture } = useUIStore();

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
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 pt-2">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <span className="text-lg font-bold">O</span>
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                ORBIT
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                Personal Space
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={openQuickCapture}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Add anything</span>
          <span className="ml-1 rounded-md bg-indigo-700/60 px-1.5 py-0.5 text-[10px] text-indigo-200">
            ⌘K
          </span>
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
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
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-indigo-600 dark:text-indigo-400" : ""
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: Theme Toggle */}
        <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <span className="text-[11px] text-slate-400">Toggle</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader() {
  const { toggleSidebar, openQuickCapture } = useUIStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Toggle Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <span className="text-base font-bold text-slate-900 dark:text-white">
        ORBIT
      </span>

      <button
        onClick={openQuickCapture}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"
        aria-label="Quick Add"
      >
        <Plus className="h-4 w-4" />
      </button>
    </header>
  );
}

