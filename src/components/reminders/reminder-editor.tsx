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
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--orbit-text)]">
          <Bell className="h-3.5 w-3.5 text-[var(--orbit-accent)]" />
          <span>Reminders</span>
        </label>
        <span className="text-[11px] text-[var(--orbit-text-muted)]">
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
                  ? "border-[var(--orbit-border)] bg-[var(--orbit-surface)] text-[var(--orbit-text)]"
                  : "border-[var(--orbit-border)]/60 bg-[var(--orbit-surface)]/45 opacity-60 line-through text-[var(--orbit-text-muted)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(reminder.id)}
                  disabled={disabled}
                  aria-label={reminder.isActive ? "Disable reminder" : "Enable reminder"}
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--orbit-focus-ring)] ${
                    reminder.isActive
                      ? "border-[var(--orbit-accent)] bg-[var(--orbit-accent)] text-[var(--orbit-accent-fg)]"
                      : "border-[var(--orbit-border-strong)] bg-[var(--orbit-surface)]"
                  }`}
                  title={reminder.isActive ? "Disable reminder" : "Enable reminder"}
                >
                  {reminder.isActive && <Check className="h-3 w-3 stroke-[3]" />}
                </button>
                <Clock className="h-3.5 w-3.5 text-[var(--orbit-text-muted)]" />
                <span className="font-medium">{reminder.label}</span>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(reminder.id)}
                disabled={disabled}
                aria-label="Remove reminder"
                className="rounded-lg p-1.5 text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-danger-soft)] hover:text-[var(--orbit-danger)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--orbit-focus-ring)]"
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
          aria-label="Reminder timing preset"
          value={selectedPresetIndex}
          onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
          disabled={disabled}
          className="min-w-0 flex-1 min-h-[40px] sm:min-h-[34px] rounded-xl border border-[var(--orbit-border)] bg-[var(--orbit-surface)] px-3 py-1.5 text-xs text-[var(--orbit-text)] focus:outline-hidden focus:border-[var(--orbit-accent)]"
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
          className="inline-flex min-h-[40px] sm:min-h-[34px] shrink-0 items-center gap-1 rounded-xl border border-[var(--orbit-border)] bg-[var(--orbit-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--orbit-text)] transition-colors hover:border-[var(--orbit-accent)]/40 hover:bg-[var(--orbit-accent-soft)] hover:text-[var(--orbit-accent)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--orbit-focus-ring)]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}

