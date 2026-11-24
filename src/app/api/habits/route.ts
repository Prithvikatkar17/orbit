import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { habits, habitLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { HabitSchema } from "@/lib/schemas/habit";

function parseEpoch(val: unknown, fallback: number = Date.now()): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const allParam = searchParams.get("all");
    const showAll = allParam === "true" || allParam === "1";

    const allHabits = await db.select().from(habits).orderBy(habits.sortOrder);
    const allLogs = await db.select().from(habitLogs);

    const filteredHabits = showAll
      ? allHabits
      : allHabits.filter((h) => h.isActive && !h.archived);

    const habitsWithLogs = filteredHabits.map((h) => ({
      ...h,
      logs: allLogs.filter((l) => l.habitId === h.id),
    }));

    return NextResponse.json({
      success: true,
      habits: habitsWithLogs,
      allHabits,
      logs: allLogs,
    });
  } catch (error) {
    console.error("Failed to fetch habits from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch habits" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const validated = HabitSchema.parse({
      id,
      title: (body.title || "").trim(),
      notes: (body.notes || body.description || "").trim(),
      frequency: body.frequency || "daily",
      customDays: Array.isArray(body.customDays) ? body.customDays : [],
      color: body.color || "#10b981",
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      createdAt: body.createdAt || nowIso,
      updatedAt: body.updatedAt || nowIso,
    });

    const newHabit = {
      id: validated.id,
      title: validated.title,
      description: body.description ? String(body.description).trim() : validated.notes,
      notes: validated.notes,
      frequency: validated.frequency,
      customDays: JSON.stringify(validated.customDays),
      targetCount: typeof body.targetCount === "number" ? body.targetCount : 1,
      color: validated.color,
      isActive: validated.isActive,
      archived: body.archived !== undefined ? Boolean(body.archived) : !validated.isActive,
      sortOrder: validated.sortOrder,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: parseEpoch(validated.updatedAt),
      deletedAt: null,
    };

    await db.insert(habits).values(newHabit).onConflictDoUpdate({
      target: habits.id,
      set: newHabit,
    });
    return NextResponse.json({ success: true, habit: newHabit }, { status: 201 });
  } catch (error) {
    console.error("Failed to insert habit into SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create habit" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Habit ID is required" }, { status: 400 });
    }

    const habitUpdates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if ("title" in updates && typeof updates.title === "string") habitUpdates.title = updates.title.trim();
    if ("notes" in updates) habitUpdates.notes = updates.notes ? String(updates.notes).trim() : "";
    if ("description" in updates) habitUpdates.description = updates.description ? String(updates.description).trim() : "";
    if ("frequency" in updates) habitUpdates.frequency = updates.frequency;
    if ("customDays" in updates) {
      habitUpdates.customDays = Array.isArray(updates.customDays)
        ? JSON.stringify(updates.customDays)
        : String(updates.customDays);
    }
    if ("targetCount" in updates && typeof updates.targetCount === "number") habitUpdates.targetCount = updates.targetCount;
    if ("color" in updates) habitUpdates.color = updates.color;
    if ("isActive" in updates) {
      habitUpdates.isActive = Boolean(updates.isActive);
      if (updates.archived === undefined) {
        habitUpdates.archived = !updates.isActive;
      }
    }
    if ("archived" in updates) {
      habitUpdates.archived = Boolean(updates.archived);
      if (updates.isActive === undefined) {
        habitUpdates.isActive = !updates.archived;
      }
    }
    if ("sortOrder" in updates && typeof updates.sortOrder === "number") habitUpdates.sortOrder = updates.sortOrder;

    await db.update(habits).set(habitUpdates).where(eq(habits.id, id));
    return NextResponse.json({ success: true, updated: { id, ...habitUpdates } });
  } catch (error) {
    console.error("Failed to update habit in SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update habit" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Habit ID is required" }, { status: 400 });
    }
    const now = Date.now();
    await db.update(habits).set({ deletedAt: now, updatedAt: now }).where(eq(habits.id, id));
    return NextResponse.json({ success: true, deletedAt: now });
  } catch (error) {
    console.error("Failed to delete habit from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete habit" },
      { status: 500 }
    );
  }
}
