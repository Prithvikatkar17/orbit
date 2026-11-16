"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore, parseShareTargetDraft } from "@/lib/stores/ui-store";
import { useThemePersonality } from "@/components/theme-personality-provider";

function CaptureInterceptor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openQuickCapture } = useUIStore();

  useEffect(() => {
    const rawTitle = searchParams.get("title") ?? "";
    const rawText = searchParams.get("text") ?? "";
    const rawUrl = searchParams.get("url") ?? "";

    // 1. Compose consolidated draftText string
    const draftParts = [rawTitle.trim(), rawText.trim(), rawUrl.trim()].filter(Boolean);
    const draftText = draftParts.join("\n");

    // 2. Derive structured title, notes, and link
    const structured = parseShareTargetDraft(draftText);

    // If explicit title was provided, prioritize it
    if (rawTitle.trim()) {
      structured.title = rawTitle.trim();
      // If text exists and wasn't consumed as title
      if (rawText.trim() && rawText.trim() !== structured.title) {
        structured.notes = structured.notes
          ? `${rawText.trim()}\n${structured.notes}`
          : rawText.trim();
      }
    }

    // If explicit URL was provided, prioritize it
    if (rawUrl.trim()) {
      structured.link = rawUrl.trim();
    }

    // 3. Open Quick Capture with prefilled payload
    if (draftText) {
      openQuickCapture(structured);
    } else {
      openQuickCapture();
    }

    // 4. Instant replace to Home dashboard with modal open over it
    router.replace("/");
  }, [searchParams, openQuickCapture, router]);

  return <CaptureLoadingView />;
}

function CaptureLoadingView() {
  const { themePersonality } = useThemePersonality();

  const isMinimalist = themePersonality === "minimalist";
  const isFuturistic = themePersonality === "futuristic";
  const isArchivist = themePersonality === "archivist";
  const isMidnight = themePersonality === "midnight";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-orbit-bg px-4 select-none">
      <div
        className={`flex flex-col items-center justify-center p-8 max-w-sm w-full text-center bg-orbit-surface border ${
          isMinimalist
            ? "rounded-none border-black/20 dark:border-white/20 shadow-none"
            : isFuturistic
            ? "rounded-xl border-[#00f0ff]/40 shadow-orbit-elevated bg-[#050b14]/90"
            : isArchivist
            ? "rounded-xl border-[#b89758]/50 shadow-orbit-elevated bg-[#fbf7ee] dark:bg-[#1f1a14]"
            : isMidnight
            ? "rounded-2xl border-[#1e1b4b] shadow-orbit-elevated bg-[#03050c]"
            : "rounded-2xl border-orbit-border shadow-orbit-elevated"
        }`}
        style={{ backdropFilter: "none" }}
      >
        {/* Pulsing Celestial Orbit Vector Icon */}
        <div className="relative mb-6 flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-orbit-accent/30 animate-ping opacity-30" />
          <div className="absolute inset-1 rounded-full border border-orbit-border animate-pulse" />
          <svg
            className="w-10 h-10 text-orbit-accent animate-spin"
            style={{ animationDuration: "6s" }}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Astrolabe Ring */}
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            {/* Tilted Vector Orbit */}
            <ellipse cx="32" cy="32" rx="24" ry="10" stroke="currentColor" strokeWidth="2" transform="rotate(-30 32 32)" />
            {/* Central Celestial Core */}
            <circle cx="32" cy="32" r="4.5" fill="currentColor" />
            <circle cx="48" cy="23" r="2.5" fill="currentColor" />
          </svg>
        </div>

        {/* Status Headings */}
        <p
          className={`text-xs font-semibold tracking-widest uppercase mb-1.5 ${
            isFuturistic
              ? "font-mono text-[#00f0ff]"
              : isArchivist
              ? "font-serif text-[#b89758]"
              : isMinimalist
              ? "font-mono text-orbit-text"
              : "text-orbit-accent"
          }`}
        >
          {isFuturistic
            ? "SYS.CAPTURE // INGESTING"
            : isArchivist
            ? "ARCHIVAL RECEPTION // CODEX"
            : "INITIALIZING CAPTURE..."}
        </p>

        <p className="text-xs text-orbit-subtext">
          Receiving shared payload & opening Quick Capture...
        </p>
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureLoadingView />}>
      <CaptureInterceptor />
    </Suspense>
  );
}
