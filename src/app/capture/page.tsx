"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore, parseShareTargetDraft } from "@/lib/stores/ui-store";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { useMounted } from "@/lib/utils/dates";
import { ArrowRight } from "lucide-react";

const PENDING_CAPTURE_STORAGE_KEY = "orbit_pending_capture";

function CaptureInterceptor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openQuickCapture } = useUIStore();
  const [showManualFallback, setShowManualFallback] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let rawTitle = searchParams.get("title") ?? "";
    let rawText = searchParams.get("text") ?? "";
    let rawUrl = searchParams.get("url") ?? "";

    // Fallback: direct window.location.search inspection if searchParams is empty on static prerender
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (!rawTitle && urlParams.has("title")) rawTitle = urlParams.get("title") ?? "";
        if (!rawText && urlParams.has("text")) rawText = urlParams.get("text") ?? "";
        if (!rawUrl && urlParams.has("url")) rawUrl = urlParams.get("url") ?? "";
      } catch {
        // ignore
      }
    }

    // 1. Derive structured payload using parseShareTargetDraft
    const payload = parseShareTargetDraft({ title: rawTitle, text: rawText, url: rawUrl });

    // 2. Persist to sessionStorage with "orbit-share-draft" (and backward-compatible key)
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("orbit-share-draft", JSON.stringify(payload));
        window.sessionStorage.setItem(PENDING_CAPTURE_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn("Could not save share draft to sessionStorage:", err);
      }
    }

    // 3. Update in-memory Zustand store
    openQuickCapture(payload);

    // 4. Trigger Next.js router replace to Home dashboard with shared=1 flag
    try {
      router.replace("/?shared=1");
    } catch {
      // ignore
    }

    // 5. Hard fallback timer: force window.location.replace if Next.js router stalls on mobile
    const hardFallbackTimer = setTimeout(() => {
      if (!redirectedRef.current && typeof window !== "undefined") {
        redirectedRef.current = true;
        window.location.replace("/?shared=1");
      }
    }, 600);

    // 6. Surface manual button after 1s if still on this screen
    const manualButtonTimer = setTimeout(() => {
      setShowManualFallback(true);
    }, 1000);

    return () => {
      clearTimeout(hardFallbackTimer);
      clearTimeout(manualButtonTimer);
    };
  }, [searchParams, openQuickCapture, router]);

  const handleManualContinue = () => {
    redirectedRef.current = true;
    if (typeof window !== "undefined") {
      window.location.replace("/?shared=1");
    }
  };

  return (
    <CaptureLoadingView
      showManualFallback={showManualFallback}
      onManualContinue={handleManualContinue}
    />
  );
}

interface CaptureLoadingViewProps {
  showManualFallback?: boolean;
  onManualContinue?: () => void;
}

function CaptureLoadingView({ showManualFallback, onManualContinue }: CaptureLoadingViewProps) {
  const { themePersonality } = useThemePersonality();
  const mounted = useMounted();

  const activePersonality = mounted ? themePersonality : "archivist";
  const isMinimalist = activePersonality === "minimalist";
  const isFuturistic = activePersonality === "futuristic";
  const isArchivist = activePersonality === "archivist";
  const isMidnight = activePersonality === "midnight";

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

        {showManualFallback && (
          <button
            type="button"
            onClick={onManualContinue}
            className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-orbit-control bg-orbit-accent px-4 py-2.5 text-xs font-semibold text-orbit-accent-fg shadow-orbit-card transition-all hover:bg-orbit-accent-hover active:scale-[0.98]"
          >
            <span>Continue to Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
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
