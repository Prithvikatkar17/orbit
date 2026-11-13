"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Clock,
  Palette,
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  downloadBackupZip,
  downloadBackupFile,
  restoreBackup,
} from "@/lib/services/backup-service";
import { requestNotificationPermission } from "@/lib/services/reminder-service";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { useMounted } from "@/lib/utils/dates";
import {
  fetchDatabaseStorageCounts,
  EMPTY_STORAGE_COUNTS,
} from "@/lib/services/workspace-queries";
import {
  THEME_PERSONALITIES,
} from "@/lib/schemas/settings";
import { useThemePersonality } from "@/components/theme-personality-provider";
import {
  Badge,
  Button,
  ConfirmDialog,
  PageHeader,
  SurfaceCard,
} from "@/components/ui";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { themePersonality, setThemePersonality } = useThemePersonality();
  const mounted = useMounted();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [defaultReminderTime, setDefaultReminderTime] = useState("09:00");
  const [weekStartsOn, setWeekStartsOn] = useState<"monday" | "sunday">("monday");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [pendingRestore, setPendingRestore] = useState<{
    file: File;
    existingFilesCount: number;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Consolidated single Dexie live query for all storage counts
  const {
    itemsCount,
    tasksCount,
    habitsCount,
    habitLogsCount,
    eventsCount,
    remindersCount,
    libraryCount,
    collectionsCount,
    filesCount,
  } = useLiveQuery(() => fetchDatabaseStorageCounts(), []) ?? EMPTY_STORAGE_COUNTS;

  useEffect(() => {
    // Load settings from db
    db.settings
      .get("user_settings")
      .then((s) => {
        if (s) {
          if (s.defaultReminderTime) setDefaultReminderTime(s.defaultReminderTime);
          if (s.weekStartsOn) setWeekStartsOn(s.weekStartsOn);
        }
        if (typeof window !== "undefined" && "Notification" in window) {
          setPermission(Notification.permission);
        }
      })
      .catch((err) => console.error("Error loading settings:", err));
  }, []);

  async function handleSavePreference(updates: {
    defaultReminderTime?: string;
    weekStartsOn?: "monday" | "sunday";
  }) {
    const nowIso = new Date().toISOString();
    try {
      const existing = await db.settings.get("user_settings");
      if (existing) {
        await db.settings.update("user_settings", {
          ...updates,
          updatedAt: nowIso,
        });
      } else {
        await db.settings.add({
          id: "user_settings",
          theme: (theme as "light" | "dark" | "system") || "system",
          themePersonality: themePersonality || "archivist",
          defaultPriority: "medium",
          defaultReminderTime: updates.defaultReminderTime || "09:00",
          weekStartsOn: updates.weekStartsOn || "monday",
          dateFormat: "DD/MM/YYYY",
          notificationsEnabled: true,
          heatmapDays: 180,
          schemaVersion: 1,
          updatedAt: nowIso,
        });
      }
      setStatusMessage("Preferences saved successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setErrorMessage("Failed to save settings.");
    }
  }

  async function handleEnableNotifications() {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === "granted") {
      setStatusMessage("Notifications enabled!");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }

  async function handleSendTestNotification() {
    await useNotificationStore.getState().addNotification({
      id: crypto.randomUUID(),
      reminderId: "test",
      eventId: "test",
      eventTitle: "Test Notification",
      eventType: "general",
      occurrenceDate: new Date().toISOString().slice(0, 10),
      scheduledTime: "Just now",
      isMissed: false,
      deliveredAt: new Date().toISOString(),
      read: false,
    });

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("ORBIT Test Alert", {
        body: "Your notifications and reminders are configured and working properly!",
        icon: "/favicon.ico",
      });
    }

    setStatusMessage("Test notification sent to Notification Center!");
    setTimeout(() => setStatusMessage(null), 3000);
  }

  async function handleBackupZipDownload() {
    try {
      await downloadBackupZip();
      setStatusMessage("Full ZIP backup downloaded successfully (11 tables & attachments)!");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to download ZIP backup:", err);
      setErrorMessage(
        err instanceof Error
          ? `Failed to create ZIP backup: ${err.message}`
          : "Failed to create backup."
      );
    }
  }

  async function handleBackupJsonDownload() {
    try {
      await downloadBackupFile();
      setStatusMessage("JSON backup downloaded successfully (data only)!");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to download JSON backup:", err);
      setErrorMessage("Failed to create JSON backup.");
    }
  }

  async function executeRestore(file: File, confirmFileDeletion: boolean) {
    setIsRestoring(true);
    try {
      const stats = await restoreBackup(file, restoreMode, { confirmFileDeletion });

      setStatusMessage(
        `Successfully restored ${stats.tasks} tasks, ${stats.events} events, ${stats.libraryEntries} library resources, and ${stats.libraryFiles} file attachments!`
      );
    } catch (err: unknown) {
      console.error("Import error:", err);
      setErrorMessage(
        err instanceof Error
          ? `Failed to restore: ${err.message}`
          : "Invalid backup file or validation failed."
      );
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const isZip =
        file.name.toLowerCase().endsWith(".zip") ||
        file.type.includes("zip");

      // In Replace All mode with legacy JSON, warn user via ConfirmDialog before clearing attachments
      if (!isZip && restoreMode === "replace") {
        const existingFiles = await db.libraryFiles.count();
        if (existingFiles > 0) {
          setPendingRestore({ file, existingFilesCount: existingFiles });
          return;
        }
      }

      await executeRestore(file, false);
    } catch (err: unknown) {
      console.error("Import error:", err);
      setErrorMessage(
        err instanceof Error
          ? `Failed to restore: ${err.message}`
          : "Invalid backup file or validation failed."
      );
    }
  }

  async function handleConfirmLegacyRestore() {
    if (!pendingRestore) return;
    const targetFile = pendingRestore.file;
    await executeRestore(targetFile, true);
    setPendingRestore(null);
  }

  function handleCancelLegacyRestore() {
    setPendingRestore(null);
    setErrorMessage("Restore cancelled: existing attachments were protected.");
  }

  async function handleResetDatabase() {
    setIsResetting(true);
    try {
      await db.transaction(
        "rw",
        [
          db.items,
          db.tasks,
          db.habits,
          db.habitLogs,
          db.events,
          db.reminders,
          db.notifications,
          db.libraryEntries,
          db.libraryCollections,
          db.libraryFiles,
          db.categories,
          db.settings,
        ],
        async () => {
          await Promise.all([
            db.items.clear(),
            db.tasks.clear(),
            db.habits.clear(),
            db.habitLogs.clear(),
            db.events.clear(),
            db.reminders.clear(),
            db.notifications.clear(),
            db.libraryEntries.clear(),
            db.libraryCollections.clear(),
            db.libraryFiles.clear(),
            db.categories.clear(),
            db.settings.clear(),
          ]);
        }
      );
      await useNotificationStore.getState().clearAll();
      setIsResetConfirmOpen(false);
      setStatusMessage("All data cleared successfully.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to reset database:", err);
      setErrorMessage("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* Editorial Page Header */}
      <PageHeader
        eyebrow="PREFERENCES & DATA"
        icon="⚙️"
        title="Settings"
        description="Manage your personal workspace preferences, notification alerts, and local backups."
      />

      {/* Status Messages */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-orbit-success/30 bg-orbit-success-soft p-3.5 text-xs font-medium text-orbit-success">
          <Check className="h-4 w-4 shrink-0 text-orbit-success" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-orbit-danger/30 bg-orbit-danger-soft p-3.5 text-xs font-medium text-orbit-danger">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orbit-danger" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Theme Personality */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-orbit-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Theme Personality
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Select one of ORBIT&apos;s seven bespoke visual personalities. Independent from light or dark mode.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_PERSONALITIES.map((meta) => {
            const isSelected = mounted && themePersonality === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => setThemePersonality(meta.id)}
                className={`relative flex flex-col justify-between text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-orbit-accent bg-orbit-accent-soft/40 shadow-orbit-card ring-2 ring-orbit-accent/40"
                    : "border-orbit-border bg-orbit-surface-secondary/30 hover:bg-orbit-surface-secondary/70 hover:border-orbit-border-strong"
                }`}
                aria-pressed={isSelected}
                data-theme-option={meta.id}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-orbit-text">
                      {meta.name}
                    </span>
                    {isSelected ? (
                      <Badge variant="accent" className="gap-1 px-1.5 py-0.5 text-[10px]">
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <span className="h-2 w-2 rounded-full border border-orbit-border-strong bg-orbit-surface-secondary" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-orbit-accent">
                    {meta.tagline}
                  </p>
                  <p className="text-[11px] text-orbit-text-muted line-clamp-2 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                {/* 4-Swatch Palette Preview */}
                <div className="mt-3.5 pt-2.5 border-t border-orbit-border/60 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
                    Palette
                  </span>
                  <div className="flex items-center -space-x-1" aria-hidden="true">
                    <span
                      title="Canvas Background"
                      className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: meta.swatches.bg }}
                    />
                    <span
                      title="Card Surface"
                      className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: meta.swatches.surface }}
                    />
                    <span
                      title="Primary Accent"
                      className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: meta.swatches.accent }}
                    />
                    <span
                      title="Secondary Accent"
                      className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: meta.swatches.secondary }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* Section 2: Appearance & Theme Mode */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-orbit-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-warning">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Appearance Mode
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Choose your preferred display mode across light, dark, or system defaults
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "system", label: "System", icon: Laptop },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = mounted && theme === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTheme(mode.id)}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3.5 sm:p-4 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-orbit-accent bg-orbit-accent-soft text-orbit-accent ring-1 ring-orbit-accent/40 shadow-orbit-xs font-semibold"
                    : "border-orbit-border bg-orbit-surface-secondary/40 hover:bg-orbit-surface-secondary text-orbit-text-secondary hover:text-orbit-text"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* Section 3: Calendar & Reminders Preferences */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-orbit-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Calendar &amp; Reminders
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Configure default all-day event trigger times, week start day, and desktop alerts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default All-Day Reminder Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-orbit-text flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-orbit-text-muted" />
              <span>Default All-Day Reminder Time</span>
            </label>
            <input
              type="time"
              value={defaultReminderTime}
              onChange={(e) => {
                setDefaultReminderTime(e.target.value);
                handleSavePreference({ defaultReminderTime: e.target.value });
              }}
              className="w-full rounded-lg border border-orbit-border bg-orbit-surface px-3 py-2 text-xs font-mono text-orbit-text focus:border-orbit-accent focus:outline-hidden"
            />
            <p className="text-[11px] text-orbit-text-muted">
              When all-day events will trigger reminders (e.g. 09:00 AM).
            </p>
          </div>

          {/* Week Start Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-orbit-text">
              Week Starts On
            </label>
            <select
              value={weekStartsOn}
              onChange={(e) => {
                const val = e.target.value as "monday" | "sunday";
                setWeekStartsOn(val);
                handleSavePreference({ weekStartsOn: val });
              }}
              className="w-full rounded-lg border border-orbit-border bg-orbit-surface px-3 py-2 text-xs font-sans text-orbit-text focus:border-orbit-accent focus:outline-hidden"
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
            <p className="text-[11px] text-orbit-text-muted">
              First column displayed on calendar views.
            </p>
          </div>
        </div>

        {/* Browser Notifications Control */}
        <div className="pt-3 border-t border-orbit-border/70 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-orbit-accent" />
              <span className="text-xs font-semibold text-orbit-text">
                Desktop Notifications
              </span>
              <Badge variant={permission === "granted" ? "success" : "neutral"}>
                {permission}
              </Badge>
            </div>
            <p className="text-[11px] text-orbit-text-muted">
              Get notified of upcoming events, deadlines, and daily reminders in this browser.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {permission !== "granted" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnableNotifications}
              >
                Enable Notifications
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSendTestNotification}
              >
                Send Test Alert
              </Button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Section 4: Local Storage Status & Statistics */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-orbit-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent-secondary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Local Storage Status
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Autonomous client-side storage persisted in IndexedDB within your browser
            </p>
          </div>
        </div>

        {/* Responsive Grid with Min-Width & Fluid Layout (eliminates 320px awkward text wrapping) */}
        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 text-center">
          {[
            { label: "Inbox Items", count: itemsCount },
            { label: "Tasks", count: tasksCount },
            { label: "Events", count: eventsCount },
            { label: "Reminders", count: remindersCount },
            { label: "Habits", count: habitsCount },
            { label: "Habit Logs", count: habitLogsCount },
            { label: "Library Items", count: libraryCount },
            { label: "Collections", count: collectionsCount },
            { label: "Attachments", count: filesCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-orbit-border bg-orbit-surface-secondary/40 p-2.5 flex flex-col justify-between"
            >
              <span
                className="font-sans text-[11px] font-medium text-orbit-text-muted truncate"
                title={item.label}
              >
                {item.label}
              </span>
              <p className="font-mono text-lg sm:text-xl font-semibold text-orbit-text tabular-nums mt-1">
                {mounted ? item.count : 0}
              </p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Section 5: Backup & Restore */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-orbit-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
              Backup &amp; Restore
            </h2>
            <p className="text-xs text-orbit-text-muted">
              Export your complete workspace into a portable archive or restore an existing backup
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Primary Export: ZIP */}
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleBackupZipDownload}
          >
            Export Full Backup (.zip)
          </Button>

          {/* Secondary Export: JSON Data Only */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4 text-orbit-text-muted" />}
            onClick={handleBackupJsonDownload}
          >
            Export JSON (Data Only)
          </Button>

          {/* Import Controls */}
          <div className="flex items-center gap-2">
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as "replace" | "merge")}
              className="rounded-lg border border-orbit-border bg-orbit-surface px-2.5 py-1.5 text-xs font-sans text-orbit-text focus:border-orbit-accent focus:outline-hidden"
            >
              <option value="replace">Replace All</option>
              <option value="merge">Merge</option>
            </select>

            <label className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-orbit-border bg-orbit-surface px-3.5 py-1.5 text-xs font-medium text-orbit-text shadow-orbit-xs hover:bg-orbit-surface-secondary cursor-pointer transition-colors">
              <Upload className="h-4 w-4 text-orbit-accent" />
              <span>Restore from Backup</span>
              <input
                type="file"
                accept=".json,.zip,application/zip,application/json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <p className="font-mono text-[11px] text-orbit-text-muted">
          * Full ZIP backups include all records and binary file attachments. Legacy JSON backups contain database records only (attachments are excluded).
        </p>
      </SurfaceCard>

      {/* Section 6: Danger Zone */}
      <SurfaceCard
        variant="outlined"
        padding="md"
        className="border-orbit-danger/35 bg-orbit-danger-soft/20 space-y-3"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-orbit-danger/20">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface border border-orbit-danger/30 text-orbit-danger">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-orbit-danger tracking-tight">
              Danger Zone
            </h2>
            <p className="text-xs text-orbit-danger/80">
              Irreversible destructive actions
            </p>
          </div>
        </div>

        <p className="text-xs text-orbit-danger/80">
          Resetting the database will permanently delete all local items, tasks, habits, events, reminders, and library resources from IndexedDB on this device.
        </p>

        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => setIsResetConfirmOpen(true)}
        >
          Reset Local Database
        </Button>
      </SurfaceCard>

      {/* Legacy JSON Restore Attachment Replacement Confirmation */}
      <ConfirmDialog
        isOpen={pendingRestore !== null}
        onClose={handleCancelLegacyRestore}
        onConfirm={handleConfirmLegacyRestore}
        title="Replace existing attachments?"
        description={
          pendingRestore
            ? `Legacy JSON backups do not contain file attachments. Restoring in 'Replace All' mode will delete ${pendingRestore.existingFilesCount} existing file attachment(s) from this device.`
            : undefined
        }
        confirmLabel="Delete & Restore"
        cancelLabel="Keep Existing Data"
        danger
        loading={isRestoring}
      />

      {/* Full Local Database Reset Confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset local database?"
        description="This will permanently delete all local items, tasks, habits, events, reminders, and library resources from IndexedDB. This cannot be undone unless you have a backup."
        confirmLabel="Yes, Delete Everything"
        danger
        loading={isResetting}
      />
    </div>
  );
}
