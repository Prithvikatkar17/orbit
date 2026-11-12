import React from "react";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-orbit-subtle text-orbit-text-secondary",
  success: "bg-orbit-success-soft text-orbit-success",
  warning: "bg-orbit-warning-soft text-orbit-warning",
  danger: "bg-orbit-danger-soft text-orbit-danger",
  info: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary",
  accent: "bg-orbit-accent-soft text-orbit-accent",
};

/**
 * Compact semantic status/category pill using ORBIT design tokens.
 */
export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-orbit-pill border border-current/15 px-2.5 py-0.5 text-[11px] font-medium tracking-[0.01em]",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
