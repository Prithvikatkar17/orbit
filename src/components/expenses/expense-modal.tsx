"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import {
  type Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_MODES,
  CATEGORY_METADATA,
  parseINRToPaise,
  type ExpenseCategory,
  type ExpensePaymentMode,
} from "@/lib/schemas/expense";

export interface ExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (updated: Expense) => void;
  onDelete?: (id: string) => void;
}

function ExpenseModalContent({
  expense,
  onClose,
  onSave,
  onDelete,
}: {
  expense: Expense;
  onClose: () => void;
  onSave: (updated: Expense) => void;
  onDelete?: (id: string) => void;
}) {
  const [amountStr, setAmountStr] = useState(() => (expense.amountPaise / 100).toString());
  const [category, setCategory] = useState<ExpenseCategory>(() => expense.category);
  const [paymentMode, setPaymentMode] = useState<ExpensePaymentMode>(() => expense.paymentMode);
  const [note, setNote] = useState(() => expense.note || "");
  const [date, setDate] = useState(() => expense.date);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseINRToPaise(amountStr);
    if (paise <= 0) {
      setError("Please enter a valid amount greater than ₹0");
      return;
    }
    if (!date) {
      setError("Please select a date");
      return;
    }

    onSave({
      ...expense,
      amountPaise: paise,
      category,
      paymentMode,
      note: note.trim() || null,
      date,
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 orbit-modal-backdrop"
      style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-orbit-panel border border-orbit-border bg-orbit-surface p-5 shadow-2xl space-y-4"
        style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
      >
        <div className="flex items-center justify-between border-b border-orbit-border pb-3">
          <h2
            id="expense-modal-title"
            className="text-base font-semibold text-orbit-text"
          >
            Edit Expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:text-orbit-text hover:bg-orbit-subtle transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-orbit-control bg-orbit-danger/10 border border-orbit-danger/30 p-2.5 text-xs text-orbit-danger">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-orbit-text-secondary mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-orbit-text-muted">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-orbit-control border border-orbit-border bg-orbit-bg pl-8 pr-3 py-2 text-base font-semibold text-orbit-text focus:outline-none focus:border-orbit-accent"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-orbit-text-secondary mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const meta = CATEGORY_METADATA[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center justify-center min-h-[38px] px-2 py-1.5 rounded-orbit-control border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-orbit-accent bg-orbit-accent text-orbit-accent-fg shadow-xs"
                        : "border-orbit-border bg-orbit-surface text-orbit-text-secondary hover:bg-orbit-subtle hover:text-orbit-text"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-orbit-text-secondary mb-1.5">
              Payment Mode
            </label>
            <div className="flex gap-2">
              {EXPENSE_PAYMENT_MODES.map((mode) => {
                const isSelected = paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 min-h-[38px] rounded-orbit-control border text-xs font-semibold uppercase tracking-wider transition-all ${
                      isSelected
                        ? "border-orbit-accent bg-orbit-accent/15 text-orbit-accent"
                        : "border-orbit-border bg-orbit-surface text-orbit-text-muted hover:text-orbit-text"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-orbit-text-secondary mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[40px] rounded-orbit-control border border-orbit-border bg-orbit-bg px-2.5 py-1.5 text-xs text-orbit-text focus:outline-none focus:border-orbit-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-orbit-text-secondary mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                maxLength={160}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description"
                className="w-full min-h-[40px] rounded-orbit-control border border-orbit-border bg-orbit-bg px-2.5 py-1.5 text-xs text-orbit-text focus:outline-none focus:border-orbit-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-orbit-border">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(expense.id);
                  onClose();
                }}
                className="min-h-[40px] px-3 rounded-orbit-control text-xs font-medium text-orbit-danger hover:bg-orbit-danger/10 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 rounded-orbit-control border border-orbit-border text-xs font-medium text-orbit-text-secondary hover:bg-orbit-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-orbit-control bg-orbit-accent text-orbit-accent-fg text-xs font-semibold hover:bg-orbit-accent-hover transition-colors flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpenseModal({
  isOpen,
  expense,
  onClose,
  onSave,
  onDelete,
}: ExpenseModalProps) {
  if (!isOpen || !expense) return null;

  return (
    <ExpenseModalContent
      key={expense.id}
      expense={expense}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
