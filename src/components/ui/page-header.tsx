import React from "react";

export interface PageHeaderProps {
  /** Small uppercase eyebrow label (e.g. "UNIVERSAL INBOX") */
  eyebrow?: React.ReactNode;
  /** Optional emoji or icon shown beside the eyebrow */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Action buttons / controls placed on the right */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent responsive page header across ORBIT workspace routes.
 */
export function PageHeader({
  eyebrow,
  icon,
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={[
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        {(icon || eyebrow) && (
          <div className="flex items-center gap-2">
            {icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-orbit-control bg-orbit-accent-soft text-orbit-accent select-none">
                {icon}
              </span>
            )}
            {eyebrow && (
              <span className="text-[11px] font-semibold tracking-[0.14em] text-orbit-accent uppercase">
                {eyebrow}
              </span>
            )}
          </div>
        )}
        <h1
          className={[
            "font-display text-2xl font-semibold tracking-[-0.02em] text-orbit-text sm:text-3xl",
            icon || eyebrow ? "mt-1.5" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-orbit-text-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
