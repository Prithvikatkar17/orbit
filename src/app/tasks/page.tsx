"use client";

import React, { useState, useMemo, useCallback, Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Inbox,
  X,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Task } from "@/lib/schemas";
import {
  deleteTaskWithCascade,
  toggleTaskCompletionWithSync,
} from "@/lib/services/task-sync-service";
import { SortableTaskItem } from "@/components/tasks/sortable-task-item";
import { TaskModal } from "@/components/tasks/task-modal";
import { useTodayDate } from "@/lib/utils/dates";
import { DeepLinkListener } from "@/components/common/deep-link-listener";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Select,
  SurfaceCard,
} from "@/components/ui";

type ViewTab = "all" | "today" | "upcoming" | "someday" | "completed";
type SortOption = "custom" | "dueDate" | "priority" | "createdAt";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("custom");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const todayStr = useTodayDate();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const rawTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const tasks = useMemo(() => rawTasks ?? [], [rawTasks]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks based on tab, category, and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Tab filter
      if (activeTab === "completed") {
        if (task.status !== "completed") return false;
      } else {
        if (task.status === "completed") return false;

        if (activeTab === "today") {
          if (!task.dueDate || task.dueDate > todayStr) return false;
        } else if (activeTab === "upcoming") {
          if (!task.dueDate || task.dueDate <= todayStr) return false;
        } else if (activeTab === "someday") {
          if (task.dueDate) return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== "all") {
        if (task.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        const matchesLink = task.link?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesLink) return false;
      }

      return true;
    });
  }, [tasks, activeTab, selectedCategory, searchQuery, todayStr]);

  // Sort filtered tasks
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];

    if (sortBy === "custom") {
      return list.sort((a, b) => a.sortOrder - b.sortOrder);
    } else if (sortBy === "dueDate") {
      return list.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } else if (sortBy === "priority") {
      const priorityWeight = { high: 1, medium: 2, low: 3 };
      return list.sort(
        (a, b) => (priorityWeight[a.priority] || 4) - (priorityWeight[b.priority] || 4)
      );
    } else if (sortBy === "createdAt") {
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return list;
  }, [filteredTasks, sortBy]);

  // Counts for summary indicators
  const counts = useMemo(() => {
    let active = 0;
    let dueToday = 0;
    let overdue = 0;
    let completed = 0;
    let goals = 0;

    tasks.forEach((t) => {
      if (t.status === "completed") {
        completed++;
      } else {
        active++;
        if (t.dueDate === todayStr) {
          dueToday++;
        } else if (t.dueDate && t.dueDate < todayStr) {
          overdue++;
        }
        if (t.category.toLowerCase() === "goal") {
          goals++;
        }
      }
    });

    return { active, dueToday, overdue, completed, goals };
  }, [tasks, todayStr]);

  // Drag end handler
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedTasks.findIndex((t) => t.id === active.id);
    const newIndex = sortedTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedTasks, oldIndex, newIndex);

    // Preserve relative sortOrder slots across hidden tabs
    const existingOrders = sortedTasks.map((t) => t.sortOrder).sort((a, b) => a - b);
    try {
      await db.transaction("rw", db.tasks, async () => {
        for (let i = 0; i < reordered.length; i++) {
          const item = reordered[i];
          const targetOrder = existingOrders[i];
          if (item.sortOrder !== targetOrder) {
            await db.tasks.update(item.id, {
              sortOrder: targetOrder,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });
      setSortBy("custom");
    } catch (err) {
      console.error("Failed to reorder tasks:", err);
    }
  }

  // Toggle completion
  async function handleToggle(task: Task) {
    try {
      await toggleTaskCompletionWithSync(task);
    } catch (err: unknown) {
      console.error("Toggle task error:", err);
    }
  }

  // Edit task
  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  // Delete task
  async function handleConfirmDeleteTask() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteTaskWithCascade(deleteTargetId);
    } catch (err: unknown) {
      console.error("Delete task error:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  // Deep link handler for /tasks?taskId={id}
  const handleTaskDeepLink = useCallback(async ({ taskId }: Record<string, string>) => {
    if (!taskId) return;
    try {
      const task = await db.tasks.get(taskId);
      if (task) {
        setEditingTask(task);
        setModalOpen(true);
      } else {
        console.warn(`[DeepLink] Task not found for ID: ${taskId}`);
      }
    } catch (err) {
      console.error("[DeepLink] Failed to load task:", err);
    }
  }, []);

  const categoryOptions = [
    { value: "all", label: "All Types" },
    { value: "task", label: "Tasks" },
    { value: "goal", label: "Goals" },
    { value: "idea", label: "Ideas" },
    { value: "learn", label: "Learn" },
    { value: "buy", label: "Buy" },
  ];

  const tabs: ReadonlyArray<{ id: ViewTab; label: string; count?: number }> = [
    { id: "all", label: "All Active", count: counts.active },
    { id: "today", label: "Today", count: counts.dueToday + counts.overdue },
    { id: "upcoming", label: "Upcoming" },
    { id: "someday", label: "Someday" },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener params={["taskId"]} onDeepLink={handleTaskDeepLink} />
      </Suspense>

      {/* Page Header */}
      <PageHeader
        eyebrow="EXECUTION & GOALS"
        title="Tasks & Goals"
        description="Organize action items, highlight long-term goals, and focus on what moves things forward."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            New Task / Goal
          </Button>
        }
      />

      {/* Unified Controls Toolbar */}
      <SurfaceCard padding="sm" className="space-y-3 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Segmented View Tabs */}
          <div
            role="tablist"
            aria-label="Task views"
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-orbit-control bg-orbit-subtle p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-[40px] sm:min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-orbit-surface text-orbit-text shadow-orbit-xs"
                      : "text-orbit-text-secondary hover:text-orbit-text"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" && tab.count > 0 && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        isSelected ? "text-orbit-accent" : "text-orbit-text-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quiet Status Summary */}
          <div className="flex items-center gap-3 text-xs text-orbit-text-muted">
            {counts.overdue > 0 && (
              <span className="font-semibold text-orbit-danger">
                {counts.overdue} overdue
              </span>
            )}
            {counts.goals > 0 && (
              <span>
                <strong className="font-semibold text-orbit-text">{counts.goals}</strong> active{" "}
                {counts.goals === 1 ? "goal" : "goals"}
              </span>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orbit-text-muted" />
            <input
              type="text"
              placeholder="Search tasks, goals, or notes..."
              aria-label="Search tasks, goals, or notes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[42px] sm:min-h-[36px] rounded-orbit-control border border-orbit-border bg-orbit-surface-secondary py-2 pr-10 pl-9 text-xs text-orbit-text placeholder:text-orbit-text-muted focus:border-orbit-accent focus:bg-orbit-surface focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-orbit-text-muted hover:text-orbit-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Select
              aria-label="Filter by type"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-h-[42px] sm:min-h-[36px] w-full sm:w-auto sm:min-w-[120px] py-1.5 text-xs"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="min-h-[42px] sm:min-h-[36px] w-full sm:w-auto sm:min-w-[130px] py-1.5 text-xs"
            >
              <option value="custom">Custom Order</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="createdAt">Newest First</option>
            </Select>
          </div>
        </div>
      </SurfaceCard>

      {/* Task List with DnD */}
      {sortedTasks.length === 0 ? (
        <EmptyState
          icon={
            activeTab === "completed" ? (
              <CheckCircle2 className="h-6 w-6 text-orbit-success" />
            ) : activeTab === "today" ? (
              <Calendar className="h-6 w-6" />
            ) : (
              <Inbox className="h-6 w-6" />
            )
          }
          title={
            activeTab === "completed"
              ? "No completed tasks yet"
              : activeTab === "today"
              ? "Nothing due today"
              : activeTab === "upcoming"
              ? "No upcoming tasks scheduled"
              : activeTab === "someday"
              ? "No unscheduled tasks"
              : "No tasks match your filters"
          }
          description={
            activeTab === "completed"
              ? "Check off your daily tasks to see completed items here."
              : activeTab === "today"
              ? "You are all caught up for today. Take a breath or plan ahead."
              : "Add a task or goal to begin tracking your work."
          }
          action={
            activeTab !== "completed" ? (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingTask(null);
                  setModalOpen(true);
                }}
              >
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2.5">
              {sortedTasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <TaskModal
          initialTask={editingTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Delete task?"
        description="This will also remove linked calendar events and reminders."
        confirmLabel="Delete"
        danger
        loading={isDeleting}
      />
    </div>
  );
}
