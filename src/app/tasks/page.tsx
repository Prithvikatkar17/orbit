"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { db } from "@/lib/db/client";
import { type Task } from "@/lib/schemas";
import { SortableTaskItem } from "@/components/tasks/sortable-task-item";
import { TaskModal } from "@/components/tasks/task-modal";
import { useTodayDate } from "@/lib/utils/dates";

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

  // Counts for summary badges
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

    // Update sortOrder for reordered items preserving existing relative slot orders
    // so hidden tasks' relative ordering is not overwritten
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
    const isNowCompleted = task.status !== "completed";
    const nowIso = new Date().toISOString();

    await db.tasks.update(task.id, {
      status: isNowCompleted ? "completed" : "todo",
      completedAt: isNowCompleted ? nowIso : undefined,
      updatedAt: nowIso,
    });
  }

  // Edit task
  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  // Delete task
  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this task?")) {
      await db.tasks.delete(id);
    }
  }

  const categoryOptions = [
    { value: "all", label: "All Types" },
    { value: "task", label: "📌 Tasks" },
    { value: "goal", label: "🎯 Goals" },
    { value: "idea", label: "💡 Ideas" },
    { value: "learn", label: "📚 Learn" },
    { value: "buy", label: "🛒 Buy" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tasks & Goals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize action items, manage goals, and track your daily execution.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Task / Goal</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Today</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {counts.dueToday}
            </span>
            {counts.overdue > 0 && (
              <span className="text-[11px] font-semibold text-rose-500">
                +{counts.overdue} overdue
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Tasks</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {counts.active}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Goals</div>
          <div className="mt-1 text-2xl font-bold text-pink-600 dark:text-pink-400">
            {counts.goals}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {counts.completed}
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 pb-3 dark:border-slate-800">
          {(
            [
              { id: "all", label: "All Active" },
              { id: "today", label: "Today" },
              { id: "upcoming", label: "Upcoming" },
              { id: "someday", label: "Someday" },
              { id: "completed", label: "Completed" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, goals, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9.5 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="custom">Drag Order</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="createdAt">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List with DnD */}
      {sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {activeTab === "completed" ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : activeTab === "today" ? (
              <Calendar className="h-6 w-6" />
            ) : (
              <Inbox className="h-6 w-6" />
            )}
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
            {activeTab === "completed"
              ? "No completed tasks yet"
              : activeTab === "today"
              ? "No tasks due today"
              : activeTab === "upcoming"
              ? "No upcoming tasks scheduled"
              : activeTab === "someday"
              ? "No unscheduled tasks"
              : "No tasks found"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {activeTab === "completed"
              ? "Check off your daily tasks to see them completed here."
              : activeTab === "today"
              ? "You are all clear for today! Take a break or plan ahead."
              : "Add a task or goal to begin tracking your work."}
          </p>
          {activeTab !== "completed" && (
            <button
              onClick={() => {
                setEditingTask(null);
                setModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          )}
        </div>
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
    </div>
  );
}
