"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  CheckSquare,
  Database,
  Download,
  Inbox,
  IndianRupee,
  Keyboard,
  Layers,
  Moon,
  Repeat,
  ShieldCheck,
  Sparkles,
  Sun,
  Calendar,
  BookOpen,
  Zap,
} from "lucide-react";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { THEME_PERSONALITIES, type ThemePersonality } from "@/lib/schemas/settings";
import { useMounted } from "@/lib/utils/dates";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DAILY_LOOP_ITEMS = [
  { label: "Inbox", desc: "Zero-friction capture & 1-click triage", icon: Inbox },
  { label: "Tasks", desc: "Prioritized execution & custom order", icon: CheckSquare },
  { label: "Habits", desc: "Daily streaks & clickable heatmaps", icon: Repeat },
  { label: "Calendar", desc: "Month, week, day & smart snooze", icon: Calendar },
  { label: "Library", desc: "Bookmarks, notes & local attachments", icon: BookOpen },
  { label: "Expenses", desc: "₹ INR paise precision & burn-rate", icon: IndianRupee },
];

const SHORTCUTS = [
  { keys: "⌘ K", desc: "Universal search & `>` command palette" },
  { keys: "⌘ ⇧ K", desc: "Quick Capture (Inbox, Task, Habit, Expense)" },
  { keys: "g t / g e", desc: "Two-key chords to Tasks, Expenses, Habits" },
];

