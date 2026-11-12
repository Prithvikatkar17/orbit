"use client";

import React, { useState } from "react";
import { Plus, Trash2, Bell, Clock, Check } from "lucide-react";
import { REMINDER_PRESETS } from "@/lib/constants";

export interface ReminderDraft {
  id: string;
  timing: {
    type: "at_time" | "before";
    offsetMinutes?: number;
  };
  label: string;
  isActive: boolean;
}

interface ReminderEditorProps {
  reminders: ReminderDraft[];
  onChange: (reminders: ReminderDraft[]) => void;
  disabled?: boolean;
}

export function ReminderEditor({ reminders, onChange, disabled }: ReminderEditorProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);

  function handleAddPreset() {
    const preset = REMINDER_PRESETS[selectedPresetIndex];
    if (!preset) return;

    // Check duplicate
    const exists = reminders.some(
      (r) =>
        r.timing.type === preset.type &&
        (r.timing.offsetMinutes || 0) === (preset.offsetMinutes || 0)
    );

    if (exists) {
      return;
    }

    const newReminder: ReminderDraft = {
      id: crypto.randomUUID(),
      timing: {
        type: preset.type,
        offsetMinutes: preset.offsetMinutes,
      },
      label: preset.label,
      isActive: true,
    };

    onChange([...reminders, newReminder]);
  }

  function handleRemove(id: string) {
    onChange(reminders.filter((r) => r.id !== id));
  }

  function handleToggleActive(id: string) {
    onChange(
      reminders.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Bell className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Reminders</span>
        </label>
        <span className="text-[11px] text-slate-400">
          {reminders.length} configured
        </span>
      </div>

      {/* Existing Reminders List */}
      {reminders.length > 0 && (
        <div className="space-y-1.5">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                reminder.isActive
                  ? "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200"
                  : "border-slate-200/50 bg-slate-50/30 opacity-60 dark:border-slate-800/40 dark:bg-slate-900/30 line-through text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(reminder.id)}
                  disabled={disabled}
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    reminder.isActive
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                  title={reminder.isActive ? "Disable reminder" : "Enable reminder"}
                >
                  {reminder.isActive && <Check className="h-3 w-3 stroke-[3]" />}
                </button>
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">{reminder.label}</span>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(reminder.id)}
                disabled={disabled}
                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                title="Remove reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Reminder Selector */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={selectedPresetIndex}
          onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
          disabled={disabled}
          className="min-w-0 flex-1 min-h-[40px] sm:min-h-[34px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500"
        >
          {REMINDER_PRESETS.map((preset, idx) => {
            const alreadyAdded = reminders.some(
              (r) =>
                r.timing.type === preset.type &&
                (r.timing.offsetMinutes || 0) === (preset.offsetMinutes || 0)
            );
            return (
              <option key={idx} value={idx} disabled={alreadyAdded}>
                {preset.label} {alreadyAdded ? "(Already added)" : ""}
              </option>
            );
          })}
        </select>

        <button
          type="button"
          onClick={handleAddPreset}
          disabled={disabled}
          className="inline-flex min-h-[40px] sm:min-h-[34px] shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}

