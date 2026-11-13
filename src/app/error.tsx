"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log diagnostics safely to browser console without displaying stack traces in UI
    console.error("ORBIT route runtime error:", error?.digest || "unexpected_error");
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div
        role="alert"
        aria-live="assertive"
        className="w-full max-w-md rounded-2xl border border-orbit-border bg-orbit-surface p-6 sm:p-8 text-center shadow-orbit-card"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orbit-danger/10 text-orbit-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-orbit-text">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm text-orbit-text-secondary leading-relaxed">
          ORBIT encountered an unexpected error rendering this view. Your local workspace data remains safely stored on your device.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="primary"
            onClick={() => reset()}
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          >
            Try again
          </Button>

          <Link
            href="/"
            className="inline-flex min-h-[44px] sm:min-h-[36px] items-center justify-center gap-2 rounded-orbit-control border border-orbit-border bg-orbit-surface px-4 py-2 text-xs font-semibold text-orbit-text-secondary shadow-orbit-xs hover:border-orbit-border-strong hover:bg-orbit-surface-secondary hover:text-orbit-text focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
