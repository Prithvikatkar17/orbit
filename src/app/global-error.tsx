"use client";

import React, { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("ORBIT global application error:", error?.digest || "root_failure");
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <main className="flex min-h-screen items-center justify-center p-4">
          <div
            role="alert"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <span aria-hidden="true" className="text-xl font-bold">
                !
              </span>
            </div>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Application error
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              ORBIT encountered an unexpected root error. Your local IndexedDB data remains safe on your device.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
              >
                Try again
              </button>

              {/* Standard anchor ensures clean recovery outside broken layout state */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

