"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Target,
} from "lucide-react";
import { type Task } from "@/lib/schemas";
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatFriendlyDate, useTodayDate } from "@/lib/utils/dates";

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function SortableTaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const todayStr = useTodayDate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === "completed";
  const isGoal = task.category.toLowerCase() === "goal";
  const isOverdue = Boolean(task.dueDate && todayStr && task.dueDate < todayStr && !isCompleted);
  const isDueToday = Boolean(task.dueDate && todayStr && task.dueDate === todayStr && !isCompleted);
  const icon = isGoal ? "🎯" : CATEGORY_ICONS[task.category] || "📌";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 transition-all dark:bg-slate-900 ${
        isDragging
          ? "z-20 border-indigo-500 shadow-xl opacity-90 scale-[1.01]"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 shadow-xs"
      } ${isCompleted ? "bg-slate-50/60 opacity-60 dark:bg-slate-900/40" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
        title="Drag to reorder"
        aria-label="Drag to reorder task"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Completion checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
          isCompleted
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 hover:border-indigo-600 dark:border-slate-600"
        }`}
        aria-label={isCompleted ? "Mark task as incomplete" : "Mark task as complete"}
      >
        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      {/* Main Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base select-none">{icon}</span>
          <span
            className={`text-sm font-semibold text-slate-900 dark:text-white ${
              isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
            }`}
          >
            {task.title}
          </span>

          {isGoal && (
            <span className="inline-flex items-center gap-1 rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700 dark:bg-pink-950/70 dark:text-pink-300 uppercase tracking-wider">
              <Target className="h-3 w-3" />
              Goal
            </span>
          )}

          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              task.priority === "high"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                : task.priority === "low"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            }`}
          >
            {task.priority}
          </span>
        </div>

        {task.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
            {task.notes}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {task.dueDate ? (
            <span
              className={`flex items-center gap-1 ${
                isOverdue
                  ? "font-semibold text-rose-600 dark:text-rose-400"
                  : isDueToday
                  ? "font-semibold text-amber-600 dark:text-amber-400"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatFriendlyDate(task.dueDate, task.dueTime)}</span>
              {isOverdue && (
                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Overdue
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">No due date</span>
          )}

          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Link</span>
            </a>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Edit Task"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
          title="Delete Task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
