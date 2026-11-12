export interface ConfirmDialogConfigInput {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export interface ResolvedConfirmDialogConfig {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: "primary" | "danger";
  canDismiss: boolean;
  isConfirmDisabled: boolean;
  isCancelDisabled: boolean;
}

/**
 * Determines whether a confirmation dialog may be dismissed via Escape,
 * Cancel, or backdrop interaction. Always returns false while an async
 * operation is in flight to prevent accidental abandonment.
 */
export function canDismissConfirmDialog(loading = false): boolean {
  return !loading;
}

/**
 * Resolves display labels, button variant, and lock states for ConfirmDialog.
 */
export function resolveConfirmDialogConfig(
  input: ConfirmDialogConfigInput
): ResolvedConfirmDialogConfig {
  const loading = Boolean(input.loading);
  const danger = Boolean(input.danger);

  return {
    title: input.title,
    description: input.description,
    confirmLabel: input.confirmLabel ?? (danger ? "Delete" : "Confirm"),
    cancelLabel: input.cancelLabel ?? "Cancel",
    confirmVariant: danger ? "danger" : "primary",
    canDismiss: canDismissConfirmDialog(loading),
    isConfirmDisabled: loading,
    isCancelDisabled: loading,
  };
}

