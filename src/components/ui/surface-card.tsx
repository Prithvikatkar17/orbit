import React from "react";

export type SurfaceCardVariant = "outlined" | "elevated" | "tonal" | "flat";
export type SurfaceCardPadding = "none" | "sm" | "md" | "lg";

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  /** Visual surface treatment aligned to ORBIT's editorial surface hierarchy */
  variant?: SurfaceCardVariant;
  /** Makes the card visually responsive to pointer hover */
  interactive?: boolean;
  /** Standardized internal spacing preset */
  padding?: SurfaceCardPadding;
  as?: React.ElementType;
}

const variantClasses: Record<SurfaceCardVariant, string> = {
  outlined: "border border-orbit-border bg-orbit-surface shadow-orbit-xs",
  elevated: "border border-orbit-border/75 bg-orbit-surface-elevated shadow-orbit-card",
  tonal: "border border-transparent bg-orbit-surface-secondary shadow-none",
  flat: "border border-transparent bg-transparent shadow-none",
};

const interactiveVariantClasses: Record<SurfaceCardVariant, string> = {
  outlined:
    "transition-all hover:border-orbit-border-strong hover:shadow-orbit-card cursor-pointer",
  elevated:
    "transition-all hover:border-orbit-border-strong hover:shadow-orbit-elevated cursor-pointer",
  tonal:
    "transition-colors hover:bg-orbit-subtle cursor-pointer",
  flat:
    "transition-colors hover:bg-orbit-surface-secondary/60 cursor-pointer",
};

const paddingClasses: Record<SurfaceCardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6",
};

/**
 * Reusable surface container supporting outlined, elevated, tonal, and flat treatments.
 */
export const SurfaceCard = React.forwardRef<HTMLElement, SurfaceCardProps>(
  function SurfaceCard(
    {
      children,
      className = "",
      variant = "outlined",
      interactive = false,
      padding = "none",
      as: Tag = "div",
      ...props
    },
    ref
  ) {
    return (
      <Tag
        ref={ref}
        className={[
          "rounded-orbit-card",
          variantClasses[variant],
          paddingClasses[padding],
          interactive && interactiveVariantClasses[variant],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
