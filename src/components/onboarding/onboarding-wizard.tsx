"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Repeat,
  Calendar,
  BookOpen,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import {
  THEME_PERSONALITIES,
  type ThemePersonality,
  DEFAULT_THEME_PERSONALITY,
} from "@/lib/schemas/settings";
import { useThemePersonality } from "@/components/theme-personality-provider";
import {
  checkOnboardingStatus,
  completeOnboarding,
} from "@/lib/services/onboarding-service";
import { ThemePersonalityCard } from "@/components/theme-preview-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

const CORE_MODULES = [
  {
    title: "Tasks & Goals",
    description:
      "Organize actionable priorities, set due dates, and track completion velocity without clutter.",
    icon: CheckCircle2,
    badge: "Priorities",
  },
  {
    title: "Daily Routines",
    description:
      "Form enduring daily habits with scheduled frequencies, single-tap check-ins, and streak retention.",
    icon: Repeat,
    badge: "Cadence",
  },
  {
    title: "Calendar & Occurrences",
    description:
      "Map out upcoming events, recurring schedules, and non-intrusive local browser reminders.",
    icon: Calendar,
    badge: "Schedule",
  },
  {
    title: "Personal Library",
    description:
      "A distraction-free repository for personal notes, bookmarked resources, and research collections.",
    icon: BookOpen,
    badge: "Knowledge",
  },
  {
    title: "Insights & Rhythm",
    description:
      "Reflect on throughput metrics, habit consistency, and weekly momentum with zero telemetry.",
    icon: BarChart3,
    badge: "Analytics",
  },
];

const STEP_LABELS = [
  { num: 1, label: "Discover" },
  { num: 2, label: "Personality" },
  { num: 3, label: "Preview" },
];

// ---------------------------------------------------------------------------
// Dynamic Workspace Specimen Preview Components (Step 3)
// ---------------------------------------------------------------------------

