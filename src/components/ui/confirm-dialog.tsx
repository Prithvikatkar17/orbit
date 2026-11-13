"use client";

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import {
  canDismissConfirmDialog,
  resolveConfirmDialogConfig,
} from "@/lib/utils/confirm-dialog";
import { Button } from "./button";

export interface ConfirmDialogProps {
  /** Whether the dialog is currently visible */
  isOpen: boolean;
  /** Called when the user cancels or dismisses the dialog */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  /** Label for the confirm button (default: "Delete" when danger, else "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Shows danger styling on the confirm button and warning icon */
  danger?: boolean;
  /** Shows a spinner on confirm and locks dismissal while true */
  loading?: boolean;
}

/**
 * Accessible, focus-trapped confirmation dialog backed by ORBIT design tokens.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  const resolved = resolveConfirmDialogConfig({
    title,
    description,
    confirmLabel,
    cancelLabel,
    danger,
    loading,
  });

  // Prevent Escape dismissal while an async destructive operation is active
  const modalRef = useAccessibleModal({
    isOpen,
    onClose: resolved.canDismiss ? onClose : () => {},
  });

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="orbit-modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && canDismissConfirmDialog(loading)) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={resolved.description ? descId : undefined}
        tabIndex={-1}
        className="orbit-modal-dialog w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-orbit-card border border-orbit-border/80 bg-orbit-surface-elevated p-4 sm:p-6 shadow-orbit-elevated outline-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-orbit-control bg-orbit-danger-soft text-orbit-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-lg font-semibold text-orbit-text"
            >
              {resolved.title}
            </h2>
            {resolved.description && (
              <p
                id={descId}
                className="mt-1 text-xs leading-relaxed text-orbit-text-secondary"
              >
                {resolved.description}
              </p>
            )}
          </div>
        </div>

        {/* Cancel precedes Confirm in DOM order so auto-focus lands on the safe action */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="md"
            disabled={resolved.isCancelDisabled}
            onClick={() => {
              if (resolved.canDismiss) onClose();
            }}
          >
            {resolved.cancelLabel}
          </Button>
          <Button
            variant={resolved.confirmVariant}
            size="md"
            loading={loading}
            disabled={resolved.isConfirmDisabled}
            onClick={() => {
              void onConfirm();
            }}
          >
            {resolved.confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
