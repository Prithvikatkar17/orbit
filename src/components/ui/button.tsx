"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon rendered before the children */
  icon?: React.ReactNode;
  /** Icon rendered after the children */
  trailingIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs hover:bg-orbit-accent-hover focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg",
  secondary:
    "border border-orbit-border bg-orbit-surface text-orbit-text-secondary shadow-orbit-xs hover:border-orbit-border-strong hover:bg-orbit-surface-secondary hover:text-orbit-text focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg",
  ghost:
    "text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg",
  danger:
    "bg-orbit-danger text-orbit-danger-fg shadow-orbit-xs hover:brightness-95 focus-visible:ring-2 focus-visible:ring-orbit-danger/45 focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 rounded-orbit-control px-2.5 text-xs font-medium gap-1.5",
  md: "h-9 rounded-orbit-control px-3.5 text-xs font-semibold gap-2",
  lg: "h-10 rounded-orbit-control px-5 text-sm font-semibold gap-2",
};

/**
 * Reusable action button built on ORBIT's Phase 8A semantic design tokens.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      trailingIcon,
      disabled,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center transition-colors outline-hidden disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        ) : icon ? (
          <span className="shrink-0" aria-hidden>
            {icon}
          </span>
        ) : null}
        {children}
        {!loading && trailingIcon && (
          <span className="shrink-0" aria-hidden>
            {trailingIcon}
          </span>
        )}
      </button>
    );
  }
);
