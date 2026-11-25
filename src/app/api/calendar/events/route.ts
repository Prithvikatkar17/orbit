import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { EventSchema } from "@/lib/schemas/event";

function parseEpoch(val: unknown, fallback: number = Date.now()): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function GET() {
  try {
    const allEvents = await db
      .select()
      .from(calendarEvents)
      .orderBy(desc(calendarEvents.date), desc(calendarEvents.createdAt));

    return NextResponse.json({ success: true, events: allEvents });
  } catch (error) {
    console.error("Failed to fetch calendar events from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const recurrenceInput =
      typeof body.recurrence === "string"
        ? JSON.parse(body.recurrence)
        : body.recurrence || { rule: "none" };

    const validated = EventSchema.parse({
      id,
      title: String(body.title || "").trim(),
      notes: typeof body.notes === "string" ? body.notes : "",
      type: body.type || "general",
      date: body.date,
      startTime: body.startTime || undefined,
      endTime: body.endTime || undefined,
      isAllDay: typeof body.isAllDay === "boolean" ? body.isAllDay : true,
      description: body.description || undefined,
      recurrence: recurrenceInput,
      color: body.color || undefined,
      sourceItemId: body.sourceItemId || undefined,
      createdAt:
        typeof body.createdAt === "number"
          ? new Date(body.createdAt).toISOString()
          : body.createdAt || nowIso,
      updatedAt:
        typeof body.updatedAt === "number"
          ? new Date(body.updatedAt).toISOString()
          : body.updatedAt || nowIso,
    });

    const row = {
      id: validated.id,
      title: validated.title,
      notes: validated.notes || "",
      type: validated.type,
      date: validated.date,
      startTime: validated.startTime || null,
      endTime: validated.endTime || null,
      isAllDay: validated.isAllDay,
      description: validated.description || null,
      recurrence: JSON.stringify(validated.recurrence),
      color: validated.color || null,
      sourceItemId: validated.sourceItemId || null,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: parseEpoch(validated.updatedAt),
      deletedAt: null,
    };

    await db.insert(calendarEvents).values(row).onConflictDoUpdate({
      target: calendarEvents.id,
      set: row,
    });

    return NextResponse.json({ success: true, event: row }, { status: 201 });
  } catch (error) {
    console.error("Failed to upsert calendar event into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save event",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    const patchData: Record<string, unknown> = {
      updatedAt: updates.updatedAt ? parseEpoch(updates.updatedAt) : Date.now(),
    };

    if ("title" in updates && typeof updates.title === "string") {
      patchData.title = updates.title.trim();
    }
    if ("notes" in updates) {
      patchData.notes = updates.notes ? String(updates.notes) : "";
    }
    if ("type" in updates && typeof updates.type === "string") {
      patchData.type = updates.type;
    }
    if ("date" in updates && typeof updates.date === "string") {
      patchData.date = updates.date;
    }
    if ("startTime" in updates) {
      patchData.startTime = updates.startTime || null;
    }
    if ("endTime" in updates) {
      patchData.endTime = updates.endTime || null;
    }
    if ("isAllDay" in updates && typeof updates.isAllDay === "boolean") {
      patchData.isAllDay = updates.isAllDay;
    }
    if ("description" in updates) {
      patchData.description = updates.description || null;
    }
    if ("recurrence" in updates && updates.recurrence !== undefined) {
      patchData.recurrence =
        typeof updates.recurrence === "string"
          ? updates.recurrence
          : JSON.stringify(updates.recurrence);
    }
    if ("color" in updates) {
      patchData.color = updates.color || null;
    }

    const [updated] = await db
      .update(calendarEvents)
      .set(patchData)
      .where(eq(calendarEvents.id, id))
      .returning();

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error("Failed to update calendar event in SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update event",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    await db
      .update(calendarEvents)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(calendarEvents.id, id));

    return NextResponse.json({ success: true, message: "Event soft-deleted" });
  } catch (error) {
    console.error("Failed to delete calendar event from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}
