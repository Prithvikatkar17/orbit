"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Download, CheckCircle, ArrowRight, X } from "lucide-react";
import {
  detectLegacyData,
  analyzeLegacyData,
  executeLegacyMigration,
  type MigrationPreview,
} from "@/lib/utils/migrate-legacy";

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Data found from Everything-List!
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              We detected your existing tasks and habit records in this browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <span>Review & Import</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Migration Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Everything-List Migration Preview
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Import Successful!
                </h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {importResult}
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            ) : preview ? (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Found <strong>{preview.totalLegacyItems} items</strong> in
                  localStorage. Here is how ORBIT will structure them:
                </p>

                <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      📋 Tasks & Goals:
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {preview.tasksToImport}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      🔁 Habits & Routines:
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {preview.habitsToImport} ({preview.habitLogsToImport} history logs)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      📚 Library Items (Watch, Learn, Buy):
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {preview.libraryToImport}
                    </strong>
                  </div>
                  {preview.duplicatesCount > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>⚠️ Duplicates (Skipped):</span>
                      <strong>{preview.duplicatesCount}</strong>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                  🔒 <strong>Non-destructive:</strong> Your original Everything-List
                  data in localStorage will remain untouched. You can verify your
                  data in ORBIT first.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <span>{isImporting ? "Importing..." : "Confirm & Import"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                Scanning legacy data...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