export default function WelcomePage() {
  const router = useRouter();
  const mounted = useMounted();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { themePersonality, setThemePersonality } = useThemePersonality();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const isDark = (resolvedTheme || theme) === "dark";

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handlePrimaryPwaAction() {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      } catch {
        // fallback to launching app
      } finally {
        setIsInstalling(false);
      }
      router.push("/");
      return;
    }
    router.push("/");
  }

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-between space-y-12"
      style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
    >
      {/* Top Bar */}
      <header
        className="flex items-center justify-between gap-4 border-b border-orbit-border pb-4"
        style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-orbit-control border border-orbit-border bg-orbit-surface text-orbit-accent font-display font-bold text-lg shadow-orbit-xs">
            O
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-orbit-text">
                ORBIT
              </span>
              <Badge variant="accent">v1.0.0</Badge>
            </div>
            <p className="text-[11px] text-orbit-text-muted hidden sm:block">
              Personal Space. Everything in Place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle Light and Dark mode"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 text-xs font-medium text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
            style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
          >
            {mounted && isDark ? (
              <>
                <Moon className="h-4 w-4 text-orbit-accent" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-orbit-warning" />
                <span className="hidden sm:inline">Light</span>
              </>
            )}
          </button>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-orbit-control bg-orbit-accent px-4 text-xs sm:text-sm font-semibold text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors shadow-orbit-xs"
          >
            <span>Open App</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="space-y-7 pt-2">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orbit-border bg-orbit-surface px-3 py-1 text-xs font-medium text-orbit-text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-orbit-accent" />
            <span>100% Local-First · IndexedDB + SQLite Vault</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-orbit-text leading-[1.12]">
            Your Local-First Personal OS. Zero Cloud. Zero Subscriptions.
          </h1>

          <p className="text-sm sm:text-base text-orbit-text-secondary leading-relaxed max-w-2xl">
            Instant 0ms optimistic speed, complete data sovereignty, and unified daily
            workflows — combining Inbox triage, Tasks, Habits, Calendar, Personal Library,
            and ₹ INR Daily Expenses in one quiet, keyboard-driven workspace.
          </p>
        </div>

        {/* Live 7-Theme Switcher Bar */}
        <div
          className="rounded-orbit-panel border border-orbit-border bg-orbit-surface p-3.5 sm:p-4 space-y-2.5"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orbit-text">
              <Sparkles className="h-3.5 w-3.5 text-orbit-accent" />
              <span>Live 7-Theme Personality Switcher</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-orbit-text-muted">
              Instant CSS Token Morph
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Theme Personalities"
            className="flex flex-wrap items-center gap-2"
          >
            {THEME_PERSONALITIES.map((p) => {
              const isSelected = mounted && themePersonality === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => void setThemePersonality(p.id as ThemePersonality)}
                  className={`flex min-h-[44px] items-center gap-2 rounded-orbit-control border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "border-orbit-accent bg-orbit-accent text-orbit-accent-fg font-semibold shadow-orbit-xs"
                      : "border-orbit-border bg-orbit-bg text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: p.swatches.accent }}
                  />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual Action Buttons */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePrimaryPwaAction}
              disabled={isInstalling}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-orbit-control bg-orbit-accent px-6 py-3 text-sm font-semibold text-orbit-accent-fg hover:bg-orbit-accent-hover transition-colors shadow-orbit-card cursor-pointer active:scale-[0.99]"
            >
              <Zap className="h-4 w-4" />
              <span>
                {deferredPrompt
                  ? isInstalling
                    ? "Installing App..."
                    : "Install ORBIT App (Offline PWA)"
                  : "Launch ORBIT App (Offline PWA)"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="https://github.com/Prithvikatkar17/orbit/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface px-5 py-3 text-sm font-semibold text-orbit-text hover:bg-orbit-subtle transition-colors"
            >
              <Download className="h-4 w-4 text-orbit-accent" />
              <span>Download for Windows (.exe)</span>
              <Badge variant="neutral">Desktop SQLite · Coming Soon</Badge>
            </a>
          </div>

          <p className="text-xs text-orbit-text-muted">
            {deferredPrompt
              ? "Ready for 1-click native installation directly to your desktop or home screen."
              : "Already installed or on iOS Safari? Launch directly into your local vault, or use Share → Add to Home Screen."}
          </p>
        </div>
      </section>

      {/* Interactive Bento Feature Showcase */}
      <section aria-label="ORBIT Architecture Highlights" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: The Daily Loop */}
        <SurfaceCard
          padding="md"
          className="lg:col-span-7 space-y-4"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-orbit-border pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-orbit-accent" />
              <h2 className="font-display text-base font-semibold text-orbit-text">
                The Daily Loop
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-orbit-text-muted">
              6 Integrated Modules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DAILY_LOOP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-start gap-2.5 rounded-orbit-control border border-orbit-border bg-orbit-bg p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orbit-surface border border-orbit-border text-orbit-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-orbit-text">
                      {item.label}
                    </div>
                    <p className="text-[11px] text-orbit-text-muted leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>

        {/* Card 2: Privacy Vault */}
        <SurfaceCard
          padding="md"
          className="lg:col-span-5 space-y-4 flex flex-col justify-between"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-orbit-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-orbit-accent" />
                <h2 className="font-display text-base font-semibold text-orbit-text">
                  Privacy Vault
                </h2>
              </div>
              <Badge variant="success">Zero Telemetry</Badge>
            </div>

            <p className="text-xs sm:text-sm text-orbit-text-secondary leading-relaxed">
              Your thoughts, schedules, attachments, and expenses live locally inside
              IndexedDB (and <code className="font-mono text-orbit-text">orbit.sqlite</code>{" "}
              when self-hosted). No accounts, no tracking, no lock-in.
            </p>
          </div>

          <div className="rounded-orbit-control border border-orbit-border bg-orbit-bg p-3 space-y-1.5">
            <div className="text-xs font-semibold text-orbit-text">
              Portable Exports Anytime
            </div>
            <p className="text-[11px] text-orbit-text-muted">
              One-click <code className="font-mono text-orbit-text">.zip</code> workspace
              archives, <code className="font-mono text-orbit-text">.csv</code> expense
              ledgers, and atomic WAL-safe{" "}
              <code className="font-mono text-orbit-text">.sqlite</code> snapshots.
            </p>
          </div>
        </SurfaceCard>

        {/* Card 3: Keyboard-First Speed */}
        <SurfaceCard
          padding="md"
          className="lg:col-span-7 space-y-3"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-orbit-border pb-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-orbit-accent" />
              <h2 className="font-display text-base font-semibold text-orbit-text">
                Keyboard-First Speed
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-orbit-text-muted">
              Command &amp; Chords
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="rounded-orbit-control border border-orbit-border bg-orbit-bg p-3 space-y-1.5"
              >
                <kbd className="inline-block rounded-xs border border-orbit-border bg-orbit-surface px-2 py-0.5 font-mono text-[11px] font-bold text-orbit-accent">
                  {s.keys}
                </kbd>
                <p className="text-[11px] text-orbit-text-muted leading-snug">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Card 4: Zero GPU Blur Tax */}
        <SurfaceCard
          padding="md"
          className="lg:col-span-5 space-y-3 flex flex-col justify-between"
          style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-orbit-border pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orbit-accent" />
              <h2 className="font-display text-base font-semibold text-orbit-text">
                Zero GPU Blur Tax
              </h2>
            </div>
            <Badge variant="accent">0ms Optimistic UI</Badge>
          </div>

          <p className="text-xs sm:text-sm text-orbit-text-secondary leading-relaxed">
            Built with solid surfaces, crisp hairline borders, integer-paise currency
            math, and zero <code className="font-mono text-orbit-text">backdrop-filter</code>{" "}
            overhead so every tap stays locked at 60fps on desktop and mobile.
          </p>
        </SurfaceCard>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-orbit-border pt-5 text-xs text-orbit-text-muted">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-orbit-text">ORBIT</span>
          <Badge variant="neutral">v1.0.0</Badge>
          <span>· Local-First Personal OS</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/" className="font-medium text-orbit-accent hover:underline">
            Launch App →
          </Link>
          <a
            href="https://github.com/Prithvikatkar17/orbit"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orbit-text transition-colors"
          >
            GitHub (@Prithvikatkar17)
          </a>
        </div>
      </footer>
    </div>
  );
}