export function DynamicWorkspaceSpecimen({ theme }: { theme: ThemePersonality }) {
  switch (theme) {
    case "archivist":
      return (
        <div className="space-y-4 text-xs font-serif">
          {/* Bound Collector's Tome Header */}
          <div className="bg-[#1c2e24] dark:bg-[#15231c] text-[#f4efe4] border border-[#b89758]/50 p-4 rounded-xl shadow-xs relative">
            <div className="flex items-center justify-between border-b border-[#b89758]/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full border border-[#d4af37] bg-[#b89758]/60 inline-block" />
                <span className="font-serif italic text-sm tracking-wide text-[#e8decb]">
                  Bodleian Rare Book Folio · Vol. I
                </span>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-[#d4af37]">§ MS. 402</span>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h3 className="font-serif text-lg font-bold text-[#fef9ee]">Good afternoon, Scholar</h3>
              <span className="font-mono text-[11px] text-[#b89758]">Curatorial Reading Room</span>
            </div>
          </div>

          {/* 2-Column Archival Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Punched Card Catalog Drawers (7 cols) */}
            <div className="sm:col-span-7 rounded-xl border border-[#d8cfbe] dark:border-[#382f25] bg-[#f8f5ee] dark:bg-[#1a1613] text-[#2c2219] dark:text-[#e8decb] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#d8cfbe]/60 dark:border-[#382f25]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#8b1e2d] dark:text-[#ef4444]" />
                  <h4 className="font-serif text-sm font-bold">Today&apos;s Focus</h4>
                </div>
                <span className="font-mono text-[10px] uppercase text-[#8b1e2d] dark:text-[#ef4444] font-semibold">
                  Card Catalog →
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#efe8d8] dark:bg-[#241e19] border border-[#d8cfbe] dark:border-[#3d3227]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full border border-[#947844] bg-[#f8f5ee] dark:bg-[#1a1613] shadow-inner shrink-0" />
                    <div>
                      <p className="font-serif font-semibold text-xs">Examine Winchester Psalter Facsimile</p>
                      <p className="font-mono text-[9px] text-[#7d6b58] dark:text-[#a89682]">CAT. NO. 094 · RUBRIC FOLIO</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8b1e2d]/10 text-[#8b1e2d] dark:text-[#fca5a5] border border-[#8b1e2d]/30 font-semibold">
                    Manuscript
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#efe8d8] dark:bg-[#241e19] border border-[#d8cfbe] dark:border-[#3d3227]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full border border-[#947844] bg-[#f8f5ee] dark:bg-[#1a1613] shadow-inner shrink-0" />
                    <div>
                      <p className="font-serif font-semibold text-xs">Transcribe Carolingian Minuscule Glosses</p>
                      <p className="font-mono text-[9px] text-[#7d6b58] dark:text-[#a89682]">CAT. NO. 112 · ARCHIVAL VELLUM</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#b89758]/20 text-[#8c6b2d] dark:text-[#fde68a] border border-[#b89758]/40 font-semibold">
                    Accession
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Routines: Silk Bookmark Lectionary (5 cols) */}
            <div className="sm:col-span-5 rounded-xl border border-[#d8cfbe] dark:border-[#382f25] bg-[#f8f5ee] dark:bg-[#1a1613] text-[#2c2219] dark:text-[#e8decb] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#d8cfbe]/60 dark:border-[#382f25]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#8b1e2d] dark:text-[#ef4444]" />
                  <h4 className="font-serif text-sm font-bold">Daily Routines</h4>
                </div>
                <span className="font-mono text-[10px] uppercase text-[#7d6b58] dark:text-[#a89682]">
                  Lectionary
                </span>
              </div>

              <div className="space-y-2">
                <div className="relative p-2.5 rounded-lg bg-[#efe8d8] dark:bg-[#241e19] border border-[#d8cfbe] dark:border-[#3d3227] flex items-center justify-between">
                  <div>
                    <p className="font-serif font-semibold text-xs">Latin Reading &amp; Gloss</p>
                    <p className="font-mono text-[9px] text-[#7d6b58] dark:text-[#a89682]">Cadence: 05 Days</p>
                  </div>
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-3.5 h-7 bg-[#8b1e2d] shadow-xs"
                      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
                    />
                    <span className="absolute top-1 text-[6px] text-[#fca5a5]">✦</span>
                  </div>
                </div>

                <div className="relative p-2.5 rounded-lg bg-[#efe8d8] dark:bg-[#241e19] border border-[#d8cfbe] dark:border-[#3d3227] flex items-center justify-between">
                  <div>
                    <p className="font-serif font-semibold text-xs">Aristotle Logic Notation</p>
                    <p className="font-mono text-[9px] text-[#7d6b58] dark:text-[#a89682]">Cadence: 03 Days</p>
                  </div>
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-3.5 h-7 bg-[#d97706] shadow-xs"
                      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
                    />
                    <span className="absolute top-1 text-[6px] text-[#fef3c7]">✦</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "futuristic":
      return (
        <div className="space-y-4 text-xs font-mono">
          {/* Titanium Faceplate Header */}
          <div className="bg-[#0c1219] dark:bg-[#070b10] border border-[#1e2c40] p-4 rounded-xl text-[#94a3b8] shadow-xs">
            <div className="flex items-center justify-between border-b border-[#1e2c40] pb-2 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] inline-block shrink-0" />
                <span className="text-[#00f0ff] font-bold tracking-wider">
                  SYS // NOMINAL · PRECISION 60Hz
                </span>
              </div>
              <span className="text-[#64748b] tracking-widest">[CONSOLE 01]</span>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h3 className="text-base font-bold text-[#f8fafc] tracking-tight">Good afternoon, Operator</h3>
              <span className="text-[#00f0ff] text-[11px] font-bold">04 OPEN VECTORS · 02 CRITICAL</span>
            </div>
          </div>

          {/* 2-Column Avionics Console Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Primary Vector Capsule (8 cols) */}
            <div className="sm:col-span-8 rounded-xl border border-[#1a2b42] bg-[#0c1624] text-[#e2e8f0] p-4 space-y-3 shadow-xs border-l-4 border-l-[#00f0ff]">
              <div className="flex items-center justify-between border-b border-[#1a2b42] pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#00f0ff]" />
                  <h4 className="text-sm font-bold text-[#f8fafc]">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] text-[#00f0ff] font-bold tracking-wider">[ACTIVE VECTOR]</span>
              </div>

              <div className="p-3 rounded-lg bg-[#070b10] border border-[#1e2c40] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f8fafc]">SYS.01 // CORE PRECISION WORKSPACE</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 font-bold">
                    PRIORITY 01
                  </span>
                </div>
                <p className="text-[10px] text-[#94a3b8]">Precision Teenage Engineering hardware sequencer and telemetry sync.</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] text-[#64748b]">TIMECODE: 00:00:00</span>
                  <span className="px-2.5 py-1 rounded bg-[#0284c7] dark:bg-[#00f0ff] text-white dark:text-[#04111d] text-[10px] font-bold shadow-xs">
                    ✓ Complete Focus
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Routines: 7-Step Sequencer Keybed (4 cols) */}
            <div className="sm:col-span-4 rounded-xl border border-[#1a2b42] bg-[#0c1624] text-[#e2e8f0] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#1a2b42] pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#00f0ff]" />
                  <h4 className="text-sm font-bold text-[#f8fafc]">Daily Routines</h4>
                </div>
                <span className="text-[9px] text-[#64748b] tracking-wider">SEQUENCER</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-[#070b10] border border-[#1e2c40] space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-[#f8fafc]">Telemetry Sync</span>
                    <span className="text-[#00f0ff] font-bold">05D LOCK</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[true, true, true, true, true, false, false].map((active, i) => (
                      <span
                        key={i}
                        className={`h-4 rounded-xs flex items-center justify-center text-[8px] font-bold ${
                          active
                            ? "bg-[#00f0ff] text-[#04111d] shadow-[0_0_4px_rgba(0,240,255,0.4)]"
                            : "bg-[#e2e8f0] dark:bg-[#0b131e] border border-[#cbd5e1] dark:border-[#1a273a] text-[#64748b]"
                        }`}
                      >
                        {["M", "T", "W", "T", "F", "S", "S"][i]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "aesthetic":
      return (
        <div className="space-y-4 text-xs font-serif bg-[#fdfbf7] dark:bg-[#181614] p-4 rounded-xl border border-[#2c2621]/15 text-[#2c2621] dark:text-[#f0eae1]">
          {/* Kinfolk Editorial Masthead */}
          <div className="text-center space-y-1.5 border-b border-[#2c2621]/20 dark:border-[#f0eae1]/20 pb-3">
            <span className="font-serif italic text-base sm:text-lg tracking-[0.2em] text-[#2c2621] dark:text-[#f0eae1] block">
              KINFOLK · EDITION IV
            </span>
            <div className="border-t border-b border-[#2c2621]/20 dark:border-[#f0eae1]/20 py-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-[#786c5e] dark:text-[#a89c8e]">
              <span>AUTUMN / WINTER</span>
              <span className="font-serif tracking-normal [word-spacing:0.35em]">A QUIET RHYTHM &nbsp;OF DAILY HOURS</span>
              <span>ISSUE 04</span>
            </div>
          </div>

          {/* 2-Column Spread */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Terracotta Feature Article (7 cols) */}
            <div className="sm:col-span-7 rounded-xl border-l-4 border-l-[#c06c52] bg-[#f7f2ea] dark:bg-[#201c18] p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#c06c52]" />
                  <h4 className="font-serif text-sm font-semibold">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] font-mono text-[#c06c52]">LEAD ESSAY</span>
              </div>
              <h5 className="font-serif text-base font-bold text-[#2c2621] dark:text-[#f0eae1]">
                The Art of Stillness and Essential Craft
              </h5>
              <p className="text-xs text-[#786c5e] dark:text-[#a89c8e] leading-relaxed">
                A deliberate study into natural materials, warm linen textures, and timeless editorial pacing.
              </p>
            </div>

            {/* Daily Routines: Ceramic River Pebble Track (5 cols) */}
            <div className="sm:col-span-5 rounded-xl border border-[#2c2621]/15 dark:border-[#f0eae1]/15 p-4 space-y-3 bg-[#f7f2ea]/60 dark:bg-[#201c18]/60">
              <div className="flex items-center justify-between pb-1 border-b border-[#2c2621]/15 dark:border-[#f0eae1]/15">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#786c5e] dark:text-[#a89c8e]" />
                  <h4 className="font-serif text-sm font-semibold">Daily Routines</h4>
                </div>
                <span className="text-[9px] font-mono text-[#786c5e] dark:text-[#a89c8e]">RHYTHM</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-baseline justify-between">
                  <span>Morning Studio Reading</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-[#2c2621]/30 dark:border-[#f0eae1]/30" />
                  <span className="font-mono text-[9px]">08:00</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Tea &amp; Archival Reflection</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-[#2c2621]/30 dark:border-[#f0eae1]/30" />
                  <span className="font-mono text-[9px]">16:30</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "artistic":
      return (
        <div
          className="space-y-4 text-xs p-4 rounded-xl border border-orbit-border relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 15% 20%, rgba(244,63,94,0.14) 0%, transparent 60%), radial-gradient(ellipse at 85% 80%, rgba(59,130,246,0.14) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)",
          }}
        >
          {/* Gouache & Watercolor Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orbit-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-base sm:text-lg font-bold text-orbit-text">
                  Studio Composition No. 04
                </span>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#2563eb]" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C9 5 5 7 5 11C5 15 8 18 12 22C16 18 19 15 19 11C19 7 15 5 12 2ZM12 8C13.5 10 14 12 13 14C12 16 10 17 9 15C8 13 9.5 10 12 8Z" />
                </svg>
              </div>
              <p className="text-[11px] text-orbit-text-muted">The Chromatic Watercolor &amp; Gouache Atelier</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]" title="Cadmium Red" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]" title="Yellow Ochre" />
              <span className="w-3 h-3 rounded-full bg-[#3b82f6]" title="Ultramarine" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]" title="Veridian" />
            </div>
          </div>

          {/* 2-Column Atelier Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Gouache Swatch Bands (7 cols) */}
            <div className="sm:col-span-7 rounded-xl border border-orbit-border bg-orbit-surface/80 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-orbit-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orbit-accent" />
                  <h4 className="font-serif text-sm font-bold text-orbit-text">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] font-mono text-orbit-accent font-semibold">SWATCH BAND</span>
              </div>

              <div className="p-3 rounded-lg bg-orbit-surface-secondary/40 border border-orbit-border/60 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-orbit-text">Large Format Gouache Canvas</span>
                  <Badge variant="accent">Studio</Badge>
                </div>
                <p className="text-[11px] text-orbit-text-muted">Layering cobalt washes over cadmium ochre foundations.</p>
              </div>
            </div>

            {/* Daily Routines: Watercolor Droplet Spectrum (5 cols) */}
            <div className="sm:col-span-5 rounded-xl border border-orbit-border bg-orbit-surface/80 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-orbit-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-orbit-accent" />
                  <h4 className="font-serif text-sm font-bold text-orbit-text">Daily Routines</h4>
                </div>
                <span className="text-[10px] font-mono text-orbit-accent">SPECTRUM</span>
              </div>

              <div className="p-3 rounded-lg bg-orbit-surface-secondary/30 border border-orbit-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-orbit-text">Morning Color Studies</span>
                  <span className="font-mono text-[10px] text-orbit-accent font-bold">04 Droplets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#ef4444]/80 shadow-xs" />
                  <span className="w-4 h-4 rounded-full bg-[#f59e0b]/80 shadow-xs" />
                  <span className="w-4 h-4 rounded-full bg-[#3b82f6]/80 shadow-xs" />
                  <span className="w-4 h-4 rounded-full bg-[#10b981]/80 shadow-xs" />
                  <span className="w-4 h-4 rounded-full bg-orbit-border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "minimalist":
      return (
        <div className="space-y-4 text-xs font-mono p-4 rounded-xl border border-black/15 dark:border-white/15 relative overflow-hidden bg-white dark:bg-[#111111]">
          {/* Top 2px International Signal Orange Ratio Filament */}
          <div className="h-[2px] w-full bg-[#ff3b00] -mx-4 -mt-4 mb-3 w-[calc(100%+2rem)]" />

          {/* Vignelli / Dieter Rams Architectural Masthead */}
          <div className="flex items-baseline justify-between border-b border-black/15 dark:border-white/15 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tighter text-[#111111] dark:text-[#f3f4f6]">15</span>
              <span className="text-sm font-bold tracking-tight text-orbit-text uppercase">INDEX / 01 // ARCHITECTURAL LEDGER</span>
            </div>
            <span className="text-xs font-bold text-[#ff3b00]">RATIO 20%</span>
          </div>

          {/* 2-Column Ledger Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Hairline Tabular Ledger Rows (7 cols) */}
            <div className="sm:col-span-7 border border-black/15 dark:border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#ff3b00]" />
                  <h4 className="text-sm font-bold uppercase tracking-tight text-orbit-text">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] font-bold text-[#ff3b00]">SPEC NO. 01</span>
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10 text-[11px]">
                <div className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-orbit-text">01 // BRAUN ROTARY DIAL PROTOTYPE</span>
                  <span className="text-orbit-text-muted">03d</span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-orbit-text">02 // VIGNELLI UNIGRID SYSTEM DRAFT</span>
                  <span className="text-orbit-text-muted">01d</span>
                </div>
              </div>
            </div>

            {/* Daily Routines: Braun Dial Ticks (5 cols) */}
            <div className="sm:col-span-5 border border-black/15 dark:border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#ff3b00]" />
                  <h4 className="text-sm font-bold uppercase tracking-tight text-orbit-text">Daily Routines</h4>
                </div>
                <span className="text-[10px] text-orbit-text-muted">CADENCE</span>
              </div>

              <div className="space-y-2">
                <div className="p-2 border border-black/10 dark:border-white/10 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-orbit-text">Dieter Rams Principles Review</span>
                    <span className="text-[#ff3b00] font-bold">04d STREAK</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {[true, true, true, true, false, false, false].map((active, i) => (
                      <span
                        key={i}
                        className={`w-[2px] transition-all ${
                          active ? "h-4 bg-[#ff3b00]" : "h-2.5 bg-black/25 dark:bg-white/25"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "naturalist":
      return (
        <div className="space-y-4 text-xs p-4 rounded-xl border border-[#10b981]/30 relative overflow-hidden bg-gradient-to-b from-[#064e3b]/10 to-transparent">
          {/* Canopy Panorama Strip with Solar Arc */}
          <div className="bg-gradient-to-r from-[#173324] to-[#0f2419] text-[#ecfdf5] p-3.5 rounded-lg flex items-center justify-between shadow-xs">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#34d399] font-bold block">
                CANOPY HORIZON · SOLAR DAWN
              </span>
              <h3 className="font-display text-base font-bold text-[#ecfdf5]">
                Living Biophilic Sanctuary
              </h3>
            </div>
            <svg viewBox="0 0 80 20" className="w-20 h-6 overflow-visible" fill="none" aria-hidden="true">
              <path d="M2 18 Q 40 0, 78 18" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" />
              <circle cx="40" cy="9" r="3" fill="#fbbf24" />
            </svg>
          </div>

          {/* 2-Column Biophilic Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Multi-Material Earth Courtyard (7 cols) */}
            <div className="sm:col-span-7 rounded-xl border border-orbit-border bg-orbit-surface p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-orbit-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#059669]" />
                  <h4 className="font-display text-sm font-bold text-orbit-text">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] font-mono text-[#059669] font-semibold">COURTYARD</span>
              </div>

              <div className="space-y-2">
                <div className="border-l-4 border-l-[#c2410c] bg-[#fed7aa]/20 dark:bg-[#7c2d12]/20 p-2.5 rounded-r">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-orbit-text">Red Clay Terracotta Garden Bed</span>
                    <span className="text-[9px] font-mono text-[#c2410c] dark:text-[#fdba74]">TERRA 01</span>
                  </div>
                  <p className="text-[10px] text-orbit-text-muted mt-0.5">Tending Mediterranean herbs and sunlit soil.</p>
                </div>
                <div className="border-l-4 border-l-[#047857] bg-[#a7f3d0]/20 dark:bg-[#064e3b]/20 p-2.5 rounded-r">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-orbit-text">Kyoto Moss Conservatory Trail</span>
                    <span className="text-[9px] font-mono text-[#047857] dark:text-[#6ee7b7]">CANOPY 02</span>
                  </div>
                  <p className="text-[10px] text-orbit-text-muted mt-0.5">High-humidity botanical specimen preservation.</p>
                </div>
              </div>
            </div>

            {/* Daily Routines: 3 Living Terrariums (5 cols) */}
            <div className="sm:col-span-5 rounded-xl border border-[#10b981]/30 bg-[#064e3b]/10 dark:bg-[#064e3b]/20 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#10b981]/30 pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#10b981]" />
                  <h4 className="font-display text-sm font-bold text-orbit-text">Daily Routines</h4>
                </div>
                <span className="text-[10px] font-mono text-[#10b981]">TERRARIUMS</span>
              </div>

              <div className="space-y-2">
                <div className="border border-[#10b981]/40 bg-orbit-surface p-2.5 rounded-lg flex items-center gap-2.5">
                  <svg viewBox="0 0 16 16" className="w-5 h-5 text-[#10b981] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M8 15V7 M8 7C6 4 3 5 3 7C3 9 6 9 8 7ZM8 7C10 4 13 5 13 7C13 9 10 9 8 7Z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-xs text-orbit-text">Perennial Fern Irrigation</p>
                    <p className="font-mono text-[9px] text-[#059669]">06-STAGE GROWTH CYCLE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "midnight":
      return (
        <div className="space-y-4 text-xs font-mono p-4 rounded-xl border border-[#1e1b4b] relative overflow-hidden bg-[#070714] text-[#e0e7ff]">
          {/* Obsidian Zenith Dome Header */}
          <div className="border border-[#312e81] p-3.5 rounded-lg flex items-center justify-between bg-[#0b0b20]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#a5b4fc] font-bold block">
                ZENITH OBSERVATORY · NODAL APOGEE
              </span>
              <h3 className="text-base font-bold text-[#e0e7ff]">
                Celestial Observatory &amp; Astrolabe
              </h3>
            </div>
            <svg viewBox="0 0 40 20" className="w-10 h-5 overflow-visible" fill="none" aria-hidden="true">
              <circle cx="20" cy="10" r="8" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="20" cy="10" r="4" stroke="#818cf8" strokeWidth="0.8" />
              <path d="M32 5 A 5 5 0 0 0 32 15 A 4 4 0 0 1 32 5 Z" fill="#fbbf24" />
            </svg>
          </div>

          {/* 2-Column Celestial Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Today's Focus: Constellation Transit Vector (7 cols) */}
            <div className="sm:col-span-7 rounded-xl border border-[#312e81] bg-[#0c0c24] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#312e81]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#818cf8]" />
                  <h4 className="text-sm font-bold text-[#e0e7ff]">Today&apos;s Focus</h4>
                </div>
                <span className="text-[10px] text-[#fbbf24] font-bold">✦ SUPERNOVA</span>
              </div>

              <div className="p-3 rounded-lg bg-[#070714] border border-[#1e1b4b] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-[#e0e7ff]">ZENITH-01 // DEEP HORIZON CALIBRATION</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 font-bold">
                    MAGNITUDE I
                  </span>
                </div>
                <p className="text-[10px] text-[#94a3b8]">Mapping astrological meridian transits and celestial coordinates.</p>
              </div>
            </div>

            {/* Daily Routines: Planetary Transit Rail (5 cols) */}
            <div className="sm:col-span-5 rounded-xl border border-[#312e81] bg-[#0c0c24] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#312e81]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-[#818cf8]" />
                  <h4 className="text-sm font-bold text-[#e0e7ff]">Daily Routines</h4>
                </div>
                <span className="text-[10px] text-[#818cf8]">TRANSIT</span>
              </div>

              <div className="p-3 rounded-lg bg-[#070714] border border-[#1e1b4b] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#e0e7ff]">Astrolabe Alignment</span>
                  <span className="text-[#fbbf24] font-bold text-[10px]">07-ORBIT LOCK</span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-[#818cf8]">
                  <span>CONSTELLATION ✦</span>
                  <span className="text-[#fbbf24]">APOGEE LOCKED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

export function OnboardingWizard() {
  const { themePersonality, setThemePersonality } = useThemePersonality();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedPersonality, setSelectedPersonality] =
    useState<ThemePersonality>(themePersonality || DEFAULT_THEME_PERSONALITY);

  // Check onboarding status on initial mount
  useEffect(() => {
    let isSubscribed = true;

    checkOnboardingStatus()
      .then((status) => {
        if (!isSubscribed) return;
        if (status.needsOnboarding) {
          setIsOpen(true);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Onboarding check encountered an error:", err);
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSelectPersonality = useCallback(
    async (personality: ThemePersonality) => {
      setSelectedPersonality(personality);
      try {
        await setThemePersonality(personality);
      } catch (err) {
        console.warn("Live theme switch during onboarding:", err);
      }
    },
    [setThemePersonality]
  );

  const handleComplete = useCallback(async () => {
    try {
      await completeOnboarding({ themePersonality: selectedPersonality });
    } finally {
      setIsOpen(false);
    }
  }, [selectedPersonality]);

  const handleSkip = useCallback(async () => {
    try {
      await completeOnboarding({
        themePersonality: selectedPersonality || DEFAULT_THEME_PERSONALITY,
        skipped: true,
      });
    } finally {
      setIsOpen(false);
    }
  }, [selectedPersonality]);

  // Keyboard navigation for step transitions and Escape to skip
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        void handleSkip();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSkip]);

  if (isLoading || !isOpen) {
    return null;
  }

  const activeMeta =
    THEME_PERSONALITIES.find((p) => p.id === selectedPersonality) ??
    THEME_PERSONALITIES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div className="orbit-modal-dialog flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-orbit-border bg-orbit-bg text-orbit-text shadow-orbit-popover overflow-hidden transition-all duration-200">
        {/* Wizard Header & Progress Bar */}
        <header className="px-5 py-4 sm:px-8 sm:py-5 border-b border-orbit-border bg-orbit-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orbit-accent-soft text-orbit-accent border border-orbit-border/60 shadow-orbit-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-orbit-accent">
                ORBIT SETUP
              </span>
              <h1 className="font-display text-base font-bold text-orbit-text leading-tight">
                Welcome to your workspace
              </h1>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center gap-2" aria-label="Onboarding Progress">
            {STEP_LABELS.map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-orbit-accent text-orbit-accent-fg font-semibold shadow-orbit-xs"
                      : isPast
                      ? "bg-orbit-accent-soft text-orbit-accent"
                      : "bg-orbit-surface-secondary text-orbit-text-muted"
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold">
                    {step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              );
            })}
          </div>
        </header>

        {/* Wizard Body (Scrollable for smaller screens) */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: Discover ORBIT                                            */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 1 of 3 • Discover
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Your Personal Space. Everything in Place.
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  ORBIT is a quiet, local-first personal operating system for your
                  tasks, daily habits, calendar, and notes. Everything lives securely
                  inside this browser&apos;s IndexedDB—no tracking, no cloud lock-in.
                </p>
              </div>

              {/* 5 Core Functional Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {CORE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <SurfaceCard
                      key={mod.title}
                      padding="md"
                      className="flex flex-col justify-between hover:border-orbit-border-strong transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-mono text-[10px] uppercase font-semibold text-orbit-text-muted">
                            {mod.badge}
                          </span>
                        </div>
                        <h3 className="font-display text-sm font-bold text-orbit-text mt-1">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-orbit-text-secondary mt-1.5 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </SurfaceCard>
                  );
                })}

                {/* Privacy & Local-First Assurance Tile */}
                <SurfaceCard
                  padding="md"
                  variant="tonal"
                  className="flex flex-col justify-between border-orbit-accent/30 bg-orbit-accent-soft/20 sm:col-span-2 lg:col-span-1"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orbit-accent-soft text-orbit-accent border border-orbit-accent/40">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold text-orbit-accent">
                        Local-First
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-orbit-text mt-1">
                      Zero Telemetry
                    </h3>
                    <p className="text-xs text-orbit-text-secondary mt-1.5 leading-relaxed">
                      Your data never leaves your device. Works 100% offline with zero
                      backend dependencies.
                    </p>
                  </div>
                </SurfaceCard>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: Choose Your Personality                                  */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 2 of 3 • Personalities
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Choose Your Personality
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  Select the visual tone for your workspace. ORBIT adapts its
                  typography, geometric radius, borders, and color temperature
                  instantly. You can always change this anytime in Settings.
                </p>
              </div>

              {/* 7 Personality Cards Grid */}
              <div
                role="radiogroup"
                aria-label="Theme Personalities"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2"
              >
                {THEME_PERSONALITIES.map((meta) => {
                  const isSelected = selectedPersonality === meta.id;
                  return (
                    <ThemePersonalityCard
                      key={meta.id}
                      meta={meta}
                      isSelected={isSelected}
                      onSelect={handleSelectPersonality}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: Preview Your Workspace                                    */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 3 of 3 • Live Preview
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Preview Your Workspace
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  Here is how your dashboard looks in the{" "}
                  <strong className="text-orbit-accent font-semibold">
                    {activeMeta.name}
                  </strong>{" "}
                  personality. Everything is configured and ready.
                </p>
              </div>

              {/* Realistic Specimen Workspace Bento Grid */}
              <div className="rounded-xl border border-orbit-border bg-orbit-bg p-4 sm:p-6 shadow-orbit-sm space-y-5">
                {/* Sleek Preview Window Chrome Bar */}
                <div className="flex items-center justify-between border-b border-orbit-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orbit-border inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orbit-border inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orbit-border inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-orbit-text-muted">
                      ORBIT // {activeMeta.name.toUpperCase()} WORKSPACE
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-1 text-xs font-semibold text-orbit-text">
                      <Layers className="h-3.5 w-3.5 text-orbit-accent" />
                      <span>{activeMeta.name}</span>
                    </span>
                  </div>
                </div>

                {/* Dynamic Specimen Preview for Selected Theme */}
                <DynamicWorkspaceSpecimen theme={selectedPersonality} />

                {/* Personality Specimen Specs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-orbit-border/60 text-xs text-orbit-text-muted">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-semibold text-orbit-text">Theme:</span>
                    <span>{activeMeta.name}</span>
                    <span>·</span>
                    <span>{activeMeta.tagline}</span>
                  </div>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.bg }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.surface }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.accent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Wizard Footer Navigation Actions */}
        <footer className="px-5 py-4 sm:px-8 border-t border-orbit-border bg-orbit-surface flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="secondary"
                size="md"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
              >
                Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold text-orbit-text-muted hover:text-orbit-text transition-colors px-2 py-1.5"
              >
                Skip for now
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleSkip}
                className="hidden sm:inline-block text-xs font-semibold text-orbit-text-muted hover:text-orbit-text transition-colors px-3 py-1.5"
              >
                Skip setup
              </button>
            )}

            {currentStep < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
              >
                <span>
                  {currentStep === 1 ? "Choose Personality" : "Preview Workspace"}
                </span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={handleComplete}
              >
                <span>Enter ORBIT</span>
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
