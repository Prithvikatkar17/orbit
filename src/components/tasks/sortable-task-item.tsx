"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Check,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Target,
} from "lucide-react";
import { type Task } from "@/lib/schemas";
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatFriendlyDate, useTodayDate } from "@/lib/utils/dates";
import { Badge, SurfaceCard } from "@/components/ui";

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
    <SurfaceCard
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-3 px-4 py-3.5 transition-all ${
        isDragging
          ? "z-20 border-orbit-accent shadow-orbit-elevated opacity-95 scale-[1.01]"
          : "hover:border-orbit-border-strong"
      } ${
        isOverdue
          ? "border-l-[3px] border-l-orbit-danger"
          : isGoal && !isCompleted
          ? "border-l-[3px] border-l-orbit-accent"
          : ""
      } ${isCompleted ? "bg-orbit-surface-secondary/60 opacity-65" : ""}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="-my-1.5 -ml-2 flex h-11 w-9 shrink-0 items-center justify-center cursor-grab touch-none rounded-lg text-orbit-text-muted/50 opacity-70 transition-opacity hover:text-orbit-text-secondary group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder task"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Completion checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        className="group/check -my-1.5 -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--orbit-focus-ring)]"
        aria-label={isCompleted ? "Mark task as incomplete" : "Mark task as complete"}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            isCompleted
              ? "border-orbit-success bg-orbit-success text-white"
              : "border-orbit-border-strong group-hover/check:border-orbit-accent"
          }`}
        >
          {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
        </span>
      </button>

      {/* Main Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm select-none" aria-hidden>
            {icon}
          </span>
          <span
            className={`[overflow-wrap:anywhere] text-sm font-semibold ${
              isCompleted ? "line-through text-orbit-text-muted" : "text-orbit-text"
            }`}
          >
            {task.title}
          </span>

          {isGoal && (
            <Badge variant="accent">
              <Target className="h-3 w-3" />
              Goal
            </Badge>
          )}

          {task.priority === "high" && !isCompleted && (
            <Badge variant="danger">High</Badge>
          )}
        </div>

        {task.notes && (
          <p className="[overflow-wrap:anywhere] text-xs leading-relaxed text-orbit-text-muted whitespace-pre-wrap">
            {task.notes}
          </p>
        )}

        {/* Quiet Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] font-medium text-orbit-text-muted">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 ${
                isOverdue
                  ? "font-semibold text-orbit-danger"
                  : isDueToday
                  ? "font-semibold text-orbit-accent"
                  : ""
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>{formatFriendlyDate(task.dueDate, task.dueTime)}</span>
              {isOverdue && <span>· Overdue</span>}
            </span>
          ) : (
            <span>Someday</span>
          )}

          {task.priority !== "high" && !isCompleted && (
            <span className="capitalize">· {task.priority} priority</span>
          )}

          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-orbit-text-secondary hover:text-orbit-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open link</span>
            </a>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-subtle hover:text-orbit-text transition-colors"
          title="Edit Task"
          aria-label={`Edit "${task.title}"`}
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-orbit-text-muted hover:bg-orbit-danger-soft hover:text-orbit-danger transition-colors"
          title="Delete Task"
          aria-label={`Delete "${task.title}"`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </SurfaceCard>
  );
}
