import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { TaskSchema } from "@/lib/schemas/task";

function parseEpoch(val: unknown, fallback: number = Date.now()): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function GET() {
  try {
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    return NextResponse.json({ success: true, tasks: allTasks });
  } catch (error) {
    console.error("Failed to fetch tasks from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const validated = TaskSchema.parse({
      id,
      title: (body.title || "").trim(),
      notes: (body.notes || "").trim(),
      link: body.link ? String(body.link).trim() : undefined,
      category: body.category ? String(body.category).trim().toLowerCase() : "task",
      priority: body.priority || "medium",
      status: body.status || "todo",
      dueDate: body.dueDate || undefined,
      dueTime: body.dueTime || undefined,
      completedAt: body.completedAt || (body.status === "completed" ? nowIso : undefined),
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      tags: Array.isArray(body.tags) ? body.tags : [body.category || "task"],
      sourceItemId: body.sourceItemId || undefined,
      createdAt: body.createdAt || nowIso,
      updatedAt: body.updatedAt || nowIso,
    });

    const newTask = {
      id: validated.id,
      title: validated.title,
      notes: validated.notes,
      link: validated.link || null,
      category: validated.category,
      priority: validated.priority,
      status: validated.status,
      dueDate: validated.dueDate || null,
      dueTime: validated.dueTime || null,
      completedAt: validated.completedAt ? parseEpoch(validated.completedAt) : null,
      sortOrder: validated.sortOrder,
      tags: JSON.stringify(validated.tags),
      sourceItemId: validated.sourceItemId || null,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: parseEpoch(validated.updatedAt),
    };

    await db.insert(tasks).values(newTask);
    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Failed to insert task into SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    const taskUpdates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if ("title" in updates && typeof updates.title === "string") taskUpdates.title = updates.title.trim();
    if ("notes" in updates) taskUpdates.notes = updates.notes ? String(updates.notes).trim() : "";
    if ("link" in updates) taskUpdates.link = updates.link ? String(updates.link).trim() : null;
    if ("category" in updates) taskUpdates.category = String(updates.category).trim().toLowerCase();
    if ("priority" in updates) taskUpdates.priority = updates.priority;
    if ("status" in updates) {
      taskUpdates.status = updates.status;
      if (updates.status === "completed" && !updates.completedAt) {
        taskUpdates.completedAt = Date.now();
      } else if (updates.status !== "completed") {
        taskUpdates.completedAt = null;
      }
    }
    if ("dueDate" in updates) taskUpdates.dueDate = updates.dueDate || null;
    if ("dueTime" in updates) taskUpdates.dueTime = updates.dueTime || null;
    if ("completedAt" in updates) taskUpdates.completedAt = updates.completedAt ? parseEpoch(updates.completedAt) : null;
    if ("sortOrder" in updates && typeof updates.sortOrder === "number") taskUpdates.sortOrder = updates.sortOrder;
    if ("tags" in updates) taskUpdates.tags = Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : String(updates.tags);

    await db.update(tasks).set(taskUpdates).where(eq(tasks.id, id));
    return NextResponse.json({ success: true, updated: { id, ...taskUpdates } });
  } catch (error) {
    console.error("Failed to update task in SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }
    await db.delete(tasks).where(eq(tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
