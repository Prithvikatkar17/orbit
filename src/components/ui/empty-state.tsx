import React from "react";

export interface EmptyStateProps {
  /** Icon element (e.g. a Lucide icon) */
  icon?: React.ReactNode;
  /** Primary heading */
  title: string;
  /** Descriptive guidance */
  description?: string;
  /** Optional theme-aware eyebrow tag (e.g. "INBOX ZERO", "CADENCE", "CATALOGUE") */
  eyebrow?: string;
  /** Primary action element (e.g. <Button>) */
  action?: React.ReactNode;
  /** Optional secondary action element (e.g. secondary button or link) */
  secondaryAction?: React.ReactNode;
  /** Use dashed border style (default: true) */
  dashed?: boolean;
  /** Compact sizing for smaller containers or widgets (default: false) */
  compact?: boolean;
  /** Additional custom classes */
  className?: string;
}

/**
 * EmptyStateIllustration
 * Renders a theme-aware decorative illustration frame surrounding the central icon.
 * Pure CSS display rules in globals.css show only the active personality's geometry:
 * - Archivist: Archival registration seal & double concentric rings
 * - Futuristic: Precision HUD reticle & corner coordinate brackets
 * - Aesthetic: Soft harmonic concentric rings with orbital pastel points
 * - Artistic: Studio easel crop brackets & pigment dots
 * - Minimalist: Bauhaus precision hairline frame with crosshairs
 * - Naturalist: Organic pebble contour with botanical sprout
 * - Midnight: Celestial orbital ellipse with 4-point starlight glints
 */
