"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Download, CheckCircle, ArrowRight, X } from "lucide-react";
import {
  detectLegacyData,
  analyzeLegacyData,
  executeLegacyMigration,
  type MigrationPreview,
} from "@/lib/utils/migrate-legacy";
import { useAccessibleModal } from "@/lib/hooks/use-accessible-modal";
import { Button } from "@/components/ui/button";

function subscribeLegacy(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function LegacyMigrationBanner() {
  const hasLegacy = useSyncExternalStore(
    subscribeLegacy,
    detectLegacyData,
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const modalRef = useAccessibleModal({
    isOpen: showModal,
    onClose: () => setShowModal(false),
  });

  if (!hasLegacy || dismissed) return null;

  async function handleOpenPreview() {
    const data = await analyzeLegacyData();
    setPreview(data);
    setShowModal(true);
  }

  async function handleConfirmImport() {
    setIsImporting(true);
    try {
      const res = await executeLegacyMigration();
      setImportResult(
        `Imported ${res.importedTasks} tasks, ${res.importedHabits} habits (${res.importedLogs} logs), and ${res.importedLibrary} library entries.`
      );
      setDismissed(true);
    } catch (e) {
      console.error("Migration error:", e);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      {/* Banner on top of page */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-orbit-card border border-orbit-border bg-orbit-surface p-4 shadow-orbit-card transition-all">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-orbit-control bg-orbit-accent text-orbit-accent-fg shadow-orbit-xs">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-orbit-text">
              Data found from Everything-List!
            </h4>
            <p className="text-xs text-orbit-text-secondary mt-0.5">
              We detected existing tasks and habit records stored in this browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenPreview}
            trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Review & Import
          </Button>
          <button
            type="button"
            aria-label="Dismiss migration banner"
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Migration Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="migration-modal-title"
            tabIndex={-1}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-orbit-border bg-orbit-surface p-4 sm:p-6 shadow-orbit-elevated outline-hidden scrollbar-thin"
          >
            <div className="flex items-center justify-between pb-3 border-b border-orbit-border">
              <h3 id="migration-modal-title" className="font-display text-xl font-medium text-orbit-text">
                Everything-List Migration
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-orbit-control text-orbit-text-muted hover:bg-orbit-surface-secondary hover:text-orbit-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orbit-success-soft text-orbit-success">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="font-display text-lg font-medium text-orbit-text">
                  Import Successful!
                </h4>
                <p className="mt-1 text-sm text-orbit-text-secondary">
                  {importResult}
                </p>
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowModal(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : preview ? (
              <div className="space-y-4 pt-4">
                <p className="text-sm text-orbit-text-secondary">
                  Found <strong className="font-mono text-orbit-text">{preview.totalLegacyItems} items</strong> in
                  localStorage. Here is how ORBIT will structure them:
                </p>

                <div className="space-y-2 rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary p-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-orbit-text-secondary">
                      📋 Tasks & Goals:
                    </span>
                    <strong className="font-mono text-orbit-text font-semibold">
                      {preview.tasksToImport}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orbit-text-secondary">
                      🔁 Habits & Routines:
                    </span>
                    <strong className="font-mono text-orbit-text font-semibold">
                      {preview.habitsToImport} ({preview.habitLogsToImport} history logs)
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orbit-text-secondary">
                      📚 Library Items (Watch, Learn, Buy):
                    </span>
                    <strong className="font-mono text-orbit-text font-semibold">
                      {preview.libraryToImport}
                    </strong>
                  </div>
                  {preview.duplicatesCount > 0 && (
                    <div className="flex justify-between items-center text-orbit-warning pt-1 border-t border-orbit-border">
                      <span>⚠️ Duplicates (Skipped):</span>
                      <strong className="font-mono">{preview.duplicatesCount}</strong>
                    </div>
                  )}
                </div>

                <div className="rounded-orbit-card border border-orbit-border-strong/40 bg-orbit-surface-secondary/50 p-3 text-xs text-orbit-text-muted">
                  🔒 <strong>Non-destructive:</strong> Your original Everything-List
                  data in localStorage will remain untouched. You can verify your
                  data in ORBIT first.
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-orbit-border">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    loading={isImporting}
                    disabled={isImporting}
                    onClick={handleConfirmImport}
                    trailingIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Confirm & Import
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-orbit-text-muted">
                Scanning legacy data...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
