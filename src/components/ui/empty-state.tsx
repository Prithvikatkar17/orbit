import React from "react";

export interface EmptyStateProps {
  /** Icon element (e.g. a Lucide icon) */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Use dashed border style (default: true) */
  dashed?: boolean;
  className?: string;
}

/**
 * Standardized empty state display for lists, filtered views, and tabs.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  dashed = true,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-orbit-card px-6 py-12 text-center",
        dashed
          ? "border border-dashed border-orbit-border-strong/80 bg-orbit-surface-secondary/65"
          : "bg-transparent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-orbit-card bg-orbit-accent-soft text-orbit-accent">
          {icon}
        </div>
      )}
      <h3
        className={[
          "font-display text-base font-semibold text-orbit-text",
          icon ? "mt-4" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-orbit-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
