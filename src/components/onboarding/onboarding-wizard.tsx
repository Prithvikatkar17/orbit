"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Repeat,
  Calendar,
  BookOpen,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import {
  THEME_PERSONALITIES,
  type ThemePersonality,
  DEFAULT_THEME_PERSONALITY,
} from "@/lib/schemas/settings";
import { useThemePersonality } from "@/components/theme-personality-provider";
import {
  checkOnboardingStatus,
  completeOnboarding,
} from "@/lib/services/onboarding-service";
import { ThemePersonalityCard } from "@/components/theme-preview-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

const CORE_MODULES = [
  {
    title: "Tasks & Goals",
    description:
      "Organize actionable priorities, set due dates, and track completion velocity without clutter.",
    icon: CheckCircle2,
    badge: "Priorities",
  },
  {
    title: "Daily Routines",
    description:
      "Form enduring daily habits with scheduled frequencies, single-tap check-ins, and streak retention.",
    icon: Repeat,
    badge: "Cadence",
  },
  {
    title: "Calendar & Occurrences",
    description:
      "Map out upcoming events, recurring schedules, and non-intrusive local browser reminders.",
    icon: Calendar,
    badge: "Schedule",
  },
  {
    title: "Personal Library",
    description:
      "A distraction-free repository for personal notes, bookmarked resources, and research collections.",
    icon: BookOpen,
    badge: "Knowledge",
  },
  {
    title: "Insights & Rhythm",
    description:
      "Reflect on throughput metrics, habit consistency, and weekly momentum with zero telemetry.",
    icon: BarChart3,
    badge: "Analytics",
  },
];

const STEP_LABELS = [
  { num: 1, label: "Discover" },
  { num: 2, label: "Personality" },
  { num: 3, label: "Preview" },
];

