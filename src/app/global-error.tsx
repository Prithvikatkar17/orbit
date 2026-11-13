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
      <body className="min-h-screen bg-[#f6f5f1] text-[#262621] antialiased dark:bg-[#161613] dark:text-[#f1efe7]">
        <main className="flex min-h-screen items-center justify-center p-4">
          <div
            role="alert"
            aria-live="assertive"
            className="w-full max-w-md rounded-2xl border border-[#e3dfd4] bg-[#fcfbf8] p-6 sm:p-8 text-center shadow-lg dark:border-[#2e2d26] dark:bg-[#1d1c18]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b8403a]/10 text-[#b8403a] dark:text-[#e0736b]">
              <span aria-hidden="true" className="text-xl font-bold font-mono">
                !
              </span>
            </div>

            <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight text-[#262621] dark:text-[#f1efe7]">
              Application Error
            </h1>

            <p className="mt-2 text-sm text-[#57564c] dark:text-[#c6c3b7] leading-relaxed">
              ORBIT encountered an unexpected root failure. Your local IndexedDB workspace data remains safe on your device.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-[44px] sm:min-h-[36px] items-center justify-center rounded-lg bg-[#2c5e4f] px-4 py-2 text-xs font-semibold text-[#faf9f5] shadow-sm hover:bg-[#224b3e] focus:outline-hidden dark:bg-[#6bb39b] dark:text-[#11221c] dark:hover:bg-[#7fc1aa] transition-colors"
              >
                Try again
              </button>

              {/* Standard anchor ensures clean recovery outside broken layout state */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex min-h-[44px] sm:min-h-[36px] items-center justify-center rounded-lg border border-[#e3dfd4] bg-[#fcfbf8] px-4 py-2 text-xs font-semibold text-[#57564c] shadow-sm hover:bg-[#efece3] hover:text-[#262621] dark:border-[#2e2d26] dark:bg-[#1d1c18] dark:text-[#c6c3b7] dark:hover:bg-[#25241e] dark:hover:text-[#f1efe7] transition-colors"
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
