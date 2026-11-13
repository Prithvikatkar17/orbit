import React from "react";

/** Standardized token-backed classes for ORBIT form inputs, textareas, and selects. */
export const inputClass =
  "orbit-input w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3.5 py-2.5 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:ring-2 focus:ring-orbit-ring/35 focus:outline-hidden disabled:opacity-50 transition-colors";

export const textareaClass =
  "orbit-textarea w-full rounded-orbit-control border border-orbit-border bg-orbit-surface p-3 text-sm text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:ring-2 focus:ring-orbit-ring/35 focus:outline-hidden disabled:opacity-50 transition-colors";

export const selectClass =
  "orbit-select w-full rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-2 text-sm text-orbit-text focus:border-orbit-accent focus:ring-2 focus:ring-orbit-ring/35 focus:outline-hidden disabled:opacity-50 transition-colors";

export const labelClass =
  "mb-1.5 block text-xs font-medium text-orbit-text-secondary";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required && (
          <span className="ml-0.5 text-orbit-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-orbit-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-orbit-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={[inputClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={[textareaClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={[selectClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});
