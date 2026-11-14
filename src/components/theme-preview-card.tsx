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

interface ThemePersonalityCardProps {
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
      className={`relative flex flex-col justify-between text-left p-3.5 rounded-xl border transition-all cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg ${
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

        {/* Scoped Live Personality Preview Window */}
        <div
          data-orbit-theme-preview={meta.id}
          className="my-3 rounded-lg border border-orbit-border p-2.5 space-y-2 overflow-hidden transition-all bg-orbit-bg text-orbit-text shadow-orbit-xs"
          style={{
            backgroundImage: "var(--orbit-bg-pattern, none)",
            backgroundSize: "var(--orbit-bg-size, auto)",
          }}
          aria-hidden="true"
        >
          {/* Specimen Header & Motif */}
          <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-orbit-border/50">
            <span
              className="text-[11px] font-semibold truncate tracking-tight text-orbit-text"
              style={{ fontFamily: "var(--orbit-font-display)" }}
            >
              {THEME_SAMPLE_HEADINGS[meta.id]}
            </span>
            <ThemeMiniMotif theme={meta.id} />
          </div>

          {/* Active Navigation & Action Button Preview */}
          <div className="flex items-center justify-between gap-2">
            <div
              data-orbit-nav-item
              data-active="true"
              className="px-2 py-0.5 text-[10px] font-medium rounded border border-orbit-border bg-orbit-surface text-orbit-accent"
            >
              Focus
            </div>

            <div className="orbit-button px-2 py-0.5 text-[10px] font-semibold rounded-orbit-control bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs">
              + Action
            </div>
          </div>

          {/* Mini Heatmap Strip & Mini Chart Bars */}
          <div className="flex items-center justify-between pt-1 border-t border-orbit-border/40 gap-2">
            {/* 5-Level Heatmap Cadence */}
            <div className="flex items-center gap-1" title="Cadence Heatmap">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-heatmap-0)" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-heatmap-1)" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-heatmap-2)" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-heatmap-3)" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-heatmap-4)" }}
              />
            </div>

            {/* 3-Bar Activity Sparkline */}
            <div className="flex items-end gap-1 h-3" title="Activity Metrics">
              <span
                className="w-1.5 h-2 rounded-xs"
                style={{ backgroundColor: "var(--orbit-chart-1)" }}
              />
              <span
                className="w-1.5 h-3 rounded-xs"
                style={{ backgroundColor: "var(--orbit-chart-2)" }}
              />
              <span
                className="w-1.5 h-2.5 rounded-xs"
                style={{ backgroundColor: "var(--orbit-chart-3)" }}
              />
            </div>
          </div>
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