export function OnboardingWizard() {
  const { themePersonality, setThemePersonality } = useThemePersonality();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedPersonality, setSelectedPersonality] =
    useState<ThemePersonality>(themePersonality || DEFAULT_THEME_PERSONALITY);

  // Check onboarding status on initial mount
  useEffect(() => {
    let isSubscribed = true;

    checkOnboardingStatus()
      .then((status) => {
        if (!isSubscribed) return;
        if (status.needsOnboarding) {
          setIsOpen(true);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Onboarding check encountered an error:", err);
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSelectPersonality = useCallback(
    async (personality: ThemePersonality) => {
      setSelectedPersonality(personality);
      try {
        await setThemePersonality(personality);
      } catch (err) {
        console.warn("Live theme switch during onboarding:", err);
      }
    },
    [setThemePersonality]
  );

  const handleComplete = useCallback(async () => {
    try {
      await completeOnboarding({ themePersonality: selectedPersonality });
    } finally {
      setIsOpen(false);
    }
  }, [selectedPersonality]);

  const handleSkip = useCallback(async () => {
    try {
      await completeOnboarding({
        themePersonality: selectedPersonality || DEFAULT_THEME_PERSONALITY,
        skipped: true,
      });
    } finally {
      setIsOpen(false);
    }
  }, [selectedPersonality]);

  // Keyboard navigation for step transitions and Escape to skip
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        void handleSkip();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSkip]);

  if (isLoading || !isOpen) {
    return null;
  }

  const activeMeta =
    THEME_PERSONALITIES.find((p) => p.id === selectedPersonality) ??
    THEME_PERSONALITIES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="orbit-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div className="orbit-modal-dialog flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-orbit-border bg-orbit-bg text-orbit-text shadow-orbit-popover overflow-hidden transition-all duration-200">
        {/* Wizard Header & Progress Bar */}
        <header className="px-5 py-4 sm:px-8 sm:py-5 border-b border-orbit-border bg-orbit-surface/80 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orbit-accent-soft text-orbit-accent border border-orbit-border/60 shadow-orbit-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-orbit-accent">
                ORBIT SETUP
              </span>
              <h1 className="font-display text-base font-bold text-orbit-text leading-tight">
                Welcome to your workspace
              </h1>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center gap-2" aria-label="Onboarding Progress">
            {STEP_LABELS.map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-orbit-accent text-orbit-accent-fg font-semibold shadow-orbit-xs"
                      : isPast
                      ? "bg-orbit-accent-soft text-orbit-accent"
                      : "bg-orbit-surface-secondary text-orbit-text-muted"
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold">
                    {step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              );
            })}
          </div>
        </header>

        {/* Wizard Body (Scrollable for smaller screens) */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: Discover ORBIT                                            */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 1 of 3 • Discover
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Your Personal Space. Everything in Place.
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  ORBIT is a quiet, local-first personal operating system for your
                  tasks, daily habits, calendar, and notes. Everything lives securely
                  inside this browser&apos;s IndexedDB—no tracking, no cloud lock-in.
                </p>
              </div>

              {/* 5 Core Functional Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {CORE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <SurfaceCard
                      key={mod.title}
                      padding="md"
                      className="flex flex-col justify-between hover:border-orbit-border-strong transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-mono text-[10px] uppercase font-semibold text-orbit-text-muted">
                            {mod.badge}
                          </span>
                        </div>
                        <h3 className="font-display text-sm font-bold text-orbit-text mt-1">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-orbit-text-secondary mt-1.5 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </SurfaceCard>
                  );
                })}

                {/* Privacy & Local-First Assurance Tile */}
                <SurfaceCard
                  padding="md"
                  variant="tonal"
                  className="flex flex-col justify-between border-orbit-accent/30 bg-orbit-accent-soft/20 sm:col-span-2 lg:col-span-1"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orbit-accent-soft text-orbit-accent border border-orbit-accent/40">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold text-orbit-accent">
                        Local-First
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-orbit-text mt-1">
                      Zero Telemetry
                    </h3>
                    <p className="text-xs text-orbit-text-secondary mt-1.5 leading-relaxed">
                      Your data never leaves your device. Works 100% offline with zero
                      backend dependencies.
                    </p>
                  </div>
                </SurfaceCard>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: Choose Your Personality                                  */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 2 of 3 • Personalities
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Choose Your Personality
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  Select the visual tone for your workspace. ORBIT adapts its
                  typography, geometric radius, borders, and color temperature
                  instantly. You can always change this anytime in Settings.
                </p>
              </div>

              {/* 7 Personality Cards Grid */}
              <div
                role="radiogroup"
                aria-label="Theme Personalities"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2"
              >
                {THEME_PERSONALITIES.map((meta) => {
                  const isSelected = selectedPersonality === meta.id;
                  return (
                    <ThemePersonalityCard
                      key={meta.id}
                      meta={meta}
                      isSelected={isSelected}
                      onSelect={handleSelectPersonality}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: Preview Your Workspace                                    */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center sm:text-left">
                <Badge variant="accent" className="font-mono uppercase text-[10px]">
                  Step 3 of 3 • Live Preview
                </Badge>
                <h2
                  id="onboarding-step-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-orbit-text"
                >
                  Preview Your Workspace
                </h2>
                <p className="text-sm sm:text-base text-orbit-text-secondary max-w-2xl leading-relaxed">
                  Here is how your dashboard looks in the{" "}
                  <strong className="text-orbit-accent font-semibold">
                    {activeMeta.name}
                  </strong>{" "}
                  personality. Everything is configured and ready.
                </p>
              </div>

              {/* Realistic Specimen Workspace Bento Grid */}
              <div className="rounded-xl border border-orbit-border bg-orbit-bg p-4 sm:p-6 shadow-orbit-sm space-y-5">
                {/* Simulated Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-orbit-border/70 pb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold text-orbit-accent">
                      SATURDAY, NOVEMBER 14
                    </span>
                    <h3 className="font-display text-2xl font-bold text-orbit-text">
                      Good afternoon
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-orbit-text-secondary">
                      <span className="inline-flex items-center gap-1 rounded border border-orbit-border/60 bg-orbit-surface px-2 py-0.5">
                        <strong className="font-semibold text-orbit-text">0</strong> due
                        today
                      </span>
                      <span className="inline-flex items-center gap-1 rounded border border-orbit-border/60 bg-orbit-surface px-2 py-0.5">
                        <strong className="font-semibold text-orbit-text">0</strong> open
                        tasks
                      </span>
                      <span className="inline-flex items-center gap-1 rounded border border-orbit-border/60 bg-orbit-surface px-2 py-0.5">
                        <strong className="font-semibold text-orbit-text">0/0</strong>{" "}
                        habits
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-orbit-control border border-orbit-border bg-orbit-surface px-3 py-1.5 text-xs font-semibold text-orbit-text">
                      <Layers className="h-3.5 w-3.5 text-orbit-accent" />
                      <span>{activeMeta.name}</span>
                    </span>
                  </div>
                </div>

                {/* Simulated Bento Grid Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  {/* Today's Focus Specimen Tile (7 cols) */}
                  <div className="sm:col-span-7 rounded-xl border border-orbit-border bg-orbit-surface p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-orbit-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orbit-accent" />
                        <h4 className="font-display text-sm font-bold text-orbit-text">
                          Today&apos;s Focus
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-orbit-accent">
                        All tasks →
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-orbit-surface-secondary/40 border border-orbit-border/40">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-orbit-border-strong" />
                          <span className="font-medium text-orbit-text">
                            Welcome to ORBIT
                          </span>
                        </div>
                        <Badge variant="accent">Welcome</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-orbit-surface-secondary/40 border border-orbit-border/40">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-orbit-border-strong" />
                          <span className="font-medium text-orbit-text">
                            Capture your first task or habit
                          </span>
                        </div>
                        <Badge variant="neutral">Starter</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Daily Routines Specimen Tile (5 cols) */}
                  <div className="sm:col-span-5 rounded-xl border border-orbit-border bg-orbit-surface p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-orbit-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-orbit-success" />
                        <h4 className="font-display text-sm font-bold text-orbit-text">
                          Daily Routines
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-orbit-accent">
                        All habits →
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-orbit-surface-secondary/30 border border-orbit-border/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-orbit-text">
                          Morning Reading &amp; Review
                        </span>
                        <span className="font-mono text-[10px] text-orbit-text-muted">
                          Daily
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-orbit-progress-track">
                        <div className="h-full w-2/3 rounded-full bg-orbit-chart-2" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personality Specimen Specs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-orbit-border/60 text-xs text-orbit-text-muted">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-semibold text-orbit-text">Theme:</span>
                    <span>{activeMeta.name}</span>
                    <span>·</span>
                    <span>{activeMeta.tagline}</span>
                  </div>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.bg }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.surface }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: activeMeta.swatches.accent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Wizard Footer Navigation Actions */}
        <footer className="px-5 py-4 sm:px-8 border-t border-orbit-border bg-orbit-surface/80 backdrop-blur-xs flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="secondary"
                size="md"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
              >
                Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold text-orbit-text-muted hover:text-orbit-text transition-colors px-2 py-1.5"
              >
                Skip for now
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleSkip}
                className="hidden sm:inline-block text-xs font-semibold text-orbit-text-muted hover:text-orbit-text transition-colors px-3 py-1.5"
              >
                Skip setup
              </button>
            )}

            {currentStep < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
              >
                <span>
                  {currentStep === 1 ? "Choose Personality" : "Preview Workspace"}
                </span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={handleComplete}
              >
                <span>Enter ORBIT</span>
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
