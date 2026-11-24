"use client";

import React, { useState } from "react";
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
  Database,
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  downloadBackupZip,
  downloadBackupFile,
  restoreBackup,
} from "@/lib/services/backup-service";
import { requestNotificationPermission } from "@/lib/services/reminder-service";
import { resetSearchIndex } from "@/lib/services/search-service";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { useMounted } from "@/lib/utils/dates";
import {
  fetchDatabaseStorageCounts,
  EMPTY_STORAGE_COUNTS,
} from "@/lib/services/workspace-queries";
import {
  THEME_PERSONALITIES,
  type ThemePersonality,
} from "@/lib/schemas/settings";
import { useThemePersonality } from "@/components/theme-personality-provider";
import { ThemePersonalityCard } from "@/components/theme-preview-card";
import {
  Badge,
  Button,
  ConfirmDialog,
  PageHeader,
  SurfaceCard,
} from "@/components/ui";
import { flushSyncQueue } from "@/lib/services/sync-queue-service";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { themePersonality, setThemePersonality } = useThemePersonality();
  const mounted = useMounted();
  const [explicitPermission, setExplicitPermission] = useState<NotificationPermission | null>(null);
  const permission: NotificationPermission =
    explicitPermission ??
    (mounted && typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSelectPersonality(id: ThemePersonality) {
    try {
      await setThemePersonality(id);
      setStatusMessage(`Theme personality switched to ${id}.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error("Failed to set theme personality:", err);
      setErrorMessage("Failed to save theme personality.");
    }
  }
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [pendingRestore, setPendingRestore] = useState<{
    file: File;
    existingFilesCount: number;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // SQLite Data Vault state
  const [sqliteSizeBytes, setSqliteSizeBytes] = useState<number | null>(null);
  const [isExportingSqlite, setIsExportingSqlite] = useState(false);
  const [sqliteVaultError, setSqliteVaultError] = useState<string | null>(null);

  React.useEffect(() => {
    let isCancelled = false;
    async function fetchSqliteMeta() {
      try {
        const res = await fetch("/api/backup/sqlite?meta=1");
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && typeof data.sizeBytes === "number") {
            setSqliteSizeBytes(data.sizeBytes);
          }
        }
      } catch {
        // offline or unreachable
      }
    }
    void fetchSqliteMeta();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleDownloadSqliteVault() {
    setIsExportingSqlite(true);
    setSqliteVaultError(null);
    try {
      // 1. Flush any pending offline queue items before generating snapshot
      await flushSyncQueue();

      // 2. Fetch SQLite snapshot
      const res = await fetch("/api/backup/sqlite");
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `orbit-backup-${dateStr}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage("SQLite data vault downloaded successfully.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to export SQLite vault:", err);
      setSqliteVaultError(
        "Unable to download SQLite vault. Verify your connection to the local server or hotspot."
      );
    } finally {
      setIsExportingSqlite(false);
    }
  }

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

  // Reactively track user settings so backup restores or database resets update form controls immediately
  const dbSettings = useLiveQuery(() => db.settings.get("user_settings"), []);
  const defaultReminderTime = dbSettings?.defaultReminderTime ?? "09:00";
  const weekStartsOn = (dbSettings?.weekStartsOn as "monday" | "sunday") ?? "monday";

  async function handleSetTheme(mode: string) {
    setTheme(mode);
    try {
      const existing = await db.settings.get("user_settings");
      if (existing) {
        await db.settings.update("user_settings", {
          theme: mode as "light" | "dark" | "system",
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.settings.add({
          id: "user_settings",
          theme: mode as "light" | "dark" | "system",
          themePersonality: themePersonality || "archivist",
          defaultPriority: "medium",
          defaultReminderTime: "09:00",
          weekStartsOn: "monday",
          dateFormat: "DD/MM/YYYY",
          notificationsEnabled: true,
          heatmapDays: 180,
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("Failed to persist theme to db.settings:", err);
    }
  }

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
    setExplicitPermission(perm);
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
      resetSearchIndex();

      // Also reset SQLite tables via reset endpoint to prevent ghost resurrection
      try {
        await fetch("/api/reset", {
          method: "DELETE",
          headers: {
            "X-Orbit-Confirm": "reset",
          },
        });
      } catch (resetErr) {
        console.warn("SQLite database reset error:", resetErr);
      }

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

        <div
          role="radiogroup"
          aria-label="Theme Personalities"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
        >
          {THEME_PERSONALITIES.map((meta) => (
            <ThemePersonalityCard
              key={meta.id}
              meta={meta}
              isSelected={mounted && themePersonality === meta.id}
              onSelect={handleSelectPersonality}
            />
          ))}
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
                onClick={() => handleSetTheme(mode.id)}
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

      {/* Section 5: SQLite Data Vault */}
      <SurfaceCard padding="md" className="space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-orbit-border flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orbit-surface-secondary border border-orbit-border text-orbit-accent">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold text-orbit-text tracking-tight">
                  SQLite Data Vault
                </h2>
                <Badge variant="success">WAL Active</Badge>
                {sqliteSizeBytes !== null && (
                  <Badge variant="neutral">
                    {formatBytes(sqliteSizeBytes)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-orbit-text-muted">
                Direct snapshot of the local relational database backend on disk
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleDownloadSqliteVault}
            disabled={isExportingSqlite}
            className="min-h-[44px]"
          >
            {isExportingSqlite ? "Exporting Vault..." : "Download orbit.sqlite"}
          </Button>
        </div>

        {sqliteVaultError && (
          <div className="flex items-center gap-2 rounded-lg border border-orbit-danger/30 bg-orbit-danger-soft p-3 text-xs font-medium text-orbit-danger">
            <AlertTriangle className="h-4 w-4 shrink-0 text-orbit-danger" />
            <span>{sqliteVaultError}</span>
          </div>
        )}

        <p className="text-xs text-orbit-text-muted leading-relaxed">
          Flushes any pending offline queue mutations and exports an atomic checkpoint of <code className="font-mono text-orbit-text">orbit.sqlite</code>. Safe to query or restore directly with any SQLite viewer.
        </p>
      </SurfaceCard>

      {/* Section 6: Backup & Restore */}
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
