"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  type ThemePersonality,
  type ThemePersonalityMeta,
} from "@/lib/schemas/settings";
import { Badge } from "@/components/ui/badge";

export const THEME_SAMPLE_HEADINGS: Record<ThemePersonality, string> = {
  archivist: "Catalogue • Vol. I",
  futuristic: "SYS.01 // TELEMETRY",
  aesthetic: "Harmonic Bloom",
  artistic: "Studio Composition",
  minimalist: "INDEX / 01",
  naturalist: "Forest Cadence",
  midnight: "Cosmic Horizon",
};

export function ThemeMiniMotif({ theme }: { theme: ThemePersonality }) {
  switch (theme) {
    case "archivist":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" />
          <circle cx="8" cy="8" r="4.5" strokeDasharray="1.5 1.5" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case "futuristic":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <path d="M2 5V2h3 M11 2h3v3 M14 11v3h-3 M5 14H2v-3" />
          <circle cx="8" cy="8" r="2" fill="currentColor" />
        </svg>
      );
    case "aesthetic":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
          <circle cx="8" cy="8" r="3" />
          <circle cx="12" cy="5" r="1" fill="currentColor" />
        </svg>
      );
    case "artistic":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <rect
            x="2.5"
            y="2.5"
            width="11"
            height="11"
            rx="1.5"
            transform="rotate(-6 8 8)"
          />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case "minimalist":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="12" height="12" />
          <path d="M8 2v12 M2 8h12" strokeWidth="0.8" />
        </svg>
      );
    case "naturalist":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <path d="M3 13 C4 8 8 4 13 3 C12 8 8 12 3 13 Z" />
          <path d="M3 13 L8 8" strokeWidth="0.8" />
        </svg>
      );
    case "midnight":
      return (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 text-orbit-accent"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1 Q8 8 15 8 Q8 8 8 15 Q8 8 1 8 Q8 8 8 1 Z" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// 7 Bespoke Architectural Mini-Vignettes (Pure CSS + Inline SVG, Zero Blur)
// ---------------------------------------------------------------------------

function ArchivistVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-2 p-2 relative overflow-hidden text-[10px]">
      {/* Mini Hunter Green / Leather Folio Header Strip */}
      <div className="bg-[#1c2e24] dark:bg-[#15231c] text-[#f4efe4] px-2 py-1 rounded-sm border-b border-[#b89758]/50 flex items-center justify-between shadow-xs relative">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full border border-[#d4af37] bg-[#b89758]/60 inline-block" />
          <span className="font-serif italic text-[10px] tracking-wide text-[#e8decb]">
            Folio Liber I · MS. 402
          </span>
        </div>
        <span className="text-[8px] font-mono tracking-widest text-[#d4af37]">§ RUBRIC</span>
      </div>

      {/* Middle Row: Cream Index Card with Accession Hole & Hanging Swallowtail Silk Ribbon */}
      <div className="flex items-center justify-between gap-2">
        {/* Punched Cream Index Card */}
        <div className="flex-1 bg-[#f8f5ee] dark:bg-[#1c1713] text-[#2c2219] dark:text-[#e8decb] border border-[#d8cfbe] dark:border-[#3d3227] rounded p-1.5 flex items-center gap-2 shadow-xs">
          <span
            className="w-2.5 h-2.5 rounded-full border border-[#947844] bg-[#ede5d4] dark:bg-[#110e0c] shrink-0 inline-block shadow-inner"
            title="Accession Rod Hole"
          />
          <div className="min-w-0">
            <p className="font-serif text-[10px] font-semibold truncate leading-tight">
              Catalogue Codex
            </p>
            <p className="font-mono text-[8px] text-[#7d6b58] dark:text-[#a89682]">
              ENTRY NO. 094
            </p>
          </div>
        </div>

        {/* Hanging Swallowtail Silk Ribbon in Oxblood Crimson with Stamped Wax Seal */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div
            className="w-3.5 h-8 bg-[#8b1e2d] shadow-xs"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
          />
          <span
            className="absolute top-1 w-2.5 h-2.5 rounded-full bg-[#7f1d1d] border border-[#b91c1c] text-[6px] text-[#fca5a5] flex items-center justify-center font-serif shadow-xs"
            title="Stamped Wax Seal"
          >
            ✦
          </span>
        </div>
      </div>

      {/* Footer Lectionary Metadata Strip */}
      <div className="flex items-center justify-between text-[8px] font-mono text-[#8c7a68] dark:text-[#a3927f] pt-0.5 border-t border-[#d8cfbe]/60 dark:border-[#3d3227]/60">
        <span>BODLEIAN ARCHIVE</span>
        <span className="text-[#8b1e2d] dark:text-[#ef4444] font-semibold">OXBLOOD SEAL</span>
      </div>
    </div>
  );
}

function FuturisticVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-2 p-2 relative overflow-hidden font-mono text-[10px]">
      {/* Dark Anodized Titanium Header Strip with Glowing Cyan LED */}
      <div className="bg-[#0c1219] dark:bg-[#070b10] border-b border-[#1e2c40] px-2 py-1 rounded-sm flex items-center justify-between text-[#94a3b8] shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff] inline-block shrink-0" />
          <span className="text-[9px] tracking-wider text-[#00f0ff] font-bold">
            04 OPEN · 02 TODAY
          </span>
        </div>
        <span className="text-[8px] text-[#64748b] tracking-widest">[60Hz]</span>
      </div>

      {/* Left Cyan-Bordered Primary Focus Strip */}
      <div className="border-l-2 border-l-[#00f0ff] bg-[#0c1624]/90 dark:bg-[#08101a] border border-[#1a2b42] rounded-r p-1.5 flex items-center justify-between text-[#e2e8f0] shadow-xs">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-tight truncate text-[#f8fafc]">
            SYS.01 // CORE VECTOR
          </div>
          <div className="text-[8px] text-[#00f0ff]/80">STAGE: COMPLETE</div>
        </div>
        <span className="text-[8px] px-1 py-0.5 rounded-xs bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff] font-bold">
          LOCK
        </span>
      </div>

      {/* 7-Step Hardware LED Sequencer Bar */}
      <div className="space-y-0.5 pt-0.5">
        <div className="grid grid-cols-7 gap-1">
          {[true, true, true, true, true, false, false].map((active, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-xs flex items-center justify-center text-[7px] font-bold transition-all ${
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
  );
}

function AestheticVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-1.5 p-2 bg-[#fdfbf7] dark:bg-[#181614] rounded-sm text-[10px]">
      {/* Kinfolk Serif Masthead with Double Hairline Rule */}
      <div className="text-center space-y-1">
        <span className="font-serif italic text-xs tracking-[0.16em] text-[#2c2621] dark:text-[#f0eae1] block">
          KINFOLK · EDITION IV
        </span>
        <div className="border-t border-b border-[#2c2621]/20 dark:border-[#f0eae1]/20 py-0.5 flex items-center justify-between text-[8px] font-serif uppercase tracking-widest text-[#786c5e] dark:text-[#a89c8e]">
          <span>AUTUMN / WINTER</span>
          <span>FOLIO 04</span>
        </div>
      </div>

      {/* Terracotta-Accented Lead Feature Mini-Card */}
      <div className="border-l-2 border-l-[#c06c52] bg-[#f7f2ea] dark:bg-[#201c18] p-1.5 rounded-r flex items-center justify-between shadow-xs">
        <span className="font-serif text-[10px] font-semibold text-[#2c2621] dark:text-[#f0eae1] truncate">
          The Quiet Morning Ritual
        </span>
        <span className="text-[8px] font-mono text-[#c06c52] shrink-0 font-medium">ESSAY 12</span>
      </div>

      {/* 2 Table of Contents Rows with Dotted Leader Lines */}
      <div className="space-y-1 pt-0.5 font-serif text-[9px] text-[#574d43] dark:text-[#bfb3a4]">
        <div className="flex items-baseline justify-between">
          <span>Morning Studio</span>
          <span className="flex-1 mx-1.5 border-b border-dotted border-[#2c2621]/30 dark:border-[#f0eae1]/30" />
          <span className="font-mono text-[8px]">08:00</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span>Archival Review</span>
          <span className="flex-1 mx-1.5 border-b border-dotted border-[#2c2621]/30 dark:border-[#f0eae1]/30" />
          <span className="font-mono text-[8px]">14:30</span>
        </div>
      </div>
    </div>
  );
}

function ArtisticVignette() {
  return (
    <div
      className="flex flex-col h-full justify-between space-y-1.5 p-2 rounded-sm text-[10px] relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 15% 20%, rgba(244,63,94,0.18) 0%, transparent 60%), radial-gradient(ellipse at 85% 80%, rgba(59,130,246,0.18) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)",
      }}
    >
      {/* Header with Title and Matisse Cut-Out Silhouette */}
      <div className="flex items-center justify-between">
        <span className="font-serif italic font-bold tracking-tight text-orbit-text text-[11px]">
          Atelier Composition
        </span>
        {/* Matisse Botanical Cut-Out Silhouette */}
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2563eb] shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M12 2C9 5 5 7 5 11C5 15 8 18 12 22C16 18 19 15 19 11C19 7 15 5 12 2ZM12 8C13.5 10 14 12 13 14C12 16 10 17 9 15C8 13 9.5 10 12 8Z" />
        </svg>
      </div>

      {/* Hand-Drawn Gradient Brushstroke Line */}
      <svg viewBox="0 0 160 8" className="w-full h-1.5" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="brushstroke-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <path
          d="M2 4 Q 40 1, 80 5 T 158 3"
          fill="none"
          stroke="url(#brushstroke-grad)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Gouache Swatch Card paired with 4 Blended Pigment Orbs */}
      <div className="bg-white/85 dark:bg-[#1a1724]/90 border border-black/10 dark:border-white/10 rounded-md p-1.5 flex items-center justify-between text-[9px] shadow-xs">
        <span className="font-medium text-orbit-text truncate mr-1">
          Cadmium & Ultramarine
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-xs" title="Cadmium Red" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-xs" title="Yellow Ochre" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-xs" title="Ultramarine" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-xs" title="Veridian" />
        </div>
      </div>
    </div>
  );
}

function MinimalistVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-1.5 p-2 font-mono text-[10px] relative overflow-hidden">
      {/* Top 2px International Signal Orange Ratio Filament */}
      <div className="h-[2px] w-full bg-[#ff3b00] rounded-t-sm" />

      {/* Oversized Swiss 15 Numeral Lockup */}
      <div className="flex items-baseline justify-between pt-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold tracking-tighter text-[#111111] dark:text-[#f3f4f6] leading-none">
            15
          </span>
          <span className="text-[9px] font-semibold uppercase text-orbit-text tracking-tight">
            INDEX / 01
          </span>
        </div>
        <span className="text-[9px] font-bold text-[#ff3b00]">RATIO 20%</span>
      </div>

      {/* Hairline Tabular Ledger Rows */}
      <div className="border-y border-black/15 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 py-0.5 text-[8.5px]">
        <div className="flex justify-between py-0.5">
          <span className="text-orbit-text font-medium truncate">01 SCHEMATIC REVIEW</span>
          <span className="text-orbit-text-muted shrink-0 ml-1">03d</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-orbit-text font-medium truncate">02 BRAUN LEDGER DRAFT</span>
          <span className="text-orbit-text-muted shrink-0 ml-1">01d</span>
        </div>
      </div>

      {/* 7 Vertical Braun Dial Ticks */}
      <div className="flex items-center justify-between px-1 pt-0.5">
        {[true, true, true, false, false, false, false].map((active, idx) => (
          <span
            key={idx}
            className={`w-[1.5px] rounded-full transition-all ${
              active ? "h-3 bg-[#ff3b00]" : "h-2 bg-black/25 dark:bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function NaturalistVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-1.5 p-2 text-[10px] relative overflow-hidden">
      {/* Deep Forest Green Canopy Panorama Strip with Golden Dotted Solar Arc & Sun Orb */}
      <div className="bg-gradient-to-r from-[#173324] to-[#0f2419] text-[#ecfdf5] px-2 py-1 rounded-sm flex items-center justify-between shadow-xs">
        <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
          CANOPY · DAWN
        </span>
        <svg viewBox="0 0 60 16" className="w-14 h-4 overflow-visible" fill="none" aria-hidden="true">
          <path d="M2 14 Q 30 0, 58 14" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="30" cy="7" r="2.5" fill="#fbbf24" />
        </svg>
      </div>

      {/* Mini Terrarium Card with Growing Botanical SVG Sprout */}
      <div className="border border-[#10b981]/30 bg-[#064e3b]/10 dark:bg-[#064e3b]/25 rounded p-1.5 flex items-center gap-2 shadow-xs">
        <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-[#10b981]" fill="currentColor" aria-hidden="true">
          <path
            d="M8 15V7 M8 7C6 4 3 5 3 7C3 9 6 9 8 7ZM8 7C10 4 13 5 13 7C13 9 10 9 8 7Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-orbit-text truncate">
            Perennial Terrarium
          </div>
          <div className="text-[8px] text-[#059669] dark:text-[#34d399] font-mono">
            ACTIVE SPROUT · 03d
          </div>
        </div>
      </div>

      {/* Multi-Material Terracotta Clay & Moss Cards */}
      <div className="grid grid-cols-2 gap-1 text-[8px] font-mono">
        <div className="border-l-2 border-l-[#c2410c] bg-[#fed7aa]/20 dark:bg-[#7c2d12]/20 p-1 rounded-r text-[#c2410c] dark:text-[#fdba74] truncate">
          RED CLAY BED
        </div>
        <div className="border-l-2 border-l-[#047857] bg-[#a7f3d0]/20 dark:bg-[#064e3b]/20 p-1 rounded-r text-[#047857] dark:text-[#6ee7b7] truncate">
          KYOTO MOSS
        </div>
      </div>
    </div>
  );
}

function MidnightVignette() {
  return (
    <div className="flex flex-col h-full justify-between space-y-1.5 p-2 bg-[#070714] text-[#e0e7ff] rounded-sm relative overflow-hidden border border-[#1e1b4b] text-[10px]">
      {/* Zenith Dome with Concentric Gold/Indigo Astrolabe Rings and Crescent Moon */}
      <div className="flex items-center justify-between pb-1 border-b border-[#312e81]/60">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#a5b4fc]">
          ZENITH 42° · NODAL
        </span>
        <svg viewBox="0 0 28 16" className="w-7 h-4 overflow-visible" fill="none" aria-hidden="true">
          <circle cx="14" cy="8" r="6" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <circle cx="14" cy="8" r="3" stroke="#818cf8" strokeWidth="0.8" />
          <path d="M22 4 A 4 4 0 0 0 22 12 A 3 3 0 0 1 22 4 Z" fill="#fbbf24" />
        </svg>
      </div>

      {/* 5-Node Glowing Supernova Star (✦) Constellation Vector */}
      <div className="relative py-0.5 flex items-center justify-between">
        <svg viewBox="0 0 140 22" className="w-full h-5" fill="none" aria-hidden="true">
          <line x1="10" y1="16" x2="35" y2="7" stroke="#6366f1" strokeWidth="0.8" />
          <line x1="35" y1="7" x2="70" y2="13" stroke="#6366f1" strokeWidth="0.8" />
          <line x1="70" y1="13" x2="105" y2="5" stroke="#6366f1" strokeWidth="0.8" />
          <line x1="105" y1="5" x2="130" y2="15" stroke="#6366f1" strokeWidth="0.8" />
          <circle cx="10" cy="16" r="1.5" fill="#a5b4fc" />
          <circle cx="35" cy="7" r="1.5" fill="#a5b4fc" />
          <circle cx="70" cy="13" r="2" fill="#c084fc" />
          {/* Supernova Zenith Star */}
          <circle cx="105" cy="5" r="3" fill="#fbbf24" />
          <circle cx="105" cy="5" r="6" fill="#fbbf24" opacity="0.3" />
          <circle cx="130" cy="15" r="1.5" fill="#a5b4fc" />
        </svg>
      </div>

      {/* Transit Rail Footer */}
      <div className="flex items-center justify-between text-[8px] font-mono text-[#818cf8] pt-0.5 border-t border-[#312e81]/60">
        <span>CONSTELLATION ✦ APOGEE</span>
        <span className="text-[#fbbf24] font-bold">LOCKED</span>
      </div>
    </div>
  );
}

export function PersonalityVignette({ theme }: { theme: ThemePersonality }) {
  switch (theme) {
    case "archivist":
      return <ArchivistVignette />;
    case "futuristic":
      return <FuturisticVignette />;
    case "aesthetic":
      return <AestheticVignette />;
    case "artistic":
      return <ArtisticVignette />;
    case "minimalist":
      return <MinimalistVignette />;
    case "naturalist":
      return <NaturalistVignette />;
    case "midnight":
      return <MidnightVignette />;
  }
}

// ---------------------------------------------------------------------------
// Unified Theme Personality Card Component
// ---------------------------------------------------------------------------

export interface ThemePersonalityCardProps {
  meta: ThemePersonalityMeta;
  isSelected: boolean;
  onSelect: (id: ThemePersonality) => void;
  compact?: boolean;
}

export function ThemePersonalityCard({
  meta,
  isSelected,
  onSelect,
  compact = false,
}: ThemePersonalityCardProps) {
  return (
    <div
      role="radio"
      tabIndex={0}
      aria-checked={isSelected}
      data-theme-option={meta.id}
      onClick={() => onSelect(meta.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(meta.id);
        }
      }}
      className={`relative flex flex-col justify-between text-left p-3.5 rounded-xl border transition-all cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg select-none ${
        isSelected
          ? "border-orbit-accent bg-orbit-accent-soft/30 shadow-orbit-card ring-2 ring-orbit-accent/40"
          : "border-orbit-border bg-orbit-surface-secondary/30 hover:bg-orbit-surface-secondary/60 hover:border-orbit-border-strong"
      }`}
    >
      <div>
        {/* Card Header: Name, Active Badge & Tagline */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-semibold text-orbit-text">
            {meta.name}
          </span>
          {isSelected ? (
            <Badge variant="accent" className="gap-1 px-1.5 py-0.5 text-[10px]">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full border border-orbit-border-strong bg-orbit-surface" />
          )}
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-orbit-accent">
          {meta.tagline}
        </p>

        {/* Scoped Live Personality Preview Window with Bespoke Mini-Vignette */}
        <div
          data-orbit-theme-preview={meta.id}
          className="my-3 rounded-lg border border-orbit-border overflow-hidden transition-all bg-orbit-bg text-orbit-text shadow-orbit-xs min-h-[148px] flex flex-col justify-between"
          style={{
            backgroundImage: "var(--orbit-bg-pattern, none)",
            backgroundSize: "var(--orbit-bg-size, auto)",
          }}
          aria-hidden="true"
        >
          <PersonalityVignette theme={meta.id} />
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-[11px] text-orbit-text-muted line-clamp-2 leading-relaxed">
            {meta.description}
          </p>
        )}
      </div>

      {/* 4-Swatch Palette Preview */}
      <div className="mt-3 pt-2 border-t border-orbit-border/60 flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
          Palette
        </span>
        <div className="flex items-center -space-x-1" aria-hidden="true">
          <span
            title="Canvas Background"
            className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
            style={{ backgroundColor: meta.swatches.bg }}
          />
          <span
            title="Card Surface"
            className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
            style={{ backgroundColor: meta.swatches.surface }}
          />
          <span
            title="Primary Accent"
            className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
            style={{ backgroundColor: meta.swatches.accent }}
          />
          <span
            title="Secondary Tint"
            className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
            style={{ backgroundColor: meta.swatches.secondary }}
          />
        </div>
      </div>
    </div>
  );
}
