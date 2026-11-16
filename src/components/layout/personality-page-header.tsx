"use client";

import React, { useMemo } from "react";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { useMounted } from "@/lib/utils/dates";

export interface MetricItem {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "urgent";
}

export interface PersonalityPageHeaderProps {
  title: string;
  subtitle: string;
  moduleIndex: string; // e.g. "01", "02", "03", "04", "05", "06"
  eyebrow?: string; // Optional custom eyebrow override
  metrics?: MetricItem[];
  actions?: React.ReactNode;
  className?: string;
}

const ROMAN_NUMERALS: Record<string, string> = {
  "01": "I",
  "02": "II",
  "03": "III",
  "04": "IV",
  "05": "V",
  "06": "VI",
  "07": "VII",
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
  "5": "V",
  "6": "VI",
  "7": "VII",
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function PersonalityPageHeader({
  title,
  subtitle,
  moduleIndex,
  eyebrow,
  metrics = [],
  actions,
  className = "",
}: PersonalityPageHeaderProps) {
  const { themePersonality } = useThemePersonality();
  const mounted = useMounted();
  const roman = ROMAN_NUMERALS[moduleIndex] || moduleIndex;
  const dayOfYear = useMemo(() => getDayOfYear(), []);

  // ---------------------------------------------------------------------------
  // 1. ARCHIVIST: Bound Collector's Folio Header with Filigrees & Brass Plates
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "archivist") {
    return (
      <header
        data-personality-header="archivist"
        className={`archivist-folio-hero relative overflow-hidden rounded-[14px] p-5 sm:p-6 text-[#f4efe4] border border-[#b89758]/50 shadow-xs bg-[#1c2e24] dark:bg-[#15231c] ${className}`}
      >
        {/* 4 Corner Copperplate Filigrees */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute top-2 left-2 text-[#b89758]/40 pointer-events-none select-none"
          aria-hidden="true"
        >
          <path d="M0 0 L14 0 C7 0 0 7 0 14 Z M2 2 L8 2 C4 2 2 4 2 8 Z" fill="currentColor" />
        </svg>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute top-2 right-2 text-[#b89758]/40 pointer-events-none select-none rotate-90"
          aria-hidden="true"
        >
          <path d="M0 0 L14 0 C7 0 0 7 0 14 Z M2 2 L8 2 C4 2 2 4 2 8 Z" fill="currentColor" />
        </svg>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute bottom-2 left-2 text-[#b89758]/40 pointer-events-none select-none -rotate-90"
          aria-hidden="true"
        >
          <path d="M0 0 L14 0 C7 0 0 7 0 14 Z M2 2 L8 2 C4 2 2 4 2 8 Z" fill="currentColor" />
        </svg>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute bottom-2 right-2 text-[#b89758]/40 pointer-events-none select-none rotate-180"
          aria-hidden="true"
        >
          <path d="M0 0 L14 0 C7 0 0 7 0 14 Z M2 2 L8 2 C4 2 2 4 2 8 Z" fill="currentColor" />
        </svg>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            {/* Gold-Leaf Eyebrow with Stamp Dot */}
            <div className="flex items-center gap-2 border-b border-[#b89758]/30 pb-1.5 max-w-fit">
              <span className="w-1.5 h-1.5 rounded-full border border-[#d4af37] bg-[#b89758]/70 inline-block shadow-xs" />
              <span className="font-mono text-[10px] tracking-widest text-[#d4af37] uppercase font-semibold">
                {eyebrow || `EX LIBRIS ORBIT · MODULE ${roman}`}
              </span>
            </div>

            {/* Title with Fleuron Mark */}
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#fef9ee] flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[#b89758] font-normal text-xl select-none" aria-hidden="true">
                ❦
              </span>
            </h1>

            {/* Curatorial Narrative Subtitle */}
            <p className="font-serif italic text-xs text-[#e8decb]/90 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Right Area: Brass Plates & Module Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative bg-[#15231c] dark:bg-[#0f1a14] border border-[#b89758]/40 text-[#f4efe4] rounded-md px-3 py-1.5 shadow-xs flex items-center gap-2"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#b89758] border border-[#d4af37] shadow-inner shrink-0 inline-block"
                      title="Brass Screw"
                    />
                    <div>
                      <span className="block font-mono text-[8px] uppercase tracking-wider text-[#b89758]">
                        {m.label}
                      </span>
                      <span className="block font-serif font-bold text-sm text-[#fef9ee] tabular-nums leading-tight">
                        {m.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. FUTURISTIC: Sleek Command Deck with Hex Screws & Recessed OLED Panels
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "futuristic") {
    return (
      <header
        data-personality-header="futuristic"
        className={`futuristic-command-deck rounded-[14px] px-6 sm:px-7 py-4 sm:py-5 relative overflow-hidden text-[#94a3b8] ${className}`}
      >
        {/* Corner Hex Screws */}
        <span className="absolute top-2 left-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute top-2 right-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute bottom-2 left-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>
        <span className="absolute bottom-2 right-2.5 font-mono text-[9px] text-[#475569] select-none pointer-events-none" aria-hidden>
          ⊕
        </span>

        {/* Subtle Background Watermark */}
        <div className="absolute inset-0 pointer-events-none opacity-10 select-none overflow-hidden" aria-hidden>
          <svg viewBox="0 0 1000 110" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="80" x2="1000" y2="80" stroke="#00f0ff" strokeWidth="1" />
            <line x1="0" y1="95" x2="1000" y2="95" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4 6" />
            <path d="M 680 110 A 240 90 0 0 0 940 25" fill="none" stroke="#00f0ff" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            {/* Cyan LED Eyebrow */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] inline-block shrink-0" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#00f0ff]">
                {eyebrow || `SYS.MODULE // ${moduleIndex} · PRECISION 60Hz`}
              </span>
            </div>

            {/* Crisp Monospace Title */}
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#f8fafc] uppercase">
              {title}
            </h1>

            {/* Telemetry Status Sentence */}
            <p className="text-[11px] font-mono text-[#94a3b8] max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Right Area: Recessed OLED Metric Capsules & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {metrics.length > 0 && (
              <div className="flex items-center gap-2">
                {metrics.map((m, idx) => {
                  const toneColor =
                    m.tone === "urgent"
                      ? "text-[#ef4444]"
                      : m.tone === "accent"
                      ? "text-[#00f0ff]"
                      : "text-[#00e5a3]";

                  return (
                    <div
                      key={idx}
                      className="futuristic-oled-panel px-3.5 py-1.5 text-center min-w-[72px]"
                    >
                      <div className={`text-base font-bold font-mono tabular-nums leading-none ${toneColor}`}>
                        {typeof m.value === "number" ? String(m.value).padStart(2, "0") : m.value}
                      </div>
                      <div className="text-[8px] font-mono text-[#64748b] tracking-wider mt-1 uppercase">
                        {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. AESTHETIC: Kinfolk Museum Editorial Spread with Double Hairline Rule
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "aesthetic") {
    return (
      <header
        data-personality-header="aesthetic"
        className={`bg-[#fdfbf7] dark:bg-[#181614] border border-[#2c2621]/15 dark:border-[#f0eae1]/15 rounded-xl p-6 sm:p-7 text-[#2c2621] dark:text-[#f0eae1] shadow-xs ${className}`}
      >
        {/* Kinfolk Masthead Eyebrow */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <span className="font-serif uppercase text-[10px] tracking-[0.2em] text-[#786c5e] dark:text-[#a89c8e]">
            {eyebrow || `EDITION NO. ${dayOfYear} · SECTION ${roman}`}
          </span>
          <span className="font-serif italic text-xs text-[#c06c52]">Kinfolk Archive</span>
        </div>

        {/* Title */}
        <h1 className="font-serif italic text-2xl sm:text-3xl font-semibold tracking-wide text-[#2c2621] dark:text-[#f0eae1] mt-1.5">
          {title}
        </h1>

        {/* Signature Double Hairline Rule */}
        <div className="border-t border-b border-[#2c2621]/20 dark:border-[#f0eae1]/20 py-1 my-3 flex flex-wrap items-center justify-between text-[9px] font-serif uppercase tracking-wider text-[#786c5e] dark:text-[#a89c8e] gap-2">
          <span>AUTUMN / WINTER</span>
          <span className="font-serif tracking-normal [word-spacing:0.25em]">A QUIET RHYTHM OF THE HOURS</span>
          <span>FOLIO {moduleIndex}</span>
        </div>

        {/* Subtitle & Bottom Bar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pt-1">
          <p className="font-serif italic text-xs text-[#786c5e] dark:text-[#a89c8e] max-w-2xl leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {metrics.map((m, idx) => (
                  <div key={idx} className="flex items-baseline gap-1.5 font-serif text-xs">
                    <span className="text-[#786c5e] dark:text-[#a89c8e] uppercase text-[9px] tracking-wider">
                      {m.label}
                    </span>
                    <span className="font-semibold text-[#c06c52] tabular-nums">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. ARTISTIC: Chromatic Studio Banner with Matisse Silhouettes & Brushstroke
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "artistic") {
    return (
      <header
        data-personality-header="artistic"
        className={`rounded-[26px] p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-[#faf6ed] via-[#fff5eb] to-[#f0f4ff] dark:from-[#181615] dark:via-[#1e1b18] dark:to-[#151824] border border-[#d97706]/30 dark:border-[#d97706]/20 shadow-xs text-[#2c2621] dark:text-[#f3eee8] ${className}`}
      >
        {/* Floating Matisse Cutout Silhouette Watermark */}
        <svg
          className="absolute -right-4 -bottom-6 w-36 h-36 text-[#d97706]/15 dark:text-[#d97706]/10 pointer-events-none select-none"
          viewBox="0 0 100 100"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M50 10 C65 20 80 15 85 30 C90 45 75 55 80 70 C70 75 65 90 50 85 C35 90 30 75 20 70 C25 55 10 45 15 30 C20 15 35 20 50 10 Z" />
        </svg>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            {/* Atelier Eyebrow */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d97706]">
              <span className="w-2 h-2 rounded-full bg-[#d97706] inline-block shadow-xs" />
              <span>{eyebrow || `ATELIER ORBIT · COMPOSITION NO. ${moduleIndex}`}</span>
            </div>

            {/* Serif Title with Hand-Drawn Gradient Brushstroke Underline */}
            <div className="inline-block">
              <h1 className="font-serif italic text-2xl sm:text-3xl font-bold tracking-tight text-[#2c2621] dark:text-[#f3eee8]">
                {title}
              </h1>
              <svg className="w-full h-2 mt-0.5" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 5 Q 50 1, 100 5 T 198 4" stroke="url(#brush-gradient-header)" strokeWidth="3" fill="none" strokeLinecap="round" />
                <defs>
                  <linearGradient id="brush-gradient-header" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Studio Narrative Description */}
            <p className="text-xs text-[#786c5e] dark:text-[#a89c8e] max-w-2xl leading-relaxed mt-1 font-sans">
              {subtitle}
            </p>
          </div>

          {/* Right Area: Pigment Pill Counters & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#201d1a]/80 border border-black/10 dark:border-white/10 shadow-xs flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: ["#d97706", "#4f46e5", "#ef4444", "#10b981"][idx % 4],
                      }}
                    />
                    <span className="font-medium text-[#786c5e] dark:text-[#a89c8e] text-[11px]">
                      {m.label}:
                    </span>
                    <span className="font-bold font-mono tabular-nums text-orbit-text">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. MINIMALIST: Dieter Rams & Vignelli Architectural Ledger Lockup
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "minimalist") {
    return (
      <header
        data-personality-header="minimalist"
        className={`space-y-4 bg-transparent border-x-0 border-t-0 rounded-none px-0 py-1 sm:py-2 text-black dark:text-white shadow-none ${className}`}
      >
        {/* Top 2px International Signal Orange Filament */}
        <div className="w-full h-[2px] bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="w-full h-full bg-[#ff3b00]" />
        </div>

        {/* The Swiss Open-Ledger Masthead */}
        <div className="border-b border-black/15 dark:border-white/15 pb-6 pt-1">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* Left Column: Oversized Vignelli-style numeral lockup */}
            <div className="flex items-baseline gap-4 sm:gap-6">
              <span className="font-mono text-5xl sm:text-6xl font-light text-[#ff3b00] tabular-nums tracking-tighter leading-none shrink-0 select-none">
                {moduleIndex}
              </span>

              <div className="space-y-1 min-w-0">
                <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-[#737373] leading-tight truncate">
                  {eyebrow || `SYSTEM MODULE // 0${Number(moduleIndex) || moduleIndex}`}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight uppercase text-black dark:text-white truncate">
                  {title}
                </h1>
                <p className="text-xs font-mono text-[#737373] max-w-2xl leading-relaxed mt-1">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Right Column: Tabular Divided Metric Readout + Actions */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start lg:self-end">
              {metrics.length > 0 && (
                <div className="flex flex-wrap items-center divide-x divide-black/15 dark:divide-white/15">
                  {metrics.map((m, idx) => (
                    <div key={idx} className={`${idx === 0 ? "pr-3 sm:pr-4" : "px-3 sm:px-4"} text-left`}>
                      <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.18em] text-[#737373] block">
                        {m.label}
                      </span>
                      <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-black dark:text-white">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 6. NATURALIST: Lush Biophilic Canopy Pavilion with River Pebble Pills
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "naturalist") {
    return (
      <header
        data-personality-header="naturalist"
        className={`naturalist-canopy-hero rounded-[26px] p-6 sm:p-7 relative overflow-hidden bg-[#0a1811] text-[#f4efe4] border border-[#235c3b]/40 shadow-xs ${className}`}
      >
        {/* Botanical Fern & Golden Solar Arc Watermark */}
        <svg
          className="absolute -right-6 -bottom-6 w-48 h-32 opacity-20 pointer-events-none select-none"
          viewBox="0 0 200 120"
          fill="none"
          aria-hidden="true"
        >
          <path d="M10 110 Q 100 20, 190 110" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 6" />
          <circle cx="100" cy="65" r="5" fill="#f59e0b" />
          <path d="M60 110 Q 80 60, 140 110" stroke="#235c3b" strokeWidth="2" />
        </svg>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            {/* Amber Phenology Eyebrow */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b] inline-block shrink-0" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#f59e0b]">
                {eyebrow || `34°N CONSERVATORY · SECTION ${roman}`}
              </span>
            </div>

            {/* Serif Title */}
            <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-[#f8fafc]">
              {title}
            </h1>

            {/* Canopy Subtitle */}
            <p className="text-[#a7f3d0]/80 text-xs leading-relaxed max-w-2xl font-sans">
              {subtitle}
            </p>
          </div>

          {/* Right Area: Tactile River-Pebble Metric Pills & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-[#12281c] border border-[#235c3b]/60 rounded-full px-3.5 py-1 text-xs text-[#d1fae5] flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shrink-0" />
                    <span className="text-[9px] text-[#a7f3d0]/80 uppercase">{m.label}</span>
                    <span className="font-semibold font-mono tabular-nums text-white">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 7. MIDNIGHT: Celestial Zenith Observatory with Astrolabe Rings & Supernova
  // ---------------------------------------------------------------------------
  if (mounted && themePersonality === "midnight") {
    return (
      <header
        data-personality-header="midnight"
        className={`midnight-zenith-hero rounded-[24px] p-6 sm:p-7 relative overflow-hidden bg-[#03050c] text-[#f8fafc] border border-[#1e1b4b] shadow-xs ${className}`}
      >
        {/* Brass Astrolabe Declination Rings Watermark */}
        <svg
          className="absolute -right-6 -bottom-6 w-44 h-44 opacity-20 pointer-events-none select-none"
          viewBox="0 0 160 160"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="80" cy="80" r="70" stroke="#d4af37" strokeWidth="1" />
          <circle cx="80" cy="80" r="50" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="3 4" />
          <circle cx="80" cy="80" r="30" stroke="#d4af37" strokeWidth="1" />
          <line x1="10" y1="80" x2="150" y2="80" stroke="#818cf8" strokeWidth="0.6" />
          <line x1="80" y1="10" x2="80" y2="150" stroke="#818cf8" strokeWidth="0.6" />
          <circle cx="80" cy="80" r="3" fill="#d4af37" />
        </svg>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            {/* Horological Gold Eyebrow */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#fbbf24] uppercase">
              <span className="text-[#fbbf24] select-none" aria-hidden="true">✦</span>
              <span>{eyebrow || `OBSERVATORY SECTOR ${roman} · NODAL APOGEE`}</span>
            </div>

            {/* Serif Title */}
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-[#f8fafc]">
              {title}
            </h1>

            {/* Ephemeris Subtitle */}
            <p className="text-[#94a3b8] text-xs leading-relaxed max-w-2xl font-sans">
              {subtitle}
            </p>
          </div>

          {/* Right Area: Brass & Indigo Capsule Counters & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0c1024] border border-[#d4af37]/40 rounded-lg px-3 py-1.5 text-xs text-[#fbbf24] font-mono shadow-xs flex items-center gap-2"
                  >
                    <span className="text-[9px] text-[#94a3b8] uppercase tracking-wider">
                      {m.label}
                    </span>
                    <span className="font-bold text-white tabular-nums">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // Fallback (Pre-Hydration or Default Theme)
  // ---------------------------------------------------------------------------
  return (
    <header
      data-personality-header="default"
      className={`rounded-xl border border-orbit-border bg-orbit-surface p-5 sm:p-6 text-orbit-text shadow-orbit-xs ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase font-bold tracking-wider text-orbit-accent">
            {eyebrow || `MODULE // ${moduleIndex}`}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text">
            {title}
          </h1>
          <p className="text-xs text-orbit-text-secondary max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {metrics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary px-3 py-1.5"
                >
                  <span className="text-orbit-text-muted text-[10px] uppercase mr-1.5">
                    {m.label}:
                  </span>
                  <span className="font-bold text-orbit-text tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