function EmptyStateIllustration({
  icon,
  compact = false,
}: {
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? "w-16 h-16" : "w-20 h-20";
  const iconBoxSize = compact ? "h-9 w-9" : "h-11 w-11";
  const iconInnerSize = compact ? "scale-90" : "";

  return (
    <div
      className={`orbit-empty-illustration-frame relative mx-auto flex items-center justify-center ${size}`}
      aria-hidden="true"
    >
      {/* Ambient Backdrop Halo */}
      <div className="orbit-empty-aura absolute inset-0 rounded-full" />

      {/* 1. ARCHIVIST: Archival registration seal & double rings */}
      <svg
        viewBox="0 0 88 88"
        className={`orbit-empty-motif-archivist absolute inset-0 h-full w-full select-none text-orbit-accent pointer-events-none`}
      >
        <circle
          cx="44"
          cy="44"
          r="41"
          stroke="var(--orbit-border-strong)"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
          opacity="0.75"
        />
        <circle
          cx="44"
          cy="44"
          r="37"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
        <line x1="44" y1="0" x2="44" y2="6" stroke="currentColor" strokeWidth="1.5" />
        <line x1="44" y1="82" x2="44" y2="88" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="44" x2="6" y2="44" stroke="currentColor" strokeWidth="1.5" />
        <line x1="82" y1="44" x2="88" y2="44" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 12 18 L 12 12 L 18 12" stroke="var(--orbit-border-strong)" strokeWidth="1" fill="none" />
        <path d="M 76 18 L 76 12 L 70 12" stroke="var(--orbit-border-strong)" strokeWidth="1" fill="none" />
        <path d="M 12 70 L 12 76 L 18 76" stroke="var(--orbit-border-strong)" strokeWidth="1" fill="none" />
        <path d="M 76 70 L 76 76 L 70 76" stroke="var(--orbit-border-strong)" strokeWidth="1" fill="none" />
      </svg>

      {/* 2. FUTURISTIC: Precision HUD reticle & corner brackets */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-futuristic absolute inset-0 h-full w-full select-none text-orbit-chart-1 pointer-events-none"
      >
        <path d="M 6 20 L 6 6 L 20 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 68 6 L 82 6 L 82 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 6 68 L 6 82 L 20 82" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 68 82 L 82 82 L 82 68" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="38" y1="6" x2="50" y2="6" stroke="var(--orbit-chart-3)" strokeWidth="1.5" />
        <line x1="38" y1="82" x2="50" y2="82" stroke="var(--orbit-chart-3)" strokeWidth="1.5" />
        <line x1="6" y1="38" x2="6" y2="50" stroke="var(--orbit-chart-3)" strokeWidth="1.5" />
        <line x1="82" y1="38" x2="82" y2="50" stroke="var(--orbit-chart-3)" strokeWidth="1.5" />
        <circle cx="44" cy="44" r="33" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" fill="none" opacity="0.45" />
      </svg>

      {/* 3. AESTHETIC: Concentric harmonic rings with soft orbital dots */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-aesthetic absolute inset-0 h-full w-full select-none text-orbit-chart-1 pointer-events-none"
      >
        <circle cx="44" cy="44" r="41" stroke="var(--orbit-accent-soft)" strokeWidth="2.5" fill="none" />
        <circle cx="44" cy="44" r="35" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 6" fill="none" opacity="0.75" />
        <circle cx="44" cy="44" r="29" stroke="var(--orbit-accent-secondary)" strokeWidth="1" strokeDasharray="2 4" fill="none" opacity="0.4" />
        <circle cx="68" cy="20" r="2.5" fill="var(--orbit-chart-1)" opacity="0.8" />
        <circle cx="20" cy="68" r="2" fill="var(--orbit-chart-2)" opacity="0.7" />
        <circle cx="70" cy="58" r="1.5" fill="var(--orbit-chart-3)" opacity="0.5" />
      </svg>

      {/* 4. ARTISTIC: Studio gallery crop brackets & pigment dots */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-artistic absolute inset-0 h-full w-full select-none text-orbit-chart-1 pointer-events-none"
      >
        <g transform="rotate(-2 44 44)">
          <rect x="8" y="8" width="72" height="72" rx="6" stroke="var(--orbit-border-strong)" strokeWidth="1.5" fill="none" strokeDasharray="8 6" />
          <path d="M 4 16 L 4 4 L 16 4" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M 72 4 L 84 4 L 84 16" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M 4 72 L 4 84 L 16 84" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M 72 84 L 84 84 L 84 72" stroke="currentColor" strokeWidth="2" fill="none" />
        </g>
        <circle cx="24" cy="78" r="3" fill="var(--orbit-chart-1)" />
        <circle cx="34" cy="80" r="2.5" fill="var(--orbit-chart-2)" />
        <circle cx="44" cy="78" r="2.5" fill="var(--orbit-chart-3)" />
      </svg>

      {/* 5. MINIMALIST: Bauhaus hairline precision frame with crosshairs */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-minimalist absolute inset-0 h-full w-full select-none text-orbit-border-strong pointer-events-none"
      >
        <rect x="12" y="12" width="64" height="64" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
        <line x1="44" y1="6" x2="44" y2="12" stroke="var(--orbit-text-muted)" strokeWidth="1" />
        <line x1="44" y1="76" x2="44" y2="82" stroke="var(--orbit-text-muted)" strokeWidth="1" />
        <line x1="6" y1="44" x2="12" y2="44" stroke="var(--orbit-text-muted)" strokeWidth="1" />
        <line x1="76" y1="44" x2="82" y2="44" stroke="var(--orbit-text-muted)" strokeWidth="1" />
      </svg>

      {/* 6. NATURALIST: Organic pebble contour with botanical sprout */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-naturalist absolute inset-0 h-full w-full select-none text-orbit-accent pointer-events-none"
      >
        <path
          d="M 44 6 C 66 7 81 22 80 44 C 79 66 64 80 42 79 C 20 78 7 64 8 42 C 9 20 22 5 44 6 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />
        <path d="M 73 25 C 77 19 82 18 84 18 C 84 21 82 25 78 28 Z" fill="var(--orbit-chart-1)" opacity="0.85" />
        <path d="M 69 29 C 74 27 77 24 77 24" stroke="var(--orbit-chart-1)" strokeWidth="1.2" fill="none" />
        <path d="M 15 62 C 11 67 7 68 5 68 C 5 65 8 61 12 59 Z" fill="var(--orbit-chart-2)" opacity="0.75" />
      </svg>

      {/* 7. MIDNIGHT: Celestial orbital ellipse with 4-point starlight glints */}
      <svg
        viewBox="0 0 88 88"
        className="orbit-empty-motif-midnight absolute inset-0 h-full w-full select-none text-orbit-accent pointer-events-none"
      >
        <ellipse
          cx="44"
          cy="44"
          rx="40"
          ry="24"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          fill="none"
          transform="rotate(-18 44 44)"
          opacity="0.8"
        />
        <ellipse
          cx="44"
          cy="44"
          rx="34"
          ry="18"
          stroke="var(--orbit-chart-2)"
          strokeWidth="0.8"
          fill="none"
          transform="rotate(-18 44 44)"
          opacity="0.4"
        />
        <path d="M 72 16 Q 72 20 76 20 Q 72 20 72 24 Q 72 20 68 20 Q 72 20 72 16 Z" fill="var(--orbit-chart-1)" />
        <path d="M 16 68 Q 16 71 19 71 Q 16 71 16 74 Q 16 71 13 71 Q 16 71 16 68 Z" fill="var(--orbit-chart-2)" />
        <circle cx="76" cy="46" r="2" fill="var(--orbit-chart-3)" opacity="0.8" />
        <circle cx="12" cy="38" r="1.5" fill="var(--orbit-chart-1)" opacity="0.7" />
      </svg>

      {/* Central Icon Surface */}
      <div
        className={`relative z-10 flex ${iconBoxSize} items-center justify-center rounded-orbit-control bg-orbit-surface border border-orbit-border text-orbit-accent shadow-orbit-xs transition-transform duration-200 group-hover:scale-105 ${iconInnerSize}`}
      >
        {icon}
      </div>
    </div>
  );
}

/**
 * Standardized empty state display for lists, filtered views, and modules.
 * Adapts its visual ornamentations and atmospheric geometry across all seven theme personalities.
 */
export function EmptyState({
  icon,
  title,
  description,
  eyebrow,
  action,
  secondaryAction,
  dashed = true,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "group flex flex-col items-center justify-center text-center transition-all",
        compact ? "px-4 py-8" : "px-6 py-12",
        dashed
          ? "rounded-orbit-card border border-dashed border-orbit-border-strong/80 bg-orbit-surface-secondary/65"
          : "rounded-orbit-card bg-transparent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Visual Illustration Badge & Halo */}
      {icon && <EmptyStateIllustration icon={icon} compact={compact} />}

      {/* Optional Theme-Aware Eyebrow Tag */}
      {eyebrow && (
        <span className="orbit-empty-badge mb-1 font-mono text-[10px] font-semibold tracking-widest text-orbit-accent uppercase select-none">
          {eyebrow}
        </span>
      )}

      {/* Title */}
      <h3 className="font-display text-base font-semibold text-orbit-text tracking-tight">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-orbit-text-secondary">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
