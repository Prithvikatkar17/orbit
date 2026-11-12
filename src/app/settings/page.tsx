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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [defaultReminderTime, setDefaultReminderTime] = useState("09:00");
  const [weekStartsOn, setWeekStartsOn] = useState<"monday" | "sunday">("monday");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const isZip =
        file.name.toLowerCase().endsWith(".zip") ||
        file.type.includes("zip");

      let confirmFileDeletion = false;

      // In Replace All mode with legacy JSON, warn user before clearing attachments
      if (!isZip && restoreMode === "replace") {
        const existingFiles = await db.libraryFiles.count();
        if (existingFiles > 0) {
          const proceed = window.confirm(
            `Notice: Legacy JSON backups do not contain file attachments.\n\nRestoring in 'Replace All' mode will delete ${existingFiles} existing file attachment(s) from this device.\n\nClick OK to proceed with deleting them, or Cancel to keep your existing data and switch to 'Merge' mode.`
          );
          if (!proceed) {
            setErrorMessage("Restore cancelled: existing attachments were protected.");
            e.target.value = "";
            return;
          }
          confirmFileDeletion = true;
        }
      }

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
      e.target.value = "";
    }
  }

  async function handleResetDatabase() {
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
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your personal workspace preferences, notification alerts, and local backups.
        </p>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Theme & Display */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500" />
          <span>Appearance & Theme</span>
        </h2>

        <div className="grid grid-cols-3 gap-3">
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
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Calendar & Reminders Preferences */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span>Calendar & Reminders</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default All-Day Reminder Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Default All-Day Reminder Time</span>
            </label>
            <input
              type="time"
              value={defaultReminderTime}
              onChange={(e) => {
                setDefaultReminderTime(e.target.value);
                handleSavePreference({ defaultReminderTime: e.target.value });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            <p className="text-[11px] text-slate-400">
              When all-day events will trigger reminders (e.g. 09:00 AM).
            </p>
          </div>

          {/* Week Start Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Week Starts On
            </label>
            <select
              value={weekStartsOn}
              onChange={(e) => {
                const val = e.target.value as "monday" | "sunday";
                setWeekStartsOn(val);
                handleSavePreference({ weekStartsOn: val });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
            <p className="text-[11px] text-slate-400">
              First column displayed on calendar views.
            </p>
          </div>
        </div>

        {/* Browser Notifications Control */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-indigo-600" />
              <span>Desktop Notifications</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Current browser status: <span className="font-semibold capitalize">{permission}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {permission !== "granted" ? (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Enable Notifications
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Send Test Alert
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Storage & Record Counters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Local Storage Status</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All data is persisted client-side in IndexedDB within your browser.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Inbox Items</span>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">{mounted ? itemsCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Tasks</span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{mounted ? tasksCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Events</span>
            <p className="text-xl font-bold text-pink-600 dark:text-pink-400 mt-1">{mounted ? eventsCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Reminders</span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{mounted ? remindersCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Habits</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{mounted ? habitsCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Habit Logs</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{mounted ? habitLogsCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Library Items</span>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{mounted ? libraryCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Collections</span>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{mounted ? collectionsCount : 0}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-[11px] font-medium text-slate-500">Attachments</span>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{mounted ? filesCount : 0}</p>
          </div>
        </div>
      </section>

      {/* Backup and Restore */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="h-4 w-4 text-indigo-600" />
          <span>Backup & Restore (11 Tables & Attachments)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export your complete workspace into a portable ZIP archive containing all 11 tables and binary file attachments, or restore from a ZIP or legacy JSON backup.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Export: ZIP */}
          <button
            type="button"
            onClick={handleBackupZipDownload}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Full Backup (.zip)</span>
          </button>

          {/* Secondary Export: JSON Data Only */}
          <button
            type="button"
            onClick={handleBackupJsonDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4 text-slate-400" />
            <span>Export JSON (Data Only)</span>
          </button>

          {/* Import Controls */}
          <div className="flex items-center gap-2">
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as "replace" | "merge")}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="replace">Replace All</option>
              <option value="merge">Merge</option>
            </select>

            <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors">
              <Upload className="h-4 w-4 text-indigo-600" />
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

        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          * Full ZIP backups include all records and binary file attachments. Legacy JSON backups contain database records only (attachments are excluded).
        </div>
      </section>

      {/* Danger Zone: Database Reset */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-xs dark:border-rose-950/60 dark:bg-rose-950/20 space-y-4">
        <h2 className="text-base font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-rose-600" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
          Resetting the database will permanently delete all local items, tasks, habits, events, and reminders from IndexedDB.
        </p>

        {!isResetConfirmOpen ? (
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Local Database</span>
          </button>
        ) : (
          <div className="rounded-xl border border-rose-300 bg-white p-4 shadow-xs dark:border-rose-900 dark:bg-slate-900 space-y-3">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
              Are you sure? This cannot be undone unless you have a backup.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDatabase}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
